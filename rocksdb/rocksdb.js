ow.loadCh();

ow.ch.utils.rocksdb = {
	cleanDir: function(aFilePath) {
		io.listFiles(aFilePath).files.forEach(f => {
			if (f.filename.indexOf(".old.") > 0 ||
                            f.filename.startsWith("OPTIONS-") ||
                            f.filename == "LOG") io.rm(f.canonicalPath);
			if (f.filename.endsWith(".log") && f.size == 0) io.rm(f.canonicalPath);
		});
	}
}

ow.ch.__types.rocksdb = {
	db: {},
    options: {},
	create       : function(aName, shouldCompress, options) {
   		loadExternalJars(getOPackPath("rocksdb") || ".");

		options       = _$(options).isMap().default({});
   		var aFilePath = _$(options.path, "path").isString().$_();
   		var readonly  = _$(options.readonly, "readonly").isBoolean().default(false);

   		var f = new java.io.File(aFilePath);
   		io.mkdir(aFilePath);

   		Packages.org.rocksdb.RocksDB.loadLibrary();
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
                this.db[aName].dispose();
	},
	size         : function(aName) {
		var ii = this.db[aName].newIterator();
		var c = 0;
		ii.seekToFirst();
		while(ii.isValid()) {
			c++;
			ii.next();
		}
		ii.dispose();
		return c;
	},
	forEach      : function(aName, aFunction) {
		var ii = this.db[aName].newIterator();
 		ii.seekToFirst();
		while(ii.isValid()) {
			aFunction(jsonParse(af.fromBytes2String(ii.key()), true), jsonParse(af.fromBytes2String(ii.value()), true));
		}
		ii.dispose();
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
			ii.dispose();
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
		ii.dispose();
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
		wo.dispose();
		b.dispose();
	},
	unsetAll       : function(aName, aKs, aVs, aTimestamp) {
		ow.loadObj();
		var b = new org.rocksdb.WriteBatch();
		aVs.forEach(v => {
			var k = ow.obj.filterKeys(aKs, v);
			b.remove(af.fromString2Bytes(stringify(sortMapKeys(k), __, ""))); 
		});
		var wo = new org.rocksdb.WriteOptions();
		this.db[aName].write(wo, b);
		wo.dispose();
		b.dispose();
	},		
	get          : function(aName, aK) {
		return jsonParse(af.fromBytes2String(this.db[aName].get(af.fromString2Bytes(stringify(sortMapKeys(aK), void 0, "")))), true);	
	},
	pop          : function(aName) {
		var ii = this.db[aName].newIterator();
		var r = __;

		ii.seekToLast();
		if (ii.isValid()) r = jsonParse(af.fromBytes2String(ii.key()), true);
		ii.dispose();
		return r;
	},
	shift        : function(aName) {
 		var ii = this.db[aName].newIterator();
		var r = __;

		ii.seekToFirst();
		if (ii.isValid()) r = jsonParse(af.fromBytes2String(ii.key()), true);
		ii.dispose();
		return r;
	},
	unset        : function(aName, aK, aTimestamp) {
		this.db[aName].delete(af.fromString2Bytes(stringify(sortMapKeys(aK), void 0, "")));
	}
}
