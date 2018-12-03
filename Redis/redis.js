/**
 * <odoc>
 * <key>Redis.Redis(aHost, aPort)</key>
 * Creates a new Redis object instance to access the redis instance at aHost and the provided aPort.
 * </odoc>
 */
var Redis = function(aHost, aPort, aDBId) {
    $path(io.listFiles(getOPackPath("Redis")).files, "[?ends_with(filename, '.jar') == `true`].canonicalPath").forEach((v) => {
        af.externalAddClasspath("file:///" + v);
    });
    this.host = aHost;
    this.port = aPort;

    this.jedis = new Packages.redis.clients.jedis.Jedis(this.host, this.port);
    if (isDef(aDBId)) this.select(aDBId);
};

/**
 * <odoc>
 * <key>Redis.select(aDBId)</key>
 * Selects a different Redis database aDBId.
 * </odoc>
 */
Redis.prototype.select = function(aDBId) {
    return this.jedis.select(aDBId);
};

/**
 * <odoc>
 * <key>Redis.ping()</key>
 * Ping the current redis connection.
 * </odoc>
 */
Redis.prototype.ping = function() {
    return this.jedis.ping();
};

/**
 * <odoc>
 * <key>Redis.size() : Number</key>
 * Returns the current size (number of keys) of the current Redis database.
 * </odoc>
 */
Redis.prototype.size = function() {
    return this.jedis.dbSize();
};

/**
 * <odoc>
 * <key>Redis.getCurrentDBId() : Number</key>
 * Returns the current Redis database id.
 * </odoc>
 */
Redis.prototype.getCurrentDBId = function() {
    return this.jedis.getDB();
};

/**
 * <odoc>
 * <key>Redis.getLastSave() : Date</key>
 * Returns the date of the last successfull saving in disk.
 * </odoc>
 */
Redis.prototype.getLastSave = function() {
    return new Date(this.jedis.lastsave() * 1000);
};

/**
 * <odoc>
 * <key>Redis.close()</key>
 * Closes the current connection.
 * </odoc>
 */
Redis.prototype.close = function() {
    return this.jedis.quit();
};

/**
 * <odoc>
 * <key>Redis.getObj() : Jedis</key>
 * Access the underlying Jedis java object in use.
 * </odoc>
 */
Redis.prototype.getObj = function() {
    return this.jedis;
};

/**
 * <odoc>
 * <key>Redis.get(aKey) : Object</key>
 * Tries to retrieve the corresponding value given the provided aKey. The returning object will be adapted 
 * depending on the type of value.
 * </odoc>
 */
Redis.prototype.get = function(aKeyName) {
    switch(String(this.type(aKeyName))) {
    case "hash"  :
        var res = {};
        var keys = this.hashes_getKeys(aKeyName);
        for(var el in keys) {
            res[keys[el]] = this.hashes_get(aKeyName, keys[el]);
        }
        return res;
    case "list"  :
        return this.lists_toArray(aKeyName);
    case "set"   :
        return this.sets_toArray(aKeyName);
    case "zset"  :
        return this.sortedSets_toArray(aKeyName);
    case "string":
        return this.strings_get(aKeyName);
    case "none"  : 
        break;
    default: 
    }
};

/**
 * <odoc>
 * <key>Redis.set(aKey, aValue, aType)</key>
 * Tries to set the aValue to aKey. Optionally you can specify aType (e.g. hash, list, set, zset and string)
 * </odoc>
 */
Redis.prototype.set = function(aKeyName, aValue, aType) {
    var type;

    if (isDef(aType)) {
        type = aType;
    } else {
        type = "string";
        if (isArray(aValue)) {
            if (aValue.length > 0 && isObject(aValue[0]) && isDef(aValue[0].score) && isDef(aValue[0].element)) {
                type = "zset";
            } else {
                type = "list";
            }
        }
        
        if (type == "string" && isObject(aValue)) {
            type = "hash";
        }
    }

    switch(type) {
    case "hash"  :
        var ks = Object.keys(aValue);
        for(var el in ks) {
            this.hashes_set(aKeyName, ks[el], aValue[ks[el]]);
        }
        break;
    case "list"  :
        for(var el in aValue) {
            this.lists_push(aKeyName, aValue[el]);
        }
        break;
    case "set"   : 
        for(var el in aValue) {
            this.sets_set(aKeyName, aValue[el]);
        }
        break;
    case "zset"  :
        for(var el in aValue) {
            this.sortedSets_set(aKeyName, aValue[el]);
        }
        break;
    case "string": 
        this.strings_set(aKeyName, aValue);
        break;
    case "none"  : 
        this.strings_set(aKeyName, aValue);
        break;
    default:
        this.strings_set(aKeyName, aValue);
    }

    return this;
};

/**
 * <odoc>
 * <key>Redis.getKeys(aSearchString) : Array</key>
 * Returns the list of keys. If aSearchString is provided the returning list will be limited (by default aSearchString = "*").
 * </odoc>
 */
