// Author: Nuno Aguiar

ow.loadFormat();
ow.loadObj();

/**
 * <odoc>
 * <key>Robot.Robot(autoDelay, keyMap)</key>
 * Creates a robot instance with a specific autoDelay (defaults to 40) and a custom keyMap.
 * </odoc>
 */
var Robot = function(autoDelay, keyMap) {
    this.path = getOPackPath("Robot") || ".";
    this.autoDelay = _$(autoDelay).isNumber().default(40);
    if (isUnDef(keyMap)) 
       keyMap = _$(keyMap).default(this.path + "/vks/" + String(java.awt.im.InputContext.getInstance().getLocale()) + ".json");

    this.robot = new java.awt.Robot();
    //this.robot.setAutoDelay(autoDelay);
    this.robot.setAutoWaitForIdle(true);
    this.repeat = false;
    this.repeatActions = [];

    this.loadKeyMap(keyMap);
};

Robot.prototype.__convert2Array = function(aa, fnName) {
    var ar = [];

    if (isDef(fnName) && !fnName.startsWith("Robot.")) fnName = "Robot." + fnName;
    if (isMap(aa) && isUnDef(fnName)) aa = ow.obj.fromObj2Array(aa);
    if (isMap(aa) && isDef(fnName)) aa = $m2a($fnDef4Help(fnName), aa);

    for(var ii in aa) {
        ar.push(aa[ii]);
    }
    return ar;
};

Robot.prototype.__convert2Map = function(aa, fnName) {
    _$(fnName).$_("Please provide a function.");

    var ar = [];
    for(var ii in aa) {
        ar.push(aa[ii]);
    }
    var oo = $a2m($fnDef4Help(fnName), ar);
    for(var ii in oo) {
        if (isUnDef(oo[ii])) delete oo[ii];
    }
    return oo;
};

/**
 * <odoc>
 * <key>Robot.loadKeyMap(aKeyMapFile) : Robot</key>
 * Loads a custom character to virtual key combinations array stored on aKeyMapFile JSON file.
 * </odoc>
 */
Robot.prototype.loadKeyMap = function(aKeyMap) {
    if (!(io.fileExists(aKeyMap)) && io.fileExists(this.path + "/vks/" + aKeyMap)) aKeyMap = this.path + "/vks/" + aKeyMap;

    this.keyMap = io.readFile(aKeyMap);
    return this;
};

// --- GROUPING FUNCTIONS ---------------------------

/** 
 * <odoc>
 * <key>Robot.begin() : Robot</key>
 * Starts recording a group of actions.
 * </odoc>
 */
Robot.prototype.begin = function() {
    this.repeat = true;
    return this;
};

/**
 * <odoc>
 * <key>Robot.end() : Array</key>
 * Ends the recording of a group of actions started by .begin.
 * </odoc>
 */
Robot.prototype.end = function() {
    this.repeat = false;
    var o = clone(this.repeatActions);
    this.repeatActions = [];
    return o;
};

/**
 * <odoc>
 * <key>Robot.play(actions) : Robot</key>
 * Given actions (an array of actions), pre-recorded with begin/end*, executes them sequentially.
 * </odoc>
 */
Robot.prototype.play = function(actions) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "play",
            in: this.__convert2Map(Object(arguments), "Robot.play")
        });
    } else {
        var parent = this;
        try {
            actions.forEach((v) => {
                parent[v.fn].apply(parent, parent.__convert2Array(v.in, v.fn));
            });
        } catch(e) {
            sprintErr(e);
        }
    }
    return this;
};

/**
 * <odoc>
 * <key>Robot.loadPlay(actions) : Robot</key>
 * Given actions (an array), pre-recorded with begin/end*, loads to the current group of actions.
 * </odoc>
 */
