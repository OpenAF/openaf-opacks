// Offline performance/refresh contracts, using the installed oJob-common provider.
// Run from AWS/: oaf -f tests/ecr-cache.js
var common = getOPackPath("oJob-common")
var browse = io.readFileYAML(common + "/oJobBrowse.yaml")
var ecr = io.readFileYAML("oJobECR.yaml")
var http = io.readFileYAML(common + "/oJobHTTPd.yaml")
var httpCode = http.jobs.filter(j => String(j.exec).indexOf("global.__ojobHttpRelativePath =") >= 0)[0].exec
new Function(httpCode.substring(0, httpCode.indexOf("var ks")))()
var checks = 0
function ok(value, label) { checks++; if (!value) throw new Error(label) }
var clock = $atomic(10000), constructed = $atomic(0), assumptions = $atomic(0)
var calls = $atomic(0), active = $atomic(0), peak = $atomic(0), lock = new java.lang.Object()
var version = 1, fail = false, barrier, hold, tasks = [], clients = []
var repositories = ["apps/a", "apps/b", "apps/c", "apps/d", "apps/e", "apps/f", "apps/nested/tool", "other/app"]
function FixtureAWS() { constructed.inc(); clients.push(this) }
FixtureAWS.prototype.assumeRole = function() { assumptions.inc(); this.assumeRoleExp = clock.get() + 3600000; return this }
FixtureAWS.prototype.ECR_DescribeRepositories = function(region, params) {
  ok(params.maxResults == 1000, "large repository API pages")
  return repositories.map(name => ({ repositoryName: name }))
}
FixtureAWS.prototype.ECR_DescribeImages = function(region, name, params) {
  ok(params.maxResults == 1000, "large image API pages")
  calls.inc()
  var n = active.inc()
  syncFn(() => { if (n > peak.get()) peak.set(n) }, lock)
  try {
    if (barrier) { barrier.countDown(); ok(barrier.await(5, java.util.concurrent.TimeUnit.SECONDS), "cold loads overlap") }
    if (hold) {
      hold.entered.countDown()
      ok(hold.release.await(5, java.util.concurrent.TimeUnit.SECONDS), "release real background request")
    }
    if (fail) throw new Error("fixture failure")
    return [{ imageTags: ["v" + version], imageDigest: "sha256:fixture", imagePushedAt: version, imageSizeInBytes: 10 }]
  } finally { active.dec() }
}
var support = {}
new Function("exports", "now", browse.code["ojob-browse-contract.js"])(support, () => clock.get())
function create(restrict, realAsync) {
  var args = { options: { query: { enabled: true, pageSize: 20 } }, cache: 1000, assumeRole: "fixture", restrict: restrict }
  new Function("args", "AWS", "loadLib", "require", "now", "$doV", ecr.jobs[0].exec)(
    args, FixtureAWS, () => {}, () => support, () => clock.get(), fn => realAsync ? $doV(fn) : tasks.push(fn)
  )
  args.fns.init()
  return args
}
var args = create(), options = merge(args.options, { parentURI: "/registry", _api: true })
var request = { uri: "/registry/apps/", params: {} }
barrier = new java.util.concurrent.CountDownLatch(3)
var first = args.fns.getList(request, options)
ok(calls.get() == 0 && first.list[1].values["# tags"] == "", "cold listing returns without image requests")
ok(tasks.length == 1, "one virtual coordinator queued")
args.fns.getList(request, options)
ok(tasks.length == 1, "cold visits coalesce")
while (tasks.length) tasks.shift()()
barrier = undefined
first = args.fns.getList(request, options)
ok(peak.get() == 3 && active.get() == 0, "bounded cold concurrency")
ok(first.list.map(r => r.values["Repository Name"]).join(",") == "nested,a,b,c,d,e,f", "stable directory order")
ok(first.list[1].values["# tags"] == 1, "cached summary")
ok(constructed.get() == 1 && assumptions.get() == 1, "one reused assumed-role client")
var before = calls.get()
args.fns.getList(request, options)
ok(calls.get() == before && tasks.length == 0, "warm listing makes no image calls")
var lazy = args.fns.getList({ uri: "/registry/other/", params: {} }, merge(options, { summaries: false }))
ok(calls.get() == before && lazy.list[0].values["# tags"] == "", "names-only listing avoids image loads")
ok(!args.fns.getList({ uri: "/registry/app/" }, options).isList, "exact path index rejects partial prefix")
clock.set(clock.get() + 1001); version = 2
var stale = args.fns.getList(request, options)
ok(calls.get() == before && stale.list[1].values["Last Push"].indexOf("00:00:01") >= 0, "expired listing immediately serves old summary")
ok(tasks.length == 1, "one background coordinator")
args.fns.getList(request, options)
ok(tasks.length == 1, "concurrent visits coalesce refreshes")
ok(args.fns.getFreshness(request, options).refreshing, "reports background refresh")
while (tasks.length) tasks.shift()()
ok(!args.fns.getFreshness(request, options).refreshing, "refresh completes")
var fresh = args.fns.getList(request, options)
ok(fresh.list.some(r => r.values["Last Push"].indexOf("00:00:02") >= 0), "refreshed summary replaces stale data")
while (tasks.length) tasks.shift()()
// A failed background refresh keeps its previous value and backs off for one TTL.
clock.set(clock.get() + 1001); fail = true
args.fns.getList(request, options)
while (tasks.length) tasks.shift()()
// A single coordinator drains the entire page without another visit.
args.fns.getList(request, options)
while (tasks.length) tasks.shift()()
before = calls.get()
args.fns.getList(request, options)
ok(tasks.length == 0 && calls.get() == before, "failed refresh backs off")
fail = false; version = 3
args.fns.refresh(request, options)
while (tasks.length) tasks.shift()()
ok(args.fns.getList(request, options).list[1].values["Last Push"].indexOf("00:00:03") >= 0, "explicit refresh clears stale summaries")
// Details load fresh data, even when directory summaries may be stale.
clock.set(clock.get() + 1001); version = 4
var obj = args.fns.getObj({ uri: "/registry/apps/a" }, options)
ok(obj.data.ecrimgs[0].imageTags[0] == "v4", "detail API waits for fresh images")
clients[0].assumeRoleExp = clock.get() + 1000
clock.set(clock.get() + 1001)
args.fns.getObj({ uri: "/registry/apps/a" }, options)
ok(constructed.get() == 2 && assumptions.get() == 2, "refresh expiring assumed-role credentials")
var restricted = create(["apps/nested"])
var filtered = restricted.fns.getList(request, options)
ok(!filtered.list.some(r => r.values["Repository Name"] == "nested"), "restricted subtree omitted from index")
var denied = false
try { restricted.fns.getObj({ uri: "/registry/apps/nested/tool" }, options) } catch(e) { denied = e.httpStatus == 403 }
ok(denied, "restricted detail denied before cache access")
while (tasks.length) tasks.shift()()
// Paging limits image work to visible leaf rows (directories sort first).
var paged = create(), pageOptions = merge(options, { query: { enabled: true, pageSize: 2 } })
before = calls.get()
var page = paged.fns.getList(request, pageOptions)
ok(page.list.length == 2 && calls.get() == before, "cold paged listing does not wait for images")
while (tasks.length) tasks.shift()()
ok(calls.get() == before + 1, "fetch only visible repository summaries")
// Exercise the real OpenAF scheduler with a blocked network fixture.
var asynchronous = create(undefined, true)
hold = { entered: new java.util.concurrent.CountDownLatch(1), release: new java.util.concurrent.CountDownLatch(1) }
try {
  var coldPage = asynchronous.fns.getList(request, pageOptions)
  ok(coldPage.list[1].values["# tags"] == "", "real cold listing returns blank summaries immediately")
  ok(hold.entered.await(5, java.util.concurrent.TimeUnit.SECONDS), "background request starts independently of cold response")
  before = calls.get()
  asynchronous.fns.getList(request, pageOptions)
  ok(calls.get() == before && asynchronous.fns.getFreshness(request, options).refreshing, "real background request coalesces")
} finally { hold.release.countDown() }
var deadline = now() + 5000
while (asynchronous.fns.getFreshness(request, options).refreshing && now() < deadline) sleep(10, true)
ok(!asynchronous.fns.getFreshness(request, options).refreshing, "real background request completes")
hold = undefined
print("PASS: " + checks + " ECR cache checks (no AWS requests)")
