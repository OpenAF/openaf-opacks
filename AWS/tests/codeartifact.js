// Offline API, navigation and snapshot refresh contracts. Run from AWS/:
// oaf -f tests/codeartifact.js
var checks = $atomic(0)
function ok(value, label) { checks.inc(); if (!value) throw new Error(label) }
var common = getOPackPath("oJob-common")
var browse = io.readFileYAML(common + "/oJobBrowse.yaml")
var job = io.readFileYAML("oJobCodeArtifact.yaml").jobs[0].exec
var http = io.readFileYAML(common + "/oJobHTTPd.yaml")
var httpCode = http.jobs.filter(j => String(j.exec).indexOf("global.__ojobHttpRelativePath =") >= 0)[0].exec
new Function(httpCode.substring(0, httpCode.indexOf("var ks")))()

// Exercise actual wrapper functions with a two-page transport fixture.
function WireAWS() {}
new Function("AWS", "loadLib", io.readFileString("aws_codeartifact.js"))(WireAWS, () => {})
;[
  ["ListDomains", "domains", ["eu-west-1"]],
  ["ListRepositories", "repositories", ["eu-west-1", "repo"]],
  ["ListPackages", "packages", ["eu-west-1", "repo", "domain", "maven", "org.example"]],
  ["ListPackageVersions", "versions", ["eu-west-1", "repo", "domain", "maven", "org.example", "pkg"]],
  ["ListPackageVersionAssets", "assets", ["eu-west-1", "repo", "domain", "maven", "org.example", "pkg", "1"]]
].forEach(spec => {
  var client = new WireAWS(), calls = []
  client.postURLEncoded = function(url, uri, query, params) {
    calls.push(clone(params))
    var response = {}; response[spec[1]] = [{ name: "page" + calls.length }]
    if (calls.length == 1) response.nextToken = "next"
    return response
  }
  var result = client["CODEARTIFACT_" + spec[0]].apply(client, spec[2])
  ok(result.length == 2 && calls.length == 2, spec[0] + " accumulates all pages")
  ok(calls.every(c => c.maxResults == 1000), spec[0] + " uses large pages")
  ok(calls[1].nextToken == "next", spec[0] + " preserves continuation")
  if (spec[0] == "ListPackages") ok(calls[0].namespace == "org.example", "namespace prefix sent to AWS")
  var page = 0
  client.postURLEncoded = () => {
    var response = {}; response[spec[1]] = []; response.nextToken = "next"
    return ++page == 1 ? response : { message: "service failure" }
  }
  var partialRejected = false
  try { client["CODEARTIFACT_" + spec[0]].apply(client, spec[2]) } catch(e) { partialRejected = true }
  ok(partialRejected, spec[0] + " later-page errors cannot cache partial data")
  client.postURLEncoded = () => ({ message: "service failure" })
  var rejected = false
  try { client["CODEARTIFACT_" + spec[0]].apply(client, spec[2]) } catch(e) { rejected = true }
  ok(rejected, spec[0] + " errors cannot become cached empty listings")
})
var noFormat = new WireAWS()
noFormat.postURLEncoded = (url, uri, query, params) => {
  ok(isUnDef(params.namespace), "namespace not sent without required format")
  return { packages: [] }
}
noFormat.CODEARTIFACT_ListPackages("eu-west-1", "repo", "domain", undefined, "org.example")

