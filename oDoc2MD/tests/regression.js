try {
// Run from this opack directory: oaf -f tests/regression.js
// External services are replaced with deterministic test doubles.
ow.loadObj();
function check(actual, expected, message) {
  if (stringify(actual) != stringify(expected)) throw new Error(message + ": " + stringify(actual));
}
var output;
var render = new Function("searchHelp", "io", io.readFileString("odoc2md.js") + ";return id2MD;")(
 function() { return []; }, { writeFileString: function(file, text) { output = text; } });
var template = io.createTempFile("odoc-regression-", ".hbs");
io.writeFileString(template, "{{id}}");
try {
render("example", ".", template, "unused");
check(output, "example", "translation map is optional");
render("example", ".", template, "unused", { example: "Translated" });
check(output, "Translated", "provided translation used");
} finally { io.rm(template); }
print("PASS oDoc2MD regression");
} catch(e) { printErr(e); exit(1); }
