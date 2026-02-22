// md2email — OpenAF wrapper for commonmark-java
// Parses CommonMark/Markdown and produces email-ready HTML output.
//
// Author: Nuno Aguiar

var __md2emailPath = getOPackPath("md2email") || "."
loadExternalJars(__md2emailPath)

// ---------------------------------------------------------------------------
// Default per-element inline styles (email-client–compatible)
// ---------------------------------------------------------------------------
var __md2emailStyles = {
    "default": {
        h1         : "font-size:28px;font-weight:bold;margin:0 0 16px 0;color:#1a1a1a;line-height:1.3;font-family:Arial,Helvetica,sans-serif;",
        h2         : "font-size:22px;font-weight:bold;margin:24px 0 12px 0;color:#1a1a1a;line-height:1.3;font-family:Arial,Helvetica,sans-serif;",
        h3         : "font-size:18px;font-weight:bold;margin:20px 0 10px 0;color:#1a1a1a;line-height:1.3;font-family:Arial,Helvetica,sans-serif;",
        h4         : "font-size:16px;font-weight:bold;margin:18px 0 8px 0;color:#333333;line-height:1.3;font-family:Arial,Helvetica,sans-serif;",
        h5         : "font-size:14px;font-weight:bold;margin:14px 0 6px 0;color:#333333;line-height:1.3;font-family:Arial,Helvetica,sans-serif;",
        h6         : "font-size:13px;font-weight:bold;margin:12px 0 6px 0;color:#666666;line-height:1.3;font-family:Arial,Helvetica,sans-serif;",
        p          : "margin:0 0 16px 0;line-height:1.7;color:#333333;font-family:Arial,Helvetica,sans-serif;font-size:14px;",
        a          : "color:#0066cc;text-decoration:underline;",
        strong     : "font-weight:bold;",
        em         : "font-style:italic;",
        del        : "text-decoration:line-through;color:#888888;",
        ins        : "text-decoration:underline;",
        code       : "font-family:'Courier New',Courier,monospace;background-color:#f5f5f5;padding:2px 5px;border-radius:3px;font-size:12px;color:#c7254e;border:1px solid #e1e1e8;",
        pre        : "background-color:#f5f5f5;padding:16px;border-radius:4px;margin:0 0 16px 0;border:1px solid #dddddd;overflow:auto;",
        "pre code" : "background:none;padding:0;border:none;font-size:13px;color:#333333;",
        blockquote : "border-left:4px solid #0066cc;padding:8px 16px;margin:0 0 16px 24px;color:#555555;font-style:italic;background-color:#f9f9f9;",
        ul         : "margin:0 0 16px 0;padding-left:28px;",
        ol         : "margin:0 0 16px 0;padding-left:28px;",
        li         : "margin:5px 0;line-height:1.6;color:#333333;font-family:Arial,Helvetica,sans-serif;font-size:14px;",
        table      : "border-collapse:collapse;width:100%;margin:0 0 16px 0;",
        th         : "border:1px solid #cccccc;padding:10px 14px;background-color:#f5f5f5;font-weight:bold;text-align:left;color:#333333;font-family:Arial,Helvetica,sans-serif;font-size:14px;",
        td         : "border:1px solid #cccccc;padding:10px 14px;color:#333333;font-family:Arial,Helvetica,sans-serif;font-size:14px;",
        hr         : "border:none;border-top:2px solid #eeeeee;margin:24px 0;",
        img        : "max-width:100%;height:auto;display:block;"
    },
    "dark": {
        h1         : "font-size:28px;font-weight:bold;margin:0 0 16px 0;color:#ffffff;line-height:1.3;font-family:Arial,Helvetica,sans-serif;",
        h2         : "font-size:22px;font-weight:bold;margin:24px 0 12px 0;color:#ffffff;line-height:1.3;font-family:Arial,Helvetica,sans-serif;",
        h3         : "font-size:18px;font-weight:bold;margin:20px 0 10px 0;color:#eeeeee;line-height:1.3;font-family:Arial,Helvetica,sans-serif;",
        h4         : "font-size:16px;font-weight:bold;margin:18px 0 8px 0;color:#eeeeee;line-height:1.3;font-family:Arial,Helvetica,sans-serif;",
        h5         : "font-size:14px;font-weight:bold;margin:14px 0 6px 0;color:#cccccc;line-height:1.3;font-family:Arial,Helvetica,sans-serif;",
        h6         : "font-size:13px;font-weight:bold;margin:12px 0 6px 0;color:#aaaaaa;line-height:1.3;font-family:Arial,Helvetica,sans-serif;",
        p          : "margin:0 0 16px 0;line-height:1.7;color:#dddddd;font-family:Arial,Helvetica,sans-serif;font-size:14px;",
        a          : "color:#66aaff;text-decoration:underline;",
        strong     : "font-weight:bold;",
        em         : "font-style:italic;",
        del        : "text-decoration:line-through;color:#888888;",
        ins        : "text-decoration:underline;",
        code       : "font-family:'Courier New',Courier,monospace;background-color:#2d2d2d;padding:2px 5px;border-radius:3px;font-size:12px;color:#e6db74;border:1px solid #444444;",
        pre        : "background-color:#2d2d2d;padding:16px;border-radius:4px;margin:0 0 16px 0;border:1px solid #444444;overflow:auto;",
        "pre code" : "background:none;padding:0;border:none;font-size:13px;color:#f8f8f2;",
        blockquote : "border-left:4px solid #66aaff;padding:8px 16px;margin:0 0 16px 24px;color:#aaaaaa;font-style:italic;background-color:#2a2a2a;",
        ul         : "margin:0 0 16px 0;padding-left:28px;",
        ol         : "margin:0 0 16px 0;padding-left:28px;",
        li         : "margin:5px 0;line-height:1.6;color:#dddddd;font-family:Arial,Helvetica,sans-serif;font-size:14px;",
        table      : "border-collapse:collapse;width:100%;margin:0 0 16px 0;",
        th         : "border:1px solid #444444;padding:10px 14px;background-color:#2d2d2d;font-weight:bold;text-align:left;color:#eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:14px;",
        td         : "border:1px solid #444444;padding:10px 14px;color:#dddddd;font-family:Arial,Helvetica,sans-serif;font-size:14px;",
        hr         : "border:none;border-top:2px solid #444444;margin:24px 0;",
        img        : "max-width:100%;height:auto;display:block;"
    }
}

