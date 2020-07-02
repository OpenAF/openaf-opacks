/**
 * <odoc>
 * <key>S3.S3(aURL, aAccessKey, aSecret, aRegion)</key>
 * Given aURL (e.g. https://s3.amazonaws.com) and, optionally aAccessKey, aSecret and aRegion,
 * creates a S3 compatible client access object.
 * </odoc>
 */
var S3 = function(aURL, aAccessKey, aSecret, aRegion) {
    if (isUnDef(getOPackPath("S3")))
        loadExternalJars(".");
    else
        loadExternalJars(getOPackPath("S3"));

    aURL = _$(aURL).default("https://s3.amazonaws.com");

    if (isDef(aAccessKey)) {
        if (isUnDef(aRegion))
            this.s3 = new Packages.io.minio.MinioClient(aURL, Packages.openaf.AFCmdBase.afc.dIP(aAccessKey), Packages.openaf.AFCmdBase.afc.dIP(aSecret));
        else
            this.s3 = new Packages.io.minio.MinioClient(aURL, Packages.openaf.AFCmdBase.afc.dIP(aAccessKey), Packages.openaf.AFCmdBase.afc.dIP(aSecret), aRegion);
    } else {
        this.s3 = new Packages.io.minio.MinioClient(aURL);
    }
};

/**
 * <odoc>
 * <key>S3.bucketExists(aBucket) : boolean</key>
 * Determines if aBucket exists.
 * </odoc>
 */
S3.prototype.bucketExists = function(aBucket) {
    _$(aBucket).isString().$_("Please provide a bucket name.");

    return Boolean(this.s3.bucketExists(aBucket));
};

/**
 * <odoc>
 * <key>S3.makeBucket(aBucket, aRegion)</key>
 * Creates aBucket with an optional aRegion.
 * </odoc>
 */
S3.prototype.makeBucket = function(aBucket, aRegion) {
    _$(aBucket).isString().$_("Please provide a bucket name.");

    if (isUnDef(aRegion))
        this.s3.makeBucket(aBucket);
    else
        this.s3.makeBucket(aBucket, aRegion);
};

/**
 * <odoc>
 * <key>S3.removeBucket(aBucket)</key>
 * Removes aBucket.
 * </odoc>
 */
S3.prototype.removeBucket = function(aBucket) {
    _$(aBucket).isString().$_("Please provide a bucket name.");

    this.s3.removeBucket(aBucket);
};

/**
 * <odoc>
 * <key>S3.listBuckets() : Array</key>
 * Returns an array with all the existing buckets.
 * </odoc>
 */
S3.prototype.listBuckets = function() {
    var lsts, res = [];

    lsts = this.s3.listBuckets().toArray();

    for(var ii in lsts) {
        res.push({
            name: lsts[ii].name(),
            creationDate: new Date(lsts[ii].creationDate().getTime())
        });
    }

    return res;
};

/**
 * <odoc>
 * <key>S3.listObjects(aBucket, aPrefix, needFull) : Array</key>
 * Returns a list of objects (equivalent to io.listFiles) in aBucket. Optionally you can 
 * provide aPrefix (e.g "myDir/") to simulate listing a folder. If needFull = true the contentType
 * and createdTime will be retrieved which results in slower results.
 * </odoc>
 */
S3.prototype.listObjects = function(aBucket, aPrefix, needFull) {
    _$(aBucket).isString().$_("Please provide a bucket name.");
    var lsts, res = [];

    if (isDef(aPrefix) && isString(aPrefix)) 
        lsts = this.s3.listObjects(aBucket, aPrefix);
    else
        lsts = this.s3.listObjects(aBucket);
        
    var itr = lsts.iterator();
    while (itr.hasNext()) { 
        var item = itr.next().get();
        var stat = {};
        if (needFull) {
            var _stat = this.s3.statObject(aBucket, String(item.objectName()));
            stat.contentType = _stat.contentType();
            stat.createdTime = _stat.createdTime().getTime();
        }
        var isDir = item.isDir() || (String(item.objectName()).endsWith("/") && (item.objectSize() == 0));
        res.push({
            isDirectory: isDir,
            isFile: !isDir,
            filename: String(item.objectName()), 
            filepath: String(item.objectName()),
            canonicalPath: String(item.objectName()),
            createdTime: (isUnDef(stat.createdTime) ? void 0 : Number(stat.createdTime)),
            lastModified: Number(item.lastModified().getTime()),
            size: Number(item.objectSize()),
            storageClass: String(item.storageClass()),
            etag: String(item.etag()).replace(/^"(.+)"$/, "$1"),
            contentType: (isUnDef(stat.createdTime) ? void 0 : String(stat.contentType))
        });
    }

    return res;
};

