loadExternalJars(getOPackPath("SSHd") || ".")

/**
 * <odoc>
 * <key>SSHd.SSHd(aPort) : SSHd</key>
 * Starts a simple SSHd server on aPort.
 * </odoc>
 */
var SSHd = function(aPort) {
   this.port = _$(aPort, "aPort").isNumber().default(22)

   this.sshd = new Packages.org.apache.sshd.server.SshServer.setUpDefaultServer()
   this.sshd.setPort(2244)
   this.sshd.setKeyPairProvider(new Packages.org.apache.sshd.server.keyprovider.SimpleGeneratorHostKeyProvider())
   this.sshd.setPasswordAuthenticator(new Packages.org.apache.sshd.server.auth.password.StaticPasswordAuthenticator(true))
   this.sshd.setPublickeyAuthenticator(new Packages.org.apache.sshd.server.config.keys.DefaultAuthorizedKeysAuthenticator(true))
   this.sshd.setShellFactory(new Packages.org.apache.sshd.server.shell.InteractiveProcessShellFactory())
   this.start()
}

/**
 * <odoc>
 * <key>SSHd.start()</key>
 * Starts the SSHd server.
 * </odoc>
 */
SSHd.prototype.start = function() {
   this.sshd.start()
}

/**
 * <odoc>
 * <key>SSHd.stop()</key>
 * Stops the SSHd server.
 * </odoc>
 */
SSHd.prototype.stop = function() {
   this.sshd.stop()
}

/**
 * <odoc>
 * <key>SSHd.getObj() : Object</key>
 * Returns the internal SSHd object.
 * </odoc>
 */
SSHd.prototype.getObj = function() {
   return this.sshd
}
