try {
var base = String(java.lang.System.getProperty('user.dir'));
require(base + '/grpc.js').install(base);
function assert(v, m) { if (!v) throw new Error(m); }
function fails(fn, code) { try { fn(); } catch(e) { assert(!code || e.code === code, 'Wrong error: '+e+' code='+e.code); return; } throw new Error('Expected error '+code); }
var server = ow.server.grpc.start({ descriptorSet: base+'/tests/hello.protoset', port: 0, plaintext: true, services: { 'demo.Greeter': {
  Echo: function(req, call) { assert(call.deadlineRemaining()>0, 'deadline'); call.setHeaders({'x-reply':['one','two']}); call.setTrailers({'x-end':'done'}); if(call.metadata['x-test']) assert(call.metadata['x-test'][0]==='hello','request metadata'); return req; },
  Fail: function(req, call) { call.setTrailers({'x-reason':'bad'}); throw ow.server.grpc.error('INVALID_ARGUMENT','invalid name'); },
  Slow: function(req) { sleep(200,true); return req; }
} } });
var client = ow.obj.grpc.client({descriptorSet:base+'/tests/hello.protoset', target:'localhost:'+server.getPort(), plaintext:true});
try {
  var req={name:'OpenAF',count:'9223372036854775807',data:'YWJj',labels:{key:'value'},text:'choice'};
  var result=client.callWithMetadata('demo.Greeter/Echo',req,{metadata:{'x-test':'hello'}});
  assert(result.response.count===req.count && result.response.data===req.data && result.response.labels.key==='value','ProtoJSON');
  assert(result.headers['x-reply'].length===2 && result.trailers['x-end'][0]==='done','response metadata');
  fails(function(){client.call('demo.Greeter/Fail',{});},'INVALID_ARGUMENT');
  fails(function(){client.call('demo.Greeter/Slow',{}, {timeout:30});},'DEADLINE_EXCEEDED');
  fails(function(){client.call('demo.Greeter/Echo',{unknown:true});});
  fails(function(){client.call('demo.Greeter/Watch',{});});
  fails(function(){client.call('demo.Greeter/Echo',{}, {timeout:-1});});
  var pending=client.callAsync('demo.Greeter/Slow',{}, {timeout:5000});
  pending.cancel();
  fails(function(){pending.await();},'CANCELLED');
  var calls=[];
  for(var i=0;i<12;i++) calls.push(client.callAsync('demo.Greeter/Echo',{name:String(i)}));
  calls.forEach(function(c,i){assert(c.await().name===String(i),'Concurrent response mismatch');});
  print('PASS: OpenAF unary, ProtoJSON, metadata, statuses, deadlines, validation');
} finally {client.close();server.stop();}
fails(function(){client.call('demo.Greeter/Echo',{});});
var limited=ow.server.grpc.start({descriptorSet:base+'/tests/hello.protoset',port:0,plaintext:true,queueCapacity:1,services:{'demo.Greeter':{Slow:function(r){sleep(150,true);return r;}}}});
var burst=ow.obj.grpc.client({descriptorSet:base+'/tests/hello.protoset',target:'localhost:'+limited.getPort(),plaintext:true});
try {
  var work=[];for(var j=0;j<8;j++)work.push(burst.callAsync('demo.Greeter/Slow',{}, {timeout:5000}));
  var rejected=0;work.forEach(function(w){try{w.await();}catch(e){assert(e.code==='RESOURCE_EXHAUSTED','Overload status');rejected++;}});
  assert(rejected>0,'Queue failed to reject overload');
  print('PASS: bounded queue overload');
}finally{burst.close();limited.stop();}


} catch (error) { printErr(error); exit(1); }
