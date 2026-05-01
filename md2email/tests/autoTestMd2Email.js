(function() {
    loadLib("md2email.js")

    // -----------------------------------------------------------------------
    // Basic HTML conversion
    // -----------------------------------------------------------------------
    exports.testBasicToHTML = function() {
        var m    = new MD2Email()
        var html = m.toHTML("# Hello\n\nWorld")

        ow.test.assert(html.indexOf("<h1>Hello</h1>") >= 0, true,
            "toHTML should produce an <h1> for an ATX heading")
        ow.test.assert(html.indexOf("<p>World</p>") >= 0, true,
            "toHTML should produce a <p> for a paragraph")
    }

    exports.testInlineMarkup = function() {
        var m    = new MD2Email()
        var html = m.toHTML("**bold** _italic_ `code`")

        ow.test.assert(html.indexOf("<strong>bold</strong>") >= 0, true,
            "toHTML should render **bold** as <strong>")
        ow.test.assert(html.indexOf("<em>italic</em>") >= 0, true,
            "toHTML should render _italic_ as <em>")
        ow.test.assert(html.indexOf("<code>code</code>") >= 0, true,
            "toHTML should render `code` as <code>")
    }

    exports.testLinks = function() {
        var m    = new MD2Email()
        var html = m.toHTML("[OpenAF](https://openaf.io)")

        ow.test.assert(html.indexOf('href="https://openaf.io"') >= 0, true,
            "toHTML should produce an href attribute for Markdown links")
        ow.test.assert(html.indexOf(">OpenAF<") >= 0, true,
            "toHTML should use the link text as the anchor text")
    }

    exports.testBlockquote = function() {
        var m    = new MD2Email()
        var html = m.toHTML("> A quote")

        ow.test.assert(html.indexOf("<blockquote>") >= 0, true,
            "toHTML should produce a <blockquote> for > syntax")
    }

    exports.testFencedCode = function() {
        var m    = new MD2Email()
        var html = m.toHTML("```\nhello world\n```")

        ow.test.assert(html.indexOf("<pre>") >= 0 || html.indexOf("<pre ") >= 0, true,
            "toHTML should produce <pre> for fenced code blocks")
        ow.test.assert(html.indexOf("<code>") >= 0 || html.indexOf("<code ") >= 0, true,
            "toHTML should produce <code> inside <pre> for fenced code blocks")
    }

    exports.testHorizontalRule = function() {
        var m    = new MD2Email()
        var html = m.toHTML("---")

        ow.test.assert(html.indexOf("<hr") >= 0, true,
            "toHTML should produce <hr> for --- syntax")
    }

    exports.testUnorderedList = function() {
        var m    = new MD2Email()
        var html = m.toHTML("- alpha\n- beta\n- gamma")

        ow.test.assert(html.indexOf("<ul>") >= 0 || html.indexOf("<ul ") >= 0, true,
            "toHTML should produce <ul> for unordered lists")
        ow.test.assert(html.indexOf("<li>") >= 0 || html.indexOf("<li ") >= 0, true,
            "toHTML should produce <li> items")
    }

    exports.testOrderedList = function() {
        var m    = new MD2Email()
        var html = m.toHTML("1. first\n2. second")

        ow.test.assert(html.indexOf("<ol>") >= 0 || html.indexOf("<ol ") >= 0, true,
            "toHTML should produce <ol> for ordered lists")
    }

    // -----------------------------------------------------------------------
    // GFM extensions
    // -----------------------------------------------------------------------
    exports.testGFMTables = function() {
        var m = new MD2Email({ tables: true })
        var html = m.toHTML([
            "| Name  | Value |",
            "|-------|-------|",
            "| Alpha | 1     |",
            "| Beta  | 2     |"
        ].join("\n"))

        ow.test.assert(html.indexOf("<table") >= 0, true,
            "toHTML with tables extension should produce <table>")
        ow.test.assert(html.indexOf("<th") >= 0, true,
            "toHTML with tables extension should produce <th> header cells")
        ow.test.assert(html.indexOf("<td") >= 0, true,
            "toHTML with tables extension should produce <td> data cells")
    }

    exports.testGFMStrikethrough = function() {
        var m    = new MD2Email({ strikethrough: true })
        var html = m.toHTML("~~deleted~~")

        ow.test.assert(html.indexOf("<del>") >= 0, true,
            "toHTML with strikethrough extension should render ~~text~~ as <del>")
    }

    exports.testTaskListItems = function() {
        var m    = new MD2Email({ taskListItems: true })
        var html = m.toHTML("- [x] done\n- [ ] pending")

        ow.test.assert(html.indexOf('type="checkbox"') >= 0, true,
            "toHTML with taskListItems extension should render checkboxes")
        ow.test.assert(html.indexOf("checked") >= 0, true,
            "toHTML with taskListItems should mark completed items as checked")
    }

    exports.testInsExtension = function() {
        var m    = new MD2Email({ ins: true })
        var html = m.toHTML("++underline++")

        ow.test.assert(html.indexOf("<ins>") >= 0, true,
            "toHTML with ins extension should render ++text++ as <ins>")
    }

    exports.testHeadingAnchor = function() {
        var m    = new MD2Email({ headingAnchor: true })
        var html = m.toHTML("## Section One")

        ow.test.assert(html.indexOf('id="') >= 0, true,
            "toHTML with headingAnchor extension should add id= attribute to headings")
    }

    exports.testAutolinkExtension = function() {
        var m    = new MD2Email({ autolink: true })
        var html = m.toHTML("Visit https://openaf.io for more.")

        ow.test.assert(html.indexOf('href="https://openaf.io"') >= 0, true,
            "toHTML with autolink extension should turn bare URLs into links")
    }

    exports.testYamlFrontMatter = function() {
        var m  = new MD2Email({ yamlFrontMatter: true })
        var md = [
            "---",
            "title: My Report",
            "author: Alice",
            "---",
            "",
            "# Body"
        ].join("\n")

        var meta = m.extractFrontMatter(md)
        ow.test.assert(meta.title,  "My Report", "extractFrontMatter should return the title field")
        ow.test.assert(meta.author, "Alice",      "extractFrontMatter should return the author field")

        // The rendered HTML should NOT include the front matter block itself
        var html = m.toHTML(md)
        ow.test.assert(html.indexOf("---") >= 0, false,
            "toHTML should strip YAML front matter from rendered output")
    }

    // -----------------------------------------------------------------------
    // toText (plain-text renderer)
    // -----------------------------------------------------------------------
    exports.testToText = function() {
        var m    = new MD2Email()
        var text = m.toText("# Hello\n\n**bold** world")

        ow.test.assert(text.indexOf("<") >= 0, false,
            "toText should not contain any HTML tags")
        ow.test.assert(text.indexOf("Hello")  >= 0, true, "toText should contain heading text")
        ow.test.assert(text.indexOf("bold")   >= 0, true, "toText should contain inline text without markup")
        ow.test.assert(text.indexOf("world")  >= 0, true, "toText should contain paragraph text")
    }

    // -----------------------------------------------------------------------
    // parse / toHTMLFromNode
    // -----------------------------------------------------------------------
    exports.testParseAndRender = function() {
        var m    = new MD2Email()
        var doc  = m.parse("# Node test")
        var html = m.toHTMLFromNode(doc)

        ow.test.assert(html.indexOf("<h1>Node test</h1>") >= 0, true,
            "toHTMLFromNode should render a previously parsed AST node")
    }

    // -----------------------------------------------------------------------
    // Inline style application
    // -----------------------------------------------------------------------
    exports.testApplyInlineStyles = function() {
        var m    = new MD2Email()
        var html = m.toHTML("# Title\n\nParagraph.")
        var styled = md2email.applyInlineStyles(html, {
            h1: "color:red;",
            p : "color:blue;"
        })

        ow.test.assert(styled.indexOf('style="color:red;"') >= 0, true,
            "applyInlineStyles should inject style attribute into <h1>")
        ow.test.assert(styled.indexOf('style="color:blue;"') >= 0, true,
            "applyInlineStyles should inject style attribute into <p>")
    }

    exports.testPreCodeInlineStyle = function() {
        var m      = new MD2Email()
        var html   = m.toHTML("```\ncode block\n```")
        var styled = md2email.applyInlineStyles(html, {
            "pre"      : "background:yellow;",
            "pre code" : "color:green;"
        })

        ow.test.assert(styled.indexOf('style="background:yellow;"') >= 0, true,
            "applyInlineStyles should style <pre> correctly")
        ow.test.assert(styled.indexOf('color:green;') >= 0, true,
            "applyInlineStyles should apply pre code compound style to inner <code>")
    }

    // -----------------------------------------------------------------------
    // Style map management
    // -----------------------------------------------------------------------
    exports.testSetGetStyle = function() {
        var m = new MD2Email()
        m.setStyle("h1", "font-size:42px;color:purple;")

        ow.test.assert(m.getStyle("h1"), "font-size:42px;color:purple;",
            "getStyle should return the value set by setStyle")
    }

    exports.testSetStyleMap = function() {
        var m   = new MD2Email()
        var map = { h1: "a:1;", p: "b:2;" }
        m.setStyleMap(map)

        ow.test.assert(m.getStyleMap().h1, "a:1;", "setStyleMap should replace the h1 style")
        ow.test.assert(m.getStyleMap().p,  "b:2;", "setStyleMap should replace the p style")
        ow.test.assert(isUnDef(m.getStyleMap().h2), true,
            "setStyleMap should remove styles not present in the new map")
    }

    // -----------------------------------------------------------------------
    // toEmailHTML — inline styles applied
    // -----------------------------------------------------------------------
    exports.testToEmailHTMLHasStyles = function() {
        var m    = new MD2Email()
        var html = m.toEmailHTML("# Styled\n\nParagraph.")

        ow.test.assert(html.indexOf("style=") >= 0, true,
            "toEmailHTML should inject inline style attributes")
    }

    exports.testToEmailHTMLFullDoc = function() {
        var m    = new MD2Email()
        var html = m.toEmailHTML("Hello **World**")

        ow.test.assert(html.indexOf("<!DOCTYPE") >= 0, true,
            "toEmailHTML should produce a full HTML document with DOCTYPE")
        ow.test.assert(html.indexOf("<body") >= 0, true,
            "toEmailHTML should include a <body> tag")
        ow.test.assert(html.indexOf("</html>") >= 0, true,
            "toEmailHTML should close the <html> tag")
    }

    exports.testToEmailHTMLOptions = function() {
        var m    = new MD2Email()
        var html = m.toEmailHTML("Hi", {
            title      : "Test Email",
            bgColor    : "#123456",
            contentBg  : "#abcdef",
            width      : "800",
            header     : "<strong>Header</strong>",
            footer     : "Footer text"
        })

        ow.test.assert(html.indexOf("<title>Test Email</title>") >= 0, true,
            "toEmailHTML should include title tag when title option is set")
        ow.test.assert(html.indexOf("#123456") >= 0, true,
            "toEmailHTML should use bgColor in body/table background")
        ow.test.assert(html.indexOf("#abcdef") >= 0, true,
            "toEmailHTML should use contentBg in content table background")
        ow.test.assert(html.indexOf("width=\"800\"") >= 0, true,
            "toEmailHTML should use custom width")
        ow.test.assert(html.indexOf("<strong>Header</strong>") >= 0, true,
            "toEmailHTML should embed header HTML")
        ow.test.assert(html.indexOf("Footer text") >= 0, true,
            "toEmailHTML should embed footer text")
    }

    exports.testToEmailHTMLNoWrap = function() {
        var m    = new MD2Email()
        var html = m.toEmailHTML("Hello", { wrap: false })

        ow.test.assert(html.indexOf("<!DOCTYPE") >= 0, false,
            "toEmailHTML with wrap:false should NOT produce a full HTML document")
        ow.test.assert(html.indexOf("style=") >= 0, true,
            "toEmailHTML with wrap:false should still apply inline styles")
    }

    exports.testDarkTheme = function() {
        var m    = new MD2Email()
        var html = m.toEmailHTML("# Dark\n\nText.", { theme: "dark" })

        // Dark theme h1 uses #ffffff for color
        ow.test.assert(html.indexOf("#ffffff") >= 0 || html.indexOf("color:#ffffff") >= 0, true,
            "toEmailHTML with dark theme should use white heading colour")
    }

    // -----------------------------------------------------------------------
    // Theme management
    // -----------------------------------------------------------------------
    exports.testGetAvailableThemes = function() {
        var themes = md2email.getAvailableThemes()
        ow.test.assert(isArray(themes), true, "getAvailableThemes should return an array")
        ow.test.assert(themes.indexOf("default") >= 0, true,
            "getAvailableThemes should include 'default' theme")
        ow.test.assert(themes.indexOf("dark") >= 0, true,
            "getAvailableThemes should include 'dark' theme")
    }

    exports.testRegisterTheme = function() {
        md2email.registerTheme("custom", { h1: "color:orange;", p: "color:purple;" })

        var themes = md2email.getAvailableThemes()
        ow.test.assert(themes.indexOf("custom") >= 0, true,
            "registerTheme should make the new theme available")

        var m    = new MD2Email()
        var html = m.toEmailHTML("# Hi\n\nText.", { theme: "custom" })
        ow.test.assert(html.indexOf("color:orange;") >= 0, true,
            "Custom theme h1 style should appear in output")
    }

    // -----------------------------------------------------------------------
    // md2email shortcut helpers
    // -----------------------------------------------------------------------
    exports.testMd2EmailConvert = function() {
        var html = md2email.convert("**bold**")
        ow.test.assert(html.indexOf("<strong>bold</strong>") >= 0, true,
            "md2email.convert should return HTML fragment")
    }

    exports.testMd2EmailToEmail = function() {
        var html = md2email.toEmail(
            "# Title\n\nBody.",
            { tables: true },
            { title: "Hello", bgColor: "#ffffff" }
        )
        ow.test.assert(html.indexOf("<!DOCTYPE") >= 0, true,
            "md2email.toEmail should return a full HTML document")
        ow.test.assert(html.indexOf("<title>Hello</title>") >= 0, true,
            "md2email.toEmail should pass emailOptions to the template")
    }

    exports.testWrapInTemplate = function() {
        var html = md2email.wrapInTemplate("<p>Hi</p>", { title: "Wrapped" })
        ow.test.assert(html.indexOf("<title>Wrapped</title>") >= 0, true,
            "wrapInTemplate should produce a complete HTML document with the given title")
        ow.test.assert(html.indexOf("<p>Hi</p>") >= 0, true,
            "wrapInTemplate should embed the content unchanged")
    }

    // -----------------------------------------------------------------------
    // getParser / getRenderer
    // -----------------------------------------------------------------------
    exports.testGetParserRenderer = function() {
        var m = new MD2Email()
        ow.test.assert(isDef(m.getParser()),   true, "getParser should return the Java Parser object")
        ow.test.assert(isDef(m.getRenderer()), true, "getRenderer should return the Java HtmlRenderer object")
    }

    // -----------------------------------------------------------------------
    // Edge cases
    // -----------------------------------------------------------------------
    exports.testEmptyString = function() {
        var m    = new MD2Email()
        var html = m.toHTML("")
        ow.test.assert(isString(html), true, "toHTML('') should return a string")
    }

    exports.testUnicodeContent = function() {
        var m    = new MD2Email()
        var html = m.toHTML("# Héllo Wörld\n\nçâü 😀")
        ow.test.assert(html.indexOf("Héllo") >= 0, true,
            "toHTML should preserve non-ASCII characters in headings")
        ow.test.assert(html.indexOf("çâü") >= 0, true,
            "toHTML should preserve non-ASCII characters in paragraphs")
        ow.test.assert(html.indexOf("😀") >= 0, true,
            "toHTML should preserve non-BMP unicode characters such as emoji")
    }

    exports.testXSSEntities = function() {
        // CommonMark spec: raw HTML is passed through by default.
        // Applications that need XSS protection must post-process the output
        // (e.g. with a sanitizer library). This test verifies the pass-through
        // behaviour so callers are aware of it.
        var m    = new MD2Email()
        var html = m.toHTML("Text <script>alert(1)</script>")
        ow.test.assert(html.indexOf("<script>") >= 0, true,
            "toHTML passes raw HTML through by default (CommonMark spec); callers must sanitize if needed")

        // The sanitizeUrls flag does NOT affect raw HTML; it only removes
        // javascript: / data: scheme hrefs from links.
        var mSafe = new MD2Email({ sanitizeUrls: true })
        var safeHtml = mSafe.toHTML("[click](javascript:alert(1))")
        ow.test.assert(safeHtml.indexOf("javascript:") >= 0, false,
            "sanitizeUrls should strip javascript: scheme from href attributes")
    }

    exports.testStyleMapCustomOverride = function() {
        var m    = new MD2Email()
        var html = m.toEmailHTML("# Big\n\nParagraph.", {
            styleMap: { h1: "font-size:99px;" }
        })
        ow.test.assert(html.indexOf("font-size:99px;") >= 0, true,
            "toEmailHTML should honour custom styleMap override for h1")
    }

    exports.testToHTMLMap = function() {
        var m = new MD2Email()
        var res = m.toHTMLMap("Hello map")
        ow.test.assert(isMap(res), true, "toHTMLMap should return a map")
        ow.test.assert(isArray(res.pngFiles), true, "toHTMLMap should include pngFiles array")
        ow.test.assert(res.html.indexOf("<p>Hello map</p>") >= 0, true, "toHTMLMap should include rendered html")
    }

    exports.testNormalizeSVGFontsUsesJavaFamilies = function() {
        var svg = '<svg><text font-family="system-ui, -apple-system, sans-serif" style="font-family: ui-monospace, monospace;">Hi</text></svg>'
        var out = md2email.normalizeSVGFonts(svg, {
            svgFontFamilyAliases: {
                "system-ui"     : [ "SansSerif" ],
                "-apple-system" : [ "SansSerif" ],
                "ui-monospace"  : [ "Monospaced" ]
            }
        })

        ow.test.assert(out.indexOf("system-ui") >= 0, false,
            "normalizeSVGFonts should remove browser system font aliases")
        ow.test.assert(out.indexOf("-apple-system") >= 0, false,
            "normalizeSVGFonts should remove Apple browser font aliases")
        ow.test.assert(out.indexOf("SansSerif") >= 0, true,
            "normalizeSVGFonts should add a Java logical sans-serif family")
        ow.test.assert(out.indexOf("Monospaced") >= 0, true,
            "normalizeSVGFonts should add a Java logical monospace family")
    }

    exports.testToHTMLMapConvertsSVGWithSystemFonts = function() {
        var svg = [
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32" width="120" height="32">',
            '  <rect x="0" y="0" width="120" height="32" fill="#ffffff"/>',
            '  <text x="8" y="21" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#111111">Hello</text>',
            '</svg>'
        ].join("\n")

        var res = new MD2Email().toHTMLMap(svg, { svgToPng: true, svgPngMode: "embed" })
        ow.test.assert(res.html.indexOf("data:image/png;base64,") >= 0, true,
            "toHTMLMap should convert SVGs that use browser system font aliases")
        ow.test.assert(res.html.indexOf("<svg") >= 0, false,
            "toHTMLMap should replace converted SVG with an img")
    }

    exports.testToHTMLMapKeepsUnsupportedSVG = function() {
        var svg = [
            '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="320" viewBox="0 0 600 320">',
            '  <defs>',
            '    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">',
            '      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15"/>',
            '    </filter>',
            '  </defs>',
            '  <rect width="600" height="320" rx="12" fill="#1e1e2e"/>',
            '  <text x="300" y="36" text-anchor="middle" fill="#cdd6f4" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="18" font-weight="600">CPU Usage Breakdown</text>',
            '  ',
            '  <!-- Donut chart -->',
            '  <g transform="translate(160, 170)">',
            '    <!-- Background ring -->',
            '    <circle r="80" fill="none" stroke="#313244" stroke-width="24"/>',
            '    <!-- User 33.14% -->',
            '    <circle r="80" fill="none" stroke="#89b4fa" stroke-width="24" stroke-dasharray="166.5 335.5" stroke-dashoffset="0" transform="rotate(-90)"/>',
            '    <!-- System 21.14% -->',
            '    <circle r="80" fill="none" stroke="#f9e2af" stroke-width="24" stroke-dasharray="106.1 395.9" stroke-dashoffset="-166.5" transform="rotate(-90)"/>',
            '    <!-- Idle 45.71% -->',
            '    <circle r="80" fill="none" stroke="#a6e3a1" stroke-width="24" stroke-dasharray="229.4 272.6" stroke-dashoffset="-272.6" transform="rotate(-90)"/>',
            '    ',
            '    <text x="0" y="8" text-anchor="middle" fill="#cdd6f4" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="28" font-weight="700">54.3%</text>',
            '    <text x="0" y="28" text-anchor="middle" fill="#6c7086" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11">Active</text>',
            '  </g>',
            '  ',
            '  <!-- Legend -->',
            '  <g transform="translate(320, 110)">',
            '    <rect x="0" y="0" width="14" height="14" rx="3" fill="#89b4fa"/>',
            '    <text x="24" y="12" fill="#cdd6f4" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14">User — 33.14%</text>',
            '    ',
            '    <rect x="0" y="32" width="14" height="14" rx="3" fill="#f9e2af"/>',
            '    <text x="24" y="44" fill="#cdd6f4" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14">System — 21.14%</text>',
            '    ',
            '    <rect x="0" y="64" width="14" height="14" rx="3" fill="#a6e3a1"/>',
            '    <text x="24" y="76" fill="#cdd6f4" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14">Idle — 45.71%</text>',
            '  </g>',
            '  ',
            '  <!-- Load averages -->',
            '  <g transform="translate(320, 220)">',
            '    <text x="0" y="0" fill="#6c7086" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12" font-weight="600">LOAD AVERAGES</text>',
            '    <rect x="0" y="12" width="40" height="50" rx="4" fill="#313244"/>',
            '    <text x="20" y="38" text-anchor="middle" fill="#89b4fa" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="700">1.56</text>',
            '    <text x="20" y="54" text-anchor="middle" fill="#6c7086" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10">1m</text>',
            '    ',
            '    <rect x="52" y="12" width="40" height="50" rx="4" fill="#313244"/>',
            '    <text x="72" y="38" text-anchor="middle" fill="#f9e2af" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="700">1.76</text>',
            '    <text x="72" y="54" text-anchor="middle" fill="#6c7086" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10">5m</text>',
            '    ',
            '    <rect x="104" y="12" width="40" height="50" rx="4" fill="#313244"/>',
            '    <text x="124" y="38" text-anchor="middle" fill="#fab387" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="700">1.80</text>',
            '    <text x="124" y="54" text-anchor="middle" fill="#6c7086" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10">15m</text>',
            '  </g>',
            '  ',
            '  <text x="300" y="300" text-anchor="middle" fill="#6c7086" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11">Processes: 692 total · 3 running · 689 sleeping · 2903 threads</text>',
            '</svg>'
        ].join("\n")

        var res = new MD2Email().toHTMLMap(svg, { svgToPng: true, svgPngMode: "embed" })
        ow.test.assert(res.html.indexOf("<svg") >= 0, true,
            "toHTMLMap should keep inline SVG when PNG conversion cannot parse it")
        ow.test.assert(res.pngFiles.length, 0,
            "toHTMLMap should not report a generated PNG for an unsupported SVG")
    }

    exports.testSetEmailFromMarkdownFileEmbedsLocalImage = function() {
        var tmp = java.io.File.createTempFile("md2email-test", "")
        tmp.delete()
        tmp.mkdirs()

        var dir = String(tmp.getPath())
        io.writeFileString(dir + "/chart.png", "not a real png")
        io.writeFileString(dir + "/mail.md", "# Report\n\n![Chart](chart.png)")

        var calls = { html: "", msg: "", embeds: [] }
        var email = {
            setHTML: function(html) { calls.html = html; return email },
            setMessage: function(msg) { calls.msg = msg; return email },
            embedFile: function(path, name) {
                calls.embeds.push({ path: path, name: name })
                return "returned-" + name
            }
        }

        var res = new MD2Email().setEmailFromMarkdownFile(email, dir + "/mail.md", { wrap: false })

        ow.test.assert(calls.embeds.length, 1, "setEmailFromMarkdownFile should embed one local image")
        ow.test.assert(String(calls.embeds[0].name), "chart.png", "setEmailFromMarkdownFile should use the file name as embed name")
        ow.test.assert(calls.html.indexOf('src="cid:returned-chart.png"') >= 0, true,
            "setEmailFromMarkdownFile should rewrite image src to the CID returned by embedFile")
        ow.test.assert(res.embeddedFiles[0].cid, "returned-chart.png",
            "setEmailFromMarkdownFile should return embedded file metadata")
        ow.test.assert(calls.msg.indexOf("Report") >= 0, true,
            "setEmailFromMarkdownFile should set the plain-text alternative message")
    }

    exports.testSetEmailFromMarkdownEmbedsLocalImage = function() {
        var tmp = java.io.File.createTempFile("md2email-test", "")
        tmp.delete()
        tmp.mkdirs()

        var dir = String(tmp.getPath())
        io.writeFileString(dir + "/chart.png", "not a real png")

        var calls = { html: "", msg: "", embeds: [], charset: "" }
        var email = {
            setHTML: function(html) { calls.html = html; return email },
            setMessage: function(msg) { calls.msg = msg; return email },
            setCharset: function(charset) { calls.charset = charset; return email },
            embedFile: function(path, name) {
                calls.embeds.push({ path: path, name: name })
                return "returned-" + name
            }
        }

        var res = new MD2Email().setEmailFromMarkdown(email, "# Report 😀\n\n![Chart](chart.png)", {
            wrap   : false,
            baseDir: dir
        })

        ow.test.assert(calls.charset, "UTF-8",
            "setEmailFromMarkdown should set UTF-8 charset on compatible Email objects")
        ow.test.assert(calls.embeds.length, 1, "setEmailFromMarkdown should embed one local image")
        ow.test.assert(String(calls.embeds[0].name), "chart.png", "setEmailFromMarkdown should use the file name as embed name")
        ow.test.assert(calls.html.indexOf('src="cid:returned-chart.png"') >= 0, true,
            "setEmailFromMarkdown should rewrite image src to the CID returned by embedFile")
        ow.test.assert(calls.html.indexOf("😀") >= 0, true,
            "setEmailFromMarkdown should preserve emoji in HTML content")
        ow.test.assert(res.embeddedFiles[0].cid, "returned-chart.png",
            "setEmailFromMarkdown should return embedded file metadata")
        ow.test.assert(calls.msg.indexOf("Report 😀") >= 0, true,
            "setEmailFromMarkdown should set the UTF-8 plain-text alternative message")
    }

    exports.testSetEmailFromMarkdownCustomCharset = function() {
        var calls = { charset: "" }
        var email = {
            setHTML: function(html) { return email },
            setMessage: function(msg) { return email },
            setCharset: function(charset) { calls.charset = charset; return email },
            embedFile: function(path, name) { return "cid" }
        }

        new MD2Email().setEmailFromMarkdown(email, "Olá 😀", {
            wrap        : false,
            emailCharset: "ISO-8859-1"
        })

        ow.test.assert(calls.charset, "ISO-8859-1",
            "setEmailFromMarkdown should allow overriding the email charset")
    }

    exports.testSetEmailFromMarkdownFileDeduplicatesImages = function() {
        var tmp = java.io.File.createTempFile("md2email-test", "")
        tmp.delete()
        tmp.mkdirs()

        var dir = String(tmp.getPath())
        io.writeFileString(dir + "/chart.png", "not a real png")
        io.writeFileString(dir + "/mail.md", "![One](chart.png)\n\n![Two](./chart.png)")

        var calls = { html: "", embeds: [] }
        var email = {
            setHTML: function(html) { calls.html = html; return email },
            embedFile: function(path, name) {
                calls.embeds.push({ path: path, name: name })
                return "cid-" + name
            }
        }

        new MD2Email().setEmailFromMarkdownFile(email, dir + "/mail.md", { wrap: false, setMessage: false })

        ow.test.assert(calls.embeds.length, 1, "setEmailFromMarkdownFile should embed the same local file once")
        ow.test.assert(calls.html.split("cid:cid-chart.png").length - 1, 2,
            "setEmailFromMarkdownFile should reuse the same CID for repeated image references")
    }
})()
