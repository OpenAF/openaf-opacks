// Apache Kafka string/JSON client for OpenAF.
loadExternalJars(getOPackPath("Kafka") || ".")
ow.loadCh()
ow.loadObj()

var Kafka = function(aOptions) {
  aOptions = _$(aOptions, "options").isMap().default({})
  this.options = clone(aOptions)
  _$(this.options.brokers, "brokers").isString().$_()
  if (!this.options.brokers.length) throw new Error("brokers must not be empty")
  ;["config", "producerConfig", "consumerConfig"].forEach(function(name) {
    if (isDef(aOptions[name]) && !isMap(aOptions[name])) throw new Error(name + " must be a map")
  })
  this.timeout = Kafka._positive(aOptions.timeout, 10000, "timeout")
  this.maxRecords = Kafka._positive(aOptions.maxRecords, 100, "maxRecords")
  this._closed = false
}

Kafka._positive = function(value, fallback, name) {
  if (isUnDef(value)) return fallback
  if (!isNumber(value) || !isFinite(value) || value < 1 || Math.floor(value) != value) {
    throw new Error(name + " must be a positive integer")
  }
  return value
}

Kafka._encode = function(value) {
  return isUnDef(value) || value === null ? null : stringify(value, __, "")
}

Kafka._decode = function(value) {
  if (value === null || isUnDef(value)) return null
  var text = String(value)
  try { return JSON.parse(text) } catch(e) { return text }
}

Kafka.prototype._check = function() {
  if (this._closed) throw new Error("Kafka client is closed")
}

Kafka.prototype._properties = function(kind) {
  var opts = this.options, props = new java.util.Properties()
  var config = merge(opts.config || {}, opts[kind + "Config"] || {})
  Object.keys(config).forEach(function(key) { props.setProperty(key, String(config[key])) })
  props.setProperty("bootstrap.servers", opts.brokers)
  if (kind == "producer") {
    if (!props.containsKey("acks")) props.setProperty("acks", "all")
    if (!props.containsKey("max.block.ms")) props.setProperty("max.block.ms", String(this.timeout))
    props.setProperty("key.serializer", "org.apache.kafka.common.serialization.StringSerializer")
    props.setProperty("value.serializer", "org.apache.kafka.common.serialization.StringSerializer")
  } else {
    _$(opts.groupId, "groupId (required for consumption)").isString().$_()
    if (!opts.groupId.length) throw new Error("groupId must not be empty")
    if (String(config["enable.auto.commit"]) == "true") throw new Error("Automatic commits are unsupported; use commit() after processing")
    props.setProperty("group.id", opts.groupId)
    props.setProperty("enable.auto.commit", "false")
    props.setProperty("max.poll.records", String(this.maxRecords))
    if (!props.containsKey("auto.offset.reset")) props.setProperty("auto.offset.reset", "earliest")
    if (!props.containsKey("default.api.timeout.ms")) props.setProperty("default.api.timeout.ms", String(this.timeout))
    props.setProperty("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer")
    props.setProperty("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer")
  }
  return props
}

Kafka.prototype.getProducer = function() {
  this._check()
  if (isUnDef(this._producer)) this._producer = new Packages.org.apache.kafka.clients.producer.KafkaProducer(this._properties("producer"))
  return this._producer
}

Kafka.prototype.getConsumer = function() {
  this._check()
  if (isUnDef(this._consumer)) this._consumer = new Packages.org.apache.kafka.clients.consumer.KafkaConsumer(this._properties("consumer"))
  return this._consumer
}

// Successful return means broker acknowledgement. A timeout can have an unknown delivery outcome.
Kafka.prototype.send = function(aTopic, aKey, aValue, aPartition) {
  _$(aTopic, "topic").isString().$_()
  if (!aTopic.length) throw new Error("topic must not be empty")
  if (isDef(aPartition) && (!isNumber(aPartition) || aPartition < 0 || Math.floor(aPartition) != aPartition)) throw new Error("partition must be a non-negative integer")
  var partition = isDef(aPartition) ? java.lang.Integer.valueOf(String(aPartition)) : null
  var record = new Packages.org.apache.kafka.clients.producer.ProducerRecord(aTopic, partition, Kafka._encode(aKey), Kafka._encode(aValue))
  var result = this.getProducer().send(record).get(this.timeout, java.util.concurrent.TimeUnit.MILLISECONDS)
  return { topic: String(result.topic()), partition: Number(result.partition()), offset: String(result.offset()) }
}

