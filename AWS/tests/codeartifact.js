// Offline API, navigation and snapshot refresh contracts. Run from AWS/:
// oaf -f tests/codeartifact.js
var checks = $atomic(0)
function ok(value, label) { checks.inc(); if (!value) throw new Error(label) }
var common = getEnv("BROWSE_SOURCE") || getOPackPath("oJob-common")
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

ow.loadServer()
ow.loadFormat()

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
function create(realAsync, legacy, extraOptions) {
  var args = { region: "eu-west-1", assumeRole: "fixture", cache: 1000, format: "maven", namespace: "org.example", options: legacy ? {} : { query: { enabled: true } } }
  Object.assign(args.options, extraOptions)
  new Function("args", "AWS", "loadLib", "require", "now", "$doV", job)(args, FixtureAWS, () => {}, () => support, () => clock.get(), fn => realAsync ? $doV(fn) : tasks.push(fn))
  args.fns.init()
  return args
}
var previewAssets = {
  "icon.svg": '<svg xmlns="http://www.w3.org/2000/svg"/>',
  "settings.json": '{"name":"<script>data</script>"}',
  "invalid.json": "{ invalid json",
  "build.pom": '<?xml version="1.0"?><project xmlns="http://maven.apache.org/POM/4.0.0"><version>1.2</version><name>&lt;i&gt;fixture&lt;/i&gt;</name><dependencies><dependency><artifactId>one</artifactId></dependency><dependency><artifactId>two</artifactId></dependency></dependencies></project>\n',
  "commented.pom": '<!-- License header -->\n<project xmlns="http://maven.apache.org/POM/4.0.0"><artifactId>jbossorg-fonts</artifactId><!-- Build note --><directory>${basedir}/src/main/licenses</directory></project>',
  "multiple-roots.xml": '<project/><project/>',
  "invalid.xml": "<project><name></project>",
  "dtd.xml": '<!DOCTYPE project [<!ENTITY local "static">]><project>&local;</project>',
  "index.html": '<h1>Fixture HTML</h1><img src="https://example.invalid/external"><a href="https://example.invalid/go">go</a><script>ACTIVE</script><form action="/bad">FORM</form>',
  "pkg.jar": "fixture bytes"
}
var assetReads = 0
FixtureAWS.prototype.CODEARTIFACT_ListPackageVersionAssets = () => Object.keys(previewAssets).map(name =>
  ({ name: name, size: previewAssets[name].length, hashes: { "SHA-256": "abc" } }))
