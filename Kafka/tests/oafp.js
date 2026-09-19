// Tests adapter control flow; live CLI validation is separate.
try {
  var lib = require("oafp_kafka.js"), checks = 0, closed = 0, sent = [], polls = 0
  function check(value, expected, message) {
    if (stringify(value) != stringify(expected)) throw new Error(message)
    checks++
  }
  Kafka.prototype.subscribe = function(topic) { check(topic, "events", "subscription") }
  Kafka.prototype.poll = function() { polls++; return [{key:1,value:{id:1}}] }
  Kafka.prototype.send = function(topic, key, value) {
    sent.push([topic,key,value]); return {topic:topic,partition:0,offset:"0"}
  }
  Kafka.prototype.close = function() { closed++ }
  Kafka.prototype.commit = function() { throw new Error("must not commit") }
  var output, params = {kafkabrokers:"localhost:9092",kafkatopic:"events",kafkagroup:"g",kafkamax:"2",kafkakey:"id"}
  var adapter = lib.oafplib(params, function(r) { output = r }, function(r, options) {
    check(options.__format, "json", "receipt format")
    output = r
  }, {})
  adapter.input[0].fn("", {})
  check(output, [{key:1,value:{id:1}}], "input envelopes")
  check(closed, 1, "input closed")
  adapter.output[0].fn([{id:7},{id:8}], {})
  check(sent, [["events",7,{id:7}],["events",8,{id:8}]], "output key field and array")
  check(output.sent, 2, "output receipts")
  check(closed, 2, "output closed")
  var failure = lib.oafplib(params, function() { throw new Error("sink failed") }, function() {}, {})
  try { failure.input[0].fn("", {}) } catch(e) { check(String(e).indexOf("sink failed") >= 0, true, "sink failure") }
  check(closed, 3, "close on sink failure")
  Kafka.prototype.send = function() { throw new Error("send failed") }
  try { adapter.output[0].fn({id:9}, {}) } catch(e) { check(String(e).indexOf("send failed") >= 0, true, "send failure") }
  check(closed, 4, "close on send failure")
  print("PASS Kafka oafp: " + checks + " checks")
} catch(e) { printErr(e); printErr(e.stack); exit(1) }