// ---------------------------------------------------------------------------
// Internal: apply inline styles to rendered HTML
// ---------------------------------------------------------------------------
var __md2emailApplyStyles = function(aHTML, aStyleMap) {
    var html = aHTML

    // Handle <pre><code> first (compound selector) before individual tags
    if (isDef(aStyleMap["pre code"])) {
        var preCodeStyle = aStyleMap["pre code"]
        html = html.replace(/<pre([^>]*)>\s*<code([^>]*)>/gi, function(m, preAttrs, codeAttrs) {
            var newPre  = __md2emailStyledTag("pre",  preAttrs,  aStyleMap["pre"])
            var newCode = __md2emailStyledTag("code", codeAttrs, preCodeStyle)
            return newPre + "\n" + newCode
        })
    }

    // Single-element tags
    var singles = ["h1","h2","h3","h4","h5","h6","p","a","strong","em",
                   "del","ins","blockquote","ul","ol","li",
                   "table","thead","tbody","tr","th","td","img"]
    singles.forEach(function(tag) {
        if (isUnDef(aStyleMap[tag])) return
        var style = aStyleMap[tag]
        html = html.replace(new RegExp("<" + tag + "(\\s[^>]*)?>", "gi"), function(match, attrs) {
            return __md2emailStyledTag(tag, attrs || "", style)
        })
    })

    // <pre> and standalone <code> (not inside <pre>)
    if (isDef(aStyleMap["pre"]) && (isUnDef(aStyleMap["pre code"]))) {
        html = html.replace(/<pre(\s[^>]*)?>/gi, function(m, attrs) {
            return __md2emailStyledTag("pre", attrs || "", aStyleMap["pre"])
        })
    }
    if (isDef(aStyleMap["code"])) {
        html = html.replace(/<code(\s[^>]*)?>/gi, function(m, attrs) {
            return __md2emailStyledTag("code", attrs || "", aStyleMap["code"])
        })
    }

    // Self-closing: <hr> and <img>
    if (isDef(aStyleMap["hr"])) {
        html = html.replace(/<hr(\s[^>]*)?>/gi, function(m, attrs) {
            return __md2emailStyledTag("hr", attrs || "", aStyleMap["hr"])
        })
    }

    return html
}

