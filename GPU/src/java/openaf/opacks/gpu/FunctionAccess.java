package openaf.opacks.gpu;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.JSFunction;

public final class FunctionAccess {
    private FunctionAccess() { }

    public static boolean isPlainArray(Object value) {
        return value != null && value.getClass() == org.mozilla.javascript.NativeArray.class;
    }

    public static String source(Object value) {
        // Bound functions, proxies and user-defined toString hooks are never evaluated.
        if (value == null || value.getClass() != JSFunction.class) return "";
        return Context.getCurrentContext().decompileFunction((JSFunction) value, 0);
    }
}
