package openaf.opacks.gpu;

import com.sun.jna.*;
import java.util.*;

/** Optional macOS bridge. Output staging and commit reuse the OpenCL safety boundary. */
public final class MetalBackend implements AutoCloseable {
    private NativeLibrary library;
    private Pointer device;
    private final String path;
    private boolean closed;
    private OpenCLBackend.Probe probe;
    private final LinkedHashMap<String, Pointer> cache = new LinkedHashMap<>(16, .75f, true);
    public MetalBackend(String path) { this.path = path; }
    private Function fn(String name) { return library.getFunction("gpu_metal_" + name); }
    public synchronized OpenCLBackend.Probe probe() {
        if (probe != null) return probe;
        probe = new OpenCLBackend.Probe();
        try (Memory error = new Memory(4096)) {
            if (closed) throw new GPUException("probe", "closed");
            if (!System.getProperty("os.name").startsWith("Mac") || Native.POINTER_SIZE != 8)
                throw new GPUException("probe", "Metal requires 64-bit macOS");
            library = NativeLibrary.getInstance(path);
            error.clear();
            device = fn("create").invokePointer(new Object[] { error, 4096 });
            if (device == null) throw new GPUException("probe", error.getString(0));
            OpenCLBackend.Device d = new OpenCLBackend.Device();
            fn("name").invokeVoid(new Object[] { device, error, 4096 });
            d.id = "metal:0"; d.name = error.getString(0); d.vendor = "Apple";
            d.version = "Metal"; d.driver = System.getProperty("os.version");
            d.littleEndian = true; d.maxAllocation = fn("max_allocation").invokeLong(new Object[] { device });
            probe.devices.add(d); probe.available = true; probe.reason = "gpu-discovered";
        } catch (LinkageError | RuntimeException e) { probe.reason = e.toString(); }
        return probe;
    }
    public synchronized OpenCLBackend.Execution execute(TypedArrayAccess.Guard g, String source, String key, String id) {
        OpenCLBackend.Execution r = new OpenCLBackend.Execution();
        long start = System.nanoTime();
        List<Memory> owned = new ArrayList<>();
        try (Memory error = new Memory(4096)) {
            if (closed || !probe().available || !id.equals("metal:0")) throw new GPUException("probe", "Metal device unavailable");
            if (!g.eligible || g.length <= 0) throw new GPUException("prepare", "Invalid workload");
            if (java.nio.ByteOrder.nativeOrder() != java.nio.ByteOrder.LITTLE_ENDIAN) throw new GPUException("prepare", "Unsupported host byte order");
            int count = g.arrays.length, arrays = 0;
            for (Object a : g.arrays) if (a != null) arrays++;
            long bytes = 4L * g.length;
            if (count > 31 || bytes * arrays > 64L * 1024 * 1024 || bytes > probe.devices.get(0).maxAllocation) throw new GPUException("allocate", "Metal call buffer limit exceeded");
            r.stage = "compile";
            Pointer kernel = cache.get(key); r.cacheHit = kernel != null;
            if (kernel == null) {
                long t = System.nanoTime(); error.clear();
                kernel = fn("compile").invokePointer(new Object[] { device, source, error, 4096 });
                r.compileMs = ms(t);
                if (kernel == null) throw new GPUException("compile", error.getString(0));
                cache.put(key, kernel);
                if (cache.size() > 32) { String oldest = cache.keySet().iterator().next(); release(cache.remove(oldest)); }
            }
            r.compiled = true; r.stage = "marshal";
            long t = System.nanoTime();
            Memory pointers = new Memory(8L * count), flags = new Memory(4L * count);
            owned.add(pointers); owned.add(flags);
            Memory output = null;
            for (int i = 0; i < count; i++) {
                Memory value = new Memory(g.arrays[i] != null ? bytes : 4); owned.add(value);
                pointers.setPointer(8L * i, value); flags.setInt(4L * i, g.arrays[i] != null ? 1 : 0);
                if (i == g.output) output = value;
                else if (g.arrays[i] != null) { value.write(0, TypedArrayAccess.read(g, i), 0, g.length); r.transferBytes += bytes; }
                else if (g.type.equals("float32")) value.setFloat(0, g.scalars[i].floatValue());
                else value.setInt(0, (int)g.scalars[i].longValue());
            }
            r.marshalMs = ms(t); r.stage = "execute"; t = System.nanoTime(); error.clear();
            int rc = fn("execute").invokeInt(new Object[] { device, kernel, pointers, flags, count, g.output, g.length, error, 4096 });
            r.transferKernelReadMs = ms(t);
            if (rc != 0) throw new GPUException("execute", error.getString(0));
            r.transferBytes += bytes; r.stage = "stage-output";
            int[] bits = output.getIntArray(0, g.length);
            byte[] staged = TypedArrayAccess.stage(g, bits);
            r.stage = "commit"; t = System.nanoTime(); r.commitStarted = true;
            TypedArrayAccess.commit(g, staged); r.commitMs = ms(t);
            r.success = true; r.stage = "completed";
        } catch (LinkageError | RuntimeException e) {
            if (e instanceof GPUException) r.stage = ((GPUException)e).stage;
            r.message = e.toString();
        } finally { for (Memory m : owned) m.close(); r.totalMs = ms(start); }
        return r;
    }
    private static double ms(long start) { return (System.nanoTime() - start) / 1e6; }
    private void release(Pointer p) { if (p != null) fn("release").invokeVoid(new Object[] { p }); }
    public synchronized void clearCache() { for (Pointer p : cache.values()) release(p); cache.clear(); }
    public synchronized int cacheEntries() { return cache.size(); }
    public long bufferBytes() { return 0; }
    public synchronized void close() {
        if (closed) return;
        clearCache(); release(device); device = null; closed = true;
        if (probe != null) { probe.available = false; probe.reason = "closed"; }
    }
}
