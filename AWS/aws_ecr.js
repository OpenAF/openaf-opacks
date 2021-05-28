// Author: Nuno Aguiar
// ECR

loadLib("aws_core.js");

/**
 * <odoc>
 * <key>AWS.ECR_GetAuthorizationToken(aRegion, registryIds) : Map</key>
 * Gets an authorization token
 * </odoc>
 */
AWS.prototype.ECR_GetAuthorizationToken = function(aRegion) {
    aRegion     = _$(aRegion).isString().default("us-east-1");
 
    var res = this.post("ecr", aRegion, __, "", {
    }, { "X-Amz-Target": "AmazonEC2ContainerRegistry_V20150921.GetAuthorizationToken" }, __, "application/x-amz-json-1.1");
 
    if (isArray(res.authorizationData)) res = res.authorizationData[0];
    return res;
}; 

AWS.prototype.ECR_DescribeRegistry = function(aRegion) {
    aRegion     = _$(aRegion).isString().default("us-east-1");
 
    var res = this.post("ecr", aRegion, __, "", {
    }, { "X-Amz-Target": "AmazonEC2ContainerRegistry_V20150921.DescribeRegistry" }, __, "application/x-amz-json-1.1");
 
    return res;
}; 

AWS.prototype.ECR_DescribeRepositories = function(aRegion, registryId, maxResults, nextToken, repositoryNames) {
    aRegion     = _$(aRegion).isString().default("us-east-1");
    maxResults  = _$(maxResults).isNumber().default(__);
    nextToken   = _$(nextToken).isString().default(__);
    registryId  = _$(registryId).isString().default(__);
    repositoryNames = _$(repositoryNames).isArray().default(__);
 
    var res = this.post("ecr", aRegion, __, "", {
        maxResults     : maxResults,
        nextToken      : nextToken,
        registryId     : registryId,
        repositoryNames: repositoryNames
    }, { "X-Amz-Target": "AmazonEC2ContainerRegistry_V20150921.DescribeRepositories" }, __, "application/x-amz-json-1.1");
 
    return res;
}; 

AWS.prototype.ECR_dockerLogin = function(aRegion, aRegistry) {
    var res = this.ECR_GetAuthorizationToken(aRegion);
    _$(aRegistry, "aRegistry").isString().$_();

    if (isDef(res.authorizationToken)) {
        $sh(["docker", "login", "--username", "AWS", "--password", res.authorizationToken, aRegistry]).prefix("docker").get();
    }
};

/**
 * <odoc>
 * <key>AWS.ECRPublic_GetAuthorizationToken(aRegion, registryIds) : Map</key>
 * Gets an authorization token
 * </odoc>
 */
 AWS.prototype.ECRPublic_GetAuthorizationToken = function(aRegion) {
    aRegion     = _$(aRegion).isString().default("us-east-1");
 
    var res = this.post("ecr-public", aRegion, __, "", {
    }, { "X-Amz-Target": "SpencerFrontendService.GetAuthorizationToken" }, __, "application/x-amz-json-1.1");
 
    if (isMap(res.authorizationData)) res = res.authorizationData;
    return res;
}; 

AWS.prototype.ECRPublic_DescribeRegistries = function(aRegion) {
    aRegion     = _$(aRegion).isString().default("us-east-1");
 
    var res = this.post("ecr-public", aRegion, __, "", {
    }, { "X-Amz-Target": "SpencerFrontendService.DescribeRegistries" }, __, "application/x-amz-json-1.1");
 
    return res;
}; 

AWS.prototype.ECRPublic_DescribeRepositories = function(aRegion, registryId, maxResults, nextToken, repositoryNames) {
    aRegion     = _$(aRegion).isString().default("us-east-1");
    maxResults  = _$(maxResults).isNumber().default(__);
    nextToken   = _$(nextToken).isString().default(__);
    registryId  = _$(registryId).isString().default(__);
    repositoryNames = _$(repositoryNames).isArray().default(__);
 
    var res = this.post("ecr-public", aRegion, __, "", {
        maxResults     : maxResults,
        nextToken      : nextToken,
        registryId     : registryId,
        repositoryNames: repositoryNames
    }, { "X-Amz-Target": "SpencerFrontendService.DescribeRepositories" }, __, "application/x-amz-json-1.1");
 
    return res;
}; 

AWS.prototype.ECRPublic_dockerLogin = function(aRegion) {
    var res1 = this.ECRPublic_GetAuthorizationToken(aRegion);
    var res2 = this.ECRPublic_DescribeRegistries(aRegion);

    sprint(["docker", "login", "--username", "AWS", "--password", res1.authorizationToken, res2.registries[0].registryUri]);

    if (isDef(res1.authorizationToken)) {
        $sh(["docker", "login", "--username", "AWS", "--password", res1.authorizationToken, res2.registries[0].registryUri])
        .prefix("docker")
        .get();
    }
};