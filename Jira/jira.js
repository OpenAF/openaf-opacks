ow.loadObj();

// Check https://docs.atlassian.com/software/jira/docs/api/REST/7.12.0/

var JIRA = function(aJiraURL, aLogin, aPass) {
    this.url = aJiraURL;
    __setUserAgent("Mozilla");
    this.login(aLogin, aPass);
};

// Utils
// ----------------------------------------------------------------
JIRA.prototype.getTemplate = function(aFilename, data, extra) {
    var res = {};

    if (aFilename.match(/\.json$/)) {  
        res = parseJson(templify(io.readFileString(getOPackPath("Jira") + "/templates/" + aFilename), data));
    } else {
        res = af.fromYAML(templify(io.readFileString(getOPackPath("Jira") + "/templates/" + aFilename), data));
    }

    return merge(res, extra);
};

// Session
// ----------------------------------------------------------------

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
// ----------------------------------------------------------------

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

    return $from(this.getProjectIssueTypes(aProjectKey))
    .equals("id", aIssueTypeId)
    .orEquals("name", aIssueTypeId)
    .at(0).fields;
};

JIRA.prototype.getIssueTypeField = function(aProjectKey, aIssueTypeId, aField) {
    return this.getIssueTypeFields(aProjectKey, aIssueTypeId)[aField];
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

JIRA.prototype.createIssue = function(fields) {
    return ow.obj.rest.jsonCreate(this.url + "/rest/api/2/issue/",
        {},
        { fields: fields },
        void 0,
        void 0,
        void 0,
        { cookie: this.session }
    );
};

JIRA.prototype.getStatuses = function(aIssueId) {
    return ow.obj.rest.jsonGet(this.url + "/rest/api/latest/issue/" + aIssueId + "/transitions?expand=transitions.fields",
        {},
        void 0,
        void 0,
        void 0,
        { cookie: this.session }
    ).transitions;
};

JIRA.prototype.updateStatus = function(aIssueId, aStatusId, fields, update) {
    if (isString(aStatusId)) {
        var sts = this.getStatuses(aIssueId);
        var stsS = $from(sts).equals("name", aStatusId).at(0);
        if (isUnDef(stsS)) throw("Status '" + aStatusId + "' not found.");
        aStatusId = stsS.id;
    }

    var data = {
        transition: {
            id: aStatusId
        }
    };

    if (isDef(fields)) {
        data = merge(data, { fields: fields });
    }

    if (isDef(update)) {
        data = merge(data, { update: update });
    }

    return ow.obj.rest.jsonCreate(this.url + "/rest/api/latest/issue/" + aIssueId + "/transitions?expand=transitions.fields",
        {},
        data,
        void 0,
        void 0,
        void 0,
        { cookie: this.session }
    );
};

// Search
// ----------------------------------------------------------------

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

JIRA.prototype.printMyIssues = function(maxResults) {
    return printTable(this.searchMyIssues(maxResults), void 0, true, true);
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