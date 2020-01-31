// Author: Nuno Aguiar
// ECS

loadLib("aws_core.js");
 
/**
 * <odoc>
 * <key>AWS.ECS_ListTaskDefinitions(aRegion, aParamsMap) : Map</key>
 * Retrieves a list of ECS task definitions on a specific aRegion. Optional you can provide filtering with aParamsMap.
 * </odoc>
 */
AWS.prototype.ECS_ListTaskDefinitions = function(aRegion, params) {
    aRegion = _$(aRegion).isString().default(this.region);
    params = _$(params).isMap().default({});
    var aURL = "https://ecs." + aRegion + ".amazonaws.com/";
    var url = new java.net.URL(aURL);
    var aHost = String(url.getHost());
    var aURI = String(url.getPath());
 
    return af.fromXML2Obj(this.postURLEncoded(aURL, aURI, "", merge({
       Action: "ListTaskDefinitions"
    }, params), "ecs", aHost, aRegion, {
       "X-Amz-Target": "AmazonEC2ContainerServiceV20141113.ListTaskDefinitions"
    }));
 };
 
 /**
  * <odoc>
  * <key>AWS.ECS_RunTask(aRegion, taskDefinition, params) : Map</key>
  * Tries to provision a ECS task (taskDefinition) to run with the provided params. Example:\
  * \
  *   aws.ECS_RunTask("eu-west-1", "arn:aws:ecs:eu-west-1:1234567890123:task-definition/test:123", { \
  *      cluster: "testCluster", \
  *      launchType: "FARGATE", \
  *      networkConfiguration: { \
  *         awsvpcConfiguration: { \
  *            assignPublicIp: "ENABLED", \
  *            securityGroups: [ "sg-123ab123" ], \
  *            subnets: [ "subnet-123ab123" ] \
  *         }\
  *      }, \
  *      overrides: { \
  *         containerOverrides: [ { \
  *            name: "testContainer", \
  *            environment: [ { \
  *               name: "MSG", \
  *               value: "Hello World" \
  *            } ] \
  *         } ] \
  *      } \
  *   });\
  * \
  * </odoc>
  */
 AWS.prototype.ECS_RunTask = function(aRegion, taskDefinition, params) {
    aRegion = _$(aRegion).isString().default(this.region);
    params = _$(params).isMap().default({});
    var aURL = "https://ecs." + aRegion + ".amazonaws.com/";
    var url = new java.net.URL(aURL);
    var aHost = String(url.getHost());
    var aURI = String(url.getPath());
 
    var res = this.postURLEncoded(aURL, aURI, "", merge({
       Action: "RunTask",
       taskDefinition: taskDefinition
    }, this.flattenMap2Params(params)), "ecs", aHost, aRegion, {
       "X-Amz-Target": "AmazonEC2ContainerServiceV20141113.RunTask"
    });
 
    if (isMap(res))
       return af.fromXML2Obj(res.error.response);
    else {
       return af.fromXML2Obj(res);
    }
 };
 