ow.loadCh();

var path = getOPackPath("Mongo") || String((new java.io.File("")).getAbsolutePath()).replace(/\\/g, "/");

af.externalAddClasspath("file:///" + path + "/lib/mongodb-java-driver-3.6.0.jar");
af.externalAddClasspath("file:///" + path + "/lib/mongodb-driver-core-3.6.0.jar");
af.externalAddClasspath("file:///" + path + "/lib/mongodb-driver-3.6.0.jar");
af.externalAddClasspath("file:///" + path + "/lib/bson-3.6.0.jar");

ow.ch.__types.mongo = {
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

        for(let i in aKs) {
            aFunction(aKs[i], this.get(aName, aKs[i], x));
        }
    },
    getKeys      : function(aName, full) {
        return this.get(aName, full);
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
                if (val != null) res.push(val);
            }

            // convert
            traverse(res, (k, v, p, o) => { if(isObject(v) && isDef(v["$numberLong"])) o[k] = v["$numberLong"] });
            traverse(res, (k, v, p, o) => { if(isObject(v) && isDef(v["$date"])) o[k] = new Date(v["$date"]) });
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
        return undefined;		
    },
    set          : function(aName, ak, av, aTimestamp) {
        if (isUnDef(av)) return undefined;
        if (isUnDef(ak._id)) ak = { _id: ak };
        if (isDef(ak._id)) 
            av._id = ak._id;
        else
            av._id = ak;

        // convert dates and other types
        ow.loadObj();
    
        traverse(av, function(k, v, p, o) { 
            var path = (isDef(p) && p.length > 0) ? p + "." + k : k;
            if(isNumber(v) && v % 1 == 0)                  ow.obj.setPath(av, path, new java.lang.Long(v).longValue()); 
            if(isDate(v))                                  ow.obj.setPath(av, path, new java.util.Date(v.getTime()));
            if(isString(v) && isDate(new Date(v)))         ow.obj.setPath(av, path, new java.util.Date((new Date(v)).getTime()));
        });

        try {
            this.__c[aName].insertOne(new Packages.org.bson.Document(av));
        } catch(e) {
            this.__c[aName].replaceOne(Packages.org.bson.BsonDocument.parse(stringify(ak)), new Packages.org.bson.Document(av));
        }
    },
    setAll       : function(aName, anArrayOfKeys, anArrayOfMapData, aTimestamp) {
        // Could implement in a faster way
        for(let i in anArrayOfMapData) {
            this.set(aName, ow.loadObj().filterKeys(anArrayOfKeys, anArrayOfMapData[i]), anArrayOfMapData[i], aTimestamp);
        }
    },
    get          : function(aName, aKey) {
        if (isUnDef(aKey)) return undefined;

        var r = this.__c[aName].find(new Packages.org.bson.Document(aKey)).first();
        if (r == null) {
            return undefined;
        } else {
            var res = jsonParse(r.toJson());
            traverse(res, (k, v, p, o) => { if(isObject(v) && isDef(v["$numberLong"])) o[k] = v["$numberLong"] });
            traverse(res, (k, v, p, o) => { if(isObject(v) && isDef(v["$date"])) o[k] = new Date(v["$date"]) });
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
 * <key>MongoUtil.getCh(aDatabase, aCollectionName, aChName) : Channel</key>
 * Creates and returns a new channel with aChName (or aCollectionName if aChName is not defined) for the 
 * given MongoDB aDatabase and aCollectionName.
 * </odoc>
 */
MongoUtil.prototype.getCh = function(aDatabase, aCollectionName, aChName) {
    if (isUnDef(aDatabase) && isUnDef(aCollectionName)) throw "Need to define aDatabase and aCollectionName";
    if (isUnDef(aChName)) aChName = aCollectionName;

    $ch(aChName).create(1, "mongo", {
        url: this.__url,
        database: aDatabase,
        collection: aCollectionName
    });

    return $ch(aChName);
};