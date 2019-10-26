/**
 * <odoc>
 * <key>PasteBin.PasteBin(aUserKey, aUsername, aPassword)</key>
 * Creates an instance of the PasteBin wrapper providing an API aUserKey and, optionally, a pastebin.com aUsername and aPassword.
 * </odoc>
 */
var PasteBin = function(aUserKey, aUsername, aPassword) {
	this.key    = aUserKey;
	this.url    = "https://pastebin.com/api/api_post.php";
	this.urlBase = "https://pastebin.com/api";

	if (isDef(aUsername) && isDef(aPassword)) this.getUserKey(aUsername, aPassword);
};

PasteBin.prototype.getURL = function(aAction) {
	return this.urlBase + "/api_" + aAction + ".php";
};

PasteBin.prototype.getUserKey = function(aUsername, aPassword) {
	var key = $rest({ urlEncode: true }).post(this.getURL("login"), {
		api_dev_key      : this.key,
		api_user_name    : Packages.openaf.AFCmdBase.afc.dIP(aUsername),
		api_user_password: Packages.openaf.AFCmdBase.afc.dIP(aPassword)
	});

	this.userKey = key;

	return key;
};

/**
 * <odoc>
 * <key>PasteBin.send(aContent, aType, aName, isPrivate, expireDate) : String</key>
 * Given an object or string aContent , the corresponding aType (e.g. json), a title aName, if isPrivate or not and an optional expireDate will return
 * the corresponding pastebin URL. By default, if aContent is a map, aType = "json"; isPrivate = true and expireDate = 10M (10 minutes).\
 * Possible values for expireDate: N (Never), 10M (10 minutes), 1H (1 hour), 1D (1 day), 1W (1 week), 2W (2 weeks), 1M (1 month), 6M (6 months) and 1Y (1 year).
 * If not private it will be unlisted by default. (see more in https://pastebin.com/api#1)
 * </odoc>
 */
PasteBin.prototype.send = function(aContent, aType, aName, isPrivate, expireDate) {
	_$(aContent).$_("Please provide a content to paste.");
	isPrivate = _$(isPrivate).isBoolean().default(true);
	expireDate = _$(expireDate).isString().default("10M");

	if (isMap(aContent)) {
		aContent = stringify(aContent, void 0, "");
		aType = "json";
	}

	return $rest({ urlEncode: true }).post(this.url, {
		api_dev_key          : this.key,
		api_user_key         : this.userKey,
		api_option           : "paste",
		api_paste_code       : aContent,
		api_paste_name       : aName,
		api_paste_private    : (isPrivate ? 2 : 1),
		api_paste_format     : aType,
		api_paste_expire_date: expireDate
	});
};

/**
 * <odoc>
 * <key>PasteBin.delete(aPasteKey) : String</key>
 * Tries to delete a pastebin aPasteKey. Returns a message string.
 * </odoc>
 */
PasteBin.prototype.delete = function(aPasteKey) {
	return $rest({ urlEncode: true }).post(this.url, {
		api_dev_key  : this.key,
		api_user_key : this.userKey,
		api_paste_key: aPasteKey,
		api_option   : "delete"
	});
};

/**
 * <odoc>
 * <key>PasteBin.list(aResultsLimit) : Array</key>
 * Returns a map with a list of pastebins associated with the instance account. 
 * </odoc>
 */
PasteBin.prototype.list = function(aResultsLimit) {
	aResultsLimit = _$(aResultsLimit).isNumber().default(50);
	var res = af.fromXML2Obj($rest({ urlEncode: true }).post(this.getURL("post"), {
		api_option       : "list",
		api_dev_key      : this.key,
		api_user_key     : this.userKey,
		api_results_limit: aResultsLimit
	}));
	if (isDef(res) && isDef(res.paste)) return res.paste;
};

/**
 * <odoc>
 * <key>PasteBin.show(aPasteKey) : Object</key>
 * Tries to retrieve the content for a pastebin aPasteKey (private, unlisted or public).
 * </odoc>
 */
PasteBin.prototype.show = function(aPasteKey) {
	_$(aPasteKey, "key").isString().$_();

	aPasteKey = aPasteKey.replace(/^https?:\/\/pastebin\.com\/+/i, "");
	var res = $rest({ urlEncode: true }).post(this.getURL("raw"), {
		api_option   : "show_paste",
		api_dev_key  : this.key,
		api_user_key : this.userKey,
		api_paste_key: aPasteKey
	});
	if (res == "Bad API request, invalid permission to view this paste or invalid api_paste_key") {
		res = $rest().get("https://pastebin.com/raw/" + aPasteKey);
	}

	if (isDef(res.error) && res.error.responseCode == 404) throw "Not found.";
	return res;
};