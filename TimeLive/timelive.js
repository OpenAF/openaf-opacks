ow.loadFormat();
ow.loadObj();

/**
 * <odoc>
 * <key>TimeLive.TimeLive(aBaseURL, aLoginORAuthToken, aPasswordORAPIKey, useAPIAuth)</key>
 * Creates a new instance of the TimeLive object to access a TimeLive using aBaseURL.
 * Expects a login and password or an authToken and an APIKey depending on how you are authenticating.
 * To use the APIKey authentication method useAPIAuth = true.\
 * \
 * To use an APIKey check instructions in: https://www.livetecs.com/timelivexhelp/1/en/topic/timelive-api-authentication
 * </odoc>
 */
var TimeLive = function(aBaseURL, aLogin, aPassword, useAPIAuth) {
    _$(aBaseURL, "URL").isString().$_();

    this.url = aBaseURL;

    this.aLogin  = _$(aLogin, "login").isString().default(void 0);
    this.aPass   = _$(aPassword, "password").isString().default(void 0);
    this.apiauth = _$(useAPIAuth, "useAPIAuth").isBoolean().default(false);

    this.debug = false;

    if (isDef(this.aLogin) && isDef(this.aPass)) this.login();
};

TimeLive.prototype.__convertTextToDate = function(aStringDate, aName, defaultAdj) {
    aName      = _$(aName).isString().default("date");
    defaultAdj = _$(defaultAdj).isNumber().default(0);

    if (isUnDef(aStringDate)) return new Date(now() + defaultAdj);
    if (isDate(aStringDate)) return aStringDate;

    var res = aStringDate;
    try {
        res = ow.format.toDate(aStringDate, "yyyy-MM-dd");
    } catch(e1) {
        try {
            res = ow.format.toDate(aStringDate, "yyyy/MM/dd");
        } catch(e2) {
            throw "Not a valid " + aName + " (yyyy-mm-dd or yyyy/mm/dd).";
        }
    }
    return res;
};

TimeLive.prototype.__convertMapDate2Date = function(anArray) {
    var res = parallel4Array(anArray, v => {
        var keys = Object.keys(v);
        for(var ii in keys) {
            // Check if it can be a date
            if (String(v[keys[ii]]).substr(10,1) == "T" && String(v[keys[ii]]).match(/^\d{4}\-\d{2}\-\d{2}T/)) {
                // Good candidate, try
                try {
                    var n = new Date(v[keys[ii]]);
                    if (isDate(n))
                        v[keys[ii]] = n;
                    else
                        v[keys[ii]] = ow.format.toDate(v[keys[ii]], "yyyy-MM-dd'T'HH:mm:ss.SX");
                } catch(e1) {
                    try {
                        v[keys[ii]] = ow.format.toDate(v[keys[ii]], "yyyy-MM-dd'T'HH:mm:ss.SSX");
                    } catch(e2) {
                        // forget it
                    }
                }
            }
        }
        return v;
    });

    return res;
};

TimeLive.prototype.login = function() {
    if (this.apiauth) {
        this.headers = {
            "AuthToken": this.aLogin,
            "APIKey"   : this.aPass
        };
    } else {
        var h = new ow.obj.http();

        // Login
        var res = h.get(this.url + "/Default.aspx");
        if (isUnDef(res.responseCode) || res.responseCode != 200) throw "Problem accessing login page: " + stringify(res);
    
        // Get viewState and viewStateGenerator
        var iniLogin = res.response;
        var viewState          = iniLogin.match(/id="__VIEWSTATE" value="([^"]*)"/)[1];
        var viewStateGenerator = iniLogin.match(/id="__VIEWSTATEGENERATOR" value="([^"]*)"/)[1];
    
        // Try to login
        res = $rest({ urlEncode: true, httpClient: h }).post(this.url + "/Default.aspx", {
            __EVENTTARGET       : "btnLogin", 
            __EVENTARGUMENT     : "", 
            __VIEWSTATE         : viewState, 
            __VIEWSTATEGENERATOR: viewStateGenerator, 
            username           : Packages.openaf.AFCmdBase.afc.dIP(this.aLogin), 
            password           : Packages.openaf.AFCmdBase.afc.dIP(this.aPass), 
            ddlUserInterfaceLanguage: 0
        });
    
        if (isMap(res) && isDef(res.error)) throw "Problem posting login: " + stringify(res);
    
        // Execute redirect
        res = $rest({ urlEncode: true, httpClient: h }).post(this.url + "/Employee/Default.aspx", {
            __EVENTTARGET       : "btnLogin", 
            __EVENTARGUMENT     : "", 
            __VIEWSTATE         : viewState, 
            __VIEWSTATEGENERATOR: viewStateGenerator, 
            username           : Packages.openaf.AFCmdBase.afc.dIP(this.aLogin), 
            password           : Packages.openaf.AFCmdBase.afc.dIP(this.aPass), 
            ddlUserInterfaceLanguage: 0
        });
    
        if (isMap(res) && isDef(res.error)) throw "Problem retrieving access token: " + stringify(res);
    
        // Retrieve access token
        this.accessToken = String(res.match(/data: { AccessToken: '([^']+)'/)[1]);
        this.accountEmployeeId = Number(res.match(/var accountEmployeeId = '([^']+)'/)[1]);
    
        this.headers = {
            AccessToken: this.accessToken
        };
    }
};

