# DRProxy

DRProxy is a Debug Reverse Proxy to be used in helping debug HTTP/HTTPs communication. It allows the interception of pre-proxy and post-proxy requests for any debug need.

## Install

With OpenAF installed execute:

````bash
opack install DRProxy
````

Then on a openaf-console:

````javascript
> loadLib("drproxy.js");
> help DRProxy
> var drp = new DRProxy(...);
````

## Examples

### Simple reverse proxy

Any request on port 8080 will be proxied from http://my.target.site.

````javascript
var drp = new DRProxy({ 
    proxyTo: "http://my.target.site", 
    proxyPort: 8080, 
    logFuncs: DRProxy.defaultLogs 
});
````

### Change content

Any request on port 8080 will be proxied from http://my.target.site but any content whose mime-type is html will have all 'yes' changed by 'NO'.

````javascript
var drp = new DRProxy({
    proxyTo: "http://my.target.site",
    proxyPort: 8080,
    logFuncs: DRProxy.defaultLogs,
    posFunc: (is, r) => {
        // If mimetype is HTML
        if (r.response.contentType.match(/html/)) {
            // Change all 'Yes' by 'NO'
            return {
                stream: af.fromString2InputStream(af.fromInputStream2String(is))
                        .replace(/yes/ig, "NO")),
                response: r
            }
        }
    }
})