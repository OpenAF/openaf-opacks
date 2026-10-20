// Offline integration checks: actual $rest serialization and SigV4, intercepted HTTP.
// Fixtures independently transcribed from AWS operation Request Syntax, 2026-10-20.
load("aws_lambda.js");
ow.loadObj();
var aws = new AWS("dummy-access", "dummy-secret", "dummy-session", "eu-west-1");
var checks = 0, captured, response = { nextToken: "opaque+/=", Marker: "marker", result: false };
var failTransport = false;
function equal(actual, expected, label) {
   checks++;
   if (stringify(actual, __, "") != stringify(expected, __, "")) throw label + ": " + stringify(actual) + " != " + stringify(expected);
}
function ok(value, label) { checks++; if (!value) throw label; }
function rejects(fn, label) { var threw = false; try { fn(); } catch(e) { threw = true; } ok(threw, label); }
function encode(value) { return encodeURIComponent(String(value)).replace(/[!'()*]/g, function(c) { return "%" + c.charCodeAt(0).toString(16).toUpperCase(); }); }
var factory = ow.obj.rest.connectionFactory;
ow.obj.rest.connectionFactory = function() {
   return {
      exec: function(url, method, payload, headers) {
         captured = { url: String(url), method: method, payload: payload, headers: headers };
         if (failTransport) throw new Error("fixture transport failure");
         return { response: isUnDef(response) ? "" : stringify(response, __, ""), responseCode: isUnDef(response) ? 204 : 200 };
      },
      getErrorResponse: function() { return "fixture failure"; },
      close: function() {}
   };
};
try {
   var fixtures = io.readFileJSON("tests/lambda-fixtures.json");
   equal(fixtures.length, 49, "operation count");
   fixtures.forEach(function(f) {
      var before = stringify(f.params, __, "");
      equal(aws[f.name](__, f.params), response, f.name + " response");
      equal(stringify(f.params, __, ""), before, f.name + " immutable");
      var path = f.path.replace(/\{([^}]+)\}/g, function(_, k) { return encode(f.params[k]); });
      var pairs = [];
      Object.keys(f.query).forEach(function(k) {
         (isArray(f.query[k]) ? f.query[k] : [f.query[k]]).forEach(function(v) { pairs.push(encode(k) + "=" + encode(v)); });
      });
      pairs.sort();
      equal(captured.url, "https://lambda.eu-west-1.amazonaws.com" + path + (pairs.length ? "?" + pairs.join("&") : ""), f.name + " URL");
      equal(captured.method, f.method, f.name + " verb");
      var payload = f.method == "GET" || f.method == "DELETE" ? "" : stringify(f.body, __, "");
      equal(isUnDef(captured.payload) ? "" : captured.payload, payload, f.name + " body");
      equal(captured.headers["x-amz-content-sha256"], sha256(payload), f.name + " signed payload");
      ok(captured.headers.Authorization.indexOf("/eu-west-1/lambda/aws4_request") >= 0, f.name + " scope");
      equal(captured.headers["X-Amz-Security-Token"], "dummy-session", f.name + " session token");
      // Independently recompute the SigV4 signature from the actual outgoing request.
      var h = captured.headers, auth = h.Authorization;
      var signed = auth.match(/SignedHeaders=([^,]+)/)[1];
      var headerText = signed.split(";").map(function(k) {
         var found = Object.keys(h).filter(function(x) { return x.toLowerCase() == k; })[0];
         return k + ":" + (k == "host" ? String(new java.net.URL(captured.url).getHost()) : h[found]) + "\n";
      }).join("");
      var canonical = f.method + "\n" + encodeURI(path) + "\n" + pairs.join("&") + "\n" + headerText + "\n" + signed + "\n" + sha256(payload);
      var date = h["x-amz-date"] || h["X-Amz-Date"], stamp = date.substring(0, 8);
      var scope = stamp + "/eu-west-1/lambda/aws4_request";
      var key = aws.__getSignatureKey("dummy-secret", stamp, "eu-west-1", "lambda");
      var signature = ow.format.string.toHex(aws.__HmacSHA256("AWS4-HMAC-SHA256\n" + date + "\n" + scope + "\n" + sha256(canonical), key), "").toLowerCase();
      equal(auth.split("Signature=")[1], signature, f.name + " signature");
      rejects(function() { aws[f.name](__, []); }, f.name + " rejects array params");
      rejects(function() { aws[f.name](__, "bad"); }, f.name + " rejects string params");
      var ids = f.path.match(/\{([^}]+)\}/g) || [];
      ids.forEach(function(id) {
         var p = clone(f.params); delete p[id.slice(1,-1)];
         rejects(function() { aws[f.name](__, p); }, f.name + " missing identifier");
         p[id.slice(1,-1)] = "";
         rejects(function() { aws[f.name](__, p); }, f.name + " empty identifier");
         p[id.slice(1,-1)] = 7;
         rejects(function() { aws[f.name](__, p); }, f.name + " non-string identifier");
      });
   });
   aws.LAMBDA_MICROVM_ListMicrovms("us-west-2", { nextToken: "", maxResults: 0 });
   equal(captured.url, "https://lambda.us-west-2.amazonaws.com/2025-09-09/microvms?maxResults=0&nextToken=", "override and falsy query");
   ok(captured.headers.Authorization.indexOf("/us-west-2/lambda/aws4_request") >= 0, "override signing scope");
   aws.LAMBDA_WEB_ListWebFunctions(__, { filters: {}, maxResults: 0, nextToken: "" });
   equal(captured.payload, '{"filters":{},"maxResults":0,"nextToken":""}', "empty and zero POST pagination");
   var p = { functionName: "app", endpointName: "main", description: "", revisionWeights: {}, throttleConfig: { enabled: false, value: 0, list: [] } };
   var before = stringify(p, __, "");
   aws.LAMBDA_WEB_UpdateWebFunctionEndpoint(__, p);
   equal(captured.payload, '{"description":"","revisionWeights":{},"throttleConfig":{"enabled":false,"value":0,"list":[]}}', "falsy nested payload");
   equal(stringify(p, __, ""), before, "nested immutability");
   rejects(function() { aws.LAMBDA_WEB_CreateWebFunction(__, {}); }, "required body identifier");
   rejects(function() { aws.LAMBDA_MICROVM_RunMicrovm(__, { imageIdentifier: "" }); }, "empty identifier");
   aws.LAMBDA_WEB_GetWebAccountSettings();
   aws.LAMBDA_MICROVM_ListMicrovms();
   response = __;
   equal(aws.LAMBDA_WEB_DeleteWebFunction(__, { functionName: "app" }), {}, "empty response");
   response = { error: "service error", nextToken: "unchanged" };
   equal(aws.LAMBDA_WEB_ListWebFunctions(), response, "service error unchanged");
   failTransport = true;
   ok(isDef(aws.LAMBDA_WEB_ListWebFunctions().error), "existing REST error behavior");
   failTransport = false;
   response = { compatible: true };
   equal(aws.LAMBDA_Invoke(__, "old", { value: 1 }), response, "existing invoke");
   equal(captured.method, "POST", "existing invoke verb");
   ok(captured.url.indexOf("/2015-03-31/functions/old/invocations") >= 0, "existing invoke URL");
   equal(aws.LAMBDA_InvokeAsync(__, "old", {}), response, "existing async");
   equal(captured.headers["X-Amz-Invocation-Type"], "Event", "existing async header");
   equal(aws.LAMBDA_InvokeDryRun(__, "old", {}), response, "existing dry run");
   equal(captured.headers["X-Amz-Invocation-Type"], "DryRun", "existing dry run header");
   equal(aws.LAMBDA_ListLayers(__, "nodejs22.x", "cursor", 2), response, "existing layers");
   print("PASS: " + checks + " offline Lambda checks across 49 new operations and existing wrappers");
} catch(e) {
   printErr(String(e));
   exit(1);
} finally {
   ow.obj.rest.connectionFactory = factory;
}
