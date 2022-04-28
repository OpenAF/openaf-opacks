/**
 * <odoc>
 * <key>ElasticSearch.ElasticSearch(aURL, aUser, aPassword) : ElasticSearch</key>
 * Creates a new instance of ElasticSearch give a elasticsearch aURL (without index), an user
 * and a password.
 * </odoc>
 */
var ElasticSearch = function(aURL, aUser, aPassword) {
	if (isUnDef(aURL)) throw "Please provide aURL";

	this.url = aURL;
	this.user = aUser;
	this.pass = aPassword;
	this.restmap = {
		login: Packages.openaf.AFCmdBase.afc.dIP(this.user),
		pass : Packages.openaf.AFCmdBase.afc.dIP(this.pass)
	};
};

/**
 * <odoc>
 * <key>ElasticSearch.setRESTMap(aMap)</key>
 * Sets the options aMap to be used with $rest calls to ElasticSearch. Please check help for $rest.get for available
 * options.
 * </odoc>
 */
ElasticSearch.prototype.setRESTMap = function(aMap) {
	this.restmap = merge(aMap, {
		login: Packages.openaf.AFCmdBase.afc.dIP(this.user),
		pass : Packages.openaf.AFCmdBase.afc.dIP(this.pass)
	});
};

/**
 * <odoc>
 * <key>ElasticSearch.setPreAction(aPreAction)</key>
 * Sets a preAction function to be used on every $rest call. Please check more on help for $rest.get.
 * </odoc>
 */
ElasticSearch.prototype.setPreAction = function(aPreAction) {
	this.restmap.preAction = aPreAction;
};

/**
 * <odoc>
 * <key>ElasticSearch.getIndexMapping(aIndex) : Map</key>
 * Retrieves the current mapping of aIndex.
 * </odoc>
 */
ElasticSearch.prototype.getIndexMapping = function(aIndex) {
	ow.loadObj();

	//var res = ow.obj.rest.jsonGet(this.url + "/" + aIndex + "/_mapping");
	var res = $rest(this.restmap).get(this.url + "/" + aIndex + "/_mapping");
	if (isDef(res[aIndex])) {
		return res[aIndex];
	} else {
		return void 0;
	}
};

/**
 * <odoc>
 * <key>ElasticSearch.listTemplates() : Map</key>
 * Returns a map with the current list of templates.
 * </odoc>
 */
ElasticSearch.prototype.listTemplates = function() {
	return $rest(this.restmap).get(this.url + "/_template");
};

/**
 * <odoc>
 * <key>ElasticSearch.setTemplate(aTemplateName, aTemplateMap) : Map</key>
 * Creates or updates aTemplateName with aTemplateMap
 * </odoc>
 */
ElasticSearch.prototype.setTemplate = function(aTemplateName, aTemplateMap) {
	return $rest(this.restmap).put(this.url + "/_template/" + aTemplateName, aTemplateMap);
};

/**
 * <odoc>
 * <key>ElasticSearch.deleteTemplate(aTemplateName) : Map</key>
 * Deletes aTemplateName.
 * </odoc>
 */
ElasticSearch.prototype.deleteTemplate = function(aTemplateName, aTemplateMap) {
	return $rest(this.restmap).delete(this.url + "/_template/" + aTemplateName);
};

/**
 * <odoc>
 * <key>ElasticSearch.setTemplatePriRep(aTemplateName, aListOfIndexPatterns, numPrimary, numReplica) : Map</key>
 * Creates or updates aTemplateName with for aListOfIndexPatterns (e.g. ["prod-*", "dev-*"]) specifiyng the numPrimary shards and
 * numReplica shards (if note defined defaults to numPrimary = 1 and numReplica = 1)
 * </odoc>
 */
ElasticSearch.prototype.setTemplatePriRep = function(aTemplateName, aListOfIndexPatterns, numPrimary, numReplica) {
	numPrimary = _$(numPrimary).isNumber().default(1);
	numReplica = _$(numReplica).isNumber().default(1);

	if (!isArray(aListOfIndexPatterns)) aListOfIndexPatterns = [ aListOfIndexPatterns ];
	return $rest(this.restmap).put(this.url + "/_template/" + aTemplateName, { 
		"index_patterns": aListOfIndexPatterns,
		settings: {
			"number_of_shards": numPrimary,
			"number_of_replicas": numReplica
		}
	});
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

	//return ow.obj.rest.jsonSet(this.url + "/" + aIndex, {}, options, this.user, this.pass);
	return $rest(this.restmap).put(this.url + "/" + aIndex, options);
};

