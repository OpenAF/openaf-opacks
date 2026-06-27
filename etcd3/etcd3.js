// Author: Nuno Aguiar

ow.loadCh();
ow.loadFormat();
if (Number(ow.format.getJavaVersion().replace(/^1\./, "").split(/\./)[0]) < 8) throw "Only supports Java >= 1.8";
loadExternalJars(getOPackPath("etcd3") || ".");

ow.ch.__types.etcd3 = {
    __channels: {},
    __escape: (s) => {
        return encodeURIComponent(stringify(s, void 0, "")).replace(/%2F/g, "%25--%3B");
    },
    __unescape: (s) => {
        return jsonParse(s.replace(/\%--\;/g, "/"));
    },
    create       : function(aName, shouldCompress, options) {
        this.__channels[aName] = {};
        options = _$(options).isMap().default({});
        _$(options.host).isString().$_("A string etcd daemon host is mandatory.");
        _$(options.port).$_("A string etcd daemon port is mandatory.");
        options.namespace = _$(options.namespace).isString().default(void 0);
        options.throwExceptions = _$(options.throwExceptions).default(true);
        options.default = _$(options.default).default(void 0);
        options.keyStamp = _$(options.keyStamp).isMap().default(void 0);
        options.stamp = _$(options.stamp).isMap().default(void 0);
        options.watch = _$(options.watch).isBoolean().default(false);

        this.__channels[aName] = options;

        var _ByteSeq = Packages.io.etcd.jetcd.ByteSequence;
        var _UTF8 = java.nio.charset.StandardCharsets.UTF_8;
        var _zeroArr = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 1);
        var _ZERO = _ByteSeq.from(_zeroArr);

        this.__channels[aName]._ByteSeq = _ByteSeq;
        this.__channels[aName]._UTF8 = _UTF8;
        this.__channels[aName]._ZERO = _ZERO;

        var _endpointArr = java.lang.reflect.Array.newInstance(java.lang.Class.forName("java.lang.String"), 1);
        _endpointArr[0] = "http://" + options.host + ":" + options.port;
        var _builder = Packages.io.etcd.jetcd.Client.builder()
            .endpoints(_endpointArr);
        if (isDef(options.login) && isDef(options.pass)) {
            _builder = _builder.user(_ByteSeq.from(options.login, _UTF8))
                               .password(_ByteSeq.from(options.pass, _UTF8));
        }
        if (isDef(options.namespace)) {
            _builder = _builder.namespace(_ByteSeq.from(options.namespace, _UTF8));
        }
        this.__channels[aName].client = _builder.build();
        this.__channels[aName].kvClient = this.__channels[aName].client.getKVClient();

        if (options.watch) {
            var parent = ow.ch;
            var send = (aOp, aKey, aValue, aTimestamp, aUUID, x) => {
                if (Object.keys(parent.subscribers[aName]).length > 0) {
                    for(var _i in parent.subscribers[aName]) {
                        if (isUnDef(parent.jobs[aName][_i])) {
                            var f = (ii) => {
                                return () => {
                                    try {
                                        parent.subscribers[aName][ii](aName, aOp, aKey, aValue, parent, aTimestamp, aUUID, x);
                                    } catch(e) {}
                                    return ii;
                                };
                            };
                            parent.jobs[aName][_i] = $do(f(_i)).catch((e) => {
                                ow.ch.__errorHandle({
                                    chName: aName,
                                    op: aOp,
                                    key: aKey
                                }, e);
                            });
                        } else {
                            var f = (ii) => {
                                return () => {
                                    try {
                                        parent.subscribers[aName][ii](aName, aOp, aKey, aValue, parent, aTimestamp, aUUID, x);
                                    } catch(e) {}
                                    return ii;
                                };
                            };
                            parent.jobs[aName][_i].then(f(_i), ()=>{});
                        }
                    }
                }
            };
            var _watchOpt = Packages.io.etcd.jetcd.options.WatchOption.newBuilder().withRange(_ZERO).build();
            var _watchClient = this.__channels[aName].client.getWatchClient();
            this.__channels[aName].watcher = _watchClient.watch(_ZERO, _watchOpt, response => {
                var setActions = [], unsetActions = [];
                var events = response.getEvents();
                for (var oo = 0; oo < events.size(); oo++) {
                    var ev = events.get(oo);
                    var aK = jsonParse(af.fromBytes2String(ev.getKeyValue().getKey().getBytes()));
                    var aV = jsonParse(af.fromBytes2String(ev.getKeyValue().getValue().getBytes()));
                    switch (String(ev.getEventType())) {
                    case "PUT": setActions.push({ k: aK, v: aV }); break;
                    case "DELETE": unsetActions.push({ k: aK, v: aV }); break;
                    }
                }
                setActions.map((v) => { send("set", v.k, v.v); });
                unsetActions.map((v) => { send("unset", v.k, v.v); });
            });
        }
    },
    destroy      : function(aName) {
        if (isDef(this.__channels[aName])) {
            if (isDef(this.__channels[aName].watcher)) this.__channels[aName].watcher.close();
            if (isDef(this.__channels[aName].kvClient)) this.__channels[aName].kvClient.close();
            if (isDef(this.__channels[aName].client)) this.__channels[aName].client.close();
        }
        delete this.__channels[aName];
    },
    size         : function(aName) {
        try {
            var _ByteSeq = this.__channels[aName]._ByteSeq;
            var _ZERO = this.__channels[aName]._ZERO;
            var _opt = Packages.io.etcd.jetcd.options.GetOption.newBuilder().withCountOnly(true).withRange(_ZERO).build();
            var res = this.__channels[aName].kvClient.get(_ZERO, _opt).get().getCount();
            if (isDef(res)) {
                return Number(res);
            } else {
                return 0;
            }
        } catch(e) {
            if (isDef(this.__channels[aName].throwExceptions) && !this.__channels[aName].throwExceptions) {
                return void 0;
            } else {
                throw e;
            }
        }
    },
    forEach      : function(aName, aFunction) {
        try {
            var _ZERO = this.__channels[aName]._ZERO;
            var _opt = Packages.io.etcd.jetcd.options.GetOption.newBuilder().withRange(_ZERO).build();
            var res = this.__channels[aName].kvClient.get(_ZERO, _opt).get();
            if (isDef(res) && res.getKvs().size() > 0) {
                var ll = res.getKvs().toArray();
                for(var ii in ll) {
                    aFunction(jsonParse(af.fromBytes2String(ll[ii].getKey().getBytes())), jsonParse(af.fromBytes2String(ll[ii].getValue().getBytes())));
                }
            }
        } catch(e) {
            if (isDef(this.__channels[aName].throwExceptions) && !this.__channels[aName].throwExceptions) {
                return void 0;
            } else {
                throw e;
            }
        }
    },
    getAll      : function(aName, full) {
        try {
            var _ZERO = this.__channels[aName]._ZERO;
            var _opt = Packages.io.etcd.jetcd.options.GetOption.newBuilder().withRange(_ZERO).build();
            var res = this.__channels[aName].kvClient.get(_ZERO, _opt).get();
            if (isDef(res) && res.getKvs().size() > 0) {
                var ar = [];
                var ll = res.getKvs().toArray();
                for(var ii in ll) {
                    ar.push(jsonParse(af.fromBytes2String(ll[ii].getValue().getBytes())));
                }
                return ar;
            } else {
                return [];
            }
        } catch(e) {
            if (isDef(this.__channels[aName].throwExceptions) && !this.__channels[aName].throwExceptions) {
                return [ this.__channels[aName].default ];
            } else {
                throw e;
            }
        }
    },
    getKeys      : function(aName, full) {
        try {
            var _ZERO = this.__channels[aName]._ZERO;
            var _opt = Packages.io.etcd.jetcd.options.GetOption.newBuilder().withRange(_ZERO).build();
            var res = this.__channels[aName].kvClient.get(_ZERO, _opt).get();
            if (isDef(res) && res.getKvs().size() > 0) {
                var ar = [];
                var ll = res.getKvs().toArray();
                for(var ii in ll) {
                    ar.push(jsonParse(af.fromBytes2String(ll[ii].getKey().getBytes())));
                }
                return ar;
            } else {
                return [];
            }
        } catch(e) {
            if (isDef(this.__channels[aName].throwExceptions) && !this.__channels[aName].throwExceptions) {
                return [ this.__channels[aName].default ];
            } else {
                throw e;
            }
        }
    },
    getSortedKeys: function(aName, full) {
        try {
            var _ZERO = this.__channels[aName]._ZERO;
            var _opt = Packages.io.etcd.jetcd.options.GetOption.newBuilder().withRange(_ZERO).build();
            var res = this.__channels[aName].kvClient.get(_ZERO, _opt).get();
            if (isDef(res) && res.getKvs().size() > 0) {
                var ar = [];
                var ll = res.getKvs().toArray();
                for(var ii in ll) {
                    ar.push({
                        d: ll[ii].getVersion(),
                        v: jsonParse(af.fromBytes2String(ll[ii].getKey().getBytes()))
                    });
                }
                return $from(ar).sort("-d").select((r) => { return r.v; });
            } else {
                return [];
            }
        } catch(e) {
            if (isDef(this.__channels[aName].throwExceptions) && !this.__channels[aName].throwExceptions) {
                return [ this.__channels[aName].default ];
            } else {
                throw e;
            }
        }
    },
    getSet       : function getSet(aName, aMatch, aK, aV, aTimestamp)  {
        try {
            var _ByteSeq = this.__channels[aName]._ByteSeq;
            var _UTF8 = this.__channels[aName]._UTF8;
            var leaseClient = this.__channels[aName].client.getLeaseClient();
            var leaseId = leaseClient.grant(30).get().getID();
            var lockClient = this.__channels[aName].client.getLockClient();
            var lockKey = lockClient.lock(
                _ByteSeq.from(this.__channels[aName].host + ":" + this.__channels[aName].port, _UTF8),
                leaseId
            ).get().getKey();

            var res, rres;
            res = this.get(aName, aK);
            if ($stream([res]).anyMatch(aMatch)) {
                rres = this.set(aName, aK, aV, aTimestamp);
            }

            lockClient.unlock(lockKey).get();
            leaseClient.revoke(leaseId).get();
            return rres;
        } catch(e) {
            if (isDef(this.__channels[aName].throwExceptions) && !this.__channels[aName].throwExceptions) {
                return this.__channels[aName].default;
            } else {
                throw e;
            }
        }
    },
    set          : function(aName, aK, aV, aTimestamp) {
        if (isDef(this.__channels[aName].keyStamp)) aK = merge(aK, this.__channels[aName].keyStamp);
        if (isDef(this.__channels[aName].stamp)) aV = merge(aV, this.__channels[aName].stamp);
        try {
            var _ByteSeq = this.__channels[aName]._ByteSeq;
            var _UTF8 = this.__channels[aName]._UTF8;
            var res = this.__channels[aName].kvClient.put(
                _ByteSeq.from(stringify(sortMapKeys(aK), void 0, ""), _UTF8),
                _ByteSeq.from(stringify(aV, void 0, ""), _UTF8)
            ).get();
            if (isDef(res) && res.hasPrevKv()) {
                return jsonParse(af.fromBytes2String(res.getPrevKv().getValue().getBytes()));
            } else {
                return aK;
            }
        } catch(e) {
            if (isDef(this.__channels[aName].throwExceptions) && !this.__channels[aName].throwExceptions) {
                return void 0;
            } else {
                throw e;
            }
        };
    },
    setAll       : function(aName, aKs, aVs, aTimestamp) {
        try {
            ow.loadObj();
            for(var i in aVs) {
                this.set(aName, ow.obj.filterKeys(aKs, aVs[i]), aVs[i], aTimestamp);
            }
        } catch(e) {
            if (isDef(this.__channels[aName].throwExceptions) && !this.__channels[aName].throwExceptions) {
                return void 0;
            } else {
                throw e;
            }
        }
    },
    unsetAll     : function(aName, aKs, aVs, aTimestamp) {
        try {
            ow.loadObj();
            for(var i in aVs) {
                this.unset(aName, ow.obj.filterKeys(aKs, aVs[i]), aVs[i], aTimestamp);
            }
        } catch(e) {
            if (isDef(this.__channels[aName].throwExceptions) && !this.__channels[aName].throwExceptions) {
                return void 0;
            } else {
                throw e;
            }
        }
    },
    get          : function(aName, aK) {
        if (isDef(this.__channels[aName].keyStamp)) aK = merge(aK, this.__channels[aName].keyStamp);
        try {
            var _ByteSeq = this.__channels[aName]._ByteSeq;
            var _UTF8 = this.__channels[aName]._UTF8;
            var res = this.__channels[aName].kvClient.get(
                _ByteSeq.from(stringify(sortMapKeys(aK), void 0, ""), _UTF8)
            ).get();
            if (isDef(res) && res.getKvs().size() > 0)
                return jsonParse(af.fromBytes2String(res.getKvs().get(0).getValue().getBytes()));
            else
                return void 0;
        } catch(e) {
            if (isDef(this.__channels[aName].throwExceptions) && !this.__channels[aName].throwExceptions) {
                return this.__channels[aName].default;
            } else {
                throw e;
            }
        }
    },
    pop          : function(aName) {
        var elems = this.getSortedKeys(aName);
        var elem = elems[elems.length - 1];
        return elem;
    },
    shift        : function(aName) {
        var elems = this.getSortedKeys(aName);
        var elem = elems[0];
        return elem;
    },
    unset        : function(aName, aK, aTimestamp) {
        if (isDef(this.__channels[aName].keyStamp)) aK = merge(aK, this.__channels[aName].keyStamp);
        try {
            var _ByteSeq = this.__channels[aName]._ByteSeq;
            var _UTF8 = this.__channels[aName]._UTF8;
            this.__channels[aName].kvClient.delete(
                _ByteSeq.from(stringify(sortMapKeys(aK), void 0, ""), _UTF8)
            ).get();
        } catch(e) {
            if (isDef(this.__channels[aName].throwExceptions) && !this.__channels[aName].throwExceptions) {
                return void 0;
            } else {
                throw e;
            }
        }
    }
};
