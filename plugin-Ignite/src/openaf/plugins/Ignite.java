package openaf.plugins;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import org.apache.ignite.IgniteServer;
import org.apache.ignite.InitParameters;
import org.apache.ignite.client.BasicAuthenticator;
import org.apache.ignite.client.IgniteClient;
import org.apache.ignite.compute.BroadcastJobTarget;
import org.apache.ignite.compute.ComputeJob;
import org.apache.ignite.compute.JobDescriptor;
import org.apache.ignite.compute.JobExecutionContext;
import org.apache.ignite.compute.JobTarget;
import org.apache.ignite.sql.ResultSet;
import org.apache.ignite.sql.SqlRow;
import org.apache.ignite.table.KeyValueView;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.NativeJSON;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.mozilla.javascript.Undefined;
import org.mozilla.javascript.annotations.JSConstructor;
import org.mozilla.javascript.annotations.JSFunction;
import openaf.AFCmdBase;

/** OpenAF's Ignite 3 lifecycle, JSON channel and distributed compute bridge. */
public class Ignite extends ScriptableObject {
    private static final long serialVersionUID = -1058394978145136847L;
    private static final Map<String, Handle> nodes = new LinkedHashMap<>();
    private Scriptable configuration;
    private Handle handle;
    private String nodeName;

    private static class Handle {
        org.apache.ignite.Ignite api;
        IgniteServer server;
        IgniteClient client;
        void close() {
            if (client != null) client.close();
            if (server != null) server.shutdown();
        }
    }

    @Override public String getClassName() { return "Ignite"; }

    /** <odoc>
     * <key>Ignite.Ignite(shouldLog)</key>
     * Creates an Ignite 3 wrapper. Configure before start using getConfiguration() or configure(map).
     * Logging is controlled by the JVM logging configuration; shouldLog is retained for source compatibility.
     * </odoc> */
    @JSConstructor public void newIgnite(boolean shouldLog) {
        configuration = (Scriptable) AFCmdBase.jse.newObject(AFCmdBase.jse.getGlobalscope());
    }

    private Object option(String key) {
        if (configuration == null) newIgnite(false);
        Object v = configuration.get(key, configuration);
        return v == Scriptable.NOT_FOUND || v instanceof Undefined ? null : v;
    }
    private String text(String key, String fallback) {
        Object v = option(key); return v == null ? fallback : Context.toString(v);
    }
    private boolean flag(String key, boolean fallback) {
        Object v = option(key); return v == null ? fallback : Context.toBoolean(v);
    }
    private long number(String key, long fallback) {
        Object v = option(key); return v == null ? fallback : (long) Context.toNumber(v);
    }
    private String[] strings(String key, String[] fallback) {
        Object v = option(key);
        if (v == null) return fallback;
        if (v instanceof CharSequence) return new String[] { v.toString() };
        return (String[]) Context.jsToJava(v, String[].class);
    }
    private static boolean supplied(Object value) {
        return value != null && !(value instanceof Undefined);
    }

    /** <odoc><key>Ignite.getConfiguration() : Map</key>
     * Returns the mutable Ignite 3 wrapper options (not an Ignite 2 configuration bean).
     * </odoc> */
    @JSFunction public Object getConfiguration() { option("configFile"); return configuration; }

    /** <odoc><key>Ignite.configure(options) : Ignite</key>
     * Configures configFile, workDir, clusterName, initCluster, metaStorageNodes, addresses,
     * username, password and startupTimeout. Configure before starting the node.
     * </odoc> */
    @JSFunction public Ignite configure(Scriptable options) {
        if (handle != null) throw new IllegalStateException("Configure Ignite before start()");
        option("configFile");
        for (Object id : options.getIds()) {
            String key = String.valueOf(id);
            configuration.put(key, configuration, options.get(key, options));
        }
        return this;
    }

    /** <odoc><key>Ignite.getIgnite() : Ignite</key>
     * Returns the native Ignite 3 API (tables, sql, transactions and compute).
     * </odoc> */
    @JSFunction public Object getIgnite() { return api(); }
    @JSFunction public boolean isStarted() {
        synchronized (nodes) { return handle != null && nodes.get(nodeName) == handle; }
    }
    private org.apache.ignite.Ignite api() {
        synchronized (nodes) {
            if (handle == null || nodes.get(nodeName) != handle)
                throw new IllegalStateException("Ignite is not started or has been stopped");
            return handle.api;
        }
    }

