// Offline SigV4 oracle and bounded credential-refresh tests. Run from AWS/.
load("aws_core.js")
var checks = 0
function ok(v, label) { checks++; if (!v) throw new Error(label) }
function eq(a, b, label) { ok(JSON.stringify(a) == JSON.stringify(b), label) }
function rejects(fn, label) { var caught; try { fn() } catch(e) { caught = String(e) }; ok(isDef(caught), label); ok(!/provider-secret/.test(caught), "sanitized error"); return caught }
function opts(signal) { return { method: "POST", url: "https://" + (signal == "logs" ? "logs" : "monitoring") + ".eu-west-1.amazonaws.com/v1/" + signal,
  region: "eu-west-1", service: signal == "logs" ? "logs" : "monitoring", body: '{"message":"olá 世界 😀"}',
  headers: { "Content-Type": "application/json", "X-Custom": "  one   two  " } } }
// Independent JCA implementation reconstructs the canonical request from returned wire headers.
function hex(bytes) { return Array.prototype.map.call(bytes, b => ("0" + ((Number(b) + 256) % 256).toString(16)).slice(-2)).join("") }
function hash(s) { return hex(java.security.MessageDigest.getInstance("SHA-256").digest(new java.lang.String(s).getBytes("UTF-8"))) }
function hmac(key, value) { var mac = javax.crypto.Mac.getInstance("HmacSHA256"); mac.init(new javax.crypto.spec.SecretKeySpec(isString(key) ? new java.lang.String(key).getBytes("UTF-8") : key, "HmacSHA256")); return mac.doFinal(new java.lang.String(value).getBytes("UTF-8")) }
function verify(o, h, key, secret, token) {
  var auth = h.authorization, signed = auth.match(/SignedHeaders=([^,]+)/)[1].split(";"), scope = h["x-amz-date"].slice(0, 8) + "/" + o.region + "/" + o.service + "/aws4_request"
  eq(signed, signed.slice().sort(), "canonical names sorted")
  eq(new Set(signed).size, signed.length, "canonical names unique")
  var canonical = o.method + "\n" + new java.net.URI(o.url).getRawPath() + "\n\n" + signed.map(k => k + ":" + h[k].trim().replace(/\s+/g, " ") + "\n").join("") + "\n" + signed.join(";") + "\n" + hash(o.body)
  var signingKey = hmac(hmac(hmac(hmac("AWS4" + secret, h["x-amz-date"].slice(0, 8)), o.region), o.service), "aws4_request")
  var signature = hex(hmac(signingKey, "AWS4-HMAC-SHA256\n" + h["x-amz-date"] + "\n" + scope + "\n" + hash(canonical)))
  eq(auth, "AWS4-HMAC-SHA256 Credential=" + key + "/" + scope + ", SignedHeaders=" + signed.join(";") + ", Signature=" + signature, "independent signature")
  eq(h["x-amz-content-sha256"], hash(o.body), "UTF-8 body digest")
  eq(h["x-amz-security-token"], token, "token matches session")
  if (isDef(token)) ok(signed.indexOf("x-amz-security-token") >= 0, "token signed")
}
var explicit = new AWS("fixture-key", "fixture-secret", "fixture-token", "eu-west-1")
;["metrics", "logs"].forEach(signal => {
  var o = opts(signal); if (signal == "logs") { o.headers["x-aws-log-group"] = "/nattrmon/test"; o.headers["x-aws-log-stream"] = "one  two" }
  var before = JSON.stringify(o), headers = explicit.signRequest(o)
  eq(JSON.stringify(o), before, "inputs immutable"); verify(o, headers, "fixture-key", "fixture-secret", "fixture-token")
  eq(headers["x-custom"], "one   two", "header semantics preserved")
})
;["http://example.com/v1/logs", "https://user:pass@example.com/", "https://example.com/?q=x", "https://example.com/#f", "https://example.com/a/../b", "https://example.com/a%20b"].forEach(url => rejects(() => explicit.signRequest(merge(opts("logs"), { url: url })), "invalid URL"))
;[{ Host: "evil" }, { authorization: "secret" }, { "x-amz-date": "old" }, { "x-amz-security-token": "old" }, { Foo: "a", foo: "b" }, { "x-test": "a\r\nb" }, { "content-length": "1" }].forEach(headers => rejects(() => explicit.signRequest(merge(opts("logs"), { headers: headers })), "header conflict"))
;[0, -1, NaN, 0.5].forEach(timeoutMs => rejects(() => explicit.signRequest(merge(opts("logs"), { timeoutMs: timeoutMs })), "invalid timeout"))
var originalConnect = AWS.prototype.connect, realNow = Date.now, clock = realNow(), discoveries = 0, failure = false, expiration = clock + 120000
Date.now = () => clock
AWS.prototype.connect = function() {
  discoveries++
  if (failure) throw new Error("provider-secret")
  this.accessKey = "session-" + discoveries; this.secretKey = "secret-" + discoveries; this.stoken = "token-" + discoveries
  this._credentialExpiration = isDef(expiration) ? new Date(expiration).toISOString() : undefined
  this._credentialCheckedAt = clock
}
try {
  var a = AWS.forSigning("eu-west-1"), o = opts("metrics")
  verify(o, a.signRequest(o), "session-1", "secret-1", "token-1")
  a.signRequest(o); eq(discoveries, 1, "cached credentials")
  clock += 60001; expiration = clock + 120000
  verify(o, a.signRequest(o), "session-2", "secret-2", "token-2"); eq(discoveries, 2, "refresh at sixty seconds")
  clock += 60001; failure = true
  verify(o, a.signRequest(o), "session-2", "secret-2", "token-2"); eq(discoveries, 3, "retain valid credentials")
  clock += 1000; a.signRequest(o); eq(discoveries, 3, "failure throttled")
  clock += 60000; rejects(() => a.signRequest(o), "expired credentials fail"); eq(discoveries, 4, "failure retried after throttle")
  failure = false; expiration = undefined
  var b = AWS.forSigning("eu-west-1"); b.signRequest(o); var initial = discoveries
  clock += 299999; b.signRequest(o); eq(discoveries, initial, "unexpiring cached for five minutes")
  clock++; b.signRequest(o); eq(discoveries, initial + 1, "unexpiring credentials rediscovered")
  explicit.signRequest(o); eq(discoveries, initial + 1, "explicit credentials caller managed")
  var c = AWS.forSigning("eu-west-1"), start = discoveries
  var results = pForEach([1, 2, 3, 4], () => c.signRequest(o), e => { throw e })
  eq(discoveries, start + 1, "concurrent refresh serialized")
  results.forEach(h => verify(o, h, "session-" + discoveries, "secret-" + discoveries, "token-" + discoveries))
} finally { Date.now = realNow; AWS.prototype.connect = originalConnect }
// Actual elapsed-time test, with isolated provider work that outlasts the deadline.
AWS.prototype.connect = function() { sleep(400, true); this.accessKey = "provider-secret"; this.secretKey = "provider-secret" }
try {
  var slow = AWS.forSigning("eu-west-1"), started = Date.now()
  rejects(() => slow.signRequest(merge(opts("logs"), { timeoutMs: 60 })), "bounded provider acquisition")
  ok(Date.now() - started < 350, "acquisition returns before slow provider")
  ok(isUnDef(slow.accessKey), "timed-out provider never publishes")
} finally { AWS.prototype.connect = originalConnect }
// A provider ignoring interruption must never overlap a second refresh or publish late.
var entered = new java.util.concurrent.CountDownLatch(1), release = new java.util.concurrent.CountDownLatch(1), acquired = new java.util.concurrent.atomic.AtomicInteger(0)
AWS.prototype.connect = function() {
  acquired.incrementAndGet(); entered.countDown()
  while (release.getCount() > 0) { try { release.await(10, java.util.concurrent.TimeUnit.MILLISECONDS) } catch(e) {} }
  this.accessKey = "late-key"; this.secretKey = "late-secret"
}
try {
  var stalled = AWS.forSigning("eu-west-1")
  rejects(() => stalled.signRequest(merge(opts("logs"), { timeoutMs: 60 })), "stalled acquisition bounded")
  ok(entered.await(1, java.util.concurrent.TimeUnit.SECONDS), "provider entered")
  stalled._signRetryAt = 0
  rejects(() => stalled.signRequest(opts("logs")), "second acquisition refused while first in flight")
  eq(acquired.get(), 1, "no overlapping provider acquisition")
  release.countDown()
  sleep(60, true)
  ok(isUnDef(stalled.accessKey), "late completion not published")
} finally { release.countDown(); AWS.prototype.connect = originalConnect }
// Lock waiting consumes the same bounded signing budget.
var locked = new AWS("key", "secret"), ready = new java.util.concurrent.CountDownLatch(1), unlock = new java.util.concurrent.CountDownLatch(1)
locked._signLock = new java.util.concurrent.locks.ReentrantLock()
plugin("Threads"); var threads = new Threads()
threads.addVirtualThread(() => { locked._signLock.lock(); try { ready.countDown(); unlock.await() } finally { locked._signLock.unlock() } })
threads.startNoWait()
try {
  ok(ready.await(1, java.util.concurrent.TimeUnit.SECONDS), "lock holder entered")
  var started = Date.now()
  rejects(() => locked.signRequest(merge(opts("metrics"), { timeoutMs: 60 })), "lock acquisition bounded")
  ok(Date.now() - started < 350, "lock wait honors timeout")
} finally { unlock.countDown(); threads.stop(true) }
print("AWS signing: " + checks + " checks passed")