TimeLive.prototype.logout = function() {
    // Not implemented as AccessToken survives until session timeout and API authentication doesn't
    // implement logout.
    /*
    res = $rest({ urlEncode: true, httpClient: h }).post(this.url + "Employee/Default.aspx", {
        __EVENTTARGET       : "ctl00$ctl00$ctl00$btnLogout", 
        __EVENTARGUMENT     : "", 
        __VIEWSTATE         : viewState, 
        __VIEWSTATEGENERATOR: viewStateGenerator
    });
    */
};

TimeLive.prototype.apiGet = function(aURI, aParams) {
    if (this.debug) {
        print("API GET: " + this.url + "/api/" + aURI + "\n" + stringify(aParams));
    }
    var res = $rest({ requestHeaders: this.headers })
              .get(this.url + "/api/" + aURI, aParams);

    if (isArray(res)) res = this.__convertMapDate2Date(res);

    return res;
};

TimeLive.prototype.apiPost = function(aURI, aParams) {
    if (this.debug) {
        print("API POST: " + this.url + "/api/" + aURI + "\n" + stringify(aParams));
    }
    return $rest({ requestHeaders: this.headers })
           .post(this.url + "/api/" + aURI, aParams);
};

TimeLive.prototype.REFERENCE_getProjects      = function() { return this.apiGet("Projects"); };
TimeLive.prototype.REFERENCE_getTasks         = function() { return this.apiGet("Tasks"); };
TimeLive.prototype.REFERENCE_getEmployees     = function() { return this.apiGet("Employees"); };
TimeLive.prototype.REFERENCE_getDepartments   = function() { return this.apiGet("departments"); };
TimeLive.prototype.REFERENCE_getEmployeeTypes = function() { return this.apiGet("EmployeeTypes"); };
TimeLive.prototype.REFERENCE_getLocations     = function() { return this.apiGet("Locations"); };
TimeLive.prototype.REFERENCE_getProjectTypes  = function() { return this.apiGet("ProjectTypes"); };
TimeLive.prototype.REFERENCE_getStatuses      = function() { return this.apiGet("statuses"); };
TimeLive.prototype.REFERENCE_getWorktypes     = function() { return this.apiGet("Worktypes"); };

/**
 * <odoc>
 * <key>TimeLive.TIMESHEET_getById(aId) : Map</key>
 * Retrieves a timesheet give it's unique aId.
 * </odoc>
 */
TimeLive.prototype.TIMESHEET_getById = function(aId) {
    _$(aId, "id").isString().$_();
    return this.apiGet("Timesheets/" + aId);
};

/**
 * <odoc>
 * <key>TimeLive.TIMESHEET_getPeriod(aDate, aEmployeeId) : Map</key>
 * Returns the current timesheet period information including the id of any active timesheet and 
 * it's status for aEmployeeId (defaults to the current employee).
 * </odoc>
 */
TimeLive.prototype.TIMESHEET_getPeriod = function(aSingleDate, aEmployeeId) {
    aSingleDate = this.__convertTextToDate(aSingleDate);

    if (isUnDef(aEmployeeId)) {
        return this.apiGet("Timesheets/GetTimesheetPeriod/" + ow.format.fromDate(aSingleDate, "yyyy/MM/dd"));
    } else {
        return this.apiGet("Timesheets/GetTimesheetPeriodByEmployeeId/" + aEmployeeId + "/" + ow.format.fromDate(aSingleDate, "yyyy/MM/dd"));
    }
};

