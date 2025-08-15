;(function() {
    var _badgen = require("badgen.js")
    exports.oafplib = function(params, _$o, $o, oafp) {
        var _r = {
            output        : [ { 
                type: "badgen", 
                fn: (r, options) => {
                    r = _$(r, "badgen input").isMap().default({})
                    if (isDef(r.label)  && !isString(r.label))  r.label  = af.toSLON(r.label)
                    if (isDef(r.status) && !isString(r.status)) r.status = af.toSLON(r.status)
                    if (isDef(r.color)  && !isString(r.color))  r.color  = "013220"

                    var _r = _badgen.badgen(r)
                    if (toBoolean(params.badgenimg)) {
                        _r = _badgen.fromSVG(_r)
                    }

                    oafp._print(_r)
                }
            } ],
            help          : 
`# Badgen oafp lib

## ⬆️  Output formats

Extra output formats added by the Badgen lib:

| Output format | Description    |
|---------------|----------------|
| Badgen        | Badgen output  |

---

## 🧾 Badgen output options

List of options to use when _out=badgen_:

| Option | Type | Description |
|--------|------|-------------|
| badgenimg | Boolean | If true it will produce the HTML img tag to embeed the SVG Badgen content |

List of expected input data:

| Input | Type | Description |
|--------|------|-------------|
| label | String | The label text to use |
| status | String | The status text to use |
| color | String | The color name or RGB for the status background |
| style | String | A choice between 'classic' (default), 'flat' and 'rounded' |
| icon | String | The result of badgen.fromSVG for the intended icon |
| iconWidth | Number | The total width of the provided icon (defaults to 18) |
| labelColor | String | The color name or RGB for the label background color |
| textColor | String | Override the text color (default fff) |
| transparent | Boolean | If true draws only an outline / border (no fill) |
| borderColor | String | Outline color (defaults to main color) |
| scale | Number | Scale factor (default 1) |
| shadow | Boolean | Toggle subtle text shadow (default true) |
| borderStyle | String | 'solid','dash','dot','dashdot' or custom dasharray (e.g. "5 10") |

Possible color values:

* green: '3C1'
* blue: '08C'
* red: 'E43'
* yellow: 'DB1'
* orange: 'F73'
* purple: '94E'
* pink: 'E5B'
* grey: '999'
* gray: '999'
* cyan: '1BC'
* black: '2A2A2A'
* lightgreen: '90EE90'
* yellowgreen: '9ACD32'
* lightgrey: 'D3D3D3'
* blueviolet: '8A2BE2'
* grey2: '444D56'
* grey3: '24292E'

`
        }

        return _r
    }
})();

