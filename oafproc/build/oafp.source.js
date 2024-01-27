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
var _xmlignored = params.xmlignored, _xmlprefix = params.xmlprefix, _xmlfiltertag = params.xmlfiltertag
var _ndjsonjoin = params.ndjsonjoin

// Default format
_format = _$(_format, "format").isString().default("ctree")

// Initialize console detection
__initializeCon()

// Set options
var options = { __format: _format, __from: _from, __sql: _sql, __path: _path, __csv: _csv, __pause: _pause }
if (_type == "ndjson") {
    _ndjsonjoin = toBoolean(_$(_ndjsonjoin, "ndjsonjoin").isString().default(__))
}

// Read input from stdin or file
var _res = "", noFurtherOutput = false
if (isDef(_file)) {
    if (_type != "csv") _res = io.readFileString(_file)
} else {
    _res = []
    io.pipeLn(r => {
        if (_type == "ndjson" && !_ndjsonjoin) {
            $o(jsonParse(r, __, __, true), options)
            noFurtherOutput = true
        } else {
            _res.push(r)
        }
        return false
    })
    _res = _res.join('\n')
}

if (!noFurtherOutput) {
    // Detect type if not provided
    if (isUnDef(_type)) {
        // File name based
        if (isDef(_file)) {
            switch(_file.substring(_file.lastIndexOf('.'))) {
            case '.json': _type = "json"; break
            case '.yaml': _type = "yaml"; break
            case '.xml' : _type = "xml"; break
            case '.csv' : _type = "csv"; break
            }
        }

        // Content-based
        if (isUnDef(_type)) {
            if (_res.trim().startsWith("{") || _res.trim().startsWith("[")) {
                _type = "json"
            } else if (_res.trim().startsWith("<")) {
                _type = "xml"
            } else {
                if (isString(_res) && _res.length > 0) {
                    if (_res.substring(0, _res.indexOf('\n')).split(",").length > 1) {
                        _type = "csv"
                    } else if (_res.substring(0, _res.indexOf(': ') > 0)) {
                        _type = "yaml"
                    }
                } else {
                    printErr("Please provide the input type.")
                    exit(-1)
                }
            }
        }
    }

    // Determine input type
    switch(_type) {
    case 'yaml':
        $o(af.fromYAML(_res), options)
        break
    case 'xml':
        _xmlignored = _$(_xmlignored, "xmlignored").isString().default(__)
        _xmlprefix = _$(_xmlprefix, "xmlprefix").isString().default(__)
        _xmlfiltertag = toBoolean(_$(_xmlfiltertag, "xmlfiltertag").isString().default(__))
        $o(af.fromXML2Obj(_res, _xmlignored, _xmlprefix, _xmlfiltertag), options)
        break
    case 'ndjson':
        if (_ndjsonjoin) {
            $o(_res.split('\n').map(e => jsonParse(e.trim(), __, __, true)), options)
        } else {
            io.readLinesNDJSON(af.fromString2InputStream(_res), r => {
                $o(r, options)
            })
        }
        break
    case 'md':
        __ansiColorFlag = true
		__conConsole = true
        print(ow.format.withMD(_res))
        break
    case 'csv':
        if (isDef(_file)) {
            var is = io.readFileStream(_file)
            $o($csv().fromInStream(is).toOutArray(), options)
            is.close()
        } else {
            $o($csv().fromInString( _res ).toOutArray(), options)
        }
        break
    case 'json':
    default:
        $o(jsonParse(_res, __, __, true), options)
    }
}