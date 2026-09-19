try {
// Run from this opack directory: oaf -f tests/regression.js
// External services are replaced with deterministic test doubles.
ow.loadObj();
function check(actual, expected, message) {
  if (stringify(actual) != stringify(expected)) throw new Error(message + ": " + stringify(actual));
}
loadExternalJars(".");
load("sshd.js");
var server = new SSHd(0);
// Suppress binding a socket while exercising the actual default authenticator classes.
var configured = {}, fake = Object.create(SSHd.prototype);
fake._checkList = { keypair: true, pwd: false, pk: true, shell: true };
fake.sshd = { setPasswordAuthenticator: function(auth) { configured.auth = auth; }, start: function() {} };
fake.start();
check(configured.auth.authenticate("any", "password", null), false, "default password authentication must reject");
var custom = function() { return true; };
fake.setPasswordAuthenticator(custom);
fake.start();
check(configured.auth, custom, "explicit password authenticator retained");
server.genServerCert("/tmp/openaf-regression-hostkey-unused.ser");
check(server._checkList.keypair, true, "host key provider configured");
server.setShellFactoryCmd("/bin/sh", ["/bin/sh", "-i"]);
check(server._checkList.shell, true, "shell factory class resolves");
print("PASS SSHd regression");
} catch(e) { printErr(e); exit(1); }