FixtureAWS.prototype.CODEARTIFACT_GetPackageVersionAsset = (region, repo, domain, format, namespace, pkg, version, name) => {
  assetReads++
  return {stream: new java.io.ByteArrayInputStream(new java.lang.String(previewAssets[name]).getBytes("UTF-8"))}
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
ok(args.fns.getObj(req("domain/repo/maven/org.example/pkg1/1.0"), options).data.some(row => row.name == "pkg.jar"), "asset details")
ok(packageCalls.get() == 1, "all warm navigation shares snapshot")
ok(args.fns.getList(req("domain/"), options).list[0].values.Repository == "repo", "domain filter")
ok(args.fns.getList(req("other/"), options).list[0].values.Repository == "elsewhere", "second domain filter")
ok(repoCalls.get() == 1, "account repository scan shared across domains")
// Use the installed query validator and renderer: callback-only checks miss the
// hidden sort field that the search form carries between different schemas.
var browseCode = browse.jobs.filter(j => String(j.exec).indexOf("var applyQuery =") >= 0)[0].exec
var queryStart = browseCode.indexOf("var applyQuery =")
var applyQuery = new Function("require", browseCode.substring(queryStart, browseCode.indexOf("// Wrap provider callbacks", queryStart)) + "\nreturn applyQuery")(() => support)
var renderStart = browseCode.indexOf(".default((lst, server, request, options) => {") + ".default(".length
var renderEnd = browseCode.indexOf("args.fns.renderObj =", renderStart)
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
var shallowOptions = merge(options, { query: { enabled:true, wildcards:true } })
function shallow(path, q, mode) {
  var request = req(path)
  request.params = { q:q, wildcards:mode, recursive:"0", size:"1" }
  return applyQuery(args.fns.search(request, shallowOptions), request, shallowOptions)
}
ok(shallow("domain/", "rep?", "1").list[0].values.Repository == "repo", "shallow search matches immediate repositories")
ok(shallow("domain/", "rep?", "0").list.length == 0, "shallow literal punctuation")
ok(shallow("domain/", "pkg1", "0").list.length == 0, "shallow search excludes packages in child repositories")
ok(shallow("domain/repo/maven/org.example/", "pkg1", "0").list.length == 1, "filter before pagination")
var versionPath = "domain/repo/maven/org.example/pkg1/1.0"
var previewOptions = Object.assign({}, options, { _api: false, preview: {}, download: true, port: 19862 })
function asset(name, params, overrides) {
  var request = req(versionPath)
  request.params = Object.assign({ asset: name }, params)
  return args.fns.getObj(request, Object.assign({}, previewOptions, overrides))
}
var beforeJSON = assetReads
ok(asset("settings.json").jsonViewer && assetReads == beforeJSON, "JSON shell does not open the asset")
var jsonData = asset("settings.json", {view:"json-data"})
ok(jsonData.streamType.startsWith("application/json") && af.fromInputStream2String(jsonData.stream) == previewAssets["settings.json"], "JSON endpoint streams original bytes")
ok(asset("invalid.json", {view:"source"}).data.includes("invalid json"), "malformed JSON can be viewed as source")
var pomView = asset("build.pom").data
ok(pomView.includes('data-format="xml"') && pomView.includes("/js/njsmap.js") && pomView.includes("nJSMap.mount(tree, JSON.parse(source)"), "POM uses the nJSMap renderer")
ok(pomView.includes('&quot;project&quot;:{&quot;version&quot;:&quot;1.2&quot;') &&
  pomView.includes('&quot;dependency&quot;:[{&quot;artifactId&quot;:&quot;one&quot;},{&quot;artifactId&quot;:&quot;two&quot;}]'), "POM preserves namespaced root, literal versions and repeated dependencies")
var commentedPom = asset("commented.pom").data
ok(commentedPom.includes('data-format="xml"') && commentedPom.includes('&quot;artifactId&quot;:&quot;jbossorg-fonts&quot;') &&
  commentedPom.includes('${basedir}/src/main/licenses'), "POM with a leading license comment preserves its root and Maven properties")
ok(asset("multiple-roots.xml").data.includes("could not be parsed as XML"), "XML with multiple roots falls back to source")
var pomSource = asset("build.pom", {view:"source"}).data
ok(pomSource.includes('class="language-xml"') && !pomSource.includes("data-json="), "POM source view stays escaped XML")
var pomSourceHTML = ow.template.parseMD2HTML(pomSource, true)
ok(pomSourceHTML.includes("&lt;project xmlns=") && !pomSourceHTML.includes("&amp;lt;project"), "Markdown renders tag delimiters once for XML ending in a newline")
ok(pomSourceHTML.includes("&amp;lt;i&amp;gt;fixture&amp;lt;/i&amp;gt;"), "literal XML entities stay literal in the Source view")
ok(asset("invalid.xml").data.includes("could not be parsed as XML") && !asset("invalid.xml").data.includes("data-json="), "malformed XML falls back to source")
ok(asset("dtd.xml").data.includes("could not be parsed as XML") && !asset("dtd.xml").data.includes("data-json="), "DTD declarations fall back to source")
ok(asset("build.pom", {}, {preview:{maxBytes:20}}).truncated, "POM preview respects its size limit")
ok(af.fromInputStream2String(asset("build.pom", {raw:"true"}).stream) == previewAssets["build.pom"], "POM download returns original XML bytes")
ok(asset("index.html", {view:"source"}).data.includes("&lt;script&gt;ACTIVE&lt;/script&gt;"), "HTML source stays escaped")
var icon = asset("icon.svg", {}, {preview:{maxBytes:1},download:false})
ok(icon.streamType == "image/svg+xml" && icon.streamHeaders["Content-Disposition"] == "inline" &&
  icon.streamHeaders["Content-Security-Policy"].startsWith("sandbox;"), "SVG opens as an isolated image")
ok(af.fromInputStream2String(icon.stream) == previewAssets["icon.svg"], "image preview streams the complete asset")
var htmlPreview = asset("index.html", {}, {preview:{maxBytes:6},download:false})
ok(htmlPreview.streamType == "text/html" && htmlPreview.streamHeaders["Content-Security-Policy"].startsWith("sandbox;"),
  "HTML opens directly with a sandbox policy")
ok(af.fromInputStream2String(htmlPreview.stream) == previewAssets["index.html"], "HTML preview streams complete original bytes")
ok(asset("index.html", {view:"source"}, {preview:{maxBytes:6}}).truncated, "HTML source obeys the size bound")
ok(asset("build.pom", {}, {download:false}).data.indexOf("Download raw") < 0, "previews work independently of downloads")
var raw = asset("index.html", {raw:"true"})
ok(raw.streamType == "application/octet-stream" && raw.streamHeaders["Content-Disposition"].includes("index.html"), "raw HTML attachment headers")
ok(af.fromInputStream2String(raw.stream) == previewAssets["index.html"], "raw asset bytes remain complete")
var unsupported = asset("pkg.jar")
ok(af.fromInputStream2String(unsupported.stream) == previewAssets["pkg.jar"], "unsupported asset stream")
var reads = assetReads, denied
try { asset("index.html", {raw:"true"}, {download:false}) } catch (e) { denied = e.httpStatus }
ok(denied == 403 && assetReads == reads, "raw permission checked before backend fetch")
var apiRaw = asset("index.html", {}, {_api:true})
ok(af.fromInputStream2String(apiRaw.stream) == previewAssets["index.html"], "API keeps unmodified asset stream")
reads = assetReads
var loads = packageCalls.get()
;["domain/unlisted/maven/org.example/pkg1/1.0", "domain/repo/generic/org.example/pkg1/1.0",
  "domain/repo/maven/org.example.extra/pkg1/1.0", "domain/repo/maven/org.example/missing/1.0",
  "domain/repo/maven/org.example/pkg1/unknown"].forEach(path => {
  var request = req(path)
  request.params.asset = "index.html"
  var status
  try { args.fns.getObj(request, Object.assign({}, options, { download: true })) } catch (e) { status = e.httpStatus }
  ok(status == 403, "out-of-scope direct object rejected")
})
var unknownAsset
try { asset("unlisted.txt") } catch (e) { unknownAsset = e.httpStatus }
ok(unknownAsset == 403 && assetReads == reads && packageCalls.get() == loads, "out-of-scope reads never reach the asset backend")
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
var pendingRequest = req("domain/repo/")
pendingRequest.params = { q: "pkg" }
ok(args.fns.search(pendingRequest, options).searchInfo.refreshing, "search reports in-scope package tree refresh")
var otherRequest = req("domain/other/")
otherRequest.params = { q: "pkg" }
ok(!args.fns.search(otherRequest, options).searchInfo.refreshing, "search ignores out-of-scope package tree refresh")
while (tasks.length) tasks.shift()()
var finishedSearch = args.fns.search(pendingRequest, options)
ok(!finishedSearch.searchInfo.refreshing && finishedSearch.list.some(r => r.values.Package.endsWith("pkg2")), "search sees replacement tree after refresh")
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
var listRepositories = FixtureAWS.prototype.CODEARTIFACT_ListRepositories
FixtureAWS.prototype.CODEARTIFACT_ListRepositories = () => [1,2,3,4,5,6].map(i => ({ name: "repo" + i, domainName: "domain" }))
try {
  pForEach([1,2,3,4,5,6], i => bounded.fns.getList(req("domain/repo" + i + "/"), options), e => { throw e })
} finally { FixtureAWS.prototype.CODEARTIFACT_ListRepositories = listRepositories }
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
// With publication dates deliberately out of precedence order, test the complete list through both render paths.
var originalVersions = FixtureAWS.prototype.CODEARTIFACT_ListPackageVersions
FixtureAWS.prototype.CODEARTIFACT_ListPackageVersions = () =>
  ["1.9.0", "1.10.0+build.z", "1.10.0-rc.10", "2.0.0", "1.10.0+build.a", "1.10.0-rc.2"]
    .map((version, i) => ({ version: version, publishedTime: 1711050000 - i }))
try {
  var legacyVersionBrowser = create(false, true)
  legacyVersionBrowser.options.pageSize = 3
  var legacyVersionOptions = Object.assign({}, legacyVersionBrowser.options, { parentURI: options.parentURI, sortTab: true })
  var versionQuery = req("domain/repo/maven/org.example/pkg" + version + "/")
  function versionNames(result) { return result.list.map(row => row.values.Version).join(",") }
  var page = legacyVersionBrowser.fns.getList(versionQuery, legacyVersionOptions)
  ok(versionNames(page) == "1.9.0,1.10.0-rc.2,1.10.0-rc.10", "legacy version browser sorts before pagination")
  ok(page.pageInfo.totalPages == 2 && page.sortInfo.field == "Version", "legacy provider reports the active server sort")
  versionQuery.params = { sort: "Version", order: "desc" }
  page = legacyVersionBrowser.fns.getList(versionQuery, legacyVersionOptions)
  var firstPageNames = page.list.map(row => row.values.Version)
  ok(firstPageNames[0] == "2.0.0" && firstPageNames.slice(1).sort().join(",") == "1.10.0+build.a,1.10.0+build.z" &&
    support.compareValues(firstPageNames[1], firstPageNames[2]) == 0, "descending groups equal release builds above prereleases")
  var versionTable = String(renderList(page, {}, versionQuery, legacyVersionOptions))
  var body = versionTable.match(/<tbody>[\s\S]*?<\/tbody>/)[0]
  var offsets = firstPageNames.map(name => body.indexOf(encodeURIComponent(name)))
  ok(offsets[0] >= 0 && offsets[0] < offsets[1] && offsets[1] < offsets[2], "legacy renderer preserves SemVer row order")
  ok(versionTable.includes('href="?sort=Version&amp;order=desc&amp;page=1"') && !versionTable.includes('/js/mdtablesort.js'),
    "legacy Version header uses server-side sorting links")
  versionQuery.params.page = "2"
  ok(versionNames(legacyVersionBrowser.fns.getList(versionQuery, legacyVersionOptions)) == "1.10.0-rc.10,1.10.0-rc.2,1.9.0",
    "descending pagination continues the same SemVer order")
  ok(versionNames(legacyVersionBrowser.fns.getList(req("domain/repo/maven/org.example/pkg" + version + "/"), Object.assign({}, legacyVersionOptions, { _api: true }))) ==
    "1.9.0,1.10.0+build.z,1.10.0-rc.10", "legacy API retains publication order")

  var queryVersionBrowser = create()
  var queryVersionOptions = Object.assign({}, queryVersionBrowser.options, { parentURI: options.parentURI })
  versionQuery.params = { sort: "Version", order: "desc", size: "3" }
  page = applyQuery(queryVersionBrowser.fns.getList(versionQuery, queryVersionOptions), versionQuery, queryVersionOptions)
  ok(page.list[0].values.Version == "2.0.0" &&
    page.list.slice(1).map(row => row.values.Version).sort().join(",") == "1.10.0+build.a,1.10.0+build.z", "enhanced query uses the same SemVer precedence")
} finally { FixtureAWS.prototype.CODEARTIFACT_ListPackageVersions = originalVersions }
// Prefetch-only mode shares cold snapshots, while ordinary lookups never depend on hints.
var prefetch = create(false, true, { prefetch: true })
var prefetchOptions = Object.assign({}, prefetch.options, { parentURI: options.parentURI, capabilities: {prefetch:1} })
var repoRequest = req("domain/repo/"), otherRepo = req("other/elsewhere/")
ok(!prefetch.fns.prefetch(repoRequest, prefetchOptions), "hint cannot discover repositories through AWS")
var domainPage = prefetch.fns.getList(req("domain/"), prefetchOptions)
ok(domainPage.content.includes("pointerover") && domainPage.content.includes("focusin"), "domain list listens for repository intent")
ok(!prefetch.fns.getList(req(""), prefetchOptions).content, "domain links are not prefetch candidates")
ok(!prefetch.fns.getList(req("domain/"), Object.assign({}, prefetchOptions, {capabilities:{}})).content, "older Browse routes emit no hints")
ok(isUnDef(create(false, true).fns.prefetch), "legacy default has no prefetch callback")
before = packageCalls.get()
ok(prefetch.fns.prefetch(repoRequest, prefetchOptions) && packageCalls.get() == before, "cold repository warm is scheduled asynchronously")
ok(!prefetch.fns.prefetch(repoRequest, prefetchOptions) && !prefetch.fns.prefetch(otherRepo, prefetchOptions), "duplicate hints coalesce and one speculative slot is allowed")
ok(!prefetch.fns.prefetch(req("domain/missing/"), prefetchOptions) && !prefetch.fns.prefetch(req("domain/repo/maven/"), prefetchOptions), "unknown and deeper paths are skipped")
while (tasks.length) tasks.shift()()
ok(packageCalls.get() == before + 1 && !prefetch.fns.prefetch(repoRequest, prefetchOptions), "successful hint warms the existing tree cache")
ok(prefetch.fns.getList(repoRequest, prefetchOptions).isList && packageCalls.get() == before + 1, "first visit reuses the prefetched tree")
var prefetchStatus = prefetch.fns.getStatus().prefetch
ok(prefetchStatus.queued == 1 && prefetchStatus.loaded == 1 && prefetchStatus.used == 1, "status counts queued, loaded and used prefetches")

// Exercise the HTTP dispatch with the request shape exposed by HTTPServer.
var genericBrowse = browse.jobs.filter(job => job.name == "HTTP Browse generic")[0]
var prefetchRoute = new Function("require", "request", "server", "port", "uri", genericBrowse.args.execURI).bind(null, () => support)
var previousBrowse = global.__GBHTTPD
global.__GBHTTPD = { ["19862" + options.parentURI]: Object.assign({}, prefetchOptions, {_fns:prefetch.fns}) }
try {
  var hint = Object.assign({}, repoRequest, {method:"GET", params:{_browsePrefetch:"1"}, header:{"x-openaf-browse-prefetch":"1"}})
  var cachedHint = prefetchRoute(hint, {}, 19862, options.parentURI)
  ok(cachedHint.status == 204 && cachedHint.data === "" && cachedHint.header["Cache-Control"] == "private, no-store", "cached hint returns an empty private response")
  hint.method = "POST"
  ok(prefetchRoute(hint, {}, 19862, options.parentURI).status == 405, "the prefetch route only permits GET")
  hint.method = "GET"
  global.__GBHTTPD["19862" + options.parentURI].prefetch = false
  ok(prefetchRoute(hint, {}, 19862, options.parentURI).status == 404, "disabled prefetch rejects explicit hint requests")
} finally { global.__GBHTTPD = previousBrowse }

var runningPrefetch = create(true, true, {prefetch:true})
runningPrefetch.fns.getList(req("domain/"), prefetchOptions)
hold = { entered:new java.util.concurrent.CountDownLatch(1), release:new java.util.concurrent.CountDownLatch(1) }
var readDone = new java.util.concurrent.CountDownLatch(1)
var readError
before = packageCalls.get()
try {
  ok(runningPrefetch.fns.prefetch(repoRequest, prefetchOptions), "concurrent fixture starts prefetch")
  ok(hold.entered.await(5, java.util.concurrent.TimeUnit.SECONDS), "prefetch reaches AWS fixture")
  $doV(() => {
    try { runningPrefetch.fns.getList(repoRequest, prefetchOptions) } catch(e) { readError = e }
    finally { readDone.countDown() }
  })
  ok(!readDone.await(100, java.util.concurrent.TimeUnit.MILLISECONDS), "navigation waits for the same in-flight tree")
} finally { hold.release.countDown() }
ok(readDone.await(5, java.util.concurrent.TimeUnit.SECONDS) && isUnDef(readError) && packageCalls.get() == before + 1,
  "navigation shares the in-flight prefetch without a second AWS load")
hold = undefined
print("PASS: " + checks.get() + " CodeArtifact checks (no AWS requests)")
