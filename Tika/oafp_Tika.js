exports.oafplib = function(params, _$o, $o, oafp) {
  return {
    // Explicit input avoids taking over existing document-format libraries.
    fileExtensions: [],
    fileExtensionsNoMem: [{ ext: "tika" }],
    input: [{ type: "tika", fn: function(r, options) {
      if (isUnDef(params.file)) throw new Error("Tika input requires file=path; binary stdin is not supported")
      loadLib("tika.js")
      var extractor = new Tika({
        maxChars: isDef(params.tikamaxchars) ? Number(params.tikamaxchars) : 1000000,
        ocr: isDef(params.tikaocr) ? toBoolean(params.tikaocr) : false,
        ocrLanguage: params.tikaocrlanguage,
        embedded: isDef(params.tikaembedded) ? toBoolean(params.tikaembedded) : false
      })
      _$o(extractor.extractFile(params.file), options)
    }}],
    help: "# Tika input\n\nRead a document with `oafp libs=Tika in=tika file=report.pdf`.\n\n" +
      "Options: tikamaxchars=1000000 (-1 unlimited), tikaocr=false, tikaocrlanguage=eng, tikaembedded=false.\n" +
      "Returns text, metadata (arrays), mediaType, source and truncated. Requires Java 17+. OCR requires Tesseract.\n" +
      "Use path=text out=raw for text only. Binary stdin and cmd input are not supported."
  }
}
