var Kube = function(aURL) {
	plugin("HTTP");
	this.url = aURL;
}

Kube.prototype.exec = function(aNamespace, aPod, aCommand, aTimeout, doSH) {
	var h = new HTTP();

	var pre = (doSH) ? "command=/bin/sh&command=-c&" : "";
	var cmd = pre + "stderr=true&command=" + aCommand.split(/ +/).join("&command=");
	var session; var out = "";
	var client = h.wsConnect(this.url.replace(/^http/i, "ws") + "/api/v1/namespaces/" + aNamespace + "/pods/" + aPod + "/exec?" + encodeURI(cmd).replace(/\+/g, "%2B"),
		function(s) { session = s; },
		function(type, payload) {
			out += af.fromBytes2String(payload).substring(1);
		},
		function(cause) { throw cause; },
		function(sC, reason) { if (sC != 1000 || reason != null) throw reason; else aTimeout = 0; }
	);

        var start = now();
        if (isUnDef(aTimeout)) aTimeout = 300000;
	while (out.length < 1 && ((now() - start) < aTimeout)) {
		sleep(100);
	};

	client.stop();
	return out;
}

Kube.prototype.getNamespaces = function(full) {
	var h = new HTTP();
	var res = JSON.parse(h.exec(this.url + "/api/v1/pods").response);

	if (full)
		return res.items;
	else
		return Object.keys($stream(clone(res.items)).groupBy("metadata.namespace"));
}

Kube.prototype.getNames = function(aNamespace, full) {
	var h = new HTTP();
	var res = JSON.parse(h.exec(this.url + "/api/v1/pods").response);

	if (full) {
		return $from(res.items).equals("metadata.namespace", aNamespace).select();
	} else {
		return $from(res.items).equals("metadata.namespace", aNamespace).select(function(rr) {
			return rr.metadata.name;
		})
	}
}

