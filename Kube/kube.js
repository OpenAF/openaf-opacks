var $kube = function(aMap) {
	aMap = _$(aMap, "aMap").isMap().default({})

	var _r = {
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
	
	loadExternalJars(getOPackPath("Kube") || ".")
	if (isDef(getOPackPath("BouncyCastle"))) loadExternalJars(getOPackPath("BouncyCastle"))

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
			var f = f0[i]; var exc = ["getAdditionalProperties", "getClass", "getOrDefault", "get", "getRemainingItemCount", "getContinue", "getModule", "getUnits", "getFinalizers", "getOwnerReferences", "getManagedFields"];
			if (f.startsWith("get") && exc.indexOf(f) < 0) {
				try {
					var rr = f1[f]();
					if (!isNull(rr) && isDef(rr.entrySet)) {
						rr = rr.entrySet().toArray()
					} else {
						if (!isNull(rr) && isDef(rr.toArray) && !(rr instanceof java.util.ImmutableCollections)) {
							rr = af.fromJavaArray(rr.toArray())
						} else {
							rr = [rr]
						}
					}

					for (var ii in rr) {
						if (rr[ii] instanceof java.lang.String || rr[ii] instanceof java.lang.Integer) {
							ow.obj.setPath(r, p + "." + f.replace(/^get/, ""), (rr[ii] instanceof java.lang.Integer) ? Number(rr[ii]) : String(rr[ii]));
						} else {
							if (!isNull(rr[ii])) {
								fn(rr[ii], p + "." + f.replace(/^get/, "") + "[" + ii + "]");
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
			var f0 = Object.keys(f1); 
				var f0 = Object.keys(f1); 

				for(var i in f0) {
					var f = f0[i]; 
				var f = f0[i]; 
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
