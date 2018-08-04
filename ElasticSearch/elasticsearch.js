/**
 * <odoc>
 * <key>ElasticSearch.ElasticSearch(aURL, aUser, aPassword) : ElasticSearch</key>
 * Creates a new instance of ElasticSearch give a elasticsearch aURL (without index), an user
 * and a password.
 * </odoc>
 */
var ElasticSearch = function(aURL, aUser, aPassword) {
	if (isUnDef(aURL)) throw "Please provide aURL";
	//if (isUnDef(aUser)) throw "Please provide aUser";
	//if (isUnDef(aPassword)) throw "Please provide aPassword";

	this.url = aURL;
	this.user = aUser;
	this.pass = aPassword;
};

/**
 * <odoc>
 * <key>ElasticSearch.createIndex(aIndex, aNumberOfShards, aNumberOfReplicas, extraOptions) : Map</key>
 * Tries to create aIndex on Elastic Search and returns the result.
 * </odoc>
 */
ElasticSearch.prototype.createIndex = function(aIndex, aNumberOfShards, aNumberOfReplicas, extraOptions) {
	ow.loadObj();
	var options = {};

	if (isDef(aNumberOfShards)) options = merge(options, { settings: { index: { number_of_shards: aNumberOfShards } }});
	if (isDef(aNumberOfReplicas)) options = merge(options, { settings: { index: { number_of_replicas: aNumberOfReplicas } }});
	if (isDef(extraOptions)) options = merge(options, extraOptions);

	if (isUnDef(aIndex)) throw "Please provide aIndex";

	return ow.obj.rest.jsonSet(this.url + "/" + aIndex, {}, options, this.user, this.pass);
};

/**
 * <odoc>
 * <key>ElasticSearch.deleteIndex(aIndex) : Map</key>
 * Tries to delete aIndex on Elastic Search and returns the result.
 * </odoc>
 */
ElasticSearch.prototype.deleteIndex = function(aIndex) {
	ow.loadObj();

	if (isUnDef(aIndex)) throw "Please provide aIndex";

	return ow.obj.rest.jsonRemove(this.url + "/" + aIndex, {}, this.user, this.pass);
};

/**
 * <odoc>
 * <key>ElasticSearch.closeIndex(aIndex) : Map</key>
 * Tries to close aIndex on Elastic Search and returns the result.
 * </odoc>
 */
ElasticSearch.prototype.closeIndex = function(aIndex) {
	ow.loadObj();

	if (isUnDef(aIndex)) throw "Please provide aIndex";

	return ow.obj.rest.jsonCreate(this.url + "/" + aIndex + "/_close", {}, this.user, this.pass);
};

/**
 * <odoc>
 * <key>ElasticSearch.openIndex(aIndex) : Map</key>
 * Tries to open aIndex on Elastic Search and returns the result.
 * </odoc>
 */
ElasticSearch.prototype.openIndex = function(aIndex) {
	ow.loadObj();

	if (isUnDef(aIndex)) throw "Please provide aIndex";

	return ow.obj.rest.jsonCreate(this.url + "/" + aIndex + "/_open", {}, this.user, this.pass);
};

/**
 * <odoc>
 * <key>ElasticSearch.reIndex(anOriginalIndex, aNewIndex, aTimeout, extraOptions) : Map</key>
 * Tries to copy anOriginalIndex to aNewIndex (reindex) and returns the result. 
 * "aTimeout" allows the request to exit gracefully while the reindex operation continues (e.g. "60m").
 * "extraOptions" will be merged into the request (e.g. { conflicts: "proceed" })
 * </odoc>
 */
ElasticSearch.prototype.reIndex = function(anOrigIndex, aNewIndex, aTimeout, extraOptions) {
	ow.loadObj();
	if (isUnDef(extraOptions)) extraOptions = {};
	var extra = "";
	if (isDef(aTimeout) && isString(aTimeout)) extra = "timeout=" + aTimeout;

	if (isUnDef(anOrigIndex) || isUnDef(aNewIndex)) throw "Please provide an original index and the new index name";

	var res = ow.obj.rest.jsonCreate(this.url + "/_reindex", {}, merge({ source : { index: anOrigIndex }, dest: { index: aNewIndex }}, extraOptions), this.user, this.pass);

	return res;
};

