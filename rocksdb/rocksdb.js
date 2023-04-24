ow.loadCh()
loadExternalJars(getOPackPath("rocksdb") || ".")
Packages.org.rocksdb.RocksDB.loadLibrary()

ow.ch.utils.rocksdb = {
	cleanDir: function(aFilePath) {
		io.listFiles(aFilePath).files.forEach(f => {
			if (f.filename.indexOf(".old.") > 0 ||
                            f.filename.startsWith("OPTIONS-") ||
                            f.filename == "LOG") io.rm(f.canonicalPath);
			if (f.filename.endsWith(".log") && f.size == 0) io.rm(f.canonicalPath);
		});
	},
	roStats: function(aFilePath) {
		var stats = {}

		var f = new java.io.File(aFilePath)
		var roptions = new Packages.org.rocksdb.Options()
		var db = new Packages.org.rocksdb.RocksDB.openReadOnly(roptions, f.getAbsolutePath())
		var ii = db.newIterator()
		var c = 0, o = __
		ii.seekToFirst()
		while(ii.isValid()) {
			c++;
			ii.next()
		}
		stats.name = db.getName()
		stats.size = c
		stats.numberLevels = db.numberLevels()

		var levels = db.getColumnFamilyMetaData().levels()
		stats.levels = []
		for(var level of levels) {
			var files = []
			for (var file of level.files()) {
				files.push({
					fileName       : file.fileName(),
					beingCompacted : file.beingCompacted(),
					numEntries     : file.numEntries(),
					numDeletions   : file.numDeletions(),
					numReadsSampled: file.numReadsSampled()
				})
			}
			stats.levels.push({
				numberFiles: level.files().size(),
				files: files
			})
		}

		var getObj = obj => {
			var _h = o => {
				if (o instanceof java.lang.String) o = String(o)
				switch(descType(o)) {
				case "bytearray":
					o = af.fromBytes2String(o)
					break
				case "java":
					o = getObj(o)
					break						
				}
				return o
			}

			var data = {}
			if (isDef(obj.entrySet)) {
				for(entry of obj.entrySet().toArray()) {
					var v = obj.get( entry.getKey() )
					if (v instanceof java.lang.String) v = String(v)
					if (isByteArray(v)) v = af.fromBytes2String(v)

					if (isJavaObject(v)) {
						Object.keys(v)
						.filter(k => k.startsWith("get"))
						.filter(k => ["getClass", "getChars", "getBytes"].indexOf(k) < 0)
						.forEach(k => {
							try {
								var _v = _h(v[k]())
								data[k.replace(/^get/, "")] = _v
							} catch(e) {
								printErr("Problem with '" + k + "': " + e)
							}
						})
					} else {
						data[String(entry.getKey())] = v
					}
				}
			} else {
				printErr(" --- " + obj.getClass())
			}
			return data
		}		

		stats = merge(stats, getObj(db.getPropertiesOfAllTables()))

		ii.close()
		db.close()
		return stats
	}
}

