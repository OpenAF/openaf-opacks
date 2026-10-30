try {
var base=String(java.lang.System.getProperty('user.dir'));
require(base+'/grpc.js').install(base);
function check(v,m){if(!v)throw new Error(m);}
function rejects(fn,text){try{fn();}catch(e){if(text)check(String(e).indexOf(text)>=0,'Wrong error: '+e);return;}throw new Error('Expected failure: '+text);}
var schemaPath=base+'/tests/schema';
var server=ow.server.grpc.start({protoFiles:[schemaPath+'/root.proto'],protoPaths:[schemaPath],port:0,plaintext:true,reflection:true,services:{'fixture.Registry':{Read:function(r){return r;}}}});
var target='localhost:'+server.getPort();
try{
  var direct=ow.obj.grpc.client({target:target,protoFiles:[schemaPath+'/root.proto'],protoPaths:[schemaPath],plaintext:true});
  try{check(direct.call('fixture.Registry/Read',{name:'compiled'}).name==='compiled','Direct proto call');}finally{direct.close();}
  var reflected=ow.obj.grpc.client({target:target,plaintext:true,reflection:true});
  try{
    var services=reflected.describe();check(services.length===1&&services[0].name==='fixture.Registry','Reflected service list');
    check(services[0].methods[0].inputType==='fixture.Payload'&&services[0].methods[0].type==='UNARY','Reflected method descriptor');
    check(reflected.call('fixture.Registry/Read',{name:'reflected',count:'9223372036854775807'}).count==='9223372036854775807','Reflected imports/codec');
  }finally{reflected.close();}
  var directory=String(java.nio.file.Files.createTempDirectory('grpc proto spaces '));
  try{
    io.cp(schemaPath+'/root.proto',directory+'/root.proto');io.cp(schemaPath+'/types.proto',directory+'/types.proto');
    var spaced=ow.obj.grpc.client({target:target,protoFiles:[directory+'/root.proto'],protoPaths:[directory],plaintext:true});
    try{check(spaced.call('fixture.Registry/Read',{name:'spaces'}).name==='spaces','Paths with spaces');}finally{spaced.close();}
  }finally{io.rm(directory+'/root.proto');io.rm(directory+'/types.proto');io.rm(directory);}
  rejects(function(){ow.obj.grpc.client({target:target,protoFiles:[schemaPath+'/invalid.proto'],plaintext:true});},'protoc failed');
  rejects(function(){ow.obj.grpc.client({target:target,protoFiles:[schemaPath+'/root.proto'],protoc:'openaf-grpc-protoc-missing',plaintext:true});},'Cannot run program');
  rejects(function(){ow.obj.grpc.client({target:target,protoFiles:[schemaPath+'/root.proto'],protoc:base+'/tests/protoc-slow.sh',protocTimeout:20,plaintext:true});},'timed out');
  rejects(function(){ow.obj.grpc.client({target:target,protoFiles:[schemaPath+'/root.proto'],descriptorSet:base+'/tests/hello.protoset',plaintext:true});},'exactly one');
  rejects(function(){ow.obj.grpc.client({target:target,plaintext:true});},'exactly one');
}finally{server.stop();}
var privateServer=ow.server.grpc.start({descriptorSet:base+'/tests/hello.protoset',port:0,plaintext:true,services:{'demo.Greeter':{Echo:function(r){return r;}}}});
try{rejects(function(){ow.obj.grpc.client({target:'localhost:'+privateServer.getPort(),plaintext:true,reflection:true,reflectionTimeout:1000});},'UNIMPLEMENTED');}finally{privateServer.stop();}
print('PASS: proto loading/imports/spaces, diagnostics, compiler timeout, v1 reflection and disabled reflection');
}catch(error){printErr(error);exit(1);}
