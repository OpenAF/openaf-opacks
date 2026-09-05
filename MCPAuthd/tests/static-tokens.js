// Run from the opack directory: oaf -f tests/static-tokens.js
ow.loadServer()
var config = io.readFileYAML("oJobMCPAuth.yaml")
var job = config.jobs.filter(j => j.name == "HTTP MCP Auth Server")[0]
var secret = "test-only-secret-with-at-least-32-bytes"
var file = String(java.io.File.createTempFile("mcpauth-test-", ".yaml").getAbsolutePath())
var channel = "mcpauth-static-test"
var originalRoute = ow.server.httpd.route
var handler
var checks = 0
var assertStatus = (token, status, uri) => {
  var response = handler({ header: { authorization: "Bearer " + token, "x-ojob-mcp-uri": uri } })
  if (response.status != status) throw "Expected " + status + ", got " + response.status
  checks++
}
var start = (enabled, ttl) => {
  var args = {
    port: 19892, uri: "/auth", chName: channel, chKey: "key",
    authheader: "authorization", authscheme: "Bearer", authrealm: "MCP", authchallenge: true,
    algs: ["HS256", "HS384", "HS512"], keytype: "secret", secret: secret,
    idclaim: "sub", uriheader: "x-ojob-mcp-uri", urifallback: [],
    validfield: "validUntil", urisfield: "uris", enabledfield: "enabled",
    cachettl: ttl || 0, audit: false, debug: true
  }
  if (enabled) args.statictokensfile = file
  new Function("args", job.exec)(args)
}
try {
  $ch(channel).create()
  $ch(channel).set({ key: "jwt-agent" }, { uris: ["/mcp"] })
  global.__ojobMCPAuth = {}
  global.__ojobMCPAuth[channel] = { chName: channel, chKey: "key" }
  global.__ojobHttp = { 19892: {} }
  global.__ojobRoutes = { 19892: {} }
  ow.server.httpd.route = (server, routes) => { handler = routes["/auth"] }
  var jwt = ow.server.jwt.sign(secret, { expiration: new Date(now() + 60000), claims: { sub: "jwt-agent" } })
  io.writeFileYAML(file, { tokens: ["plain-token", { token: "restricted-token", id: "worker", uris: ["/mcp"] }, { token: "disabled-token", enabled: false }, { token: "expired-token", validUntil: "2000-01-01" }, { token: "empty-uris", uris: [] }] })
  start(true)
  assertStatus("plain-token", 200, "/anything")
  assertStatus("restricted-token", 200, "/mcp")
  assertStatus("restricted-token", 403, "/other")
  assertStatus("plain-token", 403)
  assertStatus("disabled-token", 403, "/mcp")
  assertStatus("expired-token", 403, "/mcp")
  assertStatus("empty-uris", 403, "/mcp")
  assertStatus("unknown-token", 401, "/mcp")
  assertStatus(jwt, 200, "/mcp")
  assertStatus(jwt, 403, "/other")
  var badJwt = jwt.substring(0, jwt.lastIndexOf(".") + 1) + "invalid"
  assertStatus(badJwt, 401, "/mcp")
  io.writeFileYAML(file, { tokens: [badJwt] })
  assertStatus(badJwt, 401, "/mcp")
  assertStatus("plain-token", 401, "/mcp")
  io.writeFileYAML(file, { tokens: ["plain-token", "plain-token"] })
  assertStatus("plain-token", 401, "/mcp")
  io.writeFileString(file, "tokens: [unterminated")
  assertStatus("plain-token", 401, "/mcp")
  assertStatus(jwt, 200, "/mcp")
  io.writeFileYAML(file, { tokens: ["plain-token"] })
  assertStatus("plain-token", 200, "/mcp")
  io.writeFileYAML(file, { tokens: [] })
  assertStatus("plain-token", 401, "/mcp")
  io.writeFileYAML(file, { tokens: ["plain-token"] })
  start(false)
  assertStatus("plain-token", 401, "/mcp")
  assertStatus(jwt, 200, "/mcp")
  start(true, 60000)
  assertStatus("plain-token", 200, "/mcp")
  io.writeFileYAML(file, { tokens: [] })
  assertStatus("plain-token", 200, "/mcp")
  start(true)
  io.rm(file)
  assertStatus("plain-token", 401, "/mcp")
  assertStatus(jwt, 200, "/mcp")
  print("PASS: " + checks + " authentication checks")
} finally {
  ow.server.httpd.route = originalRoute
  $ch(channel).destroy()
  if (io.fileExists(file)) io.rm(file)
}
