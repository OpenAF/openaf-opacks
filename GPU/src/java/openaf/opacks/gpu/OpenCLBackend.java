package openaf.opacks.gpu;

import com.sun.jna.Memory;
import com.sun.jna.Native;
import com.sun.jna.Pointer;
import java.util.*;

/** Serialized OpenCL ownership. All expected native errors cross into JS as result data. */
public final class OpenCLBackend implements AutoCloseable {
    private static final long BUFFER_LIMIT = 64L * 1024 * 1024;
    private static final int CACHE_LIMIT = 32;
    public static final class Device {
        public String id, name, vendor, version, driver;
        public boolean littleEndian, fp64;
        public long maxAllocation;
        Pointer pointer;
    }
    public static final class Probe {
        public boolean available;
        public String reason = "not-probed";
        public final List<Device> devices = new ArrayList<>();
    }
    public static final class Execution {
        public boolean success, compiled, cacheHit, commitStarted;
        public String stage = "prepare", message = "";
        public double compileMs, marshalMs, transferKernelReadMs, commitMs, totalMs;
        public long transferBytes;
    }
    private static final class Kernel {
        Pointer program, kernel;
        Pointer[] buffers;
        Memory[] host;
        int capacity;
    }

    private final String libraryName;
    private OpenCLApi api;
    private Probe probe;
    private Device selected;
    private Pointer context, queue;
    private boolean closed;
    private long pooledBytes;
    private final LinkedHashMap<String, Kernel> cache = new LinkedHashMap<>(16, .75f, true);

    public OpenCLBackend() { this(null); }
    /** Alternate path is for isolated native-loading tests, not an installation mechanism. */
    public OpenCLBackend(String libraryName) { this.libraryName = libraryName; }

    public synchronized Probe probe() {
        if (probe != null) return probe;
        probe = new Probe();
        if (closed) { probe.reason = "closed"; return probe; }
        try {
            if (Native.POINTER_SIZE != 8) throw new GPUException("probe", "Only 64-bit hosts are supported");
            String os = System.getProperty("os.name").toLowerCase(Locale.ROOT);
            String name = libraryName != null ? libraryName : os.contains("mac")
                ? "/System/Library/Frameworks/OpenCL.framework/OpenCL" : "OpenCL";
            api = new OpenCLApi(name);
            try (Memory count = new Memory(4)) {
                int rc = api.raw("clGetPlatformIDs", 0, null, count);
                if (rc == -1001) { probe.reason = "no-opencl-platform"; return probe; }
                if (rc != 0) throw new GPUException("probe", "clGetPlatformIDs: " + rc);
                int platforms = count.getInt(0);
                if (platforms < 0 || platforms > 1024) throw new GPUException("probe", "Invalid platform count");
                if (platforms == 0) { probe.reason = "no-opencl-platform"; return probe; }
                try (Memory ps = new Memory(platforms * 8L)) {
                    api.call("clGetPlatformIDs", platforms, ps, null);
                    for (int p = 0; p < platforms; p++) {
                        Pointer platform = ps.getPointer(p * 8L);
                        // Query with room for one device, then request the full bounded list.
                        // This also handles runtimes that reject the count-only query form.
                        try (Memory first = new Memory(8)) {
                            count.clear();
                            int dr = api.raw("clGetDeviceIDs", platform, 4L, 1, first, count);
                            if (dr == -1) continue; // CL_DEVICE_NOT_FOUND is normal.
                            if (dr != 0) throw new GPUException("probe", "clGetDeviceIDs: " + dr);
                            int devices = count.getInt(0);
                            if (devices <= 0 || devices > 1024) continue;
                            try (Memory ds = new Memory(devices * 8L)) {
                                if (devices == 1) ds.setPointer(0, first.getPointer(0));
                                else api.call("clGetDeviceIDs", platform, 4L, devices, ds, null);
                                for (int d = 0; d < devices; d++) {
                                    Device item = new Device();
                                    item.pointer = ds.getPointer(d * 8L);
                                    if (number(item.pointer, 0x1000, true) != 4L) continue;
                                    if (number(item.pointer, 0x1027, false) == 0 || number(item.pointer, 0x1028, false) == 0) continue;
                                    item.id = "opencl:" + p + ":" + d;
                                    item.name = string(item.pointer, 0x102b);
                                    item.vendor = string(item.pointer, 0x102c);
                                    item.driver = string(item.pointer, 0x102d);
                                    item.version = string(item.pointer, 0x102f);
                                    item.littleEndian = number(item.pointer, 0x1026, false) != 0;
                                    item.maxAllocation = number(item.pointer, 0x1010, true);
                                    // Older implementations may reject this optional query.
                                    try { item.fp64 = number(item.pointer, 0x1032, true) != 0; }
                                    catch (GPUException e) { item.fp64 = false; }
                                    probe.devices.add(item);
                                }
                            }
                        }
                    }
                }
            }
            probe.available = !probe.devices.isEmpty();
            probe.reason = probe.available ? "gpu-discovered" : "no-compatible-gpu";
        } catch (LinkageError | RuntimeException e) {
            probe.available = false;
            probe.devices.clear();
            probe.reason = e.getClass().getSimpleName() + ": " + e.getMessage();
        }
        return probe;
    }

