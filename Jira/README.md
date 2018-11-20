# JIRA

The JIRA opack provides a wrapper to the JIRA REST API.

## Installation

To install it use OpenAF and execute:

````sh
opack install JIRA
````

## Use examples

### Login in

````javascript
> load("jira.js")
> var jira = new JIRA("https://jira.domain.local", "user", "mypass")
````

### Print user's issues

````javascript
> jira.printMyIssues();
     key    |    status   |     summary     |   created   |    updated   |priority
------------+-------------+-----------------+-------------+--------------+--------
APROJECT-123|In Progress  |A issue 1        | 5 days ago  |30 minutes ago|N/A
APROJECT-134|Open         |A issue 2        |29 days ago  |8 days ago    |N/A
...
````

### Open the browser with an issue

````javascript
> jira.browseIssue("APROJECT-123")
````

### Update the status of an issue

````javascript
> jira.updateStatus("APROJECT-134", "Start Progress")
> jira.updateStatus("APROJECT-123", "Resolve Issue", jira.getTemplate("taskDone.yaml", {}))
````

### Create a new issue

````javascript
> jira.createIssue(jira.getTemplate("taskCreate.yaml", { 
    summary: "A issue 3",
    description: "A new issue 3"
}))
````

### Create a sub issue

````javascript
> jira.createSubIssue("APROJECT-135", jira.getTemplate("subTaskCreate.yaml", {
    summary: "A sub-issue 3.1",
    description: "A new sub-issue 3.1 from issue 3"
}))
````

### Logout

````javascript
> jira.logout()
````