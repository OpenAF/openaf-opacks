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

Kube.prototype.close = function() {
  	this.client.close();
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
Kube.prototype.getServices = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return this.__displayResult(this.client.inNamespace(aNamespace).services().list().items);
	} else {
		return (full ? this.__dR(this.client.services()) : this.__displayResult(this.client.services().list().items));
	}
};

/**
 * <odoc>
 * <key>Kube.getConfigMaps(aNamespace) : Array</key>
 * Tries to retrieve the list of config maps on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getConfigMaps = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return this.__displayResult(this.client.inNamespace(aNamespace).configMaps().list().items);
	} else {
		return (full ? this.__dR(this.client.configMaps()) : this.__displayResult(this.client.configMaps().list().items));
	}
};

/**
 * <odoc>
 * <key>Kube.getEndpoints(aNamespace) : Array</key>
 * Tries to retrieve the list of end points on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getEndpoints = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return this.__displayResult(this.client.inNamespace(aNamespace).endpoints().list().items);
	} else {
		return (full ? this.__dR(this.client.endpoints()) : this.__displayResult(this.client.endpoints().list().items));
	}
};

/**
 * <odoc>
 * <key>Kube.getNodes(aNamespace) : Array</key>
 * Tries to retrieve the list of nodes on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getNodes = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return this.__displayResult(this.client.inNamespace(aNamespace).nodes().list().items);
	} else {
		return (full ? this.__dR(this.client.nodes()) : this.__displayResult(this.client.nodes().list().items));
	}
};

/**
 * <odoc>
 * <key>Kube.getPods(aNamespace) : Array</key>
 * Tries to retrieve the list of pods on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getPods = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return this.__displayResult(this.client.inNamespace(aNamespace).pods().list().items);
	} else {
		return (full ? this.__dR(this.client.pods()) : this.__displayResult(this.client.pods().list().items));
	}
};

/**
 * <odoc>
 * <key>Kube.getJobs(aNamespace) : Array</key>
 * Tries to retrieve the list of jobs on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getJobs = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return this.__displayResult(this.client.inNamespace(aNamespace).batch().jobs().list().items);
	} else {
		return (full ? this.__dR(this.client.batch().jobs()) : this.__displayResult(this.client.batch().jobs().list().items));
	}
};

/**
 * <odoc>
 * <key>Kube.getServiceAccounts(aNamespace) : Array</key>
 * Tries to retrieve the list of service accounts on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getServiceAccounts = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return this.__displayResult(this.client.inNamespace(aNamespace).serviceAccounts().list().items);
	} else {
		return (full ? this.__dR(this.client.serviceAccounts()) : this.__displayResult(this.client.serviceAccounts().list().items));
	}
};

/**
 * <odoc>
 * <key>Kube.getServiceAccount(aNamespace, aServiceAccount) : Map</key>
 * Tries to retrieve the aServiceAccount on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getServiceAccount = function(aNamespace, aServiceAccount) {
	if (isDef(aNamespace)) {
		return this.__dR(this.client.inNamespace(aNamespace).serviceAccounts().withName(aServiceAccount));
	} else {
		return this.__dR(this.client.serviceAccounts().withName(aServiceAccount));
	}
}

Kube.prototype.getObj = function(aNamespace, anArrayOfObjs) {
	var o = this.client;
	if (isDef(aNamespace)) {
		o = o.inNamespace(aNamespace);
	} else {
		o = o.inAnyNamespace();
	}
	anArrayOfObjs.forEach(r => o = o[r]());
	return this.__dR(o);
}

Kube.prototype.getDeployments = function(aNamespace) {
	return this.getObj(aNamespace, ["apps", "deployments"]);
}

Kube.prototype.getStatefulSets = function(aNamespace) {
	return this.getObj(aNamespace, ["apps", "statefulSets"]);
}

Kube.prototype.getStatefulSets = function(aNamespace) {
	return this.getObj(aNamespace, ["apps", "replicaSets"]);
}

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
	return this.__displayResult(o2);
};

/**
 * <odoc>
 * <key>Kube.getObject(aNamespace, aKind, aName) : Map</key>
 * Given an object aKind and aName will try to retrieve the current object definition.
 * </odoc>
 */
Kube.prototype.getObject = function(aNamespace, aKind, aName) {
	_$(aNamespace, "namespace").isString().$_();
	_$(aKind, "kind").isString().$_();
    _$(aName, "name").isString().$_();

	return this.__displayResult(this.client.inNamespace(aNamespace).load(af.fromString2InputStream(stringify({
		kind: aKind,
		metadata: {
			name: aName
		}
	}))).fromServer().get());
};