var clock = $atomic(10000), constructed = $atomic(0), assumed = $atomic(0), packageCalls = $atomic(0), repoCalls = $atomic(0)
var clients = [], tasks = [], version = 1, fail = false, hold, large = false, barrier
var active = $atomic(0), peak = $atomic(0), activityLock = new java.lang.Object()
function FixtureAWS(access, secret, token, region) { constructed.inc(); clients.push(this); ok(region == "eu-west-1", "client region") }
FixtureAWS.prototype.assumeRole = function() { assumed.inc(); this.assumeRoleExp = clock.get() + 3600000; return this }
FixtureAWS.prototype.CODEARTIFACT_ListDomains = () => [{ name: "domain", createdTime: 1711050000 }, { name: "other" }]
FixtureAWS.prototype.CODEARTIFACT_ListRepositories = () => {
  repoCalls.inc()
  return [{ name: "repo", domainName: "domain" }, { name: "elsewhere", domainName: "other" }]
}
FixtureAWS.prototype.CODEARTIFACT_ListPackages = function(region, repo, domain, format, namespace) {
  packageCalls.inc()
  var count = active.inc()
  syncFn(() => { if (count > peak.get()) peak.set(count) }, activityLock)
  try {
  if (barrier) {
    barrier.countDown()
    ok(barrier.await(5, java.util.concurrent.TimeUnit.SECONDS), "three independent repository loads overlap")
  }
  if (hold) {
    hold.entered.countDown()
    ok(hold.release.await(5, java.util.concurrent.TimeUnit.SECONDS), "release package fetch")
  }
  if (fail) throw new Error("fixture failure")
  if (large) return Array.from({ length: 10000 }, (v, i) => ({ format: "maven", namespace: "org.example", package: "pkg" + i }))
  return [
    { format: "maven", namespace: "org.example", package: "pkg" + version },
    { format: "maven", namespace: "org.example", package: "__proto__" },
    { format: "maven", namespace: "org.example.extra", package: "hidden" }
  ]
  } finally { active.dec() }
}
FixtureAWS.prototype.CODEARTIFACT_ListPackageVersions = () => [{ version: "1.0", publishedTime: 1711050000 }]
FixtureAWS.prototype.CODEARTIFACT_ListPackageVersionAssets = () => [{ name: "pkg.jar", size: 10, hashes: { "SHA-256": "abc" } }]
var support = {}
new Function("exports", "now", browse.code["ojob-browse-contract.js"])(support, () => clock.get())
function create(realAsync, legacy) {
  var args = { region: "eu-west-1", assumeRole: "fixture", cache: 1000, format: "maven", namespace: "org.example", options: legacy ? {} : { query: { enabled: true } } }
  new Function("args", "AWS", "loadLib", "require", "now", "$doV", job)(args, FixtureAWS, () => {}, () => support, () => clock.get(), fn => realAsync ? $doV(fn) : tasks.push(fn))
  args.fns.init()
  return args
}
var args = create(), options = merge(args.options, { parentURI: "/code.v1+", _api: true })
function req(path) { return { uri: options.parentURI + "/" + path, params: {} } }
var request = req("domain/repo/maven/org.example/")
var list = args.fns.getList(request, options)
ok(list.list.map(r => r.values.Package).join(",") == "__proto__,pkg1", "sorted exact namespace children and safe map keys")
ok(packageCalls.get() == 1, "one snapshot fetch")
ok(constructed.get() == 1 && assumed.get() == 1, "one assumed-role client")
ok(args.fns.getList(req("domain/repo/"), options).list[0].values.Package == "maven", "indexed root")
ok(args.fns.getList(req("domain/repo/maven/"), options).list[0].values.Package == "org.example", "format navigation")
ok(args.fns.getList(req("domain/repo/maven/org.example/pkg1/"), options).list[0].values.Version == "1.0", "package versions")
// AWS timestamps are epoch seconds; both columns must display the same UTC instant.
var domainDates = args.fns.getList(req(""), options).list
ok(domainDates.filter(row => row.values.Domain == "domain")[0].values.Created == "2024-03-21 19:40:00", "domain creation converts epoch seconds to milliseconds")
ok(domainDates.filter(row => row.values.Domain == "other")[0].values.Created == "", "missing domain creation remains blank")
ok(args.fns.getList(req("domain/repo/maven/org.example/pkg1/"), options).list[0].values.Published == "2024-03-21 19:40:00", "package publication converts epoch seconds exactly once")

