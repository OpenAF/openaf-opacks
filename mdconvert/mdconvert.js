// mdconvert — OpenAF wrapper for flexmark-java
// Converts HTML to Markdown, and Markdown to HTML, PDF and DOCX.
//
// Author: Nuno Aguiar

var __mdconvertPath = getOPackPath("mdconvert") || "."
loadExternalJars(__mdconvertPath)

// ---------------------------------------------------------------------------
// MDConvert class
// ---------------------------------------------------------------------------

/**
 * <odoc>
 * <key>MDConvert.MDConvert(aOptions) : MDConvert</key>
 * Creates a new MDConvert instance backed by flexmark-java 0.64.8.\
 * \
 * Available aOptions:\
 *   - tables {Boolean} Enable the GFM tables extension for Markdown parsing/rendering (default: true)\
 * \
 * Example:\
 *   loadLib("mdconvert.js")\
 *   var c = new MDConvert()\
 *   print(c.htmlToMarkdown("<h1>Hello</h1><p>World</p>"))\
 * </odoc>
 */
var MDConvert = function(aOptions) {
    this.options = _$(aOptions).isMap().default({})

    var extList = new java.util.ArrayList()
    if (_$(this.options.tables).isBoolean().default(true))
        extList.add(Packages.com.vladsch.flexmark.ext.tables.TablesExtension.create())
    this._extList = extList

    this._dataSet = new Packages.com.vladsch.flexmark.util.data.MutableDataSet()
    this._dataSet.set(Packages.com.vladsch.flexmark.parser.Parser.EXTENSIONS, extList)

    this._parser        = Packages.com.vladsch.flexmark.parser.Parser.builder(this._dataSet).build()
    this._htmlRenderer  = Packages.com.vladsch.flexmark.html.HtmlRenderer.builder(this._dataSet).build()
    this._htmlConverter = Packages.com.vladsch.flexmark.html2md.converter.FlexmarkHtmlConverter.builder(this._dataSet).build()
}

/**
 * <odoc>
 * <key>MDConvert.htmlToMarkdown(aHTML) : String</key>
 * Converts an aHTML string to a Markdown string.\
 * \
 * Example:\
 *   var md = c.htmlToMarkdown("<h1>Hello</h1><p>World</p>")\
 *   // "Hello\n=====\n\nWorld\n"
 * </odoc>
 */
MDConvert.prototype.htmlToMarkdown = function(aHTML) {
    _$(aHTML, "aHTML").isString().$_()
    return String(this._htmlConverter.convert(aHTML))
}

/**
 * <odoc>
 * <key>MDConvert.parse(aMarkdown) : Node</key>
 * Parses aMarkdown into a flexmark-java Document node. The returned object is
 * a Java com.vladsch.flexmark.util.ast.Node which can be passed to toHTMLFromNode().\
 * </odoc>
 */
MDConvert.prototype.parse = function(aMarkdown) {
    _$(aMarkdown, "aMarkdown").isString().$_()
    return this._parser.parse(aMarkdown)
}

/**
 * <odoc>
 * <key>MDConvert.toHTMLFromNode(aNode) : String</key>
 * Renders a previously parsed flexmark-java Node to an HTML string.
 * </odoc>
 */
MDConvert.prototype.toHTMLFromNode = function(aNode) {
    return String(this._htmlRenderer.render(aNode))
}

/**
 * <odoc>
 * <key>MDConvert.toHTML(aMarkdown) : String</key>
 * Converts the aMarkdown string to an HTML fragment.\
 * \
 * Example:\
 *   loadLib("mdconvert.js")\
 *   var c = new MDConvert()\
 *   var html = c.toHTML("**bold** and _italic_")\
 *   // "<p><strong>bold</strong> and <em>italic</em></p>\n"
 * </odoc>
 */
MDConvert.prototype.toHTML = function(aMarkdown) {
    _$(aMarkdown, "aMarkdown").isString().$_()
    return this.toHTMLFromNode(this.parse(aMarkdown))
}

/**
 * <odoc>
 * <key>MDConvert.toPDFBytes(aMarkdown, aOptions) : Array</key>
 * Converts aMarkdown to a PDF document, returned as an OpenAF byte array
 * (suitable for io.writeFileBytes(), af.toBase64Bytes(), etc). Rendering is
 * done by first converting to HTML then exporting with openhtmltopdf.\
 * \
 * aOptions map:\
 *   - baseUri {String} Base URI/path used to resolve relative image and link paths (default: "")\
 *   - css     {String} Extra CSS embedded into the HTML before PDF export\
 * \
 * Example:\
 *   var bytes = c.toPDFBytes("# Hello\n\nWorld")\
 *   io.writeFileBytes("hello.pdf", bytes)\
 * </odoc>
 */
MDConvert.prototype.toPDFBytes = function(aMarkdown, aOptions) {
    _$(aMarkdown, "aMarkdown").isString().$_()
    var o = _$(aOptions).isMap().default({})

    var html = this.toHTML(aMarkdown)
    var css  = _$(o.css).isString().default("")
    if (css.length > 0)
        html = String(Packages.com.vladsch.flexmark.pdf.converter.PdfConverterExtension.embedCss(html, css))

    var baos = new java.io.ByteArrayOutputStream()
    try {
        Packages.com.vladsch.flexmark.pdf.converter.PdfConverterExtension.exportToPdf(
            baos, html, _$(o.baseUri).isString().default(""), this._dataSet)
    } catch(e) {
        throw "Unable to convert Markdown to PDF: " + e
    }
    return af.fromArray2Bytes(af.fromJavaArray(baos.toByteArray()))
}

