loadLib("gcp_core.js")

GCP.prototype.IAM_GetRoles = function(pageToken, extra) {
    pageToken = _$(pageToken, "pageToken").isString().default(__)
    extra     = _$(extra, "extra").isMap().default(__)

    return $rest(this.getHeaders()).get("https://iam.googleapis.com/v1/roles", merge(extra, {
        pageToken: pageToken
    }))
}