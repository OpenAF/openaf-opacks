// Offline ECR navigation checks using the installed oJob-common renderer.
// Run from AWS/: oaf -f tests/ecr-browse.js
ow.loadTemplate()
var common = getOPackPath("oJob-common")
var http = io.readFileYAML(common + "/oJobHTTPd.yaml")
var browse = io.readFileYAML(common + "/oJobBrowse.yaml")
var ecr = io.readFileYAML("oJobECR.yaml")
var checks = 0
function ok(value, label) { checks++; if (!value) throw new Error(label) }

// Load the real path/link helpers without starting a server.
var httpCode = http.jobs.filter(j => j.name == "HTTP Start Server")[0]
if (isUnDef(httpCode)) httpCode = http.jobs.filter(j => String(j.exec).indexOf("global.__ojobHttpRelativePath =") >= 0)[0]
new Function(httpCode.exec.substring(0, httpCode.exec.indexOf("var ks")))()
global.__ojobHttpUriPrefix = {}
var browseCode = browse.jobs.find(j => j.name == "HTTP Browse generic").exec

// Substitute only AWS and cache I/O; execute the complete ECR provider job.
var imageRequests = [], caches = {}
function FixtureAWS() {}
FixtureAWS.prototype.ECR_DescribeRepositories = () => [
  { repositoryName: "internal/3rdparty/tool" },
  { repositoryName: "internal/app" }
]
FixtureAWS.prototype.ECR_DescribeImages = (region, name) => {
  imageRequests.push(name)
  return [{ imageTags: ["latest"], imageDigest: "sha256:fixture", imagePushedAt: 1, imageSizeInBytes: 10 }]
}
function fixtureCache(name) {
  if (!caches[name]) caches[name] = {
    ttl: function() { return this },
    byDefault: function() { return this },
    fn: function(fn) { this.loader = fn; return this },
    create: function() { return this },
    get: function(key) { return this.loader(key) }
  }
  return caches[name]
}
var args = { options: {}, cache: 1000, uri: "/", port: 18888 }
new Function("args", "AWS", "loadLib", "$cache", ecr.jobs[0].exec)(args, FixtureAWS, () => {}, fixtureCache)
new Function("args", browseCode)(args)
;["/", "/ecr.v1+"].forEach(parentURI => {
  var options = { parentURI: parentURI, port: 18888, _api: true }
  var base = parentURI.replace(/\/$/, "")
  ;["", "internal/", "internal/3rdparty/"].forEach((path, depth) => {
    var request = { uri: base + "/" + path, params: {} }
    var list = args.fns.getList(request, options)
    var expected = ["internal", "3rdparty", "tool"][depth]
    var row = list.list.filter(r => r.values["Repository Name"] == expected)[0]
    ok(isDef(row), "plain child name at " + request.uri)
    var html = String(args.fns.renderList(list, {}, request, options))
    var link = expected + (row.isDirectory ? "/" : "")
    ok(html.indexOf('href="' + link + '"') >= 0, "rendered child link " + link)
    ok(!/%2f/i.test(html), "no encoded directory separators")
    var target = String(new java.net.URI("http://localhost:18888" + request.uri).resolve(link).getPath())
    var next = args.fns.getList({ uri: target }, options)
    ok(row.isDirectory ? next.isList : next.isFile, "child target resolves " + target)
  })
  var obj = args.fns.getObj({ uri: base + "/internal/3rdparty/tool" }, options)
  ok(obj.data.ecrimgs[0].imageTags[0] == "latest", "nested repository detail")
  ok(imageRequests[imageRequests.length - 1] == "internal/3rdparty/tool", "exact repository lookup")
})
print("PASS: " + checks + " ECR browse checks (no AWS requests)")