// Helper: build an opening tag string with a merged/injected style attribute
var __md2emailStyledTag = function(tag, attrs, style) {
    if (!style) return "<" + tag + (attrs || "") + ">"
    attrs = attrs || ""
    if (attrs.match(/style\s*=/i)) {
        // Merge with existing style attribute
        attrs = attrs.replace(/style\s*=\s*"([^"]*)"/i, function(m, existing) {
            return 'style="' + style + existing + '"'
        })
    } else {
        attrs = attrs + ' style="' + style + '"'
    }
    return "<" + tag + attrs + ">"
}

// ---------------------------------------------------------------------------
// MD2Email class
// ---------------------------------------------------------------------------

/**
 * <odoc>
 * <key>MD2Email.MD2Email(aOptions) : MD2Email</key>
 * Creates a new MD2Email instance backed by commonmark-java 0.24.\
 * \
 * Available aOptions (all booleans, default true unless stated):\
 *   - tables          {Boolean} Enable GFM table extension (default: true)\
 *   - strikethrough   {Boolean} Enable GFM strikethrough extension (default: true)\
 *   - taskListItems   {Boolean} Enable task-list item extension (default: true)\
 *   - headingAnchor   {Boolean} Add id= attributes to headings (default: false)\
 *   - ins             {Boolean} Enable ++underline++ extension (default: false)\
 *   - yamlFrontMatter {Boolean} Enable YAML front-matter parsing (default: false)\
 *   - autolink        {Boolean} Auto-link bare URLs (default: false)\
 *   - sanitizeUrls    {Boolean} Sanitize URLs in output (default: false)\
 * \
 * Example:\
 *   loadLib("md2email.js")\
 *   var m = new MD2Email({ tables: true, strikethrough: true })\
 *   print(m.toHTML("# Hello\n\nWorld"))\
 * </odoc>
 */
var MD2Email = function(aOptions) {
    this.options = _$(aOptions).isMap().default({})

    var extList = new java.util.ArrayList()

    if (_$(this.options.tables).isBoolean().default(true))
        extList.add(Packages.org.commonmark.ext.gfm.tables.TablesExtension.create())

    if (_$(this.options.strikethrough).isBoolean().default(true))
        extList.add(Packages.org.commonmark.ext.gfm.strikethrough.StrikethroughExtension.create())

    if (_$(this.options.taskListItems).isBoolean().default(true))
        extList.add(Packages.org.commonmark.ext.task.list.items.TaskListItemsExtension.create())

    if (_$(this.options.headingAnchor).isBoolean().default(false))
        extList.add(Packages.org.commonmark.ext.heading.anchor.HeadingAnchorExtension.create())

    if (_$(this.options.ins).isBoolean().default(false))
        extList.add(Packages.org.commonmark.ext.ins.InsExtension.create())

    if (_$(this.options.yamlFrontMatter).isBoolean().default(false))
        extList.add(Packages.org.commonmark.ext.front.matter.YamlFrontMatterExtension.create())

    if (_$(this.options.autolink).isBoolean().default(false))
        extList.add(Packages.org.commonmark.ext.autolink.AutolinkExtension.create())

    this._extList = extList

    this._parser = Packages.org.commonmark.parser.Parser.builder()
        .extensions(extList)
        .build()

    this._renderer = Packages.org.commonmark.renderer.html.HtmlRenderer.builder()
        .extensions(extList)
        .sanitizeUrls(_$(this.options.sanitizeUrls).isBoolean().default(false))
        .build()

    this._textRenderer = Packages.org.commonmark.renderer.text.TextContentRenderer.builder()
        .extensions(extList)
        .build()

    this._styleMap = merge({}, __md2emailStyles["default"])
}

