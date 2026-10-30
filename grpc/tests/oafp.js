try {
var base = String(java.lang.System.getProperty('user.dir'));
require(base + '/grpc.js').install(base);
var lib = require(base + '/oafp_grpc.js');
function assert(test, message) { if (!test) throw new Error(message); }
function adapter(params, emit) {
  return lib.oafplib(params, emit, emit, { _fromJSSLON: function(v) { return jsonParse(v); }, _print: emit });
}
function input(lib, type) { return lib.input.filter(function(v) { return v.type === type; })[0].fn; }
function output(lib, type) { return lib.output.filter(function(v) { return v.type === type; })[0].fn; }
var config = { descriptorSet: base + '/tests/hello.protoset', plaintext: true };
var server = ow.server.grpc.start(merge(config, { port: 0, services: { 'demo.Greeter': {
  Echo: function(r) { return r; },
  Watch: function(r, call, stream) {
    if (r.name === 'slow') sleep(200, true);
    for (var i = 0; i < Number(r.count || 2); i++) stream.write({ name: String(i) });
    if (r.name === 'fail') throw ow.server.grpc.error('ABORTED', 'terminal');
  },
  Collect: function(stream) { var names = []; while (true) { var r = stream.read(); if (r.done) break; names.push(r.value.name); } return { name: names.join(',') }; },
  Chat: function(stream) { while (true) { var r = stream.read(); if (r.done) return; stream.write(r.value); } }
} } }));
try {
  var clientConfig = merge(config, { target: 'localhost:' + server.getPort() });
  var tests = [ ['Echo', {name:'hello'}, ['hello']], ['Watch', {count:'3'}, ['0','1','2']], ['Collect', [{name:'a'},{name:'b'}], ['a,b']], ['Chat', [{name:'a'},{name:'b'}], ['a','b']] ];
  tests.forEach(function(test) {
    var results = [], params = { grpcoptions: clientConfig, grpcmethod: 'demo.Greeter/' + test[0], grpcrequest: test[1] };
    input(adapter(params, function(r) { results.push(r.name); }), 'grpc')('', {});
    assert(stringify(results) === stringify(test[2]), 'input ' + test[0] + ': ' + stringify(results));
    var receipt;
    output(adapter(params, function(r) { receipt = r; }), 'grpc')(test[1], {});
    assert(stringify(receipt.responses.map(function(r) { return r.name; })) === stringify(test[2]), 'output ' + test[0]);
  });
  var empty;
  output(adapter({grpcoptions:clientConfig,grpcmethod:'demo.Greeter/Collect'}, function(r) { empty = r; }), 'grpc')([], {});
  assert(empty.responses.length === 1, 'empty upload response');
  var failures = 0;
  [ {grpcrequest:{name:'slow'},grpccalloptions:{timeout:20}}, {grpcrequest:{name:'fail'}} ].forEach(function(settings) {
    try { input(adapter(merge({grpcoptions:clientConfig,grpcmethod:'demo.Greeter/Watch'},settings),function() {}),'grpc')('',{}); }
    catch(error) { assert(error.code === (settings.grpcrequest.name === 'slow' ? 'DEADLINE_EXCEEDED' : 'ABORTED'), 'terminal status: ' + error); failures++; }
  });
  try { input(adapter({grpcoptions:clientConfig,grpcmethod:'demo.Greeter/Watch'},function() { throw new Error('pipeline failed'); }),'grpc')('',{}); }
  catch(error) { assert(String(error).indexOf('pipeline failed') >= 0, 'pipeline error'); failures++; }
  assert(failures === 3, 'expected failures');
  var many = []; for (var i = 0; i < 128; i++) many.push({name:String(i),data:'YWJj'.repeat(4096)});
  var count = 0;
  input(adapter({grpcoptions:clientConfig,grpcmethod:'demo.Greeter/Chat',grpcrequest:many,grpccalloptions:{timeout:30000}}, function() { count++; }), 'grpc')('', {});
  assert(count === many.length, 'bidirectional flow control');
} finally { server.stop(); }
var schema;
input(adapter({file:base+'/tests/hello.proto'}, function(r) { schema = r; }), 'proto')('', {});
assert(schema.file[0].package === 'demo', 'schema input');
var source;
output(adapter({}, function(r) { source = r; }), 'proto')(schema, {});
assert(source.indexOf('message Message') >= 0, 'schema output');
print('PASS: oafp conversion and all client RPC patterns');
} catch(error) { printErr(error); printErr(error.stack); exit(1); }
