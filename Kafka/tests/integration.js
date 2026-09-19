// Requires an isolated broker at KAFKA_TEST_BROKERS (default localhost:19092).
// Broker must allow automatic topic creation. Creates a unique topic and groups.
try {
  load("kafka.js")
  var brokers = getEnv("KAFKA_TEST_BROKERS") || "localhost:19092"
  var topic = "openaf-test-" + genUUID(), group = "openaf-test-" + genUUID()
  function check(value, message) { if (!value) throw new Error(message) }
  function read(client, expected) {
    var records = [], deadline = Date.now() + 20000
    while (records.length < expected && Date.now() < deadline) {
      var batch = client.poll(500)
      check(batch.length <= client.maxRecords, "poll respects maxRecords")
      records = records.concat(batch)
    }
    return records
  }
  var producer = new Kafka({brokers:brokers})
  try {
    producer.send(topic, {id:1}, {id:1,text:"olá"}, 0)
    producer.send(topic, {id:2}, null, 0)
  } finally { producer.close() }
  var client = new Kafka({brokers:brokers,groupId:group,maxRecords:1})
  try {
    client.subscribe(topic)
    var records = read(client, 2)
    check(records.length == 2, "two records")
    check(records[0].value.text == "olá" && records[0].key.id == 1, "JSON roundtrip")
    check(records[1].value === null, "tombstone roundtrip")
  } finally { client.close() }
  client = new Kafka({brokers:brokers,groupId:group})
  try {
    client.subscribe(topic)
    check(read(client, 2).length == 2, "uncommitted batch replays")
    client.commit()
  } finally { client.close() }
  client = new Kafka({brokers:brokers,groupId:group})
  try {
    client.subscribe(topic)
    var replay = [], until = Date.now() + 4000
    while (Date.now() < until) replay = replay.concat(client.poll(500))
    check(replay.length == 0, "committed batch does not replay")
  } finally { client.close() }
  $ch("live-kafka").create(1, "kafka", {brokers:brokers,topic:topic,groupId:group})
  try {
    $ch("live-kafka").set({id:3}, {id:3})
    var batch = [], deadline = Date.now() + 10000
    while (!batch.length && Date.now() < deadline) batch = $ch("live-kafka").getAll()
    check(batch.length == 1 && batch[0].id == 3, "public channel roundtrip")
    Kafka.getChannel("live-kafka").commit()
  } finally { $ch("live-kafka").destroy() }
  print("PASS Kafka live integration: JSON, tombstones, bounded polls, replay, commit, channel")
} catch(e) { printErr(e); printErr(e.stack); exit(1) }
