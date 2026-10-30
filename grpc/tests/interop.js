try {
var base=String(java.lang.System.getProperty('user.dir'));
require(base+'/grpc.js').install(base);
var peer=String(java.lang.System.getenv('GRPC_PEER_PORT'));
var authRejected=false;
try{ow.obj.grpc.client({reflection:true,target:'localhost:'+peer,plaintext:true});}
catch(e){authRejected=e.code==='UNAUTHENTICATED';}
if(!authRejected)throw 'Reflection authentication failure was not propagated';
var client=ow.obj.grpc.client({reflection:true,reflectionMetadata:{'x-reflect':'allowed'},target:'localhost:'+peer,plaintext:true});
try {
  if(client.describe()[0].name!=='demo.Greeter')throw 'Reflected Python service missing';
  print('PASS: OpenAF reflection client -> generated Python server (v1alpha fallback)');
  var r=client.call('demo.Greeter/Echo',{name:'OpenAF',count:'9223372036854775807',data:'YWJj'});
  if(r.name!=='OpenAF'||r.count!=='9223372036854775807'||r.data!=='YWJj') throw 'Python peer response mismatch';
  var remoteWatch=client.stream('demo.Greeter/Watch',{count:'3'});
  for(var i=0;i<3;i++)if(remoteWatch.read().value.name!==String(i))throw 'Python server stream order';
  if(!remoteWatch.read().done)throw 'Python server stream completion';
  var collect=client.openStream('demo.Greeter/Collect');collect.write({name:'a'});collect.write({name:'b'});collect.complete();
  if(collect.read().value.name!=='a,b'||!collect.read().done)throw 'Python upload result';
  var chat=client.openStream('demo.Greeter/Chat');
  for(var j=0;j<10;j++){chat.write({name:String(j)});if(chat.read().value.name!==String(j))throw 'Python bidi order';}
  chat.complete();if(!chat.read().done)throw 'Python bidi completion';
  print('PASS: OpenAF client -> generated Python server (unary and all streaming types)');
}finally{client.close();}
var server=ow.server.grpc.start({descriptorSet:base+'/tests/hello.protoset',port:0,plaintext:true,reflection:true,services:{'demo.Greeter':{Echo:function(r){return r;},
  Watch:function(r,call,out){for(var i=0;i<Number(r.count||3);i++)out.write({name:String(i),data:r.data||''});},
  Collect:function(input){var names=[];while(true){var r=input.read();if(r.done)break;names.push(r.value.name);}return {name:names.join(',')};},
  Chat:function(stream){while(true){var r=stream.read();if(r.done)break;stream.write(r.value);}}}}});
try {
  var command=new java.util.ArrayList();
  [String(java.lang.System.getenv('GRPC_PEER_PYTHON')),String(base+'/tests/peer.py'),'client',String(server.getPort())].forEach(function(arg){command.add(new java.lang.String(arg));});
  var process=new java.lang.ProcessBuilder(command).inheritIO().start();
  if(process.waitFor()!==0) throw 'Python client failed';
}finally{server.stop();}

} catch (error) { printErr(error); exit(1); }
