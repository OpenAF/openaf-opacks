/**
 * <odoc>
 * <key>Kube.Kube(aURL, aUser, aPass, aWSTimeout, aToken)</key>
 * Creates an instance to access a kubernetes (k8s) cluster on aURL. If defined, using aUser and aPass or aToken.
 * </odoc>
 */
var Kube = function (aURL, aUser, aPass, aWSTimeout, aToken) {
	plugin("HTTP");
	ow.loadFormat();
	this.url = aURL; 
	this.user = aUser;
	this.pass = aPass;
	
	loadExternalJars(getOPackPath("Kube") || ".");
	aWSTimeout = _$(aWSTimeout).isNumber().default(5000);
	
	if (isUnDef(aURL)) {
		this.config = (new Packages.io.fabric8.kubernetes.client.ConfigBuilder()).build();
	} else {
		if (isDef(aToken)) {
			this.config = (new Packages.io.fabric8.kubernetes.client.ConfigBuilder())
			.withMasterUrl(this.url)
			.withTrustCerts(true)
			.withWebsocketTimeout(aWSTimeout)
			.withOauthToken(aToken)
			.build();
		} else {
			this.config = (new Packages.io.fabric8.kubernetes.client.ConfigBuilder())
			.withMasterUrl(this.url)
			.withUsername(Packages.openaf.AFCmdBase.afc.dIP(this.user))
			.withPassword(Packages.openaf.AFCmdBase.afc.dIP(this.pass))
			.withTrustCerts(true)
			.withWebsocketTimeout(aWSTimeout)
			.build();
		}
	}

	this.client = new Packages.io.fabric8.kubernetes.client.DefaultKubernetesClient(this.config);
};

/**
 * <odoc>
 * <key>Kube.exec(aNamespace, aPodName, aCommand, aTimeout, doSH) : String</key>
 * Tries to executed aCommand on aPodName of aNamespace. If defined, it will wait for the defined aTimeout and/or execute the aCommand on a /bin/sh if doSH = true.
 * aCommand can be either a string or an array. Do note that it might be necessary to URL encode some parts of commands.
 * </odoc>
 */
Kube.prototype.exec = function (aNamespace, aPod, aCommand, aTimeout, doSH) {
	var stream = new java.io.ByteArrayOutputStream();

	var pre = (doSH) ? ["/bin/sh", "-c"] : [];
	if (!isArray(aCommand)) aCommand = aCommand.split(/ +/);
	pre = pre.concat(aCommand);
	var cmd = newJavaArray(java.lang.String, pre.length);
	for(var ii in pre) { cmd[ii] = new java.lang.String(pre[ii]); }

	var watch = this.client.pods()
				.inNamespace(aNamespace)
				.withName(aPod)
				.writingOutput(stream)
				.writingError(stream)
				.exec(cmd);
	watch.waitUntilReady();

	stream.flush();
	var res = stream.toString();
	stream.close();
    watch.close();
	
	return res;
	/*var h = new HTTP();
	if (isDef(this.user)) h.login(this.user, this.pass, undefined, this.url.replace(/^http/i, "ws"));

	var pre = (doSH) ? "command=/bin/sh&command=-c&" : "";
	if (!isArray(aCommand)) aCommand = aCommand.split(/ +/);
	var cmd = pre + "stdout=true&stderr=true&command=" + aCommand.join("&command=");
	var session;
	var out = "";

	var res = h.wsClient(this.url.replace(/^http/i, "ws") + "/api/v1/namespaces/" + aNamespace + "/pods/" + aPod + "/exec?" + encodeURI(cmd).replace(/\+/g, "%2B"),
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
		res.fut.get();
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
	session.close();
	session.stop();
	res.client.stop();
	return out;*/
};

/**
 * <odoc>
 * <key>Kube.getNamespaces(full) : Array</key>
 * Tries to retrieve the list of namespaces on the current k8s cluster. If full = true then all namespace information will be provided.
 * </odoc>
 */
Kube.prototype.getNamespaces = function (full) {
	if (full) {
		return this.__displayResult(this.client.namespaces().list().items);
	} else {
		var h = new HTTP();
		if (isDef(this.user)) h.login(this.user, this.pass, undefined, this.url);
	
		var res = JSON.parse(h.exec(this.url + "/api/v1/pods").response);

		return Object.keys($stream(clone(res.items)).groupBy("metadata.namespace"));
	}
};