/**
 * <odoc>
 * <key>S3.statObject(aBucket, aObjectName) : Map</key>
 * Retrieves the available metadata for aObjectName in aBucket.
 * </odoc>
 */
S3.prototype.statObject = function(aBucket, aObjectName) {
    _$(aBucket).isString().$_("Please provide a bucket name.");
    _$(aObjectName).isString().$_("Please provide an object name.");

    var res = {
        bucket: aBucket,
        name: aObjectName
    };
    var _stat = this.s3.statObject(aBucket, aObjectName);
    res.contentType = _stat.contentType();
    res.createdTime = _stat.createdTime().getTime();
    res.etag = String(_stat.etag()).replace(/^"(.+)"$/, "$1");
    res.meta = af.fromJavaMap(_stat.httpHeaders());
    res.length = _stat.length();

    for(var kk in res.meta) {
        if (isArray(res.meta[kk]) && res.meta[kk].length == 1) {
            res.meta[kk] = res.meta[kk][0];
        }
    }

    return res;
};

/**
 * <odoc>
 * <key>S3.objectExists(aBucket, aObjectName) : boolean</key>
 * Tries to determine is aObjectName in aBucket currenlty exists.
 * </odoc>
 */
S3.prototype.objectExists = function(aBucket, aObjectName) {
    try {
        this.s3.statObject(aBucket, aObjectName);
        return true;
    } catch(e) {
        if (String(e).match(/Object does not exist/)) {
            return false;
        } else {
            throw e;
        }
    }
};

/**
 * <odoc>
 * <key>S3.getPresignedGetObject(aBucket, aObjectName, expireInSecs) : String</key>
 * Returns an URL to be used to retrieve aObjectName from aBucket with the necessary temporary credentials. If expireInSecs is
 * not provided it will default to 7 days.
 * </odoc>
 */
S3.prototype.getPresignedGetObject = function(aBucket, aObjectName, expireInSecs) {
    _$(aBucket).isString().$_("Please provide a bucket name.");
    _$(aObjectName).isString().$_("Please provide an object name.");

    if (isDef(expireInSecs) && isNumber(expireInSecs)) {
        return String(this.s3.presignedGetObject(aBucket, aObjectName, expireInSecs));
    } else {
        return String(this.s3.presignedGetObject(aBucket, aObjectName));
    }
};

/**
 * <odoc>
 * <key>S3.getPresignedPutObject(aBucket, aObjectName, expireInSecs) : String</key>
 * Returns an URL to be used to send aObjectName to aBucket with the necessary temporary credentials. If expireInSecs is
 * not provided it will default to 7 days.
 * </odoc>
 */
S3.prototype.getPresignedPutObject = function(aBucket, aObjectName, expireInSecs) {
    _$(aBucket).isString().$_("Please provide a bucket name.");
    _$(aObjectName).isString().$_("Please provide an object name.");

    if (isDef(expireInSecs) && isNumber(expireInSecs)) {
        return String(this.s3.presignedPutObject(aBucket, aObjectName, expireInSecs));
    } else {
        return String(this.s3.presignedPutObject(aBucket, aObjectName));
    }
};

/**
 * <odoc>
 * <key>S3.putObject(aBucket, aObjectName, aLocalPath)</key>
 * Puts the file on aLocalPath into aBucket with the name aObjectName.  Optionally you can provide a meta map.
 * Note: use "/" on the name to simulate folders.
 * </odoc>
 */
