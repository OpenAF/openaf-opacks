/**
 * <odoc>
 * <key>SocksServer.SocksServer()</key>
 * Initiates a SockServer wrapper.
 * </odoc>
 */
var SocksServer = function() {
    if (isUnDef(getOPackPath("SocksServer")))
        loadExternalJars(".")
    else
        loadExternalJars(getOPackPath("SocksServer"))
}

/**
 * <odoc>
 * <key>SocksServer.start(aPort)</key>
 * Starts a socks server on aPort (no encryption of traffic). Repeated calls will create
 * other socks server.
 * </odoc>
 */
SocksServer.prototype.start = function(aPort) {
    aPort = _$(aPort).isNumber().default(1080)

    if (isUnDef(this._server)) 
        this._server = new Packages.org.bbottema.javasocksproxyserver.SocksServer()
    return this._server.start(aPort)
}

/**
 * <odoc>
 * <key>SocksServer.stop()</key>
 * Stops all socks server started using this current SocksServer instance.
 * </odoc>
 */
SocksServer.prototype.stop = function() {
    this._server.stop()
}