/**
 * <odoc>
 * <key>Kube.getServices(aNamespace) : Array</key>
 * Tries to retrieve the list of services on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getServices = function(aNamespace) {
	if (isDef(aNamespace)) {
		return this.__displayResult(this.client.inNamespace(aNamespace).services().list().items);
	} else {
		return this.__displayResult(this.client.services().list().items);
	}
};

/**
 * <odoc>
 * <key>Kube.getConfigMaps(aNamespace) : Array</key>
 * Tries to retrieve the list of config maps on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getConfigMaps = function(aNamespace) {
	if (isDef(aNamespace)) {
		return this.__displayResult(this.client.inNamespace(aNamespace).configMaps().list().items);
	} else {
		return this.__displayResult(this.client.configMaps().list().items);
	}
};

/**
 * <odoc>
 * <key>Kube.getEndpoints(aNamespace) : Array</key>
 * Tries to retrieve the list of end points on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getEndpoints = function(aNamespace) {
	if (isDef(aNamespace)) {
		return this.__displayResult(this.client.inNamespace(aNamespace).endpoints().list().items);
	} else {
		return this.__displayResult(this.client.endpoints().list().items);
	}
};

/**
 * <odoc>
 * <key>Kube.getNodes(aNamespace) : Array</key>
 * Tries to retrieve the list of nodes on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getNodes = function(aNamespace) {
	if (isDef(aNamespace)) {
		return this.__displayResult(this.client.inNamespace(aNamespace).nodes().list().items);
	} else {
		return this.__displayResult(this.client.nodes().list().items);
	}
};

/**
 * <odoc>
 * <key>Kube.getPods(aNamespace) : Array</key>
 * Tries to retrieve the list of pods on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getPods = function(aNamespace) {
	if (isDef(aNamespace)) {
		return this.__displayResult(this.client.inNamespace(aNamespace).pods().list().items);
	} else {
		return this.__displayResult(this.client.pods().list().items);
	}
};

/**
 * <odoc>
 * <key>Kube.getServiceAccounts(aNamespace) : Array</key>
 * Tries to retrieve the list of service accounts on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getServiceAccounts = function(aNamespace) {
	if (isDef(aNamespace)) {
		return this.__displayResult(this.client.inNamespace(aNamespace).serviceAccounts().list().items);
	} else {
		return this.__displayResult(this.client.serviceAccounts().list().items);
	}
};

/**
 * <odoc>
 * <key>Kube.apply(aNamespace, aObj) : Map</key>
 * Given aObj (a java stream (in yaml or json), a string (as the filename of a yaml or json file) or an object) will try to apply
 * it on the provided aNamespace.
 * </odoc>
 */
Kube.prototype.apply = function(aNamespace, aStream) {
	_$(aNamespace, "namespace").isString().$_();
	if (isString(aStream)) aStream = io.readFileStream(aStream);
	if (isMap(aStream)) aStream = af.fromString2InputStream(stringify(aStream));
	var o2 = this.client.inNamespace(aNamespace).load(aStream).apply();
	global.o2 = o2;
	return this.__displayResult(o2);
};

/**
 * <odoc>
 * <key>Kube.delete(aNamespace, aObj) : Boolean</key>
 * Given aObj (a java stream (in yaml or json), a string (as the filename of a yaml or json file) or an object) will try to delete
 * it of the provided aNamespace.
 * </odoc>
 */
Kube.prototype.delete = function(aNamespace, aStream) {
	_$(aNamespace, "namespace").isString().$_();
	if (isString(aStream)) aStream = io.readFileStream(aStream);
	if (isMap(aStream)) aStream = af.fromString2InputStream(stringify(aStream));
	return Boolean(this.client.inNamespace(aNamespace).load(aStream).delete());
};

/**
 * <odoc>
 * <key>Kube.get(aNamespace, aObj) : Map</key>
 * Given aObj (a java stream (in yaml or json), a string (as the filename of a yaml or json file) or an object) will try to get
 * it from the provided aNamespace.
 * </odoc>
 */
Kube.prototype.get = function(aNamespace, aStream) {
	_$(aNamespace, "namespace").isString().$_();
	if (isString(aStream)) aStream = io.readFileStream(aStream);
	if (isMap(aStream)) aStream = af.fromString2InputStream(stringify(aStream));
	var o2 = this.client.inNamespace(aNamespace).load(aStream).fromServer().get();
	global.o2 = o2;
	return this.__displayResult(o2);
};

Kube.prototype.__displayResult = function(aObj) {
	var res = [];
	ow.loadObj();

	for(var obj in aObj.toArray()) {
		var r = {};
		var o = aObj.toArray()[obj];

		var fn = (f1, p) => {
			p = _$(p).default("");
			var f0 = Object.keys(f1);

			for(var i in f0) {
				var f = f0[i];
				if (f.startsWith("get") && f != "getClass" && f != "getApiVersion" && f != "get" && f != "getOrDefault") {
					try {
						var rr = f1[f]();
						if (isDef(rr.entrySet)) rr = rr.entrySet().toArray(); else rr = [ rr ];

						for(var ii in rr) {
							if (rr[ii] instanceof java.lang.String || rr[ii] instanceof java.lang.Integer) {
								ow.obj.setPath(r, p + "." + f.replace(/^get/, ""), (rr[ii] instanceof java.lang.Integer) ? Number(rr[ii]) : String(rr[ii]));
							} else {
								if (!isNull(rr[ii])) {
									fn(rr[ii], "." + f.replace(/^get/, ""));
								}
							}
						}
					} catch(e) {
						//printErr(f);
					}
				}
			}
		};

		fn(o);

		/*if (o.getMetadata().getLabels() != null && !o.getMetadata().getLabels().isEmpty()) {
			r.labels = {};
			var o2 = o.getMetadata().getLabels().entrySet();
			for(var e in o2.toArray()) {
				var oo = o2.toArray()[e];
				r.labels[String(oo.getKey())] = String(oo.getValue());
			}
		}*/

		res.push(r);
	}

	return res;
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