Robot.prototype.loadPlay = function(actions) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "loadPlay",
            in: this.__convert2Map(Object(arguments), "Robot.loadPlay")
        });
    } else {
        var parent = this;
        this.repeatActions = this.repeatActions.concat(actions);
    }
    return this;
};

/**
 * <odoc>
 * <key>Robot.loadPlayFile(file) : Robot</key>
 * Given an array of actions stored on a yaml or json file, pre-recorded with begin/end*, loads to the current group of actions.
 * </odoc>
 */
Robot.prototype.loadPlayFile = function(file) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "loadPlayFile",
            in: this.__convert2Map(Object(arguments), "Robot.loadPlayFile")
        });
    } else {
        if (!(io.fileExists(file)) && io.fileExists(this.path + "/" + file)) file = this.path + "/" + file;

        var m = (file.endsWith(".yaml") ? io.readFileYAML(file) : io.readFile(file));
        if (isDef(m) && isDef(m.actions))
            return this.loadPlay(m.actions);
        else
            throw "No actions map found on '" + file + "'";
    }
    return this;
};

/**
 * <odoc>
 * <key>Robot.playFile(file) : Robot</key>
 * Given an array of actions stored on a yaml or json file, pre-recorded with begin/end*, executes them sequentially.
 * </odoc>
 */
Robot.prototype.playFile = function(file) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "playFile",
            in: this.__convert2Map(Object(arguments), "Robot.playFile")
        });
    } else {
        if (!(io.fileExists(file)) && io.fileExists(this.path + "/" + file)) file = this.path + "/" + file;

        var m = (file.endsWith(".yaml") ? io.readFileYAML(file) : io.readFile(file));
        if (isDef(m) && isDef(m.actions))
            return this.play(m.actions);
        else
            throw "No actions map found on '" + file + "'";
    }
    return this;
};

/**
 * <odoc>
 * <key>Robot.endToFile(file) : Robot</key>
 * Ends the recording of a group of actions and stores them in a yaml file.
 * </odoc>
 */
Robot.prototype.endToFile = function(file) {
    this.repeat = false;
    io.writeFileYAML(file, { actions: this.repeatActions });
    this.repeatActions = [];
    return this;
};

/**
 * <odoc>
 * <key>Robot.endAndPlay() : Robot</key>
 * Ends the recording of a group of actions and executes them sequentially.
 * </odoc>
 */
Robot.prototype.endAndPlay = function() {
    this.repeat = false;
    this.play(this.repeatActions);
    this.repeatActions = [];
    return this;
};

/**
 * <odoc>
 * <key>Robot.endRepeat(aWaitTime, aLimit) : Robot</key>
 * Ends the recording of a group of actions and repeats them with intervals of aWaitTime in ms and limits executions
 * to aLimit (negative is infinite).
 * </odoc>
 */
Robot.prototype.endRepeat = function(aWaitTime, aLimit) {
    this.repeat = false;
    var parent = this, c = 0;

    do {
        try {
            this.repeatActions.forEach((v) => {
                parent[v.fn].apply(parent, parent.__convert2Array(v.in, v.fn));
            });
        } catch(e) {
            sprintErr(e);
        }
        c++;
        sleep(aWaitTime, true);
    } while(c < aLimit || aLimit < 0);

    this.repeatActions = [];
    return this;
};

/**
 * <odoc>
 * <key>Robot.wait(time) : Robot</key>
 * Action to wait for a specific time amount of time (in ms). 
 * </odoc>
 */
Robot.prototype.wait = function(time) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "wait",
            in: this.__convert2Map(Object(arguments), "Robot.wait")
        });
    } else {
        sleep(time, true);  
    }
    return this;
};

// --- MOUSE FUNCTIONS ---------------------------

/**
 * <odoc>
 * <key>Robot.mouseMove(x, y, scale, noDelay) : Robot</key>
 * Action to move mouse to coordinates x and y. If noDelay = true the default autoDelay won't be used.
 * </odoc>
 */