ElasticSearch.prototype.alias = function() {
	var _ops = [];

	var _o = {
		list: () => {
			return $rest(this.restmap).get(this.url + "/_aliases")
		},
		get: (anAlias) => {
			return _o.list()[anAlias]
		},
		exec: () => {
			return $rest(this.restmap).post(this.url + "/_aliases", { actions: _ops })
		},
		add: (anAlias, anIndex, isReadOnly, extraOptions) => {
			var r = {
				add: {
					index: !isArray(anIndex) ? anIndex : __,
					indices: isArray(anIndex) ? anIndex : __,
					alias  : !isArray(anAlias) ? anAlias : __,
					aliases: isArray(anAlias) ? anAlias : __,
					is_write_index: !isReadOnly ? true : false
				}
			}
			r = merge(r, extraOptions)
			_ops.push(r)
			return _o
		},
		removeIndex: (anIndex, extraOptions) => {
			var r
			r = {
				remove_index: {
					index  : !isArray(anIndex) ? anIndex : __,
					indices: isArray(anIndex) ? anIndex : __
				}
			}
			r = merge(r, extraOptions)
			_ops.push(r)
			return _o
		},
		remove: (anAlias, anIndex, shouldDelete, extraOptions) => {
			var r = {
				remove: {
					index  : !isArray(anIndex) ? anIndex : __,
					indices: isArray(anIndex) ? anIndex : __,
					alias  : !isArray(anAlias) ? anAlias : __,
					aliases: isArray(anAlias) ? anAlias : __
				}
			}
			r = merge(r, extraOptions)
			_ops.push(r)
			return _o
		}
	}
	return _o
}

/**
 * <odoc>
 * <key>ElasticSearch.deleteIndex(aIndex) : Map</key>
 * Tries to delete aIndex on Elastic Search and returns the result.
 * </odoc>
 */
ElasticSearch.prototype.deleteIndex = function(aIndex) {
	ow.loadObj();

	if (isUnDef(aIndex)) throw "Please provide aIndex";

	//return ow.obj.rest.jsonRemove(this.url + "/" + aIndex, {}, this.user, this.pass);
	return $rest(this.restmap).delete(this.url + "/" + aIndex);
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

	//return ow.obj.rest.jsonCreate(this.url + "/" + aIndex + "/_close", {}, this.user, this.pass);
	return $rest(this.restmap).post(this.url + "/" + aIndex + "/_close");
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

	//return ow.obj.rest.jsonCreate(this.url + "/" + aIndex + "/_open", {}, this.user, this.pass);
	return $rest(this.restmap).post(this.url + "/" + aIndex + "/_open");
};

/**
 * <odoc>
 * <key>ElasticSearch.reIndex(anOriginalIndex, aNewIndex, aTimeout, extraOptions, taskCallback, slices) : Map</key>
 * Tries to copy anOriginalIndex to aNewIndex (reindex) and returns the result. 
 * "aTimeout" allows the request to exit gracefully while the reindex operation continues (e.g. "60m").
 * "extraOptions" will be merged into the request (e.g. { conflicts: "proceed" }).
 * If the function taskCallback is defined the reindex will be handled as a task (helpfull if you have a http timeout
 * of 1 minute) and the taskCallback called every second with the current task info (if the function returns a number it will
 * be used as the new sleep time between calls in order not to overload the cluster). If slices is defined it will be included
 * on the reindex call (in ES >= 6.x you can use slices=auto)
 * </odoc>
 */