/**
 * <odoc>
 * <key>MD2Email.parse(aMarkdown) : Node</key>
 * Parses aMarkdown string into a commonmark-java Document node.
 * The returned object is a Java org.commonmark.node.Node which can be
 * passed to toHTMLFromNode() or inspected directly.\
 * \
 * Example:\
 *   var doc = m.parse("# Hello")\
 *   print(m.toHTMLFromNode(doc))\
 * </odoc>
 */
MD2Email.prototype.parse = function(aMarkdown) {
    _$(aMarkdown, "aMarkdown").isString().$_()
    return this._parser.parse(aMarkdown)
}

/**
 * <odoc>
 * <key>MD2Email.toHTMLFromNode(aNode) : String</key>
 * Renders a previously parsed commonmark-java Node to an HTML string.
 * </odoc>
 */
MD2Email.prototype.toHTMLFromNode = function(aNode) {
    return String(this._renderer.render(aNode))
}

/**
 * <odoc>
 * <key>MD2Email.toHTML(aMarkdown) : String</key>
 * Converts the aMarkdown string to an HTML fragment (no wrapping template,
 * no inline styles). Useful when you want to embed the output into your
 * own HTML document.\
 * \
 * Example:\
 *   loadLib("md2email.js")\
 *   var m = new MD2Email()\
 *   var html = m.toHTML("**bold** and _italic_")\
 *   // "<p><strong>bold</strong> and <em>italic</em></p>\n"
 * </odoc>
 */
MD2Email.prototype.toHTML = function(aMarkdown) {
    _$(aMarkdown, "aMarkdown").isString().$_()
    return String(this._renderer.render(this._parser.parse(aMarkdown)))
}

/**
 * <odoc>
 * <key>MD2Email.toText(aMarkdown) : String</key>
 * Converts aMarkdown to a plain-text string (strips all markup).
 * Useful for generating the plain-text alternative part of a MIME email.\
 * \
 * Example:\
 *   var plain = m.toText("# Hello\n\n**World**")\
 *   // "Hello\n\nWorld\n"
 * </odoc>
 */
MD2Email.prototype.toText = function(aMarkdown) {
    _$(aMarkdown, "aMarkdown").isString().$_()
    return String(this._textRenderer.render(this._parser.parse(aMarkdown)))
}

