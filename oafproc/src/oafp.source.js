var _params = processExpr(" ")
// Author : Nuno Aguiar
const oafp = params => {
if (isUnDef(params) || isDef(params.____ojob)) return 

// Process secBuckets
if (isDef($sec().procMap)) params = $sec().procMap(params)

// --- Util functions
// Util functions
const _transform = r => {
    var _ks = Object.keys(_transformFns)
    for(var ikey = 0; ikey < _ks.length; ikey++) {
        var key = _ks[ikey]
        if (isDef(params[key])) r = _transformFns[key](r)
    }
    return r
}
const _$f = (r, options) => {
    params.__origr = r

    // Input filters
    if (options.__ifrom) {
        r = $from(isArray(r) ? r : [ r ]).query(af.fromNLinq(options.__ifrom.trim()))
        delete options.__ifrom
    }
    if (options.__isql) {
        var method = __
        if (isString(params.sqlfilter)) {
            switch(params.sqlfilter.toLowerCase()) {
            case "simple"  : method = "nlinq"; break
            case "advanced": method = "h2"; break
            default        : method = __
            }
        }
        if (isArray(r) && r.length > 0) {
            if (isString(params.isqlfiltertables)) {
                var _sql = $sql()
                var _tables = _fromJSSLON(params.isqlfiltertables)
                if (isArray(_tables)) {
                    // (table: ..., path: ...)
                    _tables.forEach(t => {
                        if (isUnDef(t.table)) _exit(-1, "One 'table' not defined in isqlfiltertables")
                        t.path = _$(t.path, "isqlfiltertables table " + t.table + " path").isString().default("@")
                        var _rp = $path(r, t.path)
                        if (isArray(_rp)) _sql = _sql.table(t.table, _rp)
                    })
                    // if $sql chained then it's already sqlfilter=advanced by default
                    r = _sql.closeQuery(options.__isql.trim())
                }
            } else {
                r = $sql(r, options.__isql.trim(), method)
            }   
        }

        delete options.__isql
    }
    if (options.__path) {
        r = $path(r, options.__path.trim())
        delete options.__path
    }

    //if (!Array.isArray(params.__origr) && Array.isArray(r) && r.length <= 1) r = r[0]

    // Transforms
    if (isString(r)) return _transform(r)
    r = _transform(r)

    // Output filters
    if (options.__from) {
        r = $from(isArray(r) ? r : [ r ]).query(af.fromNLinq(options.__from.trim()))
        delete options.__from
    }
    if (options.__sql) {
        var method = __
        if (isString(params.sqlfilter)) {
            switch(params.sqlfilter.toLowerCase()) {
            case "simple"  : method = "nlinq"; break
            case "advanced": method = "h2"; break
            default        : method = __
            }
        }
        if (isArray(r) && r.length > 0) {
            if (isString(params.sqlfiltertables)) {
                var _sql = $sql()
                var _tables = _fromJSSLON(params.sqlfiltertables)
                if (isArray(_tables)) {
                    // (table: ..., path: ...)
                    _tables.forEach(t => {
                        if (isUnDef(t.table)) _exit(-1, "One 'table' not defined in sqlfiltertables")
                        t.path = _$(t.path, "sqlfiltertables table " + t.table + " path").isString().default("@")
                        var _rp = $path(r, t.path)
                        if (isArray(_rp)) _sql = _sql.table(t.table, _rp)
                    })
                    // if $sql chained then it's already sqlfilter=advanced by default
                    r = _sql.closeQuery(options.__sql.trim())
                }
            } else {
                r = $sql(r, options.__sql.trim(), method)
            }
        }
        delete options.__sql
    }
    if (options.__opath) {
        r = $path(r, options.__opath.trim())
        delete options.__opath
    }
    
    //if (!Array.isArray(__origr2) && Array.isArray(r) && r.length <= 1) r = r[0]
    return r
}
const _$o = (r, options, lineByLine) => {
    if (r == null || ("undefined" == typeof r)) {
        _clearTmpMsg()
        return
    }

    var nOptions = clone(options)

    if (toBoolean(params.color)) {
        __conConsole = true
    } else {
        if (isDef(params.color)) {
            __conAnsi = false
        }
    }
    if (!isString(r)) {
        if (lineByLine)
            r = _$f([r], nOptions)[0]
        else
            r = _$f(r, nOptions)
    } else {
        if ((isDef(params.in) && params.in != "raw") || isUnDef(params.in)) {
            const _tr = r.trim()
            if ((_tr.startsWith("{") && _tr.endsWith("}")) || 
                (_tr.startsWith("[") && _tr.endsWith("]") && /^\[\s*\{/.test(_tr))) {
                r = _$f(jsonParse(r, __, __, true), nOptions)
            } else {
                r = _$f(r, nOptions)
            }
        } else {
            r = _transform(r)
        }
    }

    if (isDef(params.outputkey)) r = $$({}).set(params.outputkey, r)
    if (isDef(params.outkey))    r = $$({}).set(params.outkey, r)

    _clearTmpMsg()
    if (isUnDef(nOptions.__format)) nOptions.__format = getEnvsDef("OAFP_OUTPUT", nOptions.__format, "ctree")
    if (_outputFns.has(nOptions.__format)) {
        _outputFns.get(nOptions.__format)(r, nOptions)
    } else {
        _o$o(r, nOptions, __)
    }
}
const _runCmd2Bytes = (cmd, toStr) => {
    var data = af.fromString2Bytes("")
    var ostream = af.newOutputStream()
    $sh(cmd)
    .cb((o, e, i) => {
      ioStreamCopy(ostream, o)
      var ba = ostream.toByteArray()
      if (ba.length > 0) data = ba
    })
    .get()
    return toStr ? af.fromBytes2String(data) : data
}
const _fromJSSLON = (aString, checkYAML) => {
    if ("[object Object]" == Object.prototype.toString.call(aString) || Array.isArray(aString)) return aString
	if (!isString(aString) || aString == "" || isNull(aString)) return ""

	aString = aString.trim()
    var _r
    if (isDef(af.fromJSSLON)) _r = af.fromJSSLON(aString)
    if (isUnDef(_r)) {
        if (aString.startsWith("{")) {
            _r = jsonParse(aString, __, __, true)
        } else {
            _r = af.fromSLON(aString)
        }
    } else {
        if (isString(_r) && checkYAML) _r = af.fromYAML(_r)
    }
    return _r
}
const _chartPathParse = (r, frmt, prefix, isStatic) => {
    prefix = _$(prefix).isString().default("_oafp_fn_")
    let parts = splitBySepWithEnc(frmt, " ", [["\"","\""],["'","'"]])
    let nparts = []
    $ch("__oaf::chart").create()
    if (parts.length > 1) {
        for(let i = 0; i < parts.length; i++) {
            if (i == 0) {
                nparts.push(parts[i])
            } else {
                let _n = splitBySepWithEnc(parts[i], ":", [["\"","\""],["'","'"]]).map((_p, j) => {
                    if (j == 0) {
                        if (!_p.startsWith("-")) {
                            global[prefix + i] = () => {
                                if (isString(isStatic)) {
                                    var _d = $ch("__oaf::chart").get({ name: isStatic })
                                    if (isUnDef(_d)) _d = []; else _d = _d.data
                                    var _dr = $path(r, _p)
                                    if (isArray(_dr)) {
                                        _dr.forEach((y, _i) => {
                                            if (isArray(_d[_i])) {
                                                _d[_i].push(y)
                                            } else {
                                                _d[_i] = [ y ]
                                            }
                                        })
                                        let last = _d.pop()
                                        $ch("__oaf::chart").set({ name: isStatic }, { name: isStatic, data: _d })
                                        return last[0]
                                    }
                                } else {
                                   return $path(r, _p)
                                }
                            }
                            return prefix + i
                        } else {
                            return _p
                        }
                    } else {
                        return _p
                    }
                }).join(":")
                nparts.push(_n)
            }
        }
        return nparts.join(" ")
    }
    return ""
}
const _print = (m) => {
    if ("undefined" !== typeof m) {
        if ("undefined" === typeof params.outfile) {
            if (toBoolean(params.loopcls)) cls()
            if (isDef(params.pipe)) {
                var _m = isMap(params.pipe) ? params.pipe : _fromJSSLON(params.pipe, true)
                if (isMap(_m)) {
                    _m.data = m
                    oafp(_m)
                }
            } else {
                print(m)
            }
        } else {
            if ("undefined" === typeof global.__oafp_streams) global.__oafp_streams = {}
            if ("undefined" !== typeof global.__oafp_streams[params.outfile]) {
                var _ofa = toBoolean(params.outfileappend)
                if (_ofa) {
                    ioStreamWrite(global.__oafp_streams[params.outfile].s, m + (_ofa ? "\n" : ""))
                } else {
                    io.writeFileBytes(params.outfile, isString(m) ? af.fromString2Bytes(m) : m)
                }
            } else {
                io.writeFileBytes(params.outfile, isString(m) || m instanceof java.lang.String ? af.fromString2Bytes(m) : m)
            }
        }
    }
}
const _o$o = (a, b, c) => {
    if ("undefined" !== typeof a) {
        var _s = $o(a, b, c, true)
        if (isDef(_s)) _print(_s)
    }
}

// Parallel execution initialization
const _parInit = () => {
    return {
        _resC: $atomic(),
        _nc  : getNumberOfCores(),
        times: $atomic(),
        execs: $atomic(0, "long"),
        _opar: (isDef(params.parallel) && toBoolean(params.parallel)) || String(getEnv("OAFP_PARALLEL")).toLowerCase() == "true",
        _par : false,
        _ts  : []
    }
}

// Parallel execution check
const _parCheck = _par => {
    // If execution time per call is too low, go sequential
    if ( _par._opar && _par._nc >= 3 ) {
        if ( ((_par.times.get() / _par.execs.get() ) / 1000000) < __flags.PFOREACH.seq_thrs_ms || __getThreadPools().active / getNumberOfCores() > __flags.PFOREACH.seq_ratio) {
            _par._par = true
        } else {
            _par._par = false
        }
    }

    return _par
}

// Parallel execution done
const _parDone = _par => {
	var tries = 0
	do {
		$doWait($doAll(_par._ts))
		if (_par._resC.get() > 0) sleep(__getThreadPools().queued * __flags.PFOREACH.waitms, true)
		tries++
	} while(_par._resC.get() > 0 && tries < 100)
}

// Parallel execution
const _parExec = (_par, fn) => {
    var init = nowNano(), _e
    if (_par._par) {
        _par._ts.push($do(() => {
            _par._resC.inc()
            return fn(_par.execs.inc())
        }).then(() => {
            return _par._resC.dec()
        }).catch(e => {
            _e = e
        }))
        if (isDef(_e)) throw _e
    } else {
        fn(_par.execs.inc())
    }
    _par.times.getAdd(nowNano() - init)

	// Cool down and go sequential if too many threads
    var _tpstats = __getThreadPools()
    if (_tpstats.queued > _tpstats.poolSize / __flags.PFOREACH.threads_thrs) {
        $doWait(_par._ts.pop())
    }
}

const _getSec = (aM, aPath) => {
	aM = _$(aM).isMap().default({})
	if (isDef(aM.secKey)) {
		aMap = clone(aM)
		
		aMap.secRepo     = _$(aMap.secRepo).default(getEnv("OAFP_SECREPO"))
		aMap.secBucket   = _$(aMap.secBucket).default(getEnv("OAFP_SECBUCKET"))
		aMap.secPass     = _$(aMap.secPass).default(getEnv("OAFP_SECPASS"))
		aMap.secMainPass = _$(aMap.secMainPass).default(getEnv("OAFP_SECMAINPASS"))
		aMap.secFile     = _$(aMap.secFile).default(getEnv("OAFP_SECFILE"))
		
		var s = $sec(aMap.secRepo, aMap.secBucket, aMap.secPass, aMap.secMainPass, aMap.secFile).get(aMap.secKey)

		delete aMap.secRepo
		delete aMap.secBucket
		delete aMap.secPass
		delete aMap.secMainPass
		delete aMap.secFile
		delete aMap.secKey

		if (isDef(aPath)) {
			return $$(aMap).set(aPath, merge($$(aMap).get(aPath), s))
		} else {
			return merge(aMap, s)
		}
	} else {
		return aM
	}
}
const _msg = "(processing data...)"
const _showTmpMsg  = msg => { if (params.out != 'grid' && !params.__inception && !toBoolean(params.loopcls) && !toBoolean(params.chartcls)) printErrnl(_$(msg).default(_msg)) } 
const _clearTmpMsg = msg => { if (params.out != 'grid' && !params.__inception && !toBoolean(params.loopcls) && !toBoolean(params.chartcls)) printErrnl("\r" + " ".repeat(_$(msg).default(_msg).length) + "\r") }

// ---

// Process params
ow.loadFormat()

var procParams = () => {
    params.format = params.output || params.format || params.out, params.type = params.input || params.type || params.in
    params.out = params.format
    params.output = params.format
    params.in = params.type
    params.input = params.type
    if (isUnDef(params._id)) {
        params._id = nowNano()
    }
}
procParams()

// Check if file is provided
var bkprms
if (isDef(params.loop)) {
    if (isDef(bkprms)) params = clone(bkprms); else bkprms = clone(params)
}
if (Object.keys(params).indexOf("-f") >= 0) {
    let _l = Object.keys(params).length
    var _i = Object.keys(params).indexOf("-f")
    if (_l > _i + 1) {
        if (Object.keys(params)[_i + 1].length > 0) {
            params.paramsfile = Object.keys(params)[_i + 1]
            delete params[params.paramsfile]
        }
    }
    delete params["-f"]
}
if (isDef(params.paramsfile)) {
    var _args
    if (params.paramsfile == "-") {
        var _r = []
        io.pipeLn(r => { _r.push(r); return false })
        _args = _r.join("\n")
    } else if (io.fileExists(params.paramsfile)) {
        _args = io.readFileString(params.paramsfile)
    }
    if (isString(_args)) {
        // Check if it is a JSON/SLON/YAML
        _margs = _fromJSSLON(_args, true)
        if (isMap(_margs)) {
            // Set the params if not already set
            Object.keys(_margs).forEach(k => {
                if (isUnDef(params[k])) params[k] = _margs[k]
            })
        }
    }
}

procParams()

// Ensure params are interpreted as lower case
Object.keys(params).forEach(pk => {
    if (typeof params[pk] == "string" && params[pk].length > 0) {
        var npk = pk.toLowerCase()
        if (pk != npk && isUnDef(params[npk])) {
            params[npk] = params[pk]
            delete params[pk]
        }
    }
})

// Exit function
const _exit = (code, msg) => {
    if (isUnDef(msg)) msg = "exit: " + code
    if (isUnDef(ow.oJob) && !toBoolean(params.noexit)) {
        if (code != 0) printErr(msg)
        exit(code)
    } else {
        throw msg
    }
}

const showHelp = () => {
    __initializeCon()

    var _ff
    params.help = _$(params.help, "help").isString().default("")

    var _f
    switch(params.help.toLowerCase()) {
    case "filters" : _ff = "docs/FILTERS.md"; break
    case "template": _ff = "docs/TEMPLATE.md"; break
    case "examples": _ff = "docs/EXAMPLES.md"; break
    case "readme"  :
    case "usage"   : _ff = "docs/USAGE.md"; break
    default        : 
        var _r = params.help.toLowerCase()
        if (isDef(_oafhelp_libs[_r]))
            _ff = "docs/" + _r + ".md"
        else
            _ff = "docs/USAGE.md"
    }

    _f = (getOPackPath("oafproc") || ".") + "/" + _ff

    let _customHelp = ""
    if (_ff == "docs/USAGE.md" && Object.keys(_oafhelp_libs).length > 0) {
        _customHelp = "\n---\n\n## 📚 Libs help documents\n\n| Lib | Help |\n| --- | --- |\n"
        for (let key in _oafhelp_libs) {
            _customHelp += "| " + key + " | help=" + key + " |\n"
        }
    }

    if (isDef(_f) && io.fileExists(_f)) {
        __ansiColorFlag = true
		__conConsole = true
        if (isDef(ow.format.string.pauseString) && toBoolean(params.pause))
            ow.format.string.pauseString( ow.format.withMD( io.readFileString(_f) + _customHelp ) )
        else
            _print((isDef(params.out) && params.out == "raw") ? io.readFileString(_f) + _customHelp : ow.format.withMD( io.readFileString(_f) + _customHelp ))
    } else {
        if (isDef(global._oafphelp) && isDef(global._oafphelp[_ff])) {
            __ansiColorFlag = true
            __conConsole = true
            if (isDef(ow.format.string.pauseString) && toBoolean(params.pause))
                ow.format.string.pauseString( ow.format.withMD( global._oafphelp[_ff] + _customHelp ) )
            else
                _print((isDef(params.out) && params.out == "raw") ? global._oafphelp[_ff] + _customHelp : ow.format.withMD( global._oafphelp[_ff] + _customHelp))
        } else {
            if (isString(_oafhelp_libs[params.help])) {
                __ansiColorFlag = true
                __conConsole = true
                if (isDef(ow.format.string.pauseString) && toBoolean(params.pause))
                    ow.format.string.pauseString( ow.format.withMD( _oafhelp_libs[params.help] ) )
                else
                    _print((isDef(params.out) && params.out == "raw") ? _oafhelp_libs[params.help] : ow.format.withMD( _oafhelp_libs[params.help] ))
            } else {
                _print("Check https://github.com/OpenAF/oafp/blob/master/src/" + _ff)
            }
        }
    }

    _exit(0)
}

const showVersion = () => {
    var _ff = (getOPackPath("oafproc") || ".") + "/.package.yaml"
    var oafpv = (io.fileExists(_ff) ? io.readFileYAML(_ff).version : "(not available/embedded)")
    var _v = {
        oafp: {
            version: oafpv,
            inputs: Array.from(_inputFns.keys()).filter(r => r != '?').sort(),
            transforms: Object.keys(_transformFns).filter(r => r != 'transforms').sort(),
            outputs: Array.from(_outputFns.keys()).filter(r => r != '?').sort(),
            flags: __flags.OAFP
        },
        openaf: {
            version: getVersion(),
            distribution: getDistribution(),
            home: getOpenAFPath(),
            opacks: $from($m4a(getOPackLocalDB())).notEquals("name", "OpenAF").sort("name").select({ name: "", version: ""})
        },
        java: {
            version: ow.format.getJavaVersion(),
            home: ow.format.getJavaHome(),
            vendor: String(java.lang.System.getProperty("java.vendor")),
            params: af.fromJavaArray(java.lang.management.ManagementFactory.getRuntimeMXBean().getInputArguments())
        },
        os: {
            name: String(java.lang.System.getProperty("os.name")),
            version: String(java.lang.System.getProperty("os.version")),
            arch: ow.format.getOSArch(),
            cpuCores: getNumberOfCores(true),
            mem: {
                max: Number(java.lang.Runtime.getRuntime().maxMemory()),
                total: Number(java.lang.Runtime.getRuntime().totalMemory())
            },
            store: {
                tmpDirPath: String(java.lang.System.getProperty("java.io.tmpdir")),
                freeTmpDirBytes: Number(java.nio.file.Files.getFileStore(java.nio.file.Paths.get(java.lang.System.getProperty("java.io.tmpdir"))).getUsableSpace()),
            }
        }
    }
    return stringify(_v, __, "")
}

// Check if file is provided
if ("undefined" == typeof params.file && "undefined" == typeof params.cmd && "undefined" == typeof params.data && "undefined" == typeof params.url) {
    let _found = __
    for (let key in params) {
        if ("undefined" == typeof _found && params[key] === "" && key != "-debug" && key != "-v" && key != "-examples") {
            _found = key
            break;
        }
    }
    params.file = _found
    if (isDef(bkprms)) bkprms.file = _found
}

if (typeof params.debug !== "undefined") params.debug = toBoolean(params.debug)
if (isDef(params["-debug"])) params.debug = true

// Verify the data param
if ("[object Object]" == Object.prototype.toString.call(params.data) || Array.isArray(params.data)) {
    params.data = stringify(params.data, __, "")
}

// --- File extensions list
const _fileExtensions = new Map([
  [
    ".json",
    "json"
  ],
  [
    ".ndjson",
    "ndjson"
  ],
  [
    ".ndslon",
    "ndslon"
  ],
  [
    ".slon",
    "slon"
  ],
  [
    ".yaml",
    "yaml"
  ],
  [
    ".xml",
    "xml"
  ],
  [
    ".csv",
    "csv"
  ],
  [
    ".ini",
    "ini"
  ],
  [
    ".md",
    "md"
  ],
  [
    ".xls",
    "xls"
  ],
  [
    ".xlsx",
    "xls"
  ],
  [
    ".sql",
    "sql"
  ],
  [
    ".toml",
    "toml"
  ],
  [
    ".jwt",
    "jwt"
  ],
  [
    ".jfr",
    "jfr"
  ]
])
// --- add extra _fileExtensions here ---
const _addSrcFileExtensions = (ext, type) => {
    if (!_fileExtensions.has(ext)) {
        _fileExtensions.set(ext, type)
    } else {
        if (params.debug) printErr("WARN: Extension '" + ext + "' already exists.")
    }
}

// --- List of input types that should not be stored in memory
var _inputNoMem = new Set([
  "csv",
  "ndjson",
  "ndslon",
  "lines",
  "dsv"
])
// --- add extra _inputNoMem here ---
const _addSrcFileExtensionsNoMem = ext => {
    if (!_inputNoMem.has(ext)) {
        _inputNoMem.add(ext)
    } else {
        if (params.debug) printErr("WARN: Extension '" + ext + "' already exists.")
    }
}

// --- Input functions processing per line
var _inputLineFns = {
    "lines": (r, options) => {
        params.linesjoin = _$(toBoolean(params.linesjoin), "linesjoin").isBoolean().default(false)

        if (!params.linesjoin && isBoolean(r)) {
            if (r.trim().length == 0) {
                noFurtherOutput = true
                return
            }
            if (r.trim().length > 0) {
                r = r.trim().split(/\r?\n/)
            }
            _$o(r, options, true)
            noFurtherOutput = true
        } else {
            return true
        }
    },
    "javagc": (r, options) => {
        params.javagcjoin = _$(toBoolean(params.javagcjoin), "javagcjoin").isBoolean().default(false)

        if (params.javagcjoin) return true

        if (isUnDef(global.__javagc_buffer) || global.__javagc_buffer.length > 1048576) global.__javagc_buffer = ""
        
        let _procLine = _event => {
            try {
                let regexes = [
                    // JDK 8 Allocation Failure (adjusted to handle multiline events)
                    /([^ ]+) (\d+\.\d+): \[GC \((.*?)\)(.+?)\[PSYoungGen: (\d+K)->(\d+K)\(.*?\)\] (\d+K)->(\d+K)\(.*?\), (\d+\.\d+) secs\] \[Times: user=(\d+\.\d+) sys=(\d+\.\d+), real=(\d+\.\d+) secs\]/s,
                    // JDK 8 style regexes
                    /([^ ]+) (\d+\.\d+): \[GC \((.*?)\) \[PSYoungGen: (\d+K)->(\d+K)\(.*?\)\] (\d+K)->(\d+K)\(.*?\), (\d+\.\d+) secs\]/,
                    /([^ ]+) (\d+\.\d+): \[Full GC \((.*?)\) \[PSYoungGen: (\d+K)->(\d+K)\(.*?\)\] \[ParOldGen: (\d+K)->(\d+K)\(.*?\)\] (\d+K)->(\d+K)\(.*?\), \[Metaspace: (\d+K)->(\d+K)\(.*?\)\], (\d+\.\d+) secs\]/,
                    // JDK 8 with +PrintTenuringDistribution
                    /([^ ]+) (\d+\.\d+): \[GC \((.*?)\) \[PSYoungGen: (\d+K)->(\d+K)\(.*?\)\] (\d+K)->(\d+K)\(.*?\), (\d+\.\d+) secs\] \[Times: user=(\d+\.\d+) sys=(\d+\.\d+), real=(\d+\.\d+) secs\]/,
                    // JDK 8 with +PrintHeapAtGC
                    /([^ ]+) (\d+\.\d+): \[Full GC \((.*?)\) \[PSYoungGen: (\d+K)->(\d+K)\(.*?\)\] \[ParOldGen: (\d+K)->(\d+K)\(.*?\)\] (\d+K)->(\d+K)\(.*?\), \[Metaspace: (\d+K)->(\d+K)\(.*?\)\], (\d+\.\d+) secs\] \[Times: user=(\d+\.\d+) sys=(\d+\.\d+), real=(\d+\.\d+) secs\]/,
                    // JDK 9+ style regexes
                    ///\[(\d+\.\d+)s\]\[\w+\]\[gc(?:,\w+)?\]\s*GC\((\d+)\)\s*(.*?)\s+(\d+[KMGT])->(\d+[KMGT])\((\d+[KMGT])\)\s+(\d+\.\d+)ms/,
                    ///\[(\d+\.\d+)s\]\[\w+\]\[gc(?:,\w+)?\]\s*GC\((\d+)\)\s*(.*?)\s*Heap:\s*(\d+[KMGT])->(\d+[KMGT])\((\d+[KMGT])\)\s*Metaspace:\s*(\d+[KMGT])->(\d+[KMGT])\((\d+[KMGT])\)\s*(\d+\.\d+)ms/,
                    /^\[(.+)\]\s+GC\((\d+)\)\s*(.*?)\s*(\d+[GMK])->(\d+[GMK])\((\d+[GMK])\)\s*(\d+\.\d+)ms/,
                    ///\[(\d+\.\d+)s\]\[\w+\]\[gc,\w+\]\s*GC\((\d+)\)\s*(.*?)\s*Heap:\s*(\d+[GMK])->(\d+[GMK])\((\d+[GMK])\)\s*Metaspace:\s*(\d+[GMK])->(\d+[GMK])\((\d+[GMK])\)\s*(\d+\.\d+)ms/,
                    /^\[(.+)\]\s+GC\((\d+)\)\s*(.*?)\s*Metaspace:\s*(\d+[GMK])\((\d+[GMK])\)->(\d+[GMK])\((\d+[GMK])\)\s*NonClass:\s*(\d+[GMK])\((\d+[GMK])\)->(\d+[GMK])\((\d+[GMK])\)\s*Class:\s*(\d+[GMK])\((\d+[GMK])\)->(\d+[GMK])\((\d+[GMK])\)/,
                    // JDK 9+ Allocation Failure
                    /^\[(.+)\]\s+GC\((\d+)\)\s*(Allocation Failure)\s*(.*?)\s+(\d+[KMGT])->(\d+[KMGT])\((\d+[KMGT])\)\s+(\d+\.\d+)ms/,
                ]

                for (let index = 0; index < regexes.length; index++) {
                    let regex = regexes[index]
                    let match = _event.match(regex)
                    if (match) {
                        let result = {}

                        if (_event.startsWith('[')) {
                            // JDK 9+ style parsing
                            var heads = match[1].split("][")
                            heads.forEach(head => {
                                if (head.match(/^\d+\.\d+s$/)) {
                                    result.sinceStart = parseFloat(head.replace(/s$/, ""))
                                } else if (head.match(/\d{4}-\d{2}-\d{2}T/)) {
                                    result.timestamp = ow.format.toDate(head, "yyyy-MM-dd'T'HH:mm:ss.SSSZ")
                                }
                            })
                            //result.index = index
                            result.gcId = parseInt(match[2])
                            result.gcType = match[3].trim()
                            if (result.gcType == "") result.gcType = "none"
                            result.durationSecs = parseFloat(match[match.length - 1]) / 1000 // convert ms to secs

                            if (index === 5) {
                                // Match for GC pause with heap info
                                result.heapBeforeGC = ow.format.fromBytesAbbreviation(match[4] + "B")
                                result.heapAfterGC = ow.format.fromBytesAbbreviation(match[5] + "B")
                                result.heapTotal = ow.format.fromBytesAbbreviation(match[6] + "B")
                            } else if (index > 5) {
                                if (index == 6) {
                                    result.metaUsedBeforeGC = ow.format.fromBytesAbbreviation(match[4] + "B")
                                    result.metaTotalBeforeGC = ow.format.fromBytesAbbreviation(match[5] + "B")
                                    result.metaUsedAfterGC = ow.format.fromBytesAbbreviation(match[6] + "B")
                                    result.metaTotalAfterGC = ow.format.fromBytesAbbreviation(match[7] + "B")
                                    result.nonClassUsedBeforeGC = ow.format.fromBytesAbbreviation(match[8] + "B")
                                    result.nonClassTotalBeforeGC = ow.format.fromBytesAbbreviation(match[9] + "B")
                                    result.nonClassUsedAfterGC = ow.format.fromBytesAbbreviation(match[10] + "B")
                                    result.nonClassTotalAfterGC = ow.format.fromBytesAbbreviation(match[11] + "B")
                                    result.classUsedBeforeGC = ow.format.fromBytesAbbreviation(match[12] + "B")
                                    result.classTotalBeforeGC = ow.format.fromBytesAbbreviation(match[13] + "B")
                                    result.classUsedAfterGC = ow.format.fromBytesAbbreviation(match[14] + "B")
                                    result.classTotalAfterGC = ow.format.fromBytesAbbreviation(match[15] + "B")
                                } else {
                                    result.heapBeforeGC = ow.format.fromBytesAbbreviation(match[4] + "B")
                                    result.heapAfterGC = ow.format.fromBytesAbbreviation(match[5] + "B")
                                    result.heapTotal = ow.format.fromBytesAbbreviation(match[6] + "B")
                                }
                            }
                        } else {
                            // JDK 8 style parsing
                            //result.index = index
                            result.timestamp = ow.format.toDate(match[1], "yyyy-MMdd'T'HH:mm:ss.SSSZ")
                            result.sinceStart = parseFloat(match[2])
                            result.gcType = match[3]
                            result.durationSecs = parseFloat(match[match.length - 1])

                            if (index === 0 || index === 6) {
                                result.PSYoungGenBeforeGC = ow.format.fromBytesAbbreviation(match[4] + "B")
                                result.PSYoungGenAfterGC = ow.format.fromBytesAbbreviation(match[5] + "B")
                                result.beforeGC = ow.format.fromBytesAbbreviation(match[6] + "B")
                                result.afterGC = ow.format.fromBytesAbbreviation(match[7] + "B")
                                if (index === 6 && _event.includes("Allocation Failure")) {
                                    result.gcCause = "Allocation Failure"
                                }
                            } else if (index === 1 || index === 3) {
                                result.PSYoungGenBeforeGC = ow.format.fromBytesAbbreviation(match[4] + "B")
                                result.PSYoungGenAfterGC = ow.format.fromBytesAbbreviation(match[5] + "B")
                                result.ParOldGenBeforeGC = ow.format.fromBytesAbbreviation(match[6] + "B")
                                result.ParOldGenAfterGC = ow.format.fromBytesAbbreviation(match[7] + "B")
                                result.beforeGC = ow.format.fromBytesAbbreviation(match[8] + "B")
                                result.afterGC = ow.format.fromBytesAbbreviation(match[9] + "B")
                                result.metaspaceBeforeGC = ow.format.fromBytesAbbreviation(match[10] + "B")
                                result.metaspaceAfterGC = ow.format.fromBytesAbbreviation(match[11] + "B")
                            } else if (index === 2) {
                                // Match for GC with +PrintTenuringDistribution
                                result.PSYoungGenBeforeGC = ow.format.fromBytesAbbreviation(match[4] + "B")
                                result.PSYoungGenAfterGC = ow.format.fromBytesAbbreviation(match[5] + "B")
                                result.beforeGC = ow.format.fromBytesAbbreviation(match[6] + "B")
                                result.afterGC = ow.format.fromBytesAbbreviation(match[7] + "B")
                                result.userTime = parseFloat(match[8])
                                result.sysTime = parseFloat(match[9])
                                result.realTime = parseFloat(match[10])
                            } else if (index === 6) {
                                // Adjusted Allocation Failure parsing
                                result.PSYoungGenBeforeGC = ow.format.fromBytesAbbreviation(match[5] + "B")
                                result.PSYoungGenAfterGC = ow.format.fromBytesAbbreviation(match[6] + "B")
                                result.beforeGC = ow.format.fromBytesAbbreviation(match[7] + "B")
                                result.afterGC = ow.format.fromBytesAbbreviation(match[8] + "B")
                                result.durationSecs = parseFloat(match[9])
                                if (match[10]) {
                                    result.userTime = parseFloat(match[10])
                                    result.sysTime = parseFloat(match[11])
                                    result.realTime = parseFloat(match[12])
                                }
                                result.gcCause = "Allocation Failure"
                            }
                        }
                        return result
                    }
                }
            } catch (e) {
                printErr(e)
                _exit(-2, "Error parsing Java GC log: " + e)
            }
        }

        global.__javagc_buffer += r
        var _res = _procLine(r)
        if (isMap(_res)) {
            _$o(_res, options, true)
            global.__javagc_buffer = ""
        }
    },
    "ndjson": (r, options) => {
        params.ndjsonjoin = _$(toBoolean(params.ndjsonjoin), "ndjsonjoin").isBoolean().default(false)
        
        if (!params.ndjsonjoin) {
            if (isUnDef(global.__ndjsonbuf) && r.length != 0 && r.trim().startsWith("{")) global.__ndjsonbuf = ""
            if (isDef(global.__ndjsonbuf)) {
                if (r.length != 0 && !r.trim().endsWith("}")) { global.__ndjsonbuf += r.trim(); return }
                if (global.__ndjsonbuf.length > 0) { r = global.__ndjsonbuf + r; global.__ndjsonbuf = __ }
            }
            if (r.length == 0 || r.length > 0 && r.trim().substring(0, 1) != "{") { 
                _$o(jsonParse(global.__ndjsonbuf, __, __, true), options, true)
                noFurtherOutput = true
                global.__ndjsonbuf = __
                return 
            }
            _$o(jsonParse(r, __, __, true), options, true)
            noFurtherOutput = true
        } else {
            return true
        }
    },
    "ndslon": (r, options) => {
        params.ndslonjoin = _$(toBoolean(params.ndslonjoin), "ndslonjoin").isBoolean().default(false)
        
        if (!params.ndslonjoin) {
            if (isUnDef(global.__ndslonbuf) && r.length != 0 && r.trim().startsWith("(")) global.__ndslonbuf = ""
            if (isDef(global.__ndslonbuf)) {
                if (r.length != 0 && !r.trim().endsWith(")")) { global.__ndslonbuf += r.trim(); return }
                if (global.__ndslonbuf.length > 0) { r = global.__ndslonbuf + r; global.__ndslonbuf = __ }
            }
            if (r.length == 0 || r.length > 0 && r.trim().substring(0, 1) != "(") { 
                _$o(af.fromSLON(global.__ndslonbuf), options, true)
                noFurtherOutput = true
                global.__ndslonbuf = __
                return 
            }
            _$o(af.fromSLON(String(r)), options, true)
            noFurtherOutput = true
        } else {
            return true
        }
    },
    "dsv": (r, options) => {
        if (isUnDef(params.indsvsep)) params.indsvsep = ","
        if (isUnDef(params.indsvsepre)) params.indsvsepre = __
        if (isUnDef(params.indsvquote)) params.indsvquote = "\""
        if (isUnDef(params.indsvescape)) params.indsvescape = "\\"
        if (isUnDef(params.indsvcomment)) params.indsvcomment = "#"
        if (isUnDef(params.indsvheader)) params.indsvheader = true
        if (isUnDef(params.indsvtrim)) params.indsvtrim = true
        if (isUnDef(params.indsvjoin)) params.indsvjoin = false
        if (isUnDef(params.indsvfields)) params.indsvfields = __

        if (isString(params.indsvfields)) params.indsvfields = params.indsvfields.trim().split(",").map(f => f.trim())
        if (isDef(params.indsvfields) && !isArray(params.indsvfields)) params.indsvfields = __

        var _dsvmap = rs => {
            var _r = {}
            params.indsvfields.forEach((f, i) => {
                _r[f] = rs[i]
            })
            return _r
        }

        var _dsvproc = rs => {
            if (isUnDef(rs) || rs.length == 0) return __

            if (toBoolean(params.indsvheader)) {
                if (isUnDef(params.indsvfields)) {
                    if (isUnDef(params.indsvsepre)) {
                        params.indsvfields = rs.trim().split(params.indsvsep)
                    } else {
                        params.indsvfields = rs.trim().split(new RegExp(params.indsvsepre))
                    }
                    params.indsvfields = params.indsvfields.map(f => {
                        if (params.indsvtrim) f = f.trim()
                        if (params.indsvquote && f.startsWith(params.indsvquote) && f.endsWith(params.indsvquote)) {
                            f = f.substring(1, f.length - 1)
                        }
                        if (params.indsvescape) {
                            f = f.replace(new RegExp(params.indsvescape + params.indsvquote, "g"), params.indsvquote)
                        }
                        return f
                    })
                    return __
                }
            }

            var _r = {}
            if (isString(rs)) {
                if (isUnDef(params.indsvsepre)) {
                    _r = pForEach(rs.split(params.indsvsep), s => {
                        if (params.indsvtrim) s = s.trim()
                        if (params.indsvquote && s.startsWith(params.indsvquote) && s.endsWith(params.indsvquote)) {
                            s = s.substring(1, s.length - 1)
                        }
                        if (params.indsvescape) {
                            s = s.replace(new RegExp(params.indsvescape + params.indsvquote, "g"), params.indsvquote)
                        }
                        return s
                    })
                } else {
                    _r = pForEach(rs.split(new RegExp(params.indsvsepre)), s => {
                        if (params.indsvtrim) s = s.trim()
                        if (params.indsvquote && s.startsWith(params.indsvquote) && s.endsWith(params.indsvquote)) {
                            s = s.substring(1, s.length - 1)
                        }
                        if (params.indsvescape) {
                            s = s.replace(new RegExp(params.indsvescape + params.indsvquote, "g"), params.indsvquote)
                        }
                        return s
                    })
                }
                return _dsvmap(_r)
            }
        }

        if (!params.indsvjoin) {
            r = String(r)
            if (r.length > 0 && r.trim().substring(0, 1) != params.indsvcomment) {
                var _rs = _dsvproc(r)
                if (isDef(_rs)) _$o(_rs, options, true)
                return true
            }
        } else {
            return true
        }
    }
}
// --- add extra _inputLineFns here ---
const _addSrcInputLineFns = (type, fn) => {
    if (isUnDef(_inputLinesFns[type])) {
        _inputLineFns[type] = fn
    } else {
        if (params.debug) printErr("WARN: Input type '" + type + "' already exists.")
    }
}

// --- Transform functions
if (typeof _resolveLLMEnvName === "undefined") {
    var _resolveLLMEnvName = function (aEnv) {
        var _env = aEnv
        if (_env == "OAFP_MODEL" && isUnDef(getEnv("OAFP_MODEL")) && isDef(getEnv("OAF_MODEL"))) {
            _env = "OAF_MODEL"
        }
        return _env
    }
}

var _transformFns = {
    "transforms"    : _r => {
        if (toBoolean(params.transforms)) {
            var _t = Object.keys(_transformFns).filter(r => r != 'transforms').sort()
            return _t
        }
    },
    "cmlt"    : r => {
        if (toBoolean(params.cmlt)) {
            var _r = (isArray(r) ? r : [ r ])
            params.cmltch = _$(params.cmltch, "cmltch").or().isString().isMap().default("(type: simple)")
            let cmltch = _fromJSSLON(params.cmltch)
            if (isMap(cmltch)) {
                if (isUnDef(cmltch.type)) _exit(-1, "cmltch.type is not defined.")
                if (isDef(cmltch.lib)) loadLib(cmltch.lib)
                if ($ch().list().indexOf("oafp::cmltdata") < 0) {
                    if (cmltch.type == "remote") {
                        $ch("oafp::cmltdata").createRemote(cmltch.url)
                    } else {
                        $ch("oafp::cmltdata").create(cmltch.type, cmltch.options)
                    }
                    let _sz = Number(_$(params.cmltsize, "cmltsize").isNumber().default(100)) - 1
                    if (_sz > 0) $ch("oafp::cmltdata").subscribe(ow.ch.utils.getHousekeepSubscriber("oafp::cmltdata", _sz))
                }

                _r.forEach(_rt => $ch("oafp::cmltdata").set({ t: nowNano() }, _rt))
                return $ch("oafp::cmltdata").getAll()
            } else {
                _exit(-1, "Invalid cmltch parameter")
            }
        }
    },
    "diff": _r => {
        var _d = _fromJSSLON(params.diff)
        if (isMap(_d)) {
            if (!((isDef(_d.a) && isDef(_d.b)))) _exit(-1, "diff.a path and diff.b path are required.")

            loadDiff() 
            let _d1 = $path(_r, _d.a), _d2 = $path(_r, _d.b), _dt = __
            if (toBoolean(params.color)) {
                if (isUnDef(params.difftheme) && isDef(getEnv("OAFP_DIFFTHEME"))) params.difftheme = getEnv("OAFP_DIFFTHEME")
                _dt = _fromJSSLON(_$(params.difftheme, "difftheme").or().isString().isMap().default(""))
                _dt = merge({
                    added  : "GREEN",
                    removed: "RED",
                    common : "FAINT",
                    linenum: "ITALIC",
                    linediv: "FAINT",
                    linesep: "|"
                }, _dt)
            }

            let _f = (s, e1) => {
                if (toBoolean(params.color)) {
                    if (isUnDef(e1)) e1 = ""
                    var _o = new Set()
                    if (isArray(s)) {
                        let _c = 1
                        let _ssl = toBoolean(params.diffnlines), _mnl = 0
                        if (_ssl) {
                            s.forEach(v => {
                                _mnl += v.value.split("\n").length
                            })
                            _mnl = String(_mnl).length+1
                        }
                        let _sl = inc => {
                            let _o
                            if (_ssl && e1 != "") {
                                _o = ansiColor(_dt.linenum, (inc > 0 ? $ft("% " + _mnl + "d", _c) : " ".repeat(_mnl)) ) + ansiColor(_dt.linediv, `${_dt.linesep}`)
                            } else {
                                _o = ""
                            }
                            _c += inc
                            return _o
                        }
                        s.forEach((sr, i) => {
                            var _v = sr.value
                            if (isString(_v)) {
                                if (e1 != "") {
                                    _v = _v.split(e1)
                                    if (_v[_v.length - 1] == "") _v.pop()
                                } else {
                                    _v = [ _v ]
                                }
                            }
                            _o.add( (sr.added   ? _v.map(_l => _sl(1) + ansiColor(_dt.added,   (e1 != "" ? "+" : "") + _l) ).join(ansiColor("RESET", e1)) :
                                     sr.removed ? _v.map(_l => _sl(0) + ansiColor(_dt.removed, (e1 != "" ? "-" : "") + _l) ).join(ansiColor("RESET", e1)) :
                                                  _v.map(_l => _sl(1) + ansiColor(_dt.common,  (e1 != "" ? " " : "") + _l) ).join(ansiColor("RESET", e1)) ))
                        })
                    }
                    return Array.from(_o).join(ansiColor("RESET", e1))
                }
                
                return $from(s).select({count:__,added:false,removed:false,value:[]})
            }

            if (isString(_d1) && isString(_d2)) {
                if (toBoolean(params.diffwords)) {
                    return _f(JsDiff.diffWords(_d1, _d2, _d.options))
                } else if (toBoolean(params.diffwordswithspace)) {
                    return _f(JsDiff.diffWordsWithSpace(_d1, _d2, _d.options))
                } else if (toBoolean(params.difflines)) {
                    return _f(JsDiff.diffLines(_d1, _d2, _d.options), "\n")
                } else if (toBoolean(params.diffsentences)) {
                    return _f(JsDiff.diffSentences(_d1, _d2, _d.options), "\n")
                } else {
                    return _f(JsDiff.diffChars(_d1, _d2, _d.options))
                }
            } else {
                if (isArray(_d1) && isArray(_d2) && !toBoolean(params.color)) {
                    return _f(JsDiff.diffArrays(_d1, _d2, _d.options))
                } else {
                    return _f(JsDiff.diffJson(_d1, _d2, _d.options), "\n")
                }
            }
        }
    },
    "jsonschemagen" : _r => {
        if (toBoolean(params.jsonschemagen)) {
            ow.loadObj()
            var _js = ow.obj.schemaGenerator(_r)
            return _js
        }
    },
    "jsonschemacmd" : r => {
        return _transformFns["jsonschema"](r)
    },
    "jsonschema": r => {
        if (!isMap(r)) _exit(-1, "jsonschema is only supported with a map.")
        if (isUnDef(params.jsonschema) && isUnDef(params.jsonschemacmd)) _exit(-1, "You need to provide a jsonschema=someFile.json or jsonschemacmd=someCommand")
        
        ow.loadObj()
        var _s
        if (isDef(params.jsonschemacmd)) {
            var _cmd = $sh(params.jsonschemacmd).getJson(0)
            if (_cmd.exitcode == 0)
                _s = _cmd.stdout
            else
                _exit(-1, "Error executing the command '" + params.jsonschemacmd + "': " + _cmd.stderr)
        } else {
            _s = io.readFileJSON(params.jsonschema)
        }
        if (!isMap(_s)) _exit(-1, "The schema provided is not a valid JSON schema.")
        ow.obj.schemaInit({allErrors: true})
        var validate = ow.obj.schemaCompile(_s)
        var res = validate(r)
        return { valid: res, errors: validate.errors}
    },
    "sortmapkeys"   : _r => {
        if (toBoolean(params.sortmapkeys) && isObject(_r)) {
            let _sortMapKeys = (aMap, moreLevels) => {
                let keys = Object.keys(aMap).sort()
                let result = {}
            
                for(let i = 0; i < keys.length; i++) {
                    let key = keys[i]
                    let value = aMap[key]
            
                    if (Array.isArray(value)) {
                        result[key] = value.map(item => {
                            if (typeof item === 'object' && item !== null && item !== undefined) {
                                return sortMapKeys(item, moreLevels)
                            } else {
                                return item
                            }
                        })
                    } else if (moreLevels && typeof value === 'object' && value !== null && value !== undefined) {
                        result[key] = _sortMapKeys(value, moreLevels)
                    } else {
                        result[key] = value
                    }
                }
            
                return result
            }
            return _sortMapKeys(_r, true)
        } else {
            return _r
        }
    },
    "searchkeys"    : _r => (isObject(_r) ? searchKeys(_r, params.searchkeys) : _r),
    "searchvalues"  : _r => (isObject(_r) ? searchValues(_r, params.searchvalues) : _r),
    "maptoarray"    : _r => (toBoolean(params.maptoarray) && isMap(_r) ? $m4a(_r, params.maptoarraykey) : _r),
    "arraytomap"    : _r => (toBoolean(params.arraytomap) && isArray(_r) ? $a4m(_r, params.arraytomapkey, toBoolean(params.arraytomapkeepkey)) : _r),
    "flatmap"       : _r => (toBoolean(params.flatmap) && isObject(_r) ? ow.loadObj().flatMap(_r, params.flatmapsep) : _r),
    "merge"         : _r => {
        if (toBoolean(params.merge) && isArray(_r) && _r.length > 1) {
            var _rr
            for(var i = 0; i < _r.length; i++) {
                _rr = ( i == 0 ? _r[i] : merge(_rr, _r[i]) )
            }
            return _rr
        } else {
            return _r
        }
    },
    "correcttypes"  : _r => {
        if (toBoolean(params.correcttypes) && isObject(_r)) {
            traverse(_r, (aK, aV, aP, aO) => {
                switch(descType(aV)) {
                case "number": if (isString(aV)) aO[aK] = Number(aV); break
                case "string": 
                    // String boolean
                    if (aV.trim().toLowerCase() == "true" || aV.trim().toLowerCase() == "false") { aO[aK] = toBoolean(aV); break }
                    // String ISO date
                    if (isDef(ow.format.fromISODate)) {
                        if (aV.trim().match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\d+Z$/)) { aO[aK] = ow.format.fromISODate(aV); break }
                    } else {
                        if (aV.trim().match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)) { aO[aK] = new Date(aV); break }
                    }
                    // String date
                    if (aV.trim().match(/^\d{4}-\d{2}-\d{2}$/)) { aO[aK] = new Date(aV); break }
                    // String time with seconds
                    if (aV.trim().match(/^\d{2}:\d{2}:\d{2}$/)) { aO[aK] = new Date(aV); break }
                    // String time without seconds
                    if (aV.trim().match(/^\d{2}:\d{2}$/)) { aO[aK] = new Date(aV); break }
                    break
                }
            })
        }
        return _r
    },
    "removenulls": _r => {
        if (toBoolean(params.removenulls)) {
            traverse(_r, (aK, aV, aP, aO) => {
                if (isNull(aV) || isUnDef(aV)) delete aO[aK]
            })
        }
        return _r
    },
    "removeempty": _r => {
        if (toBoolean(params.removeempty)) {
            if (isArray(_r)) {
                return _r.filter(r => isDef(r) && !isNull(r))
            }
        }
        return _r
    },
    "trim": _r => {
        if (toBoolean(params.trim)) {
            traverse(_r, (aK, aV, aP, aO) => {
                if (isString(aV)) aO[aK] = aV.trim()
            })
        }
        return _r
    },
    "removedups": _r => {
        if (toBoolean(params.removedups)) {
            if (isArray(_r)) {
                var _dups = new Set()
                var _r2 = []
                _r.forEach(r => {
                    var rs = r
                    if (isObject(r)) rs = sortMapKeys(rs)
                    rs = stringify(rs, __, true)
                    if (!_dups.has(rs)) {
                        _dups.add(rs)
                        _r2.push(r)
                    }
                })
                return _r2
            } else {
                _exit(-1, "removedups is only supported for arrays")
            }
        }
        return _r
    },
    "llmprompt": _r => {
        if (isString(params.llmprompt)) {
            params.llmenv     = _$(params.llmenv, "llmenv").isString().default("OAFP_MODEL")
            params.llmenv     = _resolveLLMEnvName(params.llmenv)
            params.llmoptions = _$(params.llmoptions, "llmoptions").isString().default(__)
            if (isUnDef(params.llmoptions) && !isString(getEnv(params.llmenv)))
                _exit(-1, "llmoptions not defined and " + params.llmenv + " not found.")

            var res = $llm( _getSec(isDef(params.llmoptions) ? params.llmoptions : $sec("system", "envs").get(params.llmenv)) )
            if (isDef(params.llmconversation) && io.fileExists(params.llmconversation)) 
                res.getGPT().setConversation(io.readFileJSON(params.llmconversation))
            var type = "json", shouldStr = true
            if (isString(params.in)) {
                if (params.in == "md") {
                    type = "markdown"
                    shouldStr = false
                }
                if (params.in == "mdtable") {
                    type = "markdown table"
                    shouldStr = false
                }
                if (params.in == "hsperf") type = "java hsperf file"
                if (params.in == "raw") {
                    type = "raw"
                    shouldStr = false
                }
            }
            
            res = res.withContext(shouldStr ? stringify(_r,__,true) : _r, (isDef(params.llmcontext) ? params.llmcontext : `${type} input data`))
            if (isString(params.out)) {
                if (params.out == "md" || params.out == "mdtable" || params.out == "raw") {
                    //cprint(res.getGPT().getConversation())
                    let _res = res.prompt(params.llmprompt)
                    if (isDef(params.llmconversation)) io.writeFileJSON( params.llmconversation, res.getGPT().getConversation(), "" )
                    return _res
                }
            }
            let _res = res.promptJSON(params.llmprompt)
            if (isDef(params.llmconversation)) io.writeFileJSON( params.llmconversation, res.getGPT().getConversation(), "" )
            return _res
        }
        return _r
    },
    "splitlines": _r => { 
        if (toBoolean(params.splitlines) && isString(_r)) return _r.split(/\r?\n/)
        return _r
    },
    "regression": _r => {
        if (isString(params.regression)) {
            ow.loadAI()
            var rg = ow.ai.regression()
            let regressionpath    = _$(params.regressionpath, "regressionpath").isString().default("@")
            let regressionoptions = _fromJSSLON(_$(params.regressionoptions, "regressionoptions").or().isString().isMap().default("{order:2,precision:5}"))
            let _data = $path(_r, regressionpath)
            if (isArray(_data)) {
                if (isString(params.regressionx)) {
                    let _datax = $path(_r, params.regressionx)
                    _data = _data.map((v, i) => ([ _datax[i], v ]))
                } else {
                    _data = _data.map((v, i) => ([ i+1, v ]))
                }
                let _rr
                switch(params.regression) {
                case "exp"   : _rr = rg.exponential(_data, regressionoptions); break
                case "poly"  : _rr = rg.polynomial(_data, regressionoptions); break
                case "power" : _rr = rg.power(_data, regressionoptions); break
                case "log"   : _rr = rg.logarithmic(_data, regressionoptions); break
                case "linear": 
                default      : _rr = rg.linear(_data, regressionoptions); break
                }

                if (isDef(_rr) && isDef(_rr.points)) {
                    if (isString(params.regressionforecast)) {
                        var _f = $path(_r, params.regressionforecast)
                        if (isArray(_f)) {
                            _f.forEach(x => {
                                _rr.points.push(_rr.predict(x))
                            })
                        } else {
                            _exit(-1, "Invalid array of x for regression forecast")
                        }
                    }
                    return _rr.points.map(p => ({ x: p[0], y: p[1] }))
                } else {
                    return _rr
                }
            } else {
                _exit(-1, "Invalid data for regression analysis")
            }
        }
        return _r
    },
    "normalize": _r => {
        if (isString(params.normalize) || isMap(params.normalize)) {
            var _s = _fromJSSLON(params.normalize)
            if (isMap(_s)) {
                ow.loadAI()
                if (isMap(_r))   return ow.ai.normalize.withSchema(_r, _s, true)
                if (isArray(_r)) return _r.map(r => ow.ai.normalize.withSchema(r, _s, true))
            } else {
                _exit(-1, "Invalid normalize schema")
            }
        } else {
            _exit(-1, "Invalid normalize schema")
        }
    },
    "denormalize": _r => {
        if (isString(params.denormalize) || isMap(params.denormalize)) {
            var _s = _fromJSSLON(params.denormalize)
            if (isMap(_s)) {
                ow.loadAI()
                if (isUnDef(ow.ai.normalize.denormalizeWithSchema)) _exit(-1, "This version of OpenAF does not support denormalizeWithSchema")
                
                if (isMap(_r))   return ow.ai.normalize.denormalizeWithSchema(_r, _s, false)
                if (isArray(_r)) return _r.map(r => ow.ai.normalize.denormalizeWithSchema(r, _s, false))
            } else {
                _exit(-1, "Invalid denormalize schema")
            }
        } else {
            _exit(-1, "Invalid denormalize schema")
        }
    },
    "kmeans": _r => {
        if (!isNumber(params.kmeans)) params.kmeans = 5
        if (!isArray(_r)) _exit(-1, "For kmeans transform you need to provide an array as input")
        ow.loadAI()
        var _kmeans = ow.ai.cluster({ type: "kmeans", numberOfClusters: Number(params.kmeans) })
        return _kmeans.classify(_r)
    },
    "getlist": _r => {
        if (isObject(_r) && (toBoolean(params.getlist) || isNumber(params.getlist)) ) {
            var found = false, _nr, num = isNumber(params.getlist) ? params.getlist : 1
            traverse(_r, (aK, aV, aP, aO) => {
                if (!found && isArray(aV)) {
                    num--
                    if (num == 0) found = true
                    _nr = aV
                }
            })
            if (found)
                return _nr
            else
                return _r
        }
    },
    "set": _r => {
        var _d = _fromJSSLON(params.set)

        if (!isMap(_d) && isUnDef(_d.a) && isUnDef(_d.b)) _exit(-1, "set.a path and set.b path are required.")
        if (isUnDef(pForEach)) _exit(-1, "This version of OpenAF does not support the set transform")
        if (!isString(_d.a)) _exit(-1, "set.a path is not a string.")
        if (!isString(_d.b)) _exit(-1, "set.b path is not a string.")

        let _d1 = $path(_r, _d.a), _d2 = $path(_r, _d.b)
        if (!isArray(_d1)) _exit(-1, "set.a path result is not an array.")
        if (!isArray(_d2)) _exit(-1, "set.b path result is not an array.")

        let toOrdStr, toOrdStrs
        if (isString(params.setkeys)) {
            ow.loadObj()
            var _ks = params.setkeys.split(",").map(r => r.trim())
            toOrdStr  = r => stringify(isObject(r) ? sortMapKeys(ow.obj.filterKeys(_ks, r), true) : r, __, "")
            toOrdStrs = r => pForEach(r, toOrdStr).reduce((pV, cV) => pV.concat(cV), [])
        } else {
            toOrdStr  = r => stringify(isObject(r) ? sortMapKeys(r, true) : r, __, "")
            toOrdStrs = r => pForEach(r, toOrdStr).reduce((pV, cV) => pV.concat(cV), [])
        }

        switch(params.setop) {
        case "union"    :
            let ca = new Set(toOrdStrs(_d1))
            return _d1.concat(_d2.filter(r => !ca.has(toOrdStr(r))))
        case "diffa"    :
            let cb2 = new Set(toOrdStrs(_d2))
            return _d1.filter(r => !cb2.has(toOrdStr(r)))
        case "diffb"    :
            let cb3 = new Set(toOrdStrs(_d1))
            return _d2.filter(r => !cb3.has(toOrdStr(r)))
        case "diffab"   :
            let cb4 = new Set(toOrdStrs(_d1))
            let cb5 = new Set(toOrdStrs(_d2))
            return _d1.filter(r => !cb5.has(toOrdStr(r))).concat(_d2.filter(r => !cb4.has(toOrdStr(r))))
        case "diff"     :
            let cb6 = new Set(toOrdStrs(_d1))
            let cb7 = new Set(toOrdStrs(_d2))
            return            _d1.map(r => Object.assign({ '*': cb7.has(toOrdStr(r)) ? __ : "a" }, r))
                      .concat(_d2.map(r => Object.assign({ '*': cb6.has(toOrdStr(r)) ? __ : "b" }, r)))
                      .filter(r => isDef(r['*']))
        case "intersect":
        default         :
            let cb1 = new Set(toOrdStrs(_d2))
            return _d1.filter(r => cb1.has(toOrdStr(r)))
        }
    },
    "forcearray": _r => {
        if (isMap(_r))
            return [ _r ]
        else
            return _r
    },
    "spacekeys": _r => {
        if (isMap(_r)) {
            traverse(_r, (aK, aV, aP, aO) => {
                if (aK.indexOf(" ") >= 0) {
                    aO[aK.replace(/ /g, params.spacekeys || "_")] = aV
                    delete aO[aK]
                }
            })
        }
        return _r
    },
    "numformat": _r => {
        traverse(_r, (aK, aV, aP, aO) => {
            if (isTNumber(aV) && isString(params.numformat)) {
                aO[aK] = $ft(params.numformat, aV)
            }
        })
        return _r
    },
    "xjs": _r => {
        if (isString(params.xjs)) {
            if (io.fileExists(params.xjs)) {
                var _t = io.readFileString(params.xjs)
                if (isString(_t)) {
                    var _f = new Function("args", _t + "; return args")
                    return _f(_r)
                }
            }
        }
        return _r
    },
    "xpy": _r => {
        if (isString(params.xpy)) {
            if (io.fileExists(params.xpy)) {
                let __r = $py(params.xpy, { args: _r}, ["args"])
                $pyStop()
                return __r
            }
        }
        return _r
    },
    "xfn": _r => {
        if (isString(params.xfn)) {
            var _f = new Function("args", "return " + params.xfn)
            return _f(_r)
        }
    },
    "xrjs": _r => {
        if (isString(params.xrjs) && isArray(_r)) {
            if (io.fileExists(params.xrjs)) {
                let _t = io.readFileString(params.xrjs)
                if (isString(_t)) {
                    let _f = new Function("args", _t + "; return args")
                    return pForEach(_r, _f)
                }
            }
        }
        return _r
    },
    "xrpy": _r => {
        if (isString(params.xrpy) && isArray(_r)) {
            if (io.fileExists(params.xrpy)) {
                $pyStart()
                let __r = pForEach(_r, r => $py(params.xrpy, { args: r}, ["args"]) )
                $pyStop()
                return __r
            }
        }
        return _r
    },
    "xrfn": _r => {
        if (isString(params.xrfn) && isArray(_r)) {
            let _f = new Function("args", "return " + params.xrfn)
            return pForEach(_r, _f)
        }
        return _r
    },
    "val2icon": _r => {
        let _t = {
            d: [ "🕳️", "✅", "❌" ],
            s: [ "╍", "✓", "✕" ]
        }
        if (isDef(params.val2icon)) {
            var th
            switch(params.val2icon) {
            case "simple": th = _t.s; break
            default      :
            case "default": th = _t.d; break
            }

            traverse(_r, (aK, aV, aP, aO) => {
                if (isUnDef(aV) || isNull(aV)) {
                    aO[aK] = th[0]
                } else {
                    if (isBoolean(aV)) {
                        aO[aK] = aV ? th[1] : th[2]
                    }
                }
            })
        }
        return _r
    },
    "field2date": _r => {
        let _lst = params.field2date.split(",").map(r => r.trim())
        traverse(_r, (aK, aV, aP, aO) => {
            if (_lst.indexOf(aP.length > 0 && !aP.startsWith("[") ? aP.substring(1) + "." + aK : aK) >= 0 && isNumber(aV) && aV > 0) {
                try { aO[aK] = isString(aV) ? ow.format.fromISODate(aV) : new Date(aV) } catch(e) { printErr(e) }
            }
        })
        return _r
    },
    "field2si": _r => {
        let _lst = params.field2si.split(",").map(r => r.trim())
        traverse(_r, (aK, aV, aP, aO) => {
            if (_lst.indexOf(aP.length > 0 && !aP.startsWith("[") ? aP.substring(1) + "." + aK : aK) >= 0 && isNumber(aV)) {
                aO[aK] = ow.format.toAbbreviation(aV)
            }
        })
        return _r
    },
    "field2byte": _r => {
        let _lst = params.field2byte.split(",").map(r => r.trim())
        traverse(_r, (aK, aV, aP, aO) => {
            if (_lst.indexOf(aP.length > 0 && !aP.startsWith("[") ? aP.substring(1) + "." + aK : aK) >= 0 && isNumber(aV)) {
                aO[aK] = ow.format.toBytesAbbreviation(aV)
            }
        })
        return _r
    },
    "field4map": _r => {
        let _lst = params.field4map.split(",").map(r => r.trim())
        traverse(_r, (aK, aV, aP, aO) => {
            if (_lst.indexOf(aP.length > 0 && !aP.startsWith("[") ? aP.substring(1) + "." + aK : aK) >= 0 && isString(aV)) {
                aO[aK] = _fromJSSLON(aV)
            }
        })
        return _r
    },
    "field2str": _r => {
        let _lst = params.field2str.split(",").map(r => r.trim())
        traverse(_r, (aK, aV, aP, aO) => {
            if (_lst.indexOf(aP.length > 0 && !aP.startsWith("[") ? aP.substring(1) + "." + aK : aK) >= 0 && !isString(aV)) {
                aO[aK] = isMap(aO[aK]) || isArray(aO[aK]) ? af.toSLON(aO[aK]) : String(aO[aK])
            }
        })
        return _r
    },
    "allstrings": _r => {
        if (toBoolean(params.allstrings)) {
            traverse(_r, (aK, aV, aP, aO) => {
                if (isDef(aV) && !isString(aV)) {
                    if (isNumber(aV)) {
                        aO[aK] = String(aV)
                    } else if (isBoolean(aV)) {
                        aO[aK] = String(aV)
                    } else if (isNull(aV)) {
                        aO[aK] = ""
                    }
                }
            })
        }
        return _r
    },
    "oaf": _r => {
        if (isString(params.oaf)) {
            let _t
            if (io.fileExists(params.oaf)) {
                _t = io.readFileString(params.oaf)
            } else {
                _t = params.oaf
            }
            if (isString(_t)) {
                let _f = new Function("data", _t + ";return data")
                return _f(_r)
            }
        }
        return _r
    }
}
// --- add extra _transformFns here ---
const _addSrcTransformFns = (type, fn) => {
    if (isUnDef(_transformFns[type])) {
        _transformFns[type] = fn
    } else {
        if (params.debug) printErr("WARN: Transform '" + type + "' already exists.")
    }
}

// --- Output functions
var _outputFns = new Map([
    ["?" , (r, options) => {
        r = Array.from(_outputFns.keys()).filter(r => r != '?').sort()
        _o$o(r, options)
    }],
    ["pm", (r, options) => {
        _o$o(r, options)
    }],
    ["key", (r, options) => {
        _o$o(r, options)
    }],
    ["html", (r, options) => {
        let html, tmpf, res = false

        params.htmlopen = _$(toBoolean(params.htmlopen), "htmlopen").isBoolean().default(true)
        params.htmlwait = _$(params.htmlwait, "htmlwait").isNumber().default(2500)

        if (params.htmlopen) tmpf = io.createTempFile("oafp_", ".html")

        ow.loadTemplate()
        params.htmldark = _$(toBoolean(params.htmldark), "htmldark").isBoolean().default(false)
        if (isString(r)) {
            html = ow.template.html.genStaticVersion(ow.template.parseMD2HTML(r, !toBoolean(params.htmlpart), !toBoolean(params.htmlcompact),__,params.htmldark))
            html = html.replace("<html>", "<html><meta charset=\"utf-8\">")
        } else {
            let _res = ow.template.html.parseMap(r, true, params.htmldark)
            html = "<html><meta charset=\"utf-8\"><style>" + _res.css + "</style><body" + (params.htmldark ? " class=\"njsmap_dark\"" : "") + ">" + _res.out + "</body></html>"
        }
        if (params.htmlopen) {
            io.writeFileString(tmpf, html)
            res = openInBrowser("file:///" + tmpf.replace(/\\/g, "/"))
        }
        if (res) {
            sleep(params.htmlwait, true)
        } else {
            _print(html)
        }
    }],
    ["ctable", (r, options) => {
        _o$o(r, options)
    }],
    ["stable", (r, options) => {
        _o$o(r, options)
    }],
    ["table", (r, options) => {
        _o$o(r, options)
    }],
    ["json", (r, options) => {
        _o$o(r, options)
    }],
    ["yaml", (r, options) => {
        _o$o(r, options)
    }],
    ["cyaml", (r, options) => {
        _o$o(r, options)
    }],
    ["kyaml", (r, options) => {
        _o$o(r, options)
    }],
    ["ckyaml", (r, options) => {
        _o$o(r, options)
    }],
    ["lkyaml", (r, options) => {
        _o$o(r, options)
    }],
    ["clkyaml", (r, options) => {
        _o$o(r, options)
    }],
    ["toon", (r, options) => {
        _o$o(r, options)
    }],
    ["cjson", (r, options) => {
        _o$o(r, options)
    }],
    ["slon", (r, options) => {
        _o$o(r, options)
    }],
    ["cslon", (r, options) => {
        _o$o(r, options)
    }],
    ["ctree", (r, options) => {
        _o$o(r, options)
    }],
    ["tree", (r, options) => {
        _o$o(r, options)
    }],
    ["mtree", (r, options) => {
        if (typeof __flags.TREE.mono == "undefined") options.__format = "ctree"
        _o$o(r, options)
    }],
    ["btree", (r, options) => {
        if (typeof __flags.TREE.mono == "undefined") options.__format = "btree"
        _o$o(r, options)
    }],
    ["res", (r, options) => {
        _o$o(r, options)
    }],
    ["key", (r, options) => {
        _o$o(r, options)
    }],
    ["text", (r, options) => {
        _o$o(r, options)
    }],
    ["csv", (r, options) => {
        _o$o(r, options)
    }],
    ["map", (r, options) => {
        _o$o(r, options)
    }],
    ["md", (r, options) => {
        _o$o((toBoolean(params.mdtemplate) ? $t(r) : r), options)
    }],
    ["log", (r, options) => {
        if (isString(r) && toBoolean(params.logprintall)) {
            _print(r.replace(/\n$/, ""))
        } else {
            var _arr = r
            if (isMap(r)) _arr = [ r ]
            if (isArray(_arr)) {
                if (isUnDef(params.logtheme) && isDef(getEnv("OAFP_LOGTHEME"))) params.logtheme = getEnv("OAFP_LOGTHEME")
                let _lt = _fromJSSLON(_$(params.logtheme, "logtheme").isString().default(""))
                _lt = merge({
                    errorLevel: "RED,BOLD",
                    warnLevel : "YELLOW",
                    timestamp : "BOLD"
                }, _lt)
                var _ltctimestamp  = ansiColor(_lt.timestamp, "").replace("\u001b[m", "")
                var _ltcerrorlevel = ansiColor(_lt.errorLevel, "").replace("\u001b[m", "")
                var _ltcwarnlevel  = ansiColor(_lt.warnLevel, "").replace("\u001b[m", "")
                _arr.forEach(_r => {
                    if (isMap(_r)) {
                        let d = (isDef(_r["@timestamp"]) && isString(_r["@timestamp"]) ? _r["@timestamp"] : __)
                        let l = (isDef(_r.level) ? _r.level : __)
                        let m = (isDef(_r.message) ? _r.message : __)
                        let lineC = ""
                        if (isDef(l)) {
                            if (l.toLowerCase().indexOf("err") >= 0)  lineC = _ltcerrorlevel
                            if (l.toLowerCase().indexOf("warn") >= 0) lineC = _ltcwarnlevel
                        }
                        if (isDef(d) && d.length > 24) d = d.substring(0, 23) + "Z"
                        if (isDef(m) || isDef(d)) _print([_ltctimestamp, d, (isDef(l) ? "\u001b[m | " + lineC + l : ""), "\u001b[m | ", lineC, m, "\u001b[m"].join("") )
                    }
                })
            }
        }
    }],
    ["rawascii", (r, options) => {
        if (isDef(params.rawasciistart) && !isNumber(params.rawasciistart)) _exit(-1, "rawasciistart must be a number")
        if (isDef(params.rawasciiend) && !isNumber(params.rawasciiend)) _exit(-1, "rawasciiend must be a number")
        if (isUnDef(params.rawasciitab) || !isNumber(params.rawasciitab)) params.rawasciitab = 8

        var _s = String(r).split("\x0A")
        var _slo = _s.length
        var _extraLine = 0
        if (isNumber(params.rawasciistart) && params.rawasciistart > 0 && params.rawasciistart <= _slo) {
            _s = _s.slice(params.rawasciistart - 1)
            _extraLine = Number(params.rawasciistart - 1)
        }
        if (isNumber(params.rawasciiend) && params.rawasciiend > 0 && params.rawasciiend < _slo) {
            _s = _s.slice(0, params.rawasciiend - (isNumber(params.rawasciistart - 1) ? params.rawasciistart - 1 : 0))
        }
        var _t
        const _tabsize = params.rawasciitab
        const cReset = "\u001b[m", fg4Underline = "\u001b[4m\u001b[38;5;4m", cFg8 = "\u001b[38;5;8m", cRed = "\u001b[31m", cYellow = "\u001b[4m\u001b[33m"
        const rNV = /[\x00-\x08\x0A-\x1F\x80-\xFF]/g, 
              rFF = /[\u0100-\uFFFF]/g,
              rEnd = /$/,
              rTab = /\t/g,
              rCR = /\r/g,
              rSp = / /g
        if (!toBoolean(params.rawasciinovisual)) {
            _t = pForEach(_s, (_r, i) => {
                if (_r == "") {
                    return i == _s.length - 1 ? __ : [cRed, "␊", cReset].join("")
                }
                // replace non-visual characters by their hex representation
                _r = _r.replace(rNV, c => {
                    return [ fg4Underline, "\\u" + c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase(), cReset ].join("")
                })
                // replace above FF characters by their hex representation
                _r = _r.replace(rFF, c => {
                    return [ cYellow, "\\u" + c.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase(), cReset ].join("")
                })
                // replace CR, LF, TAB and SPACE by their visual representation
                if (i < _s.length - 1) _r = _r.replace(rEnd, [cRed, "␊", cReset].join(""))
                _r = _r.replace(rCR, [cRed, "␍", cReset].join(""))
                // Replace tab (\t) with the correct number of spaces (assuming tab stop every 8 chars)
                var accSpace = 0
                _r = _r.replace(rTab, (match, offset) => {
                    const spaces = _tabsize - ((offset + accSpace) % _tabsize)
                    accSpace += spaces - 1
                    return [ cFg8, (spaces > 2 ? "┈".repeat(spaces - 1) : ""),  "→", cReset].join("")
                }).replace(rSp, [cFg8, "·", cReset].join(""))
                return _r
            }).filter(r => typeof r !== "undefined")
        } else {
            _t = _s
        }

        if (toBoolean(params.rawasciinolinenum)) {
            _print(_t.map(l => l).join("\n"))
        } else {
            const sep = [cFg8, "│", cReset].join(""), maxl = "%" + String(_t.length).length + ".0f"
            _print(_t.map((l, i) => [cFg8, $f(maxl, Number(i+1) + _extraLine), cReset, sep, l].join("")).join("\n"))
        }
    }],
    ["raw", (r, options) => {
        if (isString(r)) {
            _print(r)
        } else {
            _print(stringify(r,__,""))
        }
    }],
    ["lines", (r, options) => {
        if (isArray(r)) {
            r.forEach(_r => _print(_r))
        } else {
            _print(r)
        }
    }],
    ["ini", (r, options) => {
        if (!isString(r)) {
            ow.loadJava()
            var ini = new ow.java.ini()
            _print( ini.put(r).save() )
        }
    }],
    ["toml", (r, options) => {
        if (isUnDef(af.toTOML)) _exit(-1, "TOML support not found.")
        if (isMap(r)) {
            _print( af.toTOML(r) )
        } else if (isArray(r)) {
            _print( af.toTOML({ list: r}) )
        } else {
            return __
        }
    }],
    ["mdyaml", (r, options) => {
        if (isArray(r)) {
            r.forEach((_y, i) => {
                _o$o(_y, merge(options, { __format: "yaml" }))
                if (i < r.length - 1) _print("---\n")
            })
        } else {
            _o$o(r, merge(options, { __format: "yaml" }))
        }
    }],
    ["mdtable", (r, options) => {
        if (isArray(r)) {
            ow.loadTemplate()
            _print( ow.template.md.table(r) )
        }
    }],
    ["template", (r, options) => {
        if (!isString(r)) {
            ow.loadTemplate()
            ow.template.addConditionalHelpers()
            ow.template.addOpenAFHelpers()
            ow.template.addFormatHelpers()
            if (isUnDef(params.template) && isUnDef(params.templatepath)) _exit(-1, "For out=template you need to provide a template=someFile.hbs or templatepath=...")
            params.templatedata = _$(params.templatedata, "templatedata").isString().default("@")
            
            var tmpl
            if (isDef(params.template)) {
                if (toBoolean(params.templatetmpl)) {
                    tmpl = params.template
                } else {
                    tmpl = io.readFileString(params.template)
                }
            } else {
                tmpl = $path(params.__origr, params.templatepath)
            }
            //_print($t( isUnDef(params.template) ? $path(params.__origr, params.templatepath) : ( isDef(params.templatetmpl) ? params.templatetmpl : io.readFileString(params.template) ), $path(r, params.templatedata) ) )
            _print($t(tmpl, $path(r, params.templatedata)))
        }
    }],
    ["openmetrics", (r, options) => {
        if (!isString(r)) {
            ow.loadMetrics()
            var _out = ow.metrics.fromObj2OpenMetrics(r, params.metricsprefix, params.metricstimestamp)
            _out = _out.split("\n").map(line => {
                if (line.indexOf("{_id=\"") >= 0) line = line.replace(/{_id=\"\d+\",/, "{")
                if (line.indexOf(",_id=\"") >= 0) line = line.replace(/,_id=\"\d+\"}/, "}")
                if (line.indexOf("_id=\"") >= 0) line = line.replace(/,_id=\"\d+\",/, ",")
                return line
            }).filter(l => l.length > 0).join("\n")
            _print(_out)
        } else {
            _exit(-1, "For out=openmetrics input needs to be an array or map.")
        }
    }],
    ["pjson", (r, options) => {
        options.__format = "prettyjson"
        _o$o(r, options)
    }],
    ["ndjson", (r, options) => {
        if (isArray(r)) {
            r.forEach(_r => _print(stringify(_r, __, "")))
        } else if (isMap(r)) {
            _print(stringify(r, __, ""))
        } else {
            _o$o(r, options)
        }
    }],
    ["ndslon", (r, options) => {
        if (isArray(r)) {
            r.forEach(_r => _print(af.toSLON(_r)))
        } else if (isMap(r)) {
            _print(af.toSLON(r))
        } else {
            _o$o(r, options)
        }
    }],
    ["ndcslon", (r, options) => {
        if (isArray(r)) {
            r.forEach(_r => _print(af.toCSLON(_r)))
        } else if (isMap(r)) {
            _print(af.toCSLON(r))
        } else {
            _o$o(r, options)
        }
    }],
    ["base64", (r, options) => {
        var _o = ""
        if (isString(r))
            _o = r
        else
            _o = stringify(r)

        if (toBoolean(params.base64gzip)) {
            _print(af.fromBytes2String(af.toBase64Bytes(io.gzip(af.fromString2Bytes(_o)))))
        } else {
            _print(af.fromBytes2String(af.toBase64Bytes(_o)))
        }
    }],
    ["gb64json", (r, options) => {
        var _o = ""
        if (isString(r))
            _o = r
        else
            _o = stringify(r)

        _print(af.fromBytes2String(af.toBase64Bytes(io.gzip(af.fromString2Bytes(_o)))))
    }],
    ["jwt", (r, options) => {
        if (isMap(r)) {
            if (isUnDef(params.jwtsecret) && isUnDef(params.jwtprivkey)) _exit(-1, "For out=jwt you need to provide a jwtsecret or a jwtprivkey")
            //if (isDef(params.jwtalg)) _exit(-1, "For out=jwt you need to provide a jwtalg")
            ow.loadServer()
            
            if (isDef(params.jwtprivkey)) {
                ow.loadJava()
                var c = new ow.java.cipher()
                _print(ow.server.jwt.sign(c.readKey4File(params.jwtprivkey, true, params.jwtalg), r))
            } else {
                _print(ow.server.jwt.sign(params.jwtsecret, r))
            }
        } else {
            _exit(-1, "For out=jwt input needs to be a map.")
        }
    }],   
    ["grid" , (r, options) => {
        if (isUnDef(params.grid)) _exit(-1, "For out=grid you need to provide a grid=...")
        let _f = _fromJSSLON(_$(params.grid, "grid").or().isString().isMap().isArray().$_())

        if (isArray(_f) && _f.length > 0 && isArray(_f[0])) {
            _f.forEach((y, yi) => {
                y.forEach((x, xi) => {
                    let _rd
                    if (isUnDef(x.type) || x.type != "empty") {
                        if (isDef(x.cmd)) {
                            var _cr = $sh(x.cmd).getJson(0)
                            if (isDef(_cr) && isDef(_cr.stdout)) 
                                _rd = _cr.stdout
                            else
                                _rd = ""
                        } else {
                            _rd = r
                        }
                        if (x.type == "chart" || x.type == "bar") {
                            var _n = "_chrt" + (yi+1) + "." + (xi+1)
                            x.obj = (x.type == "chart" ? _n + " " : "") + _chartPathParse(_rd, x.obj, _n)
                            if (isUnDef(x.title)) x.title = "Chart " + _n
                        }
                        if (isDef(x.path)) {
                            x.obj = $path(_rd, x.path)
                            if (isUnDef(x.title)) x.title = x.path
                        } else {
                            if (isString(_rd)) 
                                x.obj = _rd
                            else if (isObject(_rd) && x.type != "chart")
                                x.obj = $path(_rd, "@")
                        }
                    } else {
                        x.obj = ""
                    }
                })
            })
            let _out = ow.format.string.grid(_f, __, __, " ", true)
            _print(_out)
        } else {
            _exit(-1, "Invalid grid parameter: '" + stringify(params.grid, __, "") + "'")
        }
    }],
    ["envs", (r, options) => {
        var res
        if (isArray(r)) {
            res = r.map(_r => isObject(_r) ? ow.loadObj().flatMap(_r, "_") : _r)
        } else {
            res = ow.loadObj().flatMap(r, "_")
        }
        var crt = k => params.envsprefix + k.replace(/[^a-zA-Z0-9_]/g, '_')
        var vcrt = v => String(v).indexOf(" ") >= 0 ? "\"" + v + "\"" : v

        if (isUnDef(params.envscmd)) params.envscmd = (ow.format.isWindows() ? "set" : "export")
        params.envscmd = String(params.envscmd)

        if (isUnDef(params.envsprefix)) params.envsprefix = "_OAFP_"
        params.envsprefix = String(params.envsprefix)
        if (toBoolean(params.envsnoprefix)) params.envsprefix = ""

        var out = new Set()
        for (var k in res) {
            out.add(params.envscmd + (params.envscmd.length > 0 ? " " : "") + crt(k) + "=" + vcrt(res[k]))
        }
        _print(Array.from(out).join("\n"))
    }],
    ["cmd", (r, options) => {
        if (!isString(params.outcmd)) _exit(-1, "For out=cmd you need to provide a outcmd=\"...\"")
        if (toBoolean(params.outcmdtmpl)) {
            ow.loadTemplate()
            ow.template.addConditionalHelpers()
            ow.template.addOpenAFHelpers()
            ow.template.addFormatHelpers()
        }

        let _exe = data => {
            var _s, _d = isString(data) ? data : stringify(data, __, "")
            if (toBoolean(params.outcmdparam)) {
                try {
                _s = $sh(params.outcmd.replace(/([^\\]?){}/g, "$1"+_d)).get(0)
                } catch(e) {sprintErr(e)}
            } else if (toBoolean(params.outcmdtmpl)) {
                _s = $sh($t(params.outcmd, data)).get(0)
            } else {
                _s = $sh(params.outcmd, _d).get(0)
            }
            if (toBoolean(params.outcmdnl)) {
                if (_s.stdout.length > 0) print(_s.stdout)
                if (_s.stderr.length > 0) printErr(_s.stderr)
            } else {
                if (_s.stdout.length > 0) printnl(_s.stdout)
                if (_s.stderr.length > 0) printErrnl(_s.stderr)
            }
        }

        if (isArray(r)) {
            if (toBoolean(params.outcmdjoin)) {
                _exe(r)
            } else {
                if (toBoolean(params.outcmdseq)) {
                    r.forEach(_exe)
                } else {
                    if (isDef(pForEach)) {
                        pForEach(r, _r => {
                            _exe(_r)
                        })
                    } else {
                        parallel4Array(r, _r => {
                            _exe(_r)
                        })
                    }
                }
            }
        } else {
            if (isString(r))
                _exe(r)
            else
                _exe(r)
        }
    }],
    ["chart", (r, options) => {
        if (isUnDef(params.chart)) _exit(-1, "For out=chart you need to provide a chart=\"<units> [<path[:color][:legend]>...]\"")
        if (isUnDef(splitBySepWithEnc)) _exit(-1, "output=chart is not supported in this version of OpenAF")

        let fmt = _chartPathParse(r, params.chart)
        if (fmt.length > 0) {
            var _out = printChart("oafp " + fmt)
            if (toBoolean(params.chartcls)) cls()
            _print(_out)
        }

    }],
    ["schart", (r, options) => {
        if (isUnDef(params.schart)) _exit(-1, "For out=schart you need to provide a schart=\"<units> [<path[:color][:legend]>...]\"")
        if (isUnDef(splitBySepWithEnc)) _exit(-1, "Output=schart is not supported in this version of OpenAF")

        let fmt = _chartPathParse(r, params.schart, "_oafp_sfn_", "soafp")
        if (fmt.length > 0) {
            _print(printChart("soafp " + fmt))
        }
    }],
    ["ch", (r, options) => {
        if (isUnDef(params.ch))    _exit(-1, "For out=ch you need to provide a ch=\"(type: ...)\"")
        if (isUnDef(params.chkey)) _exit(-1, "For out=ch you need to provide a chkey=\"key1, key2\"")

        var _r = (isMap(r) ? [ r ] : r)
        params.ch = _fromJSSLON(params.ch)
        if (isMap(params.ch)) {
            if (isUnDef(params.ch.type)) _exit(-1, "ch.type is not defined.")
            if (isDef(params.ch.lib)) loadLib(params.ch.lib)
            if (params.ch.type == "remote") {
                $ch("oafp::outdata").createRemote(params.ch.url)
            } else {
                $ch("oafp::outdata").create(params.ch.type, isDef($sec().procMap) ? $sec().procMap(params.ch.options) : params.ch.options)
            }

            if (toBoolean(params.chunset)) {
                $ch("oafp::outdata").unsetAll(params.chkey.split(",").map(r => r.trim()), _r)
            } else {
                $ch("oafp::outdata").setAll(params.chkey.split(",").map(r => r.trim()), _r)
            }
            $ch("oafp::outdata").destroy()
        } else {
            _exit(-1, "Invalid ch parameter")
        }
    }],
    ["db", (r, options) => {
        if (!isArray(r) || r.length < 1) _exit(-1, "db is only supported for filled arrays/lists")
        params.dbtable = _$(params.dbtable, "outdbtable").isString().default("data")
        params.dbnocreate = _$(toBoolean(params.dbnocreate), "outdbnocreate").isBoolean().default(false)
        params.dbicase = _$(toBoolean(params.dbicase), "outdbicase").isBoolean().default(false)
        params.dbbatchsize = _$(params.dbbatchsize, "dbbatchsize").isNumber().default(__)

        ow.loadObj()
        var _db
        try {
            if (!isString(params.dbjdbc)) _exit(-1, "dbjdbc URL is not defined.")
            if (isDef(params.dblib)) loadLib("jdbc-" + params.dblib + ".js")
            _db = new DB(params.dbjdbc, params.dbuser, params.dbpass, params.dbtimeout)

            // Creating table
            if (!params.dbnocreate) {
                try {
                    var _sql = ow.obj.fromObj2DBTableCreate(params.dbtable, r, __, !params.dbicase)
                    _db.u(_sql)
                    _db.commit() // needed for some jdbcs
                } catch(idbe) {
                    _db.rollback()
                    _exit(-1, "Error creating table: " + idbe)
                }
            }

            // Inserting into table
            var okeys, ookeys = Object.keys(ow.obj.flatMap(r[0]))
            if (!params.dbicase) 
                okeys = "\"" + ookeys.join("\", \"") + "\""
            else 
                okeys = ookeys.join(",").toUpperCase()
    
            let _sqlH = ""
            let _parseVal = aValue => {
                var _value = ow.obj.flatMap(aValue)
                var values = [];
                for(var k in ookeys) {
                    values.push(_value[ookeys[k]]);
                }
                var binds = ookeys.map(k => {
                    var v = _value[k]
                    return String(v)
                })
                var __h = "INSERT INTO " + (!params.dbicase ? "\"" + params.dbtable + "\"" : params.dbtable) + " (" + okeys + ") VALUES (" + binds.map(r => "?").join(", ") + ")"
                if (__h.length > _sqlH.length) {
                    _sqlH = String(__h)
                }

                return binds
            }

            var vals = r.map(_parseVal)
            _db.usArray(_sqlH, vals, params.dbbatchsize)
        } catch(dbe) {
            if (isDef(_db)) _db.rollback()
            _exit(-1, "Error connecting to the database: " + dbe)
        } finally {
            try {
                if (isDef(_db)) {
                    _db.commit()
                    _db.close()
                }
            } catch(ee) {
                _exit(-1, "Error closing the database connection: " + ee)
            }
        }
    }],
    ["sql", (r, options) => {
        if (!isArray(r) || r.length < 1) _exit(-1, "sql is only supported for filled arrays/lists")
        params.sqltable = _$(params.sqltable, "sqltable").isString().default("data")
        params.sqlicase = _$(toBoolean(params.sqlicase), "sqlicase").isBoolean().default(false)
        params.sqlnocreate = _$(toBoolean(params.sqlnocreate), "sqlnocreate").isBoolean().default(false)

        ow.loadObj()
        if (!params.sqlnocreate) _print(ow.obj.fromObj2DBTableCreate(params.sqltable, r, __, !params.sqlicase)+";\n")

        var okeys, ookeys = Object.keys(ow.obj.flatMap(r[0]))
        if (!params.sqlicase) 
            okeys = "\"" + ookeys.join("\", \"") + "\""
        else 
            okeys = ookeys.join(",").toUpperCase()

        let _parseVal = aValue => {
            var _value = ow.obj.flatMap(aValue)
            var values = [];
            for(var k in ookeys) {
                values.push(_value[ookeys[k]]);
            }
            var binds = ookeys.map(k => {
                var v = _value[k]
                if (isString(v)) v = "'" + v.replace(/'/g, "''") + "'"
                if (isNull(v))   v = "null"
                return v
            })
            var _sql = "INSERT INTO " + (!params.sqlicase ? "\"" + params.sqltable + "\"" : params.sqltable) + " (" + okeys + ") VALUES (" + binds.join(",") + ");"
            return _sql
        }

        _print(r.map(_parseVal).join("\n"))
    }],
    ["xml", (r, options) => {
        //_o$o(r, options)
        _print(af.fromObj2XML(r, true, params.outxmlprefix))
    }],
    ["pxml", (r, options) => {
        var _r = af.fromObj2XML(r, true, params.pxmlprefix)
        _print('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + new XMLList(_r))
    }],
    ["xls", (r, options) => {
        if (!isString(r)) {
            try {
                includeOPack("plugin-XLS")
            } catch(e) {
                _exit(-1, "plugin-XLS not found. You need to install it to use the XLS output (opack install plugin-XLS)")
            }
    
            plugin("XLS")
            var ar
            if (isMap(r)) {
                ow.loadObj()
                var o = ow.obj.flatMap(r)
                ar = Object.keys(o).map(r => ({ key: r, value: o[r] }))
            }
            if (isArray(r)) {
                ar = r
            }
            traverse(ar, (aK, aV, aP, aO) => {
                if (isString(aV) && aV.startsWith("=")) aO[aK] = "'" + aV
            })
    
            var tempFile = false, origFile = params.xlsfile
            if (isUnDef(params.xlsfile)) {
                tempFile = true
                params.xlsfile = io.createTempFile("oafp", ".xlsx")
            }
  
            var xls = new XLS(isDef(origFile) && io.fileExists(origFile) ? origFile : __)
            var sheet = xls.getSheet(_$(params.xlssheet, "xlssheet").isString().default("data"))
            params.xlsformat = _$(params.xlsformat, "xlsformat").or().isString().isMap().default("(bold: true, borderBottom: \"medium\", borderBottomColor: \"red\")")
            params.xlsformat = _fromJSSLON(params.xlsformat)
            ow.format.xls.setTable(xls, sheet, "A", 1, ar, __, params.xlsformat)
            xls.writeFile(params.xlsfile)
            xls.close()
    
            params.xlsopenwait = _$(params.xlsopenwait, "xlsopenwait").isNumber().default(5000)
            params.xlsopen     = _$(toBoolean(params.xlsopen), "xlsopen").isBoolean().default(true)
            if (params.xlsopen) {
                if (ow.format.isWindows()) {
                    $sh("start " + params.xlsfile).exec()
                    if (tempFile) sleep(params.xlsopenwait, true)
                } else if (ow.format.getOS().startsWith("Mac")) {
                    $sh("open " + params.xlsfile).exec()
                    if (tempFile) sleep(params.xlsopenwait, true)
                } 
            }
        }
    }],
    ["oaf", (r, options) => {
        if (isUnDef(params.outoaf)) _exit(-1, "For out=oaf you need to provide a outoaf=...")
        if (isString(params.outoaf)) {
            let _t
            if (io.fileExists(params.outoaf)) {
                _t = io.readFileString(params.outoaf)
            } else {
                _t = params.outoaf
            }
            if (isString(_t)) {
                let _f = new Function("data", _t)
                _f(r)
            }
        }
    }],
    ["dsv", (r, options) => {
        if (isUnDef(params.dsvsep))     params.dsvsep = ","
        if (isUnDef(params.dsvquote))   params.dsvquote = '\\"'
        if (isUnDef(params.dsvfields))  params.dsvfields = __
        if (isUnDef(params.dsvuseslon)) params.dsvuseslon = false
        if (isUnDef(params.dsvnl))      params.dsvnl = "\n"
        if (isUnDef(params.dsvheader))  params.dsvheader = true

        if (isDef(params.dsvfields)) params.dsvfields = String(params.dsvfields).split(",")

        if (isMap(r)) {
            r = [ r ]
        }
        if (isArray(r)) {
            var _out = []
            if (toBoolean(params.dsvheader) && isArray(r) && r.length > 0) {
                if (isDef(params.dsvfields) && isArray(params.dsvfields)) {
                    _out.push(params.dsvfields.map(f => {
                        if (isString(f)) {
                            f = f.replace(/"/g, '""')
                            f = `"${f}"`
                        } else if (isNull(f)) {
                            f = ""
                        }
                        return f
                    }))
                } else {
                    _out.push(Object.keys(r[0]).map(f => {
                        if (isString(f)) {
                            f = f.replace(/"/g, '""')
                            f = `"${f}"`
                        } else if (isNull(f)) {
                            f = ""
                        }
                        return f
                    }))
                }
                if (params.dsvnl.length > 0) _out.push(params.dsvnl)
            }
            if (!isArray(params.dsvfields)) params.dsvfields = __

            r.forEach((row, i) => {
                if (i > 0) _out.push(params.dsvnl)
                var _row = pForEach(isDef(params.dsvfields) ? params.dsvfields : Object.keys(row), k => {
                    var v = row[k]
                    if (isString(v)) {
                        v = v.replace(/"/g, '""')
                        v = `"${v}"`
                    } else if (isNull(v)) {
                        v = ""
                    } else if (isArray(v) || isMap(v)) {
                        v = params.dsvuseslon ? af.toSLON(v) : stringify(v, __, "")
                        v = v.replace(/"/g, params.dsvquote)
                        v = `"${v}"`
                    }
                    return v
                })
                _out.push(_row.join(params.dsvsep))
            })
            if (params.dsvnl.length > 0 && _out.length > 0 && _out[_out.length - 1] != params.dsvnl && r.length > 1) {
                _out.push(params.dsvnl)
            }
        } else {
            _exit(-1, "For out=dsv, input needs to be an array or map.")
        }
        _print(_out.join(""))
    }]
])

// --- add extra _outputFns here ---
const _addSrcOutputFns = (type, fn) => {
    if (!_outputFns.has(type)) {
        _outputFns.set(type, fn)
    } else {
        if (params.debug) printErr("WARN: Output type '" + type + "' already exists.")
    }
}

// --- Input functions (input parsers)
if (typeof _resolveLLMEnvName === "undefined") {
    var _resolveLLMEnvName = function (aEnv) {
        var _env = aEnv
        if (_env == "OAFP_MODEL" && isUnDef(getEnv("OAFP_MODEL")) && isDef(getEnv("OAF_MODEL"))) {
            _env = "OAF_MODEL"
        }
        return _env
    }
}

var _inputFns = new Map([
    ["?"    , (_res, options) => {
        _res = Array.from(_inputFns.keys()).filter(r => r != '?').sort()
        _$o(_res, options)
    }],
    ["pm"   , (_res, options) => { 
        _showTmpMsg()
        if (isDef(__pm._map)) _res = __pm._map
        if (isDef(__pm._list)) _res = __pm._list
        _$o(_res, options) 
    }],
    ["key", (_res, options) => {
        _showTmpMsg()
        if (!isString(_res)) _exit(-1, "key is only supported with a string.")
        _$o($get(_res), options)
    }],
    ["jsonschema", (_res, options) => {
        _showTmpMsg()
        var _s = jsonParse(_res, __, __, true)
        if (!isMap(_s)) _exit(-1, "jsonschema is only supported with a map.")
        ow.loadObj()
        var _d = ow.obj.schemaSampleGenerator(_s)
        _$o(_d, options)
    }],   
    ["yaml" , (_res, options) => {
        _showTmpMsg()
        var _r = af.fromYAML(_res)
        _$o(_r, options)
    }],
    ["xml"  , (_res, options) => {
        _showTmpMsg()
        params.xmlignored = _$(params.xmlignored, "xmlignored").isString().default(__)
        params.xmlprefix = _$(params.xmlprefix, "xmlprefix").isString().default(__)
        params.xmlfiltertag = _$(toBoolean(params.xmlfiltertag), "xmlfiltertag").isBoolean().default(__)
        //if (_res.indexOf("<?xml") >= 0) _res = _res.substring(_res.indexOf("?>") + 2).trim()
        //if (_res.indexOf("<!DOCTYPE") >= 0) _res = _res.substring(_res.indexOf(">") + 1).trim()
        var _r = af.fromXML2Obj(_res, params.xmlignored, params.xmlprefix, !params.xmlfiltertag)
        _$o(_r, options)
    }],
    ["lines", (_res, options) => {
        params.linesjoin = _$(toBoolean(params.linesjoin), "linesjoin").isBoolean().default(false)

        _showTmpMsg()

        let _linesvisual_header = __
        let _linesvisual_header_pos = []

        params.linesvisualheadsep = _$(toBoolean(params.linesvisualheadsep), "linesvisualheadsep").isBoolean().default(false)
        let _headTitles = false
        let _headSep    = false
        if (isUnDef(params.linesvisualsepre)) params.linesvisualsepre = (params.linesvisualheadsep ? "\\s+" : " \\s+")

        let _visualProc = r => {
            // Replace tabs with spaces with the right tab stops
            r = r.split('\n').map(line => {
                let endL = ''
                let c = 0
                for (let i = 0; i < line.length; i++) {
                    if (line[i] === '\t') {
                        let add = 8 - (c % 8)
                        endL += ' '.repeat(add)
                        c += add
                    } else {
                        endL += line[i]
                        c++
                    }
                }
                return endL
            }).join('\n')
            // If the header is not defined, then the first line is the header
            if (!_headTitles || !_headSep) {
                if (!_headTitles) _linesvisual_header = []
                r.split(new RegExp(params.linesvisualsepre)).reduce((lastPos, h) => {
                    if (h.trim().length == 0) return
                    if (!_headTitles) _linesvisual_header.push(h)
                    if ((!params.linesvisualheadsep && !_headTitles) || (_headTitles && params.linesvisualheadsep && !_headSep)) {
                        let _mr = r.substring(lastPos).match(new RegExp(ow.format.escapeRE(h) + "(" + params.linesvisualsepre + "|$)"))
                        if (!isNull(_mr) && isDef(_mr.index)) {
                            _linesvisual_header_pos.push(lastPos + _mr.index)
                            lastPos += _mr[0].length
                        } else {
                            _exit(-1, "Problem with linesvisual to find header positioning.")
                        }
                    }
                    return lastPos
                }, 0)
                if (!_headTitles) {
                    _headTitles = true
                    if (!params.linesvisualheadsep) _headSep = true
                } else if (params.linesvisualheadsep && !_headSep) {
                    _headSep = true
                }
                return __
            } else {
                var _l = {}
                _linesvisual_header_pos.forEach((p, i) => {
                    _l[_linesvisual_header[i]] = r.substring(p, (i + 1 < _linesvisual_header_pos.length ? _linesvisual_header_pos[i + 1]-1 : __)).trim()
                })
                return _l
            }
        }

        if (params.linesjoin) {
            if (isDef(params.file) && isUnDef(params.cmd)) {
                _res = io.readFileString(params.file)
            }
            if (isDef(params.cmd)) {
                _res = _runCmd2Bytes(params.cmd, true)
            }
            _res = _res.split(/\r?\n/)

            if (toBoolean(params.linesvisual)) {
                var _newRes = []
                _res.forEach(r => {
                    if (r.length == 0) return
                    var _r = _visualProc(r)
                    if (isDef(_r)) _newRes.push(_r)
                })
                _$o(_newRes, options)
            } else {
                _$o(_res, options)
            }
        } else {
            var _stream
            if (isDef(params.file) && isUnDef(params.cmd)) {
                _stream = io.readFileStream(params.file)
            } else {
                if (isDef(params.cmd)) {
                    _stream = af.fromBytes2InputStream(_runCmd2Bytes(params.cmd))
                } else {
                    _stream = af.fromString2InputStream(_res)
                }
            }

            var _p = _parInit()
            ioStreamReadLines(_stream, r => {
                _parExec(_p, () => {
                    // If linesvisual=true then the first line is the header and the space position of
                    // each header title determines the column position for the remaining lines

                    if (toBoolean(params.linesvisual)) {
                        var _r = _visualProc(r)
                        if (isDef(_r)) _$o(_r, clone(options), true)
                    } else {
                        _$o(r, clone(options), true)
                    }
                })
                _p = _parCheck(_p)
            })
            _parDone(_p)
            _stream.close()
        }
    }],
    ["ndjson", (_res, options) => {
        params.ndjsonjoin = _$(toBoolean(params.ndjsonjoin), "ndjsonjoin").isBoolean().default(false)

        _showTmpMsg()
        global.__ndjsonbuf = __, noOut = true
        var _ndjline = (r, fn) => {
            if (isUnDef(global.__ndjsonbuf) && r.length != 0 && r.trim().startsWith("{")) global.__ndjsonbuf = ""
            if (isDef(global.__ndjsonbuf)) {
                if (r.length != 0 && !r.trim().endsWith("}")) { global.__ndjsonbuf += r.trim(); return }
                if (global.__ndjsonbuf.length > 0) { r = global.__ndjsonbuf + r; global.__ndjsonbuf = __ }
            }
            if (r.length == 0 || r.length > 0 && r.trim().substring(0, 1) != "{") { 
                noOut = false
                fn(r)
                global.__ndjsonbuf = __
                return 
            }
            if (r.trim().length > 0) {
                noOut = false
                fn(r)
            }
        }
        var _ndjproc = res => {
            var _j = []
            res.split("\n").filter(l => l.length > 0).forEach(r => _ndjline(r, r => _j.push(jsonParse(r, __, __, toBoolean(params.ndjsonfilter)))))
            return _j
        }

        if (params.ndjsonjoin) {
            if (isDef(params.file) && isUnDef(params.cmd)) {
                _res = io.readFileString(params.file)
            }
            if (isDef(params.cmd)) {
                _res = _runCmd2Bytes(params.cmd, true)
            }

            _$o(_ndjproc(_res), options)
        } else {
            var _stream
            if (isDef(params.file) && isUnDef(params.cmd)) {
                _stream = io.readFileStream(params.file)
            } else {
                if (isDef(params.cmd)) {
                    _stream = af.fromBytes2InputStream(_runCmd2Bytes(params.cmd))
                } else {
                    _stream = af.fromString2InputStream(_res)
                }
            }

            var _p = _parInit()
            ioStreamReadLines(_stream, r => {
                _parExec(_p, () => _ndjline(r, line => _$o(jsonParse(line, __, __, true), clone(options), true) ) )
                _p = _parCheck(_p)
            })
            _parDone(_p)
            _stream.close()
        }
        if (noOut) _clearTmpMsg()
    }],
    ["ndslon", (_res, options) => {
        params.ndslonjoin = _$(toBoolean(params.ndslonjoin), "ndslonjoin").isBoolean().default(false)

        _showTmpMsg()
        global.__ndslonbuf = __, noOut = true
        var _ndslonline = (r, fn) => {
            if (isUnDef(global.__ndslonbuf) && r.length != 0 && r.trim().startsWith("(")) global.__ndslonbuf = ""
            if (isDef(global.__ndslonbuf)) {
                if (r.length != 0 && !r.trim().endsWith(")")) { global.__ndslonbuf += r.trim(); return }
                if (global.__ndslonbuf.length > 0) { r = global.__ndslonbuf + r; global.__ndslonbuf = __ }
            }
            if (r.length == 0 || r.length > 0 && r.trim().substring(0, 1) != "(") { 
                noOut = false
                fn(r)
                global.__ndslonbuf = __
                return 
            }
            if (r.trim().length > 0) {
                noOut = false
                fn(r)
            }
        }
        var _ndslonproc = res => {
            var _j = []
            res.split("\n").filter(l => l.length > 0).forEach(r => _ndslonline(r, r => _j.push(af.fromSLON(r))))
            return _j
        }

        if (params.ndslonjoin) {
            if (isDef(params.file) && isUnDef(params.cmd)) {
                _res = io.readFileString(params.file)
            }
            if (isDef(params.cmd)) {
                _res = _runCmd2Bytes(params.cmd, true)
            }

            _$o(_ndslonproc(_res), options)
        } else {
            var _stream
            if (isDef(params.file) && isUnDef(params.cmd)) {
                _stream = io.readFileStream(params.file)
            } else {
                if (isDef(params.cmd)) {
                    _stream = af.fromBytes2InputStream(_runCmd2Bytes(params.cmd))
                } else {
                    _stream = af.fromString2InputStream(_res)
                }
            }

            var _p = _parInit()
            ioStreamReadLines(_stream, r => {
                _parExec(_p, () => _ndslonline(r, line => _$o(af.fromSLON(line), clone(options), true) ) )
                _p = _parCheck(_p)
            })
            _parDone(_p)
            _stream.close()
        }
        if (noOut) _clearTmpMsg()
    }],
    ["dsv", (_res, options) => {
        _showTmpMsg()
        if (isUnDef(params.indsvsep)) params.indsvsep = ","
        if (isUnDef(params.indsvsepre)) params.indsvsepre = __
        if (isUnDef(params.indsvquote)) params.indsvquote = "\""
        if (isUnDef(params.indsvescape)) params.indsvescape = "\\"
        if (isUnDef(params.indsvcomment)) params.indsvcomment = "#"
        if (isUnDef(params.indsvheader)) params.indsvheader = true
        if (isUnDef(params.indsvtrim)) params.indsvtrim = true
        if (isUnDef(params.indsvjoin)) params.indsvjoin = false
        if (isUnDef(params.indsvfields)) params.indsvfields = __

        if (isString(params.indsvfields)) params.indsvfields = params.indsvfields.trim().split(",").map(f => f.trim())
        if (isDef(params.indsvfields) && !isArray(params.indsvfields)) params.indsvfields = __
        var _dsvmap = r => {
            var _r = {}
            params.indsvfields.forEach((f, i) => {
                _r[f] = r[i]
            })
            return _r
        }

        var _dsvproc = r => {
            if (isUnDef(r) || r.length == 0) return {}

            if (toBoolean(params.indsvheader)) {
                if (isUnDef(params.indsvfields)) {
                    if (isUnDef(params.indsvsepre)) {
                        params.indsvfields = r.trim().split(params.indsvsep)
                    } else {
                        params.indsvfields = r.trim().split(new RegExp(params.indsvsepre))
                    }
                    params.indsvfields = params.indsvfields.map(f => {
                        if (params.indsvtrim) f = f.trim()
                        if (params.indsvquote && f.startsWith(params.indsvquote) && f.endsWith(params.indsvquote)) {
                            f = f.substring(1, f.length - 1)
                        }
                        if (params.indsvescape) {
                            f = f.replace(new RegExp(params.indsvescape + params.indsvquote, "g"), params.indsvquote)
                        }
                        return f
                    })
                    return __
                }
            }

            var _r = {}
            if (isString(r)) {
                if (isUnDef(params.indsvsepre)) {
                    _r = pForEach(r.split(params.indsvsep), s => {
                        if (params.indsvtrim) s = s.trim()
                        if (params.indsvquote && s.startsWith(params.indsvquote) && s.endsWith(params.indsvquote)) {
                            s = s.substring(1, s.length - 1)
                        }
                        if (params.indsvescape) {
                            s = s.replace(new RegExp(params.indsvescape + params.indsvquote, "g"), params.indsvquote)
                        }
                        return s
                    })
                } else {
                    _r = pForEach(r.split(new RegExp(params.indsvsepre)), s => {
                        if (params.indsvtrim) s = s.trim()
                        if (params.indsvquote && s.startsWith(params.indsvquote) && s.endsWith(params.indsvquote)) {
                            s = s.substring(1, s.length - 1)
                        }
                        if (params.indsvescape) {
                            s = s.replace(new RegExp(params.indsvescape + params.indsvquote, "g"), params.indsvquote)
                        }
                        return s
                    })
                }
                return _dsvmap(_r)
            }
        }
                
        var noOut = true
        if (params.indsvjoin) {
            if (isDef(params.file) && isUnDef(params.cmd)) {
                _res = io.readFileString(params.file)
            }
            if (isDef(params.cmd)) {
                _res = _runCmd2Bytes(params.cmd, true)
            }

            _$o( _res.split(/\r?\n/).map(r => {
                if (isUnDef(r) || r.length == 0) return __
                if (r.trim().startsWith(params.indsvcomment)) return __
                return _dsvproc(r)
            }).filter(r => isDef(r)), options)
        } else {
            var _stream
            if (isDef(params.file) && isUnDef(params.cmd)) {
                _stream = io.readFileStream(params.file)
            } else {
                if (isDef(params.cmd)) {
                    _stream = af.fromBytes2InputStream(_runCmd2Bytes(params.cmd))
                } else {
                    _stream = af.fromString2InputStream(_res)
                }
            }

            var _p = _parInit()
            ioStreamReadLines(_stream, r => {
                if (isUnDef(r) || r.length == 0) return
                if (r.trim().startsWith(params.indsvcomment)) return
                _parExec(_p, () => {
                    if (isString(r)) {
                        var _dsv = _dsvproc(r)
                        if (isDef(_dsv)) _$o(_dsv, clone(options), true)
                    }
                    return true
                })
                _p = _parCheck(_p)
                return false
            })
            _parDone(_p)
            _stream.close()
        }
        if (noOut) _clearTmpMsg()
    }],
    ["md", (_res, options) => {
        _showTmpMsg()
        __ansiColorFlag = true
        __conConsole = true
        //print(ow.format.withMD(_res))
        if (isUnDef(params.format) && isUnDef(options.__format)) {
            params.format = "md"
            options.__format = "md"
        }
        _$o(_res, options)
    }],
    ["mdtable", (_res, options) => {
        _showTmpMsg()
        ow.loadTemplate()

        if (toBoolean(params.inmdtablejoin)) {
            var _d = new Set(), _s = new Set()
            // match all multiline markdown tables
            var fnProc = () => {
                if (_s.size > 0) {
                    _d.add(ow.template.md.fromTable(Array.from(_s).join("\n")))
                    _s.clear()
                }
            }
            _res.split("\n").forEach(l => {
                if (/^\|.+\|$/.test(l.trim())) {
                    _s.add(l.trim())
                } else {
                    fnProc()
                }
            })
            fnProc()
            _$o(Array.from(_d), options)
        } else {
            var _s = ow.template.md.fromTable(_res)
            _$o(_s, options)
        }
    }],
    ["mdcode", (_res, options) => {
        _showTmpMsg()
        
        var _d = []
        var lines = _res.split("\n")
        var inCodeBlock = false
        var currentBlock = { language: "", code: [], startLine: -1, endLine: -1 }
        
        lines.forEach((line, index) => {
            var oneLineCodeBlock = line.trim().match(/^```+[^`]+```+$/)
            var codeBlockMatch = line.trim().match(/^```+(.+)?$/)
            var endBlockMatch = inCodeBlock && (line.trim().match(/^```+$/) || line.trim().match(/[^`]```+$/))

            if (oneLineCodeBlock) {
                inCodeBlock = false
                currentBlock = {
                    language : __,
                    code     : line.replace(/^```+/, "").replace(/```+$/, "").trim(),
                    startLine: index + 1,
                    endLine  : index + 1
                }
                _d.push(currentBlock)
                return
            }

            if (codeBlockMatch && !inCodeBlock) {
                // Start of code block
                inCodeBlock = true
                currentBlock = {
                    language : codeBlockMatch[1],
                    code     : [],
                    startLine: index + 1,
                    endLine  : -1
                }
            } else if (endBlockMatch && inCodeBlock) {
                // End of code block
                inCodeBlock = false
                currentBlock.endLine = index + 1
                currentBlock.code = currentBlock.code.join("\n")
                _d.push(currentBlock)
                currentBlock = { language: "", code: [], startLine: -1, endLine: -1 }
            } else if (inCodeBlock) {
                // Inside code block
                currentBlock.code.push(line)
            }
        })
        
        // Handle unclosed code block
        if (inCodeBlock) {
            currentBlock.endLine = lines.length
            currentBlock.code = currentBlock.code.join("\n")
            _d.push(currentBlock)
        }
        
        _$o(_d, options)

    }],
    ["ask", (_res, options) => {
        var _d = []
        _res = _fromJSSLON(_res)
        if (isDef(askStruct) && isArray(_res)) {
            __conConsole = true
            __con.getTerminal().settings.set("-icanon min 1 -echo")
            _d = askStruct(_res)
            __con.getTerminal().settings.set("icanon echo")
            print("")
        }
        _$o(_d, options)
    }],
    ["raw", (_res, options) => {
        _showTmpMsg()
        _$o(_res, options)
    }],
    ["ini", (r, options) => {
        _showTmpMsg()
        ow.loadJava()
        var ini = new ow.java.ini(), _r
        if (isDef(params.file)) {
            _r = ini.loadFile(params.file).get()
        } else {
            _r = ini.load(r).get()
        }
        _$o(_r, options)
    }],
    ["jwt", (r, options) => {
        ow.loadServer()
        var _r, verify
        if (toBoolean(params.injwtverify)) {
            if (isUnDef(params.injwtsecret) && isUnDef(params.injwtpubkey)) _exit(-1, "injwtsecret or injwtpubkey is not defined.")
            try {
                if (isDef(params.injwtpubkey)) {
                    ow.loadJava()
                    var c = new ow.java.cipher()
                    _r = ow.server.jwt.verify(c.readKey4File(params.injwtpubkey, false, params.injwtalg), r.trim())
                } else {
                    ow.server.jwt.verify(params.injwtsecret, r.trim())
                }
                verify = true
            } catch(e) {
                if (isDef(e.javaException)) printErr(e.javaException.getMessage())
                verify = false
            }
        } 

        _r = ow.server.jwt.decode(r)
        if (isDef(verify)) _r.__verified = verify
        if (!toBoolean(params.injwtraw) && isDef(_r) && isMap(_r.claims)) {
            if (isDef(_r.claims.exp)) _r.claims.exp = new Date(_r.claims.exp * 1000)
            if (isDef(_r.claims.iat)) _r.claims.iat = new Date(_r.claims.iat * 1000)
            if (isDef(_r.claims.nbf)) _r.claims.nbf = new Date(_r.claims.nbf * 1000)
            
        }
        _$o(_r, options)
    }],
    ["sql", (r, options) => {
        if (isString(r)) {
            if (toBoolean(params.sqlparse)) {
                if (isUnDef(ow.format.sqlFormat)) _exit(-1, "SQL parse not available.")
                _$o(ow.format.sqlFormat(r, isDef(params.sqloptions) ? _fromJSSLON(params.sqloptions) : __), options)
            } else {
                _$o(af.fromSQL(r).ast, options)
            }
        } else {
            _$o(r, options)
        }
    }],
    ["openmetrics", (r, options) => {
        if (isString(r)) {
            ow.loadMetrics()
            _$o(ow.metrics.fromOpenMetrics2Array(r), options)
        } else {
            _$o(r, options)
        }
    }],
    ["ch", (r, options) => {
        _showTmpMsg()
        if (isUnDef(params.inch)) _exit(-1, "inch is not defined.")
        params.inch = _fromJSSLON(params.inch)
        if (isMap(params.inch)) {
            if (isUnDef(params.inch.type)) _exit(-1, "inch.type is not defined.")
            if (isDef(params.inch.lib)) loadLib(params.inch.lib)
            if (params.inch.type == "remote") {
                $ch("oafp::indata").createRemote(params.inch.url)
            } else {
                $ch("oafp::indata").create(params.inch.type, isDef($sec().procMap) ? $sec().procMap(params.inch.options) : params.inch.options) 
            }

            var _r = _fromJSSLON(r, true)
            if (toBoolean(params.inchall) || r.trim().length == 0) {
                _$o($ch("oafp::indata").getAll(isMap(_r) ? _r : __), options)
            } else {
                _$o($ch("oafp::indata").get(isMap(_r) ? _r : __), options)
            }
            $ch("oafp::indata").destroy()
        } else {
            _exit(-1, "inch is not a valid map.")
        }
    }],
    ["db", (r, options) => {
        if (isString(r)) {
            _showTmpMsg()
            if (!isString(params.indbjdbc)) _exit(-1, "indbjdbc URL is not defined.")
            var _db
            try {
                if (isDef(params.indblib)) loadLib("jdbc-" + params.indblib + ".js")
                _db = new DB(params.indbjdbc, params.indbuser, params.indbpass, params.indbtimeout)
                _db.convertDates(true)
                if (toBoolean(params.indbautocommit)) _db.setAutoCommit(true)
                if (toBoolean(params.indbexec)) {
                    var _r = _db.u(r)
                    _$o({ affectedRows: _r }, options)
                    _db.commit()
                } else {
                    if (toBoolean(params.indbstream)) {
                        var _rs = _db.qsRS(r)
                        try {
                            while(_rs.next()) {
                                var _r = {}
                                for (var i = 1; i <= _rs.getMetaData().getColumnCount(); i++) {
                                    var _v = _rs.getObject(i)
                                    switch(_rs.getMetaData().getColumnType(i)) {
                                    case java.sql.Types.BIGINT:
                                    case java.sql.Types.INTEGER:
                                    case java.sql.Types.TINYINT:
                                    case java.sql.Types.SMALLINT:
                                    case java.sql.Types.NUMERIC:
                                        _v = Number(_v)
                                        break
                                    case java.sql.Types.DOUBLE:
                                    case java.sql.Types.FLOAT:
                                    case java.sql.Types.REAL:
                                    case java.sql.Types.DECIMAL:
                                        _v = Number(_v)
                                        break
                                    case java.sql.Types.BOOLEAN:
                                        _v = Boolean(_v)
                                        break
                                    case java.sql.Types.TIME:
                                    case java.sql.Types.DATE:
                                    case java.sql.Types.TIMESTAMP:
                                        _v = new Date(_v.getTime())
                                        break
                                    case java.sql.Types.NULL:
                                        _v = null
                                        break
                                    default:
                                        _v = String(_v)
                                    }
                                    _r[_rs.getMetaData().getColumnName(i)] = _v
                                }
                                _$o(_r, options)
                            }
                        } catch(e) {
                            _exit(-1, "Error streaming SQL: " + e.message)
                        } finally {
                            _db.closeStatement(r)
                            _rs.close()
                        }
                    } else {
                        if (toBoolean(params.indbdesc)) {
                            var _r = _db.qsRS(r)
                            var _o = []
                            try {
                                for(let i = 1; i <= _r.getMetaData().getColumnCount(); i++) {
                                    _o.push({
                                        name: _r.getMetaData().getColumnName(i),
                                        type: _r.getMetaData().getColumnTypeName(i),
                                        size: _r.getMetaData().getColumnDisplaySize(i),
                                        nullable: _r.getMetaData().isNullable(i) == 1,
                                        autoIncrement: _r.getMetaData().isAutoIncrement(i),
                                        precision: _r.getMetaData().getPrecision(i),
                                        scale: _r.getMetaData().getScale(i),
                                        table: _r.getMetaData().getTableName(i),
                                        schema: _r.getMetaData().getSchemaName(i),
                                        catalog: _r.getMetaData().getCatalogName(i),
                                        columnType: _r.getMetaData().getColumnType(i)
                                    })
                                }
                                _$o(_o, options)
                            } catch(e) {
                                _exit(-1, "Error getting SQL description: " + e.message)
                            } finally {
                                _db.closeStatement(r)
                                _r.close()
                            }

                        } else {
                            var _r = _db.q(r)
                            if (isMap(_r) && isArray(_r.results)) {
                                _$o(_r.results, options)
                            } else {
                                _exit(-1, "Invalid DB result: " + stringify(_r))
                            }
                        }
                    }
                }
            } catch(edb) {
                printErr(edb.message)
                if (isDef(_db)) _db.rollback()
                _exit(-1, "Error executing SQL: " + edb.message)
            } finally {
                if (isDef(_db)) {
                    _db.rollback()
                    _db.close()
                }
            }
        } else {
            _exit(-1, "db is only supported with a SQL string.")
        }
    }],
    ["minia", (_res, options) => {
        params.minianolog = toBoolean( _$(params.minianolog, "minianolog").isString().default(false) )
        if (params.minianolog) _showTmpMsg()
        try {
            includeOPack("mini-a")
        } catch(e) {
            _exit(-1, "mini-a not found. You need to install it to use the mini-a output (opack install mini-a)")
        }

        loadLib("mini-a.js")
        var _r = _fromJSSLON(_res, true)
        if (!isMap(_r) && !isArray(_r)) _exit(-1, "mini-a is only supported with a map or array input.")
        
        var ma = new MiniA()

	var nostruct = true
        if (isUnDef(_r.format)) { _r.format = "json"; nostruct = false }
        if (isDef(_r.goal) && _r.format == "json") { _r.goal += "; answer in json"; nostruct = false }
        _r.shellbatch = true

        ma.setInteractionFn((e, m) => { 
            ma.defaultInteractionFn(e, m, (_e, _m, _i) => {
                if (!params.minianolog) printErr(_e + "  " + ansiColor("FAINT,ITALIC", _m))
                if (isDef(params.minialogfile)) io.writeFileString(params.minialogfile, `${ow.format.fromDate(new Date(), "yyyy-MM-dd HH:mm:ss.SSS")} | INFO | ${_i} | ${_e} | ${_m}\n`, __, true)
            })
        })
        ma.init(_r)
        var _res = ma.start(_r)
        var __r = nostruct ? _res : _fromJSSLON(_res, true)
        if (isDef(params.miniametrics)) io.writeFileJSON($t(params.miniametrics, { id: ma.getId() }), ma.getMetrics(), "")
        _$o(isObject(__r) && nostruct ? __r : _res, options)
    }],
    ["xls", (_res, options) => {
        _showTmpMsg()
        try {
            includeOPack("plugin-XLS")
        } catch(e) {
            _exit(-1, "plugin-XLS not found. You need to install it to use the XLS output (opack install plugin-XLS)")
        }
        
        plugin("XLS")
        let _xlsdss = false, _xlsds = false
        params.inxlsdesc = toBoolean( _$(params.inxlsdesc, "inxlsdesc").isString().default(false) )
        if (params.inxlsdesc) {
            if (isUnDef(params.inxlssheet)) {
                _xlsds = true
            } else {
                _xlsdss = true
            }
        }

        params.inxlssheet        = _$(params.inxlssheet || params.xlssheet, "xlssheet").isString().default(0)
        params.inxlsevalformulas = _$(toBoolean(params.inxlsevalformulas || params.xlsevalformulas), "xlsevalformulas").isBoolean().default(true)
        params.inxlscol          = _$(params.inxlscol || params.xlscol, "xlscol").isString().default("A")
        params.inxlsrow          = _$(params.inxlsrow || params.xlsrow, "xlsrow").isString().default(1)

        if (isDef(params.file) || isDef(params.cmd)) {
            var xls = new XLS(isDef(params.cmd) ? _runCmd2Bytes(params.cmd) : params.file)

            if (_xlsds) {
                _r = xls.getSheetNames()
            } else {
                var sheet = xls.getSheet(params.inxlssheet)
                if (_xlsdss) {
                    var _vls = xls.getCellValues(sheet, false)
                    var cols = []
                    Object.keys(_vls).forEach(r => {
                        var _c = Object.keys(_vls[r])
                        if (_c.length > cols.length) cols = _c
                    })

                    _r = []
                    var _rr = Object.keys(_vls).map(r => {
                        var __r = { " ": r }
                        cols.forEach(_c => __r[_c] = isNull(_vls[r][_c]) || _vls[r][_c].type == "BLANK" ? "___" : "###" )
                        _r.push(__r)
                    })

                    if (isUnDef(params.format) && isUnDef(options.__format)) {
                        params.format = "ctable"
                        options.__format = "ctable"
                    }
                } else {
                    var _r = xls.getTable(sheet, params.inxlsevalformulas, params.inxlscol, params.inxlsrow)
                    if (isDef(_r) && isMap(_r)) _r = _r.table
                }
            }
            xls.close()

            _$o(_r, options)
        } else {

            _exit(-1, "XLS is only support with 'file' or 'cmd' defined. Please provide a file=... or a cmd=...")
        }
    }],
    ["csv", (_res, options) => {
        var _r
        _showTmpMsg()
        if (isUnDef(params.inputcsv) && isDef(params.incsv)) params.inputcsv = params.incsv
        if (isDef(params.file) || isDef(params.cmd)) {
            var is = isDef(params.cmd) ? af.fromBytes2InputStream(_runCmd2Bytes(params.cmd)) : io.readFileStream(params.file)
            _r = $csv(params.inputcsv).fromInStream(is).toOutArray()
            is.close()
        } else {
            _r = $csv(params.inputcsv).fromInString( _res ).toOutArray()
        }
        _$o(_r, options)
    }],
    ["javathread", (_res, options) => {
        var lines
        _showTmpMsg()
        if (isDef(params.javathreadpid)) {
            ow.loadJava()
            try {
                lines = ow.java.jcmd(params.javathreadpid, "Thread.print")
                lines = lines.split("\n").filter(l => l.startsWith("\""))
            } catch(e) {
                _exit(-1, "Error getting Java thread dump: " + e.message)
            }
        } else {
            if (isString(_res)) {
                lines = _res.split("\n")
            } else {
                _exit(-1, "javathreads is only supported with a raw input or javathreadpid=.")
            }
        }

        // TODO: remove after OpenAF stable > 20240212
        var fnFromTimeAbbr = aStr => {	
            _$(aStr, "aStr").isString().$_()

            var ars = aStr.trim().match(/[\d\.]+[a-zA-Z]+/g), res = 0;
            if (!isArray(ars) || ars.length === 0) return parseFloat(aStr);
            for (var i in ars) {
                var ar = ars[i].match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
                if (isArray(ar) && ar.length > 0) {
                    var v = Number(ar[1])
                    var u = String(ar[2])
        
                    var _u = {
                        "ms": 1,
                        "s": 1000,
                        "m": 60 * 1000,
                        "h": 60 * 60 * 1000,
                        "d": 24 * 60 * 60 * 1000,
                        "w": 7 * 24 * 60 * 60 * 1000,
                        "M": 30 * 24 * 60 * 60 * 1000,
                        "y": 365 * 24 * 60 * 60 * 1000
                    }
                    if (isDef(_u[u])) {
                        res += v * _u[u]
                    } else {
                        res += v
                    }
                }
            }
        
            return res
        }

        var fnJavaTrans = (v, tA) => {
            if (v === null) return ""
            if (v === undefined) return ""
            if (isBoolean(v)) return Boolean(v)
            if (isNumber(v)) return Number(v)
            if (tA) return fnFromTimeAbbr(String(v))
            return String(v)
        }

        var _r = []
        lines.forEach(line => {
            if (line.startsWith("\"")) {
                var pt = java.util.regex.Pattern.compile("^\\\"(?<threadName>[^\"]+)\\\"" +
                            "(?:\\s+#(?<threadId>\\d+))?" +
                            "(?:\\s+\\[(?<threadIndex>\\d+)\\])?" +
                            "(?:\\s+(?<daemon>daemon))?" +
                            "(?:\\s+prio=(?<prio>\\d+))?" +
                            "\\s+os_prio=(?<osPrio>\\d+)" +
                            "(?:\\s+cpu=(?<cpu>[0-9.]+ms))?" +
                            "(?:\\s+elapsed=(?<elapsed>[0-9.]+s))?" +
                            "(?:\\s+tid=(?<tid>0x[a-fA-F0-9]+))?" +
                            "(?:\\s+nid=(?<nid>0x[a-fA-F0-9]+|\\d+|\\S+))?" +
                            "(?:\\s+(?<state>.*?))?" +
                            "(?:\\s+\\[(?<address>[^\\]]+)\\])?" +
                            "\\s*$")

                var mt = pt.matcher(line)
                if (mt.find()) {
                    var m = {
                        threadGroup: fnJavaTrans(mt.group("threadName")).replace(/[^a-zA-z]?\d+$/, ""),
                        threadName : fnJavaTrans(mt.group("threadName")),
                        threadId   : fnJavaTrans(mt.group("threadId")),  
                        threadIndex: fnJavaTrans(mt.group("threadIndex")), 
                        daemon     : fnJavaTrans(mt.group("daemon")),
                        prio       : fnJavaTrans(mt.group("prio")),
                        osPrio     : fnJavaTrans(mt.group("osPrio")),    
                        cpu_ms     : fnJavaTrans(mt.group("cpu"), true),
                        elapsed_ms : fnJavaTrans(mt.group("elapsed"), true),  
                        tid        : fnJavaTrans(mt.group("tid")),         
                        nid        : fnJavaTrans(mt.group("nid")),         
                        state      : fnJavaTrans(mt.group("state")),       
                        address    : fnJavaTrans(mt.group("address"))
                    }
                    _r.push(m)
                } else {
                    _r.push({ error: "Could not parse line: " + line })
                }
            }
        })
        _$o(_r, options)
    }],
    ["javagc", (_res, options) => {
        params.javagcjoin = _$(toBoolean(params.javagcjoin), "javagcjoin").isBoolean().default(false)

        // Pre-compile regex patterns for performance (moved outside hot path)
        const regexes = [
            // JDK 8 Allocation Failure (adjusted to handle multiline events)
            /([^ ]+) (\d+\.\d+): \[(GC) \((.*?)\)(.+?)\[PSYoungGen: (\d+K)->(\d+K)\((.*?)\)\] (\d+K)->(\d+K)\((.*?)\), (\d+\.\d+) secs\] \[Times: user=(\d+\.\d+) sys=(\d+\.\d+), real=(\d+\.\d+) secs\]/s,
            // JDK 8 style regexes
            /([^ ]+) (\d+\.\d+): \[(GC) \((.*?)\) \[PSYoungGen: (\d+K)->(\d+K)\((.*?)\)\] (\d+K)->(\d+K)\((.*?)\), (\d+\.\d+) secs\]/,
            // JDK 8 with +PrintHeapAtGC
            /([^ ]+) (\d+\.\d+): \[(Full GC) \((.*?)\) \[PSYoungGen: (\d+K)->(\d+K)\((.*?)\)\] \[ParOldGen: (\d+K)->(\d+K)\((.*?)\)\] (\d+K)->(\d+K)\((.*?)\), \[Metaspace: (\d+K)->(\d+K)\((.*?)\)\], (\d+\.\d+) secs\] \[Times: user=(\d+\.\d+) sys=(\d+\.\d+), real=(\d+\.\d+) secs\]/,
            // JDK 8 with +PrintHeapAtGC and +PrintTenuringDistribution
            /([^ ]+) (\d+\.\d+): \[(Full GC) \((.*?)\) \[PSYoungGen: (\d+K)->(\d+K)\((.*?)\)\] \[ParOldGen: (\d+K)->(\d+K)\((.*?)\)\] (\d+K)->(\d+K)\((.*?)\), \[Metaspace: (\d+K)->(\d+K)\((.*?)\)\], (\d+\.\d+) secs\]/,
            // JDK 8 with +PrintTenuringDistribution
            /([^ ]+) (\d+\.\d+): \[(GC) \((.*?)\) \[PSYoungGen: (\d+K)->(\d+K)\((.*?)\)\] (\d+K)->(\d+K)\((.*?)\), (\d+\.\d+) secs\] \[Times: user=(\d+\.\d+) sys=(\d+\.\d+), real=(\d+\.\d+) secs\]/,
            // JDK 8 Generic GC logs (simple format)
            /(\d+\.\d+): \[(GC|Full GC) \((.*?)\)\s+(\d+K)->(\d+K)\((\d+K)\), (\d+\.\d+) secs\]/,
            // JDK 9+ style regexes
            /^\[(.+)\]\s+GC\((\d+)\)\s*(.*?)\s*(\d+[GMK])->(\d+[GMK])\((\d+[GMK])\)\s*(\d+\.\d+)ms/,
            /^\[(.+)\]\s+GC\((\d+)\)\s*(.*?)\s*Metaspace:\s*(\d+[GMK])\((\d+[GMK])\)->(\d+[GMK])\((\d+[GMK])\)\s*NonClass:\s*(\d+[GMK])\((\d+[GMK])\)->(\d+[GMK])\((\d+[GMK])\)\s*Class:\s*(\d+[GMK])\((\d+[GMK])\)->(\d+[GMK])\((\d+[GMK])\)/,
            // JDK 9+ Allocation Failure
            /^\[(.+)\]\s+GC\((\d+)\)\s*(Allocation Failure)\s*(.*?)\s+(\d+[KMGT])->(\d+[KMGT])\((\d+[KMGT])\)\s+(\d+\.\d+)ms/,
        ]

        // Pre-compile patterns for head parsing
        const timePattern = /^\d+\.\d+s$/
        const timestampPattern = /\d{4}-\d{2}-\d{2}T/

        // Helper function to avoid repeated string concatenation
        const fromBytesAbbr = val => isDef(val) ? ow.format.fromBytesAbbreviation(val + "B") : __

        let _procLine = _event => {
            try {

                for (let index = 0; index < regexes.length; index++) {
                    let match = _event.match(regexes[index])
                    if (match) {
                        let result = {}

                        if (_event.charCodeAt(0) === 91) { // '[' char - faster than startsWith
                            // JDK 9+ style parsing
                            var heads = match[1].split("][")
                            for (let i = 0; i < heads.length; i++) {
                                let head = heads[i]
                                if (timePattern.test(head)) {
                                    result.sinceStart = parseFloat(head.slice(0, -1)) // faster than replace
                                } else if (timestampPattern.test(head)) {
                                    result.timestamp = ow.format.toDate(head, "yyyy-MM-dd'T'HH:mm:ss.SSSZ")
                                }
                            }
                            result.gcId = parseInt(match[2])
                            result.gcType = match[3].trim() || "none"
                            result.durationSecs = parseFloat(match[match.length - 1]) / 1000 // convert ms to secs

                            if (index === 5) {
                                // Match for GC pause with heap info
                                result.heapBeforeGC = fromBytesAbbr(match[4])
                                result.heapAfterGC = fromBytesAbbr(match[5])
                                result.heapTotal = fromBytesAbbr(match[6])
                            } else if (index > 5) {
                                if (index == 6) {
                                    result.metaUsedBeforeGC = fromBytesAbbr(match[4])
                                    result.metaTotalBeforeGC = fromBytesAbbr(match[5])
                                    result.metaUsedAfterGC = fromBytesAbbr(match[6])
                                    result.metaTotalAfterGC = fromBytesAbbr(match[7])
                                    result.nonClassUsedBeforeGC = fromBytesAbbr(match[8])
                                    result.nonClassTotalBeforeGC = fromBytesAbbr(match[9])
                                    result.nonClassUsedAfterGC = fromBytesAbbr(match[10])
                                    result.nonClassTotalAfterGC = fromBytesAbbr(match[11])
                                    result.classUsedBeforeGC = fromBytesAbbr(match[12])
                                    result.classTotalBeforeGC = fromBytesAbbr(match[13])
                                    result.classUsedAfterGC = fromBytesAbbr(match[14])
                                    result.classTotalAfterGC = fromBytesAbbr(match[15])
                                } else {
                                    result.heapBeforeGC = fromBytesAbbr(match[4])
                                    result.heapAfterGC = fromBytesAbbr(match[5])
                                    result.heapTotal = fromBytesAbbr(match[6])
                                }
                            }
                        } else {
                            // JDK 8 style parsing
                            if (index == 5) {
                                // JDK 8 Generic GC logs (simple format)
                                result.sinceStart = parseFloat(match[1])
                                result.gcType = match[2] + " " + match[3]
                                result.heapBeforeGC = fromBytesAbbr(match[4])
                                result.heapAfterGC = fromBytesAbbr(match[5])
                                result.heapTotal = fromBytesAbbr(match[6])
                                result.durationSecs = parseFloat(match[7])
                            } else {
                                result.timestamp = ow.format.toDate(match[1], "yyyy-MM-dd'T'HH:mm:ss.SSSZ")
                                result.sinceStart = parseFloat(match[2])
                                result.gcType = match[3] + " " + match[4]

                                if (index <= 4) {
                                    let idx = 5
                                    result.PSYoungGenBeforeGC = fromBytesAbbr(match[idx++])
                                    result.PSYoungGenAfterGC = fromBytesAbbr(match[idx++])
                                    result.PSYoungGenTotal = fromBytesAbbr(match[idx++])

                                    if (index == 2 || index == 3) {
                                        result.ParOldGenBeforeGC = fromBytesAbbr(match[idx++])
                                        result.ParOldGenAfterGC = fromBytesAbbr(match[idx++])
                                        result.ParOldGenTotal = fromBytesAbbr(match[idx++])
                                    }

                                    result.heapBeforeGC = fromBytesAbbr(match[idx++])
                                    result.heapAfterGC = fromBytesAbbr(match[idx++])
                                    result.heapTotal = fromBytesAbbr(match[idx++])

                                    if (index == 2 || index == 3) {
                                        result.metaBeforeGC = fromBytesAbbr(match[idx++])
                                        result.metaAfterGC = fromBytesAbbr(match[idx++])
                                        result.metaTotal = fromBytesAbbr(match[idx++])
                                    }

                                    result.durationSecs = parseFloat(match[idx++])

                                    if (index == 0 || index == 2 || index == 4) {
                                        result.userTime = parseFloat(match[idx++])
                                        result.sysTime = parseFloat(match[idx++])
                                        result.realTime = parseFloat(match[idx++])
                                    }
                                }
                            }
                        }
                        return result
                    }
                }
            } catch (e) {
                printErr(e)
                _exit(-2, "Error parsing Java GC log: " + e)
            }
        }

        _showTmpMsg()
        if (isString(_res)) {
            let lines = _res.split("\n")
            let gcStartPattern = /^(\[?\d+|\d{4}-\d{2}-\d{2}T)/ // Matches lines starting with '[\d+' or a timestamp

            let gcEvents = []
            let currentEvent = ""
            let hasCurrentEvent = false

            for (let i = 0; i < lines.length; i++) {
                let line = lines[i]
                if (gcStartPattern.test(line)) {
                    // New GC event detected
                    if (hasCurrentEvent) {
                        gcEvents.push(currentEvent)
                    }
                    currentEvent = line
                    hasCurrentEvent = true
                } else {
                    // Continuation of the current GC event
                    if (hasCurrentEvent) {
                        currentEvent += "\n" + line
                    }
                }
            }
            // Add the last GC event
            if (hasCurrentEvent) {
                gcEvents.push(currentEvent)
            }

            // Process events and filter valid results in one pass
            let results = []
            for (let i = 0; i < gcEvents.length; i++) {
                let result = _procLine(gcEvents[i])
                if (isMap(result)) {
                    results.push(result)
                }
            }

            if (params.javagcjoin) {
                _$o(results, options, true)
            } else {
                for (let i = 0; i < results.length; i++) {
                    _$o(results[i], options, true)
                }
            }
        } else {
            _exit(-1, "javagc is only supported with a string input.")
        }
    }],
    ["hsperf", (_res, options) => {
        if (isDef(params.file) || isDef(params.cmd)) {
            _showTmpMsg()
            ow.loadJava()
            var data = isDef(params.cmd) ? ow.java.parseHSPerf(_runCmd2Bytes(params.cmd)) : ow.java.parseHSPerf(params.file)
            // Enrich data
            data.__ts = new Date()

            var r = { max: 0, total: 0, used: 0, free: 0 }
            data.sun.gc.generation.forEach(gen => {
                gen.space.forEach(space => {
                    r.max   = (r.max < Number(space.maxCapacity)) ? Number(space.maxCapacity) : r.max
                    r.used  = r.used + Number(space.used)
                    r.total = isNumber(space.capacity) ? r.total + Number(space.capacity) : r.total
                    data.sun.gc["__percUsed_" + space.name] = (100 * space.used) / space.capacity
                })
            })
            data.sun.gc.__percUsed_meta = (100 * data.sun.gc.metaspace.used) / data.sun.gc.metaspace.capacity
            data.sun.gc.__percUsed_ccs = (100 * data.sun.gc.compressedclassspace.used) / data.sun.gc.compressedclassspace.capacity

            // Java 8
            var _ygc = $from(data.sun.gc.collector).equals("name", "PSScavenge").at(0)
            data.sun.gc.__ygc = isDef(_ygc) ? Number(_ygc.invocations) : 0
            data.sun.gc.__ygct = isDef(_ygc) ? Number(_ygc.time / 1000000000) : 0
            
            var _fgc = $from(data.sun.gc.collector).equals("name", "PSParallelCompact").orEquals("name", "").at(0)
            data.sun.gc.__fgc = isDef(_fgc) ? Number(_fgc.invocations) : 0
            data.sun.gc.__fgct = isDef(_fgc) ? Number(_fgc.time / 1000000000) : 0

            data.sun.gc.__gct = $from(data.sun.gc.collector).sum("time") / 1000000000

            data.java.__mem = {
            total    : r.total,
            used     : r.used,
            free     : r.total - r.used,
            metaMax  : data.sun.gc.metaspace.maxCapacity,
            metaTotal: data.sun.gc.metaspace.capacity,
            metaUsed : data.sun.gc.metaspace.used,
            metaFree : data.sun.gc.metaspace.capacity - data.sun.gc.metaspace.used
            }

            _$o( data, options )
        } else {
            _exit(-1, "hsperf is only supported with either 'file' or 'cmd' defined.")
        }
    }],
    ["jfr", (_res, options) => {
        ow.loadJava()
        if (isUnDef(ow.java.parseJFR)) _exit(-1, "jfr not available.")

        if (!isBoolean(params.jfrjoin)) params.jfrjoin = _$(toBoolean(params.jfrjoin), "jfrjoin").isBoolean().default(false)
        if (!isBoolean(params.jfrdesc)) params.jfrdesc = _$(toBoolean(params.jfrdesc), "jfrdesc").isBoolean().default(false)

        _showTmpMsg()
        var _r
        if (isDef(params.file) && isUnDef(params.cmd)) {
            _res = params.file
        }
        if (isDef(params.cmd)) {
            _res = _runCmd2Bytes(params.cmd, true)
            var _ft = io.createTempFile("jfr", ".jfr")
            io.writeFileBytes(_ft, _res)
            _res = _ft
        }

        if (params.jfrjoin) {
            _$o(ow.java.parseJFR(_res, __, params.jfrdesc), options)
        } else {
            ow.java.parseJFR(_res, event => _$o(event, options), params.jfrdesc)
        }
    }],
    ["rawhex", (_res, options) => {
        var _r
        params.inrawhexline = _$(params.inrawhexline, "inrawhexline").isNumber().default(__)
        _showTmpMsg()
        if (isDef(params.file) || isDef(params.cmd)) {
            _r = isDef(params.cmd) ? _runCmd2Bytes(params.cmd) : io.readFileBytes(params.file)
        } else {
            _r = af.fromString2Bytes(_res)
        }
        var __r = ow.format.string.toHexArray(_r, params.inrawhexline)
        __r.forEach(r => {
            r.characters = r.characters.replace(/[\x00-\x1F\x80-\xFF]/g, '.')
        })
        _$o(__r, options)
    }],
    ["base64", (_res, options) => {
        var _r
        _showTmpMsg()
        if (toBoolean(params.base64gzip)) {
            _r = af.fromBytes2String(io.gunzip(af.fromBase64(_res, true)))
        } else {
            _r = af.fromBytes2String(af.fromBase64(_res))
        }
        _$o(_r, options)
    }],
    ["gb64json", (_res, options) => {
        var _r
        _showTmpMsg()
        _r = af.fromBytes2String(io.gunzip(af.fromBase64(_res, true)))
        _$o(_r, options)
    }],
    ["oaf", (_res, options) => {
        if (!isString(_res)) _exit(-1, "oaf is only supported with a string.")
        _showTmpMsg()
        var _r
        if (isString(_res)) {
            let _t
            if (io.fileExists(_res)) {
                _t = io.readFileString(_res)
            } else {
                _t = _res
            }
            if (isString(_t)) {
                let _f = new Function("var data;" + _t + ";return data")
                _r = _f()
            }
        }
        _$o(_r, options)
    }],
    ["oafp", (_res, options) => {
        // Detects if input is YAML of JSON/SLON
        var _r = _fromJSSLON(_res, true)
        var id = "_oafp_key_" + genUUID()
        if (isMap(_r)) {
            _r.out         = "key"
            _r.__key       = id
            _r.__inception = true
            oafp(_r)
            var _d = $get(id)
            $unset(id)
            _$o(_d, options)
        } else if (isArray(_r)) {
            $set(id, true)
            var _out = pForEach(_r, (__r, i) => {
                var sid = id + "_" + String(i)
                var _ok = false
                if (isUnDef(__r.out)) {
                    __r.out         = "key"
                    __r.__key       = sid
                    __r.__inception = true
                    _ok = true
                }
                //return $do(() => {
                var _rr
                try {
                    oafp(__r)
                    if (_ok) {
                        _rr = $get(sid)
                        $unset(sid)
                    }
                } catch(e) {
                    sprintErr(e)
                } finally {
                    return _rr
                }
            }, __, isDef(params.inoafpseq) ? toBoolean(params.inoafpseq) : __)
            //$doWait($doAll(_p))
            _$o(_out, options)
        } else {
            _exit(-1, "oafp input data needs to be a map or an array.")
        }
    }],
    ["ojob", (_res, options) => {
        var _oj = _fromJSSLON(_res, true)
        if (isString(_oj)) {
            _oj = { ojob: _oj, args: {} }
        }
        _$(_oj.ojob, "ojob").isString().$_()
        _oj.args = _$( _oj.args, "args").isMap().default({})

        _showTmpMsg()

        var _id = genUUID()
        _oj.args.__format = "key"
        _oj.args.__key    = _id
        oJobRunFile(_oj.ojob, _oj.args)
        var _r = $get(_id)
        delete _r.__format
        delete _r.__key
        _$o($get(_id), options)
    }],
    ["sh", (_res, options) => {
        _showTmpMsg()
        var _r
        _res = _fromJSSLON(_res, true)
        if (isString(_res)) {
            _r = $sh(_res).get(0)
        } else {
            if (!isMap(_res)) _exit(-1, "For in=sh the input data needs to a string or a map")
            var _s = $sh()
            if (isUnDef(_res.cmd)) _exit(-1, "For in=sh the input data needs to a string or a map with the a 'cmd'")

            _s = _s.sh(_res.cmd)
            if (isDef(_res.envs))   _s = _s.envs(_res.envs, _res.envsall)
            if (isDef(_res.prefix)) _s = _s.prefix(_res.prefix)
            if (isDef(_res.pwd))    _s = _s.pwd(_res.pwd)
            switch(params.inshformat) {
            case 'raw' : _r = _s.get(0); break
            case 'yaml': _r = _s.getYaml(0); break
            case 'json':
            default    : _r = _s.getJson(0)
            }
        }
        _$o(_r, options)
    }],
    ["llm", (_res, options) => {
        params.llmenv     = _$(params.llmenv, "llmenv").isString().default("OAFP_MODEL")
        params.llmenv     = _resolveLLMEnvName(params.llmenv)
        params.llmoptions = _$(params.llmoptions, "llmoptions").or().isString().isMap().default(__)
        if (isUnDef(params.llmoptions) && !isString(getEnv(params.llmenv)))
            _exit(-1, "llmoptions not defined and " + params.llmenv + " not found.")

        _showTmpMsg()
        var res = $llm( _getSec(isDef(params.llmoptions) ? _fromJSSLON(params.llmoptions) : $sec("system", "envs").get(params.llmenv)) )
        if (isDef(params.llmconversation) && io.fileExists(params.llmconversation)) 
            res.getGPT().setConversation( io.readFileJSON(params.llmconversation) )
        let __res
        let img
        if (isString(params.llmimage)) {
            if (params.llmimage.toLowerCase().match(/^https?:\/\//))
                img = af.fromBytes2String(af.toBase64Bytes(af.fromInputStream2Bytes($rest().get2Stream(params.llmimage))))
            else if (io.fileExists(params.llmimage))
                img = af.fromBytes2String(af.toBase64Bytes(io.readFileBytes(params.llmimage)))
        } 
        if (params.out == "md" || params.out == "mdtable" || params.out == "raw") {
            __res = isDef(img) ? res.promptImage(_res, img) : res.prompt(_res)
        } else {
            if (isDef(img)) {
                __res = res.promptImage(_res, img, __, __, __, __, true) 
            } else {
                __res = res.promptJSON(_res) 
            }   
        }
        if (isDef(params.llmconversation)) {
            var _conv = res.getGPT().getConversation()
            //_conv.push({ role: "assistant", content: stringify(__res, __, "") })
            io.writeFileJSON( params.llmconversation, _conv, "" )
        }

        _$o(jsonParse(__res, __, __, isString(__res)), options)
    }],
    ["llmmodels", (_res, options) => {
        params.llmenv     = _$(params.llmenv, "llmenv").isString().default("OAFP_MODEL")
        params.llmenv     = _resolveLLMEnvName(params.llmenv)
        params.llmoptions = _$(params.llmoptions, "llmoptions").or().isString().isMap().default(__)
        if (isUnDef(params.llmoptions) && !isString(getEnv(params.llmenv)))
            _exit(-1, "llmoptions not defined and " + params.llmenv + " not found.")
        _showTmpMsg()

        var res = $llm( _getSec(isDef(params.llmoptions) ? _fromJSSLON(params.llmoptions) : $sec("system", "envs").get(params.llmenv)) )
        if (isUnDef(res.getModels)) _exit(-1, "OpenAF support for llm model listing API not found.")
        _$o(res.getModels(), options)
    }],
    ["javas", (_res, options) => {
        params.javasinception = toBoolean(params.javasinception)
        _showTmpMsg()
        plugin("JMX")
        var jmx = new JMX()
        var _r = jmx.getLocals().Locals
        if (!params.javasinception) {
            _r = _r.filter(r => r.id != getPid())
        }
        _$o(_r, options)
    }],
    ["jmx", (_res, options) => {
        params.jmxop = _$(params.jmxop, "jmxop").oneOf(["all","get","query","domains"]).default("all")
        if (isUnDef(params.jmxurl) && isUnDef(params.jmxpid)) _exit(-1, "jmxurl or jmxpid is not defined.")
        
        _showTmpMsg()
        plugin("JMX")
        ow.loadJava()
        let jmx
        if (isUnDef(params.jmxurl)) {
            ow.loadServer()
            jmx = new ow.java.JMX((new JMX()).attach2Local(params.jmxpid).URL)
        } else {
            jmx = new ow.java.JMX(params.jmxurl, params.jmxuser, params.jmxpass, params.jmxprovider)
        }
        let _r
        switch(params.jmxop) {
        case "domains": _r = jmx.getDomains(); break
        case "query"  : if (isString(_res)) _r = jmx.queryNames(_res); else _exit(-1, "Input needs to be a JMX query string (e.g. java.lang:*)"); break
        case "get"    : if (isString(_res)) _r = jmx.getObject(_res); else _exit(-1, "Input needs to be a JMX object name (e.g. java.lang:type=Memory)"); break
        default       :
        case "all"    : _r = jmx.getAll(); break
        }
        _$o(_r, options)
    }],
    ["snmp", (_res, options) => {
        _$(params.insnmp, "insnmp").isString().$_()
        params.insnmpcommunity = _$(params.insnmpcommunity, "insnmpcommunity").isString().default("public")
        params.insnmptimeout = _$(params.insnmptimeout, "insnmptimeout").isNumber().default(__)
        params.insnmpretries = _$(params.insnmpretries, "insnmpretries").isNumber().default(__)
        params.insnmpversion = _$(params.insnmpversion, "insnmpversion").isString().default(__)
        params.insnmpsec = _fromJSSLON(_$(params.insnmpsec, "insnmpsec").or().isString().isMap().default(__))
        _showTmpMsg()
        plugin("SNMP")
        var snmp = new SNMP(params.insnmp, params.insnmpcommunity, params.insnmptimeout, params.insnmpversion, params.insnmpsec)
        let _r = {}, _i = _fromJSSLON(_res, true)
        if (isString(_i)) {
            var _p = _i.split("\n").map(p => p.trim()).filter(p => p.length > 0)
            if (_p.length == 1) {
                _r = snmp.get(_res)
                if (isMap(_r)) _r = _r[_res]
            } else {
                _r = pForEach(_p, p => {
                    var _r = snmp.get(p)
                    if (isMap(_r)) _r = _r[p]
                    return _r
                })
            }
        } else {
            let _ism = isMap(_i)
            ow.loadObj()
            var _fn = _oid => snmp.get(_oid)[_oid]
            if (_ism) {
                let _ac = []
                _r = _i
                traverse(_r, (aK, aV, aP, aO) => {
                    if (isString(aV)) _ac.push({ o: aO, k: aK, v: aV })
                })
                pForEach(_ac, ac => ac.o[ac.k] = _fn(ac.v))
            } else {
                _r = pForEach(_i, a => _fn(a))
            }
        }
        _$o(_r, options)
    }],
    ["ls", (_res, options) => {
        _showTmpMsg()
        if (isString(_res)) {
            var _r
            var isPosix = toBoolean(params.lsposix)

            if (isDef(params.file)) _res = params.file

            var _i = io.fileExists(_res), _f
            if (_i) _f = io.fileInfo(_res)
            if (_i && _f.isFile) {
                var ext = isDef(params.lsext) ? params.lsext :_f.filename.replace(/^.*\./, '').toLowerCase()
                switch(ext) {
                case "tgz":
                case "gz":
                    _r = io.listFilesTAR(_res, true)
                    break
                case "tar":
                    _r = io.listFilesTAR(_res)
                    break
                case "jar":
                case "zip":
                default   :
                    plugin("ZIP")
                    _r = $m4a((new ZIP()).list(_res))
                }
            } else {
                if (toBoolean(params.lsrecursive)) {
                    _r = listFilesRecursive(_res, isPosix)
                } else {
                    _r = io.listFiles(_res, isPosix).files
                }
            }
            _$o(_r, options)
        } else {
            _exit(-1, "ls is only supported with a string.")
        }
    }],  
    ["mcp", (_res, options) => {
        _showTmpMsg()
        if (isUnDef($mcp)) _exit(-1, "mcp support not found.")
        var _mres = _fromJSSLON(_res, true)
        var _m = $mcp(_mres)
        _m = _m.initialize()

        var _r
        if (toBoolean(params.inmcptoolslist)) {
            _r = _m.listTools()
            if (isMap(_r) && isDef(_r.tools)) _r = _r.tools
        } else if (toBoolean(params.inmcplistprompts)) {
            _r = _m.listPrompts()
            if (isMap(_r) && isDef(_r.prompts)) _r = _r.prompts
        } else {
            if (isUnDef(_mres.tool)) _exit(-1, "For in=mcp a tool needs to be defined.")
            if (isUnDef(_mres.params)) _mres.params = {}
            
            _r = _m.callTool(_mres.tool, _mres.params)
        }
        _m.destroy()
        _$o(_r, options)
    }],
    ["toml", (_res, options) => {
        _showTmpMsg()
        if (isUnDef(af.fromTOML)) _exit(-1, "TOML support not found.")
        _$o(af.fromTOML(_res), options)
    }],
    ["toon", (_res, options) => {
        _showTmpMsg()
        if (isUnDef(af.fromTOON)) _exit(-1, "TOON support not found.")
        _$o(af.fromTOON(_res), options)
    }],
    ["slon", (_res, options) => {
        _showTmpMsg()
        _$o(af.fromSLON(_res), options)
    }],
    ["json", (_res, options) => {
        _showTmpMsg()
        _$o(jsonParse(_res, __, __, isString(_res)), options)
    }]
])

// --- add extra _inputFns here ---
const _addSrcInputFns = (type, fn) => {
    if (!_inputFns.has(type)) {
        _inputFns.set(type, fn)
    } else {
        if (params.debug) printErr("WARN: Input type '" + type + "' already exists.")
    }
}

// Check libs and add them (oafp_name.js on oPacks and __flags.OAFP.libs)
let _oafhelp_libs = {}
if (isString(params.libs)) params.libs = params.libs.split(",").map(r => r.trim()).filter(r => r.length > 0)
if (isDef(__flags.OAFP) && isArray(__flags.OAFP.libs) && isArray(params.libs)) 
    params.libs = __flags.OAFP.libs.concat(params.libs)
else
    params.libs = (isDef(__flags.OAFP) ? __flags.OAFP.libs : [])
if (isArray(params.libs)) {
    params.libs.forEach(lib => {
        try {
            if (lib.startsWith("@")) {
                if (/^\@([^\/]+)\/(.+)\.js$/.test(lib)) {
                    var _ar = lib.match(/^\@([^\/]+)\/(.+)\.js$/)
                    var _path = getOPackPath(_ar[1])
                    var _file = _path + "/" + _ar[2] + ".js"
                    if (io.fileExists(_file)) {
                        loadLib(_file)
                    } else {
                        _exit(-1, "ERROR: Library '" + lib + "' not found.")
                    }
                } else {
                    _exit(-1, "ERROR: Library '" + lib + "' does not have the correct format (@oPack/library.js).")
                }
            } else {
                var _req = require("oafp_" + lib + ".js")
                if (isDef(_req.oafplib)) {
                    var res = _req.oafplib(clone(params), _$o, _o$o, {
                        _runCmd2Bytes: _runCmd2Bytes,
                        _fromJSSLON: _fromJSSLON,
                        _msg: _msg,
                        _showTmpMsg: _showTmpMsg,
                        _clearTmpMsg: _clearTmpMsg,
                        _chartPathParse: _chartPathParse,
                        _exit: _exit,
                        _print: _print,
                        _o$o: _o$o
                    })
                    if (isMap(res)) {
                        if (isArray(res.fileExtensions))      res.fileExtensions.forEach(r => _addSrcFileExtensions(r.ext, r.type))
                        if (isArray(res.fileExtensionsNoMem)) res.fileExtensionsNoMem.forEach(r => _addSrcFileExtensionsNoMem(r.ext))
                        if (isArray(res.input))               res.input.forEach(r => _addSrcInputFns(r.type, r.fn))
                        if (isArray(res.inputLine))           res.inputLine.forEach(r => _addSrcInputLineFns(r.type, r.fn))
                        if (isArray(res.transform))           res.transform.forEach(r => _addSrcTransformFns(r.type, r.fn))
                        if (isArray(res.output))              res.output.forEach(r => _addSrcOutputFns(r.type, r.fn))
                        if (isString(res.help))               _oafhelp_libs[lib.toLowerCase()] = res.help
                    }
                } else {
                    printErr("WARN: Library '" + lib + "' does not have oafplib.")
                }
            }
        } catch(e) {
            printErr("WARN: Library '" + lib + "' error: " + e)
        }
    })
}

// Check if help is requested
if (params["-h"] == "" || (isString(params.help) && params.help.length > 0)) showHelp()

// Default format
params.format = _$(params.format, "format").isString().default(__)

// Initialize console detection
__initializeCon()
var _dr = !String(java.lang.System.getProperty("os.name")).match(/Windows/)
var _drev = getEnv("OAFP_RESET")
var _cs = getEnv("OAFP_CODESET")
if (isDef(_drev)) {
    if (toBoolean(_drev)) {
        _dr = false
    } else {
        _dr = true
    }
}
if (_dr && isDef(__con)) __con.getTerminal().settings.set("sane")

// Check for OpenAF's sec buckets

if (isDef(params.secKey)) {
    if (toBoolean(params.secEnv)) {
        params.secRepo = "system"
        params.secBucket = "envs"
    }
    params.secRepo = _$(params.secRepo, "secRepo").isString().default(getEnv("OAFP_SECREPO"))
    params.secBucket = _$(params.secBucket, "secBucket").isString().default(getEnv("OAFP_SECBUCKET"))
    params.secPass = _$(params.secPass, "secPass").isString().default(getEnv("OAFP_SECPASS"))
    params.secMainPass = _$(params.secMainPass, "secMainPass").isString().default(getEnv("OAFP_SECMAINPASS"))
    params.secFile = _$(params.secFile, "secFile").isString().default(getEnv("OAFP_SECFILE"))

    let res = $sec(params.secRepo, params.secBucket, params.secPass, params.secMainPass, params.secFile).get(secKey)
    if (isDef(res)) {
        Object.keys(res).forEach(r => params[r] = res[r])
    }
}

// Set options
var options = { 
    __format: params.format, 
    __from: params.from, 
    __ifrom: params.ifrom, 
    __isql: params.isql, 
    __sql: params.sql, 
    __path: params.path, 
    __opath: params.opath,
    __csv: params.csv, 
    __pause: params.pause, 
    __key: params.__key 
}
// csv options
if (isDef(params.inputcsv)) {
    params.inputcsv = _fromJSSLON(params.inputcsv)
}
if (isDef(params.incsv)) {
    params.incsv = _fromJSSLON(params.incsv)
}
if (isDef(params.csv)) {
    params.csv = _fromJSSLON(params.csv)
}

// Check version
var _version = false
if (params["-v"] == "" || toBoolean(params.version)) {
    _version = true
    showVersion()
}

// Check list of examples
if (params["-examples"] == "" || (isString(params.examples) && params.examples.length > 0)) {
    params.url = "https://ojob.io/oafp-examples.yaml"
    params.in  = "yaml"

    if (isString(params.examples) && params.examples.length > 0) {
        if (params.examples.trim() != "?") options.__format = "template"
        options.__path   = "data"
        params.templatepath = "tmpl"
        if (params.examples.indexOf("::") > 0) {
            var parts = params.examples.split("::").filter(r => r.length > 0)
            if (parts.length == 1) {
                options.__sql    = "select * where c like '" + parts[0] + "'"
            } else {
                options.__sql    = "select * where c like '" + parts[0] + "' and s like '" + parts[1] + "'"
            }
        } else {
            if (params.examples.trim() == "?") {
                options.__path = "data.sort(map(&concat(c,concat('::',s)),[]))"
                params.removedups = true
            } else {
                options.__sql = "select * where d like '%" + params.examples + "%' or s like '%" + params.examples + "%' or c like '%" + params.examples + "%'"
            }
        } 
    } else {
        options.__path   = "data[].{category:c,subCategory:s,description:d}"
        options.__from   = "sort(category,subCategory,description)"
        options.__format = "ctable"
    }

    delete params["-examples"]
}

// Read input from stdin or file
var _res = "", noFurtherOutput = false

// Check for output streams
if (typeof params.outfile !== "undefined") {
    if ("undefined" === typeof global.__oafp_streams) global.__oafp_streams = {}
    if ("undefined" === typeof global.__oafp_streams[params.outfile] && toBoolean(params.outfileappend))
        global.__oafp_streams[params.outfile] = { s: io.writeFileStream(params.outfile, toBoolean(params.outfileappend)) }
}

// Check chs
if (isString(params.chs) || isMap(params.chs)) {
    var _chs = af.fromJSSLON(params.chs)
    if (!isArray(_chs)) _chs = [_chs]
    _chs.forEach(ch => {
        if (isMap(ch)) {
            if (isString(ch.name) && isString(ch.type)) {
                $ch(ch.name).create(ch.type, ch.options)
            } else {
                _exit(-1, "ERROR: chs must have a name and a type.")
            }
        } else {
            _exit(-1, "ERROR: chs must be an object or array of objects with name and a type")
        }
    })
}

var _run = () => {
    if (_version) {
        _res = showVersion()
    } else {
        // JSON base options
        params.jsonprefix = _$(params.jsonprefix, "jsonprefix").isString().default(__)
        params.jsondesc   = _$(toBoolean(params.jsondesc), "jsondesc").isBoolean().default(false)

        if (typeof params.insecure !== "undefined" && toBoolean(params.insecure)) {
            ow.loadJava().setIgnoreSSLDomains()
        }

        if (isDef(params.file)) {
            if (params.file.indexOf("::") < 0 && !(io.fileExists(params.file))) {
                _exit(-1, "ERROR: File not found: '" + params.file + "'")
            }

            if (!_inputNoMem.has(params.type)) {
                if (params.type == "json" || isUnDef(params.type)) {
                    if (params.jsondesc) {
                        var _s = new Set()
                        io.readStreamJSON(params.file, path => {
                            var _p = path.substring(2)
                            if (isDef(params.jsonprefix)) {
                                if (_p.startsWith(params.jsonprefix)) {
                                    _s.add(_p)
                                }
                            } else {
                                _s.add(_p)
                            }
                            return false
                        })
                        _res = stringify(Array.from(_s), __, "")
                    } else {
                        if (isDef(params.jsonprefix)) {
                            var _r = io.readStreamJSON(params.file, path => path.substring(2).startsWith(params.jsonprefix))
                            _res = stringify(_r, __, "")
                        } else {
                            _res = io.readFileString(params.file, _cs)
                            if (toBoolean(params._shebang)) _res = _res.replace(/^#!.*\n/, "")
                        }
                    }
                } else {
                    _res = io.readFileString(params.file, _cs)
                    if (toBoolean(params._shebang)) _res = _res.replace(/^#!.*\n/, "")
                }
            }
        } else {
            if (params.jsondesc) _exit(-1, "ERROR: jsondesc only available for file input.")
            if (params.jsonprefix) _exit(-1, "ERROR: jsonprefix only available for file input.")

            if (typeof params.cmd !== "undefined") {
                _res = _runCmd2Bytes(params.cmd, true)
            } else {
                if (isString(params.data)) {
                    _res = params.data
                } else {
                    if (isDef(params.url)) {
                        params.urlmethod = _$(params.urlmethod, "urlmethod").isString().default("GET")
                        let _hp = _fromJSSLON(_$(params.urlparams).or().isString().isMap().default("{}"))

                        let _hd
                        if (isDef(params.urldata)) _hd = _fromJSSLON(params.urldata)

                        switch(params.urlmethod.toLowerCase()) {
                        case "post":
                            _res = $rest(_hp).post(params.url, _hd)
                            break
                        case "put":
                            _res = $rest(_hp).put(params.url, _hd)
                            break
                        case "delete":
                            _res = $rest(_hp).delete(params.url, _hd)
                            break
                        case "head":
                            _res = $rest(_hp).head(params.url, _hd)
                            break
                        default:
                            _res = $rest(_hp).get(params.url)
                        }
                        if (isObject(_res)) _res = stringify(_res, __, "")
                    } else {
                        if (params.input != "pm") {
                            _res = []
                            var _p = _parInit()
                            ow.loadObj()
                            _p._sres = new ow.obj.syncArray()
                            io.pipeLn(r => {
                                try {
                                    _parExec(_p, part => {
                                        if (isDef(_inputLineFns[params.type])) {
                                            if (_inputLineFns[params.type](_transform(r), merge(clone(options), { part: part }))) {
                                                _p._sres.add(r)
                                            }
                                        } else { 
                                            _p._sres.add(r)
                                        }
                                        return false
                                    })
                                } catch(ipl) {
                                    printErr("ERROR: " + ipl)
                                }
                                _p = _parCheck(_p)

                                return false
                            })
                            _parDone(_p)
                            _res = _res.concat(_p._sres.toArray())
                            _res = _res.join('\n')
                        }
                    }
                }

            }
        }
    }

    if (!noFurtherOutput) {
        // Detect type if not provided
        if (isUnDef(params.type)) {
            // File name based
            if (isDef(params.file)) {
                let _ext = params.file.substring(params.file.lastIndexOf('.'))
                if (_fileExtensions.has(_ext)) params.type = _fileExtensions.get(_ext)
            }

            // Content-based
            if (isUnDef(params.type)) {
                let _tres = _res.trim()
                if (_tres.startsWith("{") || _tres.startsWith("[")) {
                    params.type = "json"
                } else if (_tres.startsWith("(")) {
                    params.type = "slon"
                } else if (_tres.startsWith("<")) {
                    params.type = "xml"
                } else {
                    if (isString(_tres) && _tres.length > 0) {
                        if (_tres.substring(0, _tres.indexOf('\n')).split(",").length > 1) {
                            params.type = "csv"
                        } else if (_tres.substring(0, _tres.indexOf(': ') > 0)) {
                            params.type = "yaml"
                        }
                    } else {
                        _exit(-1, "Please provide the input type.")
                    }
                }
            }
        }

        // Determine input type and execute
        if (isDef(params.type) && _inputFns.has(params.type)) {
            _inputFns.get(params.type)(_res, options)
        } else {
            if (isString(params.type)) printErr("WARN: " + params.type + " input type not supported. Using json.")
            _inputFns.get("json")(_res, options)
        }
        delete params.__origr
    }
}

// Verify debug
if (params.debug) {
    //__initializeCon()
    printErr("DEBUG: " + colorify(params))
}

if (isNumber(params.loop)) {
    while(1) {
        if (toBoolean(params.loopcls)) {
            if (isDef(params.outfile) && isDef(global.__oafp_streams[params.outfile])) {
                global.__oafp_streams[params.outfile].close()
                global.__oafp_streams[params.outfile] = io.writeFileStream(params.outfile, toBoolean(params.outfileappend))
            }
        }
        _run()
        sleep(params.loop * 1000, true)
        // Ensure params have a fresh copy
        if (isDef(bkprms)) params = clone(bkprms)
    }
} else {
    _run()
}

// Close streams
if (typeof global.__oafp_streams !== "undefined") Object.keys(global.__oafp_streams).forEach(s => global.__oafp_streams[s].s.close())
}
oafp(_params)