ElasticSearch.prototype.reIndex = function(anOrigIndex, aNewIndex, aTimeout, extraOptions, taskCallback, slices) {
	ow.loadObj();
	if (isUnDef(extraOptions)) extraOptions = {};
	var extra = (isDef(slices) ? "?slices=" + slices : "?");
	if (isDef(aTimeout) && isString(aTimeout)) extra += "&timeout=" + aTimeout;

	if (isUnDef(anOrigIndex) || isUnDef(aNewIndex)) throw "Please provide an original index and the new index name";

	var res;
	if (isDef(taskCallback) && isFunction(taskCallback)) {
		extra += "&wait_for_completion=false";
		//res = ow.obj.rest.jsonCreate(this.url + "/_reindex" + extra, {}, merge({ source: { index: anOrigIndex }, dest: { index: aNewIndex } }, extraOptions), this.user, this.pass);
		res = $rest(this.restmap).post(this.url + "/_reindex" + extra, merge({ source: { index: anOrigIndex }, dest: { index: aNewIndex } }, extraOptions));
		var t = 1000, task;
		do {
			sleep(t);
			task = this.getTask(res.task);
			var tr = taskCallback(task);

			if (isDef(tr)) t = tr;
		} while (isDef(task) && t > 0);
		return;
	} else {
		//res = ow.obj.rest.jsonCreate(this.url + "/_reindex" + extra, {}, merge({ source: { index: anOrigIndex }, dest: { index: aNewIndex } }, extraOptions), this.user, this.pass);
		res = $rest(this.restmap).post(this.url + "/_reindex" + extra, merge({ source: { index: anOrigIndex }, dest: { index: aNewIndex } }, extraOptions));
	}

	return res;
};

/**
 * <odoc>
 * <key>ElasticSearch.forceMerge(aIndexExpression, maxNumSegments) : Map</key>
 * Forces the merge of segments to improve performance for aIndexExpression (e.g. "index", "index-*", "index1,index2", "_all", etc...).
 * Optionally you can specify the number of maxNumSegments per index (defaults to 1).
 * </odoc>
 */
ElasticSearch.prototype.forceMerge = function(aIndexExpression, maxNumSegments) {
	ow.loadObj();

	maxNumSegments = _$(maxNumSegments).isNumber().default(1);
	_$(aIndexExpression).$_("Please provide an index or index wildcard expression or _all.");
	
	//var res = ow.obj.rest.jsonCreate(this.url + "/" + aIndexExpression + "/_forcemerge?max_num_segments=" + maxNumSegments);
	var res = $rest(this.restmap).post(this.url + "/" + aIndexExpression + "/_forcemerge?max_num_segments=" + maxNumSegments);

	return res;
};

/**
 * <odoc>
 * <key>ElasticSearch.getTask(aTaskRef) : Map</key>
 * Tries to retrieve the aTaskReg (in the format [node]:[task]) and returns the corresponding info. It will return
 * undefined if no information for the task exists (which means it's no longer running).
 * </odoc>
 */
ElasticSearch.prototype.getTask = function(aTaskRef) {
    ow.loadObj();
    _$(aTaskRef).isString().check((v)=>{ return aTaskRef.indexOf(":") >= 0; }).$_("You need to provide a task ref (node:id)");
  	var res = this.getTasks(); 

	var [node, id] = aTaskRef.split(/:/);

	if (isUnDef(res.nodes[node])) return void 0;
	return res.nodes[node].tasks[node + ":" + id];
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

	//return ow.obj.rest.jsonGet(this.url + "/_tasks" + extra, this.user, this.pass);
	return $rest(this.restmap).get(this.url + "/_tasks" + extra);
};

/**
 * <odoc>
 * <key>ElasticSearch.cancelTask(aTaskId) : Map</key>
 * Given aTaskId will try to cancel it.
 * </odoc>
 */
ElasticSearch.prototype.cancelTask = function(aTaskId) {
	return $rest(this.restmap).post(this.url + "/_tasks/" + aTaskId + "/_cancel");
};

ElasticSearch.prototype.getShards = function(forQuery) {
	ow.loadObj();

	if (forQuery) {
		//var o = ow.obj.rest.jsonGet(this.url + "/_cat/shards?format=json&bytes=b", {}, this.user, this.pass);
		var o = $rest(this.restmap).get(this.url + "/_cat/shards?format=json&bytes=b");
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
		//return ow.obj.rest.jsonGet(this.url + "/_cat/shards?format=json", {}, this.user, this.pass);
		return $rest(this.restmap).get(this.url + "/_cat/shards?format=json");
	}
};

ElasticSearch.prototype.getBreakerStats = function() {
	return $rest(this.restmap).get(this.url + "/_nodes/stats/breaker");
};

