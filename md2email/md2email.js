// md2email — OpenAF wrapper for commonmark-java
// Parses CommonMark/Markdown and produces email-ready HTML output.
//
// Author: Nuno Aguiar

var __md2emailPath = getOPackPath("md2email") || "."
loadExternalJars(__md2emailPath)
ow.loadFormat()

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

var __md2emailJavaFontFamiliesCache
var __md2emailJavaFontFamilySetCache

var __md2emailJavaFontFamilies = function() {
    if (isDef(__md2emailJavaFontFamiliesCache)) return __md2emailJavaFontFamiliesCache
    __md2emailJavaFontFamiliesCache = af.fromJavaArray(Packages.java.awt.GraphicsEnvironment.getLocalGraphicsEnvironment().getAvailableFontFamilyNames()).map(function(f) {
        return String(f)
    })
    return __md2emailJavaFontFamiliesCache
}

var __md2emailJavaFontFamilySet = function() {
    if (isDef(__md2emailJavaFontFamilySetCache)) return __md2emailJavaFontFamilySetCache
    var set = {}
    __md2emailJavaFontFamilies().forEach(function(f) {
        set[String(f).toLowerCase()] = f
    })
    ;["SansSerif", "Serif", "Monospaced"].forEach(function(f) {
        set[String(f).toLowerCase()] = f
    })
    __md2emailJavaFontFamilySetCache = set
    return set
}

var __md2emailDefaultSVGFontAliases = function() {
    var os = String(Packages.java.lang.System.getProperty("os.name", "")).toLowerCase()
    var systemSans
    if (os.indexOf("mac") >= 0 || os.indexOf("darwin") >= 0) {
        systemSans = [ ".AppleSystemUIFont", "Helvetica Neue", "Helvetica", "Arial", "SansSerif" ]
    } else if (os.indexOf("win") >= 0) {
        systemSans = [ "Segoe UI", "Arial", "SansSerif" ]
    } else {
        systemSans = [ "Noto Sans", "DejaVu Sans", "Liberation Sans", "Arial", "SansSerif" ]
    }

    return {
        "system-ui"          : systemSans,
        "-apple-system"      : systemSans,
        "blinkmacsystemfont" : systemSans,
        "ui-sans-serif"     : systemSans,
        "sans-serif"        : [ "SansSerif" ],
        "serif"             : [ "Serif" ],
        "monospace"         : [ "Monospaced" ],
        "ui-monospace"      : [ "SF Mono", "Menlo", "Consolas", "Liberation Mono", "DejaVu Sans Mono", "Monospaced" ]
    }
}

var __md2emailSplitFontFamilies = function(aFamilyList) {
    return String(aFamilyList).split(/\s*,\s*/).filter(function(f) { return String(f).trim().length > 0 })
}

var __md2emailUnquoteFontFamily = function(aFamily) {
    var f = String(aFamily).trim()
    if (f.length >= 2 && ((f.charAt(0) == '"' && f.charAt(f.length - 1) == '"') || (f.charAt(0) == "'" && f.charAt(f.length - 1) == "'"))) {
        return f.substring(1, f.length - 1)
    }
    return f
}

var __md2emailNormalizeSVGFontFamilyValue = function(aFamilyList, aOptions) {
    var o = _$(aOptions).isMap().default({})
    if (!_$(o.svgNormalizeFonts).isBoolean().default(true)) return aFamilyList

    var aliases = __md2emailDefaultSVGFontAliases()
    var customAliases = _$(o.svgFontFamilyAliases).isMap().default({})
    Object.keys(customAliases).forEach(function(k) {
        aliases[String(k).toLowerCase()] = customAliases[k]
    })
    var supported = __md2emailJavaFontFamilySet()
    var out = []
    var seen = {}

    __md2emailSplitFontFamilies(aFamilyList).forEach(function(rawFamily) {
        var family = __md2emailUnquoteFontFamily(rawFamily)
        var key = String(family).toLowerCase()
        var candidates = isDef(aliases[key]) ? aliases[key] : [ family ]
        if (!isArray(candidates)) candidates = __md2emailSplitFontFamilies(candidates)

        candidates.forEach(function(candidate) {
            var name = __md2emailUnquoteFontFamily(candidate)
            var supportedName = supported[String(name).toLowerCase()]
            if (isUnDef(supportedName)) return
            var seenKey = String(supportedName).toLowerCase()
            if (seen[seenKey]) return
            seen[seenKey] = true
            out.push(supportedName)
        })
    })

    if (out.length <= 0) out.push("SansSerif")
    return out.join(", ")
}

