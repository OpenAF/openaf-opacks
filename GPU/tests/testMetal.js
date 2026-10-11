// Run from GPU/: oaf -f tests/testMetal.js
// Hardware: set -Dopenaf.gpu.testMetal=true or the equivalent System property.
// Load the helper before compiling the checks: Rhino scopes capture class loaders.
loadLib("gpu.js")
load(_gpuRoot + "/tests/metalChecks.js")