/**
 * <odoc>
 * <key>TimeLive.TIMESHEET_getForPeriod(aBeginDate, aEndDate, aOutputType, aApprovalStatus) : Array</key>
 * Retrieves all available timesheets for a period starting from aBeginDate to aEndDate.
 * Possible values for aOutputType:\
 * \
 *   1 - Only entered times (default)\
 *   2 - Both\
 *   3 - Not entered\
 * \
 * Possible values for aApprovalStatus:\
 * \
 *   0 - All Timesheet Periods\
 *   1 - All Open Timesheet Periods (default)\
 *   2 - Not Submitted\
 *   3 - Submitted\
 *   4 - Approved\
 *   5 - Rejected\
 * \
 * </odoc>
 */
TimeLive.prototype.TIMESHEET_getForPeriod = function(aBeginDate, aEndDate, aOutputType, aApprovalStatus) {
    aBeginDate = this.__convertTextToDate(aBeginDate, "begin date");
    aEndDate   = this.__convertTextToDate(aEndDate, "end date", (1000 * 60 * 60 * 24 * 7));

    aOutputType     = _$(aOutputType, "output type").isNumber().default(1);
    aApprovalStatus = _$(aApprovalStatus, "approvalStatus").isNumber().default(1);

    return this.apiGet("Timesheets/TimeEntryPeriodList/" + ow.format.fromDate(aBeginDate, "yyyy-MM-dd") + "/" + ow.format.fromDate(aEndDate, "yyyy-MM-dd") + "?" + $rest().query({
        OutputType: aOutputType,
        ApprovalStatus: aApprovalStatus
    }));
};

/**
 * <odoc>
 * <key>TimeLive.TIMESHEET_getEntryDetailsByDateRange(aBeginDate, aEndDate, aEmployeeId) : Array</key>
 * Get the timesheet entries detail for a specific aEmployeeId (defaults to the current) for a period of time
 * between aBeginDate and aEndDate (defaults to today up to 7 days from today). If aEmployeeId = "ALL" it will
 * retrieve for all employees.
 * </odoc>
 */
TimeLive.prototype.TIMESHEET_getEntryDetailsByDateRange = function(aBeginDate, aEndDate, aEmployeeId) {
    aBeginDate  = this.__convertTextToDate(aBeginDate, "begin date");
    aEndDate    = this.__convertTextToDate(aEndDate, "end date", (1000 * 60 * 60 * 24 * 7));

    aEmployeeId = _$(aEmployeeId, "employee id").default(this.accountEmployeeId);

    if (String(aEmployeeId).toUpperCase() == "ALL") {
        return this.apiGet("Timesheets/GetAllTimeEntriesByDateRange/" + ow.format.fromDate(aBeginDate, "yyyy-MM-dd") + "/" + ow.format.fromDate(aEndDate, "yyyy-MM-dd"));
    } else {
        return this.apiGet("Timesheets/TimeEntriesByEmployeeIdAndDateRange/" + aEmployeeId + "/" + ow.format.fromDate(aBeginDate, "yyyy-MM-dd") + "/" + ow.format.fromDate(aEndDate, "yyyy-MM-dd"));
    }
};

/**
 * <odoc>
 * <key>TimeLive.TIMESHEET_getEntryDetailsByDate(aDate) : Array</key>
 * Get the timesheet entries detail for a specific aDate (defaults to today) for the current employee.
 * </odoc>
 */
TimeLive.prototype.TIMESHEET_getEntryDetailsByDate = function(aSingleDate) {
    aSingleDate = this.__convertTextToDate(aSingleDate);

    return this.apiGet("Timesheets/GetTimeEntryDetail/" + ow.format.fromDate(aSingleDate, "yyyy/MM/dd"));
};

/**
 * <odoc>
 * <key>TimeLive.TIMESHEET_getEntriesByDateRange(aBeginDate, aEndDate, aEmployeeId, isApproved, isRejected, isSubmitted) : Array</key>
 * Retrieves all entries between a provided aBeginDate and aEndDate (defaults from today to to today + 7 days) for a specific aEmployeeId (defaults to the current)
 * listing only entries filtered by booleans isApproved, isRejected and isSubmitted.
 * </odoc>
 */
TimeLive.prototype.TIMESHEET_getEntriesByDateRange = function(aBeginDate, aEndDate, aEmployeeId, isApproved, isRejected, isSubmitted) {
    aBeginDate  = this.__convertTextToDate(aBeginDate, "begin date");
    aEndDate    = this.__convertTextToDate(aEndDate, "end date", (1000 * 60 * 60 * 24 * 7));

    isApproved  = _$(isApproved).isBoolean().default(false);
    isRejected  = _$(isRejected).isBoolean().default(false);
    isSubmitted = _$(isSubmitted).isBoolean().default(false);

    aEmployeeId = _$(aEmployeeId).default(this.accountEmployeeId);

    return this.apiGet("Timesheets/GetTimeEntries/" + aEmployeeId + "/" + ow.format.fromDate(aBeginDate, "yyyy-MM-dd") + "/" + ow.format.fromDate(aEndDate, "yyyy-MM-dd") + "?" + $rest().query({
        Approved : isApproved,
        Rejected : isRejected,
        Submitted: isSubmitted
    }));
};

