ow.loadCh();

var path = getOPackPath("Mongo") || String((new java.io.File("")).getAbsolutePath()).replace(/\\/g, "/");
$path(io.listFiles(path + "/lib").files, "[?ends_with(filename, '.jar') == `true`].canonicalPath").forEach((v) => {
    af.externalAddClasspath("file:///" + v);
});

ow.ch.__types.mongo = {
    __typeConvert: function(aMap) {
        traverse(aMap, (k, v, p, o) => { if(isObject(v) && isDef(v["$numberDecimal"])) o[k] = Number(v["$numberDecimal"]) });
        traverse(aMap, (k, v, p, o) => { if(isObject(v) && isDef(v["$numberLong"])) o[k] = Number(v["$numberLong"]) });
        traverse(aMap, (k, v, p, o) => { if(isObject(v) && isDef(v["$date"])) o[k] = new Date(v["$date"]) });
        return aMap;
    },
    create       : function(aName, shouldCompress, options) {
        if (isUnDef(options)) options = {};
        if (isUnDef(options.database))   options.database = "default";
        if (isUnDef(options.url))        options.url = "mongodb://localhost:27017";
        if (isUnDef(options.collection)) options.collection = "collection";

        if (isUnDef(this.__m)) this.__m = {};
        if (isUnDef(this.__d)) this.__d = {};
        if (isUnDef(this.__c)) this.__c = {};
        if (isUnDef(this.__o)) this.__o = {};

        this.__o[aName] = options;
        this.__m[aName] = new Packages.com.mongodb.MongoClient(new Packages.com.mongodb.MongoClientURI(options.url));
        this.__d[aName] = this.__m[aName].getDatabase(options.database);
        this.__c[aName] = this.__d[aName].getCollection(options.collection);
    },
    destroy      : function(aName) {
        this.__m[aName].close();
    },
    size         : function(aName) {
        return this.__c[aName].count();
    },
    forEach      : function(aName, aFunction, x) {
        // TODO
        var aKs = this.getKeys(aName);

        for(var i in aKs) {
            aFunction(aKs[i], this.get(aName, aKs[i], x));
        }
    },
    getKeys      : function(aName, full) {
        if (this.__c[aName].count() <= 0) return [];
        if (isUnDef(full)) full = {};

        var r = this.__c[aName].find(new Packages.org.bson.Document(full));
        if (r.first() == null) {
            return undefined;
        } else {
            var res = [];
            var i = r.iterator();
            while(i.hasNext()) {
                var val = jsonParse(i.next().toJson());
                if (val != null) {
                    var key = {};
                    if (isDef(this.__o[aName].key) && isDef(val._id)) {
                        val[this.__o[aName].key] = val._id;
                        key[this.__o[aName].key] = val._id;
                        delete val._id;
                    } else {
                        key._id = val._id;
                    }
                    res.push(key);
                }
            }

            // convert
            //traverse(res, (k, v, p, o) => { if(isObject(v) && isDef(v["$numberLong"])) o[k] = Number(v["$numberLong"]) });
            //traverse(res, (k, v, p, o) => { if(isObject(v) && isDef(v["$date"])) o[k] = new Date(v["$date"]) });
            res = this.__typeConvert(res);
            return res;
        }
    },
    getAll: function(aName, full) {
        if (this.__c[aName].count() <= 0) return [];
        if (isUnDef(full)) full = {};

        var r = this.__c[aName].find(new Packages.org.bson.Document(full));
        if (r.first() == null) {
            return undefined;
        } else {
            var res = [];
            var i = r.iterator();
            while(i.hasNext()) {
                var val = jsonParse(i.next().toJson());
                if (isDef(this.__o[aName].key) && isDef(val._id)) {
                    val[this.__o[aName].key] = val._id;
                    delete val._id;
                }
                if (val != null) res.push(val);
            }

            // convert
            //traverse(res, (k, v, p, o) => { if(isObject(v) && isDef(v["$numberLong"])) o[k] = Number(v["$numberLong"]) });
            //traverse(res, (k, v, p, o) => { if(isObject(v) && isDef(v["$date"])) o[k] = new Date(v["$date"]) });
            res = this.__typeConvert(res);
            return res;
        }
    },
    getSortedKeys: function(aName, full) {
        //TODO
        return this.getKeys(aName, full);
    },
    getSet       : function getSet(aName, aMatch, aK, aV, aTimestamp)  {
        // TODO
        var res;
        res = this.get(aName, aK);
        if ($stream([res]).anyMatch(aMatch)) {
            return this.set(aName, aK, aV, aTimestamp);
        }
        return void 0;		
    },
    set          : function(aName, ak, av, aTimestamp) {
        if (isUnDef(av)) return void 0;
        if (isDef(this.__o[aName].key) && isUnDef(ak._id)) {
            ak._id = ak[this.__o[aName].key];
            av._id = ak[this.__o[aName].key];

            delete ak[this.__o[aName].key];
            delete av[this.__o[aName].key];
        }
        if (isUnDef(ak._id)) ak = { _id: ak };
        if (isDef(ak._id)) 
            av._id = ak._id;
        else
            av._id = ak;

        // convert dates and other types
        ow.loadObj();
    
        traverse(av, function(k, v, p, o) { 
            var path = (isDef(p) && p.length > 0) ? p + "." + k : k;
            var changed = false;
            if(!changed && (typeof v == "boolean"))            { changed = true; ow.obj.setPath(av, path, new java.lang.Boolean(v).booleanValue()); }
            if(!changed && isNumber(v) && v % 1 == 0)          { changed = true; ow.obj.setPath(av, path, new java.lang.Long(v).longValue()); }
            if(!changed && isNumber(v) && v % 1 != 0)          { changed = true; ow.obj.setPath(av, path, new java.lang.Double(v).doubleValue()); }
            if(!changed && isDate(v))                          { changed = true; ow.obj.setPath(av, path, new java.util.Date(v.getTime())); }
            if(!changed && isString(v) && isDate(new Date(v))) { changed = true; ow.obj.setPath(av, path, new java.util.Date((new Date(v)).getTime())); }
            if(!changed && !isObject(v))                       { changed = true; ow.obj.setPath(av, path, String(v)); }
        });

        try {
            this.__c[aName].insertOne(new Packages.org.bson.Document(av));
        } catch(e) {
            this.__c[aName].replaceOne(Packages.org.bson.BsonDocument.parse(stringify(ak)), new Packages.org.bson.Document(av));
        }
    },
    setAll       : function(aName, anArrayOfKeys, anArrayOfMapData, aTimestamp) {
        // Could implement in a faster way
        for(var i in anArrayOfMapData) {
            this.set(aName, ow.loadObj().filterKeys(anArrayOfKeys, anArrayOfMapData[i]), anArrayOfMapData[i], aTimestamp);
        }
    },
    get          : function(aName, aKey) {
        if (isUnDef(aKey)) return undefined;

        if (isDef(this.__o[aName].key) && isUnDef(aKey._id)) {
            aKey._id = aKey[this.__o[aName].key];
            delete aKey[this.__o[aName].key];
         }

        var r = this.__c[aName].find(new Packages.org.bson.Document(aKey)).first();
        if (r == null) {
            return undefined;
        } else {
            var res = jsonParse(r.toJson());

            if (isDef(this.__o[aName].key) && isDef(res._id)) {
                res[this.__o[aName].key] = res._id;
                delete res._id;
            }

            //traverse(res, (k, v, p, o) => { if(isObject(v) && isDef(v["$numberLong"])) o[k] = Number(v["$numberLong"]) });
            //traverse(res, (k, v, p, o) => { if(isObject(v) && isDef(v["$date"])) o[k] = new Date(v["$date"]) });
            res = this.__typeConvert(res);
            return res;
        }
    },
    pop          : function(aName) {
        // Could implement in a faster & better way
        var res = this.getAll(aName);
        return res[res.length-1]._id;
    },
    shift        : function(aName) {
        // Could implement in a faster & better way
        var res = this.getAll(aName);
        return res[0]._id;
    },
    unset        : function(aName, aKey) {
        if (isUnDef(aKey)) return undefined;
        
        return this.__c[aName].deleteOne(new Packages.org.bson.Document(aKey)).getDeletedCount();
    }
};

