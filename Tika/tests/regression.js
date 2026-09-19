// Run from Tika/: oaf -f tests/regression.js
load("tika.js")
var checks = 0
function check(value, message) {
  if (!value) throw new Error(message)
  checks++
}
function fails(fn, message) {
  var failed = false
  try { fn() } catch(e) { failed = true }
  check(failed, message)
}
try {
  var tika = new Tika()
  var cases = [
    ["html", "Hello café OpenAF", "text/html"],
    ["pdf", "Hello OpenAF PDF", "application/pdf"],
    ["docx", "Hello OpenAF DOCX", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ["eml", "Hello OpenAF email", "message/rfc822"]
  ]
  cases.forEach(function(c) {
    var r = tika.extractFile("tests/fixtures/sample." + c[0])
    check(r.text.indexOf(c[1]) >= 0, c[0] + " text: " + stringify(r))
    check(r.mediaType.indexOf(c[2]) == 0, c[0] + " media type: " + r.mediaType)
    check(!r.truncated, c[0] + " unexpectedly truncated")
    check(r.source.indexOf("tests/fixtures/sample.") >= 0, "source attribution")
    Object.keys(r.metadata).forEach(function(k) { check(isArray(r.metadata[k]), "metadata values are arrays") })
  })
  var short = new Tika({ maxChars: 5 }).extractBytes(af.fromString2Bytes("abcdefghijklmnop"), "sample.txt")
  check(short.truncated && short.text.length <= 5, "truncation must be explicit and bounded")
  var unlimited = new Tika({ maxChars: -1 }).extractBytes(af.fromString2Bytes("abcdefghijklmnop"), "sample.txt")
  check(!unlimited.truncated && unlimited.text.indexOf("abcdefghijklmnop") >= 0, "unlimited extraction")
  check(new Tika({ maxChars: 0 }).extractBytes(af.fromString2Bytes("hello"), "sample.txt").truncated, "zero limit")
  var mail = tika.extractFile("tests/fixtures/attachment.eml")
  check(mail.text.indexOf("Main email body") >= 0, "email body")
  check(mail.text.indexOf("UNIQUE_ATTACHMENT_CONTENT") < 0, "attachments skipped by default")
  var embedded = new Tika({ embedded: true }).extractFile("tests/fixtures/attachment.eml")
  check(embedded.text.indexOf("UNIQUE_ATTACHMENT_CONTENT") >= 0, "opt-in attachment extraction")
  ;[-2, 1.5, NaN, Infinity, 2147483648, "10"].forEach(function(v) {
    fails(function() { new Tika({ maxChars: v }) }, "invalid maxChars: " + v)
  })
  fails(function() { tika.extractFile("tests/fixtures/missing.pdf") }, "missing file")
  fails(function() { tika.extractFile("tests/fixtures") }, "directory input")
  fails(function() { tika.extractBytes(af.fromString2Bytes("%PDF-1.4\nbroken"), "broken.pdf") }, "corrupt PDF must fail")
  var stream = new java.io.FileInputStream("tests/fixtures/sample.html")
  try {
    var streamed = tika.extractStream(stream, "sample.html", "custom-source")
    check(streamed.source == "custom-source", "stream source label")
    check(stream.getFD().valid(), "caller stream must remain open")
  } finally { stream.close() }
  stream = new java.io.FileInputStream("tests/fixtures/sample.html")
  try {
    new Tika({ maxChars: 1 }).extractStream(stream, "sample.html")
    check(stream.getFD().valid(), "caller stream remains open on truncation")
  } finally { stream.close() }
  var result
  var adapter = require("oafp_Tika.js").oafplib({ file: "tests/fixtures/sample.pdf", tikamaxchars: "5" }, function(r) { result = r })
  adapter.input[0].fn(null, {})
  check(result.truncated && result.text.length <= 5, "oafp options and output")
  fails(function() { require("oafp_Tika.js").oafplib({}, function() {}).input[0].fn(null, {}) }, "oafp requires file")
  print("PASS: " + checks + " checks")
} catch(e) {
  printErr(e)
  if (e.javaException) e.javaException.printStackTrace()
  exit(1)
}