/**
 * <odoc>
 * <key>ElasticSearch.getTasks(actionsFilter, isDetailed) : Map</key>
 * Retrieves the current tasks in each cluster node. Optionally you can specify an actionsFilter (e.g. "*reindex") and
 * determined if the output should be detailed (e.g. isDetailed = true).
 * </odoc>
 */
ElasticSearch.prototype.getTasks = function(actionsFilter, isDetailed) {
	ow.loadObj();
	var ops = {};
	var extra = ""; //GET /_tasks?actions=*reindex&detailed
	if (isDef(actionsFilter) || isDef(isDetailed)) {
		extra = "?" + ow.obj.rest.writeQuery({
			detailed: isDetailed,
			actions : actionsFilter
		});
	}

	return ow.obj.rest.jsonGet(this.url + "/_tasks" + extra, this.user, this.pass);
};

ElasticSearch.prototype.getShards = function(forQuery) {
	ow.loadObj();

	if (forQuery) {
		var o = ow.obj.rest.jsonGet(this.url + "/_cat/shards?format=json&bytes=b", {}, this.user, this.pass);
		return $from(o).select((r) => {
			return {
				index: r.index,
				shard: r.shard,
				primaryOrReplica: r.prirep,
				state: r.state,
				numberDocs: Number(r.docs),
				storage: Number(r.store),
				ip: r.ip,
				node: r.node
			};
		});
	} else {
		return ow.obj.rest.jsonGet(this.url + "/_cat/shards?format=json", {}, this.user, this.pass);
	}
};

ElasticSearch.prototype.getClusterHealth = function(forQuery) {
	ow.loadObj();

	if (forQuery) {
		var o = ow.obj.rest.jsonGet(this.url + "/_cat/health?format=json", {}, this.user, this.pass);

		return $from(o).select((r) => {
			return {
				epoch: Number(r.epoch),
				timestamp: String(r.timestamp),
				cluster: r.cluster,
				status: r.status,
				nodeTotal: Number(r["node.total"]),
				nodeData: Number(r["node.data"]),
				shards: Number(r.shards),
				primaryShards: Number(r.pri),
				relocatingShards: Number(r.relo),
				initializingShards: Number(r.init),
				unassignedShards: Number(r.unassign),
				pendingTasks: Number(r.pending_tasks),
				maxTaskWaitTime: String(r.max_task_wait_time),
				activeShardsPercent: parseFloat(r.active_shards_percent)
			};
		});		
	} else {
		return ow.obj.rest.jsonGet(this.url + "/_cat/health?format=json", {}, this.user, this.pass);
	}
};

ElasticSearch.prototype.excludeNodeIP = function(aIP) {
	ow.loadObj();

	return ow.obj.rest.jsonSet(this.url + "/_cluster/settings", {}, { transient: { "cluster.routing.allocation.exclude._ip": aIP } }, this.user, this.pass);
};

ElasticSearch.prototype.getClusterStats = function() {
	ow.loadObj();

	return ow.obj.rest.jsonGet(this.url + "/_cluster/stats", {}, this.user, this.pass);
};

ElasticSearch.prototype.getPendingTasks = function() {
	ow.loadObj();

	return ow.obj.rest.jsonGet(this.url + "/_cluster/pending_tasks", {}, this.user, this.pass);
};

ElasticSearch.prototype.getNodeStats = function() {
	ow.loadObj();

	return ow.obj.rest.jsonGet(this.url + "/_nodes/stats", {}, this.user, this.pass);
};

ElasticSearch.prototype.getIndices = function(forQuery) {
	ow.loadObj();

	if (forQuery) {
		var o = ow.obj.rest.jsonGet(this.url + "/_cat/indices?format=json&bytes=b", {}, this.user, this.pass);

		return $from(o).select((r) => {
			return {
				health: r.health,
				status: r.status,
				index: r.index,
				uuid: r.uuid,
				primaryShards: Number(r.pri),
				replicas: Number(r.rep),
				docsCount: Number(r["docs.count"]),
				docsDeleted: Number(r["docs.deleted"]),
				storeSize: Number(r["store.size"]),
				primaryStoreSize: Number(r["pri.store.size"])
			};
		});
	} else {
		return ow.obj.rest.jsonGet(this.url + "/_cat/indices?format=json", {}, this.user, this.pass);
	}
};