Kafka.prototype.subscribe = function(aTopics) {
  if (isString(aTopics)) aTopics = [aTopics]
  if (!isArray(aTopics) || !aTopics.length) throw new Error("topics must be a non-empty array or string")
  var topics = new java.util.ArrayList()
  aTopics.forEach(function(topic) {
    if (!isString(topic) || !topic.length) throw new Error("topic must be a non-empty string")
    topics.add(topic)
  })
  this.getConsumer().subscribe(topics)
  return this
}

// Never slice a poll result: all fetched offsets must remain visible to the caller.
Kafka.prototype.poll = function(aTimeout) {
  var timeout = Kafka._positive(aTimeout, this.timeout, "poll timeout")
  var records = this.getConsumer().poll(java.time.Duration.ofMillis(timeout)), result = []
  var iterator = records.iterator()
  while (iterator.hasNext()) {
    var record = iterator.next(), headers = [], hi = record.headers().iterator()
    while (hi.hasNext()) {
      var header = hi.next()
      headers.push({ key: String(header.key()), value: header.value() === null ? null : String(af.fromBytes2String(header.value())) })
    }
    result.push({ topic: String(record.topic()), partition: Number(record.partition()),
      offset: String(record.offset()), timestamp: String(record.timestamp()),
      key: Kafka._decode(record.key()), value: Kafka._decode(record.value()), headers: headers })
  }
  return result
}

// Commit the current consumer position, only after processing every previously polled record.
Kafka.prototype.commit = function() {
  this.getConsumer().commitSync(java.time.Duration.ofMillis(this.timeout))
}

Kafka.prototype.close = function() {
  if (this._closed) return
  this._closed = true
  try {
    if (isDef(this._consumer)) this._consumer.close(java.time.Duration.ofMillis(this.timeout))
  } finally {
    if (isDef(this._producer)) this._producer.close(java.time.Duration.ofMillis(this.timeout))
  }
}

Kafka.getChannel = function(aName) {
  var channel = ow.ch.__types.kafka.__channels[aName]
  if (isUnDef(channel)) throw new Error("Unknown Kafka channel: " + aName)
  return channel.client
}

var _kafkaUnsupported = function() {
  throw new Error("Unsupported for Kafka stream channels: no key-value snapshot, random lookup, removal or atomic getSet")
}

ow.ch.__types.kafka = {
  __channels: {},
  create: function(aName, shouldCompress, options) {
    options = _$(options, "options").isMap().$_()
    _$(options.topic, "topic").isString().$_()
    if (!options.topic.length) throw new Error("topic must not be empty")
    this.__channels[aName] = { client: new Kafka(options), topic: options.topic, subscribed: false }
  },
  destroy: function(aName) {
    try { this.__channels[aName].client.close() } finally { delete this.__channels[aName] }
  },
  _poll: function(aName) {
    var channel = this.__channels[aName]
    if (!channel.subscribed) {
      channel.client.subscribe(channel.topic)
      channel.subscribed = true
    }
    return channel.client.poll()
  },
  set: function(aName, aKey, aValue) {
    var channel = this.__channels[aName]
    return channel.client.send(channel.topic, aKey, aValue)
  },
  setAll: function(aName, aKeys, aValues) {
    var self = this
    return aValues.map(function(value) { return self.set(aName, ow.obj.filterKeys(aKeys, value), value) })
  },
  getAll: function(aName) {
    return this._poll(aName).map(function(record) { return record.value })
  },
  forEach: function(aName, aFunction) {
    this._poll(aName).forEach(function(record) { aFunction(record.key, record.value) })
  },
  size: _kafkaUnsupported,
  get: _kafkaUnsupported,
  getKeys: _kafkaUnsupported,
  getSortedKeys: _kafkaUnsupported,
  getSet: _kafkaUnsupported,
  unset: _kafkaUnsupported,
  unsetAll: _kafkaUnsupported,
  pop: _kafkaUnsupported,
  shift: _kafkaUnsupported
}
