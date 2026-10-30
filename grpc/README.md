# grpc

Dynamic gRPC for OpenAF, exposed through `ow.obj.grpc` and
`ow.server.grpc`. The transport and dependencies are isolated in this oPack.
Requires OpenAF >=20261030 and JRE 21+; build with JDK 21+ and Maven.

## Build and load

Run `ojob build.yaml` (or `sh build.sh`) from this directory. The job:

1. Cleans dependency jars, generated classes and the previous plugin jar.
2. Downloads pinned `.maven.yaml` dependencies using `ojob.io/oaf/mavenGetJars`.
3. Runs `ojob.io/oaf/checkOAFJars remove=true versioninsensitive=true` to remove
   dependencies supplied by OpenAF, including Gson, then removes empty compatibility jars.
4. Compiles Java with `--release 21` against the remaining jars and `openaf.jar`.
5. Regenerates package metadata and hashes, excluding `target/`.

`ojob build.yaml test=true` also runs the local regression suite before packaging.
The build requires Maven, a JDK, the OpenAF `.jar.orig` archive used by
`checkOAFJars`, and network access to ojob.io and Maven repositories. The downloader
may install its supporting Maven oPack. Child jobs use the same OpenAF JAR as the
build, regardless of the CLI found on PATH.
Dependency upgrades are explicit: keep `.maven.yaml` and the repository root
`../pom.xml` aligned. The build uses `.maven.yaml` and also works outside the
repository checkout. Gson is `provided` in the root POM and comes from OpenAF at runtime. The build does not replace OpenAF core files.
The package keeps dependency jars separate to preserve service-provider resources.
If your installed CLI is older, invoke a current JAR explicitly:

```sh
java -jar /path/to/openaf.jar --ojob -e 'build.yaml test=true'
```

The test scripts also accept `GRPC_OPENAF_JAR=/path/to/openaf.jar` to select the
runtime for standalone test runs.

After installing this directory with `opack install /path/to/grpc`, use
`loadLib("grpc.js")`. For development without installation:

```javascript
require('/path/to/grpc/grpc.js').install('/path/to/grpc');
```

Generate a descriptor set (protoc is needed only when compiling schemas):

```sh
protoc -I . --include_imports --descriptor_set_out=hello.protoset hello.proto
```

## Load .proto files

Both client and server accept `protoFiles` instead of `descriptorSet`:

```javascript
var client = ow.obj.grpc.client({
  target: 'localhost:50051', plaintext: true,
  protoFiles: ['/path/to/protos/hello.proto'],
  protoPaths: ['/path/to/protos', '/path/to/shared/protos']
});
```

The plugin runs `protoc` once when creating the client/server, loads the generated
descriptor set including imports, then deletes the temporary files. No generated
Java code is needed. `protoPaths` lists import roots; source-file directories are
also included automatically. Supply include roots for well-known or shared types
when required by your protoc installation.

`protoc` selects an executable (default `protoc` on PATH); `protocTimeout` limits
compilation in milliseconds (default 30000). Arguments are passed directly to the
process, so paths with spaces work without shell quoting. Missing executables,
invalid schemas and missing imports fail with compiler diagnostics; timeouts
terminate the compiler and clean up temporary files. Compilers are never
downloaded automatically.

## Reflection

Servers enable both reflection v1 and v1alpha with `reflection: true`, alongside
either `descriptorSet` or `protoFiles`:

```javascript
var server = ow.server.grpc.start({
  protoFiles: ['/path/to/protos/hello.proto'],
  reflection: true, host: '127.0.0.1', port: 50051, plaintext: true,
  services: { 'demo.Greeter': { Echo: function(request) { return request; } } }
});
```

Clients can discover their schema without local files or protoc:

```javascript
var client = ow.obj.grpc.client({
  target: 'localhost:50051', plaintext: true, reflection: true,
  reflectionTimeout: 5000,
  reflectionMetadata: { authorization: 'Bearer ...' } // Optional discovery credentials.
});
try {
  print(client.describe());
  print(client.call('demo.Greeter/Echo', { name: 'OpenAF' }));
} finally { client.close(); }
```

Discovery happens during client creation. It tries v1 first, falling back to
v1alpha only for UNIMPLEMENTED. Each attempt uses one reflection stream with a
`reflectionTimeout` deadline (default 5000ms) and the supplied discovery metadata.
It resolves imported files before publishing the client. Discovery failures close
the channel; RPC status errors expose `code`. TLS/mTLS settings are shared with
application calls. Reflection metadata is separate from per-call metadata.

