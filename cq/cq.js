// Author: Nuno Aguiar

loadExternalJars(getOPackPath("CQ") || ".")

/**
 * <odoc>
 * <key>CQ(aPath, aCycle, aCallBack) : CQ</key>
 * Creates a new CQ instance.\
 * Parameters:\
 *  - aPath (String)     : path to CQ directory\
 *  - aCycle (String)    : roll cycle (e.g. DAILY, HOURLY, MINUTELY, etc.). Default: "DAILY"\
 *  - aCallBack(Function): optional callback invoked when the store file changes with\
 *                         (currentCycle, currentFile, previousCycle, previousFile)\
 * \
 * Roll cycles: DAILY, HOURLY, MINUTELY, SECONDLY, FIVE_MINUTELY, TEN_MINUTELY, TWENTY_MINUTELY, HALF_HOURLY, TWO_HOURLY, FOUR_HOURLY, SIX_HOURLY, WEEKLY, LARGE_DAILY, LARGE_HOURLY, XLARGE_DAILY, HUGE_DAILY\
 * \
 * </odoc>
 */
var CQ = function(aPath, aCycle, aCallBack) {
    _$(aPath, "aPath").isString().$_()
    aCycle = _$(aCycle, "aCycle").isString().default("DAILY")
    aCallBack = _$(aCallBack, "aCallBack").isFunction().default(__)

    switch(aCycle.toUpperCase()) {
    case "DAILY": aCycle = Packages.net.openhft.chronicle.queue.RollCycles.FAST_DAILY; break
    case "HOURLY": aCycle = Packages.net.openhft.chronicle.queue.rollcycles.LegacyRollCycles.HOURLY; break
    case "MINUTELY": aCycle = Packages.net.openhft.chronicle.queue.rollcycles.LegacyRollCycles.MINUTELY; break
    case "SECONDLY": aCycle = Packages.net.openhft.chronicle.queue.rollcycles.TestRollCycles.TEST_SECONDLY; break
    case "FIVE_MINUTELY": aCycle = Packages.net.openhft.chronicle.queue.RollCycles.FIVE_MINUTELY; break;
    case "TEN_MINUTELY": aCycle = Packages.net.openhft.chronicle.queue.RollCycles.TEN_MINUTELY; break;
    case "TWENTY_MINUTELY": aCycle = Packages.net.openhft.chronicle.queue.RollCycles.TWENTY_MINUTELY; break;
    case "HALF_HOURLY": aCycle = Packages.net.openhft.chronicle.queue.RollCycles.HALF_HOURLY; break;
    case "TWO_HOURLY": aCycle = Packages.net.openhft.chronicle.queue.RollCycles.TWO_HOURLY; break;
    case "FOUR_HOURLY": aCycle = Packages.net.openhft.chronicle.queue.RollCycles.FOUR_HOURLY; break;
    case "SIX_HOURLY": aCycle = Packages.net.openhft.chronicle.queue.RollCycles.SIX_HOURLY; break;
    case "WEEKLY": aCycle = Packages.net.openhft.chronicle.queue.RollCycles.WEEKLY; break;
    case "LARGE_DAILY": aCycle = Packages.net.openhft.chronicle.queue.rollcycles.LargeRollCycles.LARGE_DAILY; break;
    case "LARGE_HOURLY": aCycle = Packages.net.openhft.chronicle.queue.rollcycles.LargeRollCycles.LARGE_HOURLY; break;
    case "XLARGE_DAILY": aCycle = Packages.net.openhft.chronicle.queue.rollcycles.XLargeRollCycles.XLARGE_DAILY; break;
    case "HUGE_DAILY": aCycle = Packages.net.openhft.chronicle.queue.rollcycles.HugeRollCycles.HUGE_DAILY; break;
    default: throw new Error("Invalid roll cycle: " + aCycle)
    }

    if (!io.fileExists(aPath)) {
        io.mkdir(aPath)
    } else {
        if (io.fileInfo(aPath).isFile) new Error("Path exists and is a file (should be a directory)")
    }
    this._queue = Packages.net.openhft.chronicle.queue.impl.single.SingleChronicleQueueBuilder.builder().rollCycle(aCycle).path(aPath).storeFileListener((c, f) => {
        if (isUnDef(c) || isUnDef(f)) return true
        this._previousCycle = this._currentCycle
        this._previousFile  = this._currentFile
        this._currentCycle  = c
        this._currentFile   = f
        if (aCallBack != __) aCallBack(c, f, this._previousCycle, this._previousFile)
        return false
    }).build()

    this._currentCycle  = this._queue.cycle()
    this._currentFile   = __
    this._previousCycle = __
    this._previousFile  = __
}

/**
 * <odoc>
 * <key>CQ.prototype.append(aValue) : CQ</key>
 * Appends a Value to the CQ instance.
 * </odoc>
 */
CQ.prototype.append = function(aValue) {
    _$(aValue, "aValue").$_()

    var _appender = this._queue.createAppender()
    try {
        _appender.writeText(isObject(aValue) ? stringify(aValue, __, "") : aValue)
    } finally {
        _appender.close()
    }
}

/**
 * <odoc>
 * <key>CQ.prototype.readAll() : Array</key>
 * Reads all values from the CQ instance.
 * </odoc>
 */
CQ.prototype.readAll = function() {
    var _trailer = this._queue.createTailer()
    try {
        var _out = [], _r
        do {
            _r = _trailer.readText()
            if (isDef(_r) && _r != null) _out.push(jsonParse(_r))
        } while(isDef(_r) && _r != null)
    } finally {
        _trailer.close()
    }

    return _out
}

