;(function() {
    exports.oafplib = function(params, _$o, _o$o, _oafp) {
        loadLib("mac.js")

        // ----
        // Main
        var _r = {
            fileExtensions: [ { ext: ".plist", type: "plist" } ],
            input         : [ {
                type: "plist",
                fn  : (r, options) => {
                    _oafp._showTmpMsg()
                    if (isString(params.file)) {
                        _$o(io.readFilePList(params.file), options)
                    } else {
                        if (isString(params.cmd)) {
                            _$o(af.fromPList(_oafp._runCmd2Bytes(params.cmd)), options)
                        } else {
                            _$o(af.fromPList(r), options)
                        }
                    }
                }
            } ],
            output        : [ {
                type: "plist",
                fn  : (r, options) => {
                    if (isString(params.plistfile)) {
                        io.writeFilePList(params.plistfile, r)
                    } else {
                        _oafp._print( af.toPList(r) )
                    }
                }
            }, {
                type: "plistbin",
                fn  : (r, options) => {
                    if (isString(params.plistfile)) {
                        io.writeFilePListBin(params.plistfile, r)
                    } else {
                        _oafp.exit(-1, "Please provide a plist binary file to write to.")
                    }
                }
            
            } ],
            transform     : [ ],
            help          :
`# Mac oafp lib

## ⬇️  Mac Inputs:

Extra input types added by the Mac lib:

| Input type | Description |
|------------|-------------|
| plist      | Tries to read a PList XML format or binary format and convert it. |

---

## ⬆️  Mac Outputs:

Extra output formats added by the Mac lib:

| Output format | Description |
|---------------|-------------|
| plist         | Tries to write into a PList XML format or file. |
| plistbin      | Tries to write into a binary PList format or file. |

---

## 🧾 PList output options

List of options to use when _out=plist_:

| Option | Type | Description |
|--------|------|-------------|
| plistfile | String | The file to write the PList XML format. |

---

## 🧾 PListBin output options

List of options to use when _out=plistbin_:

| Option | Type | Description |
|--------|------|-------------|
| plistfile | String | The file to write the PList binary format. |

`
        }

        return _r
    }
})()