ow.ch.__types.rocksdb = {
	db: {},
    options: {},
	create       : function(aName, shouldCompress, options) {
		options       = _$(options).isMap().default({});
   		var aFilePath = _$(options.path, "path").isString().$_();
   		var readonly  = _$(options.readonly, "readonly").isBoolean().default(false);

   		var f = new java.io.File(aFilePath);
   		io.mkdir(aFilePath);

   		var roptions = new Packages.org.rocksdb.Options();
   		roptions.setCreateIfMissing(true);

		if (readonly) {
			this.db[aName] = new Packages.org.rocksdb.RocksDB.openReadOnly(roptions, f.getAbsolutePath());
		} else {
   			this.db[aName] = new Packages.org.rocksdb.RocksDB.open(roptions, f.getAbsolutePath());
		}
 		this.options[aName] = options;
                
        var compact = _$(roptions.compact, "compact").isBoolean().default(false);
        if (!readonly && compact) this.db[aName].compactRange();
	},
	destroy      : function(aName) {
 		if (!this.options[aName].readonly) {
			this.db[aName].syncWal();
			if (this.options[aName].compact) this.db[aName].compactRange();
		}
		this.db[aName].close();
        //this.db[aName].dispose();
	},
	size         : function(aName) {
		var ii = this.db[aName].newIterator();
		var c = 0;
		ii.seekToFirst();
		while(ii.isValid()) {
			c++;
			ii.next();
		}
		ii.close();
		return c;
	},
	forEach      : function(aName, aFunction) {
		var ii = this.db[aName].newIterator();
 		ii.seekToFirst();
		while(ii.isValid()) {
			aFunction(jsonParse(af.fromBytes2String(ii.key()), true), jsonParse(af.fromBytes2String(ii.value()), true));
		}
		ii.close();
	},
	getAll      : function(aName, full) {
		var vs = __;

                if (isUnDef(full)) {
			vs = [];
 		   	var ii = this.db[aName].newIterator();
			ii.seekToFirst();
			while(ii.isValid()) {
				vs.push(jsonParse(af.fromBytes2String(ii.value()), true));
				ii.next();
			}
			ii.close();
		} else {
			if (isArray(full)) {
				full = full.map(k => af.fromString2Bytes(stringify(sortMapKeys(k), __, "")));
				var res = af.fromJavaArray(this.db[aName].multiGetAsList(full));
				vs = res.map(v => jsonParse(af.fromBytes2String(v), true));
			}
		}
		return vs;

	},
	getKeys      : function(aName, full) {
		var ii = this.db[aName].newIterator();
		var ks = [];
		ii.seekToFirst();
		while(ii.isValid()) {
			ks.push(jsonParse(af.fromBytes2String(ii.key()), true));
			ii.next();
		}
		ii.close();
		return ks;
	},
	getSortedKeys: function(aName, full) {
		return this.getAll(aName, full);				
	},
	getSet       : function getSet(aName, aMatch, aK, aV, aTimestamp)  {
		var res;
		res = this.get(aName, aK);
		if ($stream([res]).anyMatch(aMatch)) {
			return this.set(aName, aK, aV, aTimestamp);
		}
		return __;
	},
	set          : function(aName, aK, aV, aTimestamp) {
		this.db[aName].put(af.fromString2Bytes(stringify(sortMapKeys(aK), void 0, "")), af.fromString2Bytes(stringify(aV, void 0, "")));
	},
	setAll       : function(aName, aKs, aVs, aTimestamp) {
		ow.loadObj();
		var b = new org.rocksdb.WriteBatch();
		aVs.forEach(v => {
 			var k = ow.obj.filterKeys(aKs, v);
			b.put(af.fromString2Bytes(stringify(sortMapKeys(k), __, "")), af.fromString2Bytes(stringify(v, __, "")));	
                });
                var wo = new org.rocksdb.WriteOptions();
	 	this.db[aName].write(wo, b);
		wo.close();
		b.close();
	},
	unsetAll       : function(aName, aKs, aVs, aTimestamp) {
		ow.loadObj();
		var b = new org.rocksdb.WriteBatch();
		aVs.forEach(v => {
			var k = ow.obj.filterKeys(aKs, v);
			b.delete(af.fromString2Bytes(stringify(sortMapKeys(k), __, ""))); 
		});
		var wo = new org.rocksdb.WriteOptions();
		this.db[aName].write(wo, b);
		wo.close();
		b.close();
	},		
	get          : function(aName, aK) {
		return jsonParse(af.fromBytes2String(this.db[aName].get(af.fromString2Bytes(stringify(sortMapKeys(aK), void 0, "")))), true);	
	},
	pop          : function(aName) {
		var ii = this.db[aName].newIterator();
		var r = __;

		ii.seekToLast();
		if (ii.isValid()) r = jsonParse(af.fromBytes2String(ii.key()), true);
		ii.close();
		return r;
	},
	shift        : function(aName) {
 		var ii = this.db[aName].newIterator();
		var r = __;

		ii.seekToFirst();
		if (ii.isValid()) r = jsonParse(af.fromBytes2String(ii.key()), true);
		ii.close();
		return r;
	},
	unset        : function(aName, aK, aTimestamp) {
		this.db[aName].delete(af.fromString2Bytes(stringify(sortMapKeys(aK), void 0, "")));
	}
}
