# mdconvert OpenAF OPack

Convert **HTML to Markdown**, and **Markdown to HTML, PDF and DOCX** using
[flexmark-java 0.64.8](https://github.com/vsch/flexmark-java).

Key features:

- HTML → Markdown conversion (`flexmark-html2md-converter`)
- Markdown → HTML rendering with the GFM tables extension
- Markdown → PDF export (`flexmark-pdf-converter`, via [openhtmltopdf](https://github.com/danfickle/openhtmltopdf))
- Markdown → DOCX export (`flexmark-docx-converter`, via [docx4j](https://github.com/plutext/docx4j))
- Byte-array and direct-to-file variants for every binary output

## Installation

```bash
opack install mdconvert
```

## Quick start

```javascript
loadLib("mdconvert.js")

var c = new MDConvert()

var md = c.htmlToMarkdown("<h1>Report</h1><p>All systems <b>operational</b>.</p>")

c.toPDF(md, "report.pdf")
c.toDOCX(md, "report.docx")
```

## API

### `new MDConvert(aOptions)`

Creates a new converter instance.

| Option | Type | Default | Description |
|---|---|---|---|
| `tables` | Boolean | `true` | GFM tables extension for Markdown parsing/rendering |

---

### `c.htmlToMarkdown(aHTML) : String`

Converts an HTML string to Markdown.

```javascript
var md = c.htmlToMarkdown("<h1>Hello</h1><p>World</p>")
// Hello\n=====\n\nWorld\n
```

---

### `c.toHTML(aMarkdown) : String`

Converts Markdown to an HTML fragment.

```javascript
var html = c.toHTML("**bold** and _italic_")
// <p><strong>bold</strong> and <em>italic</em></p>
```

---

### `c.parse(aMarkdown) : Node`

Parses Markdown into a flexmark-java `Node` (AST). Pass the result to
`toHTMLFromNode()` to render it, or inspect it directly.

### `c.toHTMLFromNode(aNode) : String`

Renders a previously parsed `Node` to an HTML string.

---

### `c.toPDFBytes(aMarkdown, aOptions) : Array`

Converts Markdown to a PDF document, returned as an OpenAF byte array.

| Option | Type | Default | Description |
|---|---|---|---|
| `baseUri` | String | `""` | Base URI/path used to resolve relative image and link paths |
| `css` | String | `""` | Extra CSS embedded into the HTML before PDF export |

```javascript
var bytes = c.toPDFBytes("# Hello\n\nWorld")
io.writeFileBytes("hello.pdf", bytes)
```

### `c.toPDF(aMarkdown, aOutputFile, aOptions)`

Same as `toPDFBytes()`, writing straight to `aOutputFile`.

```javascript
c.toPDF("# Hello\n\nWorld", "hello.pdf")
```

---

### `c.toDOCXBytes(aMarkdown, aOptions) : Array`

Converts Markdown to a DOCX document, returned as an OpenAF byte array.

```javascript
var bytes = c.toDOCXBytes("# Hello\n\nWorld")
io.writeFileBytes("hello.docx", bytes)
```

### `c.toDOCX(aMarkdown, aOutputFile, aOptions)`

Same as `toDOCXBytes()`, writing straight to `aOutputFile`.

```javascript
c.toDOCX("# Hello\n\nWorld", "hello.docx")
```

---

### Module-level shortcuts

Each shortcut wraps `new MDConvert(aConvertOptions)` for one-off conversions.

| Shortcut | Equivalent |
|---|---|
| `mdconvert.html2md(aHTML, aOptions)` | `new MDConvert(aOptions).htmlToMarkdown(aHTML)` |
| `mdconvert.md2html(aMarkdown, aOptions)` | `new MDConvert(aOptions).toHTML(aMarkdown)` |
| `mdconvert.md2pdf(aMarkdown, aConvertOptions, aPdfOptions)` | `.toPDFBytes(aMarkdown, aPdfOptions)` |
| `mdconvert.md2pdfFile(aMarkdown, aOutputFile, aConvertOptions, aPdfOptions)` | `.toPDF(aMarkdown, aOutputFile, aPdfOptions)` |
| `mdconvert.md2docx(aMarkdown, aConvertOptions, aDocxOptions)` | `.toDOCXBytes(aMarkdown, aDocxOptions)` |
| `mdconvert.md2docxFile(aMarkdown, aOutputFile, aConvertOptions, aDocxOptions)` | `.toDOCX(aMarkdown, aOutputFile, aDocxOptions)` |

```javascript
loadLib("mdconvert.js")

var md = mdconvert.html2md("<h1>Hello</h1>")
mdconvert.md2pdfFile("# Hello", "hello.pdf")
mdconvert.md2docxFile("# Hello", "hello.docx")
```

## Running the tests

```bash
cd tests
ojob autoTestMdConvert.yaml
```

## Dependencies

All JARs are self-contained in the opack — no external runtime dependencies.
The PDF and DOCX paths pull in real document-rendering engines
(openhtmltopdf/PDFBox for PDF, docx4j for DOCX), so this opack is noticeably
heavier than a plain Markdown-to-HTML converter (~70 jars, ~40MB — comparable
to `plugin-XLS`, the repo's other binary-document opack).

| JAR (group) | Purpose |
|---|---|
| `flexmark` | Core Markdown parser/renderer |
| `flexmark-ext-tables` | GFM pipe tables |
| `flexmark-html2md-converter` | HTML → Markdown |
| `flexmark-pdf-converter` | Markdown/HTML → PDF |
| `flexmark-docx-converter` | Markdown → DOCX |
| `openhtmltopdf-*`, `pdfbox`, `fontbox`, `xmpbox` | PDF rendering engine (used by `flexmark-pdf-converter`) |
| `docx4j-*`, `icu4j`, `jaxb-*`, `jakarta.*` | DOCX rendering engine (used by `flexmark-docx-converter`) |
| `jsoup` | HTML parsing (used by `flexmark-html2md-converter`) |

**Note:** `flexmark-docx-converter`/docx4j require `jakarta.activation`
(the `jakarta.*` namespace), while OpenAF's own bundled `openaf.jar` only
provides the older `javax.activation` namespace. Running
`ojob ojob.io/oaf/checkOAFJars ... remove=true` against this opack will
incorrectly flag `jakarta.activation-*.jar` as a duplicate and remove it —
if that happens, DOCX conversion breaks with a
`NoClassDefFoundError: jakarta/activation/DataSource`. Re-fetch just that
jar (`com.sun.activation:jakarta.activation:2.0.1`) if it's ever removed.