    /** <odoc><key>Ignite.start(aName, secretKey, isClient)</key>
     * Starts or reuses a named embedded Ignite 3 node; isClient=true connects a thin client.
     * Ignite 2 connector secretKey is unsupported: use username/password for clients and
     * Ignite 3 cluster authentication configuration for servers. Existing Ignite 2 work dirs
     * must be migrated separately. With no workDir, a fresh temporary directory is used.
     * </odoc> */
    @JSFunction public void start(Object name, Object secretKey, boolean isClient) throws Exception {
        if (supplied(secretKey)) throw new IllegalArgumentException(
            "Ignite 3 does not support the Ignite 2 connector secretKey; configure client username/password and cluster authentication");
        String selected = supplied(name) ? Context.toString(name) : "default";
        synchronized (nodes) {
            if (handle != null && nodes.get(nodeName) == handle) {
                if (!selected.equals(nodeName)) throw new IllegalStateException("Stop this Ignite instance before changing its name");
                return;
            }
            Handle existing = nodes.get(selected);
            if (existing != null) {
                if (isClient != (existing.client != null)) throw new IllegalStateException("Node name already used by another mode: " + selected);
                handle = existing; nodeName = selected; return;
            }
            Handle next = new Handle();
            Thread thread = Thread.currentThread();
            ClassLoader previousLoader = thread.getContextClassLoader();
            thread.setContextClassLoader(Ignite.class.getClassLoader());
            try {
                if (isClient) {
                    IgniteClient.Builder builder = IgniteClient.builder()
                        .addresses(strings("addresses", new String[] { "127.0.0.1:10800" }))
                        .connectTimeout(number("startupTimeout", 60000));
                    String username = text("username", null), password = text("password", null);
                    if (username != null || password != null) {
                        if (username == null || password == null) throw new IllegalArgumentException("Provide both username and password");
                        builder.authenticator(BasicAuthenticator.builder().username(username).password(AFCmdBase.afc.dIP(password)).build());
                    }
                    next.client = builder.build(); next.api = next.client;
                } else {
                    try {
                        Class.forName("org.rocksdb.FlushJobInfo", false, ClassLoader.getSystemClassLoader());
                    } catch (ClassNotFoundException e) {
                        throw new IllegalStateException("Start OpenAF using plugin-Ignite/ignite.sh (or put the Ignite JARs on the JVM application classpath); runtime-only loading cannot support Ignite 3 native storage callbacks", e);
                    }
                    String work = text("workDir", null);
                    Path workDir = work == null ? Files.createTempDirectory("openaf-ignite3-") : Paths.get(work);
                    Files.createDirectories(workDir);
                    // Do not accidentally reuse or overwrite an Ignite 2 persistence directory.
                    if (Files.exists(workDir.resolve("db")) && !Files.exists(workDir.resolve("openaf-ignite3")))
                        throw new IllegalArgumentException("This looks like an Ignite 2 work directory; migrate its data into a fresh Ignite 3 directory");
                    String config = text("configFile", null);
                    Path configFile;
                    if (config == null) {
                        configFile = workDir.resolve("openaf-ignite3.conf");
                        if (!Files.exists(configFile)) Files.write(configFile, (
                            "ignite { network { port: 3344, nodeFinder.netClusterNodes: [\"localhost:3344\"] }, " +
                            "storage.profiles: [{name: \"default\", engine: \"aipersist\"}] }\n"
                        ).getBytes(StandardCharsets.UTF_8));
                    } else configFile = Paths.get(config);
                    next.server = IgniteServer.builder(selected, configFile, workDir)
                        .serviceLoaderClassLoader(Ignite.class.getClassLoader()).build();
                    next.server.start();
                    if (flag("initCluster", true)) next.server.initCluster(InitParameters.builder()
                        .metaStorageNodeNames(strings("metaStorageNodes", new String[] { selected }))
                        .clusterName(text("clusterName", selected)).build());
                    next.server.waitForInitAsync().get(number("startupTimeout", 60000), TimeUnit.MILLISECONDS);
                    next.api = next.server.api();
                    Files.write(workDir.resolve("openaf-ignite3"), "3.1.0\n".getBytes(StandardCharsets.UTF_8));
                }
                nodes.put(selected, next); handle = next; nodeName = selected;
            } catch (Exception | LinkageError | java.util.ServiceConfigurationError e) {
                try { next.close(); } catch (Exception cleanup) { e.addSuppressed(cleanup); }
                throw e;
            } finally {
                thread.setContextClassLoader(previousLoader);
            }
        }
    }

    /** <odoc><key>Ignite.stop(aName, cancel)</key>
     * Closes the selected wrapper-managed node/client. cancel is retained for compatibility;
     * Ignite 3 shutdown controls cancellation. Omitted aName means this wrapper's node.
     * </odoc> */
    @JSFunction public void stop(Object name, boolean cancel) {
        String selected = supplied(name) ? Context.toString(name) : nodeName;
        synchronized (nodes) {
            Handle old = nodes.get(selected);
            if (old != null) { old.close(); nodes.remove(selected); }
        }
    }
    /** <odoc><key>Ignite.stopAll(cancel)</key>Closes all wrapper-managed nodes/clients.</odoc> */
    @JSFunction public void stopAll(boolean cancel) {
        synchronized (nodes) {
            RuntimeException failure = null;
            for (String name : new ArrayList<>(nodes.keySet())) {
                try { stop(name, cancel); } catch (RuntimeException e) { if (failure == null) failure = e; else failure.addSuppressed(e); }
            }
            if (failure != null) throw failure;
        }
    }

