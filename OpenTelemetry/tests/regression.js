var OpenTelemetry = require("../opentelemetry.js").OpenTelemetry;
var failures=0;
function assert(v,m) { if(!v) throw new Error(m); }
function test(name,fn) { try {fn();print("PASS "+name);} catch(e) { failures++;printErr("FAIL "+name+": "+e+"\n"+(e.stack||""));} }
var ins=ow.loadInstrumentation();
var records=[];
ins.registerProvider("fixture",{onSpan:function(r){records.push(r);},onLog:function(r){records.push(r);},onMetric:function(r){records.push(r);}});
ins.enable();
ins.withSpan("root",function(){ins.withSpan("child",function(){log("hello",{off:true});});});
var counter=ins.counter("requests",{attributeKeys:["route"]});counter.add(2,{route:"a"});counter.add(3,{route:"a"});
var histogram=ins.histogram("duration",{bounds:[5,10]});histogram.record(3);histogram.record(8);histogram.record(20);
ins.gauge("temperature").set(21);
var otel=new OpenTelemetry({endpoint:"http://127.0.0.1:1",serviceName:"regression",intervalMs:60000});
test("traces and correlated logs",function(){
 var spans=records.filter(function(r){return r.signal==="Span";}),logs=records.filter(function(r){return r.signal==="Log";});
 var payload=otel.encode("Span",spans),encoded=payload.resourceSpans[0].scopeSpans[0].spans;
 assert(encoded[0].kind===1 && encoded[0].traceId.length===32 && encoded[0].parentSpanId===encoded[1].spanId,"trace encoding");
 assert(typeof encoded[0].startTimeUnixNano==="string" && encoded[0].startTimeUnixNano.length===19,"integer precision");
 assert(otel.encode("Log",logs).resourceLogs[0].scopeLogs[0].logRecords[0].spanId===encoded[0].spanId,"log correlation");
});
test("metric aggregation and cardinality",function(){
 var metrics=records.filter(function(r){return r.signal==="Metric";}).map(function(r){return otel._metric(r);});
 var payload=otel.encode("Metric",metrics).resourceMetrics[0].scopeMetrics[0].metrics;
 var count=payload.filter(function(m){return m.name==="requests";})[0].sum;
 assert(count.aggregationTemporality===2 && count.isMonotonic && count.dataPoints[0].asDouble===5,"cumulative counter");
 var hist=payload.filter(function(m){return m.name==="duration";})[0].histogram.dataPoints[0];
 assert(hist.count==="3" && hist.sum===31 && JSON.stringify(hist.bucketCounts)==='["1","1","1"]',"histogram buckets");
 var limited=new OpenTelemetry({endpoint:"http://127.0.0.1:1",maxSeries:1});
 metrics.forEach(function(r){limited._metric(r);});assert(limited.getStats().seriesDropped>0,"bounded cardinality");
});
test("HTTP all signals, partial success, retry and suppression",function(){
 ow.loadServer();plugin("HTTPServer");var requests=new java.util.concurrent.ConcurrentLinkedQueue(),attempts=0,server=new HTTPd(findRandomOpenPort(),"127.0.0.1"),exporter;
 try {
   var handler=function(req){
     var body=typeof req.data==="string"?req.data:(req.postData || (req.params||{}).postData || req.data);
     requests.add(JSON.stringify({uri:req.uri,body:body,headers:req.headers}));
     if(++attempts===1)return server.reply("{}","application/json",429,{"Retry-After":"0"});
     return server.reply("{}","application/json",200);
   };
   // Direct handlers intentionally avoid instrumenting the test receiver.
   server.add("/v1/traces",handler);server.add("/v1/logs",handler);server.add("/v1/metrics",handler);
   server.setDefault("/v1/traces");
   exporter=new OpenTelemetry({endpoint:"http://127.0.0.1:"+server.getPort(),serviceName:"wire",intervalMs:60000}).start();
   var before=records.filter(function(r){return r.kind==="CLIENT";}).length;
   ins.withSpan("wire",function(){log("wire log",{off:true});ins.counter("wire.count").add(1);});
   exporter.flush(3000);
   var stats=exporter.getStats(); assert(stats.sent===3 && stats.retries===1,"all signals delivered with retry: "+JSON.stringify(stats));
   assert(requests.size()===4,"request count");
   assert(records.filter(function(r){return r.kind==="CLIENT";}).length===before,"export HTTP suppressed");
   exporter.stop(1000);exporter.start();exporter.stop(1000);assert(!exporter.getStats().running,"restart/stop");
 }finally{if(exporter)exporter.stop(100);server.stop();}
});
test("partial success and permanent errors do not retry",function(){
 ow.loadServer();plugin("HTTPServer");var server=new HTTPd(findRandomOpenPort(),"127.0.0.1"),code=200,body='{"partialSuccess":{"rejectedSpans":"1"}}';
 try{
  server.add("/v1/traces",function(){return server.reply(body,"application/json",code);});
  var e=new OpenTelemetry({endpoint:"http://127.0.0.1:"+server.getPort()});
  var spans=records.filter(function(r){return r.signal==="Span";}).slice(0,1);
  var partial=ins.suppress(function(){return e._send("Span",spans,1000);});assert(partial.rejected===1 && !partial.retry,"partial success");
  code=400;body="bad";var permanent=ins.suppress(function(){return e._send("Span",spans,1000);});assert(permanent.rejected===1 && !permanent.retry,"permanent rejection");
 }finally{server.stop();}
});
test("resource defaults, collector snapshots and negative histograms",function(){
 var e=new OpenTelemetry({endpoint:"http://127.0.0.1:1"}),base={id:"snapshot",signal:"Metric",resource:{"service.name":"core-service"},scope:{name:"openaf"},name:"snapshot",type:"cumulative",unit:"",attributes:{},bounds:[],timeUnixNano:"1000000000000000000",value:9};
 var first=e._metric(base),second=e._metric(Object.assign({},base,{timeUnixNano:"1000000001000000000"}));
 assert(second.aggregate.value===9,"collector snapshots are not increments");
 var reset=e._metric(Object.assign({},base,{value:2,timeUnixNano:"1000000002000000000"}));
 assert(reset.aggregate.start==="1000000002000000000","counter reset starts new cumulative interval");
 var encoded=e.encode("Metric",[reset]);assert(encoded.resourceMetrics[0].resource.attributes.some(function(a){return a.key==="service.name" && a.value.stringValue==="core-service";}),"core service identity preserved");
 var h=e._metric(Object.assign({},base,{name:"negative",type:"histogram",value:-1,bounds:[0]}));
 assert(typeof e.encode("Metric",[h]).resourceMetrics[0].scopeMetrics[0].metrics[0].histogram.dataPoints[0].sum==="undefined","negative histogram omits sum");
 var threw=false;try{new OpenTelemetry({endpoint:"http://127.0.0.1:1",protocol:"grpc"});}catch(error){threw=true;}assert(threw,"unsupported protocol rejected");
});
test("scheduled metric mappings",function(){
 ow.loadMetrics();ow.metrics.add("otelScheduledFixture",function(){return {size:4};});
 var emitted=new java.util.concurrent.ConcurrentLinkedQueue(),e=new OpenTelemetry({endpoint:"http://127.0.0.1:1",intervalMs:20,metricMappings:[{collector:"otelScheduledFixture",path:"size",name:"scheduled.size",type:"gauge"}]});
 e._send=function(signal,rs){if(signal==="Metric")rs.forEach(function(r){emitted.add(JSON.stringify(r));});return {};};
 try{e.start();var deadline=Date.now()+2000;while(emitted.isEmpty()&&Date.now()<deadline)sleep(10,true);assert(!emitted.isEmpty() && JSON.parse(String(emitted.peek())).aggregate.value===4,"worker collects configured metrics");}finally{e.stop(1000);}
});
ins.shutdown(1000);
exit(failures?1:0);
