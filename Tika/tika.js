loadExternalJars(getOPackPath("Tika") || ".")

/**
 * <odoc>
 * <key>Tika.Tika(aOptions) : Tika</key>
 * Creates a document extractor. Options: maxChars (1000000; -1 unlimited),
 * ocr (false), ocrLanguage (eng), embedded (false). Requires Java 17+.
 * </odoc>
 */
var Tika = function(aOptions) {
  var o = _$(aOptions, "options").isMap().default({})
  this.maxChars = isUnDef(o.maxChars) ? 1000000 : o.maxChars
  if (typeof this.maxChars != "number" || !isFinite(this.maxChars) || Math.floor(this.maxChars) != this.maxChars || this.maxChars < -1 || this.maxChars > 2147483647) {
    throw new Error("maxChars must be -1 or a non-negative 32-bit integer")
  }
  this.ocr = _$(o.ocr, "ocr").isBoolean().default(false)
  this.ocrLanguage = _$(o.ocrLanguage, "ocrLanguage").isString().default("eng")
  this.embedded = _$(o.embedded, "embedded").isBoolean().default(false)
  this._loader = Packages.org.apache.tika.config.loader.TikaLoader.loadDefault()
  this._parser = this._loader.loadAutoDetectParser()
}

/**
 * <odoc>
 * <key>Tika.extractFile(aFile) : Map</key>
 * Extracts a local file and closes its stream. Returns text, metadata (arrays of
 * strings), mediaType, source and truncated. Parser failures are thrown.
 * </odoc>
 */
Tika.prototype.extractFile = function(aFile) {
  _$(aFile, "file").isString().$_()
  var file = new java.io.File(aFile)
  if (!file.isFile()) throw new Error("Not a regular file: " + aFile)
  var stream = new java.io.FileInputStream(file)
  try {
    return this.extractStream(stream, String(file.getName()), String(file.getCanonicalPath()))
  } finally {
    stream.close()
  }
}

/**
 * <odoc>
 * <key>Tika.extractBytes(aBytes, aName) : Map</key>
 * Extracts an OpenAF/Java byte array. Optional aName supplies a filename hint.
 * </odoc>
 */
Tika.prototype.extractBytes = function(aBytes, aName) {
  var stream = new java.io.ByteArrayInputStream(aBytes)
  try {
    return this.extractStream(stream, aName)
  } finally {
    stream.close()
  }
}

/**
 * <odoc>
 * <key>Tika.extractStream(aStream, aName, aSource) : Map</key>
 * Consumes a Java InputStream from its current position. The caller owns and
 * closes aStream. aName is an optional filename hint; aSource is a source label.
 * </odoc>
 */
Tika.prototype.extractStream = function(aStream, aName, aSource) {
  aName = _$(aName, "name").isString().default("")
  aSource = _$(aSource, "source").isString().default(aName)
  var p = Packages.org.apache.tika
  var metadata = new p.metadata.Metadata()
  if (aName.length > 0) metadata.set(p.metadata.TikaCoreProperties.RESOURCE_NAME_KEY, aName)
  var context = this._loader.loadParseContext()
  // Tika 4 resolves component configuration by name.
  context.setJsonConfig("tesseract-ocr-parser", stringify({ skipOcr: !this.ocr, language: this.ocrLanguage }))
  context.setJsonConfig("pdf-parser", stringify({ ocr: { strategy: this.ocr ? "AUTO" : "NO_OCR" } }))
  if (!this.embedded) {
    context.set(p.extractor.EmbeddedDocumentExtractor, new JavaAdapter(p.extractor.EmbeddedDocumentExtractor, {
      shouldParseEmbedded: function() { return false },
      parseEmbedded: function() {}
    }))
  }
  var writer = new java.io.StringWriter()
  var handler = new p.sax.BodyContentHandler(new p.sax.WriteOutContentHandler(writer, this.maxChars))
  // A close shield preserves caller ownership while Tika releases temporary files.
  var shield = Packages.org.apache.commons.io.input.CloseShieldInputStream.wrap(aStream)
  var input = p.io.TikaInputStream.get(shield)
  var truncated = false
  try {
    try {
      this._parser.parse(input, handler, metadata, context)
    } catch(e) {
      var cause = e.javaException || e
      if (p.exception.WriteLimitReachedException.isWriteLimitReached(cause)) truncated = true
      else throw e
    }
  } finally {
    input.close()
  }
  var values = {}
  var names = metadata.names()
  for (var i = 0; i < names.length; i++) {
    var key = String(names[i])
    var items = metadata.getValues(key)
    var list = []
    for (var j = 0; j < items.length; j++) list.push(String(items[j]))
    Object.defineProperty(values, key, { value: list, enumerable: true, configurable: true, writable: true })
  }
  var mediaType = metadata.get(p.metadata.HttpHeaders.CONTENT_TYPE)
  return { text: String(writer.toString()), metadata: values,
    mediaType: isNull(mediaType) ? "application/octet-stream" : String(mediaType),
    source: aSource, truncated: truncated }
}
