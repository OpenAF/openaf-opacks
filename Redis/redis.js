/**
 * <odoc>
 * <key>Redis.Redis(aHost, aPort)</key>
 * Creates a new Redis object instance to access the redis instance at aHost and the provided aPort.
 * </odoc>
 */
var Redis = function(aHost, aPort, aDBId) {
    $path(io.listFiles(getOPackPath("Redis") || ".").files, "[?ends_with(filename, '.jar') == `true`].canonicalPath").forEach((v) => {
        af.externalAddClasspath("file:///" + v);
    });
    this.host = aHost;
    this.port = aPort;
    this.dbid = aDBId

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
 * <key>Redis.keys(aPattern) : Array</key>"
 * Returns an array of keys for the provided aPattern (e.g. "*akey", "akey*", "akey").
 * </odoc>
 */
Redis.prototype.keys = function(aPattern) {
    _$(aPattern).isString().$_();

    return af.fromJavaArray(this.jedis.keys(aPattern).toArray());
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
    return this.jedis.close()
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

Redis.prototype.getCh = function(aCh) {
    _$(aCh, "aCh").isString().$_()
    return $ch(aCh).create(1, "redis", { host: this.host, port: this.port, dbid: this.dbid })
}

ow.loadObj();
ow.obj.pool.REDIS = function(aHost, aPort, aDBId) {
    var p = this.create();
    p.setFactory(
       () => { return new Redis(aHost, aPort, aDBId); },
       (a) => { a.close(); },
       (a) => { if (a.ping() != "PONG") throw "No pong from redis"; }
    );
    return p;
};

ow.loadCh()
ow.loadObj()
// redis implementation
//
/**
* <odoc>
* <key>ow.ch.types.redis</key>
* The redis channel OpenAF simplistic implementation. The creation options are:\
* \
*    - host  (String)  The Redis server host.\
*    - port  (Number)  The Redis server port (e.g. 6379).\
     - dbid  (String)  Optionally provided the Redis db id.\
* \
* </odoc>
*/
ow.ch.__types.redis = {
    __channels: {},
    create       : function(aName, shouldCompress, options) {
      options = _$(options, "options").isMap().default({})
      _$(options.host, "redis host").isString().$_()
      options.port = _$(options.port, "redis port").isNumber().default(6379)

      var redis = new Redis(options.host, options.port, options.dbid)
      this.__channels[aName] = {
        r: redis,
        o: options
      }
    },
    destroy      : function(aName) {
      this.__channels[aName].r.close()
      delete this.__channels[aName]
    },
    size         : function(aName) {
      return this.__channels[aName].r.size()
    },
    forEach      : function(aName, aFunction) {
      this.getKeys(aName).forEach(k => {
        aFunction(k, this.get(aName, k))
      })
    },
    getAll       : function(aName, full) {
      return this.getKeys(aName, full).map(k => this.get(aName, k))
    },
    getKeys      : function(aName, full) {
      var _ks = this.__channels[aName].r.getKeys(full)
      return _ks.map(k => {
        if ((String(k.trim()).startsWith("{") && String(k.trim()).endsWith("}")) || (String(k.trim()).startsWith("[") && String(k.trim()).endsWith("]"))) 
            return jsonParse(String(k), true)
        else
            return k
      })

    },
    getSortedKeys: function(aName, full) {
      return this.__channels[aName].r.getKeys(full)
    },
    getSet       : function getSet(aName, aMatch, aK, aV, aTimestamp)  {
      throw "Redis $ch getSet not implemented"
    },
    set          : function(aName, aK, aV, aTimestamp) {
        if (isMap(aK) && isDef(aK.key)) aK = aK.key
        if (isMap(aK)) aK = stringify(sortMapKeys(aK), __, "")
        if (isMap(aV) && isDef(aV.value)) aV = aV.value
        if (isMap(aV)) aV = stringify(sortMapKeys(aV), __, "")
        return this.__channels[aName].r.set(aK, aV)
    },
    setAll       : function(aName, aKs, aVs, aTimestamp) {
        aKs = _$(aKs).isArray().default([])
        _$(aVs).isArray().$_()

        var c = 0
        aVs.forEach(v => {
            c++
            this.set(aName, ow.obj.filterKeys(aKs, v), v)
        })
        return c
    },
    unsetAll     : function(aName, aKs, aVs, aTimestamp) {
        aKs = _$(aKs).isArray().default([])
        _$(aVs).isArray().$_()

        var c = 0
        aVs.forEach(v => {
            c++
            this.unset(aName, ow.obj.filterKeys(aKs, v), v)
        })
        return c
    },
    get          : function(aName, aK) {
        if (isMap(aK) && isDef(aK.key)) aK = aK.key
        if (isMap(aK)) aK = stringify(sortMapKeys(aK), __, "")
        var _v = this.__channels[aName].r.get(aK)
        if (isDef(_v))
            if ((String(_v.trim()).startsWith("{") && String(_v.trim()).endsWith("}")) || (String(_v.trim()).startsWith("[") && String(_v.trim()).endsWith("]"))) 
                _v = jsonParse(String(_v), true)
        return _v
    },
    pop          : function(aName) {
        var _lst = this.getKeys(aName)
        if (_lst.length > 0) {
          var _v = this.get(_lst[_lst.size-1])
          this.unset(_lst[_lst.size-1])
          return _v
        }
        return __
    },
    shift        : function(aName) {
      var _lst = this.getKeys(aName)
      if (_lst.length > 0) {
        var _v = this.get(_lst[0])
        this.unset(_lst[0])
        return _v
      }
      return __
    },
    unset        : function(aName, aK, aTimestamp) {
        if (isMap(aK) && isDef(aK.key)) aK = aK.key
        if (isMap(aK)) aK = stringify(sortMapKeys(aK), __, "")
        return this.__channels[aName].r.del(aK)
    }
}