S3.prototype.putObject = function(aBucket, aObjectName, aLocalPath, aMetaMap) {
    _$(aBucket).isString().$_("Please provide a bucket name.");
    _$(aObjectName).isString().$_("Please provide an object name.");
    _$(aLocalPath).isString().$_("Please provide a local path.");

    if (isDef(aMetaMap) && isMap(aMetaMap)) {
        var is = io.readFileStream(aLocalPath);
        this.putObjectStream(aBucket, aObjectName, is, aMetaMap);
        is.close();
    } else {
        this.s3.putObject(aBucket, aObjectName, aLocalPath, this.__calcPutObjectOptions(aLocalPath));
    }
};

S3.prototype.__calcPutObjectOptions = function(aLocalPath) {
    if (isDef(aLocalPath) && io.fileExists(aLocalPath)) {
        return Packages.io.minio.PutObjectOptions(io.fileInfo(aLocalPath).size, -1);
    } else {
        return void 0;
    }
};

/**
 * <odoc>
 * <key>S3.putObjectByURL(aURL, aLocalPath)</key>
 * Puts the file on aLocalPath into aURL.  Optionally you can provide a meta map.
 * Note: use "/" on the name to simulate folders.
 * </odoc>
 */
S3.prototype.putObjectByURL = function(aURL, aLocalPath, aMetaMap) {
    var o = this.decomposeURL(aURL);
    return this.putObject(o.bucket, o.objectName, aLocalPath, aMetaMap);
};

/**
 * <odoc>
 * <key>S3.putObjectStream(aBucket, aObjectName, aStream, aMetaMap, aContentType)</key>
 * Puts the aStream into aBucket with the name aObjectName. Optionally you can provide a meta map.
 * Note: use "/" on the name to simulate folders.
 * </odoc>
 */
S3.prototype.putObjectStream = function(aBucket, aObjectName, aStream, aMetaMap, aContentType) {
    _$(aBucket).isString().$_("Please provide a bucket name.");
    _$(aObjectName).isString().$_("Please provide an object name.");
    aContentType = _$(aContentType).default(null);
    aMetaMap = _$(aMetaMap).isMap().default({});

    this.s3.putObject(aBucket, aObjectName, aStream, aStream.available(), af.toJavaMap(aMetaMap), null, aContentType);
};

/**
 * <odoc>
 * <key>S3.putObjectStreamByURL(aURL, aStream, aMetaMap)</key>
 * Puts the aStream into aURL. Optionally you can provide a meta map.
 * Note: use "/" on the name to simulate folders.
 * </odoc>
 */
S3.prototype.putObjectStreamByURL = function(aURL, aStream, aMetaMap, aContentType) {
    var o = this.decomposeURL(aURL);
    return this.putObjectStream(o.bucket, o.objectName, aStream, aMetaMap, aContentType);
};

/**
 * <odoc>
 * <key>S3.getObjectStream(aBucket, aObjectName, offset, len) : JavaStream</key>
 * Returns a JavaStream to get aObjectName from aBucket. Optionally you can provide an offset and a length.
 * </odoc>
 */
S3.prototype.getObjectStream = function(aBucket, aObjectName, offset, len) {
    _$(aBucket).isString().$_("Please provide a bucket name.");
    _$(aObjectName).isString().$_("Please provide an object name.");

    if (isDef(offset) && isNumber(offset)) {
        if (isDef(len) && isNumber(len)) {
            return this.s3.getObject(aBucket, aObjectName, offset, len);
        } else {
            return this.s3.getObject(aBucket, aObjectName, offset);
        }
    } else {
        return this.s3.getObject(aBucket, aObjectName);
    }
};

/**
 * <odoc>
 * <key>S3.getObjectStreamByURL(aURL, offset, len) : JavaStream</key>
 * Returns a JavaStream to get an object from aURL. Optionally you can provide an offset and a length.
 * </odoc>
 */
S3.prototype.getObjectStreamByURL = function(aURL, offset, len) {
    var o = this.decomposeURL(aURL);
    return this.getObjectStream(o.bucket, o.objectName, offset, len);
};