Robot.prototype.mouseMove = function(x, y, dpi, noDelay) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "mouseMove",
            in: this.__convert2Map(Object(arguments), "Robot.mouseMove")
        });
    } else {
        if (isArray(x)) { x = x[0]; }
        if (isMap(x)) {
            y = x.y;
            x = x.x;
        }
        dpi = _$(dpi).isNumber().default(96);
        var scale = (dpi / 96) * 100;
        this.robot.mouseMove(Math.floor((x*96)/(scale/25*24)), Math.floor((y*96)/(scale/25*24)));
        if (!noDelay) sleep(this.autoDelay, true);
    }
    return this;
};

/**
 * <odoc>
 * <key>Robot.mouseClick(noDelay) : Robot</key>
 * Action perform a mouse left-click. If noDelay = true the default autoDelay won't be used.
 * </odoc>
 */
Robot.prototype.mouseClick = function(noDelay) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "mouseClick",
            in: this.__convert2Map(Object(arguments), "Robot.mouseClick")
        });
    } else {
        this.robot.mousePress(java.awt.event.InputEvent.BUTTON1_MASK); 
        this.robot.mouseRelease(java.awt.event.InputEvent.BUTTON1_MASK);
        if (!noDelay) sleep(this.autoDelay, true);
    }
    return this;
};

/**
 * <odoc>
 * <key>Robot.mouseRightClick(noDelay) : Robot</key>
 * Action perform a mouse right-click. If noDelay = true the default autoDelay won't be used.
 * </odoc>
 */
Robot.prototype.mouseRightClick = function(noDelay) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "mouseRightClick",
            in: this.__convert2Map(Object(arguments), "Robot.mouseRightClick")
        });
    } else {
        this.robot.mousePress(java.awt.event.InputEvent.BUTTON3_MASK); 
        this.robot.mouseRelease(java.awt.event.InputEvent.BUTTON3_MASK);
        if (!noDelay) sleep(this.autoDelay, true);
    }
    return this;
};

/**
 * <odoc>
 * <key>Robot.mouseCenterClick(noDelay) : Robot</key>
 * Action perform a mouse center-click (mouse wheel click). If noDelay = true the default autoDelay won't be used.
 * </odoc>
 */
Robot.prototype.mouseCenterClick = function(noDelay) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "mouseCenterClick",
            in: this.__convert2Map(Object(arguments), "Robot.mouseCenterClick")
        });
    } else {
        this.robot.mousePress(java.awt.event.InputEvent.BUTTON2_MASK); 
        this.robot.mouseRelease(java.awt.event.InputEvent.BUTTON2_MASK);
        if (!noDelay) sleep(this.autoDelay, true);
    }
    return this;
};

// --- WINDOWS FUNCTIONS ---------------------------

/**
 * <odoc>
 * <key>Robot.winAppFocus(title, noDelay) : Robot</key>
 * Windows action to move the operating system focus to the window whose name is like title using the windows
 * powershell. If noDelay = true the default autoDelay won't be used.
 * </odoc>
 */
Robot.prototype.winAppFocus = function(title, noDelay) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "winAppFocus",
            in: this.__convert2Map(Object(arguments), "Robot.winAppFocus")
        });
    } else {
        if (ow.format.isWindows()) {
            sh("powershell -Command \"[void][System.Reflection.Assembly]::LoadWithPartialName(\\\"Microsoft.VisualBasic\\\"); [Microsoft.VisualBasic.Interaction]::AppActivate(\\\"" + title + "\\\")\"");
        }
        if (!noDelay) sleep(this.autoDelay, true);
    }
    return this;
};

/**
 * <odoc>
 * <key>Robot.winPowershell(script, noDelay) : Robot</key>
 * Windows  action that executes a powershell 'script' command. If noDelay = true the default autoDelay won't be used.
 * </odoc>
 */