/**
 * <odoc>
 * <key>MD2Email.toEmailHTML(aMarkdown, aOptions) : String</key>
 * Converts aMarkdown to a full, self-contained email-ready HTML document
 * with inline styles applied to each element.\
 * \
 * aOptions map:\
 *   - title      {String}  Value for the HTML &lt;title&gt; tag\
 *   - subject    {String}  Alias for title\
 *   - width      {String}  Max width of the content column (default: "600")\
 *   - padding    {String}  Inner padding of the content cell (default: "32px 40px")\
 *   - bgColor    {String}  Page background colour (default: "#f5f5f5")\
 *   - contentBg  {String}  Content area background colour (default: "#ffffff")\
 *   - borderColor{String}  Header/footer border colour (default: "#eeeeee")\
 *   - fontFamily {String}  Base font family (default: "Arial,Helvetica,sans-serif")\
 *   - fontSize   {String}  Base font size (default: "14px")\
 *   - header     {String}  Raw HTML placed above the content (optional)\
 *   - footer     {String}  Raw HTML placed below the content (optional)\
 *   - styleMap   {Map}     Override or extend element style map\
 *   - theme      {String}  Named theme: "default" or "dark" (default: "default")\
 *   - wrap       {Boolean} Wrap in full HTML template (default: true)\
 * \
 * Example:\
 *   loadLib("md2email.js")\
 *   var m = new MD2Email()\
 *   var md = [\
 *     "# Welcome",\
 *     "",\
 *     "Hello **Alice**,",\
 *     "",\
 *     "Here is a summary table:",\
 *     "",\
 *     "| Item | Value |",\
 *     "|------|-------|",\
 *     "| CPU  | 42%   |",\
 *     "| RAM  | 78%   |",\
 *     "",\
 *     "> Please review the results above.",\
 *     "",\
 *     "Thanks,  ",\
 *     "The Team"\
 *   ].join("\n")\
 *   var html = m.toEmailHTML(md, { title: "Weekly Report", footer: "Unsubscribe" })\
 *   io.writeFileString("email.html", html)\
 * </odoc>
 */
MD2Email.prototype.toEmailHTML = function(aMarkdown, aOptions) {
    _$(aMarkdown, "aMarkdown").isString().$_()
    aOptions = _$(aOptions).isMap().default({})

    // Resolve style map
    var theme    = _$(aOptions.theme).isString().default("default")
    var baseStyle = __md2emailStyles[theme] || __md2emailStyles["default"]
    var styleMap = merge(merge({}, baseStyle), _$(aOptions.styleMap).isMap().default({}))

    // Parse and render HTML fragment
    var htmlFragment = this.toHTML(aMarkdown)

    // Apply inline styles
    htmlFragment = __md2emailApplyStyles(htmlFragment, styleMap)

    if (!_$(aOptions.wrap).isBoolean().default(true)) return htmlFragment

    // Wrap in email-safe template
    return __md2emailWrap(htmlFragment, aOptions)
}

/**
 * <odoc>
 * <key>MD2Email.setStyle(aTag, aStyleString)</key>
 * Sets or overrides the inline CSS style for a given HTML element tag name
 * in this instance's style map. Use "pre code" for code inside pre blocks.\
 * \
 * Example:\
 *   m.setStyle("h1", "font-size:36px;color:#ff0000;")\
 *   m.setStyle("a",  "color:#009900;text-decoration:none;")\
 * </odoc>
 */
MD2Email.prototype.setStyle = function(aTag, aStyleString) {
    _$(aTag, "aTag").isString().$_()
    _$(aStyleString, "aStyleString").isString().$_()
    this._styleMap[aTag] = aStyleString
}

/**
 * <odoc>
 * <key>MD2Email.getStyle(aTag) : String</key>
 * Returns the current inline CSS style string for aTag, or undefined if
 * no style is configured for that tag.
 * </odoc>
 */
MD2Email.prototype.getStyle = function(aTag) {
    _$(aTag, "aTag").isString().$_()
    return this._styleMap[aTag]
}

/**
 * <odoc>
 * <key>MD2Email.getStyleMap() : Map</key>
 * Returns the full element→style map currently in use by this instance.
 * </odoc>
 */
MD2Email.prototype.getStyleMap = function() {
    return this._styleMap
}

/**
 * <odoc>
 * <key>MD2Email.setStyleMap(aMap)</key>
 * Replaces this instance's entire style map with aMap.
 * </odoc>
 */
MD2Email.prototype.setStyleMap = function(aMap) {
    _$(aMap, "aMap").isMap().$_()
    this._styleMap = aMap
}

