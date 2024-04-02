(function() {
    exports.testCreateDB = function() {
        $ch("rocksdb").create("rocksdb")
        $ch("rocksdb").set(1,1)
        
        ow.test.assert($ch("rocksdb").size(), 1, "Problem with creating a simple rocksdb database")
        $ch("rocksdb").destroy()
    }

    exports.testStaticStats = function() {
        io.rm("tmpDB")
        $ch("rocksdb").create("rocksdb", { path: "tmpDB" })
        $ch("rocksdb").set(1,1)
        $ch("rocksdb").destroy()

        var _r = ow.ch.utils.rocksdb.roStats("tmpDB")
        ow.test.assert(_r.size, 1, "Problem with static stats")
        io.rm("tmpDB")
    }

    exports.testUsingDB = function() {
        $ch("rocksdb").create("rocksdb")
        $ch("rocksdb").set({ k: 1 }, { k: 1, v: 1})
        
        ow.test.assert($ch("rocksdb").size(), 1, "Problem with creating a simple rocksdb database (1)")
        ow.test.assert($ch("rocksdb").get({ k: 1 }), { k: 1, v: 1 }, "Problem with creating a simple rocksdb database (2)")

        $ch("rocksdb").unset({ k: 1 })
        ow.test.assert($ch("rocksdb").size(), 0, "Problem with creating a simple rocksdb database (3)")
        
        $ch("rocksdb").destroy()
    }

    exports.testGetColumnFamilyMetaData = function() {
        // Create a tmpDB twice
        $ch("rocksdb").create("rocksdb", { path: "tmpDB" })
        $ch("rocksdb").set(1, 1)
        $ch("rocksdb").destroy()
        $ch("rocksdb").create("rocksdb", { path: "tmpDB" })
        $ch("rocksdb").set(2, 2)
        $ch("rocksdb").destroy()

        var f = new java.io.File("tmpDB")
        var roptions = new Packages.org.rocksdb.Options()
        var db = new Packages.org.rocksdb.RocksDB.openReadOnly(roptions, f.getAbsolutePath())
        var _r = db.getColumnFamilyMetaData().fileCount()

        // Destroy tmpDB
        io.rm("tmpDB")
        return isNumber(_r)
    }
})()