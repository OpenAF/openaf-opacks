#!/usr/bin/env python3
"""Runtime integration tests against a local Lambda Runtime API and download server.

Host: python3 tests/test_runtime.py --openaf /Applications/OpenAF --java /path/to/java
ZIP:  python3 tests/test_runtime.py --zip output/openaf-lambda-arm64.zip --arch arm64
"""
import argparse
import base64
import hashlib
import http.server
import io
import json
import os
import pathlib
import shutil
import socket
import subprocess
import tempfile
import threading
import time
import unittest
import urllib.parse
import zipfile

SOURCE = pathlib.Path(__file__).resolve().parents[1]
OPTIONS = None


def bundle(entries):
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, content in entries.items():
            archive.writestr(name, content)
    return output.getvalue()


class Fixture:
    def __init__(self, events=(), payload=b"", download_status=200, response_status=202):
        self.events = list(events)
        self.payload = payload
        self.download_status = download_status
        self.response_status = response_status
        self.responses = []
        self.downloads = []
        self.posts = []
        self.sent_at = []
        self.received_at = []
        self.done = threading.Event()
        fixture = self

        class Handler(http.server.BaseHTTPRequestHandler):
            protocol_version = "HTTP/1.1"

            def setup(self):
                super().setup()
                self.connection.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)

            def handle(self):
                try:
                    super().handle()
                except (ConnectionResetError, BrokenPipeError):
                    pass

            def log_message(self, *_):
                pass

            def reply(self, status, body=b"", headers=None):
                self.send_response(status)
                self.send_header("Content-Length", str(len(body)))
                for key, value in (headers or {}).items():
                    self.send_header(key, value)
                self.end_headers()
                try:
                    self.wfile.write(body)
                except (BrokenPipeError, ConnectionResetError):
                    pass

            def do_GET(self):
                if self.path.endswith("/invocation/next"):
                    if not fixture.events:
                        fixture.done.wait(90)
                        self.reply(503)
                        return
                    index = len(fixture.responses)
                    event = fixture.events.pop(0)
                    fixture.sent_at.append(time.monotonic())
                    self.reply(200, json.dumps(event).encode(), {
                        "Lambda-Runtime-Aws-Request-Id": "request-" + str(index),
                        "Lambda-Runtime-Invoked-Function-Arn": "arn:aws:lambda:test:function:fixture",
                        "Lambda-Runtime-Deadline-Ms": str(int(time.time() * 1000) + 60000),
                        "Lambda-Runtime-Trace-Id": "Root=trace-" + str(index)
                    })
                else:
                    fixture.downloads.append((self.path, self.headers.get("Authorization")))
                    self.reply(fixture.download_status, fixture.payload)

            def do_POST(self):
                body = self.rfile.read(int(self.headers.get("Content-Length", "0")))
                fixture.posts.append((self.path, json.loads(body)))
                if "/invocation/" in self.path:
                    fixture.received_at.append(time.monotonic())
                    fixture.responses.append((self.path.rsplit("/", 1)[-1], json.loads(body)))
                self.reply(fixture.response_status)

        self.server = http.server.ThreadingHTTPServer(("0.0.0.0", 0), Handler)
        self.server.daemon_threads = True
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        hostname = "host.docker.internal" if OPTIONS.zip else "127.0.0.1"
        self.address = hostname + ":" + str(self.server.server_port)
        self.url = "http://" + self.address

    def close(self):
        self.done.set()
        self.server.shutdown()
        self.server.server_close()


class RuntimeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.artifact = None
        if OPTIONS.zip:
            cls.artifact = tempfile.TemporaryDirectory(prefix="lambda-artifact-")
            with zipfile.ZipFile(OPTIONS.zip) as archive:
                archive.extractall(cls.artifact.name)
                for entry in archive.infolist():
                    mode = entry.external_attr >> 16
                    if mode:
                        os.chmod(pathlib.Path(cls.artifact.name) / entry.filename, mode)

    @classmethod
    def tearDownClass(cls):
        if cls.artifact:
            cls.artifact.cleanup()

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="lambda-test-")
        self.directory = pathlib.Path(self.temporary.name)
        self.root = self.directory / "task"
        self.root.mkdir()
        if OPTIONS.zip:
            for name in ("jre", "openaf"):
                (self.root / name).mkdir()
            shutil.copytree(pathlib.Path(self.artifact.name) / "runtime", self.root / "runtime")
            shutil.copy2(pathlib.Path(self.artifact.name) / "bootstrap", self.root / "bootstrap")
        else:
            shutil.copytree(SOURCE / "runtime", self.root / "runtime")
            shutil.copy2(SOURCE / "runtime/bootstrap", self.root / "bootstrap")
            os.symlink(OPTIONS.openaf.resolve(), self.root / "openaf")
            (self.root / "jre/bin").mkdir(parents=True)
            os.symlink(pathlib.Path(OPTIONS.java).resolve(), self.root / "jre/bin/java")
        self.function = self.root / "function"
        self.function.mkdir()
        self.fixture = None
        self.process = None
        self.logs = self.directory / "logs"
        self.log_stream = self.logs.open("w+")
        self.container_name = "openaf-lambda-test-" + str(os.getpid()) + "-" + str(time.time_ns())

    def tearDown(self):
        if self.process:
            if OPTIONS.zip:
                subprocess.run(["docker", "rm", "-f", self.container_name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            self.process.terminate()
            try:
                self.process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()
        if self.fixture:
            self.fixture.close()
        self.log_stream.close()
        self.temporary.cleanup()

    def start(self, events=(), payload=b"", status=200, response_status=202, **settings):
        self.fixture = Fixture(events, payload, status, response_status)
        env = {"AWS_LAMBDA_RUNTIME_API": self.fixture.address, "OJOB_JSONLOG": "true", "_HANDLER": "main.js", **settings}
        env = {key: str(value).replace("{URL}", self.fixture.url) for key, value in env.items()}
        if OPTIONS.zip:
            # Mount large runtime directories separately to avoid copying the JRE per test.
            command = ["docker", "run", "--rm", "--name", self.container_name, "--platform", "linux/" + ("amd64" if OPTIONS.arch == "x86_64" else "arm64"),
                       "--read-only", "--memory", "512m", "--cpus", "1", "--user", "1000:1000", "--tmpfs", "/tmp:rw,exec,size=512m,mode=1777", "--entrypoint", "/bin/sh"]
            command += ["-v", str(self.root) + ":/var/task:ro"]
            for name in ("jre", "openaf"):
                command += ["-v", str(pathlib.Path(self.artifact.name) / name) + ":/var/task/" + name + ":ro"]
            for key, value in env.items():
                command += ["-e", key + "=" + value]
            command += ["public.ecr.aws/lambda/provided:al2023", "/var/task/bootstrap"]
            self.process = subprocess.Popen(command, stdout=self.log_stream, stderr=subprocess.STDOUT)
        else:
            clean = {key: value for key, value in os.environ.items() if not key.startswith(("OJOB_", "OAF_", "AWS_"))}
            clean.update(env, OAF_LAMBDA_ROOT=str(self.root), OAF_HOME=str(self.directory / "home"), TMPDIR=str(self.directory))
            self.process = subprocess.Popen(["/bin/sh", str(self.root / "bootstrap")], env=clean, stdout=self.log_stream, stderr=subprocess.STDOUT)

    def wait(self, count=1, init_error=False, exited=False):
        deadline = time.monotonic() + (120 if OPTIONS.zip else 35)
        while time.monotonic() < deadline:
            complete = any(route.endswith("/init/error") for route, _ in self.fixture.posts) if init_error else len(self.fixture.responses) >= count
            if exited:
                complete = self.process.poll() is not None
            if complete:
                return
            if self.process.poll() is not None:
                self.fail("Runtime exited unexpectedly:\n" + self.logs.read_text())
            time.sleep(0.05)
        self.fail("Runtime timed out:\n" + self.logs.read_text())

    def test_script_warm_state_context_and_output_reset(self):
        (self.function / "main.js").write_text('global.count = isDef(global.count) ? global.count + 1 : 1;\n'
            'if (__pmIn.fail) throw new Error("deliberate");\n'
            'if (__pmIn.fresh) { __pmOut.seen = isUnDef(__pmOut.previous); } else __pmOut.previous = true;\n'
            '__pmOut.count = global.count; __pmOut.id = __lambdaContext.awsRequestId;\n'
            '__pmOut.remaining = __lambdaContext.getRemainingTimeInMillis(); __pmOut.trace = getEnv("_X_AMZN_TRACE_ID");\n')
        self.start([{}, {"fail": True}, {"fresh": True}])
        self.wait(3)
        first, error, last = self.fixture.responses
        self.assertEqual(first[1]["count"], 1)
        self.assertEqual(error[0], "error")
        self.assertIn("deliberate", error[1]["errorMessage"])
        self.assertEqual(last[0], "response", repr(self.fixture.responses) + "\n" + self.logs.read_text())
        self.assertEqual(last[1]["count"], 3)
        self.assertTrue(last[1]["seen"])
        self.assertEqual(last[1]["id"], "request-2")
        self.assertEqual(last[1]["trace"], "Root=trace-2")
        self.assertGreater(last[1]["remaining"], 0)

    def test_local_zip_nested_entrypoint_and_binary_resource(self):
        data = bundle({"nested/main.js": '__pmOut = { value: io.readFileString("data.txt"), length: io.readFileBytes("binary.dat").length };',
                       "nested/data.txt": "relative works", "nested/binary.dat": bytes(range(256))})
        (self.function / "payload.zip").write_bytes(data)
        self.start([{}], OJOB_METHOD="LOCAL", OJOB_CONFIG="payload.zip", OJOB_ENTRYPOINT="nested/main.js", OJOB_SHA256=hashlib.sha256(data).hexdigest())
        self.wait()
        self.assertEqual(self.fixture.responses[0], ("response", {"value": "relative works", "length": 256}))

    def test_http_zip_download_once_auth_and_integrity(self):
        data = bundle({"main.js": '__pmOut = {bytes: io.readFileBytes("binary.dat").length};', "binary.dat": bytes(range(256)) * 300})
        self.start([{}, {}], payload=data, OJOB_METHOD="http", OJOB_CONFIG="{URL}/package.zip?version=1", login="user", **{"pass": "password"},
                   OJOB_HASH=hashlib.sha1(data).hexdigest(), OJOB_SHA256=hashlib.sha256(data).hexdigest())
        self.wait(2)
        self.assertEqual(len(self.fixture.downloads), 1)
        self.assertEqual(self.fixture.downloads[0][1], "Basic " + base64.b64encode(b"user:password").decode())
        self.assertTrue(all(result == ("response", {"bytes": 76800}) for result in self.fixture.responses))

    def test_http_standalone_script(self):
        self.start([{"name": "test"}], payload=b'__pmOut = {hello: __pmIn.name};', OJOB_METHOD="http", OJOB_CONFIG="{URL}/hello.js")
        self.wait()
        self.assertEqual(self.fixture.responses[0], ("response", {"hello": "test"}))

    def test_local_file_preserves_siblings_and_load(self):
        (self.function / "main.js").write_text('load("helper.js"); __pmOut = {value: helper + io.readFileString("resource")};')
        (self.function / "helper.js").write_text('global.helper = "loaded ";')
        (self.function / "resource").write_text("resource")
        self.start([{}], OJOB_METHOD="local", OJOB_CONFIG="main.js")
        self.wait()
        self.assertEqual(self.fixture.responses[0], ("response", {"value": "loaded resource"}))

    def test_yaml_ojob_failure_then_success(self):
        (self.function / "main.yaml").write_text('ojob:\n  sequential: true\n  logToConsole: false\ntodo:\n- Cleanup\n- Run\njobs:\n- name: Cleanup\n  type: shutdown\n  exec: |\n    __pmOut.cleanup = true;\n- name: Run\n  exec: |\n    if (args.fail) throw "ojob deliberate failure";\n    __pmOut = {name: args.name, id: __lambdaContext.awsRequestId};\n')
        self.start([{"fail": True}, {"name": "second"}, {"name": "third"}], _HANDLER="main.yaml")
        self.wait(3)
        self.assertEqual(self.fixture.responses[0][0], "error")
        self.assertEqual(self.fixture.responses[1], ("response", {"name": "second", "id": "request-1", "cleanup": True}))
        self.assertEqual(self.fixture.responses[2], ("response", {"name": "third", "id": "request-2", "cleanup": True}))

    def test_json_ojob(self):
        (self.function / "main.json").write_text(json.dumps({"ojob": {"sequential": True, "logToConsole": False}, "todo": ["Run"],
            "jobs": [{"name": "Run", "exec": '__pmOut = {value: args.value};'}]}))
        self.start([{"value": 42}], _HANDLER="main.json")
        self.wait()
        self.assertEqual(self.fixture.responses[0], ("response", {"value": 42}))

    def test_s3_presigning_and_binary_transport(self):
        # Exercise the real AWS signer, redirecting only the generated download URL to the fixture.
        # This verifies credentials/key encoding and binary retrieval without claiming live S3 proof.
        runtime = self.root / "runtime/lambda.js"
        code = runtime.read_text()
        if not OPTIONS.zip:
            aws = self.root / "runtime/aws"
            aws.mkdir()
            for name in ("aws_core.js", "aws_s3.js"):
                shutil.copy2(SOURCE.parent / "AWS" / name, aws / name)
            code = code.replace('loadLib("aws_s3.js");',
                'load(root + "/runtime/aws/aws_core.js"); load(root + "/runtime/aws/aws_s3.js");')
        code = code.replace('download(aws.S3_GetPresignedURL(region, bucket, key, 300), source);',
            'var signed = aws.S3_GetPresignedURL(region, bucket, key, 300);\n'
            'download(env("OAF_TEST_DOWNLOAD", "") + "?" + signed.split("?")[1], source);')
        runtime.write_text(code)
        data = bundle({"main.js": '__pmOut = {length: io.readFileBytes("binary.dat").length};', "binary.dat": bytes(range(256))})
        self.start([{}], payload=data, OJOB_METHOD="s3", OJOB_CONFIG="s3://fixture-bucket/jobs/space name.zip", AWS_REGION="eu-west-1",
                   AWS_ACCESS_KEY_ID="DUMMYACCESS", AWS_SECRET_ACCESS_KEY="dummy-secret", AWS_SESSION_TOKEN="dummy-session",
                   OAF_TEST_DOWNLOAD="{URL}/s3.zip")
        self.wait()
        self.assertEqual(self.fixture.responses[0], ("response", {"length": 256}))
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(self.fixture.downloads[0][0]).query)
        self.assertEqual(query["X-Amz-Security-Token"], ["dummy-session"])
        self.assertIn("DUMMYACCESS/", query["X-Amz-Credential"][0])
        self.assertIn("/eu-west-1/s3/aws4_request", query["X-Amz-Credential"][0])
        self.assertEqual(len(query["X-Amz-Signature"][0]), 64)

    def test_packaged_opack_discovery(self):
        if not OPTIONS.zip:
            self.skipTest("Requires a built deployment ZIP")
        (self.function / "main.js").write_text('loadLib("aws_s3.js"); __pmOut = { aws: isFunction(AWS.prototype.S3_GetPresignedURL), common: isDef(getOPackPath("oJob-common")) };')
        self.start([{}])
        self.wait()
        self.assertEqual(self.fixture.responses[0], ("response", {"aws": True, "common": True}))

    def test_initialization_errors(self):
        cases = [
            ({"../escape": "bad", "main.js": ""}, {}, "escapes"),
            ({"/absolute": "bad", "main.js": ""}, {}, "Invalid workload path"),
            ({"other.js": ""}, {}, "entrypoint"),
            ({"main.js": ""}, {"OJOB_SHA256": "0" * 64}, "mismatch"),
            ({"main.js": "x" * 3000}, {"OJOB_MAX_BYTES": "2000"}, "OJOB_MAX_BYTES"),
        ]
        # Each subcase gets a separate runtime, matching Lambda's failed initialization lifecycle.
        for entries, settings, expected in cases:
            with self.subTest(expected=expected):
                try:
                    self.start(payload=bundle(entries), OJOB_METHOD="http", OJOB_CONFIG="{URL}/bad.zip", **settings)
                    self.wait(init_error=True)
                    self.assertIn(expected, self.fixture.posts[0][1]["errorMessage"])
                    self.assertEqual(self.fixture.responses, [])
                finally:
                    self.tearDown()
                    self.setUp()

    def test_download_http_error(self):
        self.start(payload=b"denied", status=403, OJOB_METHOD="http", OJOB_CONFIG="{URL}/bad.zip?secret=do-not-log")
        self.wait(init_error=True)
        self.assertIn("403", self.fixture.posts[0][1]["errorMessage"])
        self.assertNotIn("do-not-log", self.logs.read_text())

    def test_malformed_and_duplicate_archives(self):
        for payload, expected in [(b"not a zip", "zip"),
                                  (bundle({"a/../main.js": "", "main.js": ""}), "duplicate")]:
            with self.subTest(expected=expected):
                try:
                    self.start(payload=payload, OJOB_METHOD="http", OJOB_CONFIG="{URL}/bad.zip")
                    self.wait(init_error=True)
                    self.assertIn(expected, self.fixture.posts[0][1]["errorMessage"].lower())
                    self.assertEqual(self.fixture.responses, [])
                finally:
                    self.tearDown()
                    self.setUp()

    def test_response_delivery_failure_does_not_reexecute(self):
        (self.function / "main.js").write_text('__pmOut = {ok: true};')
        self.start([{}, {}], response_status=500)
        self.wait(exited=True)
        self.assertEqual(len(self.fixture.responses), 1)
        self.assertEqual(len(self.fixture.posts), 1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--openaf", type=pathlib.Path, default=pathlib.Path("/Applications/OpenAF"))
    parser.add_argument("--java", default=shutil.which("java"))
    parser.add_argument("--zip", type=pathlib.Path)
    parser.add_argument("--arch", choices=("arm64", "x86_64"), default="arm64")
    OPTIONS, remaining = parser.parse_known_args()
    unittest.main(argv=[__file__, *remaining], verbosity=2)
