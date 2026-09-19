// Run from Kafka/: oaf -f tests/regression.js
try {
  load("kafka.js")
  var checks = 0
  function check(actual, expected, label) {
    if (stringify(actual) != stringify(expected)) throw new Error(label + ": " + stringify(actual))
    checks++
  }
  function fails(fn, label) {
    var failed = false
    try { fn() } catch(e) { failed = true }
    check(failed, true, label)
  }
  var client = new Kafka({ brokers: "localhost:9092", groupId: "test", maxRecords: 2 })
  var serializer = new Packages.org.apache.kafka.common.serialization.StringSerializer()
  client._producer = new Packages.org.apache.kafka.clients.producer.MockProducer(true, null, serializer, serializer)
  check(client.send("events", { id: 1 }, { text: "olá" }).offset, "0", "send acknowledgement")
  check(String(client._producer.history().get(0).key()), '{"id":1}', "key serialization")
  client.send("events", null, null)
  check(client._producer.history().get(1).value(), null, "tombstone")
  client._producer.sendException = new java.lang.RuntimeException("send failed")
  fails(function() { client.send("events", 1, 2) }, "publish errors propagate")
  client._producer.sendException = null
  check(Kafka._decode(Kafka._encode("123")), "123", "JSON string preserved")
  check(Kafka._decode("plain text"), "plain text", "external text fallback")
  check(String(client._properties("consumer").getProperty("enable.auto.commit")), "false", "manual commits")
  check(String(client._properties("consumer").getProperty("max.poll.records")), "2", "batch limit")
  fails(function() { new Kafka({brokers:"x", maxRecords:0}) }, "invalid bound")
  fails(function() { new Kafka({brokers:"x"}).getConsumer() }, "group required")
  fails(function() { new Kafka({brokers:"x",groupId:"g",config:{"enable.auto.commit":true}}).getConsumer() }, "auto commit rejected")

  var consumer = new Packages.org.apache.kafka.clients.consumer.MockConsumer(Packages.org.apache.kafka.clients.consumer.OffsetResetStrategy.EARLIEST)
  var tp = new Packages.org.apache.kafka.common.TopicPartition("events", 0)
  var partitions = new java.util.ArrayList(), offsets = new java.util.HashMap()
  partitions.add(tp)
  offsets.put(tp, java.lang.Long.valueOf("0"))
  consumer.assign(partitions)
  consumer.updateBeginningOffsets(offsets)
  consumer.addRecord(new Packages.org.apache.kafka.clients.consumer.ConsumerRecord("events", 0, 0, '{"id":1}', '{"ok":true}'))
  consumer.addRecord(new Packages.org.apache.kafka.clients.consumer.ConsumerRecord("events", 0, 1, null, null))
  client._consumer = consumer
  var records = client.poll(1)
  check(records.length, 2, "full batch returned")
  check(records[0].key, {id:1}, "key decoded")
  check(records[0].value, {ok:true}, "value decoded")
  check(records[1].value, null, "tombstone decoded")
  client.commit()
  check(String(consumer.committed(java.util.Collections.singleton(tp)).get(tp).offset()), "2", "next offset committed")
  client.close()
  client.close()
  fails(function() { client.poll(1) }, "closed client")

  var type = ow.ch.__types.kafka, sent = [], commits = 0, closed = false
  $ch("kafka-test").create(1, "kafka", {brokers:"localhost:9092",topic:"events",groupId:"g"})
  var channelClient = Kafka.getChannel("kafka-test")
  channelClient.send = function(topic, key, value) { sent.push({topic:topic,key:key,value:value}) }
  channelClient.subscribe = function() {}
  channelClient.poll = function() { return [{key:{id:1},value:{id:1,text:"a"}}] }
  channelClient.commit = function() { commits++ }
  channelClient.close = function() { closed = true }
  $ch("kafka-test").set({id:7}, {text:"b"})
  check(sent[0].key, {id:7}, "public channel set preserves key")
  $ch("kafka-test").setAll(["id"], [{id:8,text:"c"}])
  check(sent[1].key, {id:8}, "public setAll key selection")
  check($ch("kafka-test").getAll(), [{id:1,text:"a"}], "public getAll values")
  var visited
  $ch("kafka-test").forEach(function(k,v) { visited = [k,v] })
  check(visited, [{id:1},{id:1,text:"a"}], "public forEach key value")
  check(commits, 0, "reads do not commit")
  fails(function() { $ch("kafka-test").size() }, "unsupported size")
  fails(function() { $ch("kafka-test").get({id:1}) }, "unsupported lookup")
  $ch("kafka-test").destroy()
  check(closed, true, "destroy closes")
  check(isUnDef(type.__channels["kafka-test"]), true, "destroy removes state")
  var closing = new Kafka({brokers:"x"}), producerClosed = false
  closing._consumer = { close: function() { throw new Error("consumer close failed") } }
  closing._producer = { close: function() { producerClosed = true } }
  fails(function() { closing.close() }, "close errors propagate")
  check(producerClosed, true, "producer closes despite consumer close failure")
  print("PASS Kafka regression: " + checks + " checks")
} catch(e) { printErr(e); printErr(e.stack); exit(1) }
