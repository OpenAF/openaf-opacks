// Provider fixtures exercise the real discovery code without network or user credentials.
var checks = 0
function ok(v, label) { checks++; if (!v) throw new Error(label) }
function eq(a, b, label) { ok(a === b, label) }
ow.loadFormat(); ow.loadObj(); ow.loadNet(); ow.loadJava()
var env = {}, processResult, httpResult, commands = [], requests = []
var TestAWS = new Function("getEnv", "$rest", "$sh", io.readFileString("aws_core.js") + "; return AWS")(
  name => env[name],
  options => ({ get: url => { requests.push({ url: url, options: options }); return httpResult },
    post: (url, body) => { requests.push({ url: url, body: body }); return httpResult },
    put: url => "imds-token" }),
  command => ({ get: () => { commands.push(command); return { stdout: JSON.stringify(processResult) } } })
)
var expires = "2030-01-01T00:00:00Z", temp = "/tmp/aws-credential-fixture-" + genUUID(), home = ow.format.getUserHome
io.mkdir(temp); io.mkdir(temp + "/.aws")
// Redirect only the fixture instance's shared-file lookup and the process config home.
TestAWS.prototype._credentialsFile = () => undefined
ow.format.getUserHome = () => temp
try {
  io.writeFileString(temp + "/.aws/config", "[default]\ncredential_process = fixture-process\n")
  processResult = { AccessKeyId: "process-key", SecretAccessKey: "process-secret", SessionToken: "process-token", Expiration: expires }
  var a = new TestAWS()
  eq(commands.length, 1, "process invoked")
  eq(a.accessKey, "process-key", "process key"); eq(a.stoken, "process-token", "process token"); eq(a._credentialExpiration, expires, "process expiration")
  io.rm(temp + "/.aws/config")
  env = { AWS_WEB_IDENTITY_TOKEN_FILE: temp + "/token", AWS_REGION: "eu-west-1", AWS_ROLE_ARN: "arn:aws:iam::123456789012:role/fixture" }
  io.writeFileString(temp + "/token", "fixture-web-token")
  httpResult = '<AssumeRoleWithWebIdentityResponse><AssumeRoleWithWebIdentityResult><Credentials><AccessKeyId>web-key</AccessKeyId><SecretAccessKey>web-secret</SecretAccessKey><SessionToken>web-token</SessionToken><Expiration>' + expires + '</Expiration></Credentials></AssumeRoleWithWebIdentityResult></AssumeRoleWithWebIdentityResponse>'
  a = new TestAWS(); eq(a.accessKey, "web-key", "web identity key"); eq(a.stoken, "web-token", "web identity token"); eq(a._credentialExpiration, expires, "web identity expiration")
  env = { AWS_CONTAINER_CREDENTIALS_FULL_URI: "http://fixture.invalid/credentials" }
  httpResult = { AccessKeyId: "container-key", SecretAccessKey: "container-secret", Token: "container-token", Expiration: expires }
  a = new TestAWS(); eq(a.accessKey, "container-key", "container key"); eq(a.stoken, "container-token", "container token"); eq(a._credentialExpiration, expires, "container expiration")
  // Real IMDS mapper with a fixture REST chain and a mocked reachability check.
  var port = ow.net.testPort
  ow.net.testPort = () => true
  try {
    var imdsCalls = 0
    var ImdsAWS = new Function("$rest", io.readFileString("aws_core.js") + "; return AWS")(() => ({ get: url => {
      imdsCalls++
      if (url.endsWith("/iam/security-credentials")) return "fixture-role"
      if (url.endsWith("/fixture-role")) return { Code: "Success", AccessKeyId: "imds-key", SecretAccessKey: "imds-secret", Token: "imds-token", Expiration: expires }
      return { responseCode: 200 }
    } }))
    var mapped = ImdsAWS.prototype._imds()
    eq(mapped.expiration, expires, "IMDS expiration mapper"); eq(mapped.token, "imds-token", "IMDS token mapper")
    env = {}; TestAWS.prototype._imds = () => mapped
    a = new TestAWS(); eq(a.accessKey, "imds-key", "IMDS key"); eq(a._credentialExpiration, expires, "IMDS discovery expiration")
  } finally { ow.net.testPort = port }
} finally { ow.format.getUserHome = home; io.rm(temp, true) }
print("AWS credentials: " + checks + " checks passed")
