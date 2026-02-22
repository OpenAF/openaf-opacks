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
        var html = m.toHTML("# Héllo Wörld\n\nçâü")
        ow.test.assert(html.indexOf("Héllo") >= 0, true,
            "toHTML should preserve non-ASCII characters in headings")
        ow.test.assert(html.indexOf("çâü") >= 0, true,
            "toHTML should preserve non-ASCII characters in paragraphs")
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
})()