/**
 * <odoc>
 * <key>MongoUtil.MongoUtil(aURL)</key>
 * Creates a new instance to provide utility functions for a MongoDB given aURL (e.g. "mongodb://127.0.0.1:27017").
 * </odoc>
 */
var MongoUtil = function(aURL) {
    this.__url = aURL;
    this.__m = new Packages.com.mongodb.MongoClient(new Packages.com.mongodb.MongoClientURI(aURL));
};

/**
 * <odoc>
 * <key>MongoUtil.close()</key>
 * Closes the current MongoDB connection.
 * </odoc>
 */
MongoUtil.prototype.close = function() {
    this.__m.close();
};

/**
 * <odoc>
 * <key>MongoUtil.getDatabaseNames() : Array</key>
 * Returns an array of the current database names.
 * </odoc>
 */
MongoUtil.prototype.getDatabaseNames = function() {
    var res = [];
    var ar = this.__m.getDatabaseNames();
    var i = ar.iterator();
    while(i.hasNext()) {
        res.push(String(i.next()));
    }

    return res;
};

/**
 * <odoc>
 * <key>MongoUtil.getCollectionNames(aDatabaseName) : Array</key>
 * Returns an array of the current collection names from a given aDatabaseName.
 * </odoc>
 */
MongoUtil.prototype.getCollectionNames = function(aDatabase) {
    var res = [];
    var ar = this.__m.getDatabase(aDatabase).listCollectionNames();
    var i = ar.iterator();
    while(i.hasNext()) {
        res.push(String(i.next()));
    }
    return res;
};

/**
 * <odoc>
 * <key>MongoUtil.getCh(aDatabase, aCollectionName, aChName, extraChannelOptions) : Channel</key>
 * Creates and returns a new channel with aChName (or aCollectionName if aChName is not defined) for the 
 * given MongoDB aDatabase and aCollectionName.
 * </odoc>
 */
MongoUtil.prototype.getCh = function(aDatabase, aCollectionName, aChName, options) {
    if (isUnDef(aDatabase) && isUnDef(aCollectionName)) throw "Need to define aDatabase and aCollectionName";
    if (isUnDef(aChName)) aChName = aCollectionName;

    $ch(aChName).create(1, "mongo", merge(options, {
        url: this.__url,
        database: aDatabase,
        collection: aCollectionName
    }));

    return $ch(aChName);
};