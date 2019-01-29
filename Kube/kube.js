/**
 * <odoc>
 * <key>Kube.Kube(aURL, aUser, aPass)</key>
 * Creates an instance to access a kubernetes (k8s) cluster on aURL. If defined, using aUser and aPass.
 * </odoc>
 */
var Kube = function (aURL, aUser, aPass, aWSTimeout) {
	plugin("HTTP");
	ow.loadFormat();
	this.url = aURL; 
	this.user = aUser;
	this.pass = aPass;
	//loadExternalJars(getOPackPath("Kube") || ".");
	aWSTimeout = _$(aWSTimeout).isNumber().default(5000);
	loadExternalJars(".");
	this.config = (new Packages.io.fabric8.kubernetes.client.ConfigBuilder())
	              .withMasterUrl(this.url)
	              .withUsername(Packages.openaf.AFCmdBase.afc.dIP(this.user))
	              .withPassword(Packages.openaf.AFCmdBase.afc.dIP(this.pass))
				  .withTrustCerts(true)
				  .withWebsocketTimeout(aWSTimeout)
	              .build();
				  //.withOauthToken("eyJhbGciOiJSUzI1NiIsImtpZCI6IiJ9.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJrdWJlLXN5c3RlbSIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VjcmV0Lm5hbWUiOiJhZG1pbi11c2VyLXRva2VuLXI0bWI3Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQubmFtZSI6ImFkbWluLXVzZXIiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC51aWQiOiJhMTA5ZWM1MC0xZTVjLTExZTktYmRlMy0wYTFhZDM4ZmI2NjQiLCJzdWIiOiJzeXN0ZW06c2VydmljZWFjY291bnQ6a3ViZS1zeXN0ZW06YWRtaW4tdXNlciJ9.T71FTSAgIFNOfS0vGbFx4T-ZPwZEVZL1zmeQFN2XULY1NwDI8LqPVjqrUKC43qbEaXcSdZ7UmO2vMOx__3F__GqMqQAsxFaKZ5i_PtVNzAsjmzanhQWLPDtCVVuRxJuwo-OfmK_KxSM9TIu-03NGEzkG9H-wFDK3B1IZdNf6mNLDeyzYM-nJWzv6NVN_tJRZoGt4hhedulAV_KJZaN9UTAhFG10SfpekzWQfNYsn-xLvGBXitwloUNMzOtEnJoTGXmurHAX9f2-EZlAAyLUGadWe4EE-pCXEqyy3K2uJ912BQCbDD7Q1T58KMa2QHvP_28JHnzXB8g-ooYnle_zJ4")
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