`client.describe()` inspects the loaded schema without network traffic and returns
services with method names, full method paths, input/output types and RPC types.
This works with descriptor sets and compiled .proto files too. Descriptors can
contain methods not implemented by the peer; calling those returns UNIMPLEMENTED.
Reflection is disabled by default on servers and is never used as an implicit
fallback for invalid local schemas. Select exactly one client schema source:
`descriptorSet`, `protoFiles`, or `reflection: true`.

## Client

```javascript
var client = ow.obj.grpc.client({
  target: 'localhost:50051', descriptorSet: 'hello.protoset', plaintext: true
});
try {
  var response = client.call('demo.Greeter/Echo', { name: 'OpenAF' }, {
    timeout: 5000, metadata: { 'x-request-id': '123' }
  });
  var detailed = client.callWithMetadata('demo.Greeter/Echo', { name: 'OpenAF' });
  // detailed: { response, headers, trailers }
  var pending = client.callAsync('demo.Greeter/Echo', { name: 'OpenAF' });
  // pending.cancel() explicitly cancels; pending.isDone() polls completion.
  var asyncResponse = pending.await();
} catch (e) {
  // RPC errors expose code (e.g. DEADLINE_EXCEEDED), headers and trailers.
  printErr(e.code + ': ' + e.message);
} finally { client.close(); }
```

Each call defaults to a 5000ms deadline. `close(timeout)` and `stop(timeout)`
allow a grace period in milliseconds, default 5000, then force shutdown.
Metadata values may be strings or arrays of strings; received values are always
arrays. Keys ending in `-bin` use base64 values.

## Server

```javascript
var server = ow.server.grpc.start({
  host: '127.0.0.1', port: 50051, descriptorSet: 'hello.protoset', plaintext: true,
  services: { 'demo.Greeter': {
    Echo: function(request, call) {
      call.setHeaders({ 'x-server': 'OpenAF' });
      call.setTrailers({ 'x-finished': 'yes' });
      if (!request.name) throw ow.server.grpc.error('INVALID_ARGUMENT', 'name required');
      // call.metadata, call.isCancelled(), call.deadlineRemaining()
      return request;
    }
  } }
});
// server.getPort() supports port: 0 for an allocated local port.
// server.stop() during shutdown.
```

Handlers run serially by default outside transport event loops. `handlerThreads`
opts into parallel callbacks sharing script state. `queueCapacity` defaults to
256; excess work receives RESOURCE_EXHAUSTED. Cancelled queued calls skip their
handler. Running JavaScript must cooperate with cancellation; it cannot safely
be forcibly interrupted. Unexpected handler errors return a generic INTERNAL
status. Explicit statuses retain the description and trailers.

Both client and server accept `maxInboundMessageSize` in bytes (default 4MiB).
Messages follow ProtoJSON: 64-bit integers use strings, bytes use base64, enums
use names. Unknown fields fail. Unknown methods and mismatched unary/streaming APIs fail locally.

## Streaming

Server streaming sends one request and exposes a pull reader:

```javascript
var results = client.stream('demo.Greeter/Watch', { count: '3' }, { timeout: 10000 });
try {
  while (true) {
    var next = results.read();
    if (next.done) break;
    print(next.value);
  }
  print(results.metadata()); // { headers, trailers, done, code }
} finally { results.cancel(); }
```

Client and bidirectional streaming use `client.openStream(method, options)`:

```javascript
var upload = client.openStream('demo.Greeter/Collect');
try {
  upload.write({ name: 'a' });
  upload.write({ name: 'b' });
  upload.complete(); // Half-close outgoing messages; continue reading responses.
  var response = upload.read().value;
  upload.read(); // Observe final completion or status error.
} finally { upload.cancel(); }

var chat = client.openStream('demo.Greeter/Chat');
try {
  chat.write({ name: 'hello' });
  print(chat.read().value);
  chat.complete();
  while (!chat.read().done) { /* drain remaining responses */ }
} finally { chat.cancel(); }
```

Register streaming handlers in the same services map. Server-streaming handlers
receive `(request, call, output)`. Client-streaming handlers receive
`(input, call)` and return their single response. Bidirectional handlers receive
`(stream, call)` and use both `read()` and `write()`:

```javascript
services: { 'demo.Greeter': {
  Watch: function(request, call, output) {
    for (var i = 0; i < Number(request.count); i++) {
      if (call.isCancelled()) return;
      output.write({ name: String(i) });
    }
  },
  Collect: function(input, call) {
    var names = [];
    while (true) {
      var next = input.read();
      if (next.done) break;
      names.push(next.value.name);
    }
    return { name: names.join(',') };
  },
  Chat: function(stream, call) {
    while (true) {
      var next = stream.read();
      if (next.done) return;
      stream.write(next.value);
    }
  }
} }
```

Returning from a server streaming handler completes its response stream.
Throw `ow.server.grpc.error(code, description)` for an intentional failure.
Streaming RPC errors expose the same `code`, `headers`, and `trailers` properties
as unary errors. Read until `{ done: true }` to observe final status; messages
already received are delivered before a subsequent terminal error.

The bridge requests one inbound message at a time and waits for outbound
transport readiness. `read()` and `write()` block the calling thread; no
JavaScript executes on transport callback threads. For bidirectional protocols,
interleave reads and writes, or use separate reader/writer threads with suitable
script synchronization. Both peers writing indefinitely without reading can
stall under backpressure. A stream occupies a handler worker while active;
configure `handlerThreads` for concurrent long-lived streams. Call deadlines,
explicit cancellation and server shutdown release blocked stream operations.
Cancellation after terminal completion is harmless.

## TLS

TLS is the default; local plaintext requires `plaintext: true`. Clients use JVM
system trust unless `trustCert` supplies a PEM CA file. Servers require PEM
`cert` and `key`. For mTLS, set server `trustCert` to require client certificates,
and set client `cert` and `key`. Hostname verification remains enabled.
TLS settings combined with plaintext are rejected.

## Tests

`sh tests/run.sh` regenerates the fixture using protoc and runs OpenAF tests for
message conversion, metadata, statuses, deadlines, cancellation, concurrent
requests and input validation. Streaming tests cover all three patterns,
terminal errors, empty uploads, cancellation and slow-reader flow control. Schema
tests cover direct compilation, imports, paths with spaces, compiler errors/timeouts,
v1 discovery and disabled reflection. Python peers validate v1alpha compatibility
and authentication failures; TLS tests also exercise reflected discovery.

Set `GRPC_TEST_CERTS` to a directory containing `ca.pem`, `server.pem`, and
`server.key` to also run TLS/mTLS positive and negative cases. Certificates must
be valid for localhost and both server/client authentication. Keep test private
keys outside the package.

For cross-language tests, create a temporary Python virtual environment, install
`grpcio-tools` and `grpcio-reflection`, and set `GRPC_PEER_PYTHON` to its Python interpreter. The test
runner generates Python stubs and verifies both OpenAF-client/Python-server and
Python-client/OpenAF-server calls for unary and all streaming patterns. No external service or credentials is needed.

Custom Any type registries are future work. There is no implicit retry of calls.

## oafp extension

Use `libs=grpc` and `help=grpc` to list extension options. The package is named
`grpc` because its public entry point is `loadLib("grpc.js")`, rather than a
`plugin(...)` class. Replace an existing `plugin-grpc` installation with `grpc`;
`grpc.js` retains the old package lookup as a fallback. Java namespaces remain
`openaf.plugins.grpc`. Explicit `require(path).install(path)` loads only that
path, so an installed copy cannot preempt development JARs.

### Schema conversion

```sh
oafp libs=grpc file=hello.proto out=json > schema.json
oafp libs=grpc file=schema.json out=proto > normalized.proto
```

Maps use Protobuf's standard `FileDescriptorSet` ProtoJSON representation. Input
includes imports. For multi-file sets, `protofile=hello.proto` selects the file
written by `out=proto`; imported files remain separate and must be available when
compiling the generated source. `grpcoptions` accepts `protoPaths`, `protoc` and
`protocTimeout` for compilation. Source text can also come from stdin or `data=`.

Output preserves supported proto2/proto3 schema semantics, including nested
messages, maps, optional fields, oneofs, enums, reserved declarations, imports,
services and streaming methods. Comments and formatting are normalized. Groups,
extensions, editions, custom/unknown options and aggregate/repeated options are
rejected explicitly. Custom descriptor options are rejected during input too,
because ordinary descriptor JSON cannot preserve their unknown wire fields.