Robot.prototype.winPowershell = function(script, noDelay) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "winPowershell",
            in: this.__convert2Map(Object(arguments), "Robot.winPowershell")
        });
    } else {
        if (ow.format.isWindows()) {
            sh(["powershell", "-Command", script]);
        }
        if (!noDelay) sleep(this.autoDelay, true);
    }
    return this;
}

/**
 * <odoc>
 * <key>Robot.macAppFocus(application, noDelay) : Robot</key>
 * Mac OS X action to move the operating system focus to the application whose name is like 'application'. If noDelay = true the default autoDelay won't be used.
 * </odoc>
 */
Robot.prototype.macAppFocus = function(application, noDelay) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "macAppFocus",
            in: this.__convert2Map(Object(arguments), "Robot.macAppFocus")
        });
    } else {
        if (!ow.format.isWindows()) {
            sh("open -a " + application);
        }
        if (!noDelay) sleep(this.autoDelay, true);
    }
    return this;
};

/**
 * <odoc>
 * <key>Robot.macAppleScript(script, noDelay) : Robot</key>
 * Mac OS X action that executes the AppleScript 'script'. If noDelay = true the default autoDelay won't be used.
 * </odoc>
 */
Robot.prototype.macAppleScript = function(script, noDelay) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "macAppleScript",
            in: this.__convert2Map(Object(arguments), "Robot.macAppleScript")
        });
    } else {
        if (!ow.format.isWindows()) {
            sh(["osascript", "-e", script]);
        }
        if (!noDelay) sleep(this.autoDelay, true);
    }
    return this;
};

/**
 * <odoc>
 * <key>Robot.winAppCoordinates(aTitleName) : Map</key>
 * Given a Windows window aTitleName returns a map with the corresponding coordinates for left, top, right and bottom.
 * </odoc>
 */
Robot.prototype.winAppCoordinates = function(aTitleName) {
    _$(aTitleName).$_("Please provide a title name.");
    if (ow.format.isWindows()) {
        loadLib("robot_win32.js");
        var w = new RobotWin32();
        var hw = w.findWindowByTitle(aTitleName);
        if (hw == null) throw "Window '" + aTitleName + "' not found.";
        return w.getWindowCoordinates(hw);
    }
    return void 0;
};

Robot.prototype.macAppCoordinates = function(aAppName) {
    _$(aAppName).$_("Please provide an app name.");

    if (!ow.format.isWindows()) {
        var res = $sh(["osascript", "-e", "tell application \"" + aAppName + "\" to get the position of the front window"]).get(0);
        var coordinates = res.stdout.replace(/\n/g, "").split(",");
        res = $sh(["osascript", "-e", "tell application \"" + aAppName + "\" to get the size of the front window"]).get(0);
        var wsize = res.stdout.replace(/\n/g, "").split(",");
        return {
            left: Number(coordinates[0]),
            top: Number(coordinates[1]),
            right: Number(coordinates[0]) + Number(wsize[0]),
            bottom: Number(coordinates[1]) + Number(wsize[1])
        };
    }
    return void 0;
};

/**
 * <odoc>
 * <key>Robot.winAppDPI(aTitleName) : Number</key>
 * Given a Windows window aTitleName returns the current DPI associated.
 * </odoc>
 */
Robot.prototype.winAppDPI = function(aTitleName) {
    _$(aTitleName).$_("Please provide a title name.");

    if (ow.format.isWindows()) {
        loadLib("robot_win32.js");
        var w = new RobotWin32();
        return w.getWindowDPI(w.findWindowByTitle(aTitleName));
    }

    return void 0;
};

/**
 * <odoc>
 * <key>Robot.winMouseMoveInWindow(title, corner, x, y, forceDPI) : Robot</key>
 * Action to try to find a Windows window with the partial title and given the corresponding windows coordinates
 * move the mouse to corner with a x and y delta. corner can be:\
 * \
 *   - TL: Top-Left (default)\
 *   - TR: Top-Right\
 *   - BL: Bottom-Left\
 *   - BR: Bottom-Right\
 * \
 * </odoc>
 */
