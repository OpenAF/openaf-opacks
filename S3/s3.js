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
        this.s3 = new Packages.io.minio.MinioClient(aURL, aAccessKey, aSecret, aRegion);
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
 * <key>S3.putObject(aBucket, aObjectName, aLocalPath)</key>
 * Puts the file on aLocalPath into aBucket with the name aObjectName. Note: use "/" on the name
 * to simulate folders.
 * </odoc>
 */
S3.prototype.putObject = function(aBucket, aObjectName, aLocalPath) {
    _$(aBucket).isString().$_("Please provide a bucket name.");
    _$(aObjectName).isString().$_("Please provide an object name.");
    _$(aLocalPath).isString().$_("Please provide a local path.");

    this.s3.putObject(aBucket, aObjectName, aLocalPath);
};

/**
 * <odoc>
 * <key>S3.putObject(aBucket, aObjectName, aStream)</key>
 * Puts the aStream into aBucket with the name aObjectName. Note: use "/" on the name
 * to simulate folders.
 * </odoc>
 */
S3.prototype.putObjectStream = function(aBucket, aObjectName, aStream) {
    _$(aBucket).isString().$_("Please provide a bucket name.");
    _$(aObjectName).isString().$_("Please provide an object name.");
    
    this.s3.putObject(aBucket, aObjectName, aStream);
};

/**
 * <odoc>
 * <key>S3.getObjectStream(aBucket, aObjectName) : JavaStream</key>
 * Returns a JavaStream to get aObjectName from aBucket.
 * </odoc>
 */
S3.prototype.getObjectStream = function(aBucket, aObjectName) {
    _$(aBucket).isString().$_("Please provide a bucket name.");
    _$(aObjectName).isString().$_("Please provide an object name.");

    return this.s3.getObject(aBucket, aObjectName);
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
 * <key>S3.copyObject(aSourceBucket, aObjectName, aTargetBucket, aDestObjectName)</key>
 * Copies the aObjectName in aSourceBucket to aDestObjectName in aTargetBucket.
 * </odoc>
 */
S3.prototype.copyObject = function(aSourceBucket, aObjectName, aTargetBucket, aDestObjectName) {
    _$(aBucket).isString().$_("Please provide a bucket name.");
    _$(aObjectName).isString().$_("Please provide an object name.");
    _$(aTargetBucket).isString().$_("Please provide a target bucket.");
    _$(aDestObjectName).isString().$_("Please provide a destination object name.");

    this.s3.copyObject(aSourceBucket, aObjectName, aTargetBucket, aDestObjectName);
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