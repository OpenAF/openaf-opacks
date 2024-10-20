var $kube = function(aMap) {
	aMap = _$(aMap, "aMap").isMap().default({})

	var _r = {
		getObj: () => {
			return _r
		},
		ns   : aNS => {
			_r._ns = aNS
			return _r

		},
		execTimeout: aTimeout => {
			_r._to = aTimeout
			return _r
		},
		getNS: () => {
			var res = _r._k.getNamespaces(true)
			_r._k.close()
			return res
		},
		get  : (aKind, aName, aNS) => {
			aNS = _$(aNS, "aNS").isString().default(_r._ns)
			var res = _r._k.getObject(aNS, aKind, aName)
			_r._k.close()
			return res
		},
		apply: (aStream, aNS) => {
			aNS = _$(aNS, "aNS").isString().default(_r._ns)
			var res = _r._k.apply(aNS, aStream)
			_r._k.close()
			return res
		},
		delete: (aStream, aNS) => {
			aNS = _$(aNS, "aNS").isString().default(_r._ns)
			var res = _r._k.delete(aNS, aStream)
			_r._k.close()
			return res
		},
		scale: (aType, aName, aValue, aNS) => {
			aNS = _$(aNS, "aNS").isString().default(_r._ns)
			_r._k.scale(aNS, aType, aName, aValue)
			_r._k.close()
			return __
		},
		exec : (aPodName, aCmd, aTimeout, doSH, aContainer) => {
			aTimeout = _$(aTimeout, "timeout").isNumber().default(_r._to)
			var res = _r._k.exec(_r._ns, aPodName, aCmd, aTimeout, doSH, aContainer)
			_r._k.close()
			return res
		},
		events: aNS => {
			aNS = _$(aNS, "aNS").isString().default(_r._ns)
			var res = _r._k.getEvents(aNS)
			_r._k.close()
			return res
		},
		getPodsMetrics: aNS => {
			aNS = _$(aNS, "aNS").isString().default(_r._ns)
			var res = _r._k.getPodsMetrics(aNS)
			_r._k.close()
			return res
		},
		getNodesMetrics: () => {
			var res = _r._k.getNodesMetrics()
			_r._k.close()
			return res
		},
		getLog: (aNS, aPodName, aContainer, aStream) => {
			aNS = _$(aNS, "aNS").isString().default(_r._ns)
			var res = _r._k.getLog(aNS, aPodName, aContainer, aStream)
			_r._k.close()
			return res
		}
	};

	[ { ab: "STS",    fn: "getStatefulSets" },
	  { ab: "ClusterRoles", fn: "getClusterRoles" },
	  { ab: "ClusterRoleBindings", fn: "getClusterRoleBindings" },
	  { ab: "Roles",  fn: "getRoles"       },
	  { ab: "RoleBindings", fn: "getRoleBindings" },
	  { ab: "ING",    fn: "getIngresses"   },
	  { ab: "NetworkPolicies", fn: "getNetworkPolicies" },
	  { ab: "Quota",  fn: "getResourceQuotas" },
	  { ab: "StorageClasses", fn: "getStorageClasses" },
	  { ab: "SVC",    fn: "getServices"    },
	  { ab: "SA",     fn: "getServiceAccounts" },
	  { ab: "Secrets",fn: "getSecrets"     },
	  { ab: "RS",     fn: "getReplicaSets" },
	  { ab: "PVC",    fn: "getPersistentVolumeClaims" },
	  { ab: "PV",     fn: "getPersistentVolumes" },
	  { ab: "NO",     fn: "getNodes"       },
	  { ab: "PO",     fn: "getPods"        },
	  { ab: "CM",     fn: "getConfigMaps"  },
	  { ab: "Jobs",   fn: "getJobs"        },
	  { ab: "DS",     fn: "getDaemonSets"  },
	  { ab: "CJ",     fn: "getCronJobs"    },
	  { ab: "Deploy", fn: "getDeployments" },
	  { ab: "Version",fn: "getVersion"     },
	  { ab: "Node",   fn: "getNode"        },
	  { ab: "EP",     fn: "getEndpoints"   } ].forEach(m => {
		_r["get" + m.ab] = aNS => {
			aNS = _$(aNS, "aNS").isString().default(_r._ns)
			var res = _r._k[m.fn](aNS)
			_r._k.close()
			return res
		}
		_r["getF" + m.ab] = aNS => {
			aNS = _$(aNS, "aNS").isString().default(_r._ns)
			var res = _r._k[m.fn](aNS, true)
			_r._k.close()
			return res
		}
		_r[m.fn] = _r["get" + m.ab]
		_r[m.fn + "Full"] = _r["getF" + m.ab]
	})

	_r._k = new Kube(aMap.url, aMap.user, aMap.pass, aMap.wstimeout, aMap.token)
	_r._ns = "default"

	return _r
}