Robot.prototype.winMouseMoveInWindow = function(title, corner, x, y, forceDPI) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "winMouseMoveInWindow",
            in: this.__convert2Map(Object(arguments), "Robot.winMouseMoveInWindow")
        });
    } else {
        _$(title).$_("Please provide a title name.");
        corner = _$(corner).isString().default("TL");
        x = _$(x).isNumber().default(0);
        y = _$(y).isNumber().default(0);
        
        var m = this.winAppCoordinates(title);

        switch(corner.toUpperCase()) {
        case "TR": x = m.right + x; y = m.top + y; break;
        case "BL": x = m.left + x; y = m.bottom + y; break;
        case "BR": x = m.right + x; y = m.bottom + y; break;
        case "TL": x = m.left + x; y = m.top + y; break;
        }
        this.mouseMove(x, y, (isDef(forceDPI) ? forceDPI : this.winAppDPI(title)));
    }
    return this;
};


/**
 * <odoc>
 * <key>Robot.winListWindows() : Array</key>
 * Uses the Windows API to return a list of all windows titles. The list is sorted and duplicates are removed.
 * </odoc>
 */
Robot.prototype.winListWindows = function() {
    if (ow.format.isWindows()) {
        loadLib("robot_win32.js");
        var w = new RobotWin32();
        return w.listWindows();
    }
    return void 0;
};

/**
 * <odoc>
 * <key>Robot.winConvertScale2DPI(aScale) : Number</key>
 * Tries to convert a Windows aScale percentage into the corresponding DPI number.
 * </odoc>
 */
Robot.prototype.winConvertScale2DPI = function(aScale) {
    switch(aScale) {
    case 100: return 96;
    case 125: return 120;
    case 150: return 144;
    case 200: return 192;
    case 250: return 240;
    case 300: return 288;
    case 400: return 384;
    case 500: return 480;
    }

    throw "Can't convert (possible values 100, 125, 150, 200, 250, 300, 400, 500).";
};

/**
 * <odoc>
 * <key>Robot.macMouseMoveInWindow(application, corner, x, y) : Robot</key>
 * Action to try to find a Mac OS X window with the application name and given the corresponding windows coordinates
 * move the mouse to corner with a x and y delta. corner can be:\
 * \
 *   - TL: Top-Left (default)\
 *   - TR: Top-Right\
 *   - BL: Bottom-Left\
 *   - BR: Bottom-Right\
 * \
 * </odoc>
 */
Robot.prototype.macMouseMoveInWindow = function(application, corner, x, y) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "macMouseMoveInWindow",
            in: this.__convert2Map(Object(arguments), "Robot.macMouseMoveInWindow")
        });
    } else {
        _$(application).$_("Please provide a application name.");
        corner = _$(corner).isString().default("TL");
        x = _$(x).isNumber().default(0);
        y = _$(y).isNumber().default(0);
        
        var m = this.macAppCoordinates(application);
        sprint(m);

        switch(corner.toUpperCase()) {
        case "TR": x = m.right + x; y = m.top + y; break;
        case "BL": x = m.left + x; y = m.bottom + y; break;
        case "BR": x = m.right + x; y = m.bottom + y; break;
        case "TL": x = m.left + x; y = m.top + y; break;
        }
        this.mouseMove(x, y);
    }
    return this;
};

// --- INTERACTIVE FUNCTIONS ---------------------------

/**
 * <odoc>
 * <key>Robot.getMouseLocation() : Map</key>
 * Returns a map with x and y providing the current mouse location.
 * </odoc>
 */
Robot.prototype.getMouseLocation = function() {
    var loc = java.awt.MouseInfo.getPointerInfo().getLocation();
    return {
        x: loc.getX(),
        y: loc.getY()
    };
};

