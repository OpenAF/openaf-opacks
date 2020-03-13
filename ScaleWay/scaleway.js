var ScaleWay = function(aAccessKey, aAuthToken, aRegion) {
    this.accessKey = _$(aAccessKey, "accessKey").isString().$_();
    this.authToken = _$(aAuthToken, "authToken").isString().$_();
    this.region    = _$(aRegion, "region").isString().default("fr-par-1");

    this.headers = {
        requestHeaders: {
            "X-Auth-Token": this.authToken
        },
        uriQuery: true
    };
};

ScaleWay.prototype.execAPI = function(aVerb, aType, aURISuffix, aParams, aPerPage, aPage) {
    aPerPage   = _$(aPerPage, "perpage").isNumber().default(void 0);
    aPage      = _$(aPage, "page").isNumber().default(void 0);
    aParams    = _$(aParams, "params").isString().default({});
    aURISuffix = _$(aURISuffix, "urisuffix").isString().default("");

    var uri = "";
    switch(aType) {
    case "instance": uri = "/instance/v1/zones/" + this.region; break;
    }

    var url = "http://api.scaleway.com" + uri + aURISuffix;
    switch(aVerb) {
    case "post":
        return $rest(this.headers).post(url, aParams, {
            per_page: aPerPage,
            page    : aPage
        });
    case "get": 
    default   :
        return $rest(this.headers).get(url, merge({
            per_page: aPerPage,
            page    : aPage
        }, aParams));
    }
};

ScaleWay.prototype.SERVERS_listServers = function(aPerPage, aPage) {
    return this.execAPI("get", "instance", "/servers", void 0, aPerPage, aPage);
};

ScaleWay.prototype.SERVERS_listServer = function(aId, aPerPage, aPage) {
    _$(aId, "id").isString().$_();
    return this.execAPI("get", "instance", "/servers/" + aId, void 0, aPerPage, aPage);
};

ScaleWay.prototype.SERVERS_listActions = function(aId, aPerPage, aPage) {
    _$(aId, "id").isString().$_();
    return this.execAPI("get", "instance", "/servers/" + aId + "/action", void 0, aPerPage, aPage);
};

ScaleWay.prototype.SERVERS_performAction = function(aId, aAction) {
    _$(aId, "id").isString().$_();
    return this.execAPI("post", "instance", "/servers/" + aId + "/action", {
        action: aAction
    });
};

ScaleWay.prototype.IPS_list = function() {
    return this.execAPI("get", "instance", "/ips");
};

ScaleWay.prototype.VOLUMES_list = function() {
    return this.execAPI("get", "instance", "/volumes");
};

ScaleWay.prototype.SNAPSHOTS_list = function() {
    return this.execAPI("get", "instance", "/snapshots");
};

ScaleWay.prototype.DASHBOARD = function() {
    return this.execAPI("get", "instance", "/dashboard");  
};