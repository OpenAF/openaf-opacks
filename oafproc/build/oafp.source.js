var params = processExpr(" ")
// Author : Nuno Aguiar
const oafp = (params) => {
if (isUnDef(params) || isDef(params.____ojob)) return 

// Exit function
const _exit = (code, msg) => {
    if (isUnDef(msg)) msg = "exit: " + code
    if (isUnDef(ow.oJob) && !toBoolean(params.noexit)) {
        printErr(msg)
        exit(code)
    } else {
        throw msg
    }
}

const showHelp = () => {
    __initializeCon()

    var _ff
    params.help = _$(params.help, "help").isString().default("")
    switch(params.help.toLowerCase()) {
    case "filters" : _ff = "docs/FILTERS.md"; break
    case "template": _ff = "docs/TEMPLATE.md"; break
    case "examples": _ff = "docs/EXAMPLES.md"; break
    default        : _ff = "docs/USAGE.md"
    }

    var _f = (getOPackPath("oafproc") || ".") + "/" + _ff
    if (io.fileExists(_f)) {
        __ansiColorFlag = true
		__conConsole = true
        if (isDef(ow.format.string.pauseString) && toBoolean(params.pause))
            ow.format.string.pauseString( ow.format.withMD( io.readFileString(_f) ) )
        else
            print(ow.format.withMD( io.readFileString(_f) ))
    } else {
        var _help
        if (isDef(_help) && _ff == "docs/USAGE.md") {
            __ansiColorFlag = true
            __conConsole = true
            if (isDef(ow.format.string.pauseString) && toBoolean(params.pause))
                ow.format.string.pauseString( ow.format.withMD( _help ) )
            else
                print(ow.format.withMD( _help ))
        } else {
            print("Check https://github.com/OpenAF/openaf-opacks/blob/master/oafproc/" + _ff)
        }
    }

    _exit(0)
}

const showVersion = () => {
    var _ff = (getOPackPath("oafproc") || ".") + "/.package.yaml"
    var oafpv = (io.fileExists(_ff) ? io.readFileYAML(_ff).version : "(not available)")
    var _v = {
        oafp: oafpv,
        openaf: {
            version: getVersion(),
            distribution: getDistribution()
        }
    }
    return stringify(_v, __, "")
}

ow.loadFormat()
if (params["-h"] == "" || (isString(params.help) && params.help.length > 0)) showHelp()

params.format = params.output || params.format, params.type = params.input || params.type

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

// File extensions list
const _fileExtensions = new Map([
    [".json", "json"],
    [".ndjson", "ndjson"],
    [".yaml", "yaml"],
    [".xml", "xml"],
    [".csv", "csv"],
    [".ini", "ini"],
    [".md", "md"],
    [".xls", "xls"],
    [".xlsx", "xls"]
])

// --- add extra _fileExtensions here ---

// List of input types that should not be stored in memory
var _inputNoMem = new Set([ "csv", "ndjson" ])

// --- add extra _inputNoMem here ---

// Input functions processing per line
var _inputLineFns = {
    "ndjson": (r, options) => {
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

// Transform functions
var _transformFns = {
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
    "maptoarray"    : _r => (toBoolean(params.maptoarray) && isObject(_r) ? $m4a(_r, params.maptoarraykey) : _r),
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
    }
}

// --- add extra _transformFns here ---

var _outputFns = new Map([
    ["pm", (r, options) => {
        $o(r, options)
    }],
    ["key", (r, options) => {
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
    
            var tempFile = false
            if (isUnDef(params.xlsfile)) {
                tempFile = true
                params.xlsfile = io.createTempFile("oafp", ".xlsx")
            }
    
            var xls = new XLS(io.fileExists(params.xlsfile) ? params.xlsfile : __)
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
        r = $path(r, options.__path)
        delete options.__path
    }
    if (options.__from) {
        r = $from(r).query(af.fromNLinq(options.__from))
        delete options.__from
    }
    if (options.__sql) {
        r = $sql(r, options.__sql)
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
        }
    }

    if (isDef(params.outputkey)) r = $$({}).set(params.outputkey, r)

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

// Input functions (input parsers)
var _inputFns = new Map([
    ["pm"   , (_res, options) => { if (isDef(__pm._map)) _res = __pm._map; if (isDef(__pm._list)) _res = __pm._list; _$o(_res, options) }],
    ["yaml" , (_res, options) => _$o(af.fromYAML(_res), options)],
    ["xml"  , (_res, options) => {
        params.xmlignored = _$(params.xmlignored, "xmlignored").isString().default(__)
        params.xmlprefix = _$(params.xmlprefix, "xmlprefix").isString().default(__)
        params.xmlfiltertag = toBoolean(_$(params.xmlfiltertag, "xmlfiltertag").isString().default(__))
        _$o(af.fromXML2Obj(_res, params.xmlignored, params.xmlprefix, !params.xmlfiltertag), options)
    }],
    ["ndjson", (_res, options) => {
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
        ow.loadTemplate()
        var _s = ow.template.md.fromTable(_res)
        _$o(_s, options)
    }],
    ["ini", (r, options) => {
        ow.loadJava()
        var ini = new ow.java.ini()
        if (isDef(params.file)) {
            _$o( ini.loadFile(params.file).get(), options )
        } else {
            _$o( ini.load(r).get(), options )
        }
    }],
    ["xls", (_res, options) => {
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
        if (isDef(params.file) || isDef(params.cmd)) {
            var is = isDef(params.cmd) ? af.fromBytes2InputStream(_runCmd2Bytes(params.cmd)) : io.readFileStream(params.file)
            _$o($csv(params.inputcsv).fromInStream(is).toOutArray(), options)
            is.close()
        } else {
            _$o($csv(params.inputcsv).fromInString( _res ).toOutArray(), options)
        }
    }],
    ["hsperf", (_res, options) => {
        if (isDef(params.file) || isDef(params.cmd)) {
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
        if (toBoolean(params.base64gzip)) {
            _$o(af.fromBytes2String(io.gunzip(af.fromBase64(_res, true))), options)
        } else {
            _$o(af.fromBytes2String(af.fromBase64(_res)), options)
        }
    }],
    ["json", (_res, options) => _$o(jsonParse(_res, __, __, true), options)]
])

// --- add extra _inputFns here ---

// Default format
params.format = _$(params.format, "format").isString().default(__)

// Initialize console detection
__initializeCon()
if (!String(java.lang.System.getProperty("os.name")).match(/Windows/)) __con.getTerminal().settings.set("sane")

// Set options
var options = { __format: params.format, __from: params.from, __sql: params.sql, __path: params.path, __csv: params.csv, __pause: params.pause, __key: params.__key }
// ndjson options
if (params.type == "ndjson") {
    params.ndjsonjoin = toBoolean(_$(params.ndjsonjoin, "ndjsonjoin").isString().default(__))
}
// csv options
if (isDef(params.inputcsv)) {
    params.inputcsv = params.csv.trim().startsWith("{") ? jsonParse(params.inputcsv, true) : af.fromSLON(params.inputcsv)
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
    if (isDef(params.file)) {
        if (!(io.fileExists(params.file))) {
            _exit(-1, "ERROR: File not found: '" + params.file + "'")
        }
        if (!_inputNoMem.has(params.type)) _res = io.readFileString(params.file)
    } else {
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
