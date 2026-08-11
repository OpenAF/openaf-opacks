(function() {
    loadLib("mdconvert.js")

    // -----------------------------------------------------------------------
    // htmlToMarkdown
    // -----------------------------------------------------------------------
    exports.testHtml2mdHeading = function() {
        var c  = new MDConvert()
        var md = c.htmlToMarkdown("<h1>Hello</h1>")

        ow.test.assert(md.indexOf("Hello") >= 0, true,
            "htmlToMarkdown should keep the heading text")
        ow.test.assert(md.indexOf("=") >= 0 || md.indexOf("#") >= 0, true,
            "htmlToMarkdown should render an <h1> as a Markdown heading (setext or ATX)")
    }

    exports.testHtml2mdBoldAndItalic = function() {
        var c  = new MDConvert()
        var md = c.htmlToMarkdown("<p><b>bold</b> and <i>italic</i></p>")

        ow.test.assert(md.indexOf("**bold**") >= 0, true,
            "htmlToMarkdown should render <b> as **bold**")
        ow.test.assert(md.indexOf("italic") >= 0, true,
            "htmlToMarkdown should keep italic text")
    }

    exports.testHtml2mdLink = function() {
        var c  = new MDConvert()
        var md = c.htmlToMarkdown('<a href="https://openaf.io">OpenAF</a>')

        ow.test.assert(md.indexOf("[OpenAF](https://openaf.io)") >= 0, true,
            "htmlToMarkdown should render <a href> as a Markdown link")
    }

    exports.testHtml2mdList = function() {
        var c  = new MDConvert()
        var md = c.htmlToMarkdown("<ul><li>one</li><li>two</li></ul>")

        ow.test.assert(md.indexOf("one") >= 0, true,
            "htmlToMarkdown should keep list item text (one)")
        ow.test.assert(md.indexOf("two") >= 0, true,
            "htmlToMarkdown should keep list item text (two)")
    }

    exports.testHtml2mdRequiresString = function() {
        var c = new MDConvert()
        var threw = false
        try {
            c.htmlToMarkdown(123)
        } catch(e) {
            threw = true
        }
        ow.test.assert(threw, true,
            "htmlToMarkdown should throw when aHTML isn't a string")
    }

    // -----------------------------------------------------------------------
    // toHTML / parse / toHTMLFromNode
    // -----------------------------------------------------------------------
    exports.testMd2htmlBasic = function() {
        var c    = new MDConvert()
        var html = c.toHTML("# Hello\n\nWorld")

        ow.test.assert(html.indexOf("<h1>Hello</h1>") >= 0, true,
            "toHTML should produce an <h1> for an ATX heading")
        ow.test.assert(html.indexOf("<p>World</p>") >= 0, true,
            "toHTML should produce a <p> for a paragraph")
    }

    exports.testMd2htmlInlineMarkup = function() {
        var c    = new MDConvert()
        var html = c.toHTML("**bold** and `code`")

        ow.test.assert(html.indexOf("<strong>bold</strong>") >= 0, true,
            "toHTML should render **bold** as <strong>")
        ow.test.assert(html.indexOf("<code>code</code>") >= 0, true,
            "toHTML should render `code` as <code>")
    }

    exports.testMd2htmlTables = function() {
        var c    = new MDConvert()
        var html = c.toHTML("| A | B |\n|---|---|\n| 1 | 2 |\n")

        ow.test.assert(html.indexOf("<table>") >= 0, true,
            "toHTML should produce a <table> for the GFM tables extension by default")
    }

    exports.testMd2htmlTablesDisabled = function() {
        var c    = new MDConvert({ tables: false })
        var html = c.toHTML("| A | B |\n|---|---|\n| 1 | 2 |\n")

        ow.test.assert(html.indexOf("<table>") >= 0, false,
            "toHTML should not produce a <table> when the tables option is disabled")
    }

    exports.testParseAndRender = function() {
        var c    = new MDConvert()
        var node = c.parse("# Hello")
        var html = c.toHTMLFromNode(node)

        ow.test.assert(html.indexOf("<h1>Hello</h1>") >= 0, true,
            "toHTMLFromNode should render a previously parsed Node")
    }

    // -----------------------------------------------------------------------
    // PDF
    // -----------------------------------------------------------------------
    exports.testPdfBytesValid = function() {
        var c     = new MDConvert()
        var bytes = c.toPDFBytes("# Test PDF\n\nHello **world**")

        ow.test.assert(bytes.length > 0, true,
            "toPDFBytes should return a non-empty byte array")

        var magic = String.fromCharCode(bytes[0] & 0xFF) + String.fromCharCode(bytes[1] & 0xFF) +
                    String.fromCharCode(bytes[2] & 0xFF) + String.fromCharCode(bytes[3] & 0xFF)
        ow.test.assert(magic, "%PDF", "toPDFBytes output should start with the %PDF magic bytes")
    }

    exports.testPdfFileWrite = function() {
        var c        = new MDConvert()
        var tempFile = io.createTempFile("mdconvert-test-", ".pdf")
        c.toPDF("# Hello\n\nWorld", tempFile)

        ow.test.assert(io.fileExists(tempFile), true,
            "toPDF should write a file at aOutputFile")
        ow.test.assert(io.fileInfo(tempFile).size > 0, true,
            "toPDF should write a non-empty file")

        io.rm(tempFile)
    }

    // -----------------------------------------------------------------------
    // DOCX
    // -----------------------------------------------------------------------
    exports.testDocxBytesValid = function() {
        var c     = new MDConvert()
        var bytes = c.toDOCXBytes("# Test DOCX\n\nHello **world**")

        ow.test.assert(bytes.length > 0, true,
            "toDOCXBytes should return a non-empty byte array")

        var magic = String.fromCharCode(bytes[0] & 0xFF) + String.fromCharCode(bytes[1] & 0xFF)
        ow.test.assert(magic, "PK", "toDOCXBytes output should start with the PK (ZIP) magic bytes")
    }

    exports.testDocxFileWrite = function() {
        var c        = new MDConvert()
        var tempFile = io.createTempFile("mdconvert-test-", ".docx")
        c.toDOCX("# Hello\n\nWorld", tempFile)

        ow.test.assert(io.fileExists(tempFile), true,
            "toDOCX should write a file at aOutputFile")
        ow.test.assert(io.fileInfo(tempFile).size > 0, true,
            "toDOCX should write a non-empty file")

        io.rm(tempFile)
    }

    // -----------------------------------------------------------------------
    // Module-level shortcuts
    // -----------------------------------------------------------------------
    exports.testShortcutHtml2md = function() {
        var md = mdconvert.html2md("<h1>Hello</h1>")
        ow.test.assert(md.indexOf("Hello") >= 0, true,
            "mdconvert.html2md should convert HTML to Markdown")
    }

    exports.testShortcutMd2html = function() {
        var html = mdconvert.md2html("# Hello")
        ow.test.assert(html.indexOf("<h1>Hello</h1>") >= 0, true,
            "mdconvert.md2html should convert Markdown to HTML")
    }

    exports.testShortcutMd2pdf = function() {
        var bytes = mdconvert.md2pdf("# Hello")
        ow.test.assert(bytes.length > 0, true,
            "mdconvert.md2pdf should return a non-empty byte array")
    }

    exports.testShortcutMd2docx = function() {
        var bytes = mdconvert.md2docx("# Hello")
        ow.test.assert(bytes.length > 0, true,
            "mdconvert.md2docx should return a non-empty byte array")
    }

    exports.testShortcutMd2pdfFile = function() {
        var tempFile = io.createTempFile("mdconvert-test-", ".pdf")
        mdconvert.md2pdfFile("# Hello", tempFile)

        ow.test.assert(io.fileExists(tempFile), true,
            "mdconvert.md2pdfFile should write a PDF file")

        io.rm(tempFile)
    }

    exports.testShortcutMd2docxFile = function() {
        var tempFile = io.createTempFile("mdconvert-test-", ".docx")
        mdconvert.md2docxFile("# Hello", tempFile)

        ow.test.assert(io.fileExists(tempFile), true,
            "mdconvert.md2docxFile should write a DOCX file")

        io.rm(tempFile)
    }

    // -----------------------------------------------------------------------
    // Edge cases
    // -----------------------------------------------------------------------
    exports.testEmptyStringHtml2md = function() {
        var c  = new MDConvert()
        var md = c.htmlToMarkdown("")
        ow.test.assert(md, "", "htmlToMarkdown of an empty string should return an empty string")
    }

    exports.testEmptyStringMd2html = function() {
        var c    = new MDConvert()
        var html = c.toHTML("")
        ow.test.assert(html, "", "toHTML of an empty string should return an empty string")
    }

    exports.testUnicodeContent = function() {
        var c    = new MDConvert()
        var html = c.toHTML("# 你好\n\nCafé ❤️")

        ow.test.assert(html.indexOf("你好") >= 0, true,
            "toHTML should preserve unicode heading text")
        ow.test.assert(html.indexOf("Café") >= 0, true,
            "toHTML should preserve unicode paragraph text")
    }
})()
