# OpenAPI

Use OpenAPI specifications from OpenAF to discover and call operations through
`$rest`, create selected tool descriptors, and generate reusable oJob definitions.
No additional JARs or external JavaScript runtime are required.

## Install and load

```sh
opack install OpenAPI
```

```javascript
var OpenAPI = require("openapi.js").OpenAPI
var api = new OpenAPI("./service.yaml", {
  baseURL: "https://api.example.com/v1"
})
print(api.listOperations())
var result = api.call("getPet", {
  path: { id: "123" },
  query: { tags: ["friendly", "small"] }
})
```

`loadLib("openapi.js")` also exposes `OpenAPI` and the `$openapi(source, options)`
factory. The source can be a parsed map, a JSON/YAML file path, or an HTTP(S) URL.
To load an inline document string, parse it first with `af.fromYAML(text)`.
`examples/pets.yaml` is a small specification for a local example service; it
does not start a service itself.

## Configuration

| Option | Purpose |
|---|---|
| `baseURL` | Explicit API server URL, overriding the specification. |
| `serverIndex` | Server array index, default `0`. Operation servers take precedence over path and root servers. |
| `serverVariables` | Server variable values; defaults and enums come from the selected server. |
| `sourceURL` | Resolution origin for relative server URLs when supplying a map or local file. Set automatically for URL sources. |
| `auth` | Credentials keyed by the specification's security scheme names. |
| `headers` | Additional API request headers. Declared header parameters and security credentials take precedence, case-insensitively. |
| `restOptions` | API `$rest` options, e.g. `connectionTimeout`, `timeout`, `httpClient`. `throwExceptions` defaults to `true`. Headers are supplied through `headers`, not `restOptions.requestHeaders`. |
| `specRestOptions` | Separate `$rest` options for downloading the root specification. API credentials are not copied into specification requests. |
| `documents` | Map of explicitly supplied, already-parsed external reference documents. |

Use specifications and server URLs you trust. API calls target the server selected
by the specification unless `baseURL` is set. Normal `$rest` transport behavior,
including any configured retries or redirects, applies. Avoid enabling retries
for operations that cannot safely be repeated.

## Discovery, request construction and calls

```javascript
api.listOperations()
// [{ operationId, method, path, summary, description, tags }, ...]

var request = api.buildRequest("getPet", { path: { id: "a/b" } })
// { operationId, method, url, headers, body }

var updated = api.call("updatePet", {
  path: { id: "123" },
  body: { name: "Fido" }
})
```

An operation without `operationId` is named `METHOD /path`, for example
`GET /pets/{id}`. Duplicate operation IDs are rejected.

Arguments are grouped by parameter location: `path`, `query`, `header`, `cookie`.
The other accepted keys are `body` and `contentType`. Required parameters and
bodies are checked before I/O; undeclared parameters are rejected. Operation
parameters override path parameters with the same name and location. Parameter
schema defaults are applied when a value is omitted. `false`, `0` and empty
strings are preserved.

`buildRequest` does not execute anything, but its output **can contain credentials**
in headers or query parameters. Avoid logging it with real credentials.

Supported serialization:

- Path: `simple`, `label`, `matrix`, including array/object `explode` variants.
- Query: `form`, flat `deepObject` with `explode: true`, and arrays using
  `spaceDelimited`/`pipeDelimited` with `explode: false`.
- Header: `simple`; cookie: scalar `form` values.
- Request bodies: JSON (including scalar JSON and `application/*+json`),
  `text/plain`, and `application/x-www-form-urlencoded` maps. Form fields use the
  Encoding Object's supported `style`/`explode` settings.

Body content type defaults to `application/json` if declared, otherwise the first
declared media type. Set `contentType` to select another declared type. JSON bodies
are serialized exactly once, including string and null values.

GET, POST, PUT, PATCH, DELETE and HEAD are callable. Bodies are supported for POST,
PUT and PATCH. Responses and HEAD results follow `$rest` conventions; HTTP and
transport errors throw unless explicitly disabled through `restOptions`.

## Authentication

```javascript
var api = $openapi("service.yaml", {
  auth: {
    serviceKey: "API_KEY",                         // apiKey scheme
    bearerAuth: "ACCESS_TOKEN",                     // bearer/OAuth/OIDC scheme
    basicAuth: { username: "user", password: "pw" } // HTTP basic scheme
  }
})
```