/**
 * <odoc>
 * <key>S3.getObject(aBucket, aObjectName, aRemotePath)</key>
 * Gets aObjectName from aBucket storing the file locally in aRemotePath.
 * </odoc>
 */
S3.prototype.getObject = function(aBucket, aObjectName, aRemotePath) {
    _$(aBucket).isString().$_("Please provide a bucket name.");
    _$(aObjectName).isString().$_("Please provide an object name.");
    _$(aRemotePath).isString().$_("Please provide a remote path.");

    this.s3.getObject(aBucket, aObjectName, aRemotePath);
};

/**
 * <odoc>
 * <key>S3.decomposeURL(aURL) : Map</key>
 * Given a S3 compatible aURL returns a map with the identified bucket and objectName.
 * </odoc>
 */
S3.prototype.decomposeURL = function(aURL) {
    var url = new java.net.URL(aURL);
    return {
        bucket: String(url.getHost()).replace(/([^\.]+)\..+/, "$1"),
        objectName: String(url.getPath()).replace(/^\/+/, "")
    };
};

/**
 * <odoc>
 * <key>S3.getObjectByURL(aURL, aRemotePath)</key>
 * Gets an object from an aURL storing the file locally in aRemotePath.
 * </odoc>
 */
S3.prototype.getObjectByURL = function(aURL, aRemotePath) {
    var o = this.decomposeURL(aURL);
    return this.getObject(o.bucket, o.objectName, aRemotePath);
};

/**
 * <odoc>
 * <key>S3.getObjectURL(aBucket, aObjectName) : String</key>
 * Returns the URL to access aObjectName in aBucket.
 * </odoc>
 */
S3.prototype.getObjectURL = function(aBucket, aObjectName) {
    _$(aBucket).isString().$_("Please provide a bucket name.");
    _$(aObjectName).isString().$_("Please provide an object name.");

    return String(this.s3.getObjectUrl(aBucket, aObjectName));
};

/**
 * <odoc>
 * <key>S3.removeObject(aBucket, aObjectName)</key>
 * Removes aObjectName from aBucket.
 * </odoc>
 */
S3.prototype.removeObject = function(aBucket, aObjectName) {
    _$(aBucket).isString().$_("Please provide a bucket name.");
    _$(aObjectName).isString().$_("Please provide an object name.");

    this.s3.removeObject(aBucket, aObjectName);
};

/**
 * <odoc>
 * <key>S3.copyObject(aSourceBucket, aObjectName, aTargetBucket, aDestObjectName, aMetaMap, aCopyOptions)</key>
 * Copies the aObjectName in aSourceBucket to aDestObjectName in aTargetBucket. You can optionally define a new aMetaMap and/or
 * aCopyOptions. aCopyOptions is a map with the following properties: matchETag (string), matchETagNone (string), modified, unmodified
 * </odoc>
 */
S3.prototype.copyObject = function(aSourceBucket, aObjectName, aTargetBucket, aDestObjectName, aMetaMap, aCopyOptions) {
    _$(aSourceBucket).isString().$_("Please provide a bucket name.");
    _$(aObjectName).isString().$_("Please provide an object name.");
    _$(aTargetBucket).isString().$_("Please provide a target bucket.");
    _$(aDestObjectName).isString().$_("Please provide a destination object name.");

    var co = new Packages.io.minio.CopyConditions();
    if (isDef(aCopyOptions) && isMap(aCopyOptions)) {
        if (isDef(aCopyOptions.matchETag) && isString(aCopyOptions.matchETag)) { co.setMatchETag(aCopyOptions.matchETag); }
        if (isDef(aCopyOptions.matchETagNone) && isString(aCopyOptions.matchETagNone)) { co.setMatchETagNone(aCopyOptions.matchETagNone); }
        if (isDef(aCopyOptions.modified) && isDate(aCopyOptions.modified)) { co.setModified(aCopyOptions.modified); }
        if (isDef(aCopyOptions.unmodified) && isDate(aCopyOptions.unmodified)) { co.setUnmodified(aCopyOptions.unmodified); }
    }
    if (isDef(aMetaMap) && isMap(aMetaMap)) {
        co.setReplaceMetadataDirective();
        this.s3.copyObject(aSourceBucket, aObjectName, aTargetBucket, aDestObjectName, co, af.toJavaMap(aMetaMap));
    } else {
        this.s3.copyObject(aSourceBucket, aObjectName, aTargetBucket, aDestObjectName, co);
    }
};

