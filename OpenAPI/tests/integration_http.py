"""Real loopback HTTP tests: python3 tests/integration_http.py (requires oaf on PATH)."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[1]
SPEC = {
    "openapi": "3.0.3", "info": {"title": "Loopback", "version": "1"},
    "servers": [{"url": "/api"}], "paths": {},
    "components": {"securitySchemes": {
        "key": {"type": "apiKey", "in": "query", "name": "key"},
        "cookie": {"type": "apiKey", "in": "cookie", "name": "session"},
    }},
}
for method in ("get", "post", "put", "patch", "delete", "head", "options", "trace"):
    op = {"operationId": method, "responses": {"200": {"description": "ok"}}}
    if method in ("post", "put", "patch"):
        op["requestBody"] = {"required": True, "content": {
            "application/json": {"schema": {}}, "text/plain": {"schema": {"type": "string"}},
            "application/x-www-form-urlencoded": {"schema": {"type": "object"}}
        }}
    SPEC["paths"].setdefault("/echo", {})[method] = op
SPEC["paths"]["/echo"]["get"]["security"] = [{"key": [], "cookie": []}]
SPEC["paths"]["/error"] = {"get": {"operationId": "error", "responses": {"409": {"description": "conflict"}}}}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def handle_request(self):
        body = self.rfile.read(int(self.headers.get("Content-Length", 0))).decode()
        if self.path == "/spec.yaml":
            encoded = (ROOT / "examples/pets.yaml").read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "application/yaml")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)
            return
        if self.path == "/spec.json":
            result, status = SPEC, 200
        elif self.path == "/api/error":
            result, status = {"error": "conflict"}, 409
        else:
            result, status = {"method": self.command, "path": self.path,
                              "headers": dict(self.headers), "body": body}, 200
        encoded = json.dumps(result).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(encoded)

    do_GET = do_POST = do_PUT = do_PATCH = do_DELETE = do_HEAD = handle_request


server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
script = r'''
try {
  var source = __SOURCE__, count = 0
  var lib = require("openapi.js")
  function eq(a, b, label) {
    if (JSON.stringify(a) != JSON.stringify(b)) throw new Error(label + ": " + JSON.stringify(a))
    count++
  }
  var api = new lib.OpenAPI(source, { auth: { key: "a&b", cookie: "s=v" } })
  var yamlAPI = new lib.OpenAPI(source.replace("spec.json", "spec.yaml"), { baseURL: source.replace("/spec.json", "/api") })
  eq(yamlAPI.call("getPet", { path: { id: "123" } }).path, "/api/pets/123", "YAML URL loading")
  var result = api.call("get")
  eq(result.path, "/api/echo?key=a%26b", "URL loading and query auth")
  eq(result.headers.Cookie, "session=s%3Dv", "cookie auth")
  ;["post", "put", "patch"].forEach(function(method) {
    var r = api.call(method, { body: { enabled: false, n: 0 } })
    eq(r.method, method.toUpperCase(), "HTTP method")
    eq(JSON.parse(r.body), { enabled: false, n: 0 }, "JSON body")
    eq(r.headers["Content-Type"], "application/json", "JSON content type")
  })
  eq(api.call("post", { body: "hello" }).body, '"hello"', "JSON scalar string")
  eq(api.call("post", { body: null }).body, "null", "JSON null")
  eq(api.call("post", { body: "hello", contentType: "text/plain" }).body, "hello", "text body")
  eq(api.call("post", { body: { a: "x&y", tags: ["one", "two"] }, contentType: "application/x-www-form-urlencoded" }).body, "a=x%26y&tags=one&tags=two", "form body")
  eq(api.call("delete").method, "DELETE", "DELETE transport")
  api.call("head")
  count++
  var failed = false
  try { api.call("error") } catch (e) { failed = true }
  eq(failed, true, "HTTP failure throws")
  eq(api.toTools(["post"])[0].execute({ body: { from: "tool" } }).body, '{"from":"tool"}', "tool live dispatch")
  var jobs = api.toJobs(["post"], source), args = { openapiArgs: { body: { from: "job" } } }
  eval(jobs.jobs[0].exec)
  eq(args.result.body, '{"from":"job"}', "generated job execution")
  jobs.jobs[0].exec += '\nif (args.result.body != \'{"from":"runner"}\') throw new Error("Unexpected job response")\nprint("PASS generated oJob runner")'
  jobs.todo = [{ name: "post", args: { openapiArgs: { body: { from: "runner" } } } }]
  io.writeFileString(__JOBFILE__, af.toYAML(jobs))
  print("PASS OpenAPI HTTP: " + count + " loopback checks")
} catch (e) { printErr(e); exit(1) }
'''.replace("__SOURCE__", json.dumps(f"http://127.0.0.1:{server.server_port}/spec.json"))
try:
    with tempfile.TemporaryDirectory(prefix="openapi-http-") as directory:
        path = Path(directory) / "test.js"
        job_path = Path(directory) / "generated.yaml"
        path.write_text(script.replace("__JOBFILE__", json.dumps(str(job_path))))
        result = subprocess.run([shutil.which("oaf") or "oaf", "-f", str(path)], cwd=ROOT, timeout=60)
        if result.returncode:
            raise SystemExit(result.returncode)
        result = subprocess.run([shutil.which("ojob") or "ojob", str(job_path)], cwd=ROOT,
                                timeout=60, capture_output=True, text=True)
        if result.returncode or "PASS generated oJob runner" not in result.stdout:
            print(result.stdout)
            print(result.stderr)
            raise SystemExit(result.returncode or 1)
        print("PASS generated oJob runner")
finally:
    server.shutdown()
    server.server_close()
