// Run from OpenAPI: oaf -f tests/regression.js
try {
  var module = require("openapi.js"), count = 0
  function equal(actual, expected, label) {
    if (JSON.stringify(actual) != JSON.stringify(expected)) throw new Error(label + ": " + JSON.stringify(actual))
    count++
  }
  function rejects(fn, pattern, label) {
    try { fn() } catch (e) {
      if (!pattern.test(String(e))) throw new Error(label + ": unexpected " + e)
      count++
      return
    }
    throw new Error(label + ": expected rejection")
  }
  var spec = af.fromYAML(io.readFileString("examples/pets.yaml"))
  function api(options, source) { return new module.OpenAPI(source || spec, options) }
  equal(api().listOperations().map(function(o) { return o.operationId }), ["getPet", "updatePet"], "discovery")
  equal(new module.OpenAPI("examples/pets.yaml").listOperations().length, 2, "YAML file loading")
  equal(api().buildRequest("getPet", { path: { id: "a/b ?" }, query: { tags: ["a&b", "c"] } }).url,
    "http://127.0.0.1:18087/v1/pets/a%2Fb%20%3F?tags=a%26b&tags=c", "encoded path and repeated query")
  rejects(function() { api().buildRequest("getPet") }, /Missing required path/, "required path")
  rejects(function() { api().call("missing") }, /Unknown operation/, "unknown operation")
  rejects(function() { api().buildRequest("getPet", { path: { id: 1 }, query: { typo: 1 } }) }, /Unknown query/, "unknown parameter")
  rejects(function() { api().buildRequest("updatePet", { path: { id: 1 } }) }, /request body/, "required body")
  equal(api().buildRequest("updatePet", { path: { id: 1 }, body: { name: "Fido" } }).body, '{"name":"Fido"}', "JSON encoding")
  equal(api().resolve({ $ref: "#/components/schemas/Pet" }).required, ["name"], "local refs")
  equal(api({ documents: { "models.yaml": { Pet: { type: "string" } } } }).resolve({ $ref: "models.yaml#/Pet" }), { type: "string" }, "external registered refs")
  equal(api({ documents: { "defs/a.yaml": { X: { $ref: "b.yaml#/Y" } }, "defs/b.yaml": { Y: { type: "integer" } } } }).resolve({ $ref: "defs/a.yaml#/X" }), { type: "integer" }, "relative external refs")
  rejects(function() { api().resolve({ $ref: "https://example.invalid/spec.json" }) }, /requires options.documents/, "no implicit external fetch")
  rejects(function() { api().resolve({ $ref: "#/missing" }) }, /Unresolved reference/, "missing ref")
  var cyclic = JSON.parse(JSON.stringify(spec))
  cyclic.components.schemas.Cycle = { $ref: "#/components/schemas/Cycle" }
  rejects(function() { api({}, cyclic).resolve({ $ref: "#/components/schemas/Cycle" }) }, /Circular reference/, "cycle detection")
  var escaped = JSON.parse(JSON.stringify(spec))
  escaped.components.schemas["a/b~c"] = { type: "boolean" }
  equal(api({}, escaped).resolve({ $ref: "#/components/schemas/a~1b~0c" }).type, "boolean", "pointer escapes")
  var duplicate = JSON.parse(JSON.stringify(spec))
  duplicate.paths["/pets/{id}"].patch.operationId = "getPet"
  rejects(function() { api({}, duplicate) }, /Duplicate/, "duplicate ids")
  rejects(function() { new module.OpenAPI({ swagger: "2.0", paths: {} }) }, /3.0\/3.1/, "reject unsupported version")
  var changed = JSON.parse(JSON.stringify(spec))
  changed.openapi = "3.1.0"
  changed.servers = [{ url: "https://{region}.example.org/{version}", variables: { region: { default: "eu", enum: ["eu", "us"] }, version: { default: "v1" } } }]
  equal(api({ serverVariables: { region: "us" } }, changed).buildRequest("getPet", { path: { id: 1 } }).url, "https://us.example.org/v1/pets/1", "server expansion")
  rejects(function() { api({ serverVariables: { region: "xx" } }, changed).buildRequest("getPet", { path: { id: 1 } }) }, /server variable/, "server enum")
  changed.paths["/pets/{id}"].get.servers = [{ url: "/v2" }]
  equal(api({ sourceURL: "https://example.org/spec/openapi.yaml" }, changed).buildRequest("getPet", { path: { id: 1 } }).url, "https://example.org/v2/pets/1", "relative operation server")
  rejects(function() { api({}, changed).buildRequest("getPet", { path: { id: 1 } }) }, /absolute HTTP/, "relative server needs origin")
  equal(api({ baseURL: "https://override.example/api/" }, changed).buildRequest("getPet", { path: { id: 1 } }).url, "https://override.example/api/pets/1", "base override")
  var client = api()
  equal(client._serialize({ in: "query", name: "filter", style: "deepObject", explode: true }, { active: false, limit: 0 }), ["filter%5Bactive%5D=false", "filter%5Blimit%5D=0"], "deepObject")
  equal(client._serialize({ in: "query", name: "ids", style: "pipeDelimited" }, [1, 2]), ["ids=1%7C2"], "pipeDelimited")
  equal(client._serialize({ in: "query", name: "filter", explode: false }, { a: 1, b: 2 }), ["filter=a,1,b,2"], "form object")
  equal(client._serialize({ in: "path", name: "id", style: "matrix", explode: true }, [1, 2]), ";id=1;id=2", "matrix array")
  equal(client._serialize({ in: "path", name: "id", style: "label", explode: true }, { a: 1, b: 2 }), ".a=1.b=2", "label object")
  equal(client._serialize({ in: "header", name: "X-Test", explode: true }, { a: 1, b: 2 }), "a=1,b=2", "header object")
  rejects(function() { client._serialize({ in: "query", name: "q" }, { nested: {} }) }, /scalar/, "reject nested values")
  rejects(function() { client._serialize({ in: "query", name: "q", allowReserved: true }, "a") }, /allowReserved/, "unsupported parameter option")
  rejects(function() { api({ headers: { "X-Test": "a\r\nb" } }).buildRequest("getPet", { path: { id: 1 } }) }, /Invalid HTTP header/, "header injection")
  var secured = JSON.parse(JSON.stringify(spec))
  secured.components.securitySchemes = { key: { type: "apiKey", in: "header", name: "X-Key" }, bearer: { type: "http", scheme: "bearer" }, basic: { type: "http", scheme: "basic" } }
  secured.security = [{ key: [], bearer: [] }, { basic: [] }]
  rejects(function() { api({ auth: { key: "test" } }, secured).buildRequest("getPet", { path: { id: 1 } }) }, /Missing credentials/, "security AND")
  var req = api({ auth: { key: "test", bearer: "token" } }, secured).buildRequest("getPet", { path: { id: 1 } })
  equal(req.headers, { "X-Key": "test", Authorization: "Bearer token" }, "security AND headers")
  req = api({ auth: { basic: { username: "user", password: "pass" } } }, secured).buildRequest("getPet", { path: { id: 1 } })
  equal(String(req.headers.Authorization), "Basic dXNlcjpwYXNz", "basic OR alternative")
  secured.paths["/pets/{id}"].get.security = []
  equal(api({}, secured).buildRequest("getPet", { path: { id: 1 } }).headers, {}, "security override")
  var tools = client.toTools(["getPet", "updatePet"])
  equal(tools[0].inputSchema.required, ["path"], "tool required group")
  equal(tools[1].inputSchema.properties.body.required, ["name"], "tool resolved body")
  client.call = function(id, args) { return [id, args] }
  equal(tools[0].execute({ path: { id: 3 } }), ["getPet", { path: { id: 3 } }], "tool execution binding")
  rejects(function() { client.toTools() }, /explicit/, "explicit tool selection")
  rejects(function() { client.toTools(["getPet", "getPet"]) }, /colliding/, "tool collisions")
  equal(client.toTools([]), [], "empty selection exposes nothing")
  var jobs = client.toJobs(["getPet"], "examples/pets.yaml")
  equal(jobs.jobs.length, 1, "job selection")
  equal(jobs.jobs[0].exec.indexOf("args.openapiOptions") >= 0, true, "runtime credentials only")
  equal(JSON.stringify(spec).indexOf("Authorization"), -1, "source unchanged")
  rejects(function() { api().resolve({ $ref: "#/components/schemas/Pet", type: "string" }) }, /Reference siblings/, "reject unsupported ref siblings")
  equal(api().resolve({ $ref: "#/components/schemas/Pet", description: "override" }).description, "override", "reference description")
  rejects(function() { api().buildRequest("getPet", { path: { id: ".." } }) }, /Dot segments/, "path traversal segment")
  rejects(function() { api().buildRequest("getPet", { paths: {} }) }, /Unknown argument/, "unknown top-level argument")
  rejects(function() { api().buildRequest("getPet", { path: "id" }) }, /groups must be maps/, "invalid group")
  equal(api()._toolSchema({ type: "number", nullable: true, minimum: 1, exclusiveMinimum: true }), { type: ["number", "null"], exclusiveMinimum: 1 }, "3.0 schema conversion")
  var overrides = JSON.parse(JSON.stringify(spec))
  overrides.paths["/pets/{id}"].parameters.push({ name: "q", in: "query", required: true, schema: { type: "integer" } })
  overrides.paths["/pets/{id}"].get.parameters.push({ name: "q", in: "query", schema: { type: "integer", default: 0 } })
  equal(api({}, overrides).buildRequest("getPet", { path: { id: 1 } }).url, "http://127.0.0.1:18087/v1/pets/1?q=0", "parameter override and default zero")
  var noId = JSON.parse(JSON.stringify(spec))
  delete noId.paths["/pets/{id}"].get.operationId
  equal(api({}, noId).listOperations()[0].operationId, "GET /pets/{id}", "fallback operation name")
  var methods = JSON.parse(JSON.stringify(spec))
  methods.paths["/pets/{id}"].options = { operationId: "options" }
  rejects(function() { api({}, methods).buildRequest("options", { path: { id: 1 } }) }, /Unsupported HTTP method/, "unsupported method")
  equal(api({ documents: { "external.yaml": { X: { $ref: "#/Y" }, Y: { type: "string" } } } }).resolve({ $ref: "external.yaml#/X" }).type, "string", "external local fragment context")
  print("PASS OpenAPI: " + count + " regression checks")
} catch (e) { printErr(e); exit(1) }
