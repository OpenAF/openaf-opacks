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
        for(var o in keys) {
            aFunction(keys[o], this.get(aName, keys[o]));
        }
    },
    getKeys      : function(aName, full) {
        var list;
        var auth;

        if (isDef(this.__gist[aName]) && isDef(this.__gist[aName].token)) {
            auth = { Authorization: "token " + this.__gist[aName].token };
        }

        if (isDef(this.__gist[aName].user)) 
            list = ow.obj.rest.jsonGet(this.__gistURL + "/users/" + this.__gist[aName].user + "/gists", {}, void 0, void 0, void 0, auth);
        else
            list = ow.obj.rest.jsonGet(this.__gistURL + "/gists");

        return list;
    },
    getSortedKeys: function(aName, full) {
        var list = this.getKeys(aName, full);

        return $from(list).sort("updated_at").select();
    },
    getSet       : function(aName, aMatch, aK, aV, aTimestamp) {
        return void 0;
    },
    set          : function(aName, aK, aV, aTimestamp, x) {
        var auth;
        
        if (isDef(this.__gist[aName]) && isDef(this.__gist[aName].token)) {
            auth = { Authorization: "token " + this.__gist[aName].token };
        }

        var gist = {};
        gist.public = (isUnDef(aK.public)) ? false : aK.public;
        if (isDef(aV.description) || isDef(aK.description)) {
            gist.description = (isUnDef(aK.description) && isUnDef(aV.description)) ? "" : aK.description;
            if (isDef(aV.description)) gist.description = aV.description;
        }

        gist.files = {};
        if ( isDef(aK.file) || (aV != null && isUnDef(aV.files)) ) {
            if(aV == null || isObject(aV) || isString(aV) || isNumber(aV) || isArray(aV)) {
                var filename = (isDef(aK.file)) ? aK.file : "object.json";
                gist.files[filename] = {};
                if (aV == null)
                    gist.files[filename] = null;
                else {
                    if (isObject(aV) || isArray(aV))  gist.files[filename].content = stringify(aV, void 0, "");
                    if (isString(aV) || isNumber(aV)) gist.files[filename].content = String(aV);
                }
            } else {
                throw "You need to provide an object or string or number or array or a files map with filenames and contents.";
            }
        } else {
            for(var file in aV.files) {
                gist.files[file] = {};
                if (aV.files[file] != null && isUnDef(aV.files[file].content)) throw "Each file needs to have a 'content' key with the corresponding content.";
                if (aV.files[file] == null)
                    gist.files[file] = null;
                else {
                    if (isObject(aV.files[file].content) || isArray(aV.files[file].content))  gist.files[file].content = stringify(aV.files[file].content, void 0, "");
                    if (isString(aV.files[file].content) || isNumber(aV.files[file].content)) gist.files[file].content = String(aV.files[file].content);
                }
            }
        }
        if (isDef(aK.id)) {
            var h = new ow.obj.http();
            var rmap = merge({"Content-Type":"application/x-www-form-urlencoded"}, auth);
            var res = h.exec(this.__gistURL + "/gists/" + aK.id, "PATCH", stringify(gist, void 0, ""), rmap);
            return jsonParse(res.response);
        } else {
            return ow.obj.rest.jsonCreate(this.__gistURL + "/gists", {}, gist, void 0, void 0, void 0, auth);
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

        if (isDef(this.__gist[aName]) && isDef(this.__gist[aName].token)) {
            auth = { Authorization: "token " + this.__gist[aName].token };
        }

        if (isUnDef(aK.id)) throw "You need to provide a GIST id and, optionally, a 'file'name.";

        var data = ow.obj.rest.jsonGet(this.__gistURL + "/gists/" + aK.id, {}, void 0, void 0, void 0, auth);
        var res;
        if (isDef(aK.file)) {
            if (isDef(data.files) && isDef(data.files[aK.file])) {
                if (isDef(data.files[aK.file].content)) 
                    res = data.files[aK.file];
                else
                    res = merge({ content: ow.obj.rest.get(data.files[aK.file].raw_url, {}, void 0, void 0, void 0, auth) }, data.files[aK.file]);
            } else {
                return void 0;
            }
        } else {
            if (isDef(data.files["object.json"])) {
                res = data.files["object.json"];
            } else {
                res = data;
            }
        }

        if (isDef(res.type) && 
            (res.type == "application/json" || res.type == "application/javascript"))
            res.content = jsonParse(res.content);
        return res;
    },
    pop          : function(aName) { return void 0; },
    shift        : function(aName) { return void 0; },
    unset        : function(aName, aK) { 
        var auth;
        
        if (isDef(this.__gist[aName]) && isDef(this.__gist[aName].token)) {
            auth = { Authorization: "token " + this.__gist[aName].token };
        }

        if (isUnDef(aK.id)) throw "You need to provide the GIST id to delete it.";

        return ow.obj.rest.jsonRemove(this.__gistURL + "/gists/" + aK.id, void 0, void 0, void 0, void 0, auth);
    }
};

