var params = processExpr(" ")
// Author : Nuno Aguiar
const oafp = (params) => {
if (isUnDef(params) || isDef(params.____ojob)) return 

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
    if (isString(r)) return _transform(r)

    if (options.__path) {
        r = $path(r, options.__path.trim())
        delete options.__path
    }
    if (options.__from) {
        r = $from(r).query(af.fromNLinq(options.__from.trim()))
        delete options.__from
    }
    if (options.__sql) {
        r = $sql(r, options.__sql.trim())
        delete options.__sql
    }
    r = _transform(r)
    
    return r
}
const _$o = (r, options, lineByLine) => {
    if (!isString(r)) {
        if (lineByLine)
            r = _$f([r], options)[0]
        else
            r = _$f(r, options)
    } else {
        if (r.trim().startsWith("{") && r.trim().endsWith("}")) {
            r = _$f(jsonParse(r, __, __, true), options)
        } else {
            r = _$f(r, options)
        }
    }

    if (isDef(params.outputkey)) r = $$({}).set(params.outputkey, r)
    if (isDef(params.outkey))    r = $$({}).set(params.outkey, r)

    _clearTmpMsg()
    if (_outputFns.has(options.__format)) {
        _outputFns.get(options.__format)(r, options)
    } else {
        $o(r, options)
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
const _msg = "(processing data...)"
const _showTmpMsg  = msg => printErrnl(_$(msg).default(_msg))
const _clearTmpMsg = msg => printErrnl("\r" + " ".repeat(_$(msg).default(_msg).length) + "\r")

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
            print(ow.format.withMD( io.readFileString(_f) + _customHelp ))
    } else {
        if (isDef(global._oafphelp) && isDef(global._oafphelp[_ff])) {
            __ansiColorFlag = true
            __conConsole = true
            if (isDef(ow.format.string.pauseString) && toBoolean(params.pause))
                ow.format.string.pauseString( ow.format.withMD( global._oafphelp[_ff] + _customHelp ) )
            else
                print(ow.format.withMD( global._oafphelp[_ff] + _customHelp))
        } else {
            if (isString(_oafhelp_libs[params.help])) {
                __ansiColorFlag = true
                __conConsole = true
                if (isDef(ow.format.string.pauseString) && toBoolean(params.pause))
                    ow.format.string.pauseString( ow.format.withMD( _oafhelp_libs[params.help] ) )
                else
                    print(ow.format.withMD( _oafhelp_libs[params.help] ))
            } else {
                print("Check https://github.com/OpenAF/oafp/blob/master/src/" + _ff)
            }
        }
    }

    _exit(0)
}

