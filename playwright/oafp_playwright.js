;(function() {
  loadLib("playwright.js")

  exports.oafplib = function(params, _$o, $o, oafp) {
    var _r = {
      fileExtensions: [ ],
      input         : [ {
        type: "playwright",
        fn  : (r, options) => {
          oafp._showTmpMsg()

          var _in = r
          if (isString(_in)) _in = { url: _in }
          _in = _$(oafp._fromJSSLON(_in, true), "input").isMap().default({})

          var _pw = new Playwright(params)
          _$o(_pw.run(_in), options)
        }
      } ],
      output        : [ {
        type: "playwright",
        fn  : (r, options) => {
          oafp._print(r)
        }
      }, {
        type: "playwrightscreenshot",
        fn  : (r, options) => {
          var _in = _$(r, "input").isMap().default({})
          var _pw = new Playwright(params)
          _pw.run(merge(_in, {
            screenshotPath: _$(params.playwrightscreenshot, "playwrightscreenshot").isString().default("playwright.png"),
            fullPage      : toBoolean(_$(params.fullpage, "fullpage").default(true))
          }))
        }
      } ],
      help          :
`# playwright oafp lib

## ⬇️  playwright input types:

| Input type | Description |
|------------|-------------|
| playwright | Opens an URL with Microsoft Playwright Java and returns page metadata/content |

### Example

\`\`\`
oafp libs=playwright in=playwright data="https://example.com" out=json
\`\`\`

## ⬆️  playwright output formats

| Output format | Description |
|---------------|-------------|
| playwright | Pretty prints the result map |
| playwrightscreenshot | Saves a screenshot of the URL passed as input |

### Screenshot example

\`\`\`
oafp libs=playwright in=playwright data="https://example.com" out=playwrightscreenshot playwrightscreenshot=example.png
\`\`\`
`
    }

    return _r
  }
})()
