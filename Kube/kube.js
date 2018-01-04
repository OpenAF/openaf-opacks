/**
 * <odoc>
 * <key>Kube.Kube(aURL, aUser, aPass)</key>
 * Creates an instance to access a kubernetes (k8s) cluster on aURL. If defined, using aUser and aPass.
 * </odoc>
 */
var Kube = function (aURL, aUser, aPass) {
	plugin("HTTP");
	ow.loadFormat();
	this.url = aURL;
	this.user = aUser;
	this.pass = aPass;
};

/**
 * <odoc>
 * <key>Kube.exec(aNamespace, aPodName, aCommand, aTimeout, doSH) : String</key>
 * Tries to executed aCommand on aPodName of aNamespace. If defined, it will wait for the defined aTimeout and/or execute the aCommand on a /bin/sh if doSH = true.
 * aCommand can be either a string or an array. Do note that it might be necessary to URL encode some parts of commands.
 * </odoc>
 */
Kube.prototype.exec = function (aNamespace, aPod, aCommand, aTimeout, doSH) {
	var h = new HTTP();
	if (isDef(this.user)) h.login(this.user, this.pass, undefined, this.url.replace(/^http/i, "ws"));

	var pre = (doSH) ? "command=/bin/sh&command=-c&" : "";
	if (!isArray(aCommand)) aCommand = aCommand.split(/ +/);
	var cmd = pre + "stderr=true&command=" + aCommand.join("&command=");
	var session;
	var out = "";

	var client = h.wsConnect(this.url.replace(/^http/i, "ws") + "/api/v1/namespaces/" + aNamespace + "/pods/" + aPod + "/exec?" + encodeURI(cmd).replace(/\+/g, "%2B"),
		function (s) {
			session = s;
		},
		function (type, payload) {
			out += af.fromBytes2String(payload).substring(1);
		},
		function (cause) {
			th = cause;
			throw cause;
		},
		function (sC, reason) {
			if (sC != 1000 || reason != null) {
				th = reason;
				throw reason;
			} else aTimeout = 0;
		},
		undefined,
		true
	);

	var start = now();
	if (isUnDef(aTimeout)) aTimeout = 300000;
	while (out.length < 1 && ((now() - start) < aTimeout)) {
		client.get();
	}
	var prevOut = out.length;
	var prevTime = now();
	while ((now() - prevTime) < 150) {
		//sleep(50);
		if (out.length > prevOut) {
			prevOut = out.length;
			prevTime = now();
		}
	}
	session.stop();
	return out;
};

/**
 * <odoc>
 * <key>Kube.getNamespaces(full) : Array</key>
 * Tries to retrieve the list of namespaces on the current k8s cluster. If full = true then all namespace information will be provided.
 * </odoc>
 */
Kube.prototype.getNamespaces = function (full) {
	var h = new HTTP();
	if (isDef(this.user)) h.login(this.user, this.pass, undefined, this.url);

	var res = JSON.parse(h.exec(this.url + "/api/v1/pods").response);

	if (full)
		return res.items;
	else
		return Object.keys($stream(clone(res.items)).groupBy("metadata.namespace"));
};

/**
 * <odoc>
 * <key>Kube.getNames(aNamespace, full) : Array</key>
 * Tries to retrieve the list of pod names on aNamespace. If full = true then all pod information will be provided.
 * </odoc>
 */
Kube.prototype.getNames = function (aNamespace, full) {
	var h = new HTTP();
	if (isDef(this.user)) h.login(this.user, this.pass, undefined, this.url);

	var res = JSON.parse(h.exec(this.url + "/api/v1/pods").response);

	if (full) {
		return $from(res.items).equals("metadata.namespace", aNamespace).select();
	} else {
		return $from(res.items).equals("metadata.namespace", aNamespace).select(function (rr) {
			return rr.metadata.name;
		});
	}
};