    private String string(Pointer d, int field) {
        try (Memory size = new Memory(Native.SIZE_T_SIZE)) {
            api.call("clGetDeviceInfo", d, field, OpenCLApi.size(0), null, size);
            long length = size.getLong(0);
            if (length <= 0 || length > 1024 * 1024) throw new GPUException("probe", "Invalid device info size");
            try (Memory value = new Memory(length)) {
                api.call("clGetDeviceInfo", d, field, OpenCLApi.size(length), value, null);
                return value.getString(0);
            }
        }
    }
    private long number(Pointer d, int field, boolean wide) {
        try (Memory value = new Memory(8)) {
            api.call("clGetDeviceInfo", d, field, OpenCLApi.size(wide ? 8 : 4), value, null);
            return wide ? value.getLong(0) : Integer.toUnsignedLong(value.getInt(0));
        }
    }

    private void select(String deviceId) {
        Probe p = probe();
        if (!p.available || closed) throw new GPUException("probe", p.reason);
        Device wanted = null;
        for (Device d : p.devices) if (deviceId.isEmpty() || d.id.equals(deviceId)) { wanted = d; break; }
        if (wanted == null) throw new GPUException("select", "Requested GPU device is unavailable");
        if (selected == wanted && context != null) return;
        reset();
        try (Memory error = new Memory(4); Memory device = new Memory(8)) {
            device.setPointer(0, wanted.pointer);
            context = api.pointer("clCreateContext", error, null, 1, device, null, null, error);
            queue = api.pointer("clCreateCommandQueue", error, context, wanted.pointer, 0L, error);
            selected = wanted;
        }
    }

    private Kernel compile(String source) {
        Kernel k = new Kernel();
        try (Memory error = new Memory(4);
             Memory text = new Memory(source.length() + 1L); Memory strings = new Memory(8)) {
            text.setString(0, source, "UTF-8");
            strings.setPointer(0, text);
            k.program = api.pointer("clCreateProgramWithSource", error, context, 1, strings, null, error);
            int rc = api.raw("clBuildProgram", k.program, 0, null, "-cl-std=CL1.2", null, null);
            if (rc != 0) {
                try (Memory log = new Memory(16384)) {
                    int lr = api.raw("clGetProgramBuildInfo", k.program, selected.pointer, 0x1183, OpenCLApi.size(log.size()), log, null);
                    throw new GPUException("compile", "OpenCL status " + rc + (lr == 0 ? ": " + log.getString(0) : ""));
                }
            }
            k.kernel = api.pointer("clCreateKernel", error, k.program, "calculate", error);
            return k;
        } catch (LinkageError | RuntimeException e) {
            release(k);
            throw e;
        }
    }

    private void buffers(Kernel k, TypedArrayAccess.Guard g) {
        long bytes = 4L * g.length;
        int arrays = 0;
        for (Object a : g.arrays) if (a != null) arrays++;
        long required = bytes * arrays;
        if (bytes > selected.maxAllocation || required > BUFFER_LIMIT) throw new GPUException("allocate", "GPU buffer limit exceeded");
        if (k.capacity >= g.length) return;
        releaseBuffers(k);
        // Evict other kernels until the entire device/host pool fits its bound.
        Iterator<Map.Entry<String, Kernel>> it = cache.entrySet().iterator();
        while (pooledBytes + required > BUFFER_LIMIT && it.hasNext()) {
            Kernel old = it.next().getValue();
            if (old == k) continue;
            it.remove(); release(old);
        }
        k.buffers = new Pointer[g.arrays.length];
        k.host = new Memory[g.arrays.length];
        k.capacity = g.length;
        try (Memory error = new Memory(4)) {
            for (int i = 0; i < g.arrays.length; i++) if (g.arrays[i] != null) {
                k.host[i] = new Memory(bytes);
                k.buffers[i] = api.pointer("clCreateBuffer", error, context, i == g.output ? 2L : 4L,
                    OpenCLApi.size(bytes), null, error);
                pooledBytes += bytes;
            }
        }
    }

