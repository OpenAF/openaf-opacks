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

    if (isDef(aAccessKey))
        this.s3 = new Packages.io.minio.MinioClient(aURL, Packages.openaf.AFCmdBase.afc.dIP(aAccessKey), Packages.openaf.AFCmdBase.afc.dIP(aSecret), aRegion);
    else
        this.s3 = new Packages.io.minio.MinioClient(aURL);
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
        return String(this.s3.presignedGetObject(aBucket, aObjectName), expireInSecs);
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
        return String(this.s3.presignedPutObject(aBucket, aObjectName), expireInSecs);
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
        this.s3.putObject(aBucket, aObjectName, aLocalPath);
    }
};

/**
 * <odoc>
 * <key>S3.putObject(aBucket, aObjectName, aStream, aMetaMap)</key>
 * Puts the aStream into aBucket with the name aObjectName. Optionally you can provide a meta map.
 * Note: use "/" on the name to simulate folders.
 * </odoc>
 */
S3.prototype.putObjectStream = function(aBucket, aObjectName, aStream, aMetaMap) {
    _$(aBucket).isString().$_("Please provide a bucket name.");
    _$(aObjectName).isString().$_("Please provide an object name.");
    
    if (isDef(aMetaMap) && isMap(aMetaMap)) {
        this.s3.putObject(aBucket, aObjectName, aStream, af.toJavaMap(aMetaMap));
    } else {
        this.s3.putObject(aBucket, aObjectName, aStream);
    }
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
 * <key>S3.copyObject(aSourceBucket, aObjectName, aTargetBucket, aDestObjectName, aMetaMap)</key>
 * Copies the aObjectName in aSourceBucket to aDestObjectName in aTargetBucket.
 * </odoc>
 */
S3.prototype.copyObject = function(aSourceBucket, aObjectName, aTargetBucket, aDestObjectName, aMetaMap) {
    _$(aSourceBucket).isString().$_("Please provide a bucket name.");
    _$(aObjectName).isString().$_("Please provide an object name.");
    _$(aTargetBucket).isString().$_("Please provide a target bucket.");
    _$(aDestObjectName).isString().$_("Please provide a destination object name.");

    if (isDef(aMetaMap) && isMap(aMetaMap)) {
        var co = new Packages.io.minio.CopyConditions();
        co.setReplaceMetadataDirective();
        this.s3.copyObject(aSourceBucket, aObjectName, aTargetBucket, aDestObjectName, co, af.toJavaMap(aMetaMap));
    } else {
        this.s3.copyObject(aSourceBucket, aObjectName, aTargetBucket, aDestObjectName);
    }
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