/**
 * <odoc>
 * <key>GIST(aOptionsMap) : GIST</key>
 * Creates a GIST object for easier manipulation of a "gist" openaf channel. 
 * A channel "__gist" will be created. To override this use aOptionsMap.ch to provide a different channel name.
 * </odoc> 
 */
var GIST = function(aMap) {
    if (isUnDef(aMap)) aMap = {};
    this.ch = (isDef(aMap.ch)) ? aMap.ch : "__gist";
    $ch(this.ch).create(true, "gist", aMap);
};

/**
 * <odoc>
 * <key>GIST.getCh() : Channel</key>
 * Returns the current gist channel being use.
 * </odoc>
 */
GIST.prototype.getCh = function() {
    return $ch(this.ch);
};

/**
 * <odoc>
 * <key>GIST.clip(aFile, aDescription, aContent, isPublic) : String</key>
 * Creates a new GIST given aFile (a filename), aDescription, aContent (an object, string, array or number). Optionally you
 * can specify if the GIST should be public with isPublic = true. If successfull returns the GIST id, URL and file URL.
 * </odoc>
 */
GIST.prototype.clip = function(aFile, aDescription, aContent, isPublic) {
    var aK = { public: isPublic, description: aDescription }, aV = {};
    var filename = (isDef(aFile)) ? aFile : "object.json";
    
    aV.files = {};
    aV.files[aFile] = { content: aContent };
    var res;
    try {
        res = this.getCh().set(aK, aV);
    } catch(e) {
        throw e;
    }

    return {
        id: res.id,
        gistURL: res.html_url,
        fileURL: res.files[filename].raw_url
    };
};

/**
 * <odoc>
 * <key>GIST.encryptClip(aKey, aFile, aDescription, aContent, isPublic) : String</key>
 * Creates a new GIST given aFile (a filename), aDescription, aContent (an object, string, array or number) encrypted with aKey. Optionally you
 * can specify if the GIST should be public with isPublic = true. If successfull returns the GIST id, URL and file URL.
 * </odoc>
 */
GIST.prototype.encryptClip = function(aKey, aFile, aDescription, aContent, isPublic) {
    return this.clip(aFile, aDescription, this.encrypt(stringify(aContent), aKey), isPublic);
};

/**
 * <odoc>
 * <key>GIST.getClip(aId, aFile) : Object</key>
 * Tries to retrieve aFile from the GIST aId returning it's contents.
 * </odoc>
 */
GIST.prototype.getClip = function(aId, aFile) {
    var filename = (isDef(aFile)) ? aFile : "object.json";

    var res = this.getCh().get({ id: aId, file: filename });
    
    if (isDef(res) && isDef(res.content)) {
        return res.content; 
    } else {
        return res;
    }
};

/**
 * <odoc>
 * <key>GIST.getEncryptedClip(aKey, aId, aFile) : Object</key>
 * Tries to retrieve aFile from the GIST aId returning it's encrypted contents decrypted.
 * </odoc>
 */
GIST.prototype.getEncryptedClip = function(aKey, aId, aFile) {
    return jsonParse(this.decrypt(this.getClip(aId, aFile), aKey));
}

/**
 * <odoc>
 * <key>GIST.getClips(aId) : Array</key>
 * Returns a list of GIST ids, descriptions and files available. If aID is provided only a detail list
 * of the corresponding GIST files will be returned.
 * </odoc>
 */
GIST.prototype.getClips = function(aId) {
    var res = [];

    if (isDef(aId)) {
        var tmp = this.getCh().get({ id: aId });
        if (isDef(tmp)) res = ow.obj.fromObj2Array(tmp.files);
    } else {
        res = $from(this.getCh().getKeys()).select((r) => { return { id: r.id, description: r.description, files: Object.keys(r.files) }; });
    }
    
    return res;
};

/**
 * <odoc>
 * <key>GIST.setClip(aId, aFile, aContent, aDescription) : String</key>
 * Tries to change aId GIST, for the aFile (a filename) with aContent (an object, string, array or number). Returns the GIST id, URL and file URL.
 * </odoc>
 */