ElasticSearch.prototype.getNodes = function(forQuery) {
	ow.loadObj();

	if (forQuery) {
		var o = ow.obj.rest.jsonGet(this.url + "/_cat/nodes?format=json", {}, this.user, this.pass);

		return $from(o).select((r) => {
			return {
				ip: String(r.ip),
				heapPercent: Number(r["heap.percent"]),
				ramPercent: Number(r["ram.percent"]),
				cpu: Number(r.cpu),
				load1m: Number(r.load_1m),
				load5m: Number(r.load_5m),
				load15m: Number(r.load_15m),
				nodesRole: String(r["node.role"]),
				master: String(r.master),
				name: String(r.name)
			};
		});
	} else {
		return ow.obj.rest.jsonGet(this.url + "/_cat/nodes?format=json", {}, this.user, this.pass);
	}
};

ElasticSearch.prototype.getCounts = function(forQuery) {
	ow.loadObj();

	if (forQuery) {
		var o = ow.obj.rest.jsonGet(this.url + "/_cat/count?format=json", {}, this.user, this.pass);

		return $from(o).select((r) => {
			return {
				epoch: Number(r.epoch),
				timestamp: r.timestamp,
				count: Number(r.count)
			};
		});		
	} else {
		return ow.obj.rest.jsonGet(this.url + "/_cat/count?format=json", {}, this.user, this.pass);
	}
};

/**
 * <odoc>
 * <key>ElasticSearch.search(aIndex, aSearchJSON) : aResultJSON</key>
 * Performs a search on the corresponding aIndex given aSearchJSON.
 * </odoc>
 */
ElasticSearch.prototype.search = function(aIndex, aSearchJSON) {
	ow.loadObj();

	return ow.obj.rest.jsonCreate(this.url + "/" + aIndex + "/_search", {}, aSearchJSON);
};

/**
 * <odoc>
 * <key>ElasticSearch.createCh(aIndex, aIdKey, aChName) : Channel</key>
 * Creates an OpenAF channel to access the elastic search aIndex using aIdKey (defaults to "id"). Optionally 
 * you can provide aChName (channel name). If you don't provide one it will try to use the 
 * aIndex as the channel name.
 * </odoc>
 */
ElasticSearch.prototype.createCh = function(aIndex, aIdKey, aChName) {
	if (isUnDef(aIndex)) throw "Please provide aIndex";

	if (isUnDef(aIdKey)) aIdKey = "id";
	if (isUnDef(aChName)) aChName = aIndex;

	var parent = this;
	return $ch(aChName).create(undefined, "elasticsearch", {
		index: aIndex,
		idKey: aIdKey,
		url  : parent.url,
		user : parent.user,
		pass : parent.pass
	});
};

/** 
 * <odoc>
 * <key>ElasticSearch.startLog(aIndex, aHostId, localCopy)</key>
 * Starts sending all OpenAF logging to ElasticSearch on aIndex using aHostId (defaults to aIndex if not provided).
 * You can also choose to keep the channel __log local copy by localCopy = true. Otherwise nothing will be kept on the script.
 * Internally creates a "bridge" OpenAF channel "__log::es" and uses the log channel "__log".
 * </odoc>
 */
ElasticSearch.prototype.startLog = function(aIndex, aHostId, localCopy) {
	if (isUnDef(aIndex)) throw "Please provide aIndex";
	if (isUnDef(aHostId)) aHostId = aIndex;

	if (!localCopy) {
		$ch("__log").destroy();
		$ch("__log").create(undefined, "dummy");
	}
	var channel = this.createCh(aIndex, "id", "__log::es");
	startLog(ow.ch.utils.getLogStashSubscriber("__log::es", "id", aHostId, function(e) { sprintErr(e); }));

	var parent = this;
	addOnOpenAFShutdown(function() {
		parent.stopLog();
	});
};

/**
 * <odoc>
 * <key>ElasticSearch.stopLog()</key>
 * Stops sending all OpenAF logging to ElasticSearch.
 * </odoc>
 */
ElasticSearch.prototype.stopLog = function() {
	stopLog();
	$ch("__log::es").destroy();
};