/**
 * <odoc>
 * <key>Kube.Kube(aURLorFile, aUser, aPass, aWSTimeout, aToken)</key>
 * Creates an instance to access a kubernetes (k8s) cluster on aURL or kubectl config file. If defined, using aUser and aPass or aToken.
 * </odoc>
 */
var Kube = function (aURLorFile, aUser, aPass, aWSTimeout, aToken) {
	plugin("HTTP");
	ow.loadFormat();
	this.url = aURLorFile; 
	this.user = aUser;
	this.pass = aPass;
	
	loadExternalJars(getOPackPath("Kube") || ".")
	if (isDef(getOPackPath("BouncyCastle"))) loadExternalJars(getOPackPath("BouncyCastle"))

	aWSTimeout = _$(aWSTimeout).isNumber().default(5000);
	
	if (isUnDef(aURLorFile)) {
		this.config = (new Packages.io.fabric8.kubernetes.client.ConfigBuilder()).build();
	} else {
		if (aURLorFile.toLowerCase().startsWith("http")) {
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
		} else {
			if (io.fileExists(aURLorFile)) {
				sync(() => {
					var oldValue = java.lang.System.getProperty("kubeconfig")
					java.lang.System.setProperty("kubeconfig", aURLorFile)
					this.config = (new Packages.io.fabric8.kubernetes.client.ConfigBuilder()).build()
					if (oldValue == null) 
						java.lang.System.clearProperty("kubeconfig")
					else
						java.lang.System.setProperty("kubeconfig", oldValue)
				})
			} else {
				throw "'" + aURLorFile + "' not found."
			}
		}
	}

	this.client = new Packages.io.fabric8.kubernetes.client.DefaultKubernetesClient(this.config);
};

Kube.prototype.close = function() {
  	this.client.close();
};

/**
 * <odoc>
 * <key>Kube.scale(aNamespace, aType, aName, aValue)</key>
 * Tries to scale aType (deploy, statefulset, daemonset, replicaset) on aNamespace with aName to aValue.
 * </odoc>
 */
Kube.prototype.scale = function(aNamespace, aType, aName, aValue) {
	var c = this.client.inNamespace(aNamespace)
	
	switch(aType.toLowerCase()) {
	case "deployment" :
	case "deploy"     :
		c = c.apps().deployments()
		break
	case "statefulset":
		c = c.apps().statefulSets()
		break
	case "daemonset"  :
		c = c.apps().daemonSets()
		break
	case "replicaset" :
		c = c.apps().replicaSets()
		break
	default	          :
		throw "Unknown type: " + aType
	}
	if (isDef(aName)) c = c.withName(aName)
	c.scale(aValue)
}

/**
 * <odoc>
 * <key>Kube.scaleWithDeps(aNamespace, anArrayScaleWithDeps, scaleDown, aTimeout, aScanWait) : Number</key>
 * Tries to scale a set of deployments and/or statefulsets on aNamespace based on the provided anArrayScaleWithDeps. Each element of the array should be a map with the following
 * structure: { ns: "namespace", t: "deploy", n: "name", r: replicas, id: "id", d: [ "id1", "id2" ] }. If scaleDown is true it will scale down instead of up. The aTimeout
 * defines the maximum time to wait for all dependencies to be met and the aScanWait defines the time to wait between scans. Returns the number of elements that were scaled.
 * </odoc>
 */
