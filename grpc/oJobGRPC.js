// Transport adapter for oJobGRPC.yaml. The job engine owns business logic.
(function() {
  function load() {
    if (!ow.obj || !ow.obj.grpc || !isFunction(ow.obj.grpc.describe)) loadLib('grpc.js');
  }
  function methodName(name) {
    if (!isString(name) || !/^[^/]+\/[^/]+$/.test(name)) throw new Error('method must be service/method');
  }
  function registry() {
    if (isUnDef(global.__grpcOJobServers)) global.__grpcOJobServers = Object.create(null);
    return global.__grpcOJobServers;
  }
  function methodMap(services) {
    var result = Object.create(null);
    services.forEach(function(service) { service.methods.forEach(function(method) { result[method.fullName] = method; }); });
    return result;
  }
  function response(job, method, request, call, streaming) {
    // Clone per invocation: jobs must not mutate configuration or another call's arguments.
    var input = clone(job.args || {});
    input.request = request; input.metadata = clone(call.metadata); input.method = method;
    var result = $job(job.job, input);
    if (!isMap(result)) throw new Error('Bound job did not return arguments: ' + job.job);
    if (isDef(result.grpcError)) {
      _$(result.grpcError, 'grpcError').isMap().$_();
      throw ow.server.grpc.error(result.grpcError.code, result.grpcError.message || 'Job failed');
    }
    if (isDef(result.headers)) call.setHeaders(result.headers);
    if (isDef(result.trailers)) call.setTrailers(result.trailers);
    if (streaming ? (!isArray(result.response) || !result.response.every(isMap)) : !isMap(result.response))
      throw new Error('Bound job must set response to ' + (streaming ? 'an array of maps' : 'a map') + ': ' + job.job);
    return result.response;
  }
  exports.start = function(id, options, bindings) {
    load();
    _$(id, 'id').isString().$_(); _$(options, 'options').isMap().$_(); _$(bindings, 'bindings').isMap().$_();
    if (registry()[id]) throw new Error('gRPC server already started: ' + id);
    if (isDef(options.services)) throw new Error('Use bindings instead of options.services');
    var methods = methodMap(ow.obj.grpc.describe(options)), services = Object.create(null);
    var names = Object.keys(bindings);
    if (!names.length) throw new Error('At least one binding is required');
    names.forEach(function(name) {
      methodName(name);
      var info = methods[name];
      if (!info) throw new Error('Unknown gRPC method: ' + name);
      var binding = isString(bindings[name]) ? { job: bindings[name] } : clone(bindings[name]);
      _$(binding, 'binding').isMap().$_(); _$(binding.job, 'binding.job').isString().$_();
      if (isDef(binding.args)) _$(binding.args, 'binding.args').isMap().$_();
      if (isUnDef(ow.loadOJob().getJobsCh().get({name:binding.job}))) throw new Error('Unknown oJob job: ' + binding.job);
      var parts = name.split('/');
      if (!services[parts[0]]) services[parts[0]] = Object.create(null);
      if (info.type === 'UNARY') services[parts[0]][parts[1]] = function(request, call) {
        return response(binding, name, request, call, false);
      };
      else if (info.type === 'SERVER_STREAMING') services[parts[0]][parts[1]] = function(request, call, output) {
        response(binding, name, request, call, true).forEach(function(item) { if (!call.isCancelled()) output.write(item); });
      };
      else if (info.type === 'CLIENT_STREAMING') services[parts[0]][parts[1]] = function(input, call) {
        var requests = [];
        while (true) { var next = input.read(); if (next.done) break; requests.push(next.value); }
        return response(binding, name, requests, call, false);
      };
      else services[parts[0]][parts[1]] = function(stream, call) {
        while (true) {
          var next = stream.read(); if (next.done) return;
          stream.write(response(binding, name, next.value, call, false));
        }
      };
    });
    var config = merge({}, options); config.services = services;
    var server = ow.server.grpc.start(config);
    var hook = new java.lang.Thread(new java.lang.Runnable({run:function() { server.stop(0); }}), 'ojob-grpc-' + id);
    try { java.lang.Runtime.getRuntime().addShutdownHook(hook); }
    catch(error) { server.stop(0); throw error; }
    registry()[id] = {server:server, hook:hook};
    return server.getPort();
  };
  exports.stop = function(id, timeout) {
    _$(id, 'id').isString().$_();
    timeout = isUnDef(timeout) ? 5000 : timeout;
    if (!isNumber(timeout) || !isFinite(timeout) || timeout < 0 || Math.floor(timeout) !== timeout) throw new Error('timeout must be a nonnegative integer');
    var entry = registry()[id];
    if (!entry) return;
    entry.server.stop(timeout);
    try { java.lang.Runtime.getRuntime().removeShutdownHook(entry.hook); } catch(shutdown) { /* JVM shutdown already started. */ }
    delete registry()[id];
  };
  exports.call = function(options, method, request, callOptions) {
    load(); methodName(method);
    var client = ow.obj.grpc.client(options), stream, writer;
    var writerError = new java.util.concurrent.atomic.AtomicReference();
    try {
      var info = methodMap(client.describe())[method];
      if (!info) throw new Error('Unknown gRPC method: ' + method);
      if (info.type === 'UNARY') {
        _$(request, 'request').isMap().$_();
        return client.callWithMetadata(method, request, callOptions);
      }
      if (info.type === 'SERVER_STREAMING') {
        _$(request, 'request').isMap().$_();
        stream = client.stream(method, request, callOptions);
      } else {
        if (!isArray(request) || !request.every(isMap)) throw new Error('Streaming upload request must be an array of maps');
        stream = client.openStream(method, callOptions);
        writer = new java.lang.Thread(new java.lang.Runnable({run:function() {
          try { request.forEach(function(item) { stream.write(item); }); stream.complete(); }
          catch(error) { writerError.set(error); stream.cancel(); }
        }}), 'ojob-grpc-writer');
        writer.setDaemon(true); writer.start();
      }
      var responses = [];
      while (true) { var next = stream.read(); if (next.done) break; responses.push(next.value); }
      if (writer) { writer.join(5000); if (writer.isAlive()) throw new Error('gRPC writer did not finish'); }
      if (writerError.get() !== null) throw writerError.get();
      var metadata = stream.metadata();
      return {response:info.type === 'CLIENT_STREAMING' ? responses[0] : responses, headers:metadata.headers, trailers:metadata.trailers};
    } catch(error) {
      if (writerError.get() !== null) throw writerError.get();
      throw error;
    } finally {
      if (stream) stream.cancel();
      if (writer) writer.join(5000);
      client.close();
    }
  };
})();
