// Optional gRPC transport. Installed packages initialize on loadLib("grpc.js").
(function() {
  function install(base) {
    loadExternalJars(base + '/lib');
    loadExternalJars(base);
    ow.loadObj();
    ow.loadServer();
    var Bridge = Packages.openaf.plugins.grpc.Bridge;
    var Conversion = Packages.openaf.plugins.grpc.Conversion;
    function encode(value) { return stringify(value, __, ''); }
    function positive(value, name) {
      if (!isNumber(value) || !isFinite(value) || value <= 0 || Math.floor(value) !== value) throw new Error(name + ' must be a positive integer');
    }
    function validate(options, server) {
      if (!isMap(options)) throw new Error('options must be a map');
      var sources = (isDef(options.descriptorSet) ? 1 : 0) + (isDef(options.protoFiles) ? 1 : 0) + (!server && options.reflection === true ? 1 : 0);
      if (sources !== 1) throw new Error('Specify exactly one schema source: descriptorSet, protoFiles, or client reflection: true');
      if (isDef(options.descriptorSet)) _$(options.descriptorSet, 'descriptorSet').isString().$_();
      if (isDef(options.reflection) && typeof options.reflection !== 'boolean') throw new Error('reflection must be a boolean');
      ['protoFiles', 'protoPaths'].forEach(function(key) {
        if (isDef(options[key])) {
          if (!isArray(options[key]) || !options[key].length) throw new Error(key + ' must be a nonempty array');
          options[key].forEach(function(value) { _$(value, key).isString().$_(); });
        }
      });
      if (isDef(options.protoc)) _$(options.protoc, 'protoc').isString().$_();
      ['maxInboundMessageSize', 'handlerThreads', 'queueCapacity', 'protocTimeout', 'reflectionTimeout'].forEach(function(key) {
        if (isDef(options[key])) positive(options[key], key);
      });
    }
    function loadSchema(options) {
      var config = {};
      ['descriptorSet', 'protoFiles', 'protoPaths', 'protoc', 'protocTimeout'].forEach(function(key) {
        if (isDef(options[key])) config[key] = options[key];
      });
      return Bridge.load(encode(config));
    }
    function streamView(stream) {
      function run(fn) {
        try { return fn(); }
        catch (e) {
          var javaError = e.javaException;
          if (javaError && javaError.getStatus) {
            var error = new Error(String(javaError.getStatus().getDescription() || javaError.getStatus().getCode()));
            error.code = String(javaError.getStatus().getCode().name());
            var metadata = jsonParse(String(stream.getMetadata()));
            error.headers = metadata.headers; error.trailers = metadata.trailers;
            throw error;
          }
          throw e;
        }
      }
      return {
        read: function() { return run(function() { return jsonParse(String(stream.read())); }); },
        write: function(value) { return run(function() { stream.write(encode(value)); }); },
        complete: function() { stream.complete(); },
        cancel: function() { stream.cancel(); },
        metadata: function() { return jsonParse(String(stream.getMetadata())); }
      };
    }
    function callView(state) {
      return {
        metadata: jsonParse(String(state.getMetadata())),
        isCancelled: function() { return state.isCancelled(); },
        deadlineRemaining: function() { return Number(state.getDeadlineRemaining()); },
        setHeaders: function(values) { state.setHeaders(encode(values)); },
        setTrailers: function(values) { state.setTrailers(encode(values)); }
      };
    }
    ow.obj.grpc = {
      describe: function(options) {
        validate(options, true);
        return jsonParse(String(loadSchema(options).describe()));
      },
      schema: function(options) {
        validate(options, true);
        return jsonParse(String(Conversion.schema(encode(options))));
      },
      fromProto: function(source, options) {
        options = merge({}, options || {});
        var temporary = java.nio.file.Files.createTempDirectory('openaf-grpc-source-');
        try {
          var path = String(temporary.resolve('input.proto'));
          io.writeFileString(path, source);
          options.protoFiles = [path];
          delete options.descriptorSet;
          return ow.obj.grpc.schema(options);
        } finally {
          java.nio.file.Files.deleteIfExists(temporary.resolve('input.proto'));
          java.nio.file.Files.deleteIfExists(temporary);
        }
      },
      toProto: function(value, file) {
        return String(Conversion.proto(encode(value), isDef(file) ? String(file) : null));
      },
      encode: function(options, message, value) {
        validate(options, true);
        _$(message, 'message').isString().$_();
        return Conversion.encode(encode(options), message, encode(value));
      },
      decode: function(options, message, bytes) {
        validate(options, true);
        _$(message, 'message').isString().$_();
        return jsonParse(String(Conversion.decode(encode(options), message, bytes)));
      },
      client: function(options) {
        validate(options);
        _$(options.target, 'target').isString().$_();
        var bridge = loadSchema(options);
        var channel = bridge.connect(encode(options));
        try {
          if (options.reflection === true) bridge.reflect(channel, encode({ timeout: options.reflectionTimeout || 5000, metadata: options.reflectionMetadata || {} }));
        } catch (e) {
          Bridge.close(channel, 0);
          if (e.javaException && e.javaException.getStatus) {
            var status = e.javaException.getStatus();
            var discoveryError = new Error(String(status));
            discoveryError.code = String(status.getCode().name());
            throw discoveryError;
          }
          throw e;
        }
        var closed = false;
        function invoke(method, request, callOptions) {
          if (closed) throw new Error('gRPC client is closed');
          callOptions = callOptions || {};
          if (isDef(callOptions.timeout)) positive(callOptions.timeout, 'timeout');
          var result = jsonParse(String(bridge.call(channel, method, encode(request), encode(callOptions))));
          return decode(result);
        }
        function decode(result) {
          if (result.error) {
            var error = new Error(result.error.description || result.error.code);
            error.code = result.error.code;
            error.headers = result.headers;
            error.trailers = result.error.trailers;
            throw error;
          }
          return result;
        }
        return {
          call: function(method, request, options) { return invoke(method, request, options).response; },
          callWithMetadata: invoke,
          describe: function() {
            if (closed) throw new Error('gRPC client is closed');
            return jsonParse(String(bridge.describe()));
          },
          openStream: function(method, options) {
            if (closed) throw new Error('gRPC client is closed');
            options = options || {};
            if (isDef(options.timeout)) positive(options.timeout, 'timeout');
            return streamView(bridge.openStream(channel, method, encode(options)));
          },
          stream: function(method, request, options) {
            if (closed) throw new Error('gRPC client is closed');
            if (String(bridge.methodType(method)) !== 'SERVER_STREAMING') throw new Error('stream() requires a server streaming method');
            options = options || {};
            if (isDef(options.timeout)) positive(options.timeout, 'timeout');
            var stream = streamView(bridge.openStream(channel, method, encode(options)));
            try { stream.write(request); stream.complete(); return stream; }
            catch (e) { stream.cancel(); throw e; }
          },
          callAsync: function(method, request, options) {
            if (closed) throw new Error('gRPC client is closed');
            options = options || {};
            if (isDef(options.timeout)) positive(options.timeout, 'timeout');
            var pending = bridge.callAsync(channel, method, encode(request), encode(options));
            return {
              cancel: function() { pending.cancel(); },
              isDone: function() { return pending.isDone(); },
              await: function() { return decode(jsonParse(String(pending.await()))).response; }
            };
          },
          close: function(timeout) {
            if (!closed) { Bridge.close(channel, isDef(timeout) ? timeout : 5000); closed = true; }
          }
        };
      }
    };
    ow.server.grpc = {
      error: function(code, description) {
        var error = new Error(description);
        error.grpcCode = code;
        return error;
      },
      start: function(options) {
        validate(options, true);
        if (!isNumber(options.port) || Math.floor(options.port) !== options.port || options.port < 0 || options.port > 65535) throw new Error('port must be an integer from 0 to 65535');
        _$(options.services, 'services').isMap().$_();
        var bridge = loadSchema(options);
        var handlers = Object.create(null), names = [];
        Object.keys(options.services).forEach(function(service) {
          Object.keys(options.services[service]).forEach(function(method) {
            var name = service + '/' + method;
            _$(options.services[service][method], name).isFunction().$_();
            names.push(name);
            handlers[name] = options.services[service][method];
          });
        });
        if (!names.length) throw new Error('At least one service method is required');
        var handler = new JavaAdapter(Packages.openaf.plugins.grpc.Bridge.Handler, {
          invoke: function(name, json, state) {
            var call = callView(state);
            try { return encode(handlers[String(name)](jsonParse(String(json)), call)); }
            catch (e) {
              if (e && e.grpcCode) state.fail(String(e.grpcCode), String(e.message));
              throw e;
            }
          },
          stream: function(name, transport, state) {
            var stream = streamView(transport), call = callView(state);
            try {
              var type = String(bridge.methodType(String(name)));
              if (type === 'SERVER_STREAMING') {
                var request = stream.read();
                if (request.done || !stream.read().done) state.fail('INVALID_ARGUMENT', 'Expected one request');
                handlers[String(name)](request.value, call, stream);
              } else {
                var response = handlers[String(name)](stream, call);
                if (type === 'CLIENT_STREAMING') stream.write(response);
              }
              return '';
            } catch (e) {
              if (e && e.grpcCode) state.fail(String(e.grpcCode), String(e.message));
              throw e;
            }
          }
        });
        // Functions cannot be serialized; transport configuration is separate.
        var config = {};
        Object.keys(options).forEach(function(key) { if (key !== 'services') config[key] = options[key]; });
        var server = bridge.serve(encode(config), names, handler);
        var stopped = false;
        return {
          getPort: function() { return server.getPort(); },
          stop: function(timeout) {
            if (!stopped) { Bridge.stop(server, isDef(timeout) ? timeout : 5000); stopped = true; }
          }
        };
      }
    };
    return { client: ow.obj.grpc, server: ow.server.grpc };
  }
  if (typeof exports !== 'undefined') exports.install = install;
  var base = getOPackPath('grpc');
  if (isUnDef(base)) base = getOPackPath('plugin-grpc');
  if (typeof exports === 'undefined' && isDef(base)) install(base);
})();
