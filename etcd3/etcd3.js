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
        options.keyStamp = _$(options.keyStamp).isMap().default(void 0);
        options.stamp = _$(options.stamp).isMap().default(void 0);
        options.watch = _$(options.watch).isBoolean().default(false);
        this.__channels[aName] = options;

        this.__channels[aName].client = Packages.com.ibm.etcd.client.EtcdClient.forEndpoint(options.host, options.port).withPlainText();
        if (isDef(options.login) && isDef(options.pass)) {
            this.__channels[aName].client = this.__channels[aName].client.withCredentials(options.login, options.pass);
        }
        this.__channels[aName].client = this.__channels[aName].client.build();
        this.__channels[aName].kvClient = this.__channels[aName].client.getKvClient();

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
            this.__channels[aName].kvClient.watch(Packages.com.ibm.etcd.client.kv.KvClient.ALL_KEYS).start({ 
                onNext: event => { 
                    var setActions = [], unsetActions = [];
                    for(var oo = 0; oo < event.getEvents().size(); oo++) {
                        var aK = jsonParse(af.fromBytes2String(event.getEvents().get(oo).getKv().getKey().toByteArray()));
                        var aV = jsonParse(af.fromBytes2String(event.getEvents().get(oo).getKv().getValue().toByteArray()));
                        switch (String(event.getEvents().get(oo).getType().toString())) {
                        case "PUT": setActions.push({ k: aK, v: aV }); break;
                        case "DELETE": unsetActions.push({ k: aK, v: aV }); break;
                        }
                    }
                    setActions.map((v) => { send("set", v.k, v.v); });
                    unsetActions.map((v) => { send("unset", v.k, v.v); });
                }, 
                onError: t => {}, 
                onCompleted: () => {} 
            });
        }
    },
    destroy      : function(aName) {
        delete this.__channels[aName];
    },
    size         : function(aName) {
        //var res = $rest({ preAction: this.__channels[aName].preAction, throwExceptions: this.__channels[aName].throwExceptions, default: this.__channels[aName].default }).get(this.__channels[aName].url + "/v2/keys" + this.__channels[aName].folder);
        var res = this.__channels[aName].kvClient.get(Packages.com.ibm.etcd.api.RangeRequest.newBuilder().setKey(Packages.com.ibm.etcd.client.KeyUtils.ZERO_BYTE).setRangeEnd(com.ibm.etcd.client.KeyUtils.ZERO_BYTE).build()).get().getCount();
        if (isDef(res)) {
            return Number(res);
        } else {
            return 0;
        }
    },
    forEach      : function(aName, aFunction) {
        var res = $rest({ preAction: this.__channels[aName].preAction, throwExceptions: this.__channels[aName].throwExceptions, default: this.__channels[aName].default }).get(this.__channels[aName].url + "/v2/keys" + this.__channels[aName].folder);
        var parent = this;
        if (isDef(res) && isUnDef(res.error) && isDef(res.node) && isDef(res.node.nodes)) {
            res.node.nodes.forEach((a) => {
                if (isUnDef(a.dir)) {
                    aFunction(parent.__unescape(a.key), jsonParse(a.value));
                }
            });
            return mapArray(res.node.nodes, ["key"]);
        } else {
            return void 0;
        }
    },
    getAll      : function(aName, full) {
        //var res = $rest({ preAction: this.__channels[aName].preAction, throwExceptions: this.__channels[aName].throwExceptions, default: this.__channels[aName].default }).get(this.__channels[aName].url + "/v2/keys" + this.__channels[aName].folder);
        var res = this.__channels[aName].kvClient.get(Packages.com.ibm.etcd.api.RangeRequest.newBuilder().setKey(Packages.com.ibm.etcd.client.KeyUtils.ZERO_BYTE).setRangeEnd(com.ibm.etcd.client.KeyUtils.ZERO_BYTE).build()).get();
        if (isDef(res) && isDef(res.kvsList) ) {
            var ar = [];
            var ll = res.kvsList.toArray();
            for(var ii in ll) {
                ar.push(jsonParse(af.fromBytes2String(ll[ii].getValue().toByteArray())));
            }
            return ar;
        } else {
            return [];
        }
    },
    getKeys      : function(aName, full) {
        //var res = $rest({ preAction: this.__channels[aName].preAction, throwExceptions: this.__channels[aName].throwExceptions, default: this.__channels[aName].default }).get(this.__channels[aName].url + "/v2/keys" + this.__channels[aName].folder);
        var res = this.__channels[aName].kvClient.get(Packages.com.ibm.etcd.api.RangeRequest.newBuilder().setKey(Packages.com.ibm.etcd.client.KeyUtils.ZERO_BYTE).setRangeEnd(com.ibm.etcd.client.KeyUtils.ZERO_BYTE).build()).get();
        if (isDef(res) && isDef(res.kvsList) ) {
            var ar = [];
            var ll = res.kvsList.toArray();
            for(var ii in ll) {
                ar.push(jsonParse(af.fromBytes2String(ll[ii].getKey().toByteArray())));
            }
            return ar;
        } else {
            return [];
        }
    },
    getSortedKeys: function(aName, full) {
        //var res = $rest({ preAction: this.__channels[aName].preAction, throwExceptions: this.__channels[aName].throwExceptions, default: this.__channels[aName].default }).get(this.__channels[aName].url + "/v2/keys" + this.__channels[aName].folder);
        var res = this.__channels[aName].kvClient.get(Packages.com.ibm.etcd.api.RangeRequest.newBuilder().setKey(Packages.com.ibm.etcd.client.KeyUtils.ZERO_BYTE).setRangeEnd(com.ibm.etcd.client.KeyUtils.ZERO_BYTE).build()).get();
        if (isDef(res) && isDef(res.kvsList) ) {
            var ar = [];
            var ll = res.kvsList.toArray();
            for(var ii in ll) {
                ar.push({
                    d: ll[ii].getVersion(),
                    v: jsonParse(af.fromBytes2String(ll[ii].getKey().toByteArray()))
                });
            }
            return $from(ar).sort("-d").select((r) => { return r.v; });
        } else {
            return [];
        }
    },
    getSet       : function getSet(aName, aMatch, aK, aV, aTimestamp)  {
        var lockClient = this.__channels[aName].client.getLockClient();
        var lockKey = lockClient.lock(Packages.com.google.protobuf.ByteString.copyFromUtf8(this.__channels[aName].host + ":" + this.__channels[aName].port)).sync().getKey();

        var res, rres;
        res = this.get(aName, aK);
        if ($stream([res]).anyMatch(aMatch)) {
            rres = this.set(aName, aK, aV, aTimestamp);
        }

        lockClient.unlock(lockKey).sync();
        return rres;
    },
    set          : function(aName, aK, aV, aTimestamp) {
        //var res = $rest({ urlEncode:true, preAction: this.__channels[aName].preAction, throwExceptions: this.__channels[aName].throwExceptions, default: this.__channels[aName].default }).put(this.__channels[aName].url + "/v2/keys" + this.__channels[aName].folder + "/" + this.__escape(aK), { value: stringify(aV, void 0, "") });
        if (isDef(this.__channels[aName].keyStamp)) aK = merge(aK, this.__channels[aName].keyStamp);
        if (isDef(this.__channels[aName].stamp)) aV = merge(aV, this.__channels[aName].stamp);
        var res = this.__channels[aName].kvClient.put(Packages.com.google.protobuf.ByteString.copyFromUtf8(stringify(aK, void 0, "")), Packages.com.google.protobuf.ByteString.copyFromUtf8(stringify(aV, void 0, ""))).sync();
        if (isDef(res) && res.hasPrevKv()) {
            return jsonParse(o.getPrevKv().getValue());
        } else {
            return void 0;
        }
    },
    setAll       : function(aName, aKs, aVs, aTimestamp) {
        ow.loadObj();
        for(var i in aVs) {
            this.set(aName, ow.obj.filterKeys(aKs, aVs[i]), aVs[i], aTimestamp);
        }
    },
    unsetAll     : function(aName, aKs, aVs, aTimestamp) {
        ow.loadObj();
        for(var i in aVs) {
            this.unset(aName, ow.obj.filterKeys(aKs, aVs[i]), aVs[i], aTimestamp);
        }
    },		
    get          : function(aName, aK) {
        if (isDef(this.__channels[aName].keyStamp)) aK = merge(aK, this.__channels[aName].keyStamp);
        var res = this.__channels[aName].kvClient.get(Packages.com.google.protobuf.ByteString.copyFromUtf8(stringify(aK, void 0, ""))).sync();
        //var res = $rest({ preAction: this.__channels[aName].preAction, throwExceptions: this.__channels[aName].throwExceptions, default: this.__channels[aName].default }).get(this.__channels[aName].url + "/v2/keys" + this.__channels[aName].folder + "/" + this.__escape(aK));
        if (isDef(res) && res.getKvsCount() > 0)
            return jsonParse(af.fromBytes2String(res.getKvs(0).getValue().toByteArray()));
        else
            return void 0;
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
        this.__channels[aName].kvClient.delete(Packages.com.google.protobuf.ByteString.copyFromUtf8(stringify(aK, void 0, ""))).sync();
        //$rest({ preAction: this.__channels[aName].preAction, throwExceptions: this.__channels[aName].throwExceptions, default: this.__channels[aName].default }).delete(this.__channels[aName].url + "/v2/keys" + this.__channels[aName].folder + "/" + this.__escape(aK));
    }
};