var params = processExpr(" ")
// Author : Nuno Aguiar
const oafp = (params) => {
if (isUnDef(params) || isDef(params.____ojob)) return 

// Ensure params are interpreted as lower case
Object.keys(params).forEach(pk => {
    if (params[pk].length > 0) {
        var npk = pk.toLowerCase()
        if (pk != npk && isUnDef(params[npk])) {
            params[npk] = params[pk]
            delete params[pk]
        }
    }
})

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
    if (options.__ifrom) {
        r = $from(r).query(af.fromNLinq(options.__ifrom.trim()))
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

    if (isString(r)) return _transform(r)
    r = _transform(r)

    if (options.__from) {
        r = $from(r).query(af.fromNLinq(options.__from.trim()))
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
    
    return r
}
const _$o = (r, options, lineByLine) => {
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
        if (r.trim().startsWith("{") && r.trim().endsWith("}")) {
            r = _$f(jsonParse(r, __, __, true), nOptions)
        } else {
            r = _$f(r, nOptions)
        }
    }

    if (isDef(params.outputkey)) r = $$({}).set(params.outputkey, r)
    if (isDef(params.outkey))    r = $$({}).set(params.outkey, r)

    _clearTmpMsg()
    if (_outputFns.has(nOptions.__format)) {
        _outputFns.get(nOptions.__format)(r, nOptions)
    } else {
        if (isUnDef(nOptions.__format)) nOptions.__format = "tree"
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
const _fromJSSLON = aString => {
	if (!isString(aString) || aString == "" || isNull(aString)) return ""

	aString = aString.trim()
	if (aString.startsWith("{")) {
		return jsonParse(aString, __, __, true)
	} else {
		return af.fromSLON(aString)
	}
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
            print(m)
        } else {
            if ("undefined" === typeof global.__oafp_streams) global.__oafp_streams = {}
            if ("undefined" !== typeof global.__oafp_streams[params.outfile]) {
                ioStreamWrite(global.__oafp_streams[params.outfile].s, m + (toBoolean(params.outfileappend) ? "\n" : ""))
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
const _msg = "(processing data...)"
const _showTmpMsg  = msg => { if (params.out != 'grid' && !params.__inception && !toBoolean(params.loopcls) && !toBoolean(params.chartcls)) printErrnl(_$(msg).default(_msg)) } 
const _clearTmpMsg = msg => { if (params.out != 'grid' && !params.__inception && !toBoolean(params.loopcls) && !toBoolean(params.chartcls)) printErrnl("\r" + " ".repeat(_$(msg).default(_msg).length) + "\r") }

// ---

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

ow.loadFormat()

params.format = params.output || params.format || params.out, params.type = params.input || params.type || params.in
params.out = params.format
params.output = params.format
params.in = params.type
params.input = params.type

// Check if file is provided
if (isUnDef(params.file) && isUnDef(params.cmd)) {
    let _found = __
    for (let key in params) {
        if (params[key] === "" && key != "-debug" && key != "-v" && key != "-examples") {
            _found = key
            break;
        }
    }
    params.file = _found
}

// Verify the data param
if ("[object Object]" == Object.prototype.toString.call(params.data)) {
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
  ]
])
// --- add extra _fileExtensions here ---
const _addSrcFileExtensions = (ext, type) => {
    if (!_fileExtensions.has(ext)) {
        _fileExtensions.set(ext, type)
    } else {
        printErr("WARN: Extension '" + ext + "' already exists.")
    }
}

// --- List of input types that should not be stored in memory
var _inputNoMem = new Set([
  "csv",
  "ndjson"
])
// --- add extra _inputNoMem here ---
const _addSrcFileExtensionsNoMem = ext => {
    if (!_inputNoMem.has(ext)) {
        _inputNoMem.add(ext)
    } else {
        printErr("WARN: Extension '" + ext + "' already exists.")
    }
}

// --- Input functions processing per line
var _inputLineFns = {
    "lines": (r, options) => {
        if (!isBoolean(params.linesjoin)) params.linesjoin = toBoolean(_$(params.linesjoin, "linesjoin").isString().default(__))

        if (!params.linesjoin && isString(r)) {
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
    "ndjson": (r, options) => {
        if (!isBoolean(params.ndjsonjoin)) params.ndjsonjoin = toBoolean(_$(params.ndjsonjoin, "ndjsonjoin").isString().default(__))
        
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
    }
}
// --- add extra _inputLineFns here ---
const _addSrcInputLineFns = (type, fn) => {
    if (isUnDef(_inputLinesFns[type])) {
        _inputLineFns[type] = fn
    } else {
        printErr("WARN: Input type '" + type + "' already exists.")
    }
}

// --- Transform functions
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
            params.cmltch = _$(params.cmltch, "cmltch").default("(type: simple)")
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
            if (!((isDef(_d.filea) && isDef(_d.fileb)) || (isDef(_d.a) && isDef(_d.b)))) _exit(-1, "diff.a path and diff.b path are required.")

            loadDiff() 
            let _d1 = $path(_r, _d.a), _d2 = $path(_r, _d.b), _dt = __
            if (toBoolean(params.color)) {
                if (isUnDef(params.difftheme) && isDef(getEnv("OAFP_DIFFTHEME"))) params.difftheme = getEnv("OAFP_DIFFTHEME")
                _dt = _fromJSSLON(_$(params.difftheme, "difftheme").isString().default(""))
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
                    if (aV.trim().match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)) { aO[aK] = new Date(aV); break }
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
            params.llmoptions = _$(params.llmoptions, "llmoptions").isString().default(__)

            var res = $llm(isDef(params.llmoptions) ? params.llmoptions : $sec("system", "envs").get(params.llmenv) )
            if (isDef(params.llmconversation) && io.fileExists(params.llmconversation)) 
                res.getGPT().setConversation(io.readFileJSON(params.llmconversation))
            var type = "json", shouldStr = true
            if (isString(params.input)) {
                if (params.input == "md") {
                    type = "markdown"
                    shouldStr = false
                }
                if (params.input == "mdtable") {
                    type = "markdown table"
                    shouldStr = false
                }
                if (params.input == "hsperf") type = "java hsperf file"
                if (params.input == "raw") {
                    type = "raw"
                    shouldStr = false
                }
            }
            
            res = res.withContext(shouldStr ? stringify(_r,__,true) : _r, (isDef(params.llmcontext) ? params.llmcontext : `${type} input data`))
            if (isString(params.output)) {
                if (params.output == "md" || params.output == "mdtable" || params.output == "raw") {
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
            let regressionoptions = _fromJSSLON(_$(params.regressionoptions, "regressionoptions").isString().default("{order:2,precision:5}"))
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
        if (isString(params.normalize)) {
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
        if (isString(params.denormalize)) {
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
    }
}
// --- add extra _transformFns here ---
const _addSrcTransformFns = (type, fn) => {
    if (isUnDef(_transformFns[type])) {
        _transformFns[type] = fn
    } else {
        printErr("WARN: Transform '" + type + "' already exists.")
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

        params.htmlopen = toBoolean(_$(params.htmlopen, "htmlopen").isString().default("true"))
        params.htmlwait = _$(params.htmlwait, "htmlwait").isNumber().default(2500)

        if (params.htmlopen) tmpf = io.createTempFile("oafp_", ".html")

        ow.loadTemplate()
        if (isString(r)) {
            html = ow.template.html.genStaticVersion(ow.template.parseMD2HTML(r, !toBoolean(params.htmlpart), !toBoolean(params.htmlcompact)))
            html = html.replace("<html>", "<html><meta charset=\"utf-8\">")
        } else {
            let _res = ow.template.html.parseMap(r, true)
            html = "<html><meta charset=\"utf-8\"><style>" + _res.css + "</style><body>" + _res.out + "</body></html>"
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
                _arr.forEach(_r => {
                    if (isMap(_r)) {
                        let d = (isDef(_r["@timestamp"]) ? _r["@timestamp"] : __)
                        let l = (isDef(_r.level) ? _r.level : __)
                        let m = (isDef(_r.message) ? _r.message : __)
                        let lineC
                        if (isDef(l)) {
                            if (l.toLowerCase().indexOf("err") >= 0)  lineC = _lt.errorLevel
                            if (l.toLowerCase().indexOf("warn") >= 0) lineC = _lt.warnLevel
                        }
                        if (isDef(d) && d.length > 24) d = d.substring(0, 23) + "Z"
                        if (isDef(m) || isDef(d)) _print(ansiColor(_lt.timestamp, d) + (isDef(l) ? " | " + ansiColor(lineC, l) : "") + " | " + ansiColor(lineC, m))
                    }
                })
            }
        }
    }],
    ["raw", (r, options) => {
        if (isString(r))
            _print(r)
        else
            _print(stringify(r))
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
            if (isUnDef(params.template) && isUnDef(params.templatepath)) _exit(-1, "For out=handlebars you need to provide a template=someFile.hbs or templatepath=...")
            params.templatedata = _$(params.templatedata, "templatedata").isString().default("@")
            _print($t( isUnDef(params.template) ? $path(params.__origr, params.templatepath) : io.readFileString(params.template), $path(r, params.templatedata) ) )
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
            }).join("\n")
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
    ["grid" , (r, options) => {
        if (isUnDef(params.grid)) _exit(-1, "For out=grid you need to provide a grid=...")
        let _f = _fromJSSLON(_$(params.grid, "grid").isString().$_())

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

        var out = new Set()
        for (var k in res) {
            out.add(params.envscmd + (params.envscmd.length > 0 ? " " : "") + crt(k) + "=" + vcrt(res[k]))
        }
        _print(Array.from(out).join("\n"))
    }],
    ["cmd", (r, options) => {
        if (!isString(params.outcmd)) _exit(-1, "For out=cmd you need to provide a outcmd=\"...\"")

        let _exe = data => {
            var _s, _d = isString(data) ? data : stringify(data, __, "")
            if (toBoolean(params.outcmdparam)) {
                try {
                _s = $sh(params.outcmd.replace(/([^\\]?){}/g, "$1"+_d)).get(0)
                } catch(e) {sprintErr(e)}
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
                    parallel4Array(r, _r => {
                        _exe(_r)
                    })
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
        if (isUnDef(splitBySepWithEnc)) _exit(-1, "Output=chart is not supported in this version of OpenAF")

        let fmt = _chartPathParse(r, params.chart)
        if (fmt.length > 0) {
            if (toBoolean(params.chartcls)) cls()
            _print(printChart("oafp " + fmt))
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
                $ch("oafp::outdata").create(params.ch.type, params.ch.options)
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
        params.dbnocreate = toBoolean(_$(params.dbnocreate, "outdbnocreate").isString().default("false"))
        params.dbicase = toBoolean(_$(params.dbicase, "outdbicase").isString().default("false"))
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
            printErr(dbe)
            _exit(-1, "Error connecting to the database: " + dbe)
        } finally {
            if (isDef(_db)) {
                _db.commit()
                _db.close()
            }
        }
    }],
    ["sql", (r, options) => {
        if (!isArray(r) || r.length < 1) _exit(-1, "sql is only supported for filled arrays/lists")
        params.sqltable = _$(params.sqltable, "sqltable").isString().default("data")
        params.sqlicase = toBoolean(_$(params.sqlicase, "sqlicase").isString().default("false"))
        params.sqlnocreate = toBoolean(_$(params.sqlnocreate, "sqlnocreate").isString().default("false"))

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
        _o$o(r, options)
    }],
    ["pxml", (r, options) => {
        var _r = af.fromObj2XML(r, true)
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
            params.xlsformat = _$(params.xlsformat, "xlsformat").isString().default("(bold: true, borderBottom: \"medium\", borderBottomColor: \"red\")")
            params.xlsformat = _fromJSSLON(params.xlsformat)
            ow.format.xls.setTable(xls, sheet, "A", 1, ar, __, params.xlsformat)
            xls.writeFile(params.xlsfile)
            xls.close()
    
            params.xlsopenwait = _$(params.xlsopenwait, "xlsopenwait").isNumber().default(5000)
            params.xlsopen     = toBoolean(_$(params.xlsopen, "xlsopen").isString().default("true"))
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
    }]
])

// --- add extra _outputFns here ---
const _addSrcOutputFns = (type, fn) => {
    if (!_outputFns.has(type)) {
        _outputFns.set(type, fn)
    } else {
        printErr("WARN: Output type '" + type + "' already exists.")
    }
}

// --- Input functions (input parsers)
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
        params.xmlfiltertag = toBoolean(_$(params.xmlfiltertag, "xmlfiltertag").isString().default(__))
        if (_res.indexOf("<?xml") >= 0) _res = _res.substring(_res.indexOf("?>") + 2).trim()
        if (_res.indexOf("<!DOCTYPE") >= 0) _res = _res.substring(_res.indexOf(">") + 1).trim()
        var _r = af.fromXML2Obj(_res, params.xmlignored, params.xmlprefix, !params.xmlfiltertag)
        _$o(_r, options)
    }],
    ["lines", (_res, options) => {
        if (!isBoolean(params.linesjoin)) params.linesjoin = toBoolean(_$(params.linesjoin, "linesjoin").isString().default(__))

        _showTmpMsg()

        let _linesvisual_header = __
        let _linesvisual_header_pos = []

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
            if (isUnDef(_linesvisual_header)) {
                _linesvisual_header = [], lastPos = 0
                if (isUnDef(params.linesvisualsepre)) params.linesvisualsepre = " \\s+"
                r.split(new RegExp(params.linesvisualsepre)).forEach(h => {
                    _linesvisual_header.push(h)
                    let _mr = r.substring(lastPos).match(new RegExp(ow.format.escapeRE(h) + "(" + params.linesvisualsepre + "|$)"))
                    if (!isNull(_mr) && isDef(_mr.index)) {
                        _linesvisual_header_pos.push(lastPos + _mr.index)
                        lastPos = _mr.index
                    } else
                        _exit(-1, "Problem with linesvisual to find header positioning.")
                })
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

            ioStreamReadLines(_stream, r => {
                // If linesvisual=true then the first line is the header and the space position of
                // each header title determines the column position for the remaining lines

                if (toBoolean(params.linesvisual)) {
                    var _r = _visualProc(r)
                    if (isDef(_r)) _$o(_r, clone(options), true)
                } else {
                    _$o(r, clone(options), true)
                }
            })
            _stream.close()
        }
    }],
    ["ndjson", (_res, options) => {
        if (!isBoolean(params.ndjsonjoin)) params.ndjsonjoin = toBoolean(_$(params.ndjsonjoin, "ndjsonjoin").isString().default(__))

        _showTmpMsg()
        global.__ndjsonbuf = __
        var _ndjline = (r, fn) => {
            if (isUnDef(global.__ndjsonbuf) && r.length != 0 && r.trim().startsWith("{")) global.__ndjsonbuf = ""
            if (isDef(global.__ndjsonbuf)) {
                if (r.length != 0 && !r.trim().endsWith("}")) { global.__ndjsonbuf += r.trim(); return }
                if (global.__ndjsonbuf.length > 0) { r = global.__ndjsonbuf + r; global.__ndjsonbuf = __ }
            }
            if (r.length == 0 || r.length > 0 && r.trim().substring(0, 1) != "{") { 
                fn(r)
                global.__ndjsonbuf = __
                return 
            }
            fn(r)
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

            ioStreamReadLines(_stream, r => {
                _ndjline(r, line => _$o(jsonParse(line, __, __, true), clone(options), true) )
            })
            _stream.close()
        }
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
        var _s = ow.template.md.fromTable(_res)
        _$o(_s, options)
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
                $ch("oafp::indata").create(params.inch.type, params.inch.options)
            }

            var _r = _fromJSSLON(r)
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
                if (toBoolean(params.indbexec)) {
                    var _r = _db.u(r)
                    _$o({ affectedRows: _r }, options)
                    _db.commit()
                } else {
                    var _r = _db.q(r)
                    if (isMap(_r) && isArray(_r.results)) {
                        _$o(_r.results, options)
                    } else {
                        _exit(-1, "Invalid DB result: " + stringify(_r))
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
    ["xls", (_res, options) => {
        _showTmpMsg()
        try {
            includeOPack("plugin-XLS")
        } catch(e) {
            _exit(-1, "plugin-XLS not found. You need to install it to use the XLS output (opack install plugin-XLS)")
        }
        
        params.xlssheet        = _$(params.xlssheet, "xlssheet").isString().default(0)
        params.xlsevalformulas = toBoolean(_$(params.xlsevalformulas, "xlsevalformulas").isString().default(true))
        params.xlscol          = _$(params.xlscol, "xlscol").isString().default("A")
        params.xlsrow          = _$(params.xlsrow, "xlsrow").isString().default(1)

        plugin("XLS")
        if (isDef(params.file) || isDef(params.cmd)) {
            var xls = new XLS(isDef(params.cmd) ? _runCmd2Bytes(params.cmd) : params.file)
            var sheet = xls.getSheet(params.xlssheet)
            var _r = xls.getTable(sheet, params.xlsevalformulas, params.xlscol, params.xlsrow)
            xls.close()
            if (isDef(_r) && isMap(_r)) _r = _r.table

            _$o(_r, options)
        } else {

            _exit(-1, "XLS is only support with 'file' or 'cmd' defined. Please provide a file=... or a cmd=...")
        }
    }],
    ["csv", (_res, options) => {
        var _r
        _showTmpMsg()
        if (isDef(params.file) || isDef(params.cmd)) {
            var is = isDef(params.cmd) ? af.fromBytes2InputStream(_runCmd2Bytes(params.cmd)) : io.readFileStream(params.file)
            _r = $csv(params.inputcsv).fromInStream(is).toOutArray()
            is.close()
        } else {
            _r = $csv(params.inputcsv).fromInString( _res ).toOutArray()
        }
        _$o(_r, options)
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
    ["oafp", (_res, options) => {
        params.__inception = true
        var _r = _fromJSSLON(_res)
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
            ow.loadObj()
            $set(id, true)
            var _out = new ow.obj.syncArray()
            var _p = _r.map((r, i) => {
                var sid = id + "_" + String(i)
                r.out         = "key"
                r.__key       = sid
                r.__inception = true
                return $do(() => {
                    oafp(r)
                    _out.add($get(sid))
                    $unset(sid)
                }).catch(e => {
                    sprintErr(e)
                })
            })
            $doWait($doAll(_p))
            _$o(_out.toArray(), options)
        } else {
            _exit(-1, "oafp input data needs to be a map or an array.")
        }
    }],
    ["sh", (_res, options) => {
        _showTmpMsg()
        var _r
        _res = _fromJSSLON(_res)
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
        params.llmoptions = _$(params.llmoptions, "llmoptions").isString().default(__)
        if (isUnDef(params.llmoptions) && !isString(getEnv(params.llmenv))) 
            _exit(-1, "llmoptions not defined and " + params.llmenv + " not found.")

        _showTmpMsg()
        var res = $llm(isDef(params.llmoptions) ? params.llmoptions : $sec("system", "envs").get(params.llmenv))
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
        if (params.output == "md" || params.output == "mdtable" || params.output == "raw") {
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
            _conv.push({ role: "assistant", content: stringify(__res, __, "") })
            io.writeFileJSON( params.llmconversation, _conv, "" )
        }

        _$o(jsonParse(__res, __, __, isString(__res)), options)
    }],
    ["llmmodels", (_res, options) => {
        params.llmenv     = _$(params.llmenv, "llmenv").isString().default("OAFP_MODEL")
        params.llmoptions = _$(params.llmoptions, "llmoptions").isString().default(__)
        if (isUnDef(params.llmoptions) && !isString(getEnv(params.llmenv))) 
            _exit(-1, "llmoptions not defined and " + params.llmenv + " not found.")

        _showTmpMsg()

        var res = $llm(isDef(params.llmoptions) ? params.llmoptions : $sec("system", "envs").get(params.llmenv))
        if (isUnDef(res.getModels)) _exit(-1, "OpenAF support for llm model listing API not found.")
        _$o(res.getModels(), options)
    }],
    ["toml", (_res, options) => {
        _showTmpMsg()
        if (isUnDef(af.fromTOML)) _exit(-1, "TOML support not found.")
        _$o(af.fromTOML(_res), options)
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
        printErr("WARN: Input type '" + type + "' already exists.")
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
if (isDef(_drev)) {
    if (toBoolean(_drev)) {
        _dr = false
    } else {
        _dr = true
    }
}
if (_dr) __con.getTerminal().settings.set("sane")

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
// ndjson options
/*if (params.type == "ndjson") {
    params.ndjsonjoin = toBoolean(_$(params.ndjsonjoin, "ndjsonjoin").isString().default(__))
}*/
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
if (params["-v"] == "" || (isString(params.version) && params.version.length > 0)) {
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
if (isDef(params.outfile)) {
    if ("undefined" === typeof global.__oafp_streams) global.__oafp_streams = {}
    if ("undefined" === typeof global.__oafp_streams[params.outfile])
        global.__oafp_streams[params.outfile] = { s: io.writeFileStream(params.outfile, toBoolean(params.outfileappend)) }
}

var _run = () => {
    if (_version) {
        _res = showVersion()
    } else {
        // JSON base options
        params.jsonprefix = _$(params.jsonprefix, "jsonprefix").isString().default(__)
        params.jsondesc   = toBoolean(_$(params.jsondesc, "jsondesc").default("false"))

        if (isDef(params.insecure) && toBoolean(params.insecure)) {
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
                            _res = io.readFileString(params.file)
                        }
                    }
                } else {
                    _res = io.readFileString(params.file)
                }
            }
        } else {
            if (params.jsondesc) _exit(-1, "ERROR: jsondesc only available for file input.")
            if (params.jsonprefix) _exit(-1, "ERROR: jsonprefix only available for file input.")

            if (isDef(params.cmd)) {
                _res = _runCmd2Bytes(params.cmd, true)
            } else {
                if (isString(params.data)) {
                    _res = params.data
                } else {
                    if (isDef(params.url)) {
                        params.urlmethod = _$(params.urlmethod, "urlmethod").isString().default("GET")
                        let _hp = _fromJSSLON(_$(params.urlparams).isString().default("{}"))

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
                        default:
                            _res = $rest(_hp).get(params.url)
                        }
                        if (isObject(_res)) _res = stringify(_res, __, "")
                    } else {
                        if (params.input != "pm") {
                            _res = []
                            io.pipeLn(r => {
                                if (isDef(_inputLineFns[params.type])) {
                                    if (_inputLineFns[params.type](_transform(r), clone(options))) {
                                        _res.push(r)
                                    }
                                } else { 
                                    _res.push(r)
                                }
                                return false
                            })
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
if (isDef(params["-debug"])) {
    //__initializeCon()
    printErr("DEBUG: " + colorify(params))
}

if (isNumber(params.loop)) {
    while(1) {
        if (toBoolean(params.loopcls)) {
            if (isDef(params.outfile)) {
                global.__oafp_streams[params.outfile].close()
                global.__oafp_streams[params.outfile] = io.writeFileStream(params.outfile, toBoolean(params.outfileappend))
            } else {
                cls()
            }
        }
        _run()
        sleep(params.loop * 1000, true)
    }
} else {
    _run()
}

// Close streams
if (isDef(global.__oafp_streams)) Object.keys(global.__oafp_streams).forEach(s => global.__oafp_streams[s].s.close())
}
oafp(params)
