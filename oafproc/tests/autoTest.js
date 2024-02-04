(function() {

   // Inputs & outputs
   // ----------------

   exports.testJSON2JSON = function() {
      var _f  = io.createTempFile("testJSON2JSON", ".json")
      var data = { a: 123, b: true, c: [ 1, 2, 3 ] }

      // Test input json formatted and json output
      io.writeFileJSON(_f, data)
      var _r = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "file=" + _f + " input=json output=json"]).get(0)

      ow.test.assert(compare(jsonParse(_r.stdout), data), true, "Problem with input json formatted and json output")

      // Test input json and json output
      io.writeFileJSON(_f, data, "")
      _r = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "file=" + _f + " input=json output=json"]).get(0)
      
      ow.test.assert(compare(jsonParse(_r.stdout), data), true, "Problem with input json and json output")
   }

   exports.testJSON2YAML = function() {
      var _f  = io.createTempFile("testJSON2JSON", ".json")
      var data = { a: 123, b: true, c: [ 1, 2, 3 ] }

      // Test input json formatted and yaml output
      io.writeFileJSON(_f, data)
      var _r = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "file=" + _f + " input=json output=yaml"]).get(0)

      ow.test.assert(compare(af.fromYAML(_r.stdout), data), true, "Problem with input json formatted and yaml output")

      // Test input json and yaml output
      io.writeFileJSON(_f, data, "")
      var _r = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "file=" + _f + " input=json output=yaml"]).get(0)

      ow.test.assert(compare(af.fromYAML(_r.stdout), data), true, "Problem with input json and yaml output")
   }

   exports.testYAML2YAML = function() {
      var _f  = io.createTempFile("testYAML2YAML", ".yaml")
      var data = { a: 123, b: true, c: [ 1, 2, 3 ] }

      // Test input yaml formatted and yaml output
      io.writeFileYAML(_f, data)
      var _r = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "file=" + _f + " input=yaml output=yaml"]).get(0)

      ow.test.assert(compare(af.fromYAML(_r.stdout), data), true, "Problem with input yaml formatted and yaml output")
   }

   exports.testYAML2JSON = function() {
      var _f  = io.createTempFile("testYAML2JSON", ".yaml")
      var data = { a: 123, b: true, c: [ 1, 2, 3 ] }

      // Test input yaml formatted and json output
      io.writeFileYAML(_f, data)
      var _r = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "file=" + _f + " input=yaml output=json"]).get(0)

      ow.test.assert(compare(jsonParse(_r.stdout), data), true, "Problem with input yaml formatted and json output")
   }

   exports.testJSON2Base64 = function() {
      var _f  = io.createTempFile("testJSON2B64", ".json")
      var data = { a: 123, b: true, c: [ 1, 2, 3 ] }

      // Test input yaml formatted and json output
      io.writeFileJSON(_f, data)
      var _r = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "file=" + _f + " input=json output=base64"]).get(0)

      var _fs = io.createTempFile("testB642JSON", ".txt")
      io.writeFileString(_fs, _r.stdout)
      var _s = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "file=" + _fs + " input=base64 output=json"]).get(0)

      ow.test.assert(compare(jsonParse(_s.stdout), data), true, "Problem with input/output base64 (simple)")
   }

   exports.testJSON2Base64Gzip = function() {
      var _f  = io.createTempFile("testJSON2B64", ".json")
      var data = { a: 123, b: true, c: [ 1, 2, 3 ] }

      // Test input yaml formatted and json output
      io.writeFileJSON(_f, data)
      var _r = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "file=" + _f + " input=json output=base64 base64gzip=true"]).get(0)

      var _fs = io.createTempFile("testB642JSON", ".txt")
      io.writeFileString(_fs, _r.stdout)
      var _s = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "file=" + _fs + " input=base64 output=json base64gzip=true"]).get(0)

      ow.test.assert(compare(jsonParse(_s.stdout), data), true, "Problem with input/output base64 (simple)")
   }

   // Transforms
   // ----------
   exports.testMerge = function() {
      var _f = io.createTempFile("testMerge", ".ndjson")
      var data1 = { a: 123, b: true, c: [ 1, 2, 3 ] }
      var data2 = clone(data1)
      data2.d = "test"
      delete data2.a

      io.writeFileString(_f, stringify(data1, __, "") + "\n" + stringify(data2, __, ""))
      var _r = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "input=ndjson output=json ndjsonjoin=true merge=true file=" + _f]).getJson(0)

      ow.test.assert(compare(_r.stdout, { a: 123, b: true, c: [ 1, 2, 3, 1, 2, 3 ], d: "test" }), true, "Problem with merge")
   }

   exports.testSortMapKeys = function() {
      var _f = io.createTempFile("testSortMapKeys", ".json")
      var data1 = { a: 123, z:[{b:4,a:3},{a:1,b:2}],b: true, c: [ 1, 2, 3 ] }

      io.writeFileString(_f, stringify(data1, __, ""))
      var _r = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "input=ndjson output=json sortmapkeys=true file=" + _f]).get(0)

      ow.test.assert(_r.stdout.trim(), '{"a":123,"b":true,"c":[1,2,3],"z":[{"a":3,"b":4},{"a":1,"b":2}]}', "Problem with sortmapkeys")
   }

   exports.testCorrectTypes = function() {
      var _f = io.createTempFile("testCorrectTypes", ".json")
      var data1 = { a: "123", b: "true", c: [ "1", 2, "3" ] }

      io.writeFileString(_f, stringify(data1, __, ""))
      var _r = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "input=json output=json correcttypes=true file=" + _f]).get(0)

      ow.test.assert(_r.stdout.trim(), '{"a":123,"b":true,"c":[1,2,3]}', "Problem with correcttypes")
   }

   exports.testSearchKeys = function() {
      var _f = io.createTempFile("testSearchKeys", ".json")
      var data1 = { a: 123, b: true, c: [ 1, 2, 3 ], d: { e: true } }

      io.writeFileString(_f, stringify(data1, __, ""))
      var _r = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "input=json output=json searchkeys=a file=" + _f]).getJson(0)
      ow.test.assert(_r.stdout, {".a":123}, "Problem with searchkeys (1)")

      _r = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "input=json output=json searchkeys=c file=" + _f]).getJson(0)
      ow.test.assert(_r.stdout, {".c":[1,2,3]}, "Problem with searchkeys (2)")

      _r = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "input=json output=json searchkeys=e file=" + _f]).getJson(0)
      ow.test.assert(_r.stdout, {".d.e":true}, "Problem with searchkeys (3)")
   }

   exports.testSearchValues = function() {
      var _f = io.createTempFile("testSearchValues", ".json")
      var data1 = { a: 123, b: true, c: [ 1, 2, 3 ], d: { e: true } }

      io.writeFileString(_f, stringify(data1, __, ""))
      var _r = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "input=json output=json searchvalues=123 file=" + _f]).getJson(0)
      ow.test.assert(_r.stdout, {".a":123}, "Problem with searchvalues (1)")

      _r = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "input=json output=json searchvalues=true file=" + _f]).getJson(0)
      ow.test.assert(_r.stdout, {".b":true,".d.e":true}, "Problem with searchvalues (2)")
   }

   exports.testMapToArray = function() {
      var _f = io.createTempFile("testMapToArray", ".json")
      var data1 = { a: { x: 1, y: -1 }, b: { x: 0, y: 0 }, c: { x: 1, y: 1 } }

      io.writeFileString(_f, stringify(data1, __, ""))
      var _r = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "input=json output=json maptoarray=true file=" + _f]).getJson(0)
      ow.test.assert(_r.stdout, [{ x: 1, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 1 }], "Problem with maptoarray (1)")

      _r = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "input=json output=json maptoarray=true maptoarraykey=type file=" + _f]).getJson(0)
      ow.test.assert(_r.stdout, [{ type: "a", x: 1, y: -1 }, { type: "b", x: 0, y: 0 }, { type: "c", x: 1, y: 1 }], "Problem with maptoarray (2)")
   }

   exports.testArrayToMap = function() {
      var _f = io.createTempFile("testArrayToMap", ".json")
      var data1 = [{ type: "a", x: 1, y: -1 }, { type: "b", x: 0, y: 0 }, { type: "c", x: 1, y: 1 }]

      io.writeFileString(_f, stringify(data1, __, ""))
      var _r = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "input=json output=json arraytomap=true file=" + _f]).getJson(0)
      ow.test.assert(_r.stdout, {"row0":{"type":"a","x":1,"y":-1},"row1":{"type":"b","x":0,"y":0},"row2":{"type":"c","x":1,"y":1}}, "Problem with arraytomap (1)")

      _r = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "input=json output=json arraytomap=true arraytomapkey=type file=" + _f]).getJson(0)
      ow.test.assert(_r.stdout, {"a":{"x":1,"y":-1},"b":{"x":0,"y":0},"c":{"x":1,"y":1}}, "Problem with arraytomap (2)")

      _r = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "input=json output=json arraytomap=true arraytomapkey=type arraytomapkeepkey=true file=" + _f]).getJson(0)
      ow.test.assert(_r.stdout, {"a":{"type":"a","x":1,"y":-1},"b":{"type":"b","x":0,"y":0},"c":{"type":"c","x":1,"y":1}}, "Problem with arraytomap (3)")
   }

   exports.testFlatMap = function() {
      var _f = io.createTempFile("testFlatMap", ".json")
      var data1 = { a: { x: 1, y: -1 }, b: { x: 0, y: 0 }, c: { x: 1, y: 1 } }

      io.writeFileString(_f, stringify(data1, __, ""))
      var _r = $sh([getOpenAFPath() + "/oaf", "-f", "../build/oafp.source.js", "-e", "input=json output=json flatmap=true file=" + _f]).getJson(0)
      ow.test.assert(_r.stdout, {"c.x":1,"c.y":1,"b.x":0,"b.y":0,"a.x":1,"a.y":-1}, "Problem with flatmap")
   }
})()