const showVersion = () => {
    var _ff = (getOPackPath("oafproc") || ".") + "/.package.yaml"
    var oafpv = (io.fileExists(_ff) ? io.readFileYAML(_ff).version : "(not available)")
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
        if (params[key] === "") {
            _found = key
            break;
        }
    }
    params.file = _found
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
    "flatmap"       : _r => (toBoolean(params.flatmap) && isObject(_r) ? ow.loadObj().flatMap(_r, params.flatmapkey) : _r),
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
    "sqlfilter": _r => {
        if (isString(params.sqlfilter)) {
            switch(params.sqlfilter.toLowerCase()) {
            case "simple"  : __flags.SQL_QUERY_METHOD = "nlinq"; break
            case "advanced": __flags.SQL_QUERY_METHOD = "h2"; break
            default        : __flags.SQL_QUERY_METHOD = "auto"
            }
        }
        return _r
    },
    "llmprompt": _r => {
        if (isString(params.llmprompt)) {
            params.llmenv     = _$(params.llmenv, "llmenv").isString().default("OAFP_MODEL")
            params.llmoptions = _$(params.llmoptions, "llmoptions").isString().default(__)

            var res = $llm(isDef(params.llmoptions) ? params.llmoptions : $sec("system", "envs").get(params.llmenv) )
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
                    res = res.prompt(params.llmprompt)
                    return res
                }
            }
            res = res.promptJSON(params.llmprompt)
            return res
        }
        return _r
    },
    "splitlines": _r => { 
        if (toBoolean(params.splitlines) && isString(_r)) return _r.split(/\r?\n/)
        return _r
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
        $o(r, options)
    }],
    ["pm", (r, options) => {
        $o(r, options)
    }],
    ["key", (r, options) => {
        $o(r, options)
    }],
    ["ctable", (r, options) => {
        $o(r, options)
    }],
    ["stable", (r, options) => {
        $o(r, options)
    }],
    ["table", (r, options) => {
        $o(r, options)
    }],
    ["log", (r, options) => {
        if (isString(r) && toBoolean(params.logprintall)) {
            print(r.replace(/\n$/, ""))
        } else {
            var _arr = r
            if (isMap(r)) _arr = [ r ]
            if (isArray(_arr)) {
                _arr.forEach(_r => {
                    if (isMap(_r)) {
                        let d = (isDef(_r["@timestamp"]) ? _r["@timestamp"] : __)
                        let l = (isDef(_r.level) ? _r.level : __)
                        let m = (isDef(_r.message) ? _r.message : __)
                        if (isDef(d) && d.length > 24) d = d.substring(0, 23) + "Z"
                        if (isDef(m) || isDef(d)) print(ansiColor("BOLD", d) + (isDef(l) ? " | " + l : "") + " | " + m)
                    }
                })
            }
        }
    }],
    ["raw", (r, options) => {
        if (isString(r))
            print(r)
        else
            sprint(r)
    }],
    ["ini", (r, options) => {
        if (!isString(r)) {
            ow.loadJava()
            var ini = new ow.java.ini()
            print( ini.put(r).save() )
        }
    }],
    ["mdyaml", (r, options) => {
        if (isArray(r)) {
            r.forEach((_y, i) => {
                $o(_y, merge(options, { __format: "yaml" }))
                if (i < r.length - 1) print("---\n")
            })
        } else {
            $o(r, merge(options, { __format: "yaml" }))
        }
    }],
    ["mdtable", (r, options) => {
        if (isArray(r)) {
            ow.loadTemplate()
            print( ow.template.md.table(r) )
        }
    }],
    ["template", (r, options) => {
        if (!isString(r)) {
            ow.loadTemplate()
            ow.template.addConditionalHelpers()
            ow.template.addOpenAFHelpers()
            ow.template.addFormatHelpers()
            if (isUnDef(params.template)) _exit(-1, "For output=handlebars you need to provide a template=someFile.hbs")
            tprint(io.readFileString(params.template), r)
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
            $o(_out, options)
        }
    }],
    ["pjson", (r, options) => {
        options.__format = "prettyjson"
        $o(r, options)
    }],
    ["base64", (r, options) => {
        var _o = ""
        if (isString(r))
            _o = r
        else
            _o = stringify(r)

        if (toBoolean(params.base64gzip)) {
            print(af.fromBytes2String(af.toBase64Bytes(io.gzip(af.fromString2Bytes(_o)))))
        } else {
            print(af.fromBytes2String(af.toBase64Bytes(_o)))
        }
    }],
    ["sql", (r, options) => {
        if (!isArray(r) || r.length < 1) _exit(-1, "sql is only supported for filled arrays/lists")
        params.sqltable = _$(params.sqltable, "sqltable").isString().default("data")
        params.sqlicase = toBoolean(_$(params.sqlicase, "sqlicase").isString().default("false"))
        params.sqlnocreate = toBoolean(_$(params.sqlnocreate, "sqlnocreate").isString().default("false"))

        ow.loadObj()
       if (!params.sqlnocreate) print(ow.obj.fromObj2DBTableCreate(params.sqltable, r, __, !params.sqlicase)+";\n")

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

        print(r.map(_parseVal).join("\n"))
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
            if (params.xlsformat.trim().startsWith("{")) params.xlsformat = jsonParse(params.xlsformat, true)
            if (params.xlsformat.trim().startsWith("(")) params.xlsformat = af.fromSLON(params.xlsformat)
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
        if (params.linesjoin) {
            if (isDef(params.file) && isUnDef(params.cmd)) {
                _res = io.readFileString(params.file)
            }
            if (isDef(params.cmd)) {
                _res = _runCmd2Bytes(params.cmd, true)
            }
            _res = _res.split(/\r?\n/)
            _$o(_res, options)
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
                _$o(r, clone(options), true)
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
            _$o(af.fromSQL(r).ast, options)
        } else {
            _$o(r, options)
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
    ["llm", (_res, options) => {
        params.llmenv     = _$(params.llmenv, "llmenv").isString().default("OAFP_MODEL")
        params.llmoptions = _$(params.llmoptions, "llmoptions").isString().default(__)
        if (isUnDef(params.llmoptions) && !isString(getEnv(params.llmenv))) 
            _exit(-1, "llmoptions not defined and " + params.llmenv + " not found.")

        _showTmpMsg()
        var res = $llm(isDef(params.llmoptions) ? params.llmoptions : $sec("system", "envs").get(params.llmenv))
        if (params.output == "md" || params.output == "mdtable" || params.output == "raw") {
            res = res.prompt(_res)
        } else {
            res = res.promptJSON(_res)
        }

        _$o(jsonParse(res, __, __, isString(res)), options)
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
if (isDef(__flags.OAFP) && isArray(__flags.OAFP.libs) && isArray(params.libs)) params.libs = __flags.OAFP.libs.concat(params.libs)
if (isArray(params.libs)) {
    params.libs.forEach(lib => {
        try {
            var _req = require("oafp_" + lib + ".js")
            if (isDef(_req.oafplib)) {
                var res = _req.oafplib(clone(params), _$o, $o)
                if (isMap(res)) {
                    if (isArray(res.fileExtensions))      res.fileExtensions.forEach(r => _addSrcFileExtensions(r.ext, r.type))
                    if (isArray(res.fileExtensionsNoMem)) res.fileExtensionsNoMem.forEach(r => _addSrcFileExtensionsNoMem(r.ext))
                    if (isArray(res.input))               res.input.forEach(r => _addSrcInputFns(r.type, r.fn))
                    if (isArray(res.inputLine))           res.inputLine.forEach(r => _addSrcInputLineFns(r.type, r.fn))
                    if (isArray(res.transform))           res.transform.forEach(r => _addSrcTransformFns(r.type, r.fn))
                    if (isArray(res.output))              res.output.forEach(r => _addSrcOutputFns(r.type, r.fn))
                    if (isString(res.help))               _oafhelp_libs[lib] = res.help
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
if (!String(java.lang.System.getProperty("os.name")).match(/Windows/)) __con.getTerminal().settings.set("sane")

// Set options
var options = { __format: params.format, __from: params.from, __sql: params.sql, __path: params.path, __csv: params.csv, __pause: params.pause, __key: params.__key }
// ndjson options
/*if (params.type == "ndjson") {
    params.ndjsonjoin = toBoolean(_$(params.ndjsonjoin, "ndjsonjoin").isString().default(__))
}*/
// csv options
if (isDef(params.inputcsv)) {
    params.inputcsv = params.inputcsv.trim().startsWith("{") ? jsonParse(params.inputcsv, true) : af.fromSLON(params.inputcsv)
}
if (isDef(params.csv)) {
    params.csv = params.csv.trim().startsWith("{") ? jsonParse(params.csv, true) : af.fromSLON(params.csv)
}

// Check version
var _version = false
if (params["-v"] == "" || (isString(params.version) && params.version.length > 0)) {
    _version = true
    showVersion()
}

// Read input from stdin or file
var _res = "", noFurtherOutput = false
if (_version) {
    _res = showVersion()
} else {
    // JSON base options
    params.jsonprefix = _$(params.jsonprefix, "jsonprefix").isString().default(__)
    params.jsondesc   = toBoolean(_$(params.jsondesc, "jsondesc").isString().default("false"))

    if (isDef(params.file)) {
        if (!(io.fileExists(params.file))) {
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
    if (isDef(_inputFns.has(params.type))) {
        _inputFns.get(params.type)(_res, options)
    } else {
        printErr("WARN: " + params.type + " input type not supported. Using json.")
        _inputFns.get("json")(_res, options)
    }
}
}
oafp(params)