Supply only the entries needed by the service. Credentials may be obtained from
`$sec` before creating the client. API keys support header, query and cookie
locations. OAuth2/OpenID Connect schemes accept an existing bearer token; this
opack does not perform authorization flows, refresh tokens, or verify scopes.

Security requirement objects use AND semantics; the requirement array uses OR.
The first alternative for which all named credentials are supplied is selected.
An empty object permits anonymous access; operation `security: []` removes root
requirements. Unsupported selected security schemes fail before transport.

## References

Local JSON Pointer references support escaped path components (`~0`, `~1`).
External references require documents to be supplied explicitly:

```javascript
var api = $openapi("service.yaml", {
  documents: {
    "models.yaml": af.fromYAML(io.readFileString("models.yaml"))
  }
})
var schema = api.resolve({ $ref: "models.yaml#/components/schemas/Pet" })
```

Document keys match the reference document URI. References inside external
documents resolve relative to that document's key. Local fragments inside an
external document remain relative to that document. No reference initiates a
network request or filesystem read. Cycles, missing targets and reference chains
deeper than 64 fail explicitly. Referenced subtrees are expanded to retain their
document context. `summary` and `description` siblings are retained; other `$ref`
siblings are rejected.

## Selected tools

```javascript
var tools = api.toTools(["getPet"])
// Each entry: { name, description, inputSchema, execute }
var result = tools[0].execute({ path: { id: "123" } })
```

Selection is mandatory; `[]` exposes nothing. Names are normalized to letters,
digits, `_` and `-`; collisions and names longer than 64 characters are rejected.
Schemas retain parameter location groups and resolved body schemas. OpenAPI 3.0
`nullable` and boolean exclusive bounds are converted to JSON Schema equivalents.
Tools use the default declared body media type.

This produces in-process descriptors for an adapter to register with an MCP
server or agent. It does not start a server, register tools automatically, or
provide authorization. Keep the selected operations explicit when adapting the
descriptors. `execute` uses the same client credentials and behavior as `call`.

## Generate oJobs

```javascript
io.writeFileString("pet-jobs.yaml", af.toYAML(
  api.toJobs(["getPet", "updatePet"], "./service.yaml")
))
```

The result contains a `jobs` array suitable for an oJob include. Each job reads
`args.openapiArgs`, accepts runtime client configuration in `args.openapiOptions`,
and writes its response to `args.result`. Specification paths resolve from the
process working directory. The OpenAPI opack must be installed or `openapi.js`
must be on OpenAF's module path. No credentials or constructor configuration are
embedded in the generated YAML.

```yaml
include:
- pet-jobs.yaml
todo:
- name: getPet
  args:
    openapiArgs:
      path:
        id: '123'
```

## Scope and limitations

This release implements the documented OpenAPI 3.0/3.1 client subset, not a full
OpenAPI validator. It checks required inputs and serialization but does not
validate complete request/response schemas. Generated schemas are metadata for
the receiving tool framework; `execute` itself does not run a JSON Schema validator.

Unsupported features include Swagger 2.0, OpenAPI 3.2, recursive reference
expansion, JSON Schema anchors/dynamic references, non-description `$ref` siblings,
parameter `content`/`allowReserved`, nested parameter values, complex cookie
parameters, multipart/binary uploads, custom form content-type/headers encoding,
OPTIONS/TRACE execution, callbacks, links and webhooks. Unsupported request
features are rejected when used; callbacks/links/webhooks are not exposed.
Applications needing these features should use the underlying HTTP APIs directly.

Implementation reference: [OpenAPI 3.0.4 specification](https://spec.openapis.org/oas/v3.0.4.html).

## Tests and packaging

From this directory:

```sh
oaf -f tests/regression.js
python3 tests/integration_http.py
opack genpack .
```

The Python harness starts an ephemeral loopback-only HTTP server, exercises the
real OpenAF `$rest` transport, and shuts it down. It needs Python 3, `oaf` on PATH,
and permission to bind a local socket; no external service or credentials are
required. Tests also exercise generated tool callbacks and generated job code.

Version: `20260919` (initial release).
