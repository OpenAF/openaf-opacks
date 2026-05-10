// CHManager unit tests
(function() {
  var _basePath = (io.fileExists("CHManager.js")) ? io.fileInfo(".").canonicalPath : getOPackPath("CHManager")
  if (typeof CHManager === "undefined") load(_basePath + "/CHManager.js")
  ow.loadCh()

  var _tmpDir = java.lang.System.getProperty("java.io.tmpdir") + "/chm-test"

  function makeChm() {
    var c = new CHManager()
    c._storeDir  = _tmpDir
    c._storeFile = _tmpDir + "/channels.yaml"
    if (!io.fileExists(_tmpDir)) io.mkdir(_tmpDir)
    c.init({})
    return c
  }

  function cleanup(chm) {
    try {
      var defs = chm.listDefs()
      defs.forEach(function(d) { try { chm.removeDef(d.name) } catch(e) {} })
    } catch(e) {}
  }

  exports.testBasicLifecycle = function() {
    var chm = makeChm()
    cleanup(chm)

    chm.addDef("t-lifecycle", "simple", {}, false)
    var defs = chm.listDefs()
    var found = defs.filter(function(d) { return d.name === "t-lifecycle" })
    ow.test.assert(found.length, 1, "should find the added def")
    ow.test.assert(found[0].type, "simple", "type should be simple")
    ow.test.assert(found[0].isOpen, false, "should not be open yet")

    chm.open("t-lifecycle")
    ow.test.assert(chm.isOpen("t-lifecycle"), true, "should be open after open()")

    chm.close("t-lifecycle")
    ow.test.assert(chm.isOpen("t-lifecycle"), false, "should be closed after close()")

    chm.removeDef("t-lifecycle")
    ow.test.assert(!isDef(chm.getDef("t-lifecycle")), true, "def should be gone after remove")
  }

  exports.testSetGetUnset = function() {
    var chm = makeChm()
    cleanup(chm)

    chm.addDef("t-crud", "simple", {}, false)
    chm.open("t-crud")

    chm.set("t-crud", '{"id":1}', '{"id":1,"name":"alice"}')
    chm.set("t-crud", '{"id":2}', '{"id":2,"name":"bob"}')
    ow.test.assert(chm.size("t-crud"), 2, "size should be 2")

    var val = chm.get("t-crud", '{"id":1}')
    ow.test.assert(isDef(val) && val.name === "alice", true, "get should return correct value")

    chm.unset("t-crud", '{"id":1}')
    ow.test.assert(chm.size("t-crud"), 1, "size should be 1 after unset")

    chm.close("t-crud")
    chm.removeDef("t-crud")
  }

  exports.testGetKeysPaginated = function() {
    var chm = makeChm()
    cleanup(chm)

    chm.addDef("t-keys", "simple", {}, false)
    chm.open("t-keys")

    for (var i = 1; i <= 5; i++) {
      chm.set("t-keys", '{"id":' + i + '}', '{"id":' + i + '}')
    }

    var all = chm.getKeys("t-keys")
    ow.test.assert(isArray(all), true, "getKeys should return array")
    ow.test.assert(all.length, 5, "should have 5 keys")

    var paged = chm.getKeys("t-keys", 1, 2)
    ow.test.assert(isMap(paged), true, "paginated result should be a map")
    ow.test.assert(paged.keys.length, 2, "page should have 2 keys")
    ow.test.assert(paged.total, 5, "total should be 5")

    chm.close("t-keys")
    chm.removeDef("t-keys")
  }

  exports.testClearAll = function() {
    var chm = makeChm()
    cleanup(chm)

    chm.addDef("t-clear", "simple", {}, false)
    chm.open("t-clear")
    chm.set("t-clear", '{"id":1}', '{"id":1}')
    chm.set("t-clear", '{"id":2}', '{"id":2}')
    ow.test.assert(chm.size("t-clear"), 2, "should have 2 entries before clear")

    var n = chm.clearAll("t-clear")
    ow.test.assert(n, 2, "clearAll should return count of removed entries")
    ow.test.assert(chm.size("t-clear"), 0, "channel should be empty after clearAll")

    chm.close("t-clear")
    chm.removeDef("t-clear")
  }

  exports.testEditDef = function() {
    var chm = makeChm()
    cleanup(chm)

    chm.addDef("t-edit", "simple", {}, false)
    chm.editDef("t-edit", { autoOpen: true })
    ow.test.assert(chm.getDef("t-edit").autoOpen, true, "autoOpen should be true after edit")

    chm.editDef("t-edit", { autoOpen: false })
    ow.test.assert(chm.getDef("t-edit").autoOpen, false, "autoOpen should be false after second edit")

    chm.removeDef("t-edit")
  }

  exports.testPersistenceRoundTrip = function() {
    var chm = makeChm()
    cleanup(chm)

    chm.addDef("t-persist", "simple", { compact: false }, false)

    var chm2 = new CHManager()
    chm2._storeDir  = _tmpDir
    chm2._storeFile = _tmpDir + "/channels.yaml"
    chm2._load()

    var d = chm2.getDef("t-persist")
    ow.test.assert(isDef(d), true, "definition should persist across instances")
    ow.test.assert(d.type, "simple", "type should be preserved")

    chm.removeDef("t-persist")
  }

  exports.testCreateRemote = function() {
    var chm = makeChm()
    cleanup(chm)

    chm.createRemote("t-remote", "http://localhost:8091/mychan", "user", "pass")
    var d = chm.getDef("t-remote")
    ow.test.assert(isDef(d), true, "remote def should exist")
    ow.test.assert(d.type, "remote", "type should be remote")
    ow.test.assert(d.options.url, "http://localhost:8091/mychan", "url should be set")
    ow.test.assert(d.options.login, "user", "login should be set")

    chm.removeDef("t-remote")
  }

  exports.testHousekeepSubscriber = function() {
    var chm = makeChm()
    cleanup(chm)

    chm.addDef("t-hk", "simple", {}, false)
    chm.open("t-hk")
    var id = chm.addHousekeepSubscriber("t-hk", 3)
    ow.test.assert(isDef(id), true, "housekeep subscriber should return an id")

    for (var i = 1; i <= 6; i++) {
      chm.set("t-hk", '{"id":' + i + '}', '{"id":' + i + '}')
      sleep(20)
    }
    $ch("t-hk").waitForJobs(2000)
    var sz = chm.size("t-hk")
    ow.test.assert(sz <= 3, true, "housekeep should limit channel to max 3 entries (got " + sz + ")")

    chm.close("t-hk")
    chm.removeDef("t-hk")
  }

  exports.testMirrorSubscriber = function() {
    var chm = makeChm()
    cleanup(chm)

    chm.addDef("t-src",    "simple", {}, false)
    chm.addDef("t-mirror", "simple", {}, false)
    chm.open("t-src")
    chm.open("t-mirror")

    chm.addMirrorSubscriber("t-src", "t-mirror")
    chm.set("t-src", '{"id":1}', '{"id":1,"v":"hello"}')
    $ch("t-src").waitForJobs(2000)

    var mirrored = chm.get("t-mirror", '{"id":1}')
    ow.test.assert(isDef(mirrored), true, "value should be mirrored to target channel")
    ow.test.assert(mirrored.v, "hello", "mirrored value should match source")

    chm.close("t-src")
    chm.close("t-mirror")
    chm.removeDef("t-src")
    chm.removeDef("t-mirror")
  }

  exports.testTypeRegistry = function() {
    var chm = makeChm()
    var types = chm.listTypes()

    ow.test.assert(isArray(types), true, "listTypes should return array")
    ow.test.assert(types.length >= 12, true, "should have at least 12 types (got " + types.length + ")")

    var names = types.map(function(t) { return t.type })
    ow.test.assert(names.indexOf("simple")   >= 0, true, "should include simple")
    ow.test.assert(names.indexOf("file")     >= 0, true, "should include file")
    ow.test.assert(names.indexOf("redis")    >= 0, true, "should include redis")
    ow.test.assert(names.indexOf("etcd3")    >= 0, true, "should include etcd3")
    ow.test.assert(names.indexOf("vectordb") >= 0, true, "should include vectordb")
    ow.test.assert(names.indexOf("mongo")    >= 0, true, "should include mongo")
  }

  exports.testTypeFilter = function() {
    var chm = makeChm()
    var filtered = chm.listTypes("db")
    ow.test.assert(isArray(filtered), true, "filtered listTypes should return array")
    ow.test.assert(filtered.length >= 1, true, "should find at least one type with 'db'")
    filtered.forEach(function(t) {
      ow.test.assert(t.type.indexOf("db") >= 0, true, "all types should contain filter string")
    })
  }

  exports.testGetAll = function() {
    var chm = makeChm()
    cleanup(chm)

    chm.addDef("t-getall", "simple", {}, false)
    chm.open("t-getall")
    chm.set("t-getall", '{"id":1}', '{"id":1,"v":"a"}')
    chm.set("t-getall", '{"id":2}', '{"id":2,"v":"b"}')

    var all = chm.getAll("t-getall")
    ow.test.assert(isArray(all), true, "getAll should return array")
    ow.test.assert(all.length, 2, "should return 2 values")

    var paged = chm.getAll("t-getall", 1, 1)
    ow.test.assert(isMap(paged), true, "paginated getAll should be a map")
    ow.test.assert(paged.values.length, 1, "page should have 1 value")
    ow.test.assert(paged.total, 2, "total should be 2")

    chm.close("t-getall")
    chm.removeDef("t-getall")
  }

})()