ok(args.fns.getList(req("domain/repo/maven/org.example/pkg1/1.0"), options).isFile, "version navigation")
ok(args.fns.getObj(req("domain/repo/maven/org.example/pkg1/1.0"), options).data[0].name == "pkg.jar", "asset details")
ok(packageCalls.get() == 1, "all warm navigation shares snapshot")
ok(args.fns.getList(req("domain/"), options).list[0].values.Repository == "repo", "domain filter")
ok(args.fns.getList(req("other/"), options).list[0].values.Repository == "elsewhere", "second domain filter")
ok(repoCalls.get() == 1, "account repository scan shared across domains")
// Use the installed query validator and renderer: callback-only checks miss the
// hidden sort field that the search form carries between different schemas.
var browseCode = browse.jobs.filter(j => String(j.exec).indexOf("var applyQuery =") >= 0)[0].exec
var queryStart = browseCode.indexOf("var applyQuery =")
var applyQuery = new Function(browseCode.substring(queryStart, browseCode.indexOf("// Wrap provider callbacks", queryStart)) + "\nreturn applyQuery")()
var renderStart = browseCode.indexOf(".default((lst, server, request, options) => {") + ".default(".length
var renderEnd = browseCode.indexOf("\nargs.fns.renderObj", renderStart)
if (renderEnd < 0) renderEnd = browseCode.indexOf("\n    args.fns.renderObj", renderStart)
var renderList = new Function("escapeText", "return " + browseCode.substring(renderStart, renderEnd).trim().slice(0, -1))(global.__ojobHttpEscapeText)
ow.loadTemplate()
global.__ojobHttpUriPrefix = {}
;[
  ["", ["Domain", "Owner", "Created"], "domain/repo/maven/org.example/pkg1"],
  ["domain/", ["Repository", "Domain", "Owner", "Description"], "repo/maven/org.example/pkg1"],
  ["domain/repo/", ["Package", "Format", "Namespace"], "maven/org.example/pkg1"]
].forEach(spec => {
  spec[1].forEach(sort => {
    var searchRequest = req(spec[0])
    searchRequest.params = { q: "pkg1", sort: sort, order: "desc", size: "25" }
    var result = applyQuery(args.fns.search(searchRequest, options), searchRequest, options)
    ok(result.list.length == 1 && result.list[0].values.Package == spec[2], "search path with carried " + sort + " at " + spec[0])
    ok(result.sortInfo.field == "Package" && result.sortInfo.order == "desc", "search sort normalization")
    var html = String(renderList(result, {}, searchRequest, options))
    ok(html.indexOf('name="sort" value="Package"') >= 0, "rendered search form carries package sort")
    ok(html.indexOf(spec[2]) >= 0, "rendered relative package link")
    searchRequest.params.q = ""
    var cleared = applyQuery(args.fns.getList(searchRequest, options), searchRequest, options)
    ok(cleared.sortInfo.field == String(cleared.key), "clearing search restores listing sort")
  })
})
var invalidSearch = req("")
invalidSearch.params = { q: "pkg1", sort: "Unknown" }
var invalidSort = false
try { applyQuery(args.fns.search(invalidSearch, options), invalidSearch, options) } catch(e) { invalidSort = e.httpStatus == 400 }
ok(invalidSort, "unknown search sort still rejected")
clock.set(clock.get() + 1001); version = 2
list = args.fns.getList(request, options)
ok(list.list.some(r => r.values.Package == "pkg1") && packageCalls.get() == 1, "stale snapshot returns without network")
args.fns.getList(request, options)
ok(tasks.length == 1, "expired visits coalesce")
ok(args.fns.getFreshness(request, options).refreshing && args.fns.getFreshness(request, options).stale, "stale refresh reported")
while (tasks.length) tasks.shift()()
ok(args.fns.getList(request, options).list.some(r => r.values.Package == "pkg2"), "atomic fresh tree replacement")
ok(!args.fns.getFreshness(request, options).refreshing, "refresh complete")
clock.set(clock.get() + 1001); fail = true
args.fns.getList(request, options)
while (tasks.length) tasks.shift()()
var before = packageCalls.get()
ok(args.fns.getList(request, options).list.some(r => r.values.Package == "pkg2"), "failed refresh retains snapshot")
ok(tasks.length == 0 && packageCalls.get() == before, "failed refresh backs off")
fail = false; version = 3
clock.set(clock.get() + 1001)
args.fns.getList(request, options)
ok(tasks.length == 1, "retry after backoff")
// Explicit refresh cancels the queued callback and loads immediately.
args.fns.refresh(request, options)
var refreshed = packageCalls.get()
while (tasks.length) tasks.shift()()
ok(packageCalls.get() == refreshed, "cancelled callback cannot republish")
ok(args.fns.getList(request, options).list.some(r => r.values.Package == "pkg3"), "explicit refresh reloads snapshot")
clients[0].assumeRoleExp = clock.get() + 1000
clock.set(clock.get() + 1001)
args.fns.refresh(request, options)
ok(constructed.get() == 2 && assumed.get() == 2, "temporary credentials renewed")
var legacy = create(false, true)
ok(legacy.fns.getList(request, options).list.some(r => r.values.Package == "pkg3"), "legacy navigation")
var isolated = create()
before = packageCalls.get()
isolated.fns.getList(request, options)
ok(packageCalls.get() == before + 1, "browser snapshot isolation")
large = true
var big = create()
var bigList = big.fns.getList(request, options)
ok(bigList.list.length == 10000 && bigList.list[0].values.Package == "pkg0", "large sibling index")
large = false
// Actual concurrent cold requests share one provider load and one client.
var concurrent = create()
before = packageCalls.get()
pForEach([1,2,3,4,5,6], () => concurrent.fns.getList(request, options), e => { throw e })
ok(packageCalls.get() == before + 1, "concurrent cold loads coalesce")
var bounded = create()
peak.set(0)
barrier = new java.util.concurrent.CountDownLatch(3)
pForEach([1,2,3,4,5,6], i => bounded.fns.getList(req("domain/repo" + i + "/"), options), e => { throw e })
barrier = undefined
ok(peak.get() == 3, "cold repository loads bounded to three")
// Exercise real asynchronous refresh with a blocked service fixture.
var async = create(true)
async.fns.getList(request, options)
clock.set(clock.get() + 1001)
hold = { entered: new java.util.concurrent.CountDownLatch(1), release: new java.util.concurrent.CountDownLatch(1) }
var refreshStarted = new java.util.concurrent.CountDownLatch(1), refreshDone = new java.util.concurrent.CountDownLatch(1), refreshError
try {
  async.fns.getList(request, options)
  ok(hold.entered.await(5, java.util.concurrent.TimeUnit.SECONDS), "real background refresh starts")
  before = packageCalls.get()
  ok(async.fns.getList(request, options).isList && packageCalls.get() == before, "warm visits do not block on active refresh")
  $doV(() => {
    refreshStarted.countDown()
    try { async.fns.refresh(request, options) } catch(e) { refreshError = e }
    finally { refreshDone.countDown() }
  })
  ok(refreshStarted.await(5, java.util.concurrent.TimeUnit.SECONDS), "explicit refresh starts concurrently")
  ok(!refreshDone.await(100, java.util.concurrent.TimeUnit.MILLISECONDS), "explicit refresh waits for in-flight load")
} finally { hold.release.countDown() }
ok(refreshDone.await(5, java.util.concurrent.TimeUnit.SECONDS) && isUnDef(refreshError), "explicit refresh finishes after active load")
ok(packageCalls.get() == before + 1, "explicit refresh loads again after invalidation")
var deadline = now() + 5000
while (async.fns.getFreshness(request, options).refreshing && now() < deadline) sleep(10, true)
ok(!async.fns.getFreshness(request, options).refreshing, "real background refresh finishes")
hold = undefined
print("PASS: " + checks.get() + " CodeArtifact checks (no AWS requests)")
