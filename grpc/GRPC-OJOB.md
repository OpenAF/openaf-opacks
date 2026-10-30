# gRPC oJob jobs

Include `oJobGRPC.yaml` to start named gRPC servers and invoke remote methods.
The definitions use the existing `grpc.js` transport, including schema loading,
reflection, TLS/mTLS, deadlines and metadata. They do not start a server merely
by being included.

```yaml
include:
  - oJobGRPC.yaml

ojob:
  daemon: true
  async: false

jobs:
  - name: Start API
    to: GRPC Start Server
    args:
      id: api
      options:
        host: 127.0.0.1
        port: 50051
        plaintext: true
        protoFiles: [hello.proto]
      bindings:
        demo.Greeter/Echo:
          job: Echo business logic
          args:
            prefix: 'Hello '

  - name: Echo business logic
    exec: |
      args.response = {name: args.prefix + args.request.name}

  - name: Call API
    to: GRPC Call
    args:
      options:
        target: localhost:50051
        plaintext: true
        protoFiles: [hello.proto]
      method: demo.Greeter/Echo
      request: {name: OpenAF}
      callOptions:
        timeout: 5000
        metadata: {x-request-id: example}

  - name: Stop API
    to: GRPC Stop Server
    args: {id: api, timeout: 5000}

todo:
  - Start API
```

For a long-running server, use `ojob.daemon: true`. For a finite workflow, invoke
`GRPC Stop Server` when finished. Named servers are independent; duplicate IDs
fail instead of replacing a running server. A JVM shutdown hook also stops each
server on process termination. Start returns the allocated port in `args.port`,
including when `options.port: 0` selects an available local port.

Bindings may be a job name or `{job: name, args: defaults}`. Each invocation calls
`$job` with fresh arguments containing `request`, `metadata` and `method`; these
reserved values override binding defaults. The job must set `args.response`:

| RPC type | Bound job request | Bound job response | GRPC Call response |
| --- | --- | --- | --- |
| Unary | Map | Map | Map |
| Server streaming | Map | Array of maps | Array of maps |
| Client streaming | Array of maps, after half-close | Map | Map |
| Bidirectional | One map per invocation | One map per invocation | Array of maps |

`GRPC Call` accepts a request map for unary/server-streaming methods and a finite
array of maps for upload/bidirectional methods. Bidirectional reads and writes
run concurrently. Client-streaming server bindings collect the incoming stream
before invoking the business job; use `grpc.js` directly when incremental upload
processing is needed. Arrays are buffered in memory. Existing transport deadlines
and inbound message limits still apply; there is no automatic retry.

Business jobs may set `args.headers` and `args.trailers` to gRPC metadata maps.
For a deliberate status, set `args.grpcError = {code: 'INVALID_ARGUMENT',
message: 'name required'}`. Other exceptions and missing/invalid responses become
the transport's generic INTERNAL error. With bidirectional bindings, headers
should be set only by the first invocation, before the first response is sent.
Keep the existing default single handler worker unless business jobs and shared
state support concurrent execution. Configure the parent oJob catch handler to
rethrow business-job failures rather than swallowing them.

`GRPC Call` sets `args.response`, `args.headers` and `args.trailers`, and closes its
channel in both success and failure cases. All request/reply maps follow ProtoJSON
(e.g. base64 bytes and strings for 64-bit integers). TLS is the default; the example
uses plaintext solely for local development. Do not expose a plaintext listener
when TLS is required.

Shortcuts are `(grpcServer: id)`, `(grpcStop: id)` and `(grpcCall: service/method)`
with the same named arguments as the full jobs.

`tests/ojob.js` exercises the real oJob engine and `$job` dispatch while replacing
the network boundary; it covers all four binding/call patterns and cleanup.
Run from the opack directory:

```sh
java -jar /path/to/openaf.jar -f tests/ojob.js
```
