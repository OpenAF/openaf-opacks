# Kafka oPack

Apache Kafka producer/consumer wrapper, an OpenAF **stream channel**, and an
`oafp` input/output library. Uses the official Kafka Java client 4.1.2.
Requires Java 11 or later and OpenAF 20250725 or later.

```sh
opack install Kafka
```

## Producer and consumer

```javascript
loadLib("kafka.js")
var kafka = new Kafka({
  brokers: "localhost:9092",
  groupId: "orders-worker", // required only for consuming
  timeout: 10000,
  maxRecords: 100
})
try {
  var receipt = kafka.send("orders", { id: 1 }, { id: 1, status: "new" })
  kafka.subscribe("orders")
  var records = kafka.poll(1000)
  records.forEach(function(record) {
    print(record.value)
    // Complete processing here before committing the entire batch.
  })
  if (records.length) kafka.commit()
} finally {
  kafka.close()
}
```

| Method | Behavior |
|---|---|
| `send(topic, key, value, partition?)` | Synchronously waits for acknowledgement; returns `{topic, partition, offset}`. |
| `subscribe(topicOrArray)` | Subscribes the consumer; group assignment happens during polling. |
| `poll(timeout?)` | Returns a bounded batch of record envelopes; can return an empty array. |
| `commit()` | Commits the current position of all assigned partitions after processing all previously polled records. |
| `close()` | Closes both clients with bounded waits; repeated calls are harmless. Does not commit. |
| `getProducer()` / `getConsumer()` | Lazily creates and exposes the Java clients for advanced use. |

Record envelopes contain `topic`, `partition`, `offset`, `timestamp`, `key`,
`value`, and `headers` (an array retaining duplicate names; values decoded as UTF-8).
Offsets and timestamps are exposed as strings. Keys and values are JSON encoded,
including strings; incoming non-JSON text is returned unchanged. Null/undefined
keys are unkeyed; null/undefined values are Kafka tombstones. Binary applications
should use their own Java serializers/client rather than this JSON/text API.

Options:

| Option | Default | Purpose |
|---|---|---|
| `brokers` | required | Comma-separated bootstrap servers. |
| `groupId` | required for consumption | Consumer group identity; reuse it to resume committed progress. |
| `timeout` | `10000` | Milliseconds for poll, acknowledgement, commit and each close call. |
| `maxRecords` | `100` | Maximum records returned by one poll. |
| `config` | `{}` | Common Kafka Java client properties, including TLS/SASL. |
| `producerConfig` | `{}` | Producer properties overriding common properties. |
| `consumerConfig` | `{}` | Consumer properties overriding common properties. |

The wrapper controls bootstrap servers, group ID, serializers, `max.poll.records`,
and disables automatic commits. `enable.auto.commit=true` is rejected. Default
`acks=all`; default `auto.offset.reset=earliest` applies only when no valid committed
offset exists. Explicit Kafka properties can override these two defaults.
`send` may spend up to `max.block.ms` obtaining metadata/buffer space and then up
to `timeout` waiting for acknowledgement. An acknowledgement timeout does not
prove the broker rejected the record; retrying can duplicate it.

Use `config` for `security.protocol`, `sasl.mechanism`, `sasl.jaas.config`, and
truststore/keystore settings. Resolve credentials through your existing `$sec`
setup and pass the resulting properties in memory; avoid putting secrets on a
command line. Client instances, especially consumers, must not be shared across
concurrent jobs/threads.

## OpenAF channel

```javascript
loadLib("kafka.js")
$ch("orders").create(1, "kafka", {
  brokers: "localhost:9092", topic: "orders", groupId: "channel-worker"
})
try {
  $ch("orders").set({ id: 1 }, { id: 1, status: "new" })
  $ch("orders").setAll(["id"], [{ id: 2, status: "new" }])
  $ch("orders").forEach(function(key, value) {
    print({ key: key, value: value }) // finish processing synchronously
  })
  Kafka.getChannel("orders").commit()
} finally {
  $ch("orders").destroy()
}
```

