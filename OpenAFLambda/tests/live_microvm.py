#!/usr/bin/env python3
"""Opt-in Lambda MicroVM image/lifecycle verification, with journaled cleanup."""
import argparse
import datetime
import hashlib
import json
import pathlib
import statistics
import subprocess
import time
import urllib.request
import urllib.error
import uuid
import zipfile


class Run:
    def __init__(self, config, directory):
        self.config = config
        self.directory = pathlib.Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)
        self.journal_path = self.directory / "journal.json"
        self.journal = json.loads(self.journal_path.read_text()) if self.journal_path.exists() else {
            "config": config, "images": [], "microvms": [], "objects": [], "logs": []}
        report_path = self.directory / "report.json"
        self.report = json.loads(report_path.read_text()) if report_path.exists() else {
            "region": config["region"], "samples": [], "checks": []}
        self.save()

    def save(self):
        self.journal_path.write_text(json.dumps(self.journal, indent=2) + "\n")
        self.journal_path.chmod(0o600)
        (self.directory / "report.json").write_text(json.dumps(self.report, indent=2) + "\n")

    def aws(self, service, operation, **parameters):
        command = ["aws", "--profile", self.config["profile"], "--region", self.config["region"],
                   "--no-cli-pager", "--output", "json", service, operation]
        for key, value in parameters.items():
            command += ["--" + key.replace("_", "-"), json.dumps(value) if isinstance(value, (dict, list)) else str(value)]
        result = subprocess.run(command, capture_output=True, text=True, timeout=120)
        if result.returncode:
            raise RuntimeError(result.stderr.strip())
        return json.loads(result.stdout or "{}")

    def wait(self, operation, parameter, identifier, states, timeout=1800):
        until = time.monotonic() + timeout
        while time.monotonic() < until:
            result = self.aws("lambda-microvms", operation, **{parameter: identifier})
            state = result["state"]
            if state in states:
                return result
            if "FAIL" in state or (state in ("TERMINATING", "TERMINATED") and "TERMINATED" not in states):
                raise RuntimeError("MicroVM service entered " + state)
            time.sleep(3)
        raise TimeoutError(operation + " timed out")

    def verify(self, image_zip, runs):
        with zipfile.ZipFile(image_zip) as source:
            manifest = json.loads(source.read("payload/build-manifest.json"))
        if manifest.get("architecture") != "arm64" or not manifest.get("cdsArchive", {}).get("validated"):
            raise ValueError("The comparison requires an arm64 source bundle with a validated OpenAF sharing archive")
        self.report["versions"] = manifest["versions"]
        self.report["imageZipSha256"] = hashlib.sha256(pathlib.Path(image_zip).read_bytes()).hexdigest()
        self.report["baselineMemoryMiB"] = 1024
        c = self.config
        name = c["name"]
        key = c["prefix"].strip("/") + "/" + name + "/image.zip"
        self.journal["objects"].append(key)
        self.save()
        self.aws("s3api", "put-object", bucket=c["bucket"], key=key, body=str(pathlib.Path(image_zip).resolve()))
        self.journal["role"] = name + "-role"
        self.save()
        role = self.aws("iam", "create-role", role_name=self.journal["role"], assume_role_policy_document={
            "Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Principal": {"Service": "lambda.amazonaws.com"},
            "Action": ["sts:AssumeRole", "sts:TagSession"]}]})["Role"]["Arn"]
        self.journal["account"] = role.split(":")[4]
        self.save()
        log_resource = "arn:aws:logs:" + c["region"] + ":" + role.split(":")[4] + ":log-group:/aws/lambda-microvms/" + name + "-*:*"
        self.aws("iam", "put-role-policy", role_name=self.journal["role"], policy_name="verification", policy_document={
            "Version": "2012-10-17", "Statement": [
                {"Effect": "Allow", "Action": ["s3:GetObject"], "Resource": "arn:aws:s3:::" + c["bucket"] + "/" + key},
                {"Effect": "Allow", "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"], "Resource": log_resource}]})
        time.sleep(10)  # Allow IAM propagation before the image builder assumes the role.
        region_arn = "arn:aws:lambda:" + c["region"] + ":aws:"
        for mode in ("auto", "off"):
            image_name = name + "-" + mode
            self.journal["images"].append("arn:aws:lambda:" + c["region"] + ":" + self.journal["account"] + ":microvm-image:" + image_name)
            log_group = "/aws/lambda-microvms/" + image_name
            self.journal["logs"].append(log_group)
            self.save()
            self.aws("logs", "create-log-group", log_group_name=log_group)
            print("Building MicroVM image (" + mode + ")", flush=True)
            start = time.monotonic()
            created = self.aws("lambda-microvms", "create-microvm-image", name=image_name,
                code_artifact={"uri": "s3://" + c["bucket"] + "/" + key},
                base_image_arn=region_arn + "microvm-image:al2023-1", build_role_arn=role,
                cpu_configurations=[{"architecture": "ARM_64"}], resources=[{"minimumMemoryInMiB": 1024}],
                environment_variables={"OAF_JAVA_XSHARE": mode},
                logging={"cloudWatch": {"logGroup": log_group}},
                egress_network_connectors=[region_arn + "network-connector:aws-network-connector:INTERNET_EGRESS"],
                hooks={"port": 8081, "microvmImageHooks": {"ready": "ENABLED", "readyTimeoutInSeconds": 300,
                    "validate": "ENABLED", "validateTimeoutInSeconds": 60},
                    "microvmHooks": {"run": "ENABLED", "runTimeoutInSeconds": 60,
                                     "resume": "ENABLED", "resumeTimeoutInSeconds": 60}})
            image = self.wait("get-microvm-image", "image_identifier", created["imageArn"], ("CREATED", "UPDATED"))
            version = image["latestActiveImageVersion"]
            state = self.aws("lambda-microvms", "get-microvm-image-version", image_identifier=created["imageArn"], image_version=version)
            if state["state"] != "SUCCESSFUL":
                raise RuntimeError("MicroVM image version did not build successfully")
            self.report["checks"].append({"mode": mode, "imageBuildSeconds": time.monotonic() - start,
                                           "versionSuccessful": True})
            self.save()
            for trial in range(runs):
                start = time.monotonic()
                vm = self.aws("lambda-microvms", "run-microvm", image_identifier=created["imageArn"], image_version=version,
                    execution_role_arn=role, maximum_duration_in_seconds=600,
                    ingress_network_connectors=[region_arn + "network-connector:aws-network-connector:ALL_INGRESS"],
                    idle_policy={"autoResumeEnabled": True, "maxIdleDurationSeconds": 300, "suspendedDurationSeconds": 60},
                    logging={"cloudWatch": {"logGroup": log_group}})
                identifier = vm["microvmId"]
                self.journal["microvms"].append(identifier)
                self.save()
                running = self.wait("get-microvm", "microvm_identifier", identifier, ("RUNNING",), timeout=180)
                launch = time.monotonic() - start
                token = self.aws("lambda-microvms", "create-microvm-auth-token", microvm_identifier=identifier,
                    expiration_in_minutes=10, allowed_ports=[{"port": 8080}])["authToken"]["X-aws-proxy-auth"]
                endpoint = running.get("endpoint", vm.get("endpoint"))
                endpoint_url = "https://" + endpoint.removeprefix("https://").rstrip("/")
                headers = {"Content-Type": "application/json", "X-aws-proxy-auth": token,
                           "X-aws-proxy-port": "8080"}
                # Probe health only: retrying a failed invocation could replay side effects.
                probe_start = time.monotonic()
                until = probe_start + 90
                while True:
                    try:
                        with urllib.request.urlopen(urllib.request.Request(endpoint_url + "/health", headers=headers), timeout=15) as response:
                            if json.load(response).get("ready") is not True:
                                raise RuntimeError("MicroVM runtime health failed")
                        break
                    except (urllib.error.URLError, TimeoutError) as error:
                        if time.monotonic() >= until:
                            if isinstance(error, urllib.error.HTTPError):
                                self.journal["endpointFailure"] = {"status": error.code, "body": error.read().decode(errors="replace")[:2000]}
                                self.save()
                            raise
                        time.sleep(2)
                endpoint_ready = time.monotonic() - probe_start
                def invoke():
                    request = urllib.request.Request(endpoint_url + "/invoke", data=b'{"name":"MicroVM"}', headers=headers)
                    started = time.monotonic()
                    with urllib.request.urlopen(request, timeout=90) as response:
                        result = json.load(response)
                    if result.get("message") != "Hello MicroVM":
                        raise AssertionError("Unexpected MicroVM fixture response")
                    return (time.monotonic() - started) * 1000, result["requestId"]
                first, first_id = invoke()
                warm, warm_id = invoke()
                if first_id == warm_id:
                    raise AssertionError("Invocation request IDs were reused")
                self.aws("lambda-microvms", "suspend-microvm", microvm_identifier=identifier)
                self.wait("get-microvm", "microvm_identifier", identifier, ("SUSPENDED",), timeout=180)
                self.aws("lambda-microvms", "resume-microvm", microvm_identifier=identifier)
                self.wait("get-microvm", "microvm_identifier", identifier, ("RUNNING",), timeout=180)
                resumed, resumed_id = invoke()
                if resumed_id in (first_id, warm_id):
                    raise AssertionError("Request ID reused after resume")
                self.report["samples"].append({"mode": mode, "trial": trial, "launchControlPlaneSeconds": launch,
                    "endpointHealthWaitSeconds": endpoint_ready,
                    "firstRequestMs": first, "warmRequestMs": warm, "resumedRequestMs": resumed, "suspendResumePassed": True})
                self.save()
                self.aws("lambda-microvms", "terminate-microvm", microvm_identifier=identifier)
                self.wait("get-microvm", "microvm_identifier", identifier, ("TERMINATED",), timeout=180)
                print("MicroVM " + mode + " trial " + str(trial + 1) + " passed", flush=True)
        self.report["medians"] = {mode: {key: statistics.median(sample[key] for sample in self.report["samples"] if sample["mode"] == mode)
            for key in ("launchControlPlaneSeconds", "firstRequestMs", "warmRequestMs", "resumedRequestMs")} for mode in ("auto", "off")}
        self.save()

    def cleanup(self):
        failures = []
        def attempt(service, operation, **parameters):
            try:
                return self.aws(service, operation, **parameters)
            except Exception as error:
                if not any(code in str(error) for code in ("ResourceNotFound", "NoSuchEntity", "NoSuchKey", "NotFoundException")):
                    failures.append(operation + ": " + str(error))
        for index, group in enumerate(self.journal["logs"]):
            # Preserve build/runtime diagnostics before deleting CloudWatch evidence.
            events = attempt("logs", "filter-log-events", log_group_name=group)
            if events:
                (self.directory / ("cloudwatch-" + str(index) + ".json")).write_text(json.dumps(events, indent=2) + "\n")
        for identifier in self.journal["microvms"]:
            current = attempt("lambda-microvms", "get-microvm", microvm_identifier=identifier)
            if current is None or current.get("state") == "TERMINATED":
                continue
            attempt("lambda-microvms", "terminate-microvm", microvm_identifier=identifier)
            try:
                self.wait("get-microvm", "microvm_identifier", identifier, ("TERMINATED",), timeout=180)
            except Exception as error:
                if "ResourceNotFound" not in str(error):
                    failures.append(str(error))
        for stored_image in self.journal["images"]:
            image = stored_image
            if not image.startswith("arn:"):
                account = self.journal.get("account") or self.aws("sts", "get-caller-identity")["Account"]
                image = "arn:aws:lambda:" + self.config["region"] + ":" + account + ":microvm-image:" + image
            attempt("lambda-microvms", "delete-microvm-image", image_identifier=image)
            until = time.monotonic() + 300
            while time.monotonic() < until:
                try:
                    state = self.aws("lambda-microvms", "get-microvm-image", image_identifier=image)["state"]
                    if state == "DELETED":
                        break
                    if state == "DELETION_FAILED":
                        failures.append("Image deletion failed")
                        break
                except RuntimeError as error:
                    if "ResourceNotFound" in str(error):
                        break
                    failures.append(str(error))
                    break
                time.sleep(3)
            else:
                failures.append("Image deletion timed out")
        for key in self.journal["objects"]:
            versions = attempt("s3api", "list-object-versions", bucket=self.config["bucket"], prefix=key) or {}
            for item in versions.get("Versions", []) + versions.get("DeleteMarkers", []):
                if item["Key"] == key:
                    attempt("s3api", "delete-object", bucket=self.config["bucket"], key=key, version_id=item["VersionId"])
            # Unversioned objects were included above by list-object-versions as version "null".
        role = self.journal.get("role")
        if role:
            attempt("iam", "delete-role-policy", role_name=role, policy_name="verification")
            attempt("iam", "delete-role", role_name=role)
        for group in self.journal["logs"]:
            attempt("logs", "delete-log-group", log_group_name=group)
        # Verify exact scoped resources; keep raw identities only in the private journal.
        for key in self.journal["objects"]:
            remaining = attempt("s3api", "list-object-versions", bucket=self.config["bucket"], prefix=key) or {}
            if any(item["Key"] == key for item in remaining.get("Versions", []) + remaining.get("DeleteMarkers", [])):
                failures.append("Uploaded source object versions remain")
        for group in self.journal["logs"]:
            remaining = attempt("logs", "describe-log-groups", log_group_name_prefix=group) or {}
            if any(item["logGroupName"] == group for item in remaining.get("logGroups", [])):
                attempt("logs", "delete-log-group", log_group_name=group)
            remaining = attempt("logs", "describe-log-groups", log_group_name_prefix=group) or {}
            if any(item["logGroupName"] == group for item in remaining.get("logGroups", [])):
                failures.append("Temporary log group remains")
        if role:
            try:
                self.aws("iam", "get-role", role_name=role)
                failures.append("Temporary role remains")
            except RuntimeError as error:
                if "NoSuchEntity" not in str(error):
                    failures.append(str(error))
        self.journal["cleanupErrors"] = failures
        self.journal["cleanupRequested"] = True
        self.journal["cleanupPassed"] = not failures
        self.report["cleanupPassed"] = not failures
        self.save()
        if failures:
            raise RuntimeError("Cleanup needs attention; see journal.json: " + "; ".join(failures))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image-zip", type=pathlib.Path, default=pathlib.Path("output/openaf-microvm-arm64.zip"))
    parser.add_argument("--bucket")
    parser.add_argument("--prefix", default="mvms")
    parser.add_argument("--profile", default="default")
    parser.add_argument("--region", default="eu-west-1")
    parser.add_argument("--runs", type=int, default=3)
    parser.add_argument("--cleanup", type=pathlib.Path, help="Retry cleanup from a retained journal.json")
    args = parser.parse_args()
    if args.cleanup:
        journal = json.loads(args.cleanup.read_text())
        Run(journal["config"], args.cleanup.parent).cleanup()
        return
    if not args.bucket or args.runs < 1:
        parser.error("--bucket and a positive --runs are required")
    name = "nma-temp-test-mvm-" + datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:6]
    directory = pathlib.Path("output/live-microvm") / name
    run = Run({"profile": args.profile, "region": args.region, "bucket": args.bucket, "prefix": args.prefix, "name": name}, directory)
    print("Evidence: " + str(directory), flush=True)
    try:
        run.verify(args.image_zip, args.runs)
        run.report["status"] = "passed"
    except Exception as error:
        run.report["status"] = "failed"
        run.journal["failure"] = str(error)
        run.save()
        raise
    finally:
        run.cleanup()


if __name__ == "__main__":
    main()
