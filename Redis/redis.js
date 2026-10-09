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
    var result = this.jedis.select(aDBId);
    this.dbid = aDBId;
    return result;
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
    case "ReJSON-RL":
        return this.json_get(aKeyName);
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
            this.sortedSets_set(aKeyName, aValue[el].element, aValue[el].score);
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

// JSON and cache helpers. Keep using the existing Jedis connection so SELECT,
// authentication through getObj(), and connection ownership remain unchanged.
Redis.prototype._positiveInteger = function(aValue, aName) {
    if (typeof aValue != "number" || !isFinite(aValue) || aValue <= 0 || Math.floor(aValue) != aValue || aValue > 9007199254740991) {
        throw new Error(aName + " must be a positive safe integer");
    }
    return aValue;
};

/**
 * <odoc>
 * <key>Redis.supports(aCommand) : Boolean</key>
 * Checks COMMAND INFO for a command. ACL/connection errors propagate; availability does not imply permission to execute it.
 * </odoc>
 */
Redis.prototype.supports = function(aCommand) {
    _$(aCommand, "aCommand").isString().$_();
    var info = this.jedis.commandInfo([aCommand]);
    return info.get(aCommand.toLowerCase()) != null;
};

Redis.prototype._jsonCommand = function(aCommand, aArgs, parseJSON) {
    if (!this.supports("JSON." + aCommand)) throw new Error("Redis JSON." + aCommand + " is not supported by this server");
    var command = Packages.redis.clients.jedis.json.JsonProtocol.JsonCommand.valueOf(aCommand);
    var result = this.jedis["sendCommand(redis.clients.jedis.commands.ProtocolCommand,java.lang.String[])"](command, aArgs.map(v => String(v)));
    var decode = function(value) {
        if (value == null) return null;
        if (value instanceof java.util.List) return af.fromJavaArray(value.toArray()).map(decode);
        if (value.getClass && String(value.getClass().getName()) == "[B") {
            value = String(new java.lang.String(value, "UTF-8"));
            return parseJSON ? jsonParse(value) : value;
        }
        if (typeof value == "number" || value instanceof java.lang.Number) return Number(value);
        return parseJSON ? jsonParse(String(value)) : String(value);
    };
    return result == null ? __ : decode(result);
};

Redis.prototype._jsonEncode = function(aValue) {
    var ancestors = [];
    var validate = function(value) {
        if (value === null || typeof value == "string" || typeof value == "boolean") return;
        if (typeof value == "number" && isFinite(value)) return;
        if (!isArray(value) && Object.prototype.toString.call(value) != "[object Object]") {
            throw new Error("aValue must be JSON serializable (native maps, arrays, finite numbers, strings, booleans or null)");
        }
        if (ancestors.indexOf(value) >= 0) throw new Error("aValue must be JSON serializable (cyclic value)");
        ancestors.push(value);
        if (isArray(value)) {
            for (var i = 0; i < value.length; i++) validate(value[i]);
        } else {
            Object.keys(value).forEach(k => validate(value[k]));
        }
        ancestors.pop();
    };
    validate(aValue);
    return stringify(aValue, __, "");
};

/**
 * <odoc>
 * <key>Redis.json_get(aKey, aPath) : Object</key>
 * Returns the document when path is omitted. Explicit JSONPath ($...) returns an array of matches. Missing keys return undefined.
 * </odoc>
 */
Redis.prototype.json_get = function(aKey, aPath) {
    return this._jsonCommand("GET", isUnDef(aPath) ? [aKey] : [aKey, aPath], true);
};

/**
 * <odoc>
 * <key>Redis.json_set(aKey, aValue, aPath) : String</key>
 * Stores a JSON value at aPath (default $). Does not convert existing non-JSON keys.
 * </odoc>
 */
Redis.prototype.json_set = function(aKey, aValue, aPath) {
    return this._jsonCommand("SET", [aKey, _$(aPath).isString().default("$"), this._jsonEncode(aValue)], false);
};

/**
 * <odoc>
 * <key>Redis.json_setWithTTL(aKey, aValue, aTTLms) : String</key>
 * Atomically writes a whole JSON document and sets its positive millisecond lifetime. Requires Redis 7+ with JSON, and EVAL, JSON.SET and PEXPIRE permissions.
 * </odoc>
 */
Redis.prototype.json_setWithTTL = function(aKey, aValue, aTTLms) {
    this._positiveInteger(aTTLms, "aTTLms");
    var encoded = this._jsonEncode(aValue);
    if (!this.supports("JSON.SET")) throw new Error("Redis JSON.SET is not supported by this server");
    return String(this.jedis.eval("if not redis.acl_check_cmd('JSON.SET', KEYS[1], '$', ARGV[1]) or not redis.acl_check_cmd('PEXPIRE', KEYS[1], ARGV[2]) then return redis.error_reply('NOPERM JSON.SET and PEXPIRE permissions required') end; local r = redis.call('JSON.SET', KEYS[1], '$', ARGV[1]); redis.call('PEXPIRE', KEYS[1], ARGV[2]); return r", 1, [String(aKey), encoded, String(aTTLms)]));
};

