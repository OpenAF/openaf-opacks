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
| `autolink` | 0.11.0 | URL detection (used by autolink ext) |