// https://www.livetecs.com/timelivexhelp/1/en/topic/timelive-api-timesheet-api
/**
 * <odoc>
 * <key>TimeLive.TIMESHEET_setEntry(aSingleDate, aProjectId, aProjectTaskId, aTotalTime) : Map</key>
 * Tries to insert or update a timesheet entry on a specific aSingleDate (defaults to today) for aProjectId, aProjectTaskId with aTotalTime (using the format "hh:mm")
 * returning the result of the operation.
 * </odoc>
 */
TimeLive.prototype.TIMESHEET_setEntry = function(aSingleDate, aProjectId, aProjectTaskId, aTotalTime) {
    aSingleDate = this.__convertTextToDate(aSingleDate);

    _$(aProjectId, "project id").isNumber().$_();
    _$(aProjectTaskId, "project task id").isNumber().$_();
    _$(aTotalTime, "total time").isString().$_();

    var extra = "";
    var res = this.TIMESHEET_getEntryDetailsByDate(aSingleDate);
    if (isArray(res) && res.length > 0) {
        var entry = $from(res)
                    .equals("AccountProjectID", aProjectId)
                    .equals("AccountProjectTaskID", aProjectTaskId)
                    .at(0);
        if (isDef(entry) && isDef(entry.AccountEmployeeTimeEntryID)) {
            extra = "/" + entry.AccountEmployeeTimeEntryID;
        }
    }

    return this.apiPost("Timesheets" + extra, {
        AccountProjectId: aProjectId,
        AccountProjectTaskId: aProjectTaskId,
        TotalTime: aTotalTime,
        Year: Number(ow.format.fromDate(aSingleDate, "yyyy")),
        Month: Number(ow.format.fromDate(aSingleDate, "MM")),
        Day: Number(ow.format.fromDate(aSingleDate, "dd"))
    });
};

/**
 * <odoc>
 * <key>TimeLive.TIMESHEET_submit(employeeTimeEntryPeriodId, anEmployeeId) : Map</key>
 * Tries to submit a specific employeeTimeEntryPeriodId for anEmployeeId (defaults to the current employee).
 * </odoc>
 */
TimeLive.prototype.TIMESHEET_submit = function(aAccountEmployeeTimeEntryPeriodId, aEmployeeId) {
    _$(aAccountEmployeeTimeEntryPeriodId, "employeeTimeEntryPeriodId").regexp(/[0-9A-Za-z]{8}-[0-9A-Za-z]{4}-[0-9A-Za-z]{4}-[0-9A-Za-z]{4}-[0-9A-Za-z]{12}/).$_();

    // Workaround error for own timesheet
    aEmployeeId = _$(aEmployeeId).isNumber().default(this.accountEmployeeId);

    var extra;
    if (isUnDef(aEmployeeId)) {
        extra = "/" + aAccountEmployeeTimeEntryPeriodId;
    } else {
        extra = "/" + aEmployeeId + "/" + aAccountEmployeeTimeEntryPeriodId;
    }

    return this.apiGet("Timesheets/SubmitTimesheetByEmployeeId" + extra);
};

/**
 * <odoc>
 * <key>TimeLive.TIMESHEET_approveOrReject(employeeTimeEntryPeriodId, shouldReject) : Map</key>
 * Tries to approve or reject an employeeTimeEntryPeriodId. By default if shouldReject is not defined or false it will approve. If shouldReject = true
 * it will reject the timesheet.
 * </odoc>
 */
TimeLive.prototype.TIMESHEET_approveOrReject = function(aAccountEmployeeTimeEntryPeriodId, shouldReject) {
    _$(aAccountEmployeeTimeEntryPeriodId, "employeeTimeEntryPeriodId").regexp(/[0-9A-Za-z]{8}-[0-9A-Za-z]{4}-[0-9A-Za-z]{4}-[0-9A-Za-z]{4}-[0-9A-Za-z]{12}/).$_();
    shouldReject = _$(shouldReject, "shouldReject").isBoolean().default(false);

    var status = "Approve";
    if (shouldReject) status = "Reject";

    return this.apiPost("Timesheets/ApproveTimeSheet", {
        TimeEntryPeriodId: aAccountEmployeeTimeEntryPeriodId,
        Status: status
    });
};