ElasticSearch.prototype.getClusterHealth = function(forQuery) {
	ow.loadObj();

	if (forQuery) {
		//var o = ow.obj.rest.jsonGet(this.url + "/_cat/health?format=json", {}, this.user, this.pass);
		var o = $rest(this.restmap).get(this.url + "/_cat/health?format=json");

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
		//return ow.obj.rest.jsonGet(this.url + "/_cat/health?format=json", {}, this.user, this.pass);
		return $rest(this.restmap).get(this.url + "/_cat/health?format=json");
	}
};

ElasticSearch.prototype.excludeNodeIP = function(aIP) {
	ow.loadObj();

	//return ow.obj.rest.jsonSet(this.url + "/_cluster/settings", {}, { transient: { "cluster.routing.allocation.exclude._ip": aIP } }, this.user, this.pass);
	return $rest(this.restmap).put(this.url + "/_cluster/settings", { transient: { "cluster.routing.allocation.exclude._ip": aIP } });
};

ElasticSearch.prototype.getClusterStats = function() {
	ow.loadObj();

	//return ow.obj.rest.jsonGet(this.url + "/_cluster/stats", {}, this.user, this.pass);
	return $rest(this.restmap).get(this.url + "/_cluster/stats");
};

ElasticSearch.prototype.getPendingTasks = function() {
	ow.loadObj();

	//return ow.obj.rest.jsonGet(this.url + "/_cluster/pending_tasks", {}, this.user, this.pass);
	return $rest(this.restmap).get(this.url + "/_cluster/pending_tasks");
};

ElasticSearch.prototype.getNodeStats = function() {
	ow.loadObj();

	//return ow.obj.rest.jsonGet(this.url + "/_nodes/stats", {}, this.user, this.pass);
	return $rest(this.restmap).get(this.url + "/_nodes/stats");
};

ElasticSearch.prototype.getIndices = function(forQuery) {
	ow.loadObj();

	if (forQuery) {
		//var o = ow.obj.rest.jsonGet(this.url + "/_cat/indices?format=json&bytes=b", {}, this.user, this.pass);
		var o = $rest(this.restmap).get(this.url + "/_cat/indices?format=json&bytes=b");

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
		//return ow.obj.rest.jsonGet(this.url + "/_cat/indices?format=json", {}, this.user, this.pass);
		return $rest(this.restmap).get(this.url + "/_cat/indices?format=json");
	}
};

ElasticSearch.prototype.getIndice = function(aIndex) {
	return $rest(this.restmap).get(this.url + "/_cat/indices/" + aIndex + "?format=json");
};

ElasticSearch.prototype.getNodes = function(forQuery) {
	ow.loadObj();

	if (forQuery) {
		//var o = ow.obj.rest.jsonGet(this.url + "/_cat/nodes?format=json", {}, this.user, this.pass);
		var o = $rest(this.restmap).get(this.url + "/_cat/nodes?format=json");

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
		//return ow.obj.rest.jsonGet(this.url + "/_cat/nodes?format=json", {}, this.user, this.pass);
		return $rest(this.restmap).get(this.url + "/_cat/nodes?format=json");
	}
};

ElasticSearch.prototype.getCounts = function(forQuery) {
	ow.loadObj();

	if (forQuery) {
		//var o = ow.obj.rest.jsonGet(this.url + "/_cat/count?format=json", {}, this.user, this.pass);
		var o = $rest(this.restmap).get(this.url + "/_cat/count?format=json");

		return $from(o).select((r) => {
			return {
				epoch: Number(r.epoch),
				timestamp: r.timestamp,
				count: Number(r.count)
			};
		});		
	} else {
		//return ow.obj.rest.jsonGet(this.url + "/_cat/count?format=json", {}, this.user, this.pass);
		return $rest(this.restmap).get(this.url + "/_cat/count?format=json");
	}
};

ElasticSearch.prototype.getAllocation = function(anIndex, useBytes) {
	return $rest(this.restmap).get(this.url + "/_cat/allocation?format=json" + (useBytes ? "&bytes=b" : ""));
};

ElasticSearch.prototype.getSettings = function() {
	return $rest(this.restmap).get(this.url + "/_cluster/settings?include_defaults=true&flat_settings=true");
};

ElasticSearch.prototype.getIndexSettings = function(aIndex) {
	_$(aIndex, "aIndex").isString().$_();
	return $rest(this.restmap).get(this.url + "/" + aIndex + "_settings");
};