GIST.prototype.setClip = function(aId, aFile, aContent, aDescription) {
    var aK = { id: aId };
    var aV = {
        files: {}
    };
    var filename = (isDef(aFile)) ? aFile : "object.json";
    if (aContent == null) 
        aV.files[filename] = null;
    else
        aV.files[filename] = { content: aContent };

    if (isDef(aDescription)) aV.description = aDescription;
    
    var res;
    try {
        res = this.getCh().set(aK, aV);
    } catch(e) {
        throw e;
    }
    
    return {
        id: res.id,
        gistURL: res.html_url,
        fileURL: (isDef(res.files[filename]) && isDef(res.files[filename].raw_url)) ? res.files[filename].raw_url : void 0
    };
};

/**
 * <odoc>
 * <key>GIST.copyClipFile(aTargetId, aSourceId, aFile)</key>
 * Tries to copy aFile from the source gist aSourceId into the target gist aTargetId.
 * </odoc>
 */
GIST.prototype.copyClipFile = function(aTargetId, aSourceId, aFile) {
    this.setClip(aTargetId, aFile, this.getClip(aSourceId, aFile));
};

/**
 * <odoc>
 * <key>GIST.setEncryptedClip(aKey, aId, aFile, aContent, aDescription) : String</key>
 * Tries to change aId GIST, for the aFile (a filename) with aContent (an object, string, array or number) encrypted
 * with aKey. Returns the GIST id, URL and file URL.
 * </odoc>
 */
GIST.prototype.setEncryptedClip = function(aKey, aId, aFile, aContent, aDescription) {
    return this.setClip(aId, aFile, this.encrypt(stringify(aContent), aKey), aDescription);
};

/**
 * <odoc>
 * <key>GIST.unClip(aID)</key>
 * Tries to delete a GIST with the provided aID.
 * </odoc>
 */
GIST.prototype.unClip = function(aID) {
    var res;

    try {
        res = this.getCh().unset({id: aID});
    } catch(e) {
        throw e;
    }

    return res;
}

/**
 * <odoc>
 * <key>GIST.getVersions(aID) : Array</key>
 * Tries to retrieve all versions of the clip/gist aID sorted by change date.
 * </odoc>
 */
GIST.prototype.getVersions = function(aID) {
    var res; 

    try {
        res = $from(this.getCh().get({ id: aID }).history)
              .sort("committed_at")
              .select((r) => {
                  return {
                      version: r.version,
                      versionId: aID + "/" + r.version,
                      date: r.committed_at
                  };
              });
    } catch(e) {
        throw e;
    }

    return res;
};

/**
 * <odoc>
 * <key>GIST.encrypt(aMap, aKey) : String</key>
 * Returns an encrypted string version of aMap to use if needed using the provided aKey to be decrypted later by GIST.decrypt.
 * </odoc>
 */
GIST.prototype.encrypt = function(aObject, aKey) {
    if (isObject(aObject)) {
        return af.encrypt(stringify(aObject, void 0, ""), aKey);
    } else {
        return af.encrypt(String(aObject), aKey);
    }
};

/**
 * <odoc>
 * <key>GIST.decrypt(aString. aKey) : String</key>
 * Returns a decrypted version of aString that was previously encrypted using GIST.encrypt for the provided aKey.
 * </odoc>
 */
GIST.prototype.decrypt = function(aString, aKey) {
    if (isString(aString)) {
        aString = aString.replace(/^"(.+)"$/, "$1");
        return jsonParse(af.decrypt(aString, aKey));
    }
};

/**
 * <odoc>
 * <key>GIST.close()</key>
 * Destroys the current gist channel (no data will be losted since is stored in GitHub)
 * </odoc>
 */
GIST.prototype.close = function() {
    $ch(this.ch).destroy();
};

/**
 * <odoc>
 * <key>GIST.browseClip(aId)</key>
 * Tries to open the browser to show the aId provided clip.
 * </odoc>
 */
GIST.prototype.browseClip = function(aId) {
    var url = "https://gist.github.com/" + aId;

    java.awt.Desktop.getDesktop().browse(new java.net.URI(url));
};

/**
 * <odoc>
 * <key>GIST.getGit(aId, aDir)</key>
 * Clones the GIST git repository with aId to aDir.
 * </odoc>
 */
GIST.prototype.getGit = function(aId, aDir) {
    plugin("GIT");

    var git = new GIT();
    git.clone("https://gist.github.com/" + aId + ".git", aDir);
    git.close();
};