/**
 * <odoc>
 * <key>S3.compare(aBucket, aPrefix, aLocalPath) : Array</key>
 * Given aBucket and "folder" aPrefix compares the corresponding objects with files in the aLocalPath provided returning
 * an array of actions to make both "equal" in terms of object/file size and most recent modification. Should be use mainly for
 * compare proposes. For sync actions please use S3.squashLocalActions, S3.squashRemoteActions and S3.syncActions.
 * </odoc>
 */
S3.prototype.compare = function(aBucket, aPrefix, aLocalPath) {
    _$(aBucket).isString().$_("Please provide a bucket name.");
    aPrefix = _$(aPrefix).isString().default("");
    _$(aLocalPath).isString().$_("Please provide a local path.");
    
    if (!(aPrefix.endsWith("/")) && aPrefix.length > 0) aPrefix += "/";

    ow.loadObj();
    loadLodash();

    var rlst = ow.obj.fromArray2Obj(this.listObjects(aBucket, aPrefix), "filename");
    var slst = ow.obj.fromArray2Obj($from(listFilesRecursive(aLocalPath)).equals("isFile", true).select(), "canonicalPath");

    var realLocalPath = String((new java.io.File(aLocalPath)).getCanonicalPath()).replace(/\\/g, "/") + "/";

    // First pass
    var actions = [];
    for(var sf in slst) {
        var sfname = aPrefix + sf.substring(realLocalPath.length, sf.length);
        if (isDef(rlst[sfname])) {
            if (slst[sf].size != rlst[sfname].size || slst[sf].lastModified != rlst[sfname].lastModified) {
                if (slst[sf].lastModified != rlst[sfname].lastModified) {
                    if (slst[sf].lastModified > rlst[sfname].lastModified) {
                        actions.push({
                            cmd: "put",
                            status: "replace",
                            source: sf,
                            target: sfname,
                            targetBucket: aBucket
                        });
                    } else {
                        actions.push({
                            cmd: "get",
                            status: "replace",
                            source: sfname,
                            sourceBucket: aBucket,
                            target: sf
                        });
                    }
                } else {
                    print("Conflict with the same modified dates: " + sfname + " (" + slst[sf].lastModified + ") vs " + sf + " (" + rlsft[sfname].lastModified + ") ");
                }
            }
        } else {
            actions.push({
                cmd: "put",
                status: "new",
                source: sf,
                target: aPrefix + sf.substring(realLocalPath.length, sf.length),
                targetBucket: aBucket
            });
        }
    }

    // Second pass
    for(var rf in rlst) {
        var rsname = realLocalPath + rf.substring(aPrefix.length, rf.length);
        if (isDef(slst[rsname])) {
            if (rlst[rf].size != slst[rsname].size || rlst[rf].lastModified != slst[rsname].lastModified) {
                if (rlst[rf].lastModified != slst[rsname].lastModified) {
                    if (slst[rsname].lastModified > rlst[rf].lastModified) {
                        actions.push({
                            cmd: "put",
                            status: "replace",
                            source: rsname,
                            target: rf,
                            targetBucket: aBucket
                        });
                    } else {
                        actions.push({
                            cmd: "get",
                            status: "replace",
                            source: rf,
                            sourceBucket: aBucket,
                            target: rsname
                        });
                    }
                } else {
                    print("Conflict with the same modified dates: " + rsname + " (" + slst[rsname].lastModified + ") vs " + rf + " (" +  rlst[rf].lastModified + ") ");
                }
            }
        } else {
            actions.push({
                cmd: "get",
                status: "new",
                source: rf,
                sourceBucket: aBucket,
                target: realLocalPath + rf.substring(aPrefix.length, rf.length)
            });
        }
    }

    return _.uniqBy(actions, (e) => { return e.cmd + e.sourceBucket + e.source + e.target + e.targetBucket; });
};

