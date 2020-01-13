# TimeLive

This oPack is a work-in-progress to provide a wrapper for the timesheet API for LiveTec's TimeLive web application. It can authenticate using the standard employee web access or through an API key. Currently the functionality between the two authentication methods is the same.

## Install

To install just type:

````bash
opack install timelive
````

## Using it

To invoke the library just add on the start of your OpenAF execution:

````javascript
loadLib("timelive.js");
````

Then you have to create an object. 
If you are using the regular employee web access:

````javascript
var tl = new TimeLive(theLoginURLWithoutDefaultASPX, yourLogin, yourPassword)
````

_Note: you can use the "encryptText" command on the openaf-console to encrypt you login and/or password._

If you are using an API key:

````javascript
var tl = new TimeLive(theLoginURLWithoutDefaultASPX, AuthToken, APIKey, true);
````

The following functions are currently available (each might require the appropriate permissions of the user or AuthToken used):

| Function | Description |
|----------|-------------|
| TIMESHEET_approveOrReject(anEmployeeTimeEntryPeriodId, shouldReject) | Approves or rejects a specific timesheet. |
| TIMESHEET_setTime(aSingleDate, aProjectId, aProjectTaskId, aTotalTime) | Inserts or updates a timesheet entry on a date for a project and a task with the provide time. |
| TIMESHEET_submit(anEmployeeTimeEntryPeriodId, aEmployeeId) | Submits an employee time entry period id for a specific employee id (or current). |
| TIMESHEET_getById(aId) | Retrieves a timesheet by id. |
| TIMESHEET_getEntriesByDateRange(aBeginDate, aEndDate, aEmployeeId, isApproved, isRejected, isSubmitted) | Retrieves the entries of timesheets within the provided date range by status. |
| TIMESHEET_getEntryDetailsByDate(aSingleDate) | Retrieves all entries of timesheets for a specific date for the current employee. |
| TIMESHEET_getEntryDetailsByDateRange(aBeginDate, aEndDate, aEmployeeId) | Retrieves all entries of timesheets, for a specific employee, within a date range. |
| TIMESHEET_getForPeriod(aBeginDate, aEndDate, aOutputType, aApprovalStatus) | Retrieves all available timesheets with entered and/or not entered times and specific approval status within a range of dates. |
| TIMESHEET_getPeriod(aSingleDate, aEmployeeID) | Gets the timesheet for a specific date and employee. |
| REFERENCE_getDepartments() | Gets a list of departments. |
| REFERENCE_getEmployeeTypes() | Gets a list of employee types. |
| REFERENCE_getLocations() | Gets a list of locations. |
| REFERENCE_getProjectTypes() | Gets a list of project types. |
| REFERENCE_getProjects() | Gets a list of projects. |
| REFERENCE_getStatuses() | Gets a list of statuses. |
| REFERENCE_getTasks() | Gets a list of tasks. |
| REFERENCE_getWorktypes() | Gets a list of work types. |

## Examples

### Entering times

````javascript
var projId = $from(tl.REFERENCE_getProjects()).equals("ProjectCode", "12345ABC.678.90").at(0).AccountProjectId;
var taskId = $from(tl.REFERENCE_getTasks()).equals("TaskName", "Others : Things").at(0).AccountProjectTaskId;
sprint(tl.TIMESHEET_setEntry("2020-01-15", projId, taskId, "01:00"));
````

### Submitting times for the current account

````javascript
var timesheets = $from(tl.TIMESHEET_getForPeriod("2020-01-13", "2020-01-20")).equals("AccountEmployeeId", tl.accountEmployeeId).select();
sprint(tl.TIMESHEET_submit(timesheets[0].AccountEmployeeTimeEntryPeriodId, tl.accountEmployeeId));
````

### Getting employee ids to be approved by a manager

````javascript
var employees = tl.REFERENCE_getEmployees();
var managerId = $from(employees).equals("EMailAddress", "manager@company.com").at(0);

var reportees = $from(employees).equals("EmployeeManagerId", managerId.AccountEmployeeId).select(r => r.AccountEmployeeId);
sprint(reportees);
````

### Getting the timesheets submitted (not approved or rejected), since the beggining of the year, for an employee id

````javascript
var timesheets = $from(tl.TIMESHEET_getForPeriod("2020-01-01", new Date(), void 0, 3)).equals("AccountEmployeeId", employeeId).select();
````

### Checking the a timesheet entries

````javascript
var entries = $from(tl.TIMESHEET_getById(timesheets[0].AccountEmployeeTimeEntryPeriodId));
````

### Approving a timesheet

````javascript
sprint(tl.TIMESHEET_approveOrReject(timesheets[0].AccountEmployeeTimeEntryPeriodId, "Approve"));
````