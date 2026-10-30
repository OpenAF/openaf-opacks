package openaf.plugins.grpc;

import com.google.protobuf.*;
import com.google.protobuf.util.JsonFormat;
import io.grpc.*;
import io.grpc.protobuf.ProtoUtils;
import io.grpc.protobuf.ProtoServiceDescriptorSupplier;
import io.grpc.protobuf.services.ProtoReflectionService;
import io.grpc.protobuf.services.ProtoReflectionServiceV1;
import io.grpc.stub.*;
import io.grpc.netty.shaded.io.grpc.netty.*;
import java.nio.file.*;
import com.google.gson.*;
import java.util.concurrent.atomic.AtomicReference;
import io.grpc.netty.shaded.io.netty.handler.ssl.ClientAuth;
import java.net.InetSocketAddress;
import java.util.*;
import java.util.concurrent.*;

/** Dynamic RPC transport. Script callbacks are dispatched on a bounded executor. */
public final class Bridge {
    public interface Handler { String invoke(String method, String json, Call call); String stream(String method, Stream stream, Call call); }
    private final Map<String, Descriptors.FileDescriptor> files = new HashMap<>();
    private final Map<String, DescriptorProtos.FileDescriptorProto> pending = new HashMap<>();
    private final Map<String, MethodDescriptor<DynamicMessage, DynamicMessage>> methods = new HashMap<>();
    private final Map<String, Descriptors.ServiceDescriptor> serviceSchemas = new HashMap<>();
    public Bridge(String path) throws Exception {
        this(DescriptorProtos.FileDescriptorSet.parseFrom(Files.readAllBytes(Path.of(path))));
    }
    private Bridge(DescriptorProtos.FileDescriptorSet schema) throws Exception { initialize(schema); }
    public static Bridge load(String json) throws Exception { return new Bridge(Schema.load(options(json))); }
    private void initialize(DescriptorProtos.FileDescriptorSet schema) throws Exception {
        files.clear(); pending.clear(); methods.clear(); serviceSchemas.clear();
        for (var f : schema.getFileList()) {
            var previous = pending.putIfAbsent(f.getName(), f);
            if (previous != null && !previous.equals(f)) throw new IllegalArgumentException("Conflicting descriptor: " + f.getName());
        }
        for (String name : pending.keySet()) resolve(name, new HashSet<>());
        for (var f : files.values()) for (var service : f.getServices()) serviceSchemas.put(service.getFullName(), service);
        for (var f : files.values()) for (var service : f.getServices()) for (var m : service.getMethods()) {
            var type = m.isClientStreaming() ? (m.isServerStreaming() ? MethodDescriptor.MethodType.BIDI_STREAMING : MethodDescriptor.MethodType.CLIENT_STREAMING)
                : (m.isServerStreaming() ? MethodDescriptor.MethodType.SERVER_STREAMING : MethodDescriptor.MethodType.UNARY);
            methods.put(service.getFullName() + "/" + m.getName(), MethodDescriptor.<DynamicMessage, DynamicMessage>newBuilder()
                .setType(type).setFullMethodName(service.getFullName() + "/" + m.getName())
                .setRequestMarshaller(ProtoUtils.marshaller(DynamicMessage.getDefaultInstance(m.getInputType())))
                .setResponseMarshaller(ProtoUtils.marshaller(DynamicMessage.getDefaultInstance(m.getOutputType()))).build());
        }
    }
    private Descriptors.FileDescriptor resolve(String name, Set<String> active) throws Exception {
        if (files.containsKey(name)) return files.get(name);
        if (!active.add(name)) throw new IllegalArgumentException("Cyclic import: " + name);
        var proto = pending.get(name);
        if (proto == null) throw new IllegalArgumentException("Missing import: " + name + "; generate with --include_imports");
        var deps = new ArrayList<Descriptors.FileDescriptor>();
        for (String dep : proto.getDependencyList()) deps.add(resolve(dep, active));
        var result = Descriptors.FileDescriptor.buildFrom(proto, deps.toArray(new Descriptors.FileDescriptor[0]));
        files.put(name, result); active.remove(name); return result;
    }
    private MethodDescriptor<DynamicMessage, DynamicMessage> method(String name) {
        var m = methods.get(name);
        if (m == null) throw new IllegalArgumentException("Unknown method: " + name);
        return m;
    }
    private DynamicMessage parse(String json, MethodDescriptor.Marshaller<DynamicMessage> marshaller) throws Exception {
        var defaultMessage = ((MethodDescriptor.PrototypeMarshaller<DynamicMessage>) marshaller).getMessagePrototype();
        var builder = defaultMessage.newBuilderForType();
        JsonFormat.parser().merge(json, builder); return (DynamicMessage) builder.build();
    }
    private static final Gson GSON = new Gson();
    private static JsonObject options(String json) { return JsonParser.parseString(json).getAsJsonObject(); }
    private static String str(JsonObject o, String key, String fallback) { return o.has(key) ? o.get(key).getAsString() : fallback; }
    private static int number(JsonObject o, String key, int fallback) {
        int n = o.has(key) ? o.get(key).getAsInt() : fallback;
        if (n <= 0) throw new IllegalArgumentException(key + " must be positive");
        return n;
    }
    private static Metadata metadata(String json) {
        Metadata result = new Metadata();
        for (var e : options(json).entrySet()) {
            var values = e.getValue().isJsonArray() ? e.getValue().getAsJsonArray() : new JsonArray();
            if (!e.getValue().isJsonArray()) values.add(e.getValue());
            for (var value : values) {
                if (e.getKey().endsWith("-bin")) result.put(Metadata.Key.of(e.getKey(), Metadata.BINARY_BYTE_MARSHALLER), Base64.getDecoder().decode(value.getAsString()));
                else result.put(Metadata.Key.of(e.getKey(), Metadata.ASCII_STRING_MARSHALLER), value.getAsString());
            }
        }
        return result;
    }
    private static JsonObject metadata(Metadata source) {
        JsonObject result = new JsonObject();
        if (source != null) for (String key : source.keys()) {
            JsonArray values = new JsonArray();
            if (key.endsWith("-bin")) {
                var all = source.getAll(Metadata.Key.of(key, Metadata.BINARY_BYTE_MARSHALLER));
                if (all != null) for (byte[] value : all) values.add(Base64.getEncoder().encodeToString(value));
            } else {
                var all = source.getAll(Metadata.Key.of(key, Metadata.ASCII_STRING_MARSHALLER));
                if (all != null) for (String value : all) values.add(value);
            }
            result.add(key, values);
        }
        return result;
    }
    public static final class Call {
        private final Metadata request;
        private final Metadata headers = new Metadata(), trailers = new Metadata();
        private final Context context;
        private Call(Metadata request, Context context) { this.request = request; this.context = context; }
        public String getMetadata() { return GSON.toJson(metadata(request)); }
        public boolean isCancelled() { return context.isCancelled(); }
        public long getDeadlineRemaining() { return context.getDeadline() == null ? -1 : Math.max(0, context.getDeadline().timeRemaining(TimeUnit.MILLISECONDS)); }
        public void setHeaders(String json) { headers.merge(metadata(json)); }
        public void setTrailers(String json) { trailers.merge(metadata(json)); }
        public void fail(String code, String description) {
            Status status = Status.fromCode(Status.Code.valueOf(code));
            if (status.isOk()) throw new IllegalArgumentException("Failure status cannot be OK");
            throw status.withDescription(description).asRuntimeException(trailers);
        }
    }
    private static final Context.Key<Call> CALL = Context.key("openaf.grpc.call");
    public ManagedChannel connect(String json) throws Exception {
        var o = options(json);
        var builder = NettyChannelBuilder.forTarget(str(o, "target", "localhost:50051"))
            .maxInboundMessageSize(number(o, "maxInboundMessageSize", 4194304));
        boolean plaintext = o.has("plaintext") && o.get("plaintext").getAsBoolean();
        if (plaintext) {
            if (o.has("cert") || o.has("key") || o.has("trustCert")) throw new IllegalArgumentException("TLS options conflict with plaintext");
            builder.usePlaintext();
        } else {
            var ssl = GrpcSslContexts.forClient();
            if (o.has("trustCert")) ssl.trustManager(new java.io.File(o.get("trustCert").getAsString()));
            if (o.has("cert") != o.has("key")) throw new IllegalArgumentException("cert and key must be supplied together");
            if (o.has("cert")) ssl.keyManager(new java.io.File(o.get("cert").getAsString()), new java.io.File(o.get("key").getAsString()));
            builder.sslContext(ssl.build());
        }
        return builder.build();
    }
    public String call(ManagedChannel channel, String name, String json, String optionsJSON) throws Exception {
        var o = options(optionsJSON);
        var m = method(name);
        if (m.getType() != MethodDescriptor.MethodType.UNARY) throw new IllegalArgumentException("Use openStream for streaming methods");
        var headers = new AtomicReference<Metadata>();
        var trailers = new AtomicReference<Metadata>();
        Channel intercepted = ClientInterceptors.intercept(channel,
            MetadataUtils.newAttachHeadersInterceptor(metadata(o.has("metadata") ? o.get("metadata").toString() : "{}")),
            MetadataUtils.newCaptureMetadataInterceptor(headers, trailers));
        JsonObject result = new JsonObject();
        try {
            var response = ClientCalls.blockingUnaryCall(intercepted, m,
                CallOptions.DEFAULT.withDeadlineAfter(number(o, "timeout", 5000), TimeUnit.MILLISECONDS), parse(json, m.getRequestMarshaller()));
            result.add("response", JsonParser.parseString(JsonFormat.printer().print(response)));
        } catch (StatusRuntimeException e) {
            JsonObject error = new JsonObject();
            error.addProperty("code", e.getStatus().getCode().name());
            error.addProperty("description", e.getStatus().getDescription());
            error.add("trailers", metadata(e.getTrailers()));
            result.add("error", error);
        }
        result.add("headers", metadata(headers.get()));
        result.add("trailers", metadata(trailers.get()));
        return GSON.toJson(result);
    }
    public final class Pending {
        private final Context.CancellableContext context = Context.current().withCancellation();
        private final CompletableFuture<String> result = new CompletableFuture<>();
        private Pending(ManagedChannel channel, String name, String request, String options) {
            Thread.ofVirtual().start(() -> {
                try { result.complete(context.call(() -> call(channel, name, request, options))); }
                catch (Throwable e) { result.completeExceptionally(e); }
                finally { context.close(); }
            });
        }
        public boolean isDone() { return result.isDone(); }
        public void cancel() { context.cancel(new CancellationException("Cancelled by caller")); }
        public String await() throws Exception { return result.get(); }
    }
    public Pending callAsync(ManagedChannel channel, String name, String json, String options) {
        if (method(name).getType() != MethodDescriptor.MethodType.UNARY) throw new IllegalArgumentException("Use openStream for streaming methods");
        return new Pending(channel, name, json, options);
    }
    public Server serve(String json, String[] names, Handler handler) throws Exception {
        var o = options(json);
        int threads = number(o, "handlerThreads", 1);
        var executor = new ThreadPoolExecutor(threads, threads, 0, TimeUnit.MILLISECONDS,
            new ArrayBlockingQueue<>(number(o, "queueCapacity", 256)), new ThreadPoolExecutor.AbortPolicy());
        try {
            var builder = NettyServerBuilder.forAddress(new InetSocketAddress(str(o, "host", "127.0.0.1"), o.get("port").getAsInt()))
                .maxInboundMessageSize(number(o, "maxInboundMessageSize", 4194304));
            boolean plaintext = o.has("plaintext") && o.get("plaintext").getAsBoolean();
            if (plaintext) {
                if (o.has("cert") || o.has("key") || o.has("trustCert")) throw new IllegalArgumentException("TLS options conflict with plaintext");
            } else {
                if (!o.has("cert") || !o.has("key")) throw new IllegalArgumentException("TLS requires cert and key");
                var ssl = GrpcSslContexts.forServer(new java.io.File(o.get("cert").getAsString()), new java.io.File(o.get("key").getAsString()));
                if (o.has("trustCert")) ssl.trustManager(new java.io.File(o.get("trustCert").getAsString())).clientAuth(ClientAuth.REQUIRE);
                builder.sslContext(ssl.build());
            }
            builder.intercept(new ServerInterceptor() {
                public <Q, R> ServerCall.Listener<Q> interceptCall(ServerCall<Q, R> call, Metadata request, ServerCallHandler<Q, R> next) {
                    Call state = new Call(request, Context.current());
                    var wrapped = new ForwardingServerCall.SimpleForwardingServerCall<Q, R>(call) {
                        public void sendHeaders(Metadata headers) { headers.merge(state.headers); super.sendHeaders(headers); }
                        public void close(Status status, Metadata trailers) { trailers.merge(state.trailers); super.close(status, trailers); }
                    };
                    return Contexts.interceptCall(Context.current().withValue(CALL, state), wrapped, request, next);
                }
            });
            var services = new LinkedHashMap<String, ServerServiceDefinition.Builder>();
            for (String name : names) {
                var m = method(name);
                String service = name.substring(0, name.lastIndexOf('/'));
                if (m.getType() != MethodDescriptor.MethodType.UNARY) {
                    services.computeIfAbsent(service, key -> serviceBuilder(key, names)).addMethod(m, streamingHandler(m, handler, executor));
                    continue;
                }
                services.computeIfAbsent(service, key -> serviceBuilder(key, names)).addMethod(m, ServerCalls.asyncUnaryCall((request, observer) -> {
                    Call state = CALL.get();
                    try { executor.execute(Context.current().wrap(() -> {
                    try {
                        if (state.isCancelled()) { observer.onError(Status.CANCELLED.asRuntimeException()); return; }
                        var response = parse(handler.invoke(name, JsonFormat.printer().print(request), state), m.getResponseMarshaller());
                        if (!state.isCancelled()) { observer.onNext(response); observer.onCompleted(); }
                    } catch (Throwable e) {
                        // Rhino can wrap Java exceptions. Preserve intentional gRPC statuses.
                        Throwable cause = e;
                        while (cause.getCause() != null && cause != cause.getCause() && !(cause instanceof StatusRuntimeException)) cause = cause.getCause();
                        observer.onError(cause instanceof StatusRuntimeException ? cause : Status.INTERNAL.withDescription("Handler failed").asRuntimeException());
                    }
                    })); } catch (RejectedExecutionException e) {
                        observer.onError(Status.RESOURCE_EXHAUSTED.withDescription("Handler queue is full").asRuntimeException());
                    }
                }));
            }
            for (var service : services.values()) builder.addService(service.build());
            if (o.has("reflection") && o.get("reflection").getAsBoolean()) {
                builder.addService(ProtoReflectionServiceV1.newInstance());
                builder.addService(ProtoReflectionService.newInstance());
            }
            var server = builder.build().start();
            Thread.ofVirtual().start(() -> { try { server.awaitTermination(); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } finally { executor.shutdownNow(); } });
            return server;
        } catch (Throwable e) { executor.shutdownNow(); throw e; }
    }
    /** Pull-based stream: one inbound message in flight; writes obey transport readiness. */
    public final class Stream {
        private final Object lock = new Object();
        private final MethodDescriptor<DynamicMessage, DynamicMessage> method;
        private final boolean client;
        private DynamicMessage incoming;
        private boolean inputDone, outputDone, terminated;
        private int received, sent;
        private Status status = Status.OK;
        private Metadata headers = new Metadata(), trailers = new Metadata();
        private Runnable request, complete, cancel;
        private Runnable prepare = () -> {};
        private java.util.function.BooleanSupplier ready;
        private java.util.function.Consumer<DynamicMessage> send;
        private Stream(MethodDescriptor<DynamicMessage, DynamicMessage> method, boolean client) { this.method = method; this.client = client; }
        private void signal() { synchronized (lock) { lock.notifyAll(); } }
        private void receive(DynamicMessage message) {
            synchronized (lock) {
                if (terminated) return;
                received++;
                boolean single = client ? method.getType() == MethodDescriptor.MethodType.CLIENT_STREAMING : method.getType() == MethodDescriptor.MethodType.SERVER_STREAMING;
                if (incoming != null || (single && received > 1)) {
                    end(Status.INTERNAL.withDescription("Unexpected extra stream message"), new Metadata());
                    cancel.run(); return;
                }
                incoming = message; lock.notifyAll();
            }
        }
        private void end(Status value, Metadata metadata) {
            synchronized (lock) { status = value; trailers = metadata; inputDone = true; terminated = true; lock.notifyAll(); }
        }
        public String read() throws Exception {
            synchronized (lock) {
                while (incoming == null && !inputDone) lock.wait();
                if (incoming == null && !status.isOk()) throw status.asRuntimeException(trailers);
                JsonObject result = new JsonObject();
                if (incoming == null) result.addProperty("done", true);
                else {
                    result.addProperty("done", false);
                    result.add("value", JsonParser.parseString(JsonFormat.printer().print(incoming)));
                    incoming = null;
                    if (!terminated) request.run();
                }
                return GSON.toJson(result);
            }
        }
        public void write(String json) throws Exception {
            var message = parse(json, client ? method.getRequestMarshaller() : method.getResponseMarshaller());
            synchronized (lock) {
                if (outputDone) throw new IllegalStateException("Stream output is complete");
                boolean single = client ? method.getType() == MethodDescriptor.MethodType.SERVER_STREAMING : method.getType() == MethodDescriptor.MethodType.CLIENT_STREAMING;
                if (single && sent > 0) throw new IllegalStateException("Method accepts only one message in this direction");
                if (!terminated) prepare.run();
                while (!ready.getAsBoolean() && !terminated) lock.wait();
                if (terminated) throw (status.isOk() ? Status.CANCELLED : status).asRuntimeException(trailers);
                send.accept(message); sent++;
            }
        }
        public void complete() {
            synchronized (lock) {
                if (outputDone || terminated) return;
                if (client && method.getType() == MethodDescriptor.MethodType.SERVER_STREAMING && sent != 1)
                    throw new IllegalStateException("Server streaming requires one request");
                outputDone = true; complete.run();
            }
        }
        public void cancel() { synchronized (lock) { if (!terminated) { cancel.run(); end(Status.CANCELLED, new Metadata()); } } }
        public String getMetadata() {
            synchronized (lock) {
                JsonObject result = new JsonObject(); result.add("headers", metadata(headers)); result.add("trailers", metadata(trailers));
                result.addProperty("done", terminated); result.addProperty("code", status.getCode().name()); return GSON.toJson(result);
            }
        }
    }
    private ServerServiceDefinition.Builder serviceBuilder(String name, String[] names) {
        var schema = serviceSchemas.get(name);
        var descriptor = io.grpc.ServiceDescriptor.newBuilder(name).setSchemaDescriptor(new ProtoServiceDescriptorSupplier() {
            public Descriptors.FileDescriptor getFileDescriptor() { return schema.getFile(); }
            public Descriptors.ServiceDescriptor getServiceDescriptor() { return schema; }
        });
        for (String methodName : names) if (methodName.startsWith(name + "/")) descriptor.addMethod(method(methodName));
        return ServerServiceDefinition.builder(descriptor.build());
    }
    /** Returns locally loaded or reflected service/method information, without network calls. */
    public String describe() {
        JsonArray services = new JsonArray();
        for (String name : new TreeSet<>(serviceSchemas.keySet())) {
            JsonObject service = new JsonObject(); service.addProperty("name", name);
            JsonArray entries = new JsonArray();
            for (var method : serviceSchemas.get(name).getMethods()) {
                JsonObject entry = new JsonObject();
                entry.addProperty("name", method.getName()); entry.addProperty("fullName", name + "/" + method.getName());
                entry.addProperty("inputType", method.getInputType().getFullName()); entry.addProperty("outputType", method.getOutputType().getFullName());
                entry.addProperty("type", methodType(name + "/" + method.getName())); entries.add(entry);
            }
            service.add("methods", entries); services.add(service);
        }
        return GSON.toJson(services);
    }
    private static void collectDescriptor(Descriptors.FileDescriptor file, Map<String, DescriptorProtos.FileDescriptorProto> result) {
        if (result.putIfAbsent(file.getName(), file.toProto()) == null)
            for (var dependency : file.getDependencies()) collectDescriptor(dependency, result);
    }
    private static JsonObject reflectionQuery(Stream stream, String field, String value) throws Exception {
        JsonObject query = new JsonObject(); query.addProperty(field, value); stream.write(GSON.toJson(query));
        JsonObject response = options(stream.read());
        if (response.get("done").getAsBoolean()) throw Status.INTERNAL.withDescription("Reflection stream ended without a response").asRuntimeException();
        response = response.getAsJsonObject("value");
        if (response.has("errorResponse")) {
            var error = response.getAsJsonObject("errorResponse");
            throw Status.fromCodeValue(error.get("errorCode").getAsInt()).withDescription(error.has("errorMessage") ? error.get("errorMessage").getAsString() : "Reflection request failed").asRuntimeException();
        }
        return response;
    }
    private static void addReflectedFiles(JsonObject response, Map<String, DescriptorProtos.FileDescriptorProto> result) throws Exception {
        if (!response.has("fileDescriptorResponse")) throw new IllegalArgumentException("Missing reflection fileDescriptorResponse");
        for (var encoded : response.getAsJsonObject("fileDescriptorResponse").getAsJsonArray("fileDescriptorProto")) {
            var file = DescriptorProtos.FileDescriptorProto.parseFrom(Base64.getDecoder().decode(encoded.getAsString()));
            var previous = result.putIfAbsent(file.getName(), file);
            if (previous != null && !previous.equals(file)) throw new IllegalArgumentException("Conflicting reflected descriptor: " + file.getName());
        }
    }
    private DescriptorProtos.FileDescriptorSet discover(ManagedChannel channel, String json, boolean legacy) throws Exception {
        var bootstrap = new LinkedHashMap<String, DescriptorProtos.FileDescriptorProto>();
        collectDescriptor(legacy ? io.grpc.reflection.v1alpha.ServerReflectionProto.getDescriptor() : io.grpc.reflection.v1.ServerReflectionProto.getDescriptor(), bootstrap);
        var reflection = new Bridge(DescriptorProtos.FileDescriptorSet.newBuilder().addAllFile(bootstrap.values()).build());
        String name = "grpc.reflection." + (legacy ? "v1alpha" : "v1") + ".ServerReflection/ServerReflectionInfo";
        Stream stream = reflection.openStream(channel, name, json);
        try {
            JsonObject response = reflectionQuery(stream, "listServices", "");
            if (!response.has("listServicesResponse")) throw new IllegalArgumentException("Missing reflection listServicesResponse");
            var result = new LinkedHashMap<String, DescriptorProtos.FileDescriptorProto>();
            var services = response.getAsJsonObject("listServicesResponse").getAsJsonArray("service");
            if (services != null) for (var service : services) {
                String symbol = service.getAsJsonObject().get("name").getAsString();
                if (symbol.startsWith("grpc.reflection.")) continue;
                addReflectedFiles(reflectionQuery(stream, "fileContainingSymbol", symbol), result);
            }
            // Some servers return only the requested file. Fetch missing imports on the same stream.
            while (true) {
                var missing = new LinkedHashSet<String>();
                for (var file : result.values()) for (String dep : file.getDependencyList()) if (!result.containsKey(dep)) missing.add(dep);
                if (missing.isEmpty()) break;
                int count = result.size();
                for (String dep : missing) addReflectedFiles(reflectionQuery(stream, "fileByFilename", dep), result);
                if (result.size() == count) throw new IllegalArgumentException("Reflection did not resolve imports: " + missing);
            }
            return DescriptorProtos.FileDescriptorSet.newBuilder().addAllFile(result.values()).build();
        } finally { stream.cancel(); }
    }
    public void reflect(ManagedChannel channel, String json) throws Exception {
        DescriptorProtos.FileDescriptorSet schema;
        try { schema = discover(channel, json, false); }
        catch (StatusRuntimeException e) {
            if (e.getStatus().getCode() != Status.Code.UNIMPLEMENTED) throw e;
            schema = discover(channel, json, true);
        }
        initialize(schema);
    }
    public String methodType(String name) { return method(name).getType().name(); }
    public Stream openStream(ManagedChannel channel, String name, String json) {
        var m = method(name);
        if (m.getType() == MethodDescriptor.MethodType.UNARY) throw new IllegalArgumentException("Use call for unary methods");
        var o = options(json);
        var call = channel.newCall(m, CallOptions.DEFAULT.withDeadlineAfter(number(o, "timeout", 5000), TimeUnit.MILLISECONDS));
        Stream stream = new Stream(m, true);
        stream.ready = () -> m.getType() == MethodDescriptor.MethodType.SERVER_STREAMING || call.isReady(); stream.request = () -> call.request(1);
        stream.send = call::sendMessage; stream.complete = call::halfClose;
        stream.cancel = () -> call.cancel("Cancelled by caller", null);
        call.start(new ClientCall.Listener<DynamicMessage>() {
            public void onHeaders(Metadata headers) { synchronized (stream.lock) { stream.headers = headers; } }
            public void onMessage(DynamicMessage message) { stream.receive(message); }
            public void onReady() { stream.signal(); }
            public void onClose(Status status, Metadata trailers) {
                synchronized (stream.lock) {
                    if (status.isOk() && m.getType() == MethodDescriptor.MethodType.CLIENT_STREAMING && stream.received != 1)
                        status = Status.INTERNAL.withDescription("Expected one response");
                    stream.end(status, trailers);
                }
            }
        }, metadata(o.has("metadata") ? o.get("metadata").toString() : "{}"));
        call.request(1);
        return stream;
    }
    private ServerCallHandler<DynamicMessage, DynamicMessage> streamingHandler(
            MethodDescriptor<DynamicMessage, DynamicMessage> m, Handler handler, Executor executor) {
        return (call, headers) -> {
            Call state = CALL.get();
            Stream stream = new Stream(m, false);
            boolean[] headersSent = { false };
            stream.ready = () -> m.getType() == MethodDescriptor.MethodType.CLIENT_STREAMING || call.isReady(); stream.request = () -> call.request(1);
            stream.prepare = () -> {
                if (!headersSent[0]) { call.sendHeaders(new Metadata()); headersSent[0] = true; }
            };
            stream.send = call::sendMessage;
            stream.complete = () -> { stream.prepare.run(); call.close(Status.OK, new Metadata()); stream.end(Status.OK, new Metadata()); };
            stream.cancel = () -> call.close(Status.CANCELLED, new Metadata());
            Context context = Context.current();
            try { executor.execute(context.wrap(() -> {
                try {
                    if (state.isCancelled()) { stream.cancel(); return; }
                    handler.stream(m.getFullMethodName(), stream, state);
                    stream.complete();
                } catch (Throwable e) {
                    Throwable cause = e;
                    while (cause.getCause() != null && cause != cause.getCause() && !(cause instanceof StatusRuntimeException)) cause = cause.getCause();
                    Status status = cause instanceof StatusRuntimeException ? ((StatusRuntimeException) cause).getStatus() : Status.INTERNAL.withDescription("Handler failed");
                    synchronized (stream.lock) {
                        if (!stream.terminated) { call.close(status, new Metadata()); stream.end(status, new Metadata()); }
                    }
                }
            })); } catch (RejectedExecutionException e) {
                call.close(Status.RESOURCE_EXHAUSTED.withDescription("Handler queue is full"), new Metadata());
                stream.end(Status.RESOURCE_EXHAUSTED, new Metadata());
            }
            call.request(1);
            return new ServerCall.Listener<DynamicMessage>() {
                public void onMessage(DynamicMessage message) { stream.receive(message); }
                public void onHalfClose() { synchronized (stream.lock) { stream.inputDone = true; stream.lock.notifyAll(); } }
                public void onReady() { stream.signal(); }
                public void onCancel() { stream.end(Status.CANCELLED, new Metadata()); }
            };
        };
    }
    public static void close(ManagedChannel channel, long timeout) throws InterruptedException {
        if (timeout < 0) throw new IllegalArgumentException("timeout must be nonnegative");
        channel.shutdown();
        try { if (!channel.awaitTermination(timeout, TimeUnit.MILLISECONDS)) channel.shutdownNow(); }
        catch (InterruptedException e) { channel.shutdownNow(); Thread.currentThread().interrupt(); throw e; }
    }
    public static void stop(Server server, long timeout) throws InterruptedException {
        if (timeout < 0) throw new IllegalArgumentException("timeout must be nonnegative");
        server.shutdown();
        try { if (!server.awaitTermination(timeout, TimeUnit.MILLISECONDS)) server.shutdownNow(); }
        catch (InterruptedException e) { server.shutdownNow(); Thread.currentThread().interrupt(); throw e; }
    }
}
