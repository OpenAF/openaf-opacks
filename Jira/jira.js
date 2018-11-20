ow.loadObj();

// Check https://docs.atlassian.com/software/jira/docs/api/REST/7.12.0/

/**
 * <odoc>
 * <key>JIRA(aJiraURL, aLogin, aPassword)</key>
 * Creates a new instance of the JIRA object with the provided JIRA URL, login and password (encrypted or not).
 * </odoc>
 */
var JIRA = function(aJiraURL, aLogin, aPass) {
    this.url = aJiraURL;
    __setUserAgent("Mozilla");
    this.login(aLogin, aPass);
};

// Utils
// ----------------------------------------------------------------
/**
 * <odoc>
 * <key>JIRA.listTemplates() : Array</key>
 * List the available templates stored in the folder templates under the opack installation (getOPackPath("Jira")).
 * </odoc>
 */
JIRA.prototype.listTemplates = function() {
    var list = $from(listFilesRecursive(getOPackPath("Jira") + "/templates")).select((r) => {
        return r.filepath;
    });

    return list;
};

/**
 * <odoc>
 * <key>JIRA.getTemplate(aFilename, data, extra) : Map</key>
 * Given aFilename template (that should be under getOPackPath("Jira") + "/templates") will use HandleBars template
 * to fill the "data2 and read the file (either in .json or .yaml). Additionally you can add more map entries with extra.
 * The resulting map will be returned.
 * </odoc>
 */
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

/**
 * <odoc>
 * <key>JIRA.login(aLogin, aPass)</key>
 * Tries to login in the current Jira. Mostly used internally by the JIRA object constructor. Accepts encrypted passwords.
 * </odoc>
 */
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

/**
 * <odoc>
 * <key>JIRA.getCurrentUser() : Map</key>
 * Returns information regarding the current user.
 * </odoc>
 */
JIRA.prototype.getCurrentUser = function() {
    return ow.obj.rest.jsonGet(this.url + "/rest/auth/1/session",
        {},
        void 0,
        void 0,
        void 0,
        { cookie: this.session }
    );
};

/**
 * <odoc>
 * <key>JIRA.logout()</key>
 * Logouts the current user from JIRA.
 * </odoc>
 */
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

/**
 * <odoc>
 * <key>JIRA.getProjects() : Array</key>
 * List the current projects to which the user has access with the corresponding accepted issue types.
 * </odoc>
 */
JIRA.prototype.getProjects = function() {
    return ow.obj.rest.jsonGet(this.url + "/rest/api/2/issue/createmeta",
        {},
        void 0,
        void 0,
        void 0,
        { cookie: this.session }
    ).projects;
};

/**
 * <odoc>
 * <key>JIRA.getProjectsNames() : Array</key>
 * Uses JIRA.getProjects() to produce a simple list of project key and project name.
 * </odoc>
 */
JIRA.prototype.getProjectsNames = function() {
    return $from(this.getProjects())
           .sort("key")
           .select({ key: "", name: "" });
};

/**
 * <odoc>
 * <key>JIRA.getProjectIssueTypes(aProjectKey) : Array</key>
 * Given aProjectKey will return an array of type of issues with the corresponding fields.
 * </odoc>
 */
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

/**
 * <odoc>
 * <key>JIRA.getIssueTypeFields(aProjectKey, aIssueTypeId) : Array</key>
 * Given aProjectKey and aIssueTypeId (for example "Task") returns the corresponding fields.
 * </odoc>
 */
JIRA.prototype.getIssueTypeFields = function(aProjectKey, aIssueTypeId) {
    _$(aProjectKey).isString("Please provide a project key.");

    return $from(this.getProjectIssueTypes(aProjectKey))
    .equals("id", aIssueTypeId)
    .orEquals("name", aIssueTypeId)
    .at(0).fields;
};

/**
 * <odoc>
 * <key>JIRA.getIssueTypeField(aProjectKey, aIssueTypeId, aField) : Array</key>
 * Given aProjectKey, aIssueTypeId and aField returns the corresponding field details using JIRA.getIssueTypeFields.
 * </odoc>
 */
JIRA.prototype.getIssueTypeField = function(aProjectKey, aIssueTypeId, aField) {
    return this.getIssueTypeFields(aProjectKey, aIssueTypeId)[aField];
};

/**
 * <odoc>
 * <key>JIRA.getFieldSuggestions(aFieldName, aPartialFieldValue) : Array</key>
 * Given aFieldName and aPartialFieldValue will return an array of possible value suggestions for that field.
 * </odoc>
 */
JIRA.prototype.getFieldSuggestions = function(aFieldName, aPartialFieldValue) {
    return ow.obj.rest.jsonGet(this.url + "/rest/api/2/jql/autocompletedata/suggestions?fieldName=" + aFieldName + "&fieldValue=" + aPartialFieldValue,
        {},
        void 0,
        void 0,
        void 0,
        { cookie: this.session }
    ).results;
};

