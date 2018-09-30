ow.loadObj();

// Check https://docs.atlassian.com/software/jira/docs/api/REST/7.12.0/

var JIRA = function(aJiraURL, aLogin, aPass) {
    this.url = aJiraURL;
    __setUserAgent("Mozilla");
    this.login(aLogin, aPass);
};

JIRA.prototype.login = function(aLogin, aPass) {
    var ses = ow.obj.rest.jsonCreate(this.url + "/rest/auth/1/session", 
        {}, 
        { username: aLogin, password: Packages.openaf.AFCmdBase.afc.dIP(aPass) }, 
        void 0, 
        void 0, 
        void 0, 
        { },
        false).session;
    
    this.session = ses.name + "=" + ses.value;
};

JIRA.prototype.getIssue = function(aIssueId) {
    return ow.obj.rest.jsonGet(this.url + "/rest/api/latest/issue/" + aIssueId,
        {},
        void 0,
        void 0,
        void 0,
        { cookie: this.session });
};

JIRA.prototype.search = function(aJQL, aExtra) {
    return ow.obj.rest.jsonCreate(this.url + "/rest/api/2/search",
        {},
        merge({ jql: aJQL }, aExtra),
        void 0,
        void 0,
        void 0,
        { cookie: this.sesion });
};

JIRA.prototype.getStatus = function(aIssueId) {
    if (isUnDef(aIssueId)) aIssueId = "";
    return ow.obj.rest.jsonGet(this.url + "/rest/api/2/status/" + aIssueId,
        {},
        void 0,
        void 0,
        void 0,
        { cookie: this.session });
};