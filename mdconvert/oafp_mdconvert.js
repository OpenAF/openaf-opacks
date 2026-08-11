;(function() {
    loadLib("mdconvert.js")

    exports.oafplib = function(params, _$o, $o, oafp) {
        var _newConverter = (tablesParam) => {
            return new MDConvert({ tables: isDef(params[tablesParam]) ? toBoolean(params[tablesParam]) : true })
        }

        var _r = {
            fileExtensions: [ { ext: ".md", type: "md2html" }, { ext: ".markdown", type: "md2html" } ],
            input         : [ {
                type: "md2html",
                fn: (r, options) => {
                    oafp._showTmpMsg()
                    var md = isString(r) ? r : stringify(r, __, "")
                    _$o(_newConverter("inmd2htmltables").toHTML(md), options)
                }
            } ],
            output        : [ {
                type: "html2md",
                fn: (r, options) => {
                    var html = isString(r) ? r : stringify(r, __, "")
                    var md = _newConverter("html2mdtables").htmlToMarkdown(html)

                    if (isDef(params.html2mdfile)) {
                        io.writeFileString(params.html2mdfile, md)
                    } else {
                        oafp._print(md)
                    }
                }
            }, {
                type: "md2pdf",
                fn: (r, options) => {
                    if (isUnDef(params.md2pdffile)) oafp._exit(-1, "Please provide a 'md2pdffile' parameter.")

                    var md = isString(r) ? r : stringify(r, __, "")
                    _newConverter("md2pdftables").toPDF(md, params.md2pdffile, {
                        baseUri: params.md2pdfbaseuri,
                        css    : params.md2pdfcss
                    })
                }
            }, {
                type: "md2docx",
                fn: (r, options) => {
                    if (isUnDef(params.md2docxfile)) oafp._exit(-1, "Please provide a 'md2docxfile' parameter.")

                    var md = isString(r) ? r : stringify(r, __, "")
                    _newConverter("md2docxtables").toDOCX(md, params.md2docxfile)
                }
            } ],
            help          :
`# mdconvert oafp lib

## ⬇️  mdconvert input types:

Extra input types added by the mdconvert lib:

| Input type | Description |
|------------|-------------|
| md2html    | Reads Markdown text and converts it to an HTML fragment |

The \`.md\`/\`.markdown\` file extensions are auto-mapped to \`in=md2html\`.

---

### 🧾 md2html input options

List of options to use when _in=md2html_:

| Option | Type | Description |
|--------|------|-------------|
| inmd2htmltables | Boolean | Enable/disable the GFM tables extension (default: true) |

---

## ⬆️  mdconvert output formats

Extra output formats added by the mdconvert lib:

| Output format | Description |
|---------------|-------------|
| html2md       | Converts HTML input to Markdown text |
| md2pdf        | Converts Markdown input to a PDF file |
| md2docx       | Converts Markdown input to a DOCX file |

---

### 🧾 html2md output options

List of options to use when _out=html2md_:

| Option | Type | Description |
|--------|------|-------------|
| html2mdfile | String | Output file name. If not provided, the Markdown is printed |
| html2mdtables | Boolean | Enable/disable the GFM tables extension (default: true) |

---

### 🧾 md2pdf output options

List of options to use when _out=md2pdf_:

| Option | Type | Description |
|--------|------|-------------|
| md2pdffile | String | Output PDF file name (required) |
| md2pdfbaseuri | String | Base URI/path used to resolve relative image and link paths |
| md2pdfcss | String | Extra CSS embedded into the HTML before PDF export |
| md2pdftables | Boolean | Enable/disable the GFM tables extension (default: true) |

---

### 🧾 md2docx output options

List of options to use when _out=md2docx_:

| Option | Type | Description |
|--------|------|-------------|
| md2docxfile | String | Output DOCX file name (required) |
| md2docxtables | Boolean | Enable/disable the GFM tables extension (default: true) |

---

### Examples

\`\`\`bash
# Markdown -> HTML (auto-detected from the .md extension, or use in=md2html)
oafp libs=mdconvert file=report.md out=text

# HTML -> Markdown
echo "<h1>Hello</h1>" | oafp libs=mdconvert in=raw out=html2md

# Markdown -> PDF (in=raw keeps the Markdown text as-is for out=md2pdf)
oafp libs=mdconvert file=report.md in=raw out=md2pdf md2pdffile=report.pdf

# Markdown -> DOCX
cat report.md | oafp libs=mdconvert in=raw out=md2docx md2docxfile=report.docx
\`\`\`
`
        }

        return _r
    }
})()
