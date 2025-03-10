;(function() {
    loadLib("terraform.js")
    exports.oafplib = function(params, _$o, $o, oafp) {
        var _r = {
            fileExtensions: [ { ext: ".tf", type: "tf" }, { ext: ".hcl", type: "hcl" } ],
            input         : [ {
                type: "hcl",
                fn  : (r, options) => {
                    oafp._showTmpMsg()
                    var _tf = new Terraform()
                    _$o(_tf.fromHCL(r), options)
                },
                type: "tf", 
                fn: (r, options) => {
                    oafp._showTmpMsg()
                    var _tf = new Terraform()
                    _$o(_tf.fromHCL(r), options)
                }
            } ],
            output        : [ { 
                type: "tf", 
                fn: (r, options) => {
                    var _tf = new Terraform()
                    oafp._print(_tf.toHCL(r))
                },
                type: "hcl", 
                fn: (r, options) => {
                    var _tf = new Terraform()
                    oafp._print(_tf.toHCL(r))
                }
            } ],
            transform     : [ ],
            help          : 
`# Terraform oafp lib

## ⬇️  Terraform input types:

Extra input types added by the terraform lib:

| Input type | Description |
|------------|-------------|
| tf       | Terraform/HCL input format  |
| hcl      | HCL input format |

---

## ⬆️  Terraform output formats

Extra output formats added by the terrform lib:

| Output format | Description |
|---------------|-------------|
| tf          | Terraform/HCL output format  |
| hcl         | HCL output format |
`
        }

        return _r
    }
})()