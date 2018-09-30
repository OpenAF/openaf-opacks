ow.loadObj();

// Check https://docs.atlassian.com/software/jira/docs/api/REST/7.12.0/

var JIRA = function(aJiraURL, aLogin, aPass) {
    this.url = aJiraURL;
    __setUserAgent("Mozilla");
    this.login(aLogin, aPass);
};

// Session

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

JIRA.prototype.getCurrentUser = function() {
    return ow.obj.rest.jsonGet(this.url + "/rest/auth/1/session",
        {},
        void 0,
        void 0,
        void 0,
        { cookie: this.session }
    );
};

JIRA.prototype.logout = function() {
    return ow.obj.rest.jsonRemove(this.url + "/rest/auth/1/session",
        {},
        void 0,
        void 0,
        void 0,
        { cookie: this.session }
    );
};

// Issues

JIRA.prototype.getProjects = function() {
    return ow.obj.rest.jsonGet(this.url + "/rest/api/2/issue/createmeta",
        {},
        void 0,
        void 0,
        void 0,
        { cookie: this.session }
    ).projects;
};

JIRA.prototype.getProjectsNames = function() {
    return $from(this.getProjects())
           .sort("key")
           .select({ key: "", name: "" });
};

JIRA.prototype.getProjectIssueTypes = function(aProjectKey) {
    _$(aProjectKey).isString("Please provide a project key.");

    return ow.obj.rest.jsonGet(this.url + "/rest/api/2/issue/createmeta?projectKeys=" + aProjectKey + "&expand=projects.issuetypes.fields",
        {},
        void 0,
        void 0,
        void 0,
        { cookie: this.session }
    ).projects[0].issuetypes;
};

JIRA.prototype.getIssueTypeFields = function(aProjectKey, aIssueTypeId) {
    _$(aProjectKey).isString("Please provide a project key.");
    _$(aIssueTypeId).isNumber("Please provide a numeric issue type id.");

    return $from(this.getProjectIssueTypes(aProjectKey))
    .equals("id", aIssueTypeId)
    .at(0).fields;
};

JIRA.prototype.getIssue = function(aIssueId) {
    return ow.obj.rest.jsonGet(this.url + "/rest/api/latest/issue/" + aIssueId,
        {},
        void 0,
        void 0,
        void 0,
        { cookie: this.session });
};

JIRA.prototype.browseIssue = function(aIssueId) {
    var url = this.url + "/browse/" + aIssueId;

    java.awt.Desktop.getDesktop().browse(new java.net.URI(url));
};

// Search

JIRA.prototype.search = function(aJQL, aExtra) {
    return ow.obj.rest.jsonCreate(this.url + "/rest/api/2/search",
        {},
        merge({ jql: aJQL }, aExtra),
        void 0,
        void 0,
        void 0,
        { cookie: this.session });
};

JIRA.prototype.searchMyIssues = function(maxResults) {
    ow.loadFormat();

    var myIssues = this.search("assignee = currentUser() AND resolution = Unresolved order by updated DESC", {
        maxResults: maxResults
    });

    return $from(myIssues.issues).select((r) => { 
        return { 
            key: r.key, 
            status: r.fields.status.name, 
            summary: r.fields.summary,
            created: ow.format.timeago(r.fields.created),
            updated: ow.format.timeago(r.fields.updated),
            priority: r.fields.priority.name
        };
    });
};

// Get info

JIRA.prototype.getStatus = function(aIssueId) {
    if (isUnDef(aIssueId)) aIssueId = "";
    return ow.obj.rest.jsonGet(this.url + "/rest/api/2/status/" + aIssueId,
        {},
        void 0,
        void 0,
        void 0,
        { cookie: this.session }
    );
};

JIRA.prototype.getPriorities = function() {
    return ow.obj.rest.jsonGet(this.url + "/rest/api/2/priority",
        {},
        void 0,
        void 0,
        void 0,
        { cookie: this.session }
    );
};

JIRA.prototype.getServerInfo = function() {
    return ow.obj.rest.jsonGet(this.url + "/rest/api/2/serverInfo",
        {},
        void 0,
        void 0,
        void 0,
        { cookie: this.session }
    );
};