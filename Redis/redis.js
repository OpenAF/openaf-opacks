var Redis = function(aHost, aPort) {
    $path(io.listFiles(getOPackPath("Redis")).files, "[?ends_with(filename, '.jar') == `true`].canonicalPath").forEach((v) => {
        af.externalAddClasspath("file:///" + v);
    });
    this.host = aHost;
    this.port = aPort;

    this.jedis = new Packages.redis.clients.jedis.Jedis(this.host, this.port);
};

Redis.prototype.getObj = function() {
    return this.jedis;
};

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
};

Redis.prototype.getKeys = function(aKeyName, aSearchString) {
    aSearchString = _$(aSearchString).default("*");
    var res = this.jedis.keys(aSearchString);
    var arr = [];
    if (isDef(res)) {
        arr = af.fromJavaArray(res.toArray());
    }
    return arr;
};

Redis.prototype.type = function(aKeyName) {
    return this.jedis.type(aKeyName);
};

Redis.prototype.del = function(aKeyName) {
    return this.jedis.del(aKeyName);
};

Redis.prototype.rename = function(aOldKeyName, aNewKeyName) {
    return this.jedis.rename(aOldKeyName, aNewKeyName);
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