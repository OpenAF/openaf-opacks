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

})()