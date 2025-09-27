;(function() {
    loadLib("cq.js")
    exports.oafplib = function(params, _$o, $o, oafp) {
        var _r = {
            input         : [ { 
                type: "cq", 
                fn: (r, options) => {
                    if (isString(r)) r = oafp._fromJSSLON(r, true)
                    if (isUnDef(r.path)) oafp._exit(-1, "Missing required parameter: path")

                    oafp._showTmpMsg()
                    var _cq = new CQ(r.path)
                    _$o(_cq.readAll(), options)
                    _cq.close()
                }
            } ],
            output        : [ { 
                type: "cq", 
                fn: (r, options) => {
                    if (isUnDef(params.cqpath)) oafp._exit(-1, "Missing required parameter: cqpath")

                    var _cq = new CQ(params.cqpath, params.cqcycle)
                    if (isArray(r)) {
                        _cq.appendAll(r)
                    } else {
                        _cq.append(r)
                    }
                    $o({ cq: 'cq output' }, options)
                }
            } ],
            help          : 
`# cq oafp lib

## ⬇️  cq input types:

Extra input types added by the cq lib:

| Input type | Description |
|------------|-------------|
| cq         | cq input    |

The input data needs to provide the 'path' property.

---

## ⬆️  Output formats

Extra output formats added by the cq lib:

| Output format | Description |
|---------------|-------------|
| cq            | cq output   |

---

### 🧾 CQ output options

List of options to use when _out=cq_:

| Option | Type | Description |
|--------|------|-------------|
| cqpath | string | The path to the CQ files |
| cqcycle | string | A cycle type from: DAILY, HOURLY, MINUTELY, SECONDLY, FIVE_MINUTELY, TEN_MINUTELY, TWENTY_MINUTELY, HALF_HOURLY, TWO_HOURLY, FOUR_HOURLY, SIX_HOURLY, WEEKLY, LARGE_DAILY, LARGE_HOURLY, XLARGE_DAILY, HUGE_DAILY |

`
        }

        return _r
    }
})();