/**
 * <odoc>
 * <key>MDConvert.toPDF(aMarkdown, aOutputFile, aOptions)</key>
 * Converts aMarkdown to a PDF document and writes it to aOutputFile. See
 * toPDFBytes() for the supported aOptions.\
 * \
 * Example:\
 *   c.toPDF("# Hello\n\nWorld", "hello.pdf")\
 * </odoc>
 */
MDConvert.prototype.toPDF = function(aMarkdown, aOutputFile, aOptions) {
    _$(aOutputFile, "aOutputFile").isString().$_()
    io.writeFileBytes(aOutputFile, this.toPDFBytes(aMarkdown, aOptions))
}

/**
 * <odoc>
 * <key>MDConvert.toDOCXBytes(aMarkdown, aOptions) : Array</key>
 * Converts aMarkdown to a DOCX document, returned as an OpenAF byte array
 * (suitable for io.writeFileBytes(), af.toBase64Bytes(), etc). Rendering is
 * done directly from the Markdown AST via flexmark-docx-converter (docx4j).\
 * \
 * Example:\
 *   var bytes = c.toDOCXBytes("# Hello\n\nWorld")\
 *   io.writeFileBytes("hello.docx", bytes)\
 * </odoc>
 */
MDConvert.prototype.toDOCXBytes = function(aMarkdown, aOptions) {
    _$(aMarkdown, "aMarkdown").isString().$_()
    _$(aOptions).isMap().default({})

    var node = this.parse(aMarkdown)
    var docxRenderer = Packages.com.vladsch.flexmark.docx.converter.DocxRenderer.builder(this._dataSet).build()

    try {
        var wordPackage = Packages.org.docx4j.openpackaging.packages.WordprocessingMLPackage.createPackage()
        docxRenderer.render(node, wordPackage)
        var baos = new java.io.ByteArrayOutputStream()
        wordPackage.save(baos)
        return af.fromArray2Bytes(af.fromJavaArray(baos.toByteArray()))
    } catch(e) {
        throw "Unable to convert Markdown to DOCX: " + e
    }
}

/**
 * <odoc>
 * <key>MDConvert.toDOCX(aMarkdown, aOutputFile, aOptions)</key>
 * Converts aMarkdown to a DOCX document and writes it to aOutputFile. See
 * toDOCXBytes() for the supported aOptions.\
 * \
 * Example:\
 *   c.toDOCX("# Hello\n\nWorld", "hello.docx")\
 * </odoc>
 */
MDConvert.prototype.toDOCX = function(aMarkdown, aOutputFile, aOptions) {
    _$(aOutputFile, "aOutputFile").isString().$_()
    io.writeFileBytes(aOutputFile, this.toDOCXBytes(aMarkdown, aOptions))
}

// ---------------------------------------------------------------------------
// Module-level shortcuts
// ---------------------------------------------------------------------------

/**
 * <odoc>
 * <key>mdconvert.html2md(aHTML, aOptions) : String</key>
 * Shortcut for `new MDConvert(aOptions).htmlToMarkdown(aHTML)`.
 * </odoc>
 */
/**
 * <odoc>
 * <key>mdconvert.md2html(aMarkdown, aOptions) : String</key>
 * Shortcut for `new MDConvert(aOptions).toHTML(aMarkdown)`.
 * </odoc>
 */
/**
 * <odoc>
 * <key>mdconvert.md2pdf(aMarkdown, aConvertOptions, aPdfOptions) : Array</key>
 * Shortcut for `new MDConvert(aConvertOptions).toPDFBytes(aMarkdown, aPdfOptions)`.
 * </odoc>
 */
/**
 * <odoc>
 * <key>mdconvert.md2pdfFile(aMarkdown, aOutputFile, aConvertOptions, aPdfOptions)</key>
 * Shortcut for `new MDConvert(aConvertOptions).toPDF(aMarkdown, aOutputFile, aPdfOptions)`.
 * </odoc>
 */
/**
 * <odoc>
 * <key>mdconvert.md2docx(aMarkdown, aConvertOptions, aDocxOptions) : Array</key>
 * Shortcut for `new MDConvert(aConvertOptions).toDOCXBytes(aMarkdown, aDocxOptions)`.
 * </odoc>
 */
/**
 * <odoc>
 * <key>mdconvert.md2docxFile(aMarkdown, aOutputFile, aConvertOptions, aDocxOptions)</key>
 * Shortcut for `new MDConvert(aConvertOptions).toDOCX(aMarkdown, aOutputFile, aDocxOptions)`.
 * </odoc>
 */
var mdconvert = {
    html2md: function(aHTML, aOptions) {
        return new MDConvert(aOptions).htmlToMarkdown(aHTML)
    },

    md2html: function(aMarkdown, aOptions) {
        return new MDConvert(aOptions).toHTML(aMarkdown)
    },

    md2pdf: function(aMarkdown, aConvertOptions, aPdfOptions) {
        return new MDConvert(aConvertOptions).toPDFBytes(aMarkdown, aPdfOptions)
    },
    md2pdfFile: function(aMarkdown, aOutputFile, aConvertOptions, aPdfOptions) {
        return new MDConvert(aConvertOptions).toPDF(aMarkdown, aOutputFile, aPdfOptions)
    },

    md2docx: function(aMarkdown, aConvertOptions, aDocxOptions) {
        return new MDConvert(aConvertOptions).toDOCXBytes(aMarkdown, aDocxOptions)
    },
    md2docxFile: function(aMarkdown, aOutputFile, aConvertOptions, aDocxOptions) {
        return new MDConvert(aConvertOptions).toDOCX(aMarkdown, aOutputFile, aDocxOptions)
    }
}
