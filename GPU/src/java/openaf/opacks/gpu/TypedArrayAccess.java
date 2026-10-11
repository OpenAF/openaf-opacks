package openaf.opacks.gpu;

import java.lang.reflect.Field;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import org.mozilla.javascript.*;
import org.mozilla.javascript.typedarrays.*;

/** Inspects native objects without running caller-controlled getters. */
public final class TypedArrayAccess {
    private final Scriptable scope;
    private final Function descriptor;
    private final Field lambdaTarget;
    private final Class<?> lengthTargetClass;

    private static final class StorageOrder extends NativeArrayBufferView {
        @Override public String getClassName() { return "GPUStorageOrder"; }
        static ByteOrder order() { return useLittleEndian() ? ByteOrder.LITTLE_ENDIAN : ByteOrder.BIG_ENDIAN; }
    }

    public static final class Guard {
        public boolean eligible;
        public String reason = "";
        public String type = "";
        public int length;
        public int output;
        final NativeTypedArrayView<?>[] arrays;
        final Number[] scalars;
        final ByteOrder order;
        Guard(int count) {
            arrays = new NativeTypedArrayView<?>[count];
            scalars = new Number[count];
            order = StorageOrder.order();
        }
        Guard reject(String value) { eligible = false; reason = value; return this; }
    }

    public TypedArrayAccess() throws ReflectiveOperationException {
        Context cx = Context.getCurrentContext();
        scope = cx.initStandardObjects();
        Scriptable object = (Scriptable) ScriptableObject.getProperty(scope, "Object");
        descriptor = (Function) ScriptableObject.getProperty(object, "getOwnPropertyDescriptor");
        lambdaTarget = LambdaFunction.class.getDeclaredField("target");
        lambdaTarget.setAccessible(true);
        Scriptable sample = cx.newObject(scope, "Int32Array", new Object[] { 0 });
        Object getter = lengthGetter(sample);
        lengthTargetClass = lambdaTarget.get(getter).getClass();
    }

    private Scriptable ownDescriptor(Scriptable object, String key) {
        Object result = descriptor.call(Context.getCurrentContext(), scope, scope, new Object[] { object, key });
        return result instanceof Scriptable ? (Scriptable) result : null;
    }

    private Object lengthGetter(Scriptable object) {
        int depth = 0;
        for (Scriptable p = object; p != null && depth++ < 16; p = p.getPrototype()) {
            // Foreign/custom prototypes can override internal methods as well as getters.
            if (!(p instanceof ScriptableObject) || p.getClass().getName().contains("Proxy")) return null;
            Scriptable d = ownDescriptor(p, "length");
            if (d != null) return ScriptableObject.getProperty(d, "get");
        }
        return null;
    }

    private boolean canonicalLength(NativeTypedArrayView<?> array) throws IllegalAccessException {
        if (ownDescriptor(array, "length") != null) return false;
        Object getter = lengthGetter(array);
        return getter != null && getter.getClass() == LambdaFunction.class
            && ((LambdaFunction) getter).getFunctionName().equals("get length")
            && lambdaTarget.get(getter).getClass() == lengthTargetClass;
    }

    public Guard validate(Scriptable args, int[] arrayIndices, int[] scalarIndices,
                          int parameterCount, int bound, int output, String mode) {
        Guard g = new Guard(parameterCount);
        g.output = output;
        try {
            for (int index : arrayIndices) {
                Object value = args.get(index, args);
                String type;
                if (value != null && value.getClass() == NativeInt32Array.class) type = "int32";
                else if (value != null && value.getClass() == NativeUint32Array.class) type = "uint32";
                else if (value != null && value.getClass() == NativeFloat32Array.class) type = "float32";
                else return g.reject("unsupported-array-type");
                if (g.type.isEmpty()) g.type = type;
                if (!g.type.equals(type)) return g.reject("mixed-array-types");
                NativeTypedArrayView<?> a = (NativeTypedArrayView<?>) value;
                if (a.getBuffer().isDetached() || a.isTypedArrayOutOfBounds()) return g.reject("invalid-array-storage");
                if (!canonicalLength(a)) return g.reject("custom-array-length");
                g.arrays[index] = a;
            }
            if (g.type.equals("float32") && !mode.equals("fast")) return g.reject("strict-float-arithmetic-unsupported");
            if (!g.type.equals("float32") && mode.equals("fast")) return g.reject("fast-mode-requires-float32");
            g.length = g.arrays[bound].getArrayLength();
            for (NativeTypedArrayView<?> a : g.arrays) {
                if (a != null && a.getArrayLength() < g.length) return g.reject("insufficient-array-length");
            }
            NativeTypedArrayView<?> out = g.arrays[output];
            for (int index : arrayIndices) {
                NativeTypedArrayView<?> in = g.arrays[index];
                if (index != output && in.getBuffer() == out.getBuffer()
                    && (long) in.getByteOffset() < (long) out.getByteOffset() + 4L * g.length
                    && (long) out.getByteOffset() < (long) in.getByteOffset() + 4L * g.length) {
                    return g.reject("output-input-alias");
                }
            }
            for (int index : scalarIndices) {
                Object value = args.get(index, args);
                if (!(value instanceof Number)) return g.reject("non-numeric-scalar");
                double v = ((Number) value).doubleValue();
                if (!Double.isFinite(v)) return g.reject("nonfinite-scalar");
                if (!g.type.equals("float32") && (v != Math.rint(v) || v < -2147483648.0 || v > 4294967295.0)) {
                    return g.reject("scalar-outside-int32-bits");
                }
                g.scalars[index] = (Number) value;
            }
            g.eligible = true;
            g.reason = "validated-elementwise-call";
            return g;
        } catch (ReflectiveOperationException | RuntimeException e) {
            return g.reject("array-inspection-failed: " + e.getClass().getSimpleName());
        }
    }

    static int[] read(Guard g, int index) {
        NativeTypedArrayView<?> a = g.arrays[index];
        int[] bits = new int[g.length];
        ByteBuffer.wrap(a.getBuffer().getBuffer(), a.getByteOffset(), g.length * 4)
            .order(g.order).asIntBuffer().get(bits);
        return bits;
    }

    static byte[] stage(Guard g, int[] bits) {
        byte[] bytes = new byte[g.length * 4];
        ByteBuffer.wrap(bytes).order(g.order).asIntBuffer().put(bits);
        return bytes;
    }

    static void commit(Guard g, byte[] bytes) {
        NativeTypedArrayView<?> out = g.arrays[g.output];
        if (out.getBuffer().isDetached() || out.isTypedArrayOutOfBounds()) {
            throw new GPUException("commit", "Output storage changed before commit");
        }
        System.arraycopy(bytes, 0, out.getBuffer().getBuffer(), out.getByteOffset(), bytes.length);
    }
}