Redis.prototype.getKeys = function(aSearchString) {
    aSearchString = _$(aSearchString).default("*");
    var res = this.jedis.keys(aSearchString);
    var arr = [];
    if (isDef(res)) {
        arr = af.fromJavaArray(res.toArray());
    }
    return arr;
};

/**
 * <odoc>
 * <key>Redis.type(aKeyName) : String</key>
 * Returns the type of the provided aKeyName.
 * </odoc>
 */
Redis.prototype.type = function(aKeyName) {
    return this.jedis.type(aKeyName);
};

/**
 * <odoc>
 * <key>Redis.del(aKeyName)</key>
 * Deletes the corresponding aKeyName.
 * </odoc>
 */
Redis.prototype.del = function(aKeyName) {
    return this.jedis.del(aKeyName);
};

/**
 * <odoc>
 * <key>Redis.rename(aOldKeyName, aNewKeyName)</key>
 * Tries to rename aOldKeyName to aNewKeyName.
 * </odoc>
 */
Redis.prototype.rename = function(aOldKeyName, aNewKeyName) {
    return this.jedis.rename(aOldKeyName, aNewKeyName);
};

/**
 * <odoc>
 * <key>Redis.move(aKeyName, aDBId)</key>
 * Moves the current db aKeyName to aDBId.
 * </odoc>
 */
Redis.prototype.move = function(aKeyName, aDBId) {
    return this.jedis.move(aKeyName, aDBId);
};

// Strings
// -------

Redis.prototype.strings_get = function(aKeyName) {
    return this.jedis.get(aKeyName);
};

Redis.prototype.strings_set = function(aKeyName, aValue) {
    return this.jedis.set(aKeyName, aValue);
};

// Hashes
// ------

Redis.prototype.hashes_get = function(aKeyName, aHashKey) {
    return this.jedis.hget(aKeyName, aHashKey);
};

Redis.prototype.hashes_set = function(aKeyName, aHashKey, aHashValue) {
    return this.jedis.hset(aKeyName, aHashKey, aHashValue);
};

Redis.prototype.hashes_del = function(aKeyName, fieldsList) {
    if (isString(fieldsList)) fieldsList = [ fieldsList ];
    return this.jedis.hdel(aKeyName, fieldsList);
};

Redis.prototype.hashes_size = function(aKeyName) {
    return Number(this.jedis.hlen(aKeyName));
};

Redis.prototype.hashes_getKeys = function(aKeyName) {
    var res = this.jedis.hkeys(aKeyName);
    var keys = [];
    if (isDef(res)) {
        keys = af.fromJavaArray(res.toArray());
    }

    return keys;
};

// Lists
// -----

Redis.prototype.lists_push = function(aKeyName, aValue) {
    return this.jedis.lpush(aKeyName, aValue);
};

Redis.prototype.lists_pop = function(aKeyName) {
    return this.jedis.lpop(aKeyName, aValue);
};

Redis.prototype.lists_size = function(aKeyName) {
    return Number(this.jedis.llen(aKeyName));
};

Redis.prototype.lists_del = function(aKeyName, aValue, aCount) {
    return this.jedis.lrem(aKeyName, aCount, aValue);
};

Redis.prototype.lists_get = function(aKeyName, aPos, aLastPos) {
    return this.jedis.lrange(aKeyName, aPos, aLastPos);
};

Redis.prototype.lists_toArray = function(aKeyName) {
    var arr = [];
    arr = af.fromJavaArray(this.lists_get(aKeyName, 0, this.lists_size(aKeyName)).toArray());
    return arr;
};

// Sets
// ----

Redis.prototype.sets_set = function(aKeyName, aValue) {
    return this.jedis.sadd(aKeyName, aValue);
};

Redis.prototype.sets_pop = function(aKeyName) {
    return this.jedis.spop(aKeyName);
};

Redis.prototype.sets_del = function(aKeyName, aValue) {
    if (isString(aValue)) aValue = [ aValue ];
    return this.jedis.srem(aKeyName, aValue);
};

Redis.prototype.sets_toArray = function(aKeyName) {
    var arr = [];
    arr = af.fromJavaArray(this.jedis.smembers(aKeyName).toArray());
    return arr;
};

// Sorted sets
// -----------

Redis.prototype.sortedSets_set = function(aKeyName, aValue, aScoring) {
    return this.jedis.zadd(aKeyName, aScoring, aValue);
};

Redis.prototype.sortedSets_size = function(aKeyName) {
    return this.jedis.zcount(aKeyName, java.lang.Double.NEGATIVE_INFINITY, java.lang.Double.POSITIVE_INFINITY)
};

Redis.prototype.sortedSets_increment = function(aKeyName, howMuch) {
    howMuch = _$(howMuch).isNumber().default(1);
    return this.jedis.zincrby(aKeyName, howMuch);
};

Redis.prototype.sortedSets_toArray = function(aKeyName) {
    var ar = [];
    var elements = this.jedis.zrangeWithScores(aKeyName, 0, this.sortedSets_size(aKeyName)).toArray();
    for(var el in elements) {
        ar.push({
            element: elements[el].getElement(),
            score  : elements[el].getScore()
        });
    }
    return ar;
};