// Author: Nuno Aguiar

ow.loadFormat();
var RobotWin32 = function() {
    if (!ow.format.isWindows()) throw "The functionality only works on a compatible Windows OS.";
    this.__u32 = Packages.com.sun.jna.Native.loadLibrary("user32", Packages.com.sun.jna.platform.win32.User32, com.sun.jna.win32.W32APIOptions.DEFAULT_OPTIONS);
    this.__g32 = Packages.com.sun.jna.Native.loadLibrary("gdi32", Packages.com.sun.jna.platform.win32.GDI32, com.sun.jna.win32.W32APIOptions.DEFAULT_OPTIONS);
};

RobotWin32.prototype.findWindowByTitle = function(aTitle) {
    return this.__u32.FindWindow(null, aTitle);
};

RobotWin32.prototype.getWindowDPI = function(aWindow) {
    // 88 (LOGPIXELSX) - https://gist.github.com/mayuki/1656292
    return this.__g32.GetDeviceCaps(this.__u32.GetDC(aWindow), 88);
};

RobotWin32.prototype.getWindowCoordinates = function(aWindow) {
    var rect = Packages.com.sun.jna.platform.win32.WinDef.RECT();
    this.__u32.GetWindowRect(aWindow, rect);
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
};

RobotWin32.prototype.listWindows = function() {
    var ar = [], parent = this;
    this.__u32.EnumWindows({
        callback: function(h, a) {
            var s = parent.__u32.GetWindowTextLength(h);
            var buf = newJavaArray(java.lang.Character.TYPE, s+1);
            parent.__u32.GetWindowText(h, buf, s+1);
            var name = String(new java.lang.String(buf)).replace(/\0+/, "");
            if (name.length > 0 && ar.indexOf(name) < 0) ar.push(name);

            return true;
        }
    }, null);

    return ar.sort();
};

// https://java-native-access.github.io/jna/4.2.0/com/sun/jna/platform/win32/User32.html