/**
 * <odoc>
 * <key>MD2Email.extractFrontMatter(aMarkdown) : Map</key>
 * If the yamlFrontMatter extension is enabled, parses aMarkdown and returns
 * a map of the YAML front matter key→value pairs. Returns an empty map when
 * no front matter is present or the extension is not enabled.\
 * \
 * Example:\
 *   var m = new MD2Email({ yamlFrontMatter: true })\
 *   var meta = m.extractFrontMatter("---\ntitle: Hello\nauthor: Alice\n---\n\n# Body")\
 *   print(meta.title)   // "Hello"\
 *   print(meta.author)  // "Alice"\
 * </odoc>
 */
MD2Email.prototype.extractFrontMatter = function(aMarkdown) {
    _$(aMarkdown, "aMarkdown").isString().$_()
    if (!this.options.yamlFrontMatter) return {}

    var doc     = this._parser.parse(aMarkdown)
    var visitor = Packages.org.commonmark.ext.front.matter.YamlFrontMatterVisitor()
    doc.accept(visitor)

    var jData = visitor.getData()
    var result = {}
    var keys   = af.fromJavaArray(jData.keySet().toArray())
    keys.forEach(function(k) {
        var vals = af.fromJavaArray(jData.get(k).toArray())
        result[String(k)] = vals.length === 1 ? String(vals[0]) : vals.map(function(v) { return String(v) })
    })
    return result
}

/**
 * <odoc>
 * <key>MD2Email.getParser() : Parser</key>
 * Returns the underlying commonmark-java Parser instance.
 * </odoc>
 */
MD2Email.prototype.getParser = function() { return this._parser }

/**
 * <odoc>
 * <key>MD2Email.getRenderer() : HtmlRenderer</key>
 * Returns the underlying commonmark-java HtmlRenderer instance.
 * </odoc>
 */
MD2Email.prototype.getRenderer = function() { return this._renderer }

// ---------------------------------------------------------------------------
// Email template wrapper
// ---------------------------------------------------------------------------
var __md2emailWrap = function(aHTMLContent, aOptions) {
    var o = _$(aOptions).isMap().default({})

    var title       = _$(o.title || o.subject).isString().default("")
    var width       = _$(o.width).isString().default("600")
    var padding     = _$(o.padding).isString().default("32px 40px")
    var bgColor     = _$(o.bgColor).isString().default("#f5f5f5")
    var contentBg   = _$(o.contentBg).isString().default("#ffffff")
    var borderColor = _$(o.borderColor).isString().default("#eeeeee")
    var fontFamily  = _$(o.fontFamily).isString().default("Arial,Helvetica,sans-serif")
    var fontSize    = _$(o.fontSize).isString().default("14px")
    var header      = _$(o.header).isString().default("")
    var footer      = _$(o.footer).isString().default("")

    var titleTag    = title ? "<title>" + title + "</title>" : ""
    var headerRow   = header
        ? "<tr><td style=\"padding:" + padding + ";border-bottom:2px solid " + borderColor + ";font-family:" + fontFamily + ";\">" + header + "</td></tr>"
        : ""
    var footerRow   = footer
        ? "<tr><td style=\"padding:20px " + (padding.split(" ")[1] || "40px") + ";border-top:1px solid " + borderColor + ";color:#888888;font-size:12px;font-family:" + fontFamily + ";\">" + footer + "</td></tr>"
        : ""

    return [
        '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
        '<html xmlns="http://www.w3.org/1999/xhtml">',
        '<head>',
        '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>',
        titleTag,
        '</head>',
        '<body style="margin:0;padding:20px 0;background-color:' + bgColor + ';">',
        '  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:' + bgColor + ';">',
        '    <tr><td align="center" style="padding:0 20px;">',
        '      <table border="0" cellpadding="0" cellspacing="0" width="' + width + '" style="background-color:' + contentBg + ';border-radius:4px;border:1px solid ' + borderColor + ';">',
        headerRow,
        '        <tr><td style="padding:' + padding + ';font-family:' + fontFamily + ';font-size:' + fontSize + ';line-height:1.6;color:#333333;">',
        aHTMLContent,
        '        </td></tr>',
        footerRow,
        '      </table>',
        '    </td></tr>',
        '  </table>',
        '</body>',
        '</html>'
    ].join("\n")
}