/**
 * <odoc>
 * <key>Redis.json_del(aKey, aPath) : Number</key>
 * Deletes matching values (default $ deletes the document).
 * </odoc>
 */
Redis.prototype.json_del = function(aKey, aPath) {
    return this._jsonCommand("DEL", [aKey, _$(aPath).isString().default("$")], false);
};

/**
 * <odoc>
 * <key>Redis.json_increment(aKey, aPath, anAmount) : Array</key>
 * Atomically increments matching JSON numbers. Uses JSONPath; amount defaults to 1.
 * </odoc>
 */
Redis.prototype.json_increment = function(aKey, aPath, anAmount) {
    _$(aPath, "aPath").isString().$_();
    if (isUnDef(anAmount)) anAmount = 1;
    if (typeof anAmount != "number" || !isFinite(anAmount)) throw new Error("anAmount must be a finite number");
    return this._jsonCommand("NUMINCRBY", [aKey, aPath, anAmount], true);
};

/**
 * <odoc>
 * <key>Redis.json_arrayAppend(aKey, aPath, anArray) : Array</key>
 * Atomically appends each value from anArray to matching JSON arrays. Returns their lengths.
 * </odoc>
 */
Redis.prototype.json_arrayAppend = function(aKey, aPath, anArray) {
    _$(aPath, "aPath").isString().$_();
    _$(anArray, "anArray").isArray().$_();
    if (anArray.length == 0) throw new Error("anArray must contain at least one value");
    return this._jsonCommand("ARRAPPEND", [aKey, aPath].concat(anArray.map(v => this._jsonEncode(v))), true);
};

/**
 * <odoc>
 * <key>Redis.json_arrayPop(aKey, aPath, anIndex) : Array</key>
 * Atomically removes and returns values from matching JSON arrays. Index defaults to -1.
 * </odoc>
 */
Redis.prototype.json_arrayPop = function(aKey, aPath, anIndex) {
    _$(aPath, "aPath").isString().$_();
    anIndex = _$(anIndex, "anIndex").isNumber().default(-1);
    if (!isFinite(anIndex) || Math.floor(anIndex) != anIndex) throw new Error("anIndex must be an integer");
    return this._jsonCommand("ARRPOP", [aKey, aPath, anIndex], true);
};

/**
 * <odoc>
 * <key>Redis.expire(aKey, aTTLms) : Boolean</key>
 * Sets a positive millisecond lifetime on an existing key.
 * </odoc>
 */
Redis.prototype.expire = function(aKey, aTTLms) {
    this._positiveInteger(aTTLms, "aTTLms");
    return Number(this.jedis.pexpire(aKey, aTTLms)) == 1;
};

/**
 * <odoc>
 * <key>Redis.ttl(aKey) : Number</key>
 * Returns remaining lifetime in milliseconds, -1 for persistent keys, or -2 for missing keys.
 * </odoc>
 */
Redis.prototype.ttl = function(aKey) { return Number(this.jedis.pttl(aKey)); };

/**
 * <odoc>
 * <key>Redis.persist(aKey) : Boolean</key>
 * Removes expiration from an existing key.
 * </odoc>
 */
Redis.prototype.persist = function(aKey) { return Number(this.jedis.persist(aKey)) == 1; };

/**
 * <odoc>
 * <key>Redis.scan(aCursor, aPattern, aCount) : Map</key>
 * Returns {cursor, keys} for one SCAN page. Cursor defaults to "0", pattern to "*", count to 100. Keep cursors as strings.
 * </odoc>
 */
Redis.prototype.scan = function(aCursor, aPattern, aCount) {
    aCursor = _$(aCursor, "aCursor").isString().default("0");
    if (!/^\d+$/.test(aCursor)) throw new Error("aCursor must be a decimal cursor string");
    aPattern = _$(aPattern, "aPattern").isString().default("*");
    aCount = _$(aCount, "aCount").isNumber().default(100);
    this._positiveInteger(aCount, "aCount");
    var params = new Packages.redis.clients.jedis.params.ScanParams().match(aPattern).count(aCount);
    var result = this.jedis.scan(aCursor, params);
    return { cursor: String(result.getCursor()), keys: af.fromJavaArray(result.getResult().toArray()).map(v => String(v)) };
};

/**
 * <odoc>
 * <key>Redis.scanKeys(aPattern, aFunction, aCount)</key>
 * Calls aFunction(key) incrementally until cursor 0. Returning false stops early. SCAN may yield duplicates and is not a snapshot.
 * </odoc>
 */
Redis.prototype.scanKeys = function(aPattern, aFunction, aCount) {
    _$(aFunction, "aFunction").isFunction().$_();
    var cursor = "0";
    do {
        var page = this.scan(cursor, aPattern, aCount);
        cursor = page.cursor;
        for (var i = 0; i < page.keys.length; i++) {
            if (aFunction(page.keys[i]) === false) return;
        }
    } while (cursor != "0");
};

// Strings
// -------

Redis.prototype.strings_get = function(aKeyName) {
    return this.jedis.get(aKeyName);
};