Kube.prototype.scaleWithDeps = function(aNamespace, anArrayScaleWithDeps, scaleDown, aTimeout, aScanWait) {
	aNamespace = _$(aNamespace, "aNamespace").isString().default("default")
	aScaleDown = _$(scaleDown, "scaleDown").isBoolean().default(false)
	aTimeout   = _$(aTimeout, "aTimeout").isNumber().default(1000 * 60 * 30) // 30 minutes default
	aScanWait  = _$(aScanWait, "aScanWait").isNumber().default(1000 * 1) // 1 second default

	// Check array and assign defaults
	anArrayScaleWithDeps.forEach(_s => {
		// If string assign a default map
		if (isString(_s)) _s = { ns: aNamespace, t: "deploy", n: _s, id: aNamespace + "::" + _s }
		// If entry is a valid map
		if (isMap(_s)) {
			// Check types and assign defaults
			_s.ns = _$(_s.ns, "ns").isString().default(aNamespace)
			_s.t  = _$(_s.t, "t").isString().default("deploy")
			_s.r  = _$(_s.r, "r").isNumber().default(1)
			_$(_s.n, "n").isString().$_()
			_s.id = _$(_s.id, "id").isString().default(_s.ns + "::" + _s.n)
			if (isString(_s.d)) _s.d = [ _s.d ]
			_s.d = _$(_s.d, "d").isArray().default([])
			_s.d = _s.d.map(_d => {
				if (isString(_d) && _d.indexOf("::") < 0) _d = aNamespace + "::" + _d
				return _d
			})
		}
	})

	// Scan function to determine current state
	var _scan = () => {
		var _n = {}, res = {}
		// Scan each element of the array to determine if it's ready or not
		anArrayScaleWithDeps.forEach(_s => {
			// For the given namespace if there isn't a list of deployments and statefulsets, get them
			if (isUnDef(_n[_s.ns])) _n[_s.ns] = this.getDeployments(_s.ns).concat(this.getStatefulSets(_s.ns))

			// Find the element on the list
			var kind = (_s.t == "deploy") ? "Deployment" : "StatefulSet"
			var _elem = $from(_n[_s.ns]).equals("Metadata.Name", _s.n).equals("Kind", kind).at(0)
			if (isDef(_elem)) {
				// If found and replicas are greater than 0 and ready replicas are greater than 0, mark as ready
				if (isDef(_elem.Status)) {
					if (_elem.Status.Replicas > 0 && _elem.Status.ReadyReplicas > 0)
						res[_s.id] = true
					else
						res[_s.id] = false
				} else {
					res[_s.id] = false
				}
			} else {
				res[_s.id] = false
			}
		})
		return res
	}

	// Scale function to scale the elements when dependencies are met
	var _scale = (scanResult) => {
		anArrayScaleWithDeps.forEach(_s => {
			if (isString(_s.d)) _s.d = [ _s.d ]
			if (isArray(_s.d)) {
				var shouldScale = true
				_s.d.forEach(_d => {
					if (scaleDown && isDef(scanResult[_d]) && scanResult[_d] == true) shouldScale = false
					if (!scaleDown && isDef(scanResult[_d]) && scanResult[_d] == false) shouldScale = false
				})
				if (shouldScale) this.scale(_s.ns, _s.t, _s.n, scaleDown ? 0 : _s.r)
			}
		})
	}

	// Main loop
	var init = now(), scanResult = _scan(), done = false
	do {
		_scale(scanResult)
		scanResult = _scan()
		if ($from(scanResult).equals(scaleDown).count() == 0) done = true
		if (!done) sleep(aScanWait, true)
	} while(!done && (now() - init) < aTimeout)

	return scanResult
}