/**
 * <odoc>
 * <key>CQ.prototype.appendAll(aList) : CQ</key>
 * Writes all values from the provided list to the CQ instance.
 * </odoc>
 */
CQ.prototype.appendAll = function(aList) {
    var _appender = this._queue.createAppender()
    try {
        aList.forEach(item => {
            _appender.writeText(isObject(item) ? stringify(item, __, "") : item)
        })
    } finally {
        _appender.close()
    }
}

/**
 * <odoc>
 * <key>CQ.prototype.forEach(aFn) : CQ</key>
 * Executes a function for each value in the CQ instance.
 * </odoc>
 */
CQ.prototype.forEach = function(aFn) {
    _$(aFn, "aFn").isFunction().$_()

    var _trailer = this._queue.createTailer()
    try {
        var _go = true
        do {
            var _r = _trailer.readText()
            if (isDef(_r) && _r != null) {
                if (aFn(jsonParse(_r))) _go = false
            } else {
                _go = false
            }
        } while (_go)
    } finally {
        _trailer.close()
    }
}

/**
 * <odoc>
 * <key>CQ.prototype.size() : Number</key>
 * Returns the number of entries in the CQ instance.
 * </odoc>
 */
CQ.prototype.size = function() {
    return this._queue.entryCount()
}

/**
 * <odoc>
 * <key>CQ.prototype.close(doGC) : CQ</key>
 * Closes the CQ instance. Optionally performs garbage collection (doGC).
 * </odoc>
 */
CQ.prototype.close = function(doGC) {
    if (doGC) this.gc()
    this._queue.close()
}

/**
 * <odoc>
 * <key>CQ.prototype.gc() : CQ</key>
 * Garbage collects the CQ instance.
 * </odoc>
 */
CQ.prototype.gc = function() {
    this._queue.gcAndWaitForCloseablesToClose()
}

// cq implementation
//
/**
* <odoc>
* <key>ow.ch.types.cq</key>
* The cq channel OpenAF implementation of Chronicle Queue. Due to the nature of Chronicle Queue\
* there are some differences from normal channels. Namely:\
*    - Can not override a previous entry. Will just append with the same key.\
*    - Can not unset or unsetAll or pop or shift.\
* \
* The creation options are:\
* \
*    - path  (String)   The path of the Chronicle Queue files.\
*    - cycle (String)   The type of roll cycle to use (e.g. DAILY, HOURLY, MINUTELY, SECONDLY, FIVE_MINUTELY, TEN_MINUTELY, TWENTY_MINUTELY, HALF_HOURLY, TWO_HOURLY, FOUR_HOURLY, SIX_HOURLY, WEEKLY, LARGE_DAILY, LARGE_HOURLY, XLARGE_DAILY, HUGE_DAILY)\
*    - cb    (Function) Optional callback invoked when the store file changes with (currentCycle, currentFile, previousCycle, previousFile)\
* \
* </odoc>
*/
ow.loadCh()
ow.loadObj()
ow.ch.__types.cq = {
    __channels: {},
    create       : function(aName, shouldCompress, options) {
        options = _$(options, "options").isMap().default({})
        options.path = _$(options.path, "options.path").isString().default(".")
        options.cycle = _$(options.cycle, "options.cycle").isString().default("DAILY")
        options.cb = _$(options.cb, "options.cb").isFunction().default(__)

        var cq = new CQ(options.path, options.cycle, options.cb)
        options._cq = cq

        this.__channels[aName] = options
    },
    destroy      : function(aName) {
        this.__channels[aName]._cq.close(true)
        delete this.__channels[aName]
    },
    size         : function(aName) {
        return this.__channels[aName]._cq.size()
    },
    forEach      : function(aName, aFunction) {
        this.__channels[aName]._cq.forEach(r => {
            aFunction(r)

            // always continue
            return false
        })
    },
    getAll       : function(aName, full) {
        return this.__channels[aName]._cq.readAll().map(r => r.v)
    },
    getKeys      : function(aName, full) {
        return this.__channels[aName]._cq.readAll().map(r => r.k)
    },
    getSortedKeys: function(aName, full) {
        return this.__channels[aName]._cq.readAll().sort((a, b) => a.k.localeCompare(b.k))
    },
    getSet       : function getSet(aName, aMatch, aK, aV, aTimestamp)  {
        throw new Error("not implemented")
    },
    set          : function(aName, aK, aV, aTimestamp) {
        this.__channels[aName]._cq.append({ k: aV, v: aV })
    },
    setAll       : function(aName, aKs, aVs, aTimestamp) {
        this.__channels[aName]._cq.appendAll(aVs.map(v => ({ k: ow.obj.filterKeys(aKs, v), v: v })))
    },
    unsetAll     : function(aName, aKs, aVs, aTimestamp) {
        throw new Error("not implemented")
    },
    get          : function(aName, aK) {
        var _res = __
        this.__channels[aName]._cq.forEach(r => {
            if (compare(r.k, aK)) {
                _res = r.v
                return true
            } else {
                return false
            }
        })
        return _res
    },
    pop          : function(aName) {
        throw new Error("not implemented")
    },
    shift        : function(aName) {
        throw new Error("not implemented")
    },
    unset        : function(aName, aK, aTimestamp) {
        throw new Error("not implemented")
    }
}