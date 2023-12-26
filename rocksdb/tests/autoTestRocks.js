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
})()