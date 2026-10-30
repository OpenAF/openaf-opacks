(function() {
  exports.oafplib = function(params, _$o, $o, oafp) {
    var loaded = false;
    function load() { if (!loaded) {
      if (!ow.obj || !ow.obj.grpc || !isFunction(ow.obj.grpc.schema)) loadLib('grpc.js');
      loaded = true;
    } }
    function value(input, fallback) {
      return isUnDef(input) ? fallback : isString(input) ? oafp._fromJSSLON(input) : input;
    }
    function map(input, fallback) {
      var result = value(input, fallback);
      if (!isMap(result)) throw new Error('Expected a map');
      return result;
    }
    function positive(input, name) {
      var number = Number(input);
      if (!isFinite(number) || number <= 0 || Math.floor(number) !== number) throw new Error(name + ' must be a positive integer');
      return number;
    }
    function method() {
      if (!isString(params.grpcmethod) || !/^[^/]+\/[^/]+$/.test(params.grpcmethod)) throw new Error('grpcmethod must be service/method');
      return params.grpcmethod;
    }
    function options() { return map(params.grpcoptions, {}); }
    function definition(services) {
      var name = method(), result;
      services.forEach(function(service) { service.methods.forEach(function(item) { if (item.fullName === name) result = item; }); });
      if (!result) throw new Error('Unknown method: ' + name);
      return result;
    }
    function invoke(request, emit, collect) {
      load(); method();
      var client = ow.obj.grpc.client(options()), stream, writer;
      var writerError = new java.util.concurrent.atomic.AtomicReference();
      try {
        var type = definition(client.describe()).type, callOptions = map(params.grpccalloptions, {});
        if (type === 'UNARY') {
          if (!isMap(request)) throw new Error('Unary RPC requires one request map');
          var result = client.callWithMetadata(method(), request, callOptions);
          emit(result.response); return { responses: [result.response], headers: result.headers, trailers: result.trailers };
        }
        if (type === 'SERVER_STREAMING') {
          if (!isMap(request)) throw new Error('Server-streaming RPC requires one request map');
          stream = client.stream(method(), request, callOptions);
        } else {
          if (!isArray(request) || !request.every(isMap)) throw new Error('Client/bidirectional streaming requires an array of request maps');
          stream = client.openStream(method(), callOptions);
          // Reads and writes must overlap: a peer may wait for a response to be consumed before accepting another request.
          writer = new java.lang.Thread(new java.lang.Runnable({ run: function() {
            try { request.forEach(function(item) { stream.write(item); }); stream.complete(); }
            catch (error) { writerError.set(error); stream.cancel(); }
          } }), 'oafp-grpc-writer');
          writer.setDaemon(true); writer.start();
        }
        var responses = [];
        while (true) {
          var next = stream.read();
          if (next.done) break;
          if (collect) responses.push(next.value); emit(next.value);
        }
        if (writer) { writer.join(5000); if (writer.isAlive()) throw new Error('gRPC writer did not finish'); }
        if (writerError.get() !== null) throw writerError.get();
        var metadata = stream.metadata();
        return { responses: responses, headers: metadata.headers, trailers: metadata.trailers };
      } catch (error) {
        if (writerError.get() !== null) throw writerError.get();
        throw error;
      } finally {
        if (stream) stream.cancel();
        if (writer) writer.join(5000);
        client.close();
      }
    }
    function listen(outputOptions) {
      load();
      var config = options(), info = definition(ow.obj.grpc.describe(config));
      var response = value(params.grpcresponse, info.type === 'SERVER_STREAMING' ? [] : {});
      var responses = info.type === 'SERVER_STREAMING' ? response : [response];
      if (!isArray(responses) || !responses.every(isMap)) throw new Error('grpcresponse must be a response map (or array for server streaming)');
      responses.forEach(function(item) { ow.obj.grpc.encode(config, info.outputType, item); });
      var limit = isDef(params.grpcmaxrequests) ? positive(params.grpcmaxrequests, 'grpcmaxrequests') : Infinity;
      var duration = isDef(params.grpcduration) ? positive(params.grpcduration, 'grpcduration') : Infinity;
      var queue = new java.util.concurrent.ArrayBlockingQueue(positive(isDef(config.queueCapacity) ? config.queueCapacity : 256, 'queueCapacity'));
      var stopping = new java.util.concurrent.atomic.AtomicBoolean(false);
      function receive(request, call) {
        var json = stringify(request, __, '');
        while (!queue.offer(json, 100, java.util.concurrent.TimeUnit.MILLISECONDS)) {
          if (stopping.get() || call.isCancelled()) throw ow.server.grpc.error('CANCELLED', 'Listener stopped');
        }
      }
      var handler;
      if (info.type === 'UNARY') handler = function(request, call) { receive(request, call); return response; };
      else if (info.type === 'SERVER_STREAMING') handler = function(request, call, output) {
        receive(request, call);
        responses.forEach(function(item) { if (!call.isCancelled()) output.write(item); });
      };
      else handler = function(input, call) {
        while (true) {
          var next = input.read(); if (next.done) break;
          receive(next.value, call);
          if (info.type === 'BIDI_STREAMING') input.write(response);
        }
        if (info.type === 'CLIENT_STREAMING') return response;
      };
      var parts = method().split('/'); config.services = {}; config.services[parts[0]] = {}; config.services[parts[0]][parts[1]] = handler;
      var server = ow.server.grpc.start(config);
      var hook = new java.lang.Thread(new java.lang.Runnable({ run: function() { stopping.set(true); server.stop(0); } }), 'oafp-grpc-shutdown');
      java.lang.Runtime.getRuntime().addShutdownHook(hook);
      try {
        var deadline = Date.now() + duration, count = 0;
        while (count < limit && Date.now() < deadline) {
          var next = queue.poll(Math.min(100, Math.max(1, deadline - Date.now())), java.util.concurrent.TimeUnit.MILLISECONDS);
          if (next !== null) { _$o(jsonParse(String(next)), outputOptions); count++; }
        }
      } finally {
        stopping.set(true);
        server.stop();
        try { java.lang.Runtime.getRuntime().removeShutdownHook(hook); } catch (shutdown) { /* JVM shutdown already started. */ }
      }
    }
    function bytes() {
      if (isDef(params.file)) return io.readFileBytes(params.file);
      if (isDef(params.cmd)) throw new Error('Use protobufcmd= with data= for binary command input');
      if (isDef(params.protobufcmd)) return oafp._runCmd2Bytes(params.protobufcmd);
      if (params.data === '') return java.lang.System.in.readAllBytes();
      throw new Error('Binary input requires file=, cmd=, or data= for raw stdin');
    }
    return {
      fileExtensions: [{ ext: '.proto', type: 'proto' }, { ext: '.pb', type: 'protobuf' }, { ext: '.protobuf', type: 'protobuf' }],
      fileExtensionsNoMem: [{ ext: 'protobuf' }, { ext: 'proto' }],
      input: [{ type: 'proto', fn: function(r, outputOptions) {
        load(); var config = options();
        if (isDef(params.file)) { config.protoFiles = [params.file]; delete config.descriptorSet; _$o(ow.obj.grpc.schema(config), outputOptions); }
        else _$o(ow.obj.grpc.fromProto(r, config), outputOptions);
      } }, { type: 'protobuf', fn: function(r, outputOptions) {
        load(); _$o(ow.obj.grpc.decode(options(), params.protobufmessage, bytes()), outputOptions);
      } }, { type: 'grpc', fn: function(r, outputOptions) {
        var mode = isDef(params.grpcmode) ? params.grpcmode : 'client';
        if (mode === 'server') listen(outputOptions);
        else if (mode === 'client') invoke(value(params.grpcrequest, {}), function(result) { _$o(result, outputOptions); });
        else throw new Error('grpcmode must be client or server');
      } }],
      output: [{ type: 'proto', fn: function(r) { load(); oafp._print(ow.obj.grpc.toProto(r, params.protofile)); } },
        { type: 'protobuf', fn: function(r) {
          load(); var result = ow.obj.grpc.encode(options(), params.protobufmessage, r);
          if (isDef(params.outfile)) java.nio.file.Files.write(java.nio.file.Path.of(params.outfile), result);
          else { java.lang.System.out.write(result); java.lang.System.out.flush(); }
        } }, { type: 'grpc', fn: function(r, outputOptions) {
          var result = invoke(r, function() {}, true);
          $o(result, merge(outputOptions || {}, { __format: 'json' }));
        } }],
      help: '# gRPC oafp library\n\n' +
        'in/out=proto converts .proto schemas and FileDescriptorSet maps; protofile selects output from multi-file sets. ' +
        'in/out=protobuf converts raw binary messages using grpcoptions and protobufmessage. For raw stdin specify data=; ' +
        'file= and protobufcmd= with data= are also supported. Binary output uses outfile= or raw stdout.\n\n' +
        'in=grpc invokes grpcmethod with grpcrequest (default {}); out=grpc sends pipeline data. ' +
        'grpcoptions accepts grpc.js connection/schema/TLS options; grpccalloptions accepts timeout and metadata. ' +
        'Unary/server-streaming requests are maps; upload/bidirectional requests are arrays. Input emits each response; ' +
        'output prints {responses,headers,trailers}. All calls have deadlines and close their channels.\n\n' +
        'grpcmode=server with in=grpc listens for grpcmethod using local schema and server options. ' +
        'grpcresponse supplies a fixed response map, or an array for server streaming. Requests enter the pipeline independently of replies. ' +
        'The listener runs until interrupted; grpcmaxrequests and grpcduration (milliseconds) optionally bound it. ' +
        'Pipeline processing is serial and buffered by queueCapacity (default 256). TLS remains the default. ' +
        'Schema output normalizes formatting; unsupported groups, extensions, editions and custom/aggregate options fail explicitly.'
    };
  };
})();
