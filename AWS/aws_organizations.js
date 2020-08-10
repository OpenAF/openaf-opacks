// Author: Nuno Aguiar
// Organizations

loadLib("aws_core.js");

/**
 * <odoc>
 * <key>AWS.ORGS_ListAccounts(aRegion) : Array</key>
 * List the organization accounts linked to the current account.
 * \
 * Refer to: https://docs.aws.amazon.com/organizations/latest/APIReference/API_ListAccounts.html\
 * \
 * </odoc>
 */
AWS.prototype.ORGS_ListAccounts = function(aRegion) {
    aRegion = _$(aRegion).isString().default("us-east-1");
    var aURL = "https://organizations." + aRegion + ".amazonaws.com/";
    
    var params = { 
    };
 
    var url = new java.net.URL(aURL);
    var aHost = String(url.getHost());
    var aURI = String(url.getPath());

    var res = [], ar;
    do {
        params.NextToken = (isDef(ar) && isDef(ar.NextToken) ? ar.NextToken : void 0);

        ar = this.postURLEncoded(aURL, aURI, "", params, "organizations", aHost, aRegion, { 
            "X-Amz-Target": "AWSOrganizationsV20161128.ListAccounts"
        }, void 0, "application/x-amz-json-1.1");

        res = res.concat(ar.Accounts);
    } while(isDef(ar.NextToken));

    return res;
 };