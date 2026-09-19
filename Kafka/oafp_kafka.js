;(function() {
  loadLib("kafka.js")
  exports.oafplib = function(params, _$o, $o, oafp) {
    function options() {
      var config = params.kafkaconfig
      if (isString(config)) config = oafp._fromJSSLON(config)
      return { brokers: params.kafkabrokers, groupId: params.kafkagroup,
        timeout: isDef(params.kafkatimeout) ? Number(params.kafkatimeout) : 10000,
        maxRecords: isDef(params.kafkamax) ? Number(params.kafkamax) : 100,
        config: config }
    }
    function topic() {
      if (!isString(params.kafkatopic) || !params.kafkatopic.length) throw new Error("kafkatopic is required")
      return params.kafkatopic
    }
    return {
      input: [{ type: "kafka", fn: function(r, outputOptions) {
        var name = topic(), client = new Kafka(options())
        try {
          client.subscribe(name)
          var deadline = Date.now() + client.timeout, records = []
          do {
            records = client.poll(Math.max(1, deadline - Date.now()))
          } while (!records.length && Date.now() < deadline)
          _$o(records, outputOptions)
        } finally { client.close() }
      } }],
      output: [{ type: "kafka", fn: function(r, outputOptions) {
        var name = topic(), client = new Kafka(options()), sent = []
        try {
          var values = isArray(r) ? r : [r]
          values.forEach(function(value) {
            var key = isDef(params.kafkakey) && isMap(value) ? value[params.kafkakey] : null
            sent.push(client.send(name, key, value))
          })
        } finally { client.close() }
        $o({ topic: name, sent: sent.length, records: sent }, merge(outputOptions || {}, { __format: "json" }))
      } }],
      help: "# Kafka oafp library\n\n" +
        "in=kafka reads one bounded batch of record envelopes without committing offsets. " +
        "out=kafka publishes each array item (or a single value) and returns acknowledged offsets.\n\n" +
        "kafkabrokers and kafkatopic are required. kafkagroup is required for input. " +
        "kafkatimeout=10000 bounds polling and individual sends in milliseconds; kafkamax=100 bounds records per poll. " +
        "kafkakey names an optional top-level output key field. kafkaconfig accepts a map of Kafka client properties " +
        "(including TLS/SASL). Input never commits; use the Kafka library for processing with acknowledgements."
    }
  }
})()
