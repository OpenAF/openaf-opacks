;(function() {
    exports.oafplib = function(params, _$o, $o, oafp) {
        loadLib("aws.js")
        var _r = {
            //fileExtensions: [ { ext: ".test", type: "test" } ],
            input         : [ /*{ 
                type: "test", 
                fn: (r, options) => {
                    oafp._showTmpMsg()
                    _$o({ test: 'test input' }, options)
                }
            }*/ ],
            output        : [ /*{ 
                type: "test", 
                fn: (r, options) => {
                    $o({ test: 'test output' }, options)
                }
            }*/ ],
            transform     : [ /*{ 
                type: "test", 
                fn: (r) => {
                    return { test: 'test transform' }
                }
            }*/ ],
            help          : 
`# AWS oafp lib

## ⬇️  AWS input types:

Extra input types added by the aws lib:

| Input type | Description |
|------------|-------------|
| | |

---

## 🚜 AWS optional transforms:

Extra optional transforms added by the aws lib:

| Option | Type | Description |
|--------|------|-------------|
| | | |

---

## ⬆️  AWS output formats

Extra output formats added by the AWS lib:

| Output format | Description |
|---------------|-------------|
| | |
`
        }

        return _r
    }
})()