#!/usr/bin/env python3
"""Exercise the actual MicroVM application image locally (requires Docker)."""
import argparse
import json
import pathlib
import subprocess
import tempfile
import threading
import time
import urllib.error
import urllib.request


def docker(*args):
    return subprocess.check_output(["docker", *args], text=True).strip()


def request(port, path, event=None):
    data = json.dumps(event).encode() if event is not None else None
    req = urllib.request.Request("http://127.0.0.1:" + str(port) + path, data=data,
                                 headers={"Content-Type": "application/json"})
    try:
        response = urllib.request.urlopen(req, timeout=90)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        body = response.read()
        return response.status, json.loads(body) if body else None


def exercise(image, mode, script=None):
    options = ["run", "--detach", "--rm", "--platform", "linux/arm64", "--memory", "1g", "--cpus", "1",
               "-p", "127.0.0.1::8080", "-p", "127.0.0.1::8081", "-e", "OAF_JAVA_XSHARE=" + mode]
    if script:
        options += ["--mount", "type=bind,source=" + str(script) + ",target=/var/task/function,readonly",
                    "-e", "OJOB_ENTRYPOINT=main.js", "-e", "OAF_MICROVM_TIMEOUT=2"]
    identifier = docker(*options, image)
    try:
        port = int(docker("port", identifier, "8080/tcp").rsplit(":", 1)[1])
        hooks = int(docker("port", identifier, "8081/tcp").rsplit(":", 1)[1])
        until = time.monotonic() + 120
        while time.monotonic() < until:
            try:
                if request(hooks, "/aws/lambda-microvms/runtime/v1/ready", {})[0] == 200:
                    break
            except OSError:
                pass
            time.sleep(0.2)
        else:
            raise AssertionError("OpenAF did not become ready")
        assert request(hooks, "/aws/lambda-microvms/runtime/v1/validate", {})[0] == 200
        assert request(port, "/aws/lambda-microvms/runtime/v1/run", {})[0] == 404
        assert request(port, "/invoke")[0] == 405
        ids = []
        for index in range(2):
            status, value = request(port, "/invoke", {"name": "MicroVM"})
            assert status == 200, value
            assert value["message"] == "Hello MicroVM", value
            ids.append(value["requestId"])
            if script:
                assert value["count"] == index + 1, value
        assert len(set(ids)) == 2
        if script:
            assert request(port, "/invoke", {"fail": True})[0] == 500
            status, value = request(port, "/invoke", {"name": "MicroVM"})
            assert status == 200 and value["count"] == 4, value
            results = []
            worker = threading.Thread(target=lambda: results.append(request(port, "/invoke", {"name": "MicroVM", "wait": True})))
            worker.start()
            time.sleep(0.15)
            assert request(port, "/invoke", {"name": "Overlap"})[0] == 409
            worker.join(5)
            assert results and results[0][0] == 200, results
            assert request(port, "/invoke", {"timeout": True})[0] == 408
            assert request(port, "/health")[0] == 503
            assert request(port, "/invoke", {})[0] == 503
        print(("script" if script else "oJob") + " " + mode + ": passed", flush=True)
    except Exception:
        print(docker("logs", identifier))
        raise
    finally:
        docker("rm", "--force", identifier)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", default="openaf-microvm-test:local")
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix="openaf-microvm-test-") as temporary:
        script = pathlib.Path(temporary)
        (script / "main.js").write_text('global.microvmCount = (global.microvmCount || 0) + 1;\n'
            'if (__pmIn.fail) throw new Error("Expected fixture failure");\n'
            'if (__pmIn.timeout) java.lang.Thread.sleep(10000);\n'
            'if (__pmIn.wait) java.lang.Thread.sleep(500);\n'
            '__pmOut = {message: "Hello " + __pmIn.name, count: global.microvmCount, requestId: __lambdaContext.awsRequestId};\n')
        for mode in ("auto", "off"):
            exercise(args.image, mode)
            exercise(args.image, mode, script)


if __name__ == "__main__":
    main()