This is an append-and-consume stream, **not a map or a topic snapshot**:

- `set` appends one record. `setAll` extracts keys from the named value fields and
  publishes sequentially. Partial success is possible; batches are not atomic.
- `getAll` consumes one bounded batch and returns its values. `forEach` consumes
  one batch and calls `fn(key, value)` for each record. Both advance the local
  consumer position; neither commits. Initial polls can be empty during group join.
- Use `Kafka.getChannel(name)` to access the wrapper and explicitly commit. For
  metadata, call its `subscribe(topic)` and `poll()` methods directly.
- `size`, `get`, `getKeys`, `getSortedKeys`, `getSet`, `unset`, `unsetAll`, `pop`,
  and `shift` throw: Kafka has no equivalent key-value operation here. A tombstone
  can be published with `set(key, null)`; compaction is a broker/topic policy.
- On processing failure, stop and close without committing. Reopen with the same
  group to replay from the last commit. Do not continue polling and commit later:
  that would also acknowledge the failed batch. A crash after processing but before
  commit can cause duplicates; handlers should tolerate them.

Channel tools that assume enumeration, random lookup or `size()` are incompatible.
OpenAF channel subscriptions concern local channel calls, not a background Kafka
poll loop. No background polling, transactions, exactly-once processing, or admin
API is supplied by this first release.

## oafp

```sh
oafp libs=kafka help=kafka

# Publish two JSON objects; use the top-level id field as the Kafka key.
echo '[{"id":1,"text":"hello"},{"id":2,"text":"world"}]' | \
  oafp libs=kafka in=json out=kafka kafkabrokers=localhost:9092 \
  kafkatopic=events kafkakey=id

# Inspect one bounded batch of envelopes. data= avoids waiting for stdin.
oafp libs=kafka in=kafka data= kafkabrokers=localhost:9092 \
  kafkatopic=events kafkagroup=inspection kafkamax=100 kafkatimeout=10000 out=json
```

| Parameter | Purpose |
|---|---|
| `kafkabrokers` | Required bootstrap servers. |
| `kafkatopic` | Required topic. |
| `kafkagroup` | Required for input. |
| `kafkatimeout` | Poll window / individual acknowledgement timeout in ms; default `10000`. |
| `kafkamax` | Input batch maximum; default `100`. |
| `kafkakey` | Optional top-level output object field to use as key. |
| `kafkaconfig` | Kafka client properties as a JSON/SLON map. |

Input waits for the first non-empty batch until its poll window expires, returning
at most `kafkamax` envelopes. It **never commits**, including after output: oafp
filters and deferred outputs are not proof that every fetched record was processed.
Repeated invocations can replay data. For a durable worker, use the wrapper/channel
with explicit commits. Output sends each array element or a single input value,
then reports acknowledged offsets. Re-publishing input envelopes as values requires
selecting their `value` fields first. All clients close even on errors.

## Development and validation

```sh
# From Kafka/
oaf -f tests/regression.js
oaf -f tests/oafp.js
KAFKA_TEST_BROKERS=localhost:19092 oaf -f tests/integration.js
```

Regression tests use Kafka's Java mock clients and channel dispatch. Integration
tests require an isolated plaintext broker allowing automatic topic creation and
create unique topics/groups. They check JSON/tombstone delivery, uncommitted replay,
committed restart, and public channel operations. TLS/SASL and multi-broker failure
behavior require separate environments.

Validated on 2026-09-19 with OpenAF 20260918 / Java 26: 28 regression checks,
12 oafp adapter checks, and a disposable single-node Apache Kafka 4.1.2 broker.
The real oafp CLI was also checked for publishing receipts, a one-record input
limit, and replay on repeated uncommitted input.

Dependencies are pinned in `.maven.yaml`. Refresh with
`ojob ojob.io/oaf/mavenGetJars folder=.`, normalize with
`ojob ojob.io/oaf/checkOAFJars path=. remove=true versioninsensitive=true`, then
run `opack genpack .`. OpenAF supplies SLF4J; the opack bundles Kafka and its three
compression libraries. Version: **20260919**.
