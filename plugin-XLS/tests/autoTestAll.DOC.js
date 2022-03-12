(function() {
    exports.testDOCSimple = function() {
        io.rm("test.docx")
        var text = "Hello world!"

        plugin("XLS", "DOC")

        var doc = new DOC()
        doc.addCustomHeadings()
        doc.writeParagraph(text)
        doc.writeFile("test.docx")
        doc.close()
        
        doc = new DOC("test.docx")
        var pars = doc.getParagraphs()
        var readText = String(pars[0].getText())
        doc.close()

        ow.test.assert(readText, text, "Problem writing simple DOC")
    }

    exports.testCustomHeadings = function() {
        io.rm("test.docx")

        plugin("XLS", "DOC")
        var doc = new DOC()
        doc.addCustomHeadings()
        doc.writeParagraph("Head 1", "Heading1")
        doc.writeParagraph("this is inside head 1")
        doc.writeParagraph("Head 2", "Heading2")
        doc.writeParagraph("this is inside head 2")
        doc.writeParagraph("Head 2", "Heading3")
        doc.writeParagraph("this is inside head 3")
        doc.writeParagraph("Head 2", "Heading4")
        doc.writeParagraph("this is inside head 4")
        doc.writeParagraph("Head 2", "Heading5")
        doc.writeParagraph("this is inside head 5")
        doc.writeFile("test.docx")  
        doc.close()
    }
})()