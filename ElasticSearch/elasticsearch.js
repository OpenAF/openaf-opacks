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
 * <key>ElasticSearch.getIndexMapping(aIndex) : Map</key>
 * Retrieves the current mapping of aIndex.
 * </odoc>
 */
ElasticSearch.prototype.getIndexMapping = function(aIndex) {
	ow.loadObj();

	var res = ow.obj.rest.jsonGet(es.url + "/" + aIndex + "/_mapping");
	if (isDef(res[aIndex])) {
		return res[aIndex];
	} else {
		return void 0;
	}
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
		res = ow.obj.rest.jsonCreate(this.url + "/_reindex" + extra, {}, merge({ source: { index: anOrigIndex }, dest: { index: aNewIndex } }, extraOptions), this.user, this.pass);
		var t = 1000;
		do {
			sleep(t);
			var task = this.getTask(res.task);
			var tr = taskCallback(task);

			if (isDef(tr)) t = tr;
		} while (isDef(task) && t > 0)
		return;
	} else {
		res = ow.obj.rest.jsonCreate(this.url + "/_reindex" + extra, {}, merge({ source: { index: anOrigIndex }, dest: { index: aNewIndex } }, extraOptions), this.user, this.pass);
	}

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

	return ow.obj.rest.jsonCreate(this.url + "/" + aIndex + "/_search?scroll=" + aTime, {}, aSearchJSON);
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

	return ow.obj.rest.jsonCreate(this.url + "/_search/scroll", {}, {
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

	return ow.obj.rest.jsonRemove(this.url + "/_search/scroll", {}, { scroll_id: aScrollMap._scroll_id });
};

/**
 * <odoc>
 * <key>ElasticSearch.deleteAllScrols() : Map</key>
 * Tries to delete all active scrollable result set previously created on the cluster.
 * </odoc>
 */
ElasticSearch.prototype.deleteAllScrolls = function() {
	ow.loadObj();

	return ow.obj.rest.jsonRemove(this.url + "/_search/scroll/_all", {}, {});
};

/**
 * <odoc>
 * <key>ElasticSearch.getNodesStats() : Map</key>
 * Retrieves statistics (including number of scrollable result sets) for all cluster nodes.
 * </odoc>
 */
ElasticSearch.prototype.getNodesStats = function() {
	ow.loadObj();

	return ow.obj.rest.jsonGet(this.url + "/_nodes/stats/indices/search", {}, {});
};

/**
 * <odoc>
 * <key>ElasticSearch.exportIndex(aIndex, aOutputFunc, aMap)</key>
 * Given aIndex will bulk export all documents using the aOutputFunc and calling providing each document as a parameter. Optionally if aMap.aLogFunc is
 * provided it will be called with a map containing op (e.g. init, start, error and done), the threadId and totalThread created. The parameter aMap.aBatchSize
 * allows to define a different number of documents sent per bulk call in each thread (defaults to 100). The parameter aMap.aNumThreads allows to specify the 
 * number of threads that will be used (defaults to the number of cores detected).
 * </odoc>
 */
ElasticSearch.prototype.exportIndex = function(aIndex, aOutputFunc, aMap) {
	aMap = _$(aMap).isMap().default({});
	var aLogFunc = aMap.logFunc, batchSize = aMap.batchSize, numThreads = aMap.numThreads;
	
	var __batchSize = _$(batchSize).isNumber("BatchSize needs to be a number.").default(100);
	var __threads   = _$(numThreads).isNumber("Threads needs to be a number.").default(getNumberOfCores());
	var __index     = _$(aIndex).isString("Index needs to be a string.").$_("Please provide an index pattern aIndex=something*");
	var func        = _$(aOutputFunc).isFunction("OutputFunc needs to be a function.").$_("Please provide aOutputFunc");
	if (isUnDef(aLogFunc) || !isFunction(aLogFunc)) {
		aLogFunc = () => {};
	}

	var __iniBulk = [];
	for(var ii = 0; ii < __threads; ii++) {
        var res = this.createScroll(__index, void 0, __batchSize, void 0, ii, __threads);
        res.__index = ii + 1;
		__iniBulk.push(res);
		aLogFunc({
			op: "init",
			threadId: res.__index,
			totalThread: __iniBulk[ii].hits.total
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
					aOutputFunc(v._source);
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
 * </odoc>
 */
ElasticSearch.prototype.importFile2Index = function(aFnIndex, aFilename, aMap) {
	ow.loadObj();
	aMap = _$(aMap).isMap().default({});
	var aFnId = aMap.aFnId, idKey = aMap.idKey, aTransformFn = aMap.transformFn, aLogFunc = aMap.logFunc, batchSize = aMap.batchSize;

	if (isUnDef(aLogFunc)) {
		aLogFunc = (r) => {
			if (r.op == "error") sprintErr(r);
		};
	}
	
	var rstream = io.readFileStream(aFilename);
	var parent = this;
	var data = "", cdata = 0;

	batchSize = _$(batchSize).isNumber().default(9 * 1024 * 1024);
	aIndex = (isFunction(aFnIndex) ? aFnIndex : () => { return aFnIndex; });
	aFnId = _$(aFnId).isFunction().default((j) => { return sha1(stringify(j)); });
	idKey = _$(idKey).default("id");
	_$(aTransformFn).isFunction();

	if (isUnDef(aLogFunc) || !isFunction(aLogFunc)) {
			aLogFunc = () => {};
	}

	var res;
	function sendBulk(tdata) {
			ops.push($do((_s,_f) => {
					var uuid = genUUID();
					if (isDef(aLogFunc)) aLogFunc({
							op: "start",
							uuid: uuid,
							size: tdata.length
					});
					try {
					   var h = new ow.obj.http();
					   if (isDef(parent.user)) h.login(parent.user, parent.pass);
					   res = h.exec(parent.url + "/_bulk", "POST", tdata, { "Content-Type": "application/json" });
					   if (jsonParse(res.response).errors) throw "Errors on bulk operation";
					   if (isDef(aLogFunc)) aLogFunc({
							op: "done",
							uuid: uuid,
							size: tdata.length,
							result: jsonParse(res.response)
					   });
					} catch(e) {
					   _f({ e: e, uuid: uuid});
					}
			}).catch((e) => {
					try{
					if (isDef(aLogFunc)) aLogFunc({
							op: "error",
							uuid: e.uuid,
							exception: e.e
					});
					}catch(ee) { sprint(ee); }
			}));
	}

	var ops = [];
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
				sendBulk(String(data));
				data = "";
		}
		data += tmp;
		cdata++;
	});

	if (data != "") {
			sendBulk(String(data));
			data = "";
	}
	rstream.close();
	$doWait($doAll(ops));

	return cdata;
};

/**
 * <odoc>
 * <key>ElasticSearch.exportIndex2File(aIndex, aFilename, aLogFunc, aBatchSize, aNumThreads)</key>
 * Given the provided aIndex uses ElasticSearch.exportIndex to generate a NDJSON on aFilename. Additionally you can provide aMap.logFunc, aMap.batchSize and
 *  aMap.numThreads. See help for ElasticSearch.exportIndex for more.
 * </odoc>
 */
ElasticSearch.prototype.exportIndex2File = function(aIndex, aFilename, aMap) {
	aMap = _$(aMap).isMap().default({});
	var aLogFunc = aMap.logFunc, batchSize = aMap.batchSize, numThreads = aMap.numThreads;

	if (isUnDef(aLogFunc)) {
		aLogFunc = (r) => {
			if (r.op == "error") sprintErr(r);
		};
	}

	var wstream = io.writeFileStream(aFilename);

	var parent = this;
	this.exportIndex(aIndex, function(v) {
		var s = (isDef(v._source) ? v._source : v);
		var m = stringify(s, void 0, "") + "\n";
		ioStreamWrite(wstream, m, m.length, false);
	}, {
		logFunc: aLogFunc, 
		batchSize: batchSize, 
		numThreads: numThreads
	});

	wstream.close();
};