The reusable APIs are `ow.obj.grpc.schema(options)`, `fromProto(source, options)`,
`toProto(map, file)`, `describe(options)`, `encode(options, message, map)` and
`decode(options, message, bytes)`. `schema` reads `protoFiles` or `descriptorSet`;
`fromProto` compiles a temporary `input.proto` and accepts shared import roots.
`describe` inspects a local schema without opening a channel.

### Binary Protobuf messages

```sh
oafp libs=grpc in=json data='{"name":"OpenAF"}' out=protobuf \
  grpcoptions='{"protoFiles":["hello.proto"]}' protobufmessage=demo.Message outfile=message.pb
oafp libs=grpc file=message.pb out=json \
  grpcoptions='{"protoFiles":["hello.proto"]}' protobufmessage=demo.Message
cat message.pb | oafp libs=grpc in=protobuf data= out=json \
  grpcoptions='{"protoFiles":["hello.proto"]}' protobufmessage=demo.Message
```

`.pb` and `.protobuf` select binary input. `protobufmessage` is a fully qualified
message name. Binary output uses `outfile=` or raw stdout without added newlines.
For raw stdin, `data=` prevents oafp's normal text reader from consuming bytes.
For command streams, use `protobufcmd='command ...' data=`; the generic `cmd=`
option buffers text before an extension runs and is unsuitable for binary input.
All message maps follow ProtoJSON, including strings for 64-bit integers and
base64 for bytes. Unknown fields, missing required fields, unknown message types
and malformed binary input fail.

### RPC clients

```sh
oafp libs=grpc in=grpc data= out=json grpcmethod=demo.Greeter/Echo \
  grpcoptions='{"target":"localhost:50051","plaintext":true,"protoFiles":["hello.proto"]}' \
  grpcrequest='{"name":"OpenAF"}'
```

`in=grpc` calls a remote method using `grpcrequest` and emits each response through
the pipeline. `out=grpc` sends pipeline data and prints a JSON envelope with
`responses`, `headers` and `trailers`. Unary and server-streaming requests are
single maps; client-streaming and bidirectional requests are finite arrays of
maps. Bidirectional reading and writing run concurrently. The outgoing stream
half-closes after the last request. Input processes responses incrementally;
output collects them for its result envelope.

`grpcoptions` accepts the existing client options, including schema source,
reflection and TLS. `grpccalloptions` accepts `timeout` and `metadata`; calls use
the existing default 5000ms deadline. Streams are cancelled and channels closed
on completion, failure or pipeline errors. There are no implicit retries.

### RPC listener

```sh
oafp libs=grpc in=grpc data= out=ndjson grpcmode=server \
  grpcmethod=demo.Greeter/Echo grpcresponse='{"name":"received"}' \
  grpcoptions='{"host":"127.0.0.1","port":50051,"plaintext":true,"protoFiles":["hello.proto"]}'
```

Listener mode requires a local schema and serves one method. It validates the
configured response before binding. Each incoming message enters the pipeline;
replies use `grpcresponse` independently of pipeline output. Unary calls reply
once; client-streaming calls reply after input completes; bidirectional calls
reply once per incoming message. Server-streaming calls send a configured array
of responses. Defaults are `{}` for single replies and `[]` for server streams;
provide a response when the schema has required fields.

The listener runs until interrupted. `grpcduration` limits runtime in milliseconds
and `grpcmaxrequests` limits the number of incoming messages emitted into the
pipeline. Requests are buffered in a bounded queue (`queueCapacity`, default 256)
and processed serially on the main thread. Active calls receive the normal bounded
shutdown grace period when a limit is reached; queued messages beyond the limit
are not emitted. A JVM shutdown hook stops transport on interruption. Pipeline
failures stop the listener; they do not determine RPC replies. TLS remains the
default, with the same certificate requirements as `ow.server.grpc`.

### Extension tests

`tests/conversion.js` covers schema and payload conversion. `tests/oafp.js`
exercises the adapter with live local RPCs. `tests/oafp-cli.py` runs the actual
oafp engine in subprocesses against generated Python peers, including raw-byte
pipes and all four listener/client patterns. The Python test uses the same
`GRPC_PEER_PYTHON` prerequisites as interoperability tests. No installed package
registration is changed by these tests.

## oJob definitions

Include `oJobGRPC.yaml` for `GRPC Start Server`, `GRPC Stop Server` and `GRPC Call`.
Server bindings dispatch RPCs to named jobs through `$job`; remote calls pass
request maps or arrays and return responses plus metadata. See
[GRPC-OJOB.md](GRPC-OJOB.md) for examples and streaming contracts.
