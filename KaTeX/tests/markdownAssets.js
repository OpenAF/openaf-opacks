// Run from the KaTeX oPack directory: oaf -f tests/markdownAssets.js
var packRoot = String(new java.io.File(".").getCanonicalPath())
var originalPath = getOPackPath

// Exercise checkout assets without installing or replacing the local oPack.
getOPackPath = function(name) {
  return name === "KaTeX" ? packRoot : originalPath(name)
}
try {
  loadLib(packRoot + "/katex.js")
  var markdown = "$" + "$x^2$" + "$"
  var output = ow.template.parseMD2HTML(markdown, true, false, {}, false, "/prefix")
  if (output.indexOf('left:"$$",right:"$$",display:true') < 0) throw new Error("Display delimiters changed during head insertion")
  if (output.indexOf('/prefix/js/katex.min.js') < 0 || output.indexOf('/prefix/css/katex.min.css') < 0) throw new Error("Missing prefixed assets")

  // The body fallback also preserves delimiters and existing body attributes.
  var originalParser = ow.template.__katexOriginalParseMD2HTML
  try {
    ow.template.__katexOriginalParseMD2HTML = function() { return '<body class="sample">Math</body>' }
    var body = ow.template.parseMD2HTML(markdown, true)
    if (body.indexOf('left:"$$",right:"$$",display:true') < 0 || body.indexOf('<body class="sample">') < 0) throw new Error("Body insertion changed script text or attributes")
  } finally {
    ow.template.__katexOriginalParseMD2HTML = originalParser
  }
  print("KaTeX Markdown asset insertion: head/body delimiters and prefix checks passed.")
} finally {
  getOPackPath = originalPath
}
