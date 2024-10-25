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
   this._checkList = {
      keypair: false,
      pwd: false,
      pk: false,
      shell: false
   }
   this.sshd.setPort(this.port)
}

/**
 * <odoc>
 * <key>SSHd.start()</key>
 * Starts the SSHd server.
 * </odoc>
 */
SSHd.prototype.start = function() {
   if (!this._checkList.keypair) this.sshd.setKeyPairProvider(new Packages.org.apache.sshd.server.keyprovider.SimpleGeneratorHostKeyProvider())
   if (!this._checkList.pwd)     this.sshd.setPasswordAuthenticator(new Packages.org.apache.sshd.server.auth.password.StaticPasswordAuthenticator(true))
   if (!this._checkList.pk)      this.sshd.setPublickeyAuthenticator(new Packages.org.apache.sshd.server.config.keys.DefaultAuthorizedKeysAuthenticator(true))
   if (!this._checkList.shell)   this.sshd.setShellFactory(new Packages.org.apache.sshd.server.shell.InteractiveProcessShellFactory())
   this.sshd.start()
}

/**
 * <odoc>
 * <key>SSHd.genServerCert(aFile)</key>
 * Generates a server certificate on aFile.
 * </odoc>
 */
SSHd.prototype.genServerCert = function(aFile) {
   aFile = _$(aFile, "aFile").isString().default("hostkey.ser")
   this.sshd.setKeyPairProvider(new SimpleGeneratorHostKeyProvider(Paths.get(aFile)))
   this._checkList.keypair = true
}

/**
 * <odoc>
 * <key>SSHd.setPasswordAuthenticator(aFunc)</key>
 * Sets aFunc as the password authenticator function. Example:\
 * \
 * var sshd = new SSHd(2222)\
 * sshd.setPasswordAuthenticator(function(username, password, session) {\
 *   if (username == "admin" and password == "admin") return true\
 *   return false\
 * })\
 * \
 * </odoc>
 */
SSHd.prototype.setPasswordAuthenticator = function(aFunc) {
   this.sshd.setPasswordAuthenticator(aFunc)
   this._checkList.pwd = true
}

/**
 * <odoc>
 * <key>SSHd.setPublickeyAuthenticator(aFunc)</key>
 * Sets aFunc as the public key authenticator function. Example:\
 * \
 * var sshd = new SSHd(2222)\
 * sshd.setPublickeyAuthenticator(function(username, key, session) {\
 *  if (username == "admin" and key.getEncoded() == "admin".getBytes()) return true\
 *  return false\
 * })\
 * </odoc>
 */
SSHd.prototype.setPublickeyAuthenticator = function(aFunc) {
   this.sshd.setPublickeyAuthenticator(aFunc)
   this._checkList.pk = true
}

/**
 * <odoc>
 * <key>SSHd.setShellFactory(aShellFactory)</key>
 * Sets aShellFactory as the shell factory. Example:\
 * \
 * var sshd = new SSHd(2222)\
 * sshd.setShellFactory(new org.apache.sshd.server.command.ProcessShellFactory("/bin/sh", "-i"))\
 * \
 * </odoc>
 */
SSHd.prototype.setShellFactory = function(aShellFactory) {
   this.sshd.setShellFactory(aShellFactory)
   this._checkList.shell = true
}

/**
 * <odoc>
 * <key>SSHd.setShellFactoryCmd(aCommand, aArgs)</key>
 * Sets aCommand and aArgs as the shell factory. Example:\
 * \
 * var sshd = new SSHd(2222)\
 * sshd.setShellFactoryCmd("/bin/sh", "-i")\
 * \
 * sshd.setShellFactory({ createShell: () => { return function(session) { sprint(session.getUsername()); return (new org.apache.sshd.server.command.ProcessShellFactory("/bin/sh", "-i")).create(); } } })\
 * \
 * </odoc>
 */
SSHd.prototype.setShellFactoryCmd = function(aCommand, aArgs) {
   this.sshd.setShellFactory(new org.apache.sshd.server.command.ProcessShellFactory(aCommand, aArgs))
   this._checkList.shell = true
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