/**
 * <odoc>
 * <key>S3.deleteFolderActions(aBucket, aPrefix) : Array</key>
 * Given aBucket and a "folder" aPrefix returns an array of actions to remove all objects under that "folder". Use S3.execActions
 * to execute the returned actions.
 * </odoc>
 */
S3.prototype.deleteFolderActions = function(aBucket, aPrefix) {
    _$(aBucket).isString().$_("Please provide a bucket name.");
    _$(aPrefix).isString().$_("Please provide a prefix.");

    if (!(aPrefix.endsWith("/")) && aPrefix.length > 0) aPrefix += "/";

    var actions = [];
    var lst = this.listObjects(aBucket, aPrefix);
    for(var vi in lst) {
        var v = lst[vi];
        actions.push({
            cmd: "delRemote",
            source: v.filename,
            sourceBucket: aBucket
        });
    }
    return actions;
};

/**
 * <odoc>
 * <key>S3.renameFolderActions(aBucket, aPrefix, aTargetBucket, aTargetPrefix) : Array</key>
 * Given aBucket and a "folder" aPrefix returns an array of actions to "rename"/"move" all objects to a new aTargetBucket (can
 * be the same) and a new "folder" aTargetPrefix.
 * </odoc>
 */
S3.prototype.renameFolderActions = function(aBucket, aPrefix, aTargetBucket, aTargetPrefix) {
    _$(aBucket).isString().$_("Please provide a bucket name.");
    _$(aPrefix).isString().$_("Please provide a prefix.");
    _$(aTargetBucket).isString().$_("Please provide a target bucket name.");
    _$(aTargetPrefix).isString().$_("Please provide a target prefix.");

    if (!(aPrefix.endsWith("/")) && aPrefix.length > 0) aPrefix += "/";
    if (!(aTargetPrefix.endsWith("/")) && aTargetPrefix.length > 0) aTargetPrefix += "/";

    var copyActions = [], delActions = [];
    var lst = this.listObjects(aBucket, aPrefix);
    for(var vi in lst) {
        var v = lst[vi];
        copyActions.push({
            cmd: "copy",
            source: v.filename,
            sourceBucket: aBucket,
            target: v.filename.replace(new RegExp("^" + aPrefix), aTargetPrefix),
            targetBucket: aTargetBucket
        });
        delActions.push({
            cmd: "delRemote",
            source: v.filename,
            sourceBucket: aBucket
        });
    }
    return [copyActions, delActions];
};

/**
 * <odoc>
 * <key>S3.squashLocalActions(aBucket, aPrefix, aLocalPath) : Array</key>
 * Given aBucket with a "folder" aPrefix will compare it to aLocalPath and return the an array of actions to squash the bucket/remote
 * state on aLocalPath (by retrieving object/files from the bucket and deleting local files). The actions can be executed with S3.execActions.
 * </odoc>
 */
S3.prototype.squashLocalActions = function(aBucket, aPrefix, aLocalPath) {
    var actions = this.compare(aBucket, aPrefix, aLocalPath);
    $from(actions)
    .equals("cmd", "put")
    .equals("status", "new")
    .select((r) => { r.cmd = "delLocal"; });

    $from(actions)
    .equals("cmd", "put")
    .equals("status", "replace")
    .select((r) => { r.cmd = "void"; });

    var ractions = [];
    for(var ii in actions) { 
        if (actions[ii].cmd != "void") {
            ractions.push(actions[ii]);
            delete actions[ii];
        } 
    }

    return ractions;
};

/**
 * <odoc>
 * <key>S3.squashRemoteActions(aBucket, aPrefix, aLocalPath) : Array</key>
 * Given aBucket with a "folder" aPrefix will compare it to aLocalPath and return the an array of actions to squash aLocalPath state with
 * the bucket/remote (by sending object/files to the bucket and deleting bucket object/files). The actions can be executed with S3.execActions.
 * </odoc>
 */