/**
 * <odoc>
 * <key>Kube.exec(aNamespace, aPodName, aCommand, aTimeout, doSH, aContainer) : String</key>
 * Tries to executed aCommand on aPodName of aNamespace. If defined, it will wait for the defined aTimeout and/or execute the aCommand on a /bin/sh if doSH = true.
 * aCommand can be either a string or an array. Do note that it might be necessary to URL encode some parts of commands.
 * </odoc>
 */
Kube.prototype.exec = function (aNamespace, aPod, aCommand, aTimeout, doSH, aContainer) {
	var stream = new java.io.ByteArrayOutputStream();

	var pre = (doSH) ? ["/bin/sh", "-c"] : [];
	if (!isArray(aCommand)) aCommand = aCommand.split(/ +/);
	pre = pre.concat(aCommand);
	var cmd = newJavaArray(java.lang.String, pre.length);
	for(var ii in pre) { cmd[ii] = new java.lang.String(pre[ii]); }

	var error, gI = genUUID()
	aw = $await(gI)
	var watch = this.client.pods()
				.inNamespace(aNamespace)
				.withName(aPod)
				.writingOutput(stream)
				.writingError(stream)

	if (isDef(aContainer)) watch = watch.inContainer(aContainer)

		watch = watch
				.usingListener({
					onOpen   : () =>     { },
					onFailure: (t,fR) => { error = t; aw.notify() },
					onClose  : (i,s) =>  { aw.notify() } 
				})
				.exec(cmd)
	aw.wait(aTimeout)
	if (isDef(error)) throw error
	//watch.waitUntilReady();

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
		return (full ? this.__dR(this.client.inNamespace(aNamespace).services()) : this.__displayResult(this.client.inNamespace(aNamespace).services().list().items));
	} else {
		return (full ? this.__dR(this.client.services()) : this.__displayResult(this.client.services().list().items));
	}
};

/**
 * <odoc>
 * <key>Kube.getClusterRoles(aNamespace) : Array</key>
 * Tries to retrieve the list of cluster roles on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getClusterRoles = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return (full ? this.__dR(this.client.inNamespace(aNamespace).rbac().clusterRoles()) : this.__displayResult(this.client.inNamespace(aNamespace).rbac().clusterRoles().list().items))
	} else {
		return (full ? this.__dR(this.client.rbac().clusterRoles()) : this.__displayResult(this.client.rbac().clusterRoles().list().items))
	}
}

/**
 * <odoc>
 * <key>Kube.getClusterRoleBindings(aNamespace) : Array</key>
 * Tries to retrieve the list of cluster role bindings on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getClusterRoleBindings = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return (full ? this.__dR(this.client.inNamespace(aNamespace).rbac().clusterRoleBindings()) : this.__displayResult(this.client.inNamespace(aNamespace).rbac().clusterRoleBindings().list().items))
	} else {
		return (full ? this.__dR(this.client.rbac().clusterRoleBindings()) : this.__displayResult(this.client.rbac().clusterRoleBindings().list().items))
	}
}

/**
 * <odoc>
 * <key>Kube.getConfig() : Map</key>
 * Retrieves the current client configuration
 * </odoc>
 */
Kube.prototype.getConfig = function() {
	return this.__dR(this.client.configuration)
}

/**
 * <odoc>
 * <key>Kube.getContext() : String</key>
 * Returns the current configured context
 * </odoc>
 */
Kube.prototype.getContext = function() {
	return this.__dR(this.client.configuration.getCurrentContext())
}

/**
 * <odoc>
 * <key>Kube.setContext(aContext)</key>
 * Reconfigures the client to use the provided aContext
 * </odoc>
 */
Kube.prototype.setContext = function(aContext) {
	_$(aContext, "aContext").isString().$_()
	this.config = (new Packages.io.fabric8.kubernetes.client.Config.autoConfigure(aContext))
	this.client = new Packages.io.fabric8.kubernetes.client.DefaultKubernetesClient(this.config);
}