/**
 * <odoc>
 * <key>ElasticSearch.search(aIndex, aSearchJSON) : aResultJSON</key>
 * Performs a search on the corresponding aIndex given aSearchJSON.
 * </odoc>
 */
ElasticSearch.prototype.search = function(aIndex, aSearchJSON) {
	ow.loadObj();

	//return ow.obj.rest.jsonCreate(this.url + "/" + aIndex + "/_search", {}, aSearchJSON);
	return $rest(this.restmap).post(this.url + "/" + aIndex + "/_search", aSearchJSON);
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
	return $ch(aChName).create(void 0, "elasticsearch", {
		index: aIndex,
		idKey: aIdKey,
		url  : parent.url,
		user : parent.user,
		pass : parent.pass,
		preAction: this.restmap.preAction
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

/**
 * <odoc>
 * <key>ElasticSearch.createScroll(aIndex, aSearchJSON, aSize, aTime, sliceId, sliceMax) : Map</key>
 * Creates a scrollable result set usefull for batch processing on the provided aIndex using aSearchJSON (if not 
 * defined will default to match all). Optionally you can also specify a size per request (defaults to 10), aTime for
 * the scrollable result set to "live" on the cluster (defaults to 1 minute), sliceId/sliceMax for paralell processing (call multiple times
 * the createScroll function with a different sliceId but the same sliceMax and then use each result with nextScroll). 
 * The result will be a map with the first results and the information needed to use for nextScroll.
 * </odoc>
 */
ElasticSearch.prototype.createScroll = function(aIndex, aSearchJSON, aSize, aTime, sliceId, sliceMax) {
	ow.loadObj();
	aTime = _$(aTime).isString().default("1m");
	aSearchJSON = _$(aSearchJSON).isObject().default({ query: { match_all: {} } });
	aSize = _$(aSize).isNumber().default("10");
	aSearchJSON.size = aSize;

	if(isDef(sliceId) && isDef(sliceMax) && isNumber(sliceId) && isNumber(sliceMax)) {
	   aSearchJSON.slice = {
		  id: sliceId,
		  max: sliceMax
	   };
	}

	//return ow.obj.rest.jsonCreate(this.url + "/" + aIndex + "/_search?scroll=" + aTime, {}, aSearchJSON);
	return $rest(this.restmap).post(this.url + "/" + aIndex + "/_search?scroll=" + aTime, aSearchJSON);
};

/**
 * <odoc>
 * <key>ElasticSearch.nextScroll(aScrollMap, aTime) : Map</key>
 * After creating a scrollable result set with createScroll the corresponding result can be used to obtain the next set of 
 * results until map.hits.hits.length == 0. Optionally you can specify aTime for the scrollable result set to "live" on the 
 * cluster resetting the previous call aTime count (defaults to 1 minute).
 * </odoc>
 */
ElasticSearch.prototype.nextScroll = function(aScrollMap, aTime) {
	ow.loadObj();

	aTime = _$(aTime).isString().default("1m");

	/*return ow.obj.rest.jsonCreate(this.url + "/_search/scroll", {}, {
	   scroll: aTime,
	   scroll_id: aScrollMap._scroll_id
	});*/
	return $rest(this.restmap).post(this.url + "/_search/scroll", {
		scroll: aTime,
		scroll_id: aScrollMap._scroll_id
	});
};

/**
 * <odoc>
 * <key>ElasticSearch.deleteScroll(aScrollMap) : Map</key>
 * Given the result of createScroll or nextScroll it will try to delete the scrollable result set from the cluster. Note: If the 
 * result set is "exausted" it might throw an exception.
 * </odoc>
 */
ElasticSearch.prototype.deleteScroll = function(aScrollMap) {
	ow.loadObj();

	//return ow.obj.rest.jsonRemove(this.url + "/_search/scroll", {}, { scroll_id: aScrollMap._scroll_id });
	return $rest(this.restmap).delete(this.url + "/_search/scroll", {
		scroll_id: aScrollMap._scroll_id
	});
};

/**
 * <odoc>
 * <key>ElasticSearch.deleteAllScrols() : Map</key>
 * Tries to delete all active scrollable result set previously created on the cluster.
 * </odoc>
 */
ElasticSearch.prototype.deleteAllScrolls = function() {
	ow.loadObj();

	//return ow.obj.rest.jsonRemove(this.url + "/_search/scroll/_all", {}, {});
	return $rest(this.restmap).delete(this.url + "/_search/scroll/_all");
};

/**
 * <odoc>
 * <key>ElasticSearch.getNodesStats() : Map</key>
 * Retrieves statistics (including number of scrollable result sets) for all cluster nodes.
 * </odoc>
 */
ElasticSearch.prototype.getNodesStats = function() {
	ow.loadObj();

	//return ow.obj.rest.jsonGet(this.url + "/_nodes/stats/indices/search", {}, {});
	return $rest(this.restmap).get(this.url + "/_nodes/stats/indices/search");
};

/**
 * <odoc>
 * <key>ElasticSearch.exportIndex(aIndex, aOutputFunc, aMap)</key>
 * Given aIndex will bulk export all documents using the aOutputFunc and calling providing each document as a parameter. Optionally if aMap.aLogFunc is
 * provided it will be called with a map containing op (e.g. init, start, error and done), the threadId and totalThread created. The parameter aMap.aBatchSize
 * allows to define a different number of documents sent per bulk call in each thread (defaults to 100). The parameter aMap.aNumThreads allows to specify the 
 * number of threads that will be used (defaults to the number of cores detected). The parameter aMap.search allows the specification of a search query map.
 * </odoc>
 */
ElasticSearch.prototype.exportIndex = function(aIndex, aOutputFunc, aMap) {
	aMap = _$(aMap).isMap().default({});
	var aLogFunc = aMap.logFunc, batchSize = aMap.batchSize, numThreads = aMap.numThreads, search = aMap.search;
	
	var __batchSize = _$(batchSize).isNumber("BatchSize needs to be a number.").default(100);
	var __threads   = _$(numThreads).isNumber("Threads needs to be a number.").default(getNumberOfCores());
	var __index     = _$(aIndex).isString("Index needs to be a string.").$_("Please provide an index pattern aIndex=something*");
	var __search    = _$(search).isMap("Search needs to be a map.").default(__);
	var func        = _$(aOutputFunc).isFunction("OutputFunc needs to be a function.").$_("Please provide aOutputFunc");
	if (isUnDef(aLogFunc) || !isFunction(aLogFunc)) {
		aLogFunc = () => {};
	}

	if (__threads <= 1) __threads = 2;

	var __iniBulk = [];
	for(var ii = 0; ii < __threads; ii++) {
        var res = this.createScroll(__index, __search, __batchSize, void 0, ii, __threads);
        res.__index = ii + 1;
		__iniBulk.push(res);
		aLogFunc({
			op: "init",
			threadId: res.__index,
			totalThread: isDef(__iniBulk[ii].hits) && isDef(__iniBulk[ii].hits.total) ? __iniBulk[ii].hits.total : __
		});
	}
	
	var parent = this;
	parallel4Array(__iniBulk, function(ini) {
		try {
			var res = ini; 
			aLogFunc({
				op: "start",
				threadId: ini.__index,
				totalThread: ini.hits.total
			});
			while(res.hits.hits.length > 0) {
				res.hits.hits.forEach((v) => {
					aOutputFunc(v._source, v);
				});
				res = parent.nextScroll(res);
			}
			aLogFunc({
				op: "done",
				threadId: ini.__index,
				totalThread: ini.hits.total
			});
		} catch(e) {
			aLogFunc({
				op: "error",
				threadId: ini.__index,
				totalThread: ini.hits.total,
				exception: e
			});
		}
		return true;
	}, __threads);

	try {
		for(var is in __iniBulk) {
			this.deleteScroll(__iniBulk[is]);
		}
	} catch(e) { }
};

/**
 * <odoc>
 * <key>ElasticSearch.importFile2Index(aFnIndex, aFilename, aMap)</key>
 * Given aFilename (in NDJSON format) it will try to bulk import each document line into the returned indexed by the aFnIndex function that receives the document
 * as a parameter. aFnIndex can also be a string. Optionally you can provided aMap.fnId function to calculate the id field from each map which can also be specified in aMap.idKey.
 * aMap.fnIndex defaults to sha1 from the stringify version of each document and aMap.idKey defaults to "id". The function aMap.logFunc, if provided, will be executed receiving a 
 * map with op (e.g. start, error and done), uuid with unique identification of each thread used and size with the data size being handle by each thread. The optional
 * parameter aMap.batchSize can also be provided so that each bulk import thread uses a different maximum size from the default 10MB. If the optional parameter aMap.transformFn 
 * is provided that function will be executed for each document and the returned transformed documented will be the one used on the import.
 * For recent ElasticSearch versions that no longer support the _type field you can set aMap.noType = true.
 * </odoc>
 */
ElasticSearch.prototype.importFile2Index = function(aFnIndex, aFilename, aMap) {
	var is = io.readFileStream(aFilename)
	try {
		this.importStream2Index(aFnIndex, is, aMap)
	} catch(e) {
		throw e
	} finally {
		is.close()
	}
}
/**
 * <odoc>
 * <key>ElasticSearch.importFileGzip2Index(aFnIndex, aFilename, aMap)</key>
 * Given aFilename (in NDJSON.gz format) it will try to bulk import each document line into the returned indexed by the aFnIndex function that receives the document
 * as a parameter. aFnIndex can also be a string. Optionally you can provided aMap.fnId function to calculate the id field from each map which can also be specified in aMap.idKey.
 * aMap.fnIndex defaults to sha1 from the stringify version of each document and aMap.idKey defaults to "id". The function aMap.logFunc, if provided, will be executed receiving a 
 * map with op (e.g. start, error and done), uuid with unique identification of each thread used and size with the data size being handle by each thread. The optional
 * parameter aMap.batchSize can also be provided so that each bulk import thread uses a different maximum size from the default 10MB. If the optional parameter aMap.transformFn 
 * is provided that function will be executed for each document and the returned transformed documented will be the one used on the import.
 * For recent ElasticSearch versions that no longer support the _type field you can set aMap.noType = true.
 * </odoc>
 */
ElasticSearch.prototype.importFileGzip2Index = function(aFnIndex, aFilename, aMap) {
	var is = io.readFileGzipStream(aFilename)
	try {
		this.importStream2Index(aFnIndex, is, aMap)
	} catch(e) {
		throw e
	} finally {
		is.close()
	}
}

/**
 * <odoc>
 * <key>ElasticSearch.importStream2Index(aFnIndex, aStream, aMap)</key>
 * Given aStream (of a NDJSON format) it will try to bulk import each document line into the returned indexed by the aFnIndex function that receives the document
 * as a parameter. aFnIndex can also be a string. Optionally you can provided aMap.fnId function to calculate the id field from each map which can also be specified in aMap.idKey.
 * aMap.fnIndex defaults to sha1 from the stringify version of each document and aMap.idKey defaults to "id". The function aMap.logFunc, if provided, will be executed receiving a 
 * map with op (e.g. start, error and done), uuid with unique identification of each thread used and size with the data size being handle by each thread. The optional
 * parameter aMap.batchSize can also be provided so that each bulk import thread uses a different maximum size from the default 10MB. If the optional parameter aMap.transformFn 
 * is provided that function will be executed for each document and the returned transformed documented will be the one used on the import.
 * For recent ElasticSearch versions that no longer support the _type field you can set aMap.noType = true.
 * </odoc>
 */
ElasticSearch.prototype.importStream2Index = function(aFnIndex, rstream, aMap) {
	ow.loadObj();
	aMap = _$(aMap).isMap().default({});
	var aFnId = aMap.aFnId, idKey = aMap.idKey, aTransformFn = aMap.transformFn, aLogFunc = aMap.logFunc, batchSize = aMap.batchSize;
	var noType = _$(aMap.noType, "noType").isBoolean().default(false)

	if (isUnDef(aLogFunc)) {
		aLogFunc = (r) => {
			if (r.op == "error") sprintErr(r);
		};
	}
	
	var parent = this;
	var data = "", cdata = 0;

	batchSize = _$(batchSize).isNumber().default(9 * 1024 * 1024);
	aIndex = (isFunction(aFnIndex) ? aFnIndex : () => { return aFnIndex; });
	aFnId = _$(aFnId).isFunction().default((j) => { return sha1(stringify(sortMapKeys(j), __, "")); });
	if (!noType) idKey = _$(idKey).default("id");
	_$(aTransformFn).isFunction();

	if (isUnDef(aLogFunc) || !isFunction(aLogFunc)) {
			aLogFunc = () => {};
	}

	var res;
	function sendBulk(tdata) {		
		var uuid = genUUID();
		try {
			if (isDef(aLogFunc)) aLogFunc({
					op: "start",
					uuid: uuid,
					size: tdata.length
			});
			var h = new ow.obj.http();
			if (isDef(parent.user)) h.login(parent.user, parent.pass);
			res = h.exec(parent.url + "/_bulk", "POST", tdata, { "Content-Type": "application/json" });
			if (isString(res.response)) {
				var _em = jsonParse(res.response, true)
				if (isMap(_em) && isDef(_em.errors) && _em.errors == true) throw "Errors on bulk operation";
			}
			if (isDef(aLogFunc)) aLogFunc({
				op: "done",
				uuid: uuid,
				size: tdata.length,
				result: jsonParse(res.response, true)
			});
		} catch(e) {
			try{
			if (isDef(aLogFunc)) aLogFunc({
					op: "error",
					uuid: e.uuid,
					exception: String(e),
					response: res
			});
			}catch(ee) { sprint(ee); }
		}
	}

	$doA2B(each => {
		ioStreamReadLines(rstream, (line) => {
			var j = jsonParse(line);
			var tmp = stringify({
				index: {
					_index: aIndex(j),
					_type : idKey,
					_id   : aFnId(j)
				}
			}, void 0, "") + "\n";
			if (isDef(aTransformFn)) {
				tmp += stringify(aTransformFn(jsonParse(line)), void 0, "") + "\n";
			} else {
				tmp += line + "\n";
			}
			if (data.length + tmp.length >= batchSize) {
					each(String(data));
					data = "";
			}
			data += tmp;
			cdata++;
		}, "\n");
		
		if (data != "") {
			each(String(data));
			data = "";
		}
	}, sendBulk);

	rstream.close();

	return cdata;
};

/**
 * <odoc>
 * <key>ElasticSearch.exportIndex2File(aIndex, aFilename, aMap)</key>
 * Given the provided aIndex uses ElasticSearch.exportIndex to generate a NDJSON on aFilename. Additionally you can provide aMap.logFunc, aMap.batchSize and
 *  aMap.numThreads. See help for ElasticSearch.exportIndex for more.
 * </odoc>
 */
ElasticSearch.prototype.exportIndex2File = function(aIndex, aFilename, aMap) {
	var os = io.writeFileStream(aFilename)
	try {
		this.exportIndex2Stream(aIndex, os, aMap)
	} catch(e) {
		throw e
	} finally {
		os.close()
	}
};
/**
 * <odoc>
 * <key>ElasticSearch.exportIndex2File(aIndex, aFilename, aMap)</key>
 * Given the provided aIndex uses ElasticSearch.exportIndex to generate a NDJSON.gz on aFilename. Additionally you can provide aMap.logFunc, aMap.batchSize and
 *  aMap.numThreads. See help for ElasticSearch.exportIndex for more.
 * </odoc>
 */
ElasticSearch.prototype.exportIndex2FileGzip = function(aIndex, aFilename, aMap) {
	var os = io.writeFileGzipStream(aFilename)
	try {
		this.exportIndex2Stream(aIndex, os, aMap)
	} catch(e) {
		throw e
	} finally {
		os.close()
	}
};

/**
 * <odoc>
 * <key>ElasticSearch.exportIndex2Stream(aIndex, aStream, aMap)</key>
 * Given the provided aIndex uses ElasticSearch.exportIndex to generate a NDJSON on aStream. Additionally you can provide aMap.logFunc, aMap.batchSize and
 *  aMap.numThreads. See help for ElasticSearch.exportIndex for more.
 * </odoc>
 */
ElasticSearch.prototype.exportIndex2Stream = function(aIndex, wstream, aMap) {
	aMap = _$(aMap).isMap().default({});
	var aLogFunc = aMap.logFunc, batchSize = aMap.batchSize, numThreads = aMap.numThreads, search = aMap.search;

	if (isUnDef(aLogFunc)) {
		aLogFunc = (r) => {
			if (r.op == "error") sprintErr(r);
		};
	}

	var parent = this;
	this.exportIndex(aIndex, function(v) {
		var s = (isDef(v._source) ? v._source : v);
		var m = stringify(s, void 0, "") + "\n";
		ioStreamWrite(wstream, m, m.length);
	}, {
		logFunc: aLogFunc, 
		batchSize: batchSize, 
		numThreads: numThreads,
		search: search
	});

	wstream.close();
};