// ---------------------------------------------------------------------------
// Functional helpers (module-level shortcuts)
// ---------------------------------------------------------------------------

/**
 * <odoc>
 * <key>md2email.convert(aMarkdown, aOptions) : String</key>
 * Shortcut: parses aMarkdown and returns a raw HTML fragment.
 * aOptions are passed to MD2Email constructor.\
 * \
 * Example:\
 *   loadLib("md2email.js")\
 *   var html = md2email.convert("## Title\n\nSome _text_.")\
 * </odoc>
 */

/**
 * <odoc>
 * <key>md2email.toEmail(aMarkdown, aConvertOptions, aEmailOptions) : String</key>
 * Shortcut: converts aMarkdown to a full email-ready HTML document.
 * aConvertOptions are passed to the MD2Email constructor.
 * aEmailOptions are passed to toEmailHTML().\
 * \
 * Example:\
 *   loadLib("md2email.js")\
 *   var html = md2email.toEmail(\
 *     "# Alert\n\nSomething happened.",\
 *     { autolink: true },\
 *     { title: "System Alert", bgColor: "#fff" }\
 *   )\
 * </odoc>
 */

/**
 * <odoc>
 * <key>md2email.applyInlineStyles(aHTML, aStyleMap) : String</key>
 * Applies a map of tag→style strings as inline style= attributes to the
 * provided HTML fragment. Returns the styled HTML string.\
 * \
 * Example:\
 *   var styled = md2email.applyInlineStyles(html, { p: "color:red;", h1: "font-size:32px;" })\
 * </odoc>
 */

/**
 * <odoc>
 * <key>md2email.wrapInTemplate(aHTMLContent, aOptions) : String</key>
 * Wraps a raw HTML fragment in a full email-safe XHTML document template.
 * aOptions are the same as for toEmailHTML().\
 * \
 * Example:\
 *   var html = md2email.wrapInTemplate("&lt;p&gt;Hello&lt;/p&gt;", { title: "Hi", bgColor: "#eee" })\
 * </odoc>
 */

/**
 * <odoc>
 * <key>md2email.getAvailableThemes() : Array</key>
 * Returns an array of the available built-in theme names.
 * </odoc>
 */

/**
 * <odoc>
 * <key>md2email.registerTheme(aName, aStyleMap)</key>
 * Registers a custom named theme that can be referenced by name in toEmailHTML()'s
 * theme option.\
 * \
 * Example:\
 *   md2email.registerTheme("brand", {\
 *     h1: "font-size:30px;color:#d04020;",\
 *     a : "color:#d04020;"\
 *   })\
 *   var html = m.toEmailHTML(md, { theme: "brand" })\
 * </odoc>
 */
var md2email = {
    convert: function(aMarkdown, aOptions) {
        return new MD2Email(aOptions).toHTML(aMarkdown)
    },

    toEmail: function(aMarkdown, aConvertOptions, aEmailOptions) {
        return new MD2Email(aConvertOptions).toEmailHTML(aMarkdown, aEmailOptions)
    },

    applyInlineStyles: function(aHTML, aStyleMap) {
        return __md2emailApplyStyles(aHTML, aStyleMap)
    },

    wrapInTemplate: function(aHTMLContent, aOptions) {
        return __md2emailWrap(aHTMLContent, aOptions)
    },

    getAvailableThemes: function() {
        return Object.keys(__md2emailStyles)
    },

    registerTheme: function(aName, aStyleMap) {
        _$(aName, "aName").isString().$_()
        _$(aStyleMap, "aStyleMap").isMap().$_()
        __md2emailStyles[aName] = aStyleMap
    }
}