/**
 * <odoc>
 * <key>Kube.getRoles(aNamespace) : Array</key>
 * Tries to retrieve the list of roles on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
 Kube.prototype.getRoles = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return (full ? this.__dR(this.client.inNamespace(aNamespace).rbac().roles()) : this.__displayResult(this.client.inNamespace(aNamespace).rbac().roles().list().items))
	} else {
		return (full ? this.__dR(this.client.rbac().roles()) : this.__displayResult(this.client.rbac().roles().list().items))
	}
}

/**
 * <odoc>
 * <key>Kube.getRoleBindings(aNamespace) : Array</key>
 * Tries to retrieve the list of role bindings on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getRoleBindings = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return (full ? this.__dR(this.client.inNamespace(aNamespace).rbac().roleBindings()) : this.__displayResult(this.client.inNamespace(aNamespace).rbac().roleBindings().list().items))
	} else {
		return (full ? this.__dR(this.client.rbac().roleBindings()) : this.__displayResult(this.client.rbac().roleBindings().list().items))
	}
}

/**
 * <odoc>
 * <key>Kube.getIngresses(aNamespace) : Array</key>
 * Tries to retrieve the list of ingresses on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getIngresses = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return (full ? this.__dR(this.client.inNamespace(aNamespace).network().ingresses()) : this.__displayResult(this.client.inNamespace(aNamespace).network().ingresses().list().items))
	} else {
		return (full ? this.__dR(this.client.network().ingresses()) : this.__displayResult(this.client.network().ingresses().list().items))
	}
}

/**
 * <odoc>
 * <key>Kube.getNetworkPolicies(aNamespace) : Array</key>
 * Tries to retrieve the list of network policies on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getNetworkPolicies = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return (full ? this.__dR(this.client.inNamespace(aNamespace).network().networkPolicies()) : this.__displayResult(this.client.inNamespace(aNamespace).network().networkPolicies().list().items))
	} else {
		return (full ? this.__dR(this.client.network().networkPolicies()) : this.__displayResult(this.client.network().networkPolicies().list().items))
	}
}

/**
 * <odoc>
 * <key>Kube.getResourceQuotas(aNamespace) : Array</key>
 * Tries to retrieve the list of resource quotas on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getResourceQuotas = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return (full ? this.__dR(this.client.inNamespace(aNamespace).resourceQuotas()) : this.__displayResult(this.client.inNamespace(aNamespace).resourceQuotas().list().items))
	} else {
		return (full ? this.__dR(this.client.resourceQuotas()) : this.__displayResult(this.client.resourceQuotas().list().items))
	}
}

/**
 * <odoc>
 * <key>Kube.getStorageClasses(aNamespace) : Array</key>
 * Tries to retrieve the list of storage classes on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getStorageClasses = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return (full ? this.__dR(this.client.inNamespace(aNamespace).storageClasses()) : this.__displayResult(this.client.inNamespace(aNamespace).storageClasses().list().items))
	} else {
		return (full ? this.__dR(this.client.storageClasses()) : this.__displayResult(this.client.storageClasses().list().items))
	}
}

/**
 * <odoc>
 * <key>Kube.getConfigMaps(aNamespace) : Array</key>
 * Tries to retrieve the list of config maps on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getConfigMaps = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return (full ? this.__dR(this.client.inNamespace(aNamespace).configMaps()) : this.__displayResult(this.client.inNamespace(aNamespace).configMaps().list().items));
	} else {
		return (full ? this.__dR(this.client.configMaps()) : this.__displayResult(this.client.configMaps().list().items));
	}
};

/**
 * <odoc>
 * <key>Kube.getSecrets(aNamespace) : Array</key>
 * Tries to retrieve the list of secrets on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getSecrets = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return (full ? this.__dR(this.client.inNamespace(aNamespace).secrets()) : this.__displayResult(this.client.inNamespace(aNamespace).secrets().list().items));
	} else {
		return (full ? this.__dR(this.client.secrets()) : this.__displayResult(this.client.secrets().list().items));
	}
}

/**
 * <odoc>
 * <key>Kube.getDeployments(aNamespace) : Array</key>
 * Tries to retrieve the list of deployments on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getDeployments = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return (full ? this.__dR(this.client.inNamespace(aNamespace).apps().deployments()) : this.__displayResult(this.client.inNamespace(aNamespace).apps().deployments().list().items));
	} else {
		return (full ? this.__dR(this.client.apps().deployments()) : this.__displayResult(this.client.apps().deployments().list().items));
	}
}

/**
 * <odoc>
 * <key>Kube.getDaemonSets(aNamespace) : Array</key>
 * Tries to retrieve the list of daemon sets on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getDaemonSets = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return (full ? this.__dR(this.client.inNamespace(aNamespace).apps().daemonSets()) : this.__displayResult(this.client.inNamespace(aNamespace).apps().daemonSets().list().items));
	} else {
		return (full ? this.__dR(this.client.apps().daemonSets()) : this.__displayResult(this.client.apps().daemonSets().list().items));
	}
}

/**
 * <odoc>
 * <key>Kube.getReplicaSets(aNamespace) : Array</key>
 * Tries to retrieve the list of daemon sets on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getReplicaSets = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return (full ? this.__dR(this.client.inNamespace(aNamespace).apps().replicaSets()) : this.__displayResult(this.client.inNamespace(aNamespace).apps().replicaSets().list().items));
	} else {
		return (full ? this.__dR(this.client.apps().replicaSets()) : this.__displayResult(this.client.apps().replicaSets().list().items));
	}
}

/**
 * <odoc>
 * <key>Kube.getStatefulSets(aNamespace) : Array</key>
 * Tries to retrieve the list of stateful sets on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getStatefulSets = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return (full ? this.__dR(this.client.inNamespace(aNamespace).apps().statefulSets()) : this.__displayResult(this.client.inNamespace(aNamespace).apps().statefulSets().list().items));
	} else {
		return (full ? this.__dR(this.client.apps().statefulSets()) : this.__displayResult(this.client.apps().statefulSets().list().items));
	}
}

/**
 * <odoc>
 * <key>Kube.getPersistentVolumes(aNamespace) : Array</key>
 * Tries to retrieve the list of persistent volumes on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getPersistentVolumes = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return (full ? this.__dR(this.client.inNamespace(aNamespace).persistentVolumes()) : this.__displayResult(this.client.inNamespace(aNamespace).persistentVolumes().list().items))
	} else {
		return (full ? this.__dR(this.client.persistentVolumes()) : this.__displayResult(this.client.persistentVolumes().list().items))
	}
}

/**
 * <odoc>
 * <key>Kube.getPersistentVolumeClaims(aNamespace) : Array</key>
 * Tries to retrieve the list of persistent volume claims on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getPersistentVolumeClaims = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return (full ? this.__dR(this.client.inNamespace(aNamespace).persistentVolumeClaims()) : this.__displayResult(this.client.inNamespace(aNamespace).persistentVolumeClaims().list().items))
	} else {
		return (full ? this.__dR(this.client.persistentVolumeClaims()) : this.__displayResult(this.client.persistentVolumeClaims().list().items))
	}
}

/**
 * <odoc>
 * <key>Kube.getEndpoints(aNamespace) : Array</key>
 * Tries to retrieve the list of end points on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getEndpoints = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return (full ? this.__dR(this.client.inNamespace(aNamespace).endpoints()) : this.__displayResult(this.client.inNamespace(aNamespace).endpoints().list().items));
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
		return (full ? this.__dR(this.client.inNamespace(aNamespace).nodes()) : this.__displayResult(this.client.inNamespace(aNamespace).nodes().list().items));
	} else {
		return (full ? this.__dR(this.client.nodes()) : this.__displayResult(this.client.nodes().list().items));
	}
};

Kube.prototype.getNode = function(aNodeName) {
	return this.__dR(this.client.nodes().withName(aNodeName))
}

/**
 * <odoc>
 * <key>Kube.getPods(aNamespace) : Array</key>
 * Tries to retrieve the list of pods on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getPods = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return (full ? this.__dR(this.client.inNamespace(aNamespace).pods()) : this.__displayResult(this.client.inNamespace(aNamespace).pods().list().items));
	} else {
		return (full ? this.__dR(this.client.pods()) : this.__displayResult(this.client.pods().list().items));
	}
};

/**
 * <odoc>
 * <key>Kube.getLog(aNamespace, aPodName, aContainer, aStream) : LogWatchCallback</key>
 * Tries to retrieve the log of aPodName on aNamespace. Optionally you can provide aContainer and aStream (a java stream).
 * If aStream is provided it will return a LogWatchCallback and aStream will be updated with the log until LogWatchCallback.close
 * is called. If aStream is not provided it will return the log as a string.
 * </odoc>
 */
