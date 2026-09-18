try {
// Run from this opack directory: oaf -f tests/regression.js
// External services are replaced with deterministic test doubles.
ow.loadObj();
function check(actual, expected, message) {
  if (stringify(actual) != stringify(expected)) throw new Error(message + ": " + stringify(actual));
}
var morse = require("morse.js");
["human", "binary"].forEach(function(mode) {
  var text = "HELLO (WORLD) & TEST: A=B+C-D_@ ÉÇÀÈ";
  check(morse.translateFrom(morse.translateTo(text, mode), mode), text, "punctuation round trip " + mode);
});
check(morse.translateTo("("), "-.--.", "parenthesis dashes preserved");
print("PASS morse regression");
} catch(e) { printErr(e); exit(1); }