    /** <odoc><key>Ignite.getOrCreateCache(aName) : Object</key>
     * Returns a JSON-string key/value facade backed by an Ignite 3 table. Core channels handle
     * JS serialization. Methods: get, put, putIfAbsent, replace, remove, keys, size, destroy.
     * </odoc> */
    @JSFunction public Cache getOrCreateCache(String name) throws Exception { return new Cache(api(), name); }

    public static class Cache {
        private final org.apache.ignite.Ignite api;
        private final String table;
        private final KeyValueView<String, String> kv;
        public Cache(org.apache.ignite.Ignite api, String name) throws Exception {
            this.api = api;
            StringBuilder id = new StringBuilder("OAF_");
            for (byte b : MessageDigest.getInstance("SHA-256").digest(name.getBytes(StandardCharsets.UTF_8))) id.append(String.format("%02X", b & 255));
            table = id.toString();
            try (ResultSet<SqlRow> ignored = api.sql().execute(null, "CREATE TABLE IF NOT EXISTS " + table + " (K VARCHAR(2147483647) PRIMARY KEY, V VARCHAR(2147483647) NOT NULL)")) { }
            kv = api.tables().table(table).keyValueView(String.class, String.class);
        }
        public String get(String key) { return kv.get(null, key); }
        public void put(String key, String value) { kv.put(null, key, value); }
        public boolean putIfAbsent(String key, String value) { return kv.putIfAbsent(null, key, value); }
        public boolean replace(String key, String oldValue, String newValue) { return kv.replace(null, key, oldValue, newValue); }
        public boolean remove(String key) { return kv.remove(null, key); }
        public String[] keys() {
            ArrayList<String> keys = new ArrayList<>();
            try (ResultSet<SqlRow> rows = api.sql().execute(null, "SELECT K FROM " + table + " ORDER BY K")) {
                while (rows.hasNext()) keys.add(rows.next().stringValue(0));
            }
            return keys.toArray(new String[0]);
        }
        public long size() {
            try (ResultSet<SqlRow> rows = api.sql().execute(null, "SELECT COUNT(*) FROM " + table)) { return rows.next().longValue(0); }
        }
        public void destroy() { try (ResultSet<SqlRow> ignored = api.sql().execute(null, "DROP TABLE IF EXISTS " + table)) { } }
    }

    // String transport preserves JavaScript values without shipping Rhino objects over the wire.
    public static class OpenAFJob implements ComputeJob<String, String> {
        @Override public CompletableFuture<String> executeAsync(JobExecutionContext context, String source) {
            if (AFCmdBase.jse == null || !AFCmdBase.jse.isReady()) throw new IllegalStateException("OpenAF runtime must be initialized on each compute node");
            Object result = openaf.AFBase.eval("(function() {\n" + source + "\n})()");
            if (result instanceof Undefined) return CompletableFuture.completedFuture("U");
            return CompletableFuture.completedFuture("J" + AFCmdBase.jse.stringify(result));
        }
    }
    private static Object decode(String value) {
        if ("U".equals(value)) return Undefined.instance;
        Context cx = (Context) AFCmdBase.jse.enterContext();
        try {
            return NativeJSON.parse(cx, (Scriptable) AFCmdBase.jse.getGlobalscope(), value.substring(1), (c, s, t, a) -> a[1]);
        } finally { AFCmdBase.jse.exitContext(); }
    }
    /** <odoc><key>Ignite.call(aIgnite, source) : Object</key>
     * Executes a raw JavaScript function body on one cluster node. OpenAF and this job class
     * must be available on every eligible compute node. Closures are not transferred.
     * </odoc> */
    @JSFunction public static Object call(Object instance, String source) {
        org.apache.ignite.Ignite api = (org.apache.ignite.Ignite) Context.jsToJava(instance, org.apache.ignite.Ignite.class);
        return decode(api.compute().execute(JobTarget.anyNode(api.cluster().nodes()),
            JobDescriptor.builder(OpenAFJob.class).resultClass(String.class).build(), source));
    }
    /** <odoc><key>Ignite.broadcast(aIgnite, source) : Array</key>
     * Executes a raw JavaScript function body on every node, returning one result per node.
     * </odoc> */
    @JSFunction public static Object broadcast(Object instance, String source) {
        org.apache.ignite.Ignite api = (org.apache.ignite.Ignite) Context.jsToJava(instance, org.apache.ignite.Ignite.class);
        Collection<String> values = api.compute().execute(BroadcastJobTarget.nodes(api.cluster().nodes()),
            JobDescriptor.builder(OpenAFJob.class).resultClass(String.class).build(), source);
        ArrayList<Object> results = new ArrayList<>();
        for (String value : values) results.add(decode(value));
        return AFCmdBase.jse.newArray(AFCmdBase.jse.getGlobalscope(), results.toArray());
    }
}
