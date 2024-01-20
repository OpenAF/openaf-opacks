# SocksServer

## Usage

### Simple with no logging

````javascript
loadLib("socksServer.js")
var ss = new SocksServer()
ss.start(10080)
ss.stop()
````

### With basic logging

````javascript
loadLib("socksServer.js")
var ss = new SocksServer()
ss.start(10080, ss.getLogCallback(true))
ss.stop()
````

### With detailed logging

````javascript
loadLib("socksServer.js")
var ss = new SocksServer()
ss.start(10080, ss.getLogCallback(true, true, true))
ss.stop()
````

### Filtering to access only private local CIDRs

````javascript
loadLib("socksServer.js")
var ss = new SocksServer()
ss.start(10080, ss.getLocalNetCallback())
ss.stop()
````

### Filtering to access only a specific CIDR

````javascript
loadLib("socksServer.js")
var ss = new SocksServer()
ss.start(10080, ss.getCallback(ss.getNetFilter(["10.0.0.0/24", "192.168.1.0/16", "fc00::/7"], [""]), true, true, false))
ss.stop()
````