S3.prototype.squashRemoteActions = function(aBucket, aPrefix, aLocalPath) {
    var actions = this.compare(aBucket, aPrefix, aLocalPath);
    $from(actions)
    .equals("cmd", "get")
    .equals("status", "new")
    .select((r) => { r.cmd = "delRemote"; });

    $from(actions)
    .equals("cmd", "get")
    .equals("status", "replace")
    .select((r) => { r.cmd = "void"; });

    var ractions = [];
    for(var ii in actions) { 
        if (actions[ii].cmd != "void") {
            ractions.push(actions[ii]);
            delete actions[ii];
        } 
    }

    return ractions;
};

/**
 * <odoc>
 * <key>S3.syncActions(aBucket, aPrefix, aLocalPath) : Array</key>
 * Given aBucket and "folder" aPrefix compares the corresponding objects with files in the aLocalPath provided returning
 * an array of actions to make both "equal" in terms of object/file size and most recent modification. The result should 
 * be used, after review with S3.execActions. Do note that after updating objects will change their modified date making
 * that each call to syncActions will always return actions. Use S3.squashLocalActions and S3.squashRemoteActions for 
 * "syncing" in one direction only.
 * </odoc>
 */
S3.prototype.syncActions = function(aBucket, aPrefix, aLocalPath) {
    var actions = this.compare(aBucket, aPrefix, aLocalPath);

    return actions;
};

/**
 * <odoc>
 * <key>S3.execActions(anArrayOfActions, aLogFunction, aLogErrorFunction, numThreads)</key>
 * Given anArrayOfActions produce by other S3.*Actions functions will execute them in parallel recording changes with,
 * optionally, the provided aLogFunction and aLogErrorFunction (that receive a text message). To execute actions with a 
 * given order (for example: first copy then delete) each element of anArrayOfActions should be an array of actions (e.g.
 * an array of copy actions on the first element and an array of delete actions on the second element). Optionally you 
 * can provide the number of threads.
 * </odoc>
 */
S3.prototype.execActions = function(anArrayOfActions, aLogFunction, aLogErrorFunction, numThreads) {
    var parent = this;

    anArrayOfActions = _$(anArrayOfActions).isArray().default([]);
    aLogFunction = _$(aLogFunction).isFunction().default(log);
    aLogErrorFunction = _$(aLogErrorFunction).isFunction().default(logErr);

    if (isArray(anArrayOfActions[0])) {
        for(var ii in anArrayOfActions) {
            this.execActions(anArrayOfActions[ii], aLogFunction, aLogErrorFunction);
        }
        return;
    }

    parallel4Array(anArrayOfActions, function(action) {
        try {
            switch(action.cmd) {
            case 'get': 
                aLogFunction("Get '" + action.sourceBucket + ":" + action.source + "' to '" + action.target + "'");
                parent.getObject(action.sourceBucket, action.source, action.target);
                break;
            case 'put': 
                aLogFunction("Put '" + action.source + "' in '" + action.targetBucket + ":" + action.target + "'");
                parent.putObject(action.targetBucket, action.target, action.source);
                break;
            case 'copy':
                aLogFunction("Copy '" + action.sourceBucket + ":" + action.source + "' to '" + action.targetBucket + ":" + action.target + "'");
                parent.copyObject(action.sourceBucket, action.source, action.targetBucket, action.target);
                break;
            case 'delRemote':
                aLogFunction("Delete '" + action.sourceBucket + ":" + action.source + "'");
                parent.removeObject(action.sourceBucket, action.source);
                break;
            case 'delLocal':
                aLogFunction("Local delete '" + action.source + "'");
                io.rm(action.source);
                break;
            }
            return true;
        } catch(e) { aLogErrorFunction(e); return false; }
    }, numThreads);
};

/**
 * <odoc>
 * <key>S3.getObj() : JavaObject</key>
 * Returns the internal java object to access the S3 compatible object storage.
 * </odoc>
 */
S3.prototype.getObj = function() {
    return this.s3;
};