/**
 * <odoc>
 * <key>Robot.interactiveMouseLocation(oneValue) : Array</key>
 * Enters in a loop printing the current mouse coordinates continually. The loop is broken when the "ESC" key is hit.
 * During the loop if any other key is used the current mouse location will be recorded and added to an internal array.
 * Upon the end of the loop the internal array will be returned. Optionally if oneValue = true hitting any key records the
 * current mouse location and immediately returns an array with the recorded mouse location.
 * </odoc>
 */
Robot.prototype.interactiveMouseLocation = function(oneValue) {
    var c = 0, ar = [];
    plugin("Console");
    var __c = new Console(), doCic = true;

    do { 
        printnl(stringify(this.getMouseLocation(), void 0, "") + repeat(20, " ") + "\r"); 
        
        c = __c.readCharNB(); 
        if (c > 0 && c != 27) {
            print("");  
            ar.push(this.getMouseLocation());
        } else {
            if (c == 27) doCic= false;
        }
        if (oneValue && c > 0) {
            print("");
            ar.push(this.getMouseLocation());
            doCic = false;
        }
    } while(doCic); // esc
    print(repeat(40, " "));

    if (oneValue) return ar[0]; else return ar;
};

// --- KEYBOARD FUNCTIONS ---------------------------

/*
Robot.prototype.keyType = function(aText, noDelay) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "keyType",
            in: this.__convert2Map(Object(arguments))
        });
    } else {
        for(var i = 0; i < aText.length; i++) { 
            var sk = java.awt.event.KeyEvent.getExtendedKeyCodeForChar(aText[i].charCodeAt(0)); 
            this.robot.keyPress(sk); 
            this.robot.keyRelease(sk);
        }
        if (!noDelay) sleep(this.autoDelay, true);
    }
    return this;
};
*/

/**
 * <odoc>
 * <key>Robot.keyPress(key, noDelay) : Robot</key>
 * Action that simulates pressing and releasing the virtual key "key". If noDelay = true the default autoDelay won't be used.
 * </odoc>
 */
Robot.prototype.keyPress = function(key, noDelay) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "keyPress",
            in: this.__convert2Map(Object(arguments), "Robot.keyPress")
        });
    } else {
        this.robot.keyPress(java.awt.event.KeyEvent[String("VK_" + key.toUpperCase())]);
        this.robot.keyRelease(java.awt.event.KeyEvent[String("VK_" + key.toUpperCase())]);
        if (!noDelay) sleep(this.autoDelay, true);
    }

    return this;
};

/**
 * <odoc>
 * <key>Robot.keyPressComb(keys, noDelay) : Robot</key>
 * Action that simulates pressing and releasing a combination of virtual keys provide with keys (an array of keys). For mod keys like SHIFT,
 * ALT_GRAPH, META, WINDOWS, CONTROL and ALT it will automatically hold them and release them on the end. If noDelay = true the default autoDelay won't be used.
 * </odoc>
 */
Robot.prototype.keyPressComb = function(keys, noDelay) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "keyPressComb",
            in: this.__convert2Map(Object(arguments), "Robot.keyPressComb")
        });
    } else {
        var mods = [];
        if (isString(keys)) keys = [ keys ];
        for(var ai in keys) {
            var c = keys[ai];
            if (c == "SHIFT" || c == "ALT_GRAPH" || c == "CONTROL" || c == "ALT" || c == "META" || c == "WINDOWS") {
                this.keyHold(c, true);
                mods.push(c);
            } else {
                this.keyPress(c, true);
            }
        }
        mods.forEach((v) => {
            this.keyRelease(v, true);
        });
        if (!noDelay) sleep(this.autoDelay, true);
    }

    return this;
};

/**
 * <odoc>
 * <key>Robot.keyPressStr(text, noDelay) : Robot</key>
 * Action that tries to simulate pressing and releasing the virtual keys needed to write text. 
 * If noDelay = true the default autoDelay won't be used.
 * </odoc>
 */
