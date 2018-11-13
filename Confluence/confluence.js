ow.loadObj();

// Check https://docs.atlassian.com/ConfluenceServer/rest/6.12.2/

var Confluence = function(aConfluenceURL, aLogin, aPass) {
    this.url = aConfluenceURL;
    this.__h = new ow.obj.http();
    this.login(aLogin, aPass);
};

// Users
// ----------------------------------------------------------------

Confluence.prototype.login = function(aLogin, aPass) {
    var ses = ow.obj.rest.jsonCreate(this.url + "/dologin.action", 
        {}, 
        { os_username   : aLogin, 
          os_password   : Packages.openaf.AFCmdBase.afc.dIP(aPass),
          login         : "Login",
          os_destination: "" }, 
        void 0, void 0, void 0, 
        { "Content-Type": "application/x-www-form-urlencoded" },
        true, this.__h);
};

Confluence.prototype.getCurrentUser = function() {
    return ow.obj.rest.jsonGet(this.url + "/rest/api/user/current",
        void 0, void 0, void 0, void 0, void 0, this.__h
    );
};

Confluence.prototype.logout = function() {
    ow.obj.rest.jsonGet(this.url + "/logout.action",
        void 0, void 0, void 0, void 0, void 0, this.__h
    );
};

Confluence.prototype.getUser = function(aUser) {
    return ow.obj.rest.jsonGet(this.url + "/rest/api/user?" + ow.obj.rest.writeQuery( { username: aUser } ), 
        void 0, void 0, void 0, void 0, void 0, this.__h
    );
};

// Spaces 
// ----------------------------------------------------------------

Confluence.prototype.getSpaces = function(aLimit) {
    return ow.obj.rest.jsonGet(this.url + "/rest/api/space?" + ow.obj.rest.writeQuery( { limit: aLimit } ),
        void 0, void 0, void 0, void 0, void 0, this.__h
    );
};

// Content
// ----------------------------------------------------------------

Confluence.prototype.getContent = function(aSpace, aTitle, aLimit) {
    return ow.obj.rest.jsonGet(this.url + "/rest/api/content?" + ow.obj.rest.writeQuery( {
        spaceKey: aSpace,
        title   : aTitle,
        expand  : "space,body.view,version,container",
        limit   : aLimit
    } ),
    void 0, void 0, void 0, void 0, void 0, this.__h);
};