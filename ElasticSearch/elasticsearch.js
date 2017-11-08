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
}

/**
 * <odoc>
 * <key>ElasticSearch.createIndex(aIndex) : Map</key>
 * Tries to create aIndex on Elastic Search and returns the result.
 * </odoc>
 */
ElasticSearch.prototype.createIndex = function(aIndex) {
	ow.loadObj();

	if (isUnDef(aIndex)) throw "Please provide aIndex";

	return ow.obj.rest.jsonSet(this.url + "/" + aIndex, {}, {}, this.user, this.pass);
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

	return ow.obj.rest.jsonRemove(this.url + "/" + aIndex, {}, this.user, this.pass);
}

/**
 * <odoc>
 * <key>ElasticSearch.reIndex(anOriginalIndex, aNewIndex) : Map</key>
 * Tries to copy anOriginalIndex to aNewIndex (reindex) and returns the result.
 * </odoc>
 */
ElasticSearch.prototype.reIndex = function(anOrigIndex, aNewIndex) {
	ow.loadObj();

	if (isUnDef(anOrigIndex) || isUnDef(aNewIndex)) throw "Please provide an original index and the new index name";

	var res = ow.obj.rest.jsonSet(this.url + "/_reindex", {}, { source : { index: anOrigIndex }, dest: { index: aNewIndex }}, this.user, this.pass);

	return res;
}

ElasticSearch.prototype.getClusterHealth = function() {
	ow.loadObj();

	return ow.obj.rest.jsonGet(this.url + "/_cat/health?format=json", {}, this.user, this.pass);
}

ElasticSearch.prototype.excludeNodeIP = function(aIP) {
	ow.loadObj();

	return ow.obj.rest.jsonSet(this.url + "/_cluster/settings", {}, { transient: { "cluster.routing.allocation.exclude._ip": aIP } }, this.user, this.pass);
}

ElasticSearch.prototype.getClusterStats = function() {
	ow.loadObj();

	return ow.obj.rest.jsonGet(this.url + "/_cluster/stats", {}, this.user, this.pass);
}

ElasticSearch.prototype.getPendingTasks = function() {
	ow.loadObj();

	return ow.obj.rest.jsonGet(this.url + "/_cluster/pending_tasks", {}, this.user, this.pass);
}

ElasticSearch.prototype.getNodeStats = function() {
	ow.loadObj();

	return ow.obj.rest.jsonGet(this.url + "/_nodes/stats", {}, this.user, this.pass);
}

ElasticSearch.prototype.getIndices = function() {
	ow.loadObj();

	return ow.obj.rest.jsonGet(this.url + "/_cat/indices?format=json", {}, this.user, this.pass);
}

ElasticSearch.prototype.getNodes = function() {
	ow.loadObj();

	return ow.obj.rest.jsonGet(this.url + "/_cat/nodes?format=json", {}, this.user, this.pass);
}

ElasticSearch.prototype.getCounts = function() {
	ow.loadObj();

	return ow.obj.rest.jsonGet(this.url + "/_cat/count?format=json", {}, this.user, this.pass);
}

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
}

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
}

/**
 * <odoc>
 * <key>ElasticSearch.stopLog()</key>
 * Stops sending all OpenAF logging to ElasticSearch.
 * </odoc>
 */
ElasticSearch.prototype.stopLog = function() {
	stopLog();
	$ch("__log::es").destroy();
}
