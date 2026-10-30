// Exercise real $job dispatch with transport replaced at its socket boundary.
try {
var base = String(java.lang.System.getProperty('user.dir'));
require(base + '/grpc.js').install(base);
var schemas = ow.obj.grpc.describe({descriptorSet:base+'/tests/hello.protoset'});
var originalStart = ow.server.grpc.start, originalClient = ow.obj.grpc.client;
var handlers, stops = 0, closes = 0;
ow.server.grpc.start = function(config) { handlers = config.services['demo.Greeter']; return {getPort:function() {return 12345;},stop:function() {stops++;}}; };
ow.obj.grpc.client = function(options) {
  return {
    describe:function() { return schemas; },
    close:function() { closes++; },
    callWithMetadata:function(method, request, opts) {
      if (request.fail) throw new Error('peer failed');
      return {response:request,headers:{test:['yes']},trailers:{}};
    },
    stream:function(method, request) {
      var values = [{done:false,value:request},{done:true}];
      return {read:function(){return values.shift();},cancel:function(){},metadata:function(){return {headers:{},trailers:{}};}};
    },
    openStream:function(method) {
      var values = new java.util.concurrent.LinkedBlockingQueue(), requests = [];
      return {
        write:function(request) { requests.push(request); if (/Chat$/.test(method)) values.put(stringify({done:false,value:request})); },
        complete:function() { if (/Collect$/.test(method)) values.put(stringify({done:false,value:{name:requests.map(function(r) {return r.name;}).join(',')}})); values.put('{"done":true}'); },
        read:function() { return jsonParse(String(values.take())); },cancel:function(){},metadata:function(){return {headers:{},trailers:{}};}
      };
    }
  };
};
var definition = io.readFileYAML(base+'/oJobGRPC.yaml');
definition.ojob = {async:false,logToConsole:false,catch:'throw exception;'};
definition.jobs.push({name:'Echo Business',exec:'args.response = {name:args.prefix + args.request.name}; args.headers = {"x-job":"yes"};'});
definition.jobs.push({name:'Watch Business',exec:'args.response = [args.request, {name:"second"}];'});
definition.jobs.push({name:'Upload Business',exec:'args.response = {name:args.request.map(function(r) {return r.name;}).join(",")};'});
definition.jobs.push({name:'Error Business',exec:'args.grpcError = {code:"INVALID_ARGUMENT",message:"bad request"};'});
definition.jobs.push({name:'Test',exec:function() {
  function assert(value,message) { if (!value) throw new Error(message); }
  var start = $job('GRPC Start Server', {id:'test',options:{descriptorSet:base+'/tests/hello.protoset',port:0,plaintext:true},bindings:{
    'demo.Greeter/Echo':{job:'Echo Business',args:{prefix:'job:'}},
    'demo.Greeter/Watch':'Watch Business',
    'demo.Greeter/Collect':'Upload Business',
    'demo.Greeter/Chat':{job:'Echo Business',args:{prefix:'chat:'}},
    'demo.Greeter/Fail':'Error Business'
  }});
  try {
    assert(start.port === 12345,'actual port');
    var headers;
    var call = {metadata:{test:['value']},setHeaders:function(value){headers=value;},setTrailers:function(){},isCancelled:function(){return false;}};
    assert(handlers.Echo({name:'hello'},call).name === 'job:hello','unary job dispatch');
    assert(headers['x-job'] === 'yes','headers');
    var replies = [];
    handlers.Watch({name:'first'},call,{write:function(value){replies.push(value);}});
    assert(replies.length === 2 && replies[1].name === 'second','server-streaming job dispatch');
    var inputs = [{done:false,value:{name:'a'}},{done:false,value:{name:'b'}},{done:true}];
    assert(handlers.Collect({read:function(){return inputs.shift();}},call).name === 'a,b','client-streaming job dispatch');
    inputs = [{done:false,value:{name:'a'}},{done:false,value:{name:'b'}},{done:true}]; replies = [];
    handlers.Chat({read:function(){return inputs.shift();},write:function(value){replies.push(value);}},call);
    assert(replies.length === 2 && replies[1].name === 'chat:b','bidirectional job dispatch');
    var failed = false;
    try { handlers.Fail({},call); } catch(error) { failed = error.grpcCode === 'INVALID_ARGUMENT'; }
    assert(failed,'intentional gRPC job status');
    var requests = [{name:'a'},{name:'b'}];
    ['Echo','Watch','Collect','Chat'].forEach(function(method) {
      var result = $job('GRPC Call',{options:{},method:'demo.Greeter/'+method,request:(method==='Echo'||method==='Watch')?{name:'a'}:requests});
      assert(method==='Echo'?result.response.name==='a':method==='Collect'?result.response.name==='a,b':result.response.length===(method==='Watch'?1:2),'remote '+method);
    });
    assert(closes===4,'remote clients closed');
    failed=false;
    try { $job('GRPC Call',{options:{},method:'demo.Greeter/Echo',request:{fail:true}}); } catch(error) { failed=true; }
    assert(failed && closes===5,'client closed on failure');
  } finally { $job('GRPC Stop Server',{id:'test',timeout:0}); }
  assert(stops===1,'server stopped');
  $job('GRPC Stop Server',{id:'test'});
  assert(stops===1,'stop is idempotent');
  print('PASS: oJob gRPC bindings, $job dispatch, all call patterns and cleanup');
}});
definition.jobs[definition.jobs.length-1].exec = String(definition.jobs[definition.jobs.length-1].exec).replace(/^function[^\{]*\{/, '').replace(/\}\s*$/, '');
definition.todo = ['Test'];
$set('res', {});
try { oJobRun(definition); } finally { ow.server.grpc.start=originalStart;ow.obj.grpc.client=originalClient; }
} catch(error) { printErr(error); printErr(error.stack); exit(1); }
