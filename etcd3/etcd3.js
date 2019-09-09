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
        this.__channels[aName] = options;

        this.__channels[aName].client = Packages.com.ibm.etcd.client.EtcdClient.forEndpoint(options.host, options.port).withPlainText().build();
        if (isDef(options.login) && isDef(options.pass)) {
            this.__channels[aName].client = this.__channels[aName].client.withCredentials(options.login, options.pass);
        }
        this.__channels[aName].client = this.__channels[aName].client.build();
        this.__channels[aName].kvClient = this.__channels[aName].client.getKvClient();
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
        /*var res;
        res = this.get(aName, aK);
        if ($stream([res]).anyMatch(aMatch)) {
            return this.set(aName, aK, aV, aTimestamp);
        }
        return void 0;*/
        throw "Not implemented yet";
    },
    set          : function(aName, aK, aV, aTimestamp) {
        //var res = $rest({ urlEncode:true, preAction: this.__channels[aName].preAction, throwExceptions: this.__channels[aName].throwExceptions, default: this.__channels[aName].default }).put(this.__channels[aName].url + "/v2/keys" + this.__channels[aName].folder + "/" + this.__escape(aK), { value: stringify(aV, void 0, "") });
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
        this.__channels[aName].kvClient.delete(Packages.io.etcd.jetcd.ByteSequence.from(af.fromString2Bytes(stringify(aK, void 0, ""))));
        //$rest({ preAction: this.__channels[aName].preAction, throwExceptions: this.__channels[aName].throwExceptions, default: this.__channels[aName].default }).delete(this.__channels[aName].url + "/v2/keys" + this.__channels[aName].folder + "/" + this.__escape(aK));
    }
}
