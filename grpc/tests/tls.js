try {
var base = String(java.lang.System.getProperty('user.dir'));
require(base+'/grpc.js').install(base);
var certs = String(java.lang.System.getenv('GRPC_TEST_CERTS'));
function check(v,m) { if(!v) throw new Error(m); }
[false,true].forEach(function(mtls) {
  var opts={descriptorSet:base+'/tests/hello.protoset',port:0,reflection:true,cert:certs+'/server.pem',key:certs+'/server.key',services:{'demo.Greeter':{Echo:function(r){return r;}}}};
  if(mtls) opts.trustCert=certs+'/ca.pem';
  var server=ow.server.grpc.start(opts);
  var clientOptions={descriptorSet:opts.descriptorSet,target:'localhost:'+server.getPort(),trustCert:certs+'/ca.pem'};
  if(mtls) {clientOptions.cert=opts.cert;clientOptions.key=opts.key;}
  var client=ow.obj.grpc.client(clientOptions);
  try {check(client.call('demo.Greeter/Echo',{name:'TLS'}).name==='TLS','TLS roundtrip');}
  finally {client.close();}
  var reflectionOptions={target:clientOptions.target,trustCert:certs+'/ca.pem',reflection:true};
  if(mtls){reflectionOptions.cert=opts.cert;reflectionOptions.key=opts.key;}
  var discovered=ow.obj.grpc.client(reflectionOptions);
  try{check(discovered.call('demo.Greeter/Echo',{name:'secure reflection'}).name==='secure reflection','TLS reflected call');}
  finally{discovered.close();}
  var rejected=ow.obj.grpc.client({descriptorSet:opts.descriptorSet,target:clientOptions.target});
  try {var failed=false;try {rejected.call('demo.Greeter/Echo',{}, {timeout:1000});} catch(e){failed=true;} check(failed,'Untrusted certificate accepted');}
  finally {rejected.close();}
  if(mtls) {
    delete clientOptions.cert;delete clientOptions.key;
    var anonymous=ow.obj.grpc.client(clientOptions);
    try {var denied=false;try {anonymous.call('demo.Greeter/Echo',{}, {timeout:1000});} catch(e){denied=true;}check(denied,'Missing client certificate accepted');}
    finally {anonymous.close();}
  }
  server.stop();
});
print('PASS: TLS, mTLS, untrusted CA and missing client certificate rejection');

} catch (error) { printErr(error); exit(1); }