/**
 * <odoc>
 * <key>Redis.strings_set(aKey, aValue, options) : String</key>
 * SET with optional {ttlms, nx, xx}. Positive ttlms is in milliseconds. NX and XX are mutually exclusive; unmet conditions return undefined.
 * </odoc>
 */
Redis.prototype.strings_set = function(aKeyName, aValue, options) {
    if (isUnDef(options)) return this.jedis.set(aKeyName, aValue);
    _$(options, "options").isMap().$_();
    var params = new Packages.redis.clients.jedis.params.SetParams();
    if (isDef(options.ttlms)) params.px(this._positiveInteger(options.ttlms, "ttlms"));
    if (isDef(options.nx)) _$(options.nx, "nx").isBoolean().$_();
    if (isDef(options.xx)) _$(options.xx, "xx").isBoolean().$_();
    if (options.nx && options.xx) throw new Error("nx and xx are mutually exclusive");
    if (options.nx) params.nx();
    if (options.xx) params.xx();
    var result = this.jedis.set(aKeyName, aValue, params);
    return result == null ? __ : String(result);
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
    return this.jedis.lpop(aKeyName);
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

Redis.prototype.sortedSets_increment = function(aKeyName, howMuch, aValue) {
    howMuch = _$(howMuch).isNumber().default(1);
    _$(aValue, "aValue").isString().$_();
    return this.jedis.zincrby(aKeyName, howMuch, aValue);
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

/**
 * <odoc>
 * <key>Redis.getCh(aName, options) : Channel</key>
 * Creates a channel using this connection's host, port and current database. Optional {json:true, ttlms:60000} enables JSON documents and cache lifetime.
 * </odoc>
 */
Redis.prototype.getCh = function(aCh, options) {
    _$(aCh, "aCh").isString().$_()
    options = _$(options, "options").isMap().default({})
    return $ch(aCh).create(1, "redis", merge(options, { host: this.host, port: this.port, dbid: this.dbid }))
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
*    - dbid  (Number)  Optionally provided the Redis db id.\
*    - json  (Boolean) Opt-in native JSON storage (default false).\
*    - ttlms (Number)  Optional positive cache lifetime in milliseconds, refreshed on each write.\
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
      try {
        if (isDef(options.json)) _$(options.json, "json").isBoolean().$_();
        if (isDef(options.ttlms)) redis._positiveInteger(options.ttlms, "ttlms");
        if (options.json && (!redis.supports("JSON.SET") || !redis.supports("JSON.GET"))) {
          throw new Error("Redis JSON channel requires JSON.SET and JSON.GET support");
        }
      } catch(e) {
        redis.close();
        throw e;
      }
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
        aFunction(k, this._getValue(aName, k))
      })
    },
    getAll       : function(aName, full) {
      return this.getKeys(aName, full).map(k => this._getValue(aName, k))
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
        var channel = this.__channels[aName];
        if (channel.o && channel.o.json) {
            if (aV === null) throw new Error("JSON channel root null is not supported by OpenAF get; wrap null in a map or array, or use json_set/json_get");
            return isDef(channel.o.ttlms) ? channel.r.json_setWithTTL(aK, aV, channel.o.ttlms) : channel.r.json_set(aK, aV);
        }
        if (isMap(aV)) aV = stringify(sortMapKeys(aV), __, "")
        else if (isArray(aV)) aV = stringify(aV, __, "")
        if (channel.o && isDef(channel.o.ttlms)) {
            return channel.r.strings_set(aK, aV, { ttlms: channel.o.ttlms });
        }
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
        var value = this._getValue(aName, aK);
        var channel = this.__channels[aName];
        // OpenAF's public get calls Object.keys on defined results, including null.
        if (channel.o && channel.o.json && value === null) throw new Error("JSON channel root null is not supported by OpenAF get; use json_get");
        return value;
    },
    _getValue    : function(aName, aK) {
        if (isMap(aK) && isDef(aK.key)) aK = aK.key
        if (isMap(aK)) aK = stringify(sortMapKeys(aK), __, "")
        var channel = this.__channels[aName];
        // Native JSON strings may themselves look like serialized objects. Never parse twice.
        if (channel.o && channel.o.json && String(channel.r.type(aK)) == "ReJSON-RL") return channel.r.json_get(aK);
        var _v = channel.r.get(aK)
        if (isString(_v) || _v instanceof java.lang.String)
            if ((String(_v.trim()).startsWith("{") && String(_v.trim()).endsWith("}")) || (String(_v.trim()).startsWith("[") && String(_v.trim()).endsWith("]"))) 
                _v = jsonParse(String(_v), true)
        return _v
    },
    pop          : function(aName) {
      var keys = this.getKeys(aName)
      return keys[keys.length - 1]
    },
    shift        : function(aName) {
      return this.getKeys(aName)[0]
    },
    unset        : function(aName, aK, aTimestamp) {
        if (isMap(aK) && isDef(aK.key)) aK = aK.key
        if (isMap(aK)) aK = stringify(sortMapKeys(aK), __, "")
        return this.__channels[aName].r.del(aK)
    }
}
