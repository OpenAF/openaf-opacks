package openaf.opacks.gpu;

import com.sun.jna.*;
import java.util.HashMap;
import java.util.Map;

/** OpenCL 1.2 subset; cl_ulong is always 64 bit, size_t follows the host ABI. */
public final class OpenCLApi {
    public static final class SizeT extends IntegerType {
        public SizeT() { this(0); }
        public SizeT(long value) { super(Native.SIZE_T_SIZE, value, true); }
    }
    final NativeLibrary library;
    private final Map<String, Function> functions = new HashMap<>();
    OpenCLApi(String name) { library = NativeLibrary.getInstance(name); }
    Function fn(String name) { return functions.computeIfAbsent(name, library::getFunction); }
    int raw(String name, Object... args) { return fn(name).invokeInt(args); }
    void call(String name, Object... args) {
        int rc = raw(name, args);
        if (rc != 0) throw new GPUException(name, "OpenCL status " + rc);
    }
    Pointer pointer(String name, Memory error, Object... args) {
        error.setInt(0, 0);
        Pointer result = fn(name).invokePointer(args);
        if (error.getInt(0) != 0 || result == null) throw new GPUException(name, "OpenCL status " + error.getInt(0));
        return result;
    }
    static SizeT size(long n) { return new SizeT(n); }
}