Kube.prototype.getLog = function(aNamespace, aPodName, aContainer, aStream) {
	if (isDef(aNamespace)) {
		var _c = this.client.inNamespace(aNamespace).pods().withName(aPodName)
		if (isDef(aContainer)) _c = _c.inContainer(aContainer)
		if (isDef(aStream)) {
			return _c.watchLog(aStream)
		} else {
			return String(_c.getLog())
		}
	} else {
		var _c = this.client.pods().withName(aPodName).inContainer(aContainer)
		if (isDef(aContainer)) _c = _c.inContainer(aContainer)
		if (isDef(aStream)) {
			return _c.watchLog(aStream)
		} else {
			return String(_c.getLog())
		}
	}
}

/**
 * <odoc>
 * <key>Kube.getNodeMetrics(aNode) : Map</key>
 * Tries to retrieve metrics for a specific aNode using a direct API call (might require access to node stats and for a Kube metrics server to be installed in the cluster).
 * </odoc>
 */
Kube.prototype.getNodeMetrics = function(aNode) {
    return jsonParse(this.client.raw(this.client.getMasterUrl() + "api/v1/nodes/" + aNode + "/proxy/stats/summary"), true)
}

/**
 * <odoc>
 * <key>Kube.getNodesMetrics() : Array</key>
 * Tries to retrieve metrics for all nodes on the current k8s cluster
 * </odoc>
 */