    public synchronized Execution execute(TypedArrayAccess.Guard g, String source, String key, String deviceId) {
        Execution result = new Execution();
        long start = System.nanoTime();
        Kernel k = null;
        String cacheKey = deviceId + ":" + key;
        try {
            if (!g.eligible || g.length <= 0) throw new GPUException("prepare", "Call is not eligible");
            select(deviceId);
            // Native Memory uses host byte order. A differing device requires an additional bridge.
            if (selected.littleEndian != (java.nio.ByteOrder.nativeOrder() == java.nio.ByteOrder.LITTLE_ENDIAN)) {
                throw new GPUException("prepare", "Host/device byte orders differ");
            }
            k = cache.get(cacheKey);
            result.cacheHit = k != null;
            if (k == null) {
                result.stage = "compile";
                long t = System.nanoTime();
                k = compile(source);
                result.compileMs = ms(t);
                cache.put(cacheKey, k);
                while (cache.size() > CACHE_LIMIT) {
                    String oldest = cache.keySet().iterator().next();
                    release(cache.remove(oldest));
                }
            }
            result.compiled = true;
            result.stage = "allocate";
            buffers(k, g);
            long bytes = g.length * 4L;
            result.stage = "marshal";
            long t = System.nanoTime();
            for (int i = 0; i < g.arrays.length; i++) if (g.arrays[i] != null && i != g.output) {
                k.host[i].write(0, TypedArrayAccess.read(g, i), 0, g.length);
            }
            result.marshalMs = ms(t);
            result.stage = "execute";
            t = System.nanoTime();
            try (Memory arg = new Memory(8); Memory global = new Memory(8)) {
                for (int i = 0; i < g.arrays.length; i++) {
                    if (g.arrays[i] != null) {
                        arg.setPointer(0, k.buffers[i]);
                        api.call("clSetKernelArg", k.kernel, i, OpenCLApi.size(8), arg);
                        if (i != g.output) {
                            api.call("clEnqueueWriteBuffer", queue, k.buffers[i], 1, OpenCLApi.size(0), OpenCLApi.size(bytes), k.host[i], 0, null, null);
                            result.transferBytes += bytes;
                        }
                    } else {
                        if (g.type.equals("float32")) arg.setFloat(0, g.scalars[i].floatValue());
                        else arg.setInt(0, (int) g.scalars[i].longValue());
                        api.call("clSetKernelArg", k.kernel, i, OpenCLApi.size(4), arg);
                    }
                }
                global.setLong(0, g.length);
                api.call("clEnqueueNDRangeKernel", queue, k.kernel, 1, null, global, null, 0, null, null);
                api.call("clEnqueueReadBuffer", queue, k.buffers[g.output], 1, OpenCLApi.size(0), OpenCLApi.size(bytes), k.host[g.output], 0, null, null);
                result.transferBytes += bytes;
            }
            result.transferKernelReadMs = ms(t);
            result.stage = "stage-output";
            int[] bits = new int[g.length];
            k.host[g.output].read(0, bits, 0, g.length);
            byte[] staged = TypedArrayAccess.stage(g, bits);
            result.stage = "commit";
            t = System.nanoTime();
            result.commitStarted = true;
            TypedArrayAccess.commit(g, staged);
            result.commitMs = ms(t);
            result.success = true;
            result.stage = "completed";
        } catch (LinkageError | RuntimeException e) {
            if (e instanceof GPUException) result.stage = ((GPUException) e).stage;
            result.message = e.getClass().getSimpleName() + ": " + e.getMessage();
            // Drain outstanding commands before releasing any host/device storage.
            if (queue != null) quiet("clFinish", queue);
            if (cache.remove(cacheKey) != null && k != null) release(k);
        } finally {
            result.totalMs = ms(start);
        }
        return result;
    }

    private static double ms(long since) { return (System.nanoTime() - since) / 1e6; }
    private void quiet(String function, Object... args) {
        try { api.raw(function, args); } catch (LinkageError | RuntimeException ignored) { }
    }
    private void releaseBuffers(Kernel k) {
        if (k.buffers == null) return;
        for (int i = 0; i < k.buffers.length; i++) {
            if (k.buffers[i] != null) { quiet("clReleaseMemObject", k.buffers[i]); pooledBytes -= 4L * k.capacity; }
            if (k.host[i] != null) k.host[i].close();
        }
        k.buffers = null; k.host = null; k.capacity = 0;
    }
    private void release(Kernel k) {
        releaseBuffers(k);
        if (k.kernel != null) quiet("clReleaseKernel", k.kernel);
        if (k.program != null) quiet("clReleaseProgram", k.program);
    }
    public synchronized void clearCache() {
        if (queue != null) quiet("clFinish", queue);
        for (Kernel k : cache.values()) release(k);
        cache.clear();
    }
    private void reset() {
        clearCache();
        if (queue != null) quiet("clReleaseCommandQueue", queue);
        if (context != null) quiet("clReleaseContext", context);
        queue = null; context = null; selected = null;
    }
    public synchronized int cacheEntries() { return cache.size(); }
    public synchronized long bufferBytes() { return pooledBytes; }
    @Override public synchronized void close() {
        reset(); closed = true;
        if (probe != null) { probe.available = false; probe.reason = "closed"; }
        // NativeLibrary is shared with other JNA clients; do not close/unload it here.
    }
}