/**
 * <odoc>
 * <key>Kube.getTemplate(aTemplateName, aMap) : Map</key>
 * Retrieves an existing aTemplateName (check list in Kube.templates) applying aMap to fill out the template.
 * </odoc>
 */
Kube.prototype.getTemplate = function(aTemplateName, aObjs) {
	var t = this.templates[aTemplateName];

	return jsonParse(templify(stringify(t), aObjs));
};

Kube.prototype.templates = {
	job: {
		kind: "Job",
		metadata: {
			name: "{{name}}",
			namespace: "{{namespace}}"
		},
		spec: {
			template: {
				spec: {
					containers: [
						{
							name: "{{name}}",
							image: "{{image}}"
						}
					],
					restartPolicy: "Never",
					imagePullSecrets: {
						name: "regcred"
					}
				}
			},
			backoffLimit: 4
		}
	},
	deployment: {
		kind: "Deployment",
		metadata: {
			labels: {
				app: "{{app}}"
			},
			name: "{{name}}",
			namespace: "{{namespace}}"
		},
		spec: {
			progressDeadlineSeconds: 600,
			replicas: 1,
			revisionHistoryLimit: 10,
			selector: {
				matchLabels: {
					app: "{{app}}"
				}
			},
			template: {
				metadata: {
					labels: {
						app: "{{app}}"
					}
				},
				spec: {
					containers: [
						{
							image: "{{image}}",
							imagePullPolicy: "Always",
							name: "{{name}}"
						}
					],
					imagePullSecrets: [
						"regcred"
					],
					dnsPolicy: "ClusterFirst",
					restartPolicy: "Always"
				}
			}
		}
	},
	serviceAccount: {
		kind: "ServiceAccount",
		metadata: {
			name: "{{name}}",
			namespace: "{{namespace}}"
		}
	},
	clusterAdminRole: {
		kind: "ClusterRoleBinding",
		metadata: {
			name: "{{roleName}}"
		},
		roleRef: {
			apiGroup: "rbac.authorization.k8s.io",
			kind: "ClusterRole",
			name: "cluster-admin"
		},
		subjects: [
			{
				kind: "ServiceAccount",
				name: "{{account}}",
				namespace: "{{namespace}}"
			}
		]
	}
};

Kube.prototype.__dR = function(aObj) {
	ow.loadObj();

	var r = {};
	var fn = (f1, p) => {
		p = _$(p).default("");
		if (isNull(f1)) return;
		var f0 = Object.keys(f1);

		for (var i in f0) {
			var f = f0[i]; var exc = ["getAdditionalProperties", "getClass", "getOrDefault", "get", "getRemainingItemCount", "getContinue"];
			if (f.startsWith("get") && exc.indexOf(f) < 0) {
				try {
					var rr = f1[f]();
					if (!isNull(rr) && isDef(rr.entrySet)) rr = rr.entrySet().toArray(); else rr = [rr];

					for (var ii in rr) {
						if (rr[ii] instanceof java.lang.String || rr[ii] instanceof java.lang.Integer) {
							ow.obj.setPath(r, p + "." + f.replace(/^get/, ""), (rr[ii] instanceof java.lang.Integer) ? Number(rr[ii]) : String(rr[ii]));
						} else {
							if (!isNull(rr[ii])) {
								fn(rr[ii], "." + f.replace(/^get/, ""));
							}
						}
					}
				} catch (e) {
					//printErr("error " + f + " | " + e);
				}
			} else if (f == "getAdditionalProperties") {
				r = merge(r, af.fromJavaMap(f1.getAdditionalProperties()));
			}
		}
	};

	try { fn(aObj.get())  } catch(e) {}
	try { fn(aObj.list()) } catch(e) {}
	try { fn(aObj) } catch(e) {}

	return r;
};

Kube.prototype.__displayResult = function(aObj) {
	var res = [], arr = aObj.toArray();
	ow.loadObj();

	for(var obj in arr) {
            try {
		var r = {};
		var o = arr[obj];

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
            } catch(e1) {
            }
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

Kube.prototype.getEvents = function(aNamespace) {
        aNamespace = _$(aNamespace, "namespace").default(__);

	if (isDef(aNamespace)) {
		var s = this.client.v1().events().inNamespace(aNamespace).list().getItems().stream();
                var r = this.__displayResult(s);
                s.close();
         	return r;
	} else {
		var s = this.client.v1().events().inAnyNamespace().list().getItems().stream();
		var r = this.__displayResult(s);
      		s.close();
		return r;
	}
};