Kube.prototype.getNodesMetrics = function() {
	return this.__dR(this.client.top().nodes().metrics().getItems())
}

/**
 * <odoc>
 * <key>Kube.getPodsMetrics(aNamespace) : Array</key>
 * Tries to retrieve metrics for all pods optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getPodsMetrics = function(aNamespace) {
	if (isDef(aNamespace)) {
		return this.__dR(this.client.top().pods().inNamespace(aNamespace).metrics().getItems())
	} else {
		return this.__dR(this.client.top().pods().metrics().getItems())
	}
}

/**
 * <odoc>
 * <key>Kube.getJobs(aNamespace) : Array</key>
 * Tries to retrieve the list of jobs on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getJobs = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return (full ? this.__dR(this.client.inNamespace(aNamespace).batch().jobs()) : this.__displayResult(this.client.inNamespace(aNamespace).batch().jobs().list().items));
	} else {
		return (full ? this.__dR(this.client.batch().jobs()) : this.__displayResult(this.client.batch().jobs().list().items));
	}
};

/**
 * <odoc>
 * <key>Kube.getCronJobs(aNamespace) : Array</key>
 * Tries to retrieve the list of cron jobs on the current k8s cluster optionally filtering by the provided aNamespace.
 * </odoc>
 */
Kube.prototype.getCronJobs = function(aNamespace, full) {
	if (isDef(aNamespace)) {
		return (full ? this.__dR(this.client.batch().cronjobs().inNamespace(aNamespace)) : this.__displayResult(this.client.batch().cronjobs().inNamespace(aNamespace).list().items));
	} else {
		return (full ? this.__dR(this.client.batch().cronjobs()) : this.__displayResult(this.client.batch().cronjobs().list().items));
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
		return (full ? this.__dR(this.client.inNamespace(aNamespace).serviceAccounts()) : this.__displayResult(this.client.inNamespace(aNamespace).serviceAccounts().list().items));
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
	var o2 = this.client.inNamespace(aNamespace).load(aStream).createOrReplace()
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
 * <key>Kube.getObject(aNamespace, aKind, aName, aVersion) : Map</key>
 * Given an object aKind and aName will try to retrieve the current object definition.
 * </odoc>
 */
Kube.prototype.getObject = function(aNamespace, aKind, aName, aVersion) {
	_$(aNamespace, "namespace").isString().$_()
	_$(aKind, "kind").isString().$_()
    _$(aName, "name").isString().$_()
	aVersion = _$(aVersion, "version").isString().default("v1")

	return this.__displayResult(this.client.inNamespace(aNamespace).load(af.fromString2InputStream(stringify({
		apiVersion: aVersion,
		kind: aKind,
		metadata: {
			name: aName
		}
	}))).fromServer().get())
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
			var f = f0[i]; var exc = ["getConstructor", "getSuperclass", "getAnnotatedSuperclass", "getProtectedDomain", "getClassLoader", "getUnnamedModule", "getNestHost", "getGenericSuperclass", "getDeclaredConstructor", "getDeclaringClass", "getAdditionalProperties", "getClass", "getOrDefault", "get", "getRemainingItemCount", "getContinue", "getModule", "getUnits", "getFinalizers", "getOwnerReferences", "getManagedFields"];
			if (f.startsWith("get") && exc.indexOf(f) < 0) {
				try {
					var rr = f1[f]();
					var _isA = false

					var _suffix = f.replace(/^get/, "")
					_suffix = _suffix.charAt(0).toLowerCase() + _suffix.slice(1)
					var _path = p + (p == "" ? "" : ".") + _suffix
					if (_path.endsWith(_suffix + "." + _suffix)) return

					if (!isNull(rr) && isDef(rr.entrySet)) {
						rr = rr.entrySet().toArray()
						if (rr.length > 0) {
							_isA = true
							ow.obj.setPath(r, _path, [])
						}
					} else {
						if (!isNull(rr) && isDef(rr.toArray) && !(rr instanceof java.util.ImmutableCollections)) {
							rr = af.fromJavaArray(rr.toArray())
							if (rr.length > 0) {
								_isA = true
								ow.obj.setPath(r, _path, [])
							}
						} else {
							rr = [rr]
						}
					}

					for (var ii in rr) {
						if (rr[ii] instanceof java.lang.String || rr[ii] instanceof java.lang.Integer) {
							ow.obj.setPath(r, _path, (rr[ii] instanceof java.lang.Integer) ? Number(rr[ii]) : String(rr[ii]));
						} else {
							if (!isNull(rr[ii])) {
								if (_isA)
									fn(rr[ii], _path + "[" + ii + "]")
								else
									fn(rr[ii], _path)
							}
						}
					}
				} catch (e) {
					//printErr("error " + f + " | " + e);
				}
			}
			if (f == "getAdditionalProperties") {
				r = merge(r, af.fromJavaMap(f1.getAdditionalProperties()));
			}
		}
	};

	try { if (isDef(aObj.get))  fn(aObj.get())  } catch(e) {}
	try { if (isDef(aObj.list)) fn(aObj.list()) } catch(e) {}
	if (aObj instanceof java.util.List) {
		var res = []
		for (idx in aObj) {
			r = {}
			fn(aObj[idx])
			res.push(r)
		}
		return res
	} else {
		if (Object.keys(r).length == 0) fn(aObj)
	}

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

Kube.prototype.getVersion = function() {
	return this.__dR(this.client.getKubernetesVersion())
}

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
