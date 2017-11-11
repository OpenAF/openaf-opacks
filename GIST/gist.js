ow.loadCh();
ow.loadObj();

ow.ch.__types.gist = {
    __gist: {},
    __gistURL: "https://api.github.com",
    create       : function(aName, shouldCompress, options) {
        this.__gist[aName] = options;
    },
    destroy      : function(aName) {
        delete this.__gist[aName];
    },
    size         : function(aName) {
        return this.getKeys(aName).length;
    },
    forEach      : function(aName, aFunction, x) {
        var keys = this.getKeys(aName);
        for(let o in keys) {
            aFunction(keys[o], this.get(aName, keys[o]));
        }
    },
    getKeys      : function(aName, full) {
        var list;
        var auth;

        if (isDef(this.__gist[aName].token)) {
            auth = { Authorization: "token " + this.__gist[aName].token };
        }

        if (isDef(this.__gist[aName].user)) 
            list = ow.obj.rest.jsonGet(this.__gistURL + "/users/" + this.__gist[aName].user + "/gists", {}, undefined, undefined, undefined, auth);
        else
            list = ow.obj.rest.jsonGet(this.__gistURL + "/gists");

        return list;
    },
    getSortedKeys: function(aName, full) {
        var list = this.getKeys(aName, full);

        return $from(list).sort("updated_at").select();
    },
    getSet       : function(aName, aMatch, aK, aV, aTimestamp) {
        return undefined;
    },
    set          : function(aName, aK, aV, aTimestamp, x) {
        var auth;
        
        if (isDef(this.__gist[aName].token)) {
            auth = { Authorization: "token " + this.__gist[aName].token };
        }

        var gist = {};
        gist.public = (isUnDef(aK.public)) ? false : aK.public;
        gist.description = (isUnDef(aK.description)) ? "" : aK.description;
        gist.files = {};
        if (isUnDef(aV.files) || isDef(aK.file)) {
            if(isObject(aV) || isString(aV) || isNumber(aV) || isArray(aV)) {
                var filename = (isDef(aK.file)) ? aK.file : "object.json";
                gist.files[filename] = {};
                gist.files[filename].content = stringify(aV);
            } else {
                throw "You need to provie an object or string or number or array or a files map with filenames and contents.";
            }
        } else {
            for(var file in aV.files) {
                gist.files[file] = {};
                if (isUnDef(aV.files[file].content)) throw "Each file needs to have a 'content' key with the corresponding content.";
                gist.files[file].content = aV.files[file].content;
            }
        }
        if (isDef(aK.id)) {
            var h = new ow.obj.http();
            var rmap = merge({"Content-Type":"application/x-www-form-urlencoded"}, auth);
            var res = h.exec(this.__gistURL + "/gists/" + aK.id, "PATCH", stringify(gist), rmap);
            return jsonParse(res.response);
        } else {
            return ow.obj.rest.jsonCreate(this.__gistURL + "/gists", {}, gist, undefined, undefined, undefined, auth);
        }
    },
    setAll       : function(aName, aKs, aVs, aTimestamp) {
        var res = [];
        for(var i in aVs) {
            res.push(this.set(aName, ow.obj.filterKeys(aKs, aVs[i]), aVs[i], aTimestamp));
        }
        return res;
    },
    get          : function(aName, aK, x) {
        var auth;

        if (isDef(this.__gist[aName].token)) {
            auth = { Authorization: "token " + this.__gist[aName].token };
        }

        if (isUnDef(aK.id)) throw "You need to provide a GIST id and, optionally, a 'file'name.";

        var data = ow.obj.rest.jsonGet(this.__gistURL + "/gists/" + aK.id, {}, undefined, undefined, undefined, auth);
        var res;
        if (isDef(aK.file)) {
            if (isDef(data.files) && isDef(data.files[aK.file])) {
                if (isDef(data.files[aK.file].content)) 
                    res = data.files[aK.file];
                else
                    res = merge({ content: ow.obj.rest.get(data.files[aK.file].raw_url, {}, undefined, undefined, undefined, auth) }, data.files[aK.file]);
            } else {
                return undefined;
            }
        } else {
            if (isDef(data.files["object.json"])) {
                res = data.files["object.json"];
            } else {
                res = data;
            }
        }

        if (isDef(res.type) && res.type == "application/json") res.content = jsonParse(res.content);
        return res;
    },
    pop          : function(aName) { return undefined; },
    shift        : function(aName) { return undefined; },
    unset        : function(aName, aK) { 
        var auth;
        
        if (isDef(this.__gist[aName].token)) {
            auth = { Authorization: "token " + this.__gist[aName].token };
        }

        if (isUnDef(aK.id)) throw "You need to provide the GIST id to delete it.";

        return ow.obj.rest.jsonRemove(this.__gistURL + "/gists/" + aK.id, undefined, undefined, undefined, undefined, auth);
    }
};