Robot.prototype.keyPressStr = function(text, noDelay) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "keyPressStr",
            in: this.__convert2Map(Object(arguments), "Robot.keyPressStr")
        });
    } else {
        _$(this.keyMap).$_("Please load a key map.");
        
        for(var ii = 0; ii < text.length; ii++) {
            this.keyPressComb(this.keyMap[text[ii]], true);
        }
        if (!noDelay) sleep(this.autoDelay, true);
    }
    return this;
};

/**
 * <odoc>
 * <key>Robot.keyPressStr4Clipboard(noDelay) : Robot</key>
 * Action that tries to simulate pressing and releasing the virtual keys needed to write the string representation of what
 * is currently on the clipboard. If noDelay = true the default autoDelay won't be used.
 * </odoc>
 */
Robot.prototype.keyPressStr4Clipboard = function(noDelay) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "keyPressStr4Clipboard",
            in: this.__convert2Map(Object(arguments), "Robot.keyPressStr4Clipboard")
        });
    } else {
        this.keyPressStr(this.getClipboard(), noDelay);
    }
    return this;
};

/**
 * <odoc>
 * <key>Robot.keyPressCode(code, noDelay) : Robot</key>
 * Action that simulates pressing and releasing the specific key code provided. If noDelay = true the default autoDelay won't be used.
 * </odoc>
 */
Robot.prototype.keyPressCode = function(code, noDelay) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "keyPressCode",
            in: this.__convert2Map(Object(arguments), "Robot.keyPressCode")
        });
    } else {
        this.robot.keyPress(code);
        this.robot.keyRelease(code);
        if (!noDelay) sleep(this.autoDelay, true);
    }    

    return this;
};

/**
 * <odoc>
 * <key>Robot.keyHold(key, noDelay) : Robot</key>
 * Action that simulates holding key. If noDelay = true the default autoDelay won't be used.
 * </odoc>
 */
Robot.prototype.keyHold = function(key, noDelay) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "keyHold",
            in: this.__convert2Map(Object(arguments), "Robot.keyHold")
        });
    } else {
        this.robot.keyPress(java.awt.event.KeyEvent[String("VK_" + key.toUpperCase())]);
        if (!noDelay) sleep(this.autoDelay, true);
    }
    return this;
};

/**
 * <odoc>
 * <key>Robot.keyRelease(key, noDelay) : Robot</key>
 * Action that simulates releasing a previously hold key. If noDelay = true the default autoDelay won't be used.
 * </odoc>
 */
Robot.prototype.keyRelease = function(key, noDelay) {
    if (this.repeat) {
        this.repeatActions.push({
            fn: "keyRelease",
            in: this.__convert2Map(Object(arguments), "Robot.keyRelease")
        });
    } else {    
        this.robot.keyRelease(java.awt.event.KeyEvent[String("VK_" + key.toUpperCase())]);
        if (!noDelay) sleep(this.autoDelay, true);
    }
    return this;
};

/**
 * <odoc>
 * <key>Robot.getClipboard() : String</key>
 * Returns the current content of the operating system clipboard.
 * </odoc>
 */
Robot.prototype.getClipboard = function() {
    var clipboard = java.awt.Toolkit.getDefaultToolkit().getSystemClipboard();
    return String(clipboard.getData(java.awt.datatransfer.DataFlavor.stringFlavor));
};

/**
 * <odoc>
 * <key>Robot.setClipboard(aString) : Robot</key>
 * Changes the current operating system clipboard to store aString.
 * </odoc>
 */
Robot.prototype.setClipboard = function(aString) {  
    var clipboard = java.awt.Toolkit.getDefaultToolkit().getSystemClipboard();
    clipboard.setContents(new java.awt.datatransfer.StringSelection(aString), null);

    return this;
};