/**
 * <odoc>
 * <key>JIRA.getIssue(aIssueId) : Map</key>
 * Returns the JIRA issue information in a map.
 * </odoc>
 */
JIRA.prototype.getIssue = function(aIssueId) {
    return ow.obj.rest.jsonGet(this.url + "/rest/api/latest/issue/" + aIssueId,
        {},
        void 0,
        void 0,
        void 0,
        { cookie: this.session });
};

/**
 * <odoc>
 * <key>JIRA.browseIssue(aIssueId)</key>
 * Opens the default browser in JIRA for the corresponding aIssueId.
 * </odoc>
 */
JIRA.prototype.browseIssue = function(aIssueId) {
    var url = this.url + "/browse/" + aIssueId;

    java.awt.Desktop.getDesktop().browse(new java.net.URI(url));
};

/**
 * <odoc>
 * <key>JIRA.createIssue(fields) : Map</key>
 * Tries to create a JIRA issue with the provided field values. Do create/change and use templates for this (using getTemplate).
 * </odoc>
 */
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

/**
 * <odoc>
 * <key>JIRA.createSubIssue(aParentIssueKey, fields) : Map</key>
 * Given a previously created JIRA issue will create a sub-issue using the provided field values. Do create/change and use templates for this (using getTemplate).
 * </odoc>
 */
JIRA.prototype.createSubIssue = function(aParentIssueKey, fields) {
    return ow.obj.rest.jsonCreate(this.url + "/rest/api/2/issue/",
        {},
        { fields: merge({ parent: { key: aParentIssueKey } }, fields) },
        void 0,
        void 0,
        void 0,
        { cookie: this.session }
    );
};

/**
 * <odoc>
 * <key>JIRA.getStatuses(aIssueId) : Array</key>
 * Returns a list of the possible statuses for the provided aIssueId.
 * </odoc>
 */
JIRA.prototype.getStatuses = function(aIssueId) {
    return ow.obj.rest.jsonGet(this.url + "/rest/api/latest/issue/" + aIssueId + "/transitions?expand=transitions.fields",
        {},
        void 0,
        void 0,
        void 0,
        { cookie: this.session }
    ).transitions;
};

/**
 * <odoc>
 * <key>JIRA.updateStatus(aIssueId, aStatusId, fields, update) : Map</key>
 * Tries to update the status of aIssueId with aStatusId with the provided fields (do use getTemplate for this). You can 
 * add extra fields using the update parameter.
 * </odoc>
 */
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

/**
 * <odoc>
 * <key>JIRA.search(aJQL, aExtra) : Map</key>
 * Performs the corresponding aJQL query. You can also provide extra parameters if needed.
 * </odoc>
 */
JIRA.prototype.search = function(aJQL, aExtra) {
    return ow.obj.rest.jsonCreate(this.url + "/rest/api/2/search",
        {},
        merge({ jql: aJQL }, aExtra),
        void 0,
        void 0,
        void 0,
        { cookie: this.session });
};

/**
 * <odoc>
 * <key>JIRA.searchMyIssues(maxResults) : Array</key>
 * Executes the JQL query "assignee = currentUser() AND resolution = Unresolved order by updated DESC" and returns
 * the result. If maxResults is provided the default value in JIRA will be overridden.
 * </odoc>
 */
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

/**
 * <odoc>
 * <key>JIRA.printMyIssues(maxResults)</key>
 * Uses the searchMyIssues function with the function printTable to output an ASCII table with the user's issues.
 * </odoc>
 */
JIRA.prototype.printMyIssues = function(maxResults) {
    return printTable(this.searchMyIssues(maxResults), void 0, true, true);
};

// Get info

/**
 * <odoc>
 * <key>JIRA.getStatus(aStatusId) : Object</key>
 * Returns a list of a single status (if aStatusId is provided) details.
 * </odoc>
 */
JIRA.prototype.getStatus = function(aStatusId) {
    if (isUnDef(aStatusId)) aStatusId = "";
    return ow.obj.rest.jsonGet(this.url + "/rest/api/2/status/" + aStatusId,
        {},
        void 0,
        void 0,
        void 0,
        { cookie: this.session }
    );
};

/**
 * <odoc>
 * <key>JIRA.getPriorities() : Array</key>
 * Gets a list of the current available priorities.
 * </odoc>
 */
JIRA.prototype.getPriorities = function() {
    return ow.obj.rest.jsonGet(this.url + "/rest/api/2/priority",
        {},
        void 0,
        void 0,
        void 0,
        { cookie: this.session }
    );
};

/**
 * <odoc>
 * <key>JIRA.getServerInfo() : Map</key>
 * Gets the current JIRA server information.
 * </odoc>
 */
JIRA.prototype.getServerInfo = function() {
    return ow.obj.rest.jsonGet(this.url + "/rest/api/2/serverInfo",
        {},
        void 0,
        void 0,
        void 0,
        { cookie: this.session }
    );
};