var __md2emailNormalizeSVGFonts = function(aSVG, aOptions) {
    var svg = String(aSVG)
    svg = svg.replace(/(\bfont-family\s*=\s*)(["'])(.*?)\2/gi, function(match, prefix, quote, familyList) {
        return prefix + quote + __md2emailNormalizeSVGFontFamilyValue(familyList, aOptions) + quote
    })
    svg = svg.replace(/(font-family\s*:\s*)((?:"[^"]*"|'[^']*'|[^;])+)(;?)/gi, function(match, prefix, familyList, suffix) {
        return prefix + __md2emailNormalizeSVGFontFamilyValue(familyList, aOptions) + suffix
    })
    return svg
}

var __md2emailConvertSVGBlocks = function(aHTML, aOptions) {
    var o = _$(aOptions).isMap().default({})
    if (!_$(o.svgToPng).isBoolean().default(false)) return { html: aHTML, pngFiles: [] }

    var mode = String(_$(o.svgPngMode).isString().default("file")).toLowerCase()
    var base = _$(o.svgPngBaseName).isString().default("md2email-svg")
    var outDir = _$(o.svgPngOutDir).isString().default(".")
    var files = []
    var idx = 0

    var out = aHTML.replace(/<svg\b[\s\S]*?<\/svg>/gi, function(svgBlock) {
        var pngPath = outDir.replace(/[\\\/]$/, "") + "/" + base + "-" + idx + ".png"
        var bytes
        try {
            bytes = __md2emailSVGToPNG(svgBlock, o)
        } catch(e) {
            return svgBlock
        }
        io.writeFileBytes(pngPath, bytes)
        files.push(pngPath)
        idx++

        if (mode == "embed") {
            return '<img src="data:image/png;base64,' + af.fromBytes2String(af.toBase64Bytes(bytes)) + '" alt="svg image"/>'
        } else {
            return '<img src="' + pngPath + '" alt="svg image"/>'
        }
    })

    return { html: out, pngFiles: files }
}

var __md2emailSVGToPNG = function(aSVG, aOptions) {
    var loader = new Packages.com.github.weisj.jsvg.parser.SVGLoader()
    var normalizedSVG = __md2emailNormalizeSVGFonts(aSVG, aOptions)
    var svgBytes = new java.lang.String(normalizedSVG).getBytes("UTF-8")
    var svg = loader.load(
        new java.io.ByteArrayInputStream(svgBytes),
        new java.net.URI("memory://md2email.svg"),
        Packages.com.github.weisj.jsvg.parser.LoaderContext.createDefault()
    )
    if (isUnDef(svg)) throw "Unable to parse SVG block"

    var viewBox = svg.viewBox()
    var width = Math.max(1, Number(viewBox.width))
    var height = Math.max(1, Number(viewBox.height))

    var image = new Packages.java.awt.image.BufferedImage(width, height, Packages.java.awt.image.BufferedImage.TYPE_INT_ARGB)
    var g = image.createGraphics()
    g.setRenderingHint(Packages.java.awt.RenderingHints.KEY_ANTIALIASING, Packages.java.awt.RenderingHints.VALUE_ANTIALIAS_ON)
    svg.render(null, g, new Packages.com.github.weisj.jsvg.view.ViewBox(0, 0, width, height))
    g.dispose()

    var baos = new java.io.ByteArrayOutputStream()
    Packages.javax.imageio.ImageIO.write(image, "png", baos)
    return af.fromArray2Bytes(af.fromJavaArray(baos.toByteArray()))
}

var __md2emailIsLocalImageSrc = function(aSrc) {
    if (isUnDef(aSrc)) return false
    var src = String(aSrc).trim()
    if (src.length <= 0) return false
    if (src.match(/^(cid|data|http|https|mailto):/i)) return false
    if (src.charAt(0) == "#") return false
    return true
}

var __md2emailStripUrlSuffix = function(aSrc) {
    var src = String(aSrc)
    var pHash = src.indexOf("#")
    var pQuery = src.indexOf("?")
    var p = -1
    if (pHash >= 0) p = pHash
    if (pQuery >= 0 && (p < 0 || pQuery < p)) p = pQuery
    return p >= 0 ? src.substring(0, p) : src
}

var __md2emailDecodeFileRef = function(aSrc) {
    var src = __md2emailStripUrlSuffix(aSrc)
    try {
        return String(Packages.java.net.URLDecoder.decode(src, "UTF-8"))
    } catch(e) {
        return src
    }
}

var __md2emailResolveFile = function(aSrc, aBaseDir) {
    var src = __md2emailDecodeFileRef(aSrc)
    var file = new java.io.File(src)
    if (!file.isAbsolute()) file = new java.io.File(aBaseDir, src)
    return file.getCanonicalFile()
}

var __md2emailUniqueCIDName = function(aFile, aUsedNames) {
    var file = aFile.getName()
    if (!aUsedNames[file]) {
        aUsedNames[file] = true
        return file
    }

    var dot = file.lastIndexOf(".")
    var base = dot >= 0 ? file.substring(0, dot) : file
    var ext = dot >= 0 ? file.substring(dot) : ""
    var idx = 1
    var cid = base + "-" + idx + ext
    while (aUsedNames[cid]) {
        idx++
        cid = base + "-" + idx + ext
    }
    aUsedNames[cid] = true
    return cid
}

var __md2emailEmbedLocalImages = function(aHTML, aEmail, aBaseDir, aOptions) {
    var o = _$(aOptions).isMap().default({})
    var embedExternal = _$(o.embedExternalImages).isBoolean().default(false)
    var embedded = []
    var external = []
    var pathToCID = {}
    var usedNames = {}

    var html = String(aHTML).replace(/<img\b([^>]*?)\bsrc\s*=\s*(['"])(.*?)\2([^>]*)>/gi, function(match, before, quote, src, after) {
        if (String(src).match(/^https?:\/\//i)) {
            if (embedExternal && isFunction(aEmail.addExternalImage)) {
                aEmail.addExternalImage(src)
                external.push(src)
            }
            return match
        }

        if (!__md2emailIsLocalImageSrc(src)) return match

        var file = __md2emailResolveFile(src, aBaseDir)
        if (!file.exists() || !file.isFile()) throw "Markdown image file not found: " + file.getPath()

        var path = String(file.getPath())
        var cid = pathToCID[path]
        if (isUnDef(cid)) {
            var name = __md2emailUniqueCIDName(file, usedNames)
            cid = String(aEmail.embedFile(path, name))
            embedded.push({
                src : String(src),
                path: path,
                name: name,
                cid : cid
            })
            pathToCID[path] = cid
        }

        return "<img" + before + "src=" + quote + "cid:" + cid + quote + after + ">"
    })

    return {
        html          : html,
        embeddedFiles : embedded,
        externalImages: external
    }
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
 *   - svgToPng   {Boolean} Convert inline SVG blocks to PNG images (default: false)\
 *   - svgNormalizeFonts    {Boolean} Rewrite SVG web/system font aliases to Java fonts (default: true)\
 *   - svgFontFamilyAliases {Map}     Custom SVG font alias map for PNG rendering\
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
    var htmlResult = this.toHTMLMap(aMarkdown, aOptions)
    var htmlFragment = htmlResult.html

    // Apply inline styles
    htmlFragment = __md2emailApplyStyles(htmlFragment, styleMap)

    if (!_$(aOptions.wrap).isBoolean().default(true)) return htmlFragment

    // Wrap in email-safe template
    return __md2emailWrap(htmlFragment, aOptions)
}

MD2Email.prototype.toHTMLMap = function(aMarkdown, aOptions) {
    _$(aMarkdown, "aMarkdown").isString().$_()
    aOptions = _$(aOptions).isMap().default({})
    var html = String(this._renderer.render(this._parser.parse(aMarkdown)))
    return __md2emailConvertSVGBlocks(html, aOptions)
}

/**
 * <odoc>
 * <key>MD2Email.setEmailFromMarkdown(aEmail, aMarkdownString, aOptions) : Map</key>
 * Renders aMarkdownString as email-ready HTML, rewrites local image
 * references to cid: names and embeds those files into the provided OpenAF
 * Email object using embedFile(). Finally calls aEmail.setHTML(html).\
 * \
 * By default inline &lt;svg&gt; blocks are converted to temporary PNG files so
 * they can also be embedded. Local image paths are resolved relative to
 * baseDir, defaulting to the current folder. External http(s) images are left
 * unchanged unless embedExternalImages=true, in which case addExternalImage()
 * is called.\
 * \
 * aOptions are the same as toEmailHTML(), plus:\
 *   - baseDir              {String}  Folder used to resolve relative images (default ".")\
 *   - setMessage           {Boolean} Also call setMessage() with plain text (default true)\
 *   - embedExternalImages  {Boolean} Call addExternalImage() for http(s) images (default false)\
 * \
 * Example:\
 *   plugin("Email")\
 *   loadLib("md2email.js")\
 *   var email = new Email("smtp.example.com", "me@example.com", true, true, true)\
 *   var res = new MD2Email().setEmailFromMarkdown(email, "# Report\n\n![Logo](logo.png)", { title: "Report" })\
 *   email.send("Report", res.text, [ "you@example.com" ], [], [], "me@example.com")\
 * </odoc>
 */
MD2Email.prototype.setEmailFromMarkdown = function(aEmail, aMarkdownString, aOptions) {
    _$(aMarkdownString, "aMarkdownString").isString().$_()
    if (isUnDef(aEmail) || !isFunction(aEmail.setHTML) || !isFunction(aEmail.embedFile)) {
        throw "aEmail must be an OpenAF Email object with setHTML() and embedFile()"
    }

    var o = _$(aOptions).isMap().default({})
    var baseDir = _$(o.baseDir).isString().default(".")

    var emailOptions = merge({
        svgToPng      : true,
        svgPngMode    : "file",
        svgPngOutDir  : String(Packages.java.lang.System.getProperty("java.io.tmpdir")),
        svgPngBaseName: "md2email-svg"
    }, o)

    var html = this.toEmailHTML(aMarkdownString, emailOptions)
    var embedded = __md2emailEmbedLocalImages(html, aEmail, baseDir, o)
    var text = this.toText(aMarkdownString)

    aEmail.setHTML(embedded.html)
    if (_$(o.setMessage).isBoolean().default(true) && isFunction(aEmail.setMessage)) aEmail.setMessage(text)

    return {
        email         : aEmail,
        html          : embedded.html,
        text          : text,
        embeddedFiles : embedded.embeddedFiles,
        externalImages: embedded.externalImages
    }
}

/**
 * <odoc>
 * <key>MD2Email.setEmailFromMarkdownFile(aEmail, aMarkdownFile, aOptions) : Map</key>
 * Reads aMarkdownFile and delegates to setEmailFromMarkdown(). Markdown image
 * paths are resolved relative to the markdown file folder unless baseDir is
 * provided. The default generated SVG PNG prefix is based on the markdown file
 * name.\
 * \
 * Example:\
 *   plugin("Email")\
 *   loadLib("md2email.js")\
 *   var email = new Email("smtp.example.com", "me@example.com", true, true, true)\
 *   var res = new MD2Email().setEmailFromMarkdownFile(email, "report.md", { title: "Report" })\
 * </odoc>
 */
MD2Email.prototype.setEmailFromMarkdownFile = function(aEmail, aMarkdownFile, aOptions) {
    _$(aMarkdownFile, "aMarkdownFile").isString().$_()

    var o = _$(aOptions).isMap().default({})
    var mdFile = new java.io.File(aMarkdownFile).getCanonicalFile()
    var fileOptions = merge({
        baseDir       : String(mdFile.getParentFile().getPath()),
        svgPngBaseName: String(mdFile.getName()).replace(/\.[^\.]+$/, "") + "-svg"
    }, o)

    return this.setEmailFromMarkdown(aEmail, io.readFileString(String(mdFile.getPath())), fileOptions)
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
 * <key>md2email.setEmailFromMarkdown(aEmail, aMarkdownString, aConvertOptions, aEmailOptions) : Map</key>
 * Shortcut: creates an MD2Email instance with aConvertOptions and calls
 * setEmailFromMarkdown(aEmail, aMarkdownString, aEmailOptions).\
 * \
 * Example:\
 *   plugin("Email")\
 *   loadLib("md2email.js")\
 *   var email = new Email("smtp.example.com", "me@example.com", true, true, true)\
 *   md2email.setEmailFromMarkdown(email, "# Report", {}, { title: "Report" })\
 * </odoc>
 */

/**
 * <odoc>
 * <key>md2email.setEmailFromMarkdownFile(aEmail, aMarkdownFile, aConvertOptions, aEmailOptions) : Map</key>
 * Shortcut: creates an MD2Email instance with aConvertOptions and calls
 * setEmailFromMarkdownFile(aEmail, aMarkdownFile, aEmailOptions).\
 * \
 * Example:\
 *   plugin("Email")\
 *   loadLib("md2email.js")\
 *   var email = new Email("smtp.example.com", "me@example.com", true, true, true)\
 *   md2email.setEmailFromMarkdownFile(email, "report.md", {}, { title: "Report" })\
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
 * <key>md2email.normalizeSVGFonts(aSVG, aOptions) : String</key>
 * Rewrites SVG font-family values that use browser/system aliases (for
 * example system-ui, -apple-system, ui-sans-serif, sans-serif) to Java AWT
 * font family names available on the current platform. This is used by the
 * inline SVG-to-PNG renderer by default.\
 * \
 * Options:\
 *   - svgNormalizeFonts     {Boolean} Enable/disable rewriting (default true)\
 *   - svgFontFamilyAliases  {Map}     Custom alias map. Values can be strings
 *                                     or arrays of fallback family names.\
 * \
 * Example:\
 *   var svg = md2email.normalizeSVGFonts('&lt;text font-family="system-ui, sans-serif"&gt;Hi&lt;/text&gt;')\
 * </odoc>
 */

/**
 * <odoc>
 * <key>md2email.getJavaFontFamilies() : Array</key>
 * Returns the Java AWT font family names visible to the current runtime.
 * These are the family names JSVG can match while rendering SVG text.
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
    setEmailFromMarkdown: function(aEmail, aMarkdownString, aConvertOptions, aEmailOptions) {
        return new MD2Email(aConvertOptions).setEmailFromMarkdown(aEmail, aMarkdownString, aEmailOptions)
    },
    setEmailFromMarkdownFile: function(aEmail, aMarkdownFile, aConvertOptions, aEmailOptions) {
        return new MD2Email(aConvertOptions).setEmailFromMarkdownFile(aEmail, aMarkdownFile, aEmailOptions)
    },
    convertMap: function(aMarkdown, aOptions, aOutputOptions) {
        return new MD2Email(aOptions).toHTMLMap(aMarkdown, aOutputOptions)
    },
    toEmailMap: function(aMarkdown, aConvertOptions, aEmailOptions) {
        var m = new MD2Email(aConvertOptions)
        var res = m.toHTMLMap(aMarkdown, aEmailOptions)
        var theme = _$(aEmailOptions.theme).isString().default("default")
        var baseStyle = __md2emailStyles[theme] || __md2emailStyles["default"]
        var styleMap = merge(merge({}, baseStyle), _$(aEmailOptions.styleMap).isMap().default({}))
        var html = __md2emailApplyStyles(res.html, styleMap)
        res.emailHTML = _$(aEmailOptions.wrap).isBoolean().default(true) ? __md2emailWrap(html, aEmailOptions) : html
        return res
    },

    applyInlineStyles: function(aHTML, aStyleMap) {
        return __md2emailApplyStyles(aHTML, aStyleMap)
    },

    wrapInTemplate: function(aHTMLContent, aOptions) {
        return __md2emailWrap(aHTMLContent, aOptions)
    },

    normalizeSVGFonts: function(aSVG, aOptions) {
        _$(aSVG, "aSVG").isString().$_()
        return __md2emailNormalizeSVGFonts(aSVG, aOptions)
    },

    getJavaFontFamilies: function() {
        return __md2emailJavaFontFamilies().slice(0)
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
