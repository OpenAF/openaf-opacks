// Author: Nuno Aguiar

ow.loadFormat();
ow.loadObj();

var regions = {
    "us-east-1": "US-East (Virginia)",
    "us-east-2": "US-East (Ohio)",
    "us-west-1": "US-West (California)",
    "us-west-2": "US-West (Oregon)",
    "ca-central-1": "Canada (Central)",
    "eu-west-1": "Europe (Ireland)",
    "eu-west-2": "Europe (London)",
    "eu-central-1": "Europe (Frankfurt)",
    "eu-central-2": "Europe (Zurich)",
    "eu-west-3": "Europe (Paris)",
    "eu-north-1": "Europe (Stockholm)",
    "eu-south-1": "Europe (Milan)",
    "eu-south-2": "Europe (Zaragoza)",
    "me-south-1": "Middle East (Bahrain)",
    "me-central-1": "Middle East (UAE)",
    "ap-east-1": "Asia Pacific (Hong Kong)",
    "ap-south-1": "Asia Pacific (Mumbai)",
    "ap-south-2": "Asia Pacific (Kolkata)",
    "ap-northeast-3": "Asia Pacific (Osaka-Local)",
    "ap-northeast-2": "Asia Pacific (Seoul)",
    "ap-southeast-1": "Asia Pacific (Singapore)",
    "ap-southeast-2": "Asia Pacific (Sydney)",
    "ap-southeast-3": "Asia Pacific (Jakarta)",
    "ap-southeast-4": "Asia Pacific (Melbourne)",
    "ap-northeast-1": "Asia Pacific (Tokyo)",
    "sa-east-1": "South America (Sao Paulo)",
    "af-south-1": "Africa (Cape Town)",
    "cn-north-1": "China (Beijing)",
    "cn-northwest-1": "China (Ningxia)",
    "us-gov-east-1": "AWS GovCloud (US-East)",
    "us-gov-west-1": "AWS GovCloud (US)"
  };

// Tests the socket latency to a specific aHost, aPort given an optional aTimeout (default to 2500)
function testLatencySocket(aHost, aPort, aTimeout) {
    aTimeout = _$(aTimeout).isNumber().default(2500);

    var sock  = new java.net.Socket();
    var iaddr = new java.net.InetSocketAddress(aHost, aPort);

    var ini = now(), latency = -1;
    try { 
        sock.connect(iaddr, aTimeout);
        latency = now() - ini;
    } catch(e) {
        latency = -1;
    } finally {
        sock.close();
    }

    return latency;
}

// Tests the HTTPs latency to a specific aURL given an optional aTimeout (default to 2500)
function testLatencyHTTP(aURL, aTimeout) {
    aTimeout = _$(aTimeout).isNumber().default(2500);

    var hc = new ow.obj.http();
    hc.setThrowExceptions(true);
    var ini = now(), latency = -1;
    try {
        hc.get(aURL, void 0, void 0, false, aTimeout);
        latency = now() - ini;
    } catch(e) {
        latency = -1;
    }

    return latency;
}

// Returns the socket latency measured to a specific AWS aRegion
function testAWSSocketLatency(aRegion) {
    // Test socket latency
    var res = testLatencySocket("dynamodb." + aRegion + ".amazonaws.com" + (aRegion.startsWith("cn") ? ".cn" : ""), 443);
    if (res <= -1) return void 0; else return res;
}

// Returns the HTTPS latency measured to a specific AWS aRegion
function testAWSHTTPSLateny(aRegion) {
    // Test https latency
    var res = testLatencyHTTP("https://dynamodb." + aRegion + ".amazonaws.com" + (aRegion.startsWith("cn") ? ".cn" : ""));
    if (res <= -1) return void 0; else return res;
}

// Harming up, testing against it self.
function init() {
    $ch("results").create();
    var port = findRandomOpenPort();
    $ch("results").expose(port);
    testLatencySocket("127.0.0.1", port);
    testLatencyHTTP("http://127.0.0.1:" + port);
}

printnl("Starting test...\r");
var maxSpace = 0;
for(let region in regions) {
    var s = "Testing " + regions[region] + "..."; 
    if (s.length > maxSpace) 
        maxSpace = s.length; 
}

var results = parallel4Array(regions, (region) => {
    var result = { region: regions[region], regionCode: region };

    try {
        printnl(repeat(maxSpace, ' ') + "\rTesting " + regions[region] + "...\r");

        // Test socket latency
        result.socketLatency = testAWSSocketLatency(region);
        if (isUnDef(result.socketLatency)) result.reachable = false; else result.reachable = true;

        if (result.reachable) {
            // Test https latency
            result.httpLatency = testAWSHTTPSLateny(region);

            var tries = 3, sumSocket = -1, sumHTTP = -1, minSocket = -1, minHTTP = -1, maxSocket = -1, maxHTTP = -1, cSocket = 0, cHTTP = 0;
            for(var ii = 0; ii < tries; ii++) {
                var s = testAWSSocketLatency(region);
                var h = testAWSHTTPSLateny(region);
                if (s >= 0) {
                    sumSocket += s;
                    cSocket++;
                }
                if (h >= 0) {
                    sumHTTP += h;
                    cHTTP++;
                }

                if (minSocket < 0 || minSocket > s) minSocket = s;
                if (minHTTP < 0 || minHTTP > s) minHTTP = s;
                if (maxSocket < 0 || maxSocket < s) maxSocket = s;
                if (maxHTTP < 0 || maxHTTP < s) maxHTTP = s;
            }

            result.socketLatency3 = Math.round(sumSocket / cSocket);
            result.httpLatency3 = Math.round(sumHTTP / cHTTP);
            result.socketLatMax3 = maxSocket;
            result.httpLatMax3 = maxHTTP;
            result.socketLatMin3 = minSocket;
            result.httpLatMin3 = minHTTP;
        }
    } catch(e) { 
        sprintErr(e); 
    } 

    return result;
});

var sortedResults = $from(results)
                    .sort("socketLatency3", "reachable")
                    .select((r) => {
                        if (isDef(r.socketLatency))  r.socketLatency += "ms";
                        if (isDef(r.httpLatency))    r.httpLatency   += "ms";
                        if (isDef(r.socketLatency3)) r.socketLatency3 += "ms";
                        if (isDef(r.httpLatency3))   r.httpLatency3   += "ms";

                        if (isDef(r.socketLatMin3))  r.socketLatMin3   += "ms";
                        if (isDef(r.socketLatMax3))  r.socketLatMax3   += "ms";

                        if (isDef(r.httpLatMin3))  r.httpLatMin3   += "ms";
                        if (isDef(r.httpLatMax3))  r.httpLatMax3   += "ms";

                        return {
                            Region         : r.region,
                            "Region code"  : r.regionCode,
                            "Reachable?"   : r.reachable,
                            "Socket avg #3": r.socketLatency3,
                            "HTTPS avg #3" : r.httpLatency3
                        };
                    });

print(printTable(sortedResults));
exit(0);