# md2email OpenAF OPack

Convert CommonMark/Markdown to **email-ready HTML** using [commonmark-java 0.24](https://github.com/commonmark/commonmark-java).

Key features:

- Full CommonMark compliance via commonmark-java
- GFM extensions: tables, strikethrough, task-list items, auto-link, INS/underline
- YAML front-matter extraction
- Inline CSS injection (email-client compatible)
- Built-in **default** and **dark** themes, plus custom theme registration
- Plain-text (`toText`) rendering for MIME multipart emails
- Email-safe XHTML document template wrapper with header/footer slots
- SVG-to-PNG conversion for inline SVG blocks (email-client compatible)

## Installation

```bash
opack install md2email
```

## Quick start

```javascript
loadLib("md2email.js")

var m    = new MD2Email()
var html = m.toEmailHTML("# Hello Alice\n\nYour report is ready.", {
    title  : "Weekly Report",
    footer : "© 2026 ACME Corp"
})

io.writeFileString("email.html", html)
```

## API

### `new MD2Email(aOptions)`

Creates a new converter instance.

| Option | Type | Default | Description |
|---|---|---|---|
| `tables` | Boolean | `true` | GFM tables |
| `strikethrough` | Boolean | `true` | `~~struck~~` → `<del>` |
| `taskListItems` | Boolean | `true` | `- [x]` checkboxes |
| `headingAnchor` | Boolean | `false` | Add `id=` to headings |
| `ins` | Boolean | `false` | `++underline++` → `<ins>` |
| `yamlFrontMatter` | Boolean | `false` | Parse YAML front matter |
| `autolink` | Boolean | `false` | Auto-link bare URLs |
| `sanitizeUrls` | Boolean | `false` | Sanitize `javascript:` links |

---

### `m.toHTML(aMarkdown) : String`

Returns a raw HTML fragment — no wrapping template, no inline styles.

```javascript
var m    = new MD2Email()
var html = m.toHTML("**bold** and _italic_")
// <p><strong>bold</strong> and <em>italic</em></p>
```

---

### `m.toText(aMarkdown) : String`

Returns a plain-text rendering (all markup stripped). Use this as the
`text/plain` alternative part of a MIME multipart email.

```javascript
var plain = m.toText("# Hello\n\n**World**")
// Hello\n\nWorld\n
```

---

### `m.toEmailHTML(aMarkdown, aOptions) : String`

Parses `aMarkdown`, applies inline styles, and wraps the result in a
full email-safe XHTML document.

#### `aOptions`

| Key | Type | Default | Description |
|---|---|---|---|
| `title` / `subject` | String | `""` | `<title>` value |
| `width` | String | `"600"` | Max width of the content column |
| `padding` | String | `"32px 40px"` | Inner padding of content cell |
| `bgColor` | String | `"#f5f5f5"` | Page background colour |
| `contentBg` | String | `"#ffffff"` | Content area background |
| `borderColor` | String | `"#eeeeee"` | Header/footer separator colour |
| `fontFamily` | String | `"Arial,Helvetica,sans-serif"` | Base font |
| `fontSize` | String | `"14px"` | Base font size |
| `header` | String | `""` | Raw HTML inserted above the content |
| `footer` | String | `""` | Raw HTML inserted below the content |
| `styleMap` | Map | `{}` | Override/extend the element style map |
| `theme` | String | `"default"` | Named theme: `"default"` or `"dark"` |
| `wrap` | Boolean | `true` | Wrap in full HTML doc (false → styled fragment only) |
| `svgToPng` | Boolean | `false` | Convert inline `<svg>...</svg>` blocks to PNG images |
| `svgPngMode` | String | `"file"` | `"file"` to create PNG files + `<img src="file">`, `"embed"` for data URI |
| `svgPngOutDir` | String | `"."` | Output directory when `svgPngMode = "file"` |
| `svgPngBaseName` | String | `"md2email-svg"` | Prefix for generated PNG filenames |
| `svgNormalizeFonts` | Boolean | `true` | Rewrite SVG web/system font aliases to Java AWT font families before PNG rendering |
| `svgFontFamilyAliases` | Map | built-in OS-aware aliases | Override or add SVG font-family aliases used before PNG rendering |

```javascript
var m  = new MD2Email({ tables: true, strikethrough: true })
var md = [
    "# System Alert",
    "",
    "| Host    | Status |",
    "|---------|--------|",
    "| web-01  | ~~DOWN~~ |",
    "| web-02  | OK     |",
    "",
    "> **Action required:** restart web-01 immediately.",
    "",
    "Regards,  ",
    "Monitoring Bot"
].join("\n")

var html = m.toEmailHTML(md, {
    title      : "System Alert",
    bgColor    : "#fff8f0",
    header     : "<h2 style='color:#cc0000;margin:0;'>&#9888; Alert</h2>",
    footer     : "You receive this because you are on the ops team.",
    styleMap   : { h1: "color:#cc0000;font-size:26px;" }
})

io.writeFileString("alert.html", html)
```

---

### `m.toHTMLMap(aMarkdown, aOptions) : Map`

Converts markdown to HTML and returns a map:

- `html` → resulting HTML (with `<svg>` converted when enabled)
- `pngFiles` → list of generated PNG paths

SVG blocks that the PNG renderer cannot parse are left inline instead of
failing the conversion.

Before JSVG renders inline SVG text, md2email rewrites common browser font
aliases such as `system-ui`, `-apple-system`, `BlinkMacSystemFont`,
`ui-sans-serif`, `sans-serif`, `serif`, and `monospace` to Java AWT font
families available on the current OS. The built-in aliases prefer native
system UI fonts on macOS, Windows, and Linux, then fall back to Java logical
fonts such as `SansSerif`.

```javascript
var m = new MD2Email()
var res = m.toHTMLMap("Chart:<svg viewBox='0 0 100 20'><rect width='100' height='20' fill='red'/></svg>", {
  svgToPng     : true,
  svgPngMode   : "file",
  svgPngOutDir : "/tmp",
  svgPngBaseName: "mail-chart",
  svgFontFamilyAliases: {
    "system-ui": [ "Segoe UI", "Helvetica Neue", "Noto Sans", "SansSerif" ]
  }
})
print(res.pngFiles)
```

---

### `m.setEmailFromMarkdown(aEmail, aMarkdownString, aOptions) : Map`

Renders a markdown string as email-ready HTML, rewrites local markdown image
references to `cid:...`, embeds those files into an OpenAF `Email` object with
`embedFile(path, name)`, sets the email charset to `UTF-8` by default, and then
calls `setHTML(html)`.

Inline `<svg>...</svg>` blocks are converted to PNG files by default so they
can also be embedded. SVG blocks that cannot be converted are left inline.
Relative image paths are resolved from `baseDir`, which defaults to the current
folder.

```javascript
plugin("Email")
loadLib("md2email.js")

var email = new Email("smtp.example.com", "me@example.com", true, true, true)
email.login("me@example.com", "password")

var md = [
    "# Weekly Report",
    "",
    "![Chart](chart.png)"
].join("\n")

var res = new MD2Email().setEmailFromMarkdown(email, md, {
    title  : "Weekly Report",
    baseDir: "/path/to/report-assets"
})

email.send("Weekly Report", res.text, [ "you@example.com" ], [], [], "me@example.com")
```

Additional options:

| Key | Type | Default | Description |
|---|---|---|---|
| `baseDir` | String | `"."` | Folder used to resolve relative image paths |
| `emailCharset` | String / Boolean | `"UTF-8"` | Charset passed to `Email.setCharset()` before content is set; use `false` to skip |
| `setMessage` | Boolean | `true` | Also call `setMessage()` with the markdown plain-text rendering |
| `embedExternalImages` | Boolean | `false` | Call `addExternalImage()` for `http(s)` images |

The returned map includes `html`, `text`, `embeddedFiles`, `externalImages`,
and the original `email` object.

### `m.setEmailFromMarkdownFile(aEmail, aMarkdownFile, aOptions) : Map`

Reads a markdown file and delegates to `setEmailFromMarkdown()`. Relative image
paths are resolved from the markdown file folder unless `baseDir` is provided.

```javascript
var res = new MD2Email().setEmailFromMarkdownFile(email, "report.md", {
    title: "Weekly Report"
})
```

---

### `m.parse(aMarkdown) : Node`

Returns the commonmark-java AST `Document` node for further inspection or
custom rendering.

```javascript
var doc  = m.parse("# Hello")
var html = m.toHTMLFromNode(doc)
```

---

### `m.toHTMLFromNode(aNode) : String`

Renders a previously parsed AST node back to HTML.

---

### `m.extractFrontMatter(aMarkdown) : Map`

Parses YAML front matter and returns a plain JavaScript map. Requires
`{ yamlFrontMatter: true }` in the constructor.

```javascript
var m = new MD2Email({ yamlFrontMatter: true })
var md = [
    "---",
    "title: Monthly Report",
    "to: alice@example.com",
    "---",
    "",
    "# Report body"
].join("\n")

var meta = m.extractFrontMatter(md)
print(meta.title)   // Monthly Report
print(meta.to)      // alice@example.com

// Use metadata to drive sending and content together:
var html = m.toEmailHTML(md, { title: meta.title })
```

---

### Style management

```javascript
// Override a single element's style
m.setStyle("a", "color:#009900;text-decoration:none;")

// Read a single element's style
print(m.getStyle("h1"))

// Replace the entire style map
m.setStyleMap({ h1: "font-size:32px;", p: "line-height:1.8;" })

// Get the full map (for inspection / cloning)
var map = m.getStyleMap()
```

---

### Theme management

```javascript
// List available themes
md2email.getAvailableThemes()    // ["default", "dark"]

// Register a custom brand theme
md2email.registerTheme("brand", {
    h1   : "font-size:30px;color:#d04020;font-family:Georgia,serif;",
    h2   : "font-size:22px;color:#d04020;font-family:Georgia,serif;",
    a    : "color:#d04020;",
    table: "border-collapse:collapse;width:100%;",
    th   : "background:#d04020;color:#ffffff;padding:8px 12px;",
    td   : "border:1px solid #e0b0a8;padding:8px 12px;"
})

var html = m.toEmailHTML(md, { theme: "brand" })
```

---

### Module-level shortcuts

```javascript
// Raw HTML fragment
var html = md2email.convert("## Title\n\nSome _text_.")

// Full email document in one call
var email = md2email.toEmail(
    "# Hello\n\nBody.",
    { autolink: true },             // MD2Email constructor options
    { title: "Hello", wrap: true }  // email template options
)

// Return map result with generated PNG files
var emailMap = md2email.toEmailMap(
  "Inline SVG: <svg viewBox='0 0 20 20'><circle cx='10' cy='10' r='8' fill='green'/></svg>",
  {},
  { svgToPng: true, svgPngMode: "embed" }
)

// Populate an OpenAF Email object from markdown and embed local images
var res = md2email.setEmailFromMarkdown(email, "# Report\n\n![Chart](chart.png)", {}, {
    title  : "Report",
    baseDir: "/path/to/report-assets"
})

// Or read markdown from a file; relative images resolve from that file's folder
var fileRes = md2email.setEmailFromMarkdownFile(email, "report.md", {}, {
    title: "Report"
})

// Apply inline styles to an existing HTML string
var styled = md2email.applyInlineStyles(existingHtml, {
    p   : "color:#333;line-height:1.7;",
    code: "background:#f0f0f0;padding:2px 4px;"
})

// Wrap an HTML fragment in the email template
var full = md2email.wrapInTemplate("<p>Hi there</p>", {
    title  : "Greeting",
    bgColor: "#eef5fb"
})
```

---

### `md2email.yaml` oJob shortcut: `mdemail`

`mdemail` sends emails directly from Markdown using the same send arguments as
`oJob Send email` (`server`, `from`, `to`, `cc`, `bcc`, `credentials`,
`embedFiles`, `embedURLs`, `addAttachments`, `addImages`, etc.), plus Markdown
source/render options.

Exactly one source is required:

- `file` for markdown file input
- `markdown` for inline markdown input

`subject` is required and used as the shortcut key arg.

```bash
# Send from markdown file (relative images become CID embeds)
ojob md2email.yaml mdemail subject="Weekly report" \
  server="smtp.example.com" from="me@example.com" to="you@example.com" \
  file="report.md" title="Weekly report" useSSL=true
```

```bash
# Send from inline markdown with templified subject/body and altOutput override
ojob md2email.yaml mdemail subject="Status {{env}}" env="prod" \
  server="smtp.example.com" from="me@example.com" to="ops@example.com" \
  markdown="# {{env}} status\n\nAll systems operational." \
  altOutput="Plain status for {{env}}"
```

---

## Running the tests

```bash
cd tests
ojob autoTestMd2Email.yaml
```

## Built-in elements styled per theme

Both the **default** and **dark** themes cover the following HTML elements:

`h1` `h2` `h3` `h4` `h5` `h6` `p` `a` `strong` `em` `del` `ins` `code`
`pre` `pre code` `blockquote` `ul` `ol` `li` `table` `th` `td` `hr` `img`

## Dependencies

All JARs are self-contained in the opack — no external runtime dependencies.

| JAR | Version | Purpose |
|---|---|---|
| `commonmark` | 0.24.0 | Core CommonMark parser & renderer |
| `commonmark-ext-gfm-tables` | 0.24.0 | GFM pipe tables |
| `commonmark-ext-gfm-strikethrough` | 0.24.0 | `~~struck~~` |
| `commonmark-ext-task-list-items` | 0.24.0 | `- [x]` checkboxes |
| `commonmark-ext-heading-anchor` | 0.24.0 | `id=` on headings |
| `commonmark-ext-ins` | 0.24.0 | `++underline++` |
| `commonmark-ext-yaml-front-matter` | 0.24.0 | YAML metadata |
| `commonmark-ext-autolink` | 0.24.0 | Bare URL linking |
| `autolink` | 0.12.0 | URL detection (used by autolink ext) |
| `jsvg` | 2.0.0 | SVG to PNG rendering for inline SVG blocks |
