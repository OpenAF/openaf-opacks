try {
var base = String(java.lang.System.getProperty('user.dir'));
require(base + '/grpc.js').install(base);
function assert(value, message) { if (!value) throw new Error(message); }
var options = { protoFiles: ['tests/hello.proto'] };
var schema = ow.obj.grpc.schema(options);
var source = ow.obj.grpc.toProto(schema);
var roundtrip = ow.obj.grpc.fromProto(source);
// File names differ when compiling source text, so compare declarations.
assert(stringify(schema.file[0].messageType) === stringify(roundtrip.file[0].messageType), 'message descriptors differ');
assert(stringify(schema.file[0].service) === stringify(roundtrip.file[0].service), 'service descriptors differ');
var value = { name: 'test', count: '9223372036854775807', data: 'AAEC', labels: { key: 'value' }, text: 'choice' };
var result = ow.obj.grpc.decode(options, 'demo.Message', ow.obj.grpc.encode(options, 'demo.Message', value));
assert(result.count === value.count && result.data === value.data && result.labels.key === 'value', 'binary roundtrip');
var failed = false;
try { ow.obj.grpc.encode(options, 'demo.Missing', {}); } catch (e) { failed = true; }
assert(failed, 'unknown message accepted');
function canonical(message) {
  if (message.field) message.field.sort(function(a,b) { return a.number-b.number; });
  if (message.nestedType) { message.nestedType.sort(function(a,b) { return a.name.localeCompare(b.name); }); message.nestedType.forEach(canonical); }
}
['roundtrip2.proto', 'roundtrip3.proto'].forEach(function(file) {
  var before = ow.obj.grpc.schema({protoFiles: ['tests/schema/' + file]});
  var after = ow.obj.grpc.fromProto(ow.obj.grpc.toProto(before));
  before.file[0].name = after.file[0].name;
  before.file[0].messageType.forEach(canonical); after.file[0].messageType.forEach(canonical);
  assert(stringify(before) === stringify(after), 'descriptor roundtrip: ' + file + '\n' + stringify(before) + '\n' + stringify(after));
});
function rejects(fn, message) { var failed = false; try { fn(); } catch(e) { failed = true; } assert(failed, message); }
rejects(function() { ow.obj.grpc.decode(options, 'demo.Message', af.fromString2Bytes('\u000f')); }, 'malformed binary accepted');
rejects(function() { ow.obj.grpc.encode(options, 'demo.Message', {unknown: 1}); }, 'unknown payload field accepted');
rejects(function() { ow.obj.grpc.encode({protoFiles:['tests/schema/roundtrip2.proto']}, 'fixture.Legacy', {}); }, 'missing required field accepted');
var multiple = ow.obj.grpc.schema({protoFiles:['tests/schema/root.proto'],protoPaths:['tests/schema']});
rejects(function() { ow.obj.grpc.toProto(multiple); }, 'multi-file selection required');
assert(ow.obj.grpc.toProto(multiple, 'root.proto').indexOf('import "types.proto"') >= 0, 'import omitted');
rejects(function() { ow.obj.grpc.toProto(multiple, 'missing.proto'); }, 'missing selection accepted');
rejects(function() { ow.obj.grpc.fromProto('syntax = "proto3"; message Broken {'); }, 'invalid source accepted');
rejects(function() { ow.obj.grpc.fromProto('syntax = "proto2"; message M { optional group G = 1 { optional string v = 2; } }'); /* input may parse; output must reject */
  var group = ow.obj.grpc.fromProto('syntax = "proto2"; message M { optional group G = 1 { optional string v = 2; } }'); ow.obj.grpc.toProto(group);
}, 'unsupported group accepted');
rejects(function() { ow.obj.grpc.fromProto('syntax = "proto2"; import "google/protobuf/descriptor.proto"; extend google.protobuf.MessageOptions { optional string custom = 51234; } message M { option (custom) = "value"; }'); }, 'custom options lost');
print('PASS: schema and binary conversion');

} catch(error) { printErr(error); printErr(error.stack); exit(1); }
