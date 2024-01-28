var params = processExpr(" ")
// Author : Nuno Aguiar
var showHelp = () => {
    __initializeCon()

    var _f = (getOPackPath("oafproc") || ".") + "/README.md"
    if (io.fileExists(_f)) {
        __ansiColorFlag = true
		__conConsole = true
        if (isDef(ow.format.string.pauseString))
            ow.format.string.pauseString( ow.format.withMD( io.readFileString(_f) ) )
        else
            print(ow.format.withMD( io.readFileString(_f) ))
    } else {
        print("Check https://github.com/OpenAF/openaf-opacks/blob/master/oafproc/README.md")
    }

    exit(0)
}

ow.loadFormat()
if (__expr.indexOf(" -h") > -1) showHelp()

var _file = params.file, _format = params.output || params.format, _type = params.input || params.type, _from = params.from, _sql = params.sql, _path = params.path, _csv = params.csv, _pause = params.pause
var _sortmapkeys = params.sortmapkeys, _searchkeys = params.searchkeys, _searchvalues = params.searchvalues
var _xmlignored = params.xmlignored, _xmlprefix = params.xmlprefix, _xmlfiltertag = params.xmlfiltertag
var _ndjsonjoin = params.ndjsonjoin

// File extensions list
const _fileExtensions = new Map([
    [".json", "json"],
    [".yaml", "yaml"],
    [".xml", "xml"],
    [".csv", "csv"]
])

// List of input types that should not be stored in memory
var _inputNoMem = new Set([ "csv" ])

// Input functions processing per line
var _inputLineFns = {
    "ndjson": (r, options) => {
        if (!_ndjsonjoin) {
            $o(jsonParse(r, __, __, true), options)
            noFurtherOutput = true
        }
    }
}

// Transform functions
var _transformFns = {
    "_sortmapkeys" : _r => (toBoolean(_sortmapkeys) && isObject(_r) ? sortMapKeys(_r) : _r),
    "_searchkeys"  : _r => (isObject(_r) ? searchKeys(_r, _searchkeys) : _r),
    "_searchvalues": _r => (isObject(_r) ? searchValues(_r, _searchvalues) : _r)
}

// Util functions
const _transform = r => {
    var _ks = Object.keys(_transformFns)
    for(var ikey = 0; ikey < _ks.length; ikey++) {
        var key = _ks[ikey]
        if (isDef(global[key])) r = _transformFns[key](r)
    }
    return r
}
const _$o = (r, options) => {
    $o(_transform(r), options)
}

// Output functions
var _outputFns = new Map([
    ["yaml" , (_res, options) => _$o(af.fromYAML(_res), options)],
    ["xml"  , (_res, options) => {
        _xmlignored = _$(_xmlignored, "xmlignored").isString().default(__)
        _xmlprefix = _$(_xmlprefix, "xmlprefix").isString().default(__)
        _xmlfiltertag = toBoolean(_$(_xmlfiltertag, "xmlfiltertag").isString().default(__))
        _$o(af.fromXML2Obj(_res, _xmlignored, _xmlprefix, _xmlfiltertag), options)
    }],
    ["ndjson", (_res, options) => {
        if (_ndjsonjoin) {
            _$o(_res.split('\n').map(e => jsonParse(e.trim(), __, __, true)), options)
        } else {
            io.readLinesNDJSON(af.fromString2InputStream(_res), r => {
                _$o(r, options)
            })
        }
    }],
    ["md", (_res, options) => {
        __ansiColorFlag = true
        __conConsole = true
        print(ow.format.withMD(_res))
    }],
    ["csv", (_res, options) => {
        if (isDef(_file)) {
            var is = io.readFileStream(_file)
            _$o($csv().fromInStream(is).toOutArray(), options)
            is.close()
        } else {
            _$o($csv().fromInString( _res ).toOutArray(), options)
        }
    }],
    ["json", (_res, options) => _$o(jsonParse(_res, __, __, true), options)]
])

// Default format
_format = _$(_format, "format").isString().default("ctree")

// Initialize console detection
__initializeCon()

// Set options
var options = { __format: _format, __from: _from, __sql: _sql, __path: _path, __csv: _csv, __pause: _pause }
// ndjson options
if (_type == "ndjson") {
    _ndjsonjoin = toBoolean(_$(_ndjsonjoin, "ndjsonjoin").isString().default(__))
}

// Read input from stdin or file
var _res = "", noFurtherOutput = false
if (isDef(_file)) {
    if (!_inputNoMem.has(_type)) _res = io.readFileString(_file)
} else {
    _res = []
    io.pipeLn(r => {
        if (isDef(_inputLineFns[_type])) 
            _inputLineFns[_type](_transform(r), options)
        else
            _res.push(r)
        return false
    })
    _res = _res.join('\n')
}

if (!noFurtherOutput) {
    // Detect type if not provided
    if (isUnDef(_type)) {
        // File name based
        if (isDef(_file)) {
            let _ext = _file.substring(_file.lastIndexOf('.'))
            if (isDef(_fileExtensions[_ext])) _type = _fileExtensions[_ext]
        }

        // Content-based
        if (isUnDef(_type)) {
            let _tres = _res.trim()
            if (_tres.startsWith("{") || _tres.startsWith("[")) {
                _type = "json"
            } else if (_tres.startsWith("<")) {
                _type = "xml"
            } else {
                if (isString(_tres) && _tres.length > 0) {
                    if (_tres.substring(0, _tres.indexOf('\n')).split(",").length > 1) {
                        _type = "csv"
                    } else if (_tres.substring(0, _tres.indexOf(': ') > 0)) {
                        _type = "yaml"
                    }
                } else {
                    printErr("Please provide the input type.")
                    exit(-1)
                }
            }
        }
    }

    // Determine input type and execute
    if (isDef(_outputFns.has(_type))) {
        _outputFns.get(_type)(_res, options)
    } else {      
        _outputFnsget("json")(_res, options)
    }
}