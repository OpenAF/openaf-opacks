/**
 * <odoc>
 * <key>S3.S3(aURL, aAccessKey, aSecret, aRegion, useVersion1, ignoreCertCheck)</key>
 * Given aURL (e.g. https://s3.amazonaws.com) and, optionally aAccessKey, aSecret and aRegion,
 * creates a S3 compatible client access object. If useVersion1=true it will use API version 1 where possible.
 * </odoc>
 */
var S3 = function(aURL, aAccessKey, aSecret, aRegion, useVersion1, ignoreCertCheck) {
    ignoreCertCheck = _$(ignoreCertCheck, "ignoreCertCheck").isBoolean().default(false)
    if (isUnDef(getOPackPath("S3")))
        loadExternalJars(".")
    else
        loadExternalJars(getOPackPath("S3"))

    aURL = _$(aURL).default("https://s3.amazonaws.com")

    this.httpClient = new Packages.okhttp3.OkHttpClient()

    if (isDef(aAccessKey)) {
        this.s3 = Packages.io.minio.MinioClient.builder().endpoint(aURL).httpClient(this.httpClient).credentials(Packages.openaf.AFCmdBase.afc.dIP(aAccessKey), Packages.openaf.AFCmdBase.afc.dIP(aSecret))
        if (isDef(aRegion)) this.s3 = this.s3.region(aRegion)
    } else {
        this.s3 = Packages.io.minio.MinioClient.builder().endpoint(aURL).httpClient(this.httpClient)
        if (aURL.indexOf(".amazonaws.com") > 0) {
            var providers = new Packages.io.minio.credentials.ChainedProvider(
                new Packages.io.minio.credentials.AwsConfigProvider( _$(getEnv("AWS_SHARED_CREDENTIALS_FILE")).default(String(java.lang.System.getProperty("user.home"))+".aws/credentials"), _$(getEnv("AWS_PROFILE")).default("default")), 
                new Packages.io.minio.credentials.IamAwsProvider(null, null), 
                new Packages.io.minio.credentials.AwsEnvironmentProvider() )
            this.s3 = this.s3.credentialsProvider(providers)
        }
    }
    this.s3 = this.s3.build()
    if (ignoreCertCheck) this.s3 = this.s3.ignoreCertCheck()

    this.useVersion1 = useVersion1
}

/**
 * <odoc>
 * <key>S3.close()</key>
 * Tries to close the current client. After this, no other calls will be possible.
 * </odoc>
 */
S3.prototype.close = function() {
    this.httpClient.dispatcher().executorService().shutdown()
}

/**
 * <odoc>
 * <key>S3.bucketExists(aBucket) : boolean</key>
 * Determines if aBucket exists.
 * </odoc>
 */
S3.prototype.bucketExists = function(aBucket) {
    _$(aBucket).isString().$_("Please provide a bucket name.");

    return Boolean(this.s3.bucketExists(Packages.io.minio.BucketExistsArgs.builder().bucket(aBucket).build()));
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
        this.s3.makeBucket(Packages.io.minio.MakeBucketArgs.builder().bucket(aBucket).build());
    else
        this.s3.makeBucket(Packages.io.minio.MakeBucketArgs.builder().bucket(aBucket).region(aRegion).build());
};

/**
 * <odoc>
 * <key>S3.removeBucket(aBucket)</key>
 * Removes aBucket.
 * </odoc>
 */
S3.prototype.removeBucket = function(aBucket) {
    _$(aBucket).isString().$_("Please provide a bucket name.");

    this.s3.removeBucket(Packages.io.minio.RemoveBucketArgs.builder().bucket(aBucket).build());
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
            creationDate: new Date(lsts[ii].creationDate().toString())
        });
    }

    return res;
};

/**
 * <odoc>
 * <key>S3.listObjects(aBucket, aPrefix, needFull, needRecursive) : Array</key>
 * Returns a list of objects (equivalent to io.listFiles) in aBucket. Optionally you can 
 * provide aPrefix (e.g "myDir/") to simulate listing a folder. If needFull = true the contentType
 * will be retrieved which results in slower results. If needRecursive = true all "object paths" will
 * be traversed. Please use useVersion1 on the S3 object creation if you need to force it.
 * </odoc>
 */
S3.prototype.listObjects = function(aBucket, aPrefix, needFull, needRecursive) {
    _$(aBucket).isString().$_("Please provide a bucket name.");
    var lsts, res = [];

    var lstsArgs;
    if (isDef(aPrefix) && isString(aPrefix)) 
        lstsArgs = Packages.io.minio.ListObjectsArgs.builder().bucket(aBucket).prefix(aPrefix);
    else
        lstsArgs = Packages.io.minio.ListObjectsArgs.builder().bucket(aBucket);
    
    if (this.useVersion1)   lstsArgs = lstsArgs.useApiVersion1(true);
    if (needRecursive)      lstsArgs = lstsArgs.recursive(true);

    lsts = this.s3.listObjects(lstsArgs.build());

    var itr = lsts.iterator();
    while (itr.hasNext()) { 
        var item = itr.next().get();
        var stat = {};
        if (needFull) {
            var _stat = this.s3.statObject(Packages.io.minio.StatObjectArgs.builder().bucket(aBucket).object(String(item.objectName())).build());
            stat.contentType = _stat.contentType();
        }
        var isDir = item.isDir() || (String(item.objectName()).endsWith("/"));
        res.push({
            isDirectory: isDir,
            isFile: !isDir,
            isLatest: item.isLatest(),
            filename: String(item.objectName()), 
            filepath: String(item.objectName()),
            canonicalPath: String(item.objectName()),
            lastModified: (item.objectName().endsWith("/") ? void 0 : Number(new Date(item.lastModified().toString()).getTime())),
            size: Number(item.size()),
            storageClass: String(item.storageClass()),
            etag: String(item.etag()).replace(/^"(.+)"$/, "$1"),
            owner: isNull(item.owner()) ? __ : String(item.owner().displayName()),
            version: String(item.versionId()),
            metadata: af.fromJavaMap(item.userMetadata()),
            contentType: (isUnDef(stat.contentType) ? void 0 : String(stat.contentType))
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
    var _stat = this.s3.statObject(Packages.io.minio.StatObjectArgs.builder().bucket(aBucket).object(aObjectName).build());
    res.contentType = _stat.contentType();
    res.modifiedTime = new Date(_stat.lastModified().toString());
    res.etag = String(_stat.etag()).replace(/^"(.+)"$/, "$1");
    res.meta = af.fromJavaMap(_stat.userMetadata());
    res.length = _stat.size();

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
        this.s3.statObject(Packages.io.minio.StatObjectArgs.builder().bucket(aBucket).object(aObjectName).build());
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

    var pgo = Packages.io.minio.GetPresignedObjectUrlArgs.builder().method(Packages.io.minio.http.Method.GET).bucket(aBucket).object(aObjectName);
    if (isDef(expireInSecs) && isNumber(expireInSecs)) {
        pgo = pgo.expiry(expireInSecs);
    } else {
        pgo = pgo.expiry(24 * 60 * 60);
    }
    return String(this.s3.getPresignedObjectUrl(pgo.build()));
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

    var pgo = Packages.io.minio.GetPresignedObjectUrlArgs.builder().method(Packages.io.minio.http.Method.PUT).bucket(aBucket).object(aObjectName);
    if (isDef(expireInSecs) && isNumber(expireInSecs)) {
        pgo = pgo.expiry(expireInSecs);
    } else {
        pgo = pgo.expiry(24 * 60 * 60);
    }
    return String(this.s3.getPresignedObjectUrl(pgo.build()));
};

/**
 * <odoc>
 * <key>S3.putObject(aBucket, aObjectName, aLocalPath)</key>
 * Puts the file on aLocalPath into aBucket with the name aObjectName.  Optionally you can provide a meta map.
 * Note: use "/" on the name to simulate folders.
 * </odoc>
 */
S3.prototype.putObject = function(aBucket, aObjectName, aLocalPath, aMetaMap) {
    _$(aBucket, "aBucket").isString().$_("Please provide a bucket name.");
    _$(aObjectName, "aObjectName").isString().$_("Please provide an object name.");
    _$(aLocalPath, "aLocalPath").isString().$_("Please provide a local path.");

    if (isDef(aMetaMap) && isMap(aMetaMap)) {
        var is = io.readFileStream(aLocalPath);
        this.putObjectStream(aBucket, aObjectName, is, aMetaMap);
        is.close();
    } else {
        this.s3.uploadObject(Packages.io.minio.UploadObjectArgs.builder().bucket(aBucket).object(aObjectName).filename(aLocalPath).build());
    }
};

/**
 * <odoc>
 * <key>S3.putSnowballObjects(aBucket, aPrefix, anArrayOfFilepaths, aLocalPrefix)</key>
 * Puts, using a single snowball (tar) file, all the filepaths provided in anArrayOfFilepaths or a string representing a folder (from which all files
 * will be recursively determined) into aBucket with aPrefix.
 * Optionally if an array of file paths is provided aLocalPrefix can be provided to remove the corresponding folder path from the filepaths to use.
 * </odoc>
 */
S3.prototype.putSnowballObjects = function(aBucket, aPrefix, anArrayOfFilepaths, aLocalPrefix) {
    _$(aBucket, "aBucket").isString().$_("Please provide a bucket name.")
    _$(aPrefix, "aPrefix").isString().$_("Please provide an object prefix.")
    _$(anArrayOfFilepaths, "anArrayOfFilepaths").$_("Please provide an array of filepaths or a folder")
    _$(aLocalPrefix, "aLocalPrefix").isString().default("")

    // If anArrayOfFilepaths is actually a folder make the conversion
    if (io.fileExists(anArrayOfFilepaths) && io.fileInfo(anArrayOfFilepaths).isDirectory) {
        aLocalPrefix = anArrayOfFilepaths
        anArrayOfFilepaths = listFilesRecursive(anArrayOfFilepaths).filter(f => f.isFile).map(f => f.filepath)
    }

    _$(anArrayOfFilepaths, "anArrayOfFilepaths").isArray().$_("Please provide an array of filepaths or a folder")

    // Check aPrefix
    if (!aPrefix.endsWith("/") && aPrefix.length > 0) aPrefix = aPrefix + "/"

    // Convert list of files into an array of snowball objects
    var objs = anArrayOfFilepaths.map(f => new Packages.io.minio.SnowballObject(aPrefix + f.replace(new RegExp("^" + aLocalPrefix), ""), String(f)))
    var cfg = Packages.io.minio.UploadSnowballObjectsArgs.builder().bucket(aBucket).compression(true).object(aPrefix).objects(objs)
    this.s3.uploadSnowballObjects(cfg.build())
}

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
    _$(aBucket, "aBucket").isString().$_("Please provide a bucket name.");
    _$(aObjectName, "aObjectName").isString().$_("Please provide an object name.");
    aContentType = _$(aContentType).default(null);
    aMetaMap = _$(aMetaMap).isMap().default({});

    var hmm = Packages.com.google.common.collect.HashMultimap.create();
    Object.keys(aMetaMap).forEach(k => {
        hmm.put(k, aMetaMap[k]);
    });
    var pos = Packages.io.minio.PutObjectArgs.builder().bucket(aBucket).object(aObjectName).stream(aStream, aStream.available(), -1).userMetadata(hmm);
    if (isDef(aContentType) && aContentType != null) pos = pos.contentType(aContentType);
    this.s3.putObject(pos.build());
    //this.s3.putObject(aBucket, aObjectName, aStream, aStream.available(), af.toJavaMap(aMetaMap), null, aContentType);
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

    var dob = Packages.io.minio.GetObjectArgs.builder().bucket(aBucket).object(aObjectName);
    if (isDef(offset) && isNumber(offset)) {
        if (isDef(len) && isNumber(len)) {
            dob = dob.length(len);
        }
        dob = dob.offset(offset);
    }

    return this.s3.getObject(dob.build());
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

    aRemotePath = aRemotePath.replace(/\\+/g, "/")
    var dir = aRemotePath.substr(0, aRemotePath.lastIndexOf("/"))
    if (dir.length > 0 && !io.fileExists(dir)) {
        io.mkdir(dir)
    }

    if (aRemotePath.lastIndexOf("/") != aRemotePath.length - 1)
        this.s3.downloadObject(Packages.io.minio.DownloadObjectArgs.builder().bucket(aBucket).object(aObjectName).overwrite(true).filename(aRemotePath).build());
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
 * <key>S3.removeObjectsByPrefix(aBucket, aPrefix, aLimitPerCall) : Array</key>
 * Tries to remove all objects recursively on aBucket with the provided aPrefix. Optionally aLimitPerCall (e.g. AWS S3 is limited to 1000)
 * can be provided (-1 for no limit). Returns an array of errors.
 * </odoc>
 */
S3.prototype.removeObjectsByPrefix = function(aBucket, aPrefix, aLimitPerCall) {
    _$(aBucket).isString().$_("Please provide a bucket name.");
    _$(aPrefix).isString().$_("Please provide a prefix.");

    var lst = this.listObjects(aBucket, aPrefix, false, true);
    return this.removeObjects(aBucket, lst.map(r => r.canonicalPath), aLimitPerCall);
};

/**
 * <odoc>
 * <key>S3.removeObjects(aBucket, aListObjectNames, aLimitPerCall) : Array</key>
 * Tries to remove aListObjectNames (an array of strings or an array of maps with a "name" and a "version") on aBucket 
 * Optionally aLimitPerCall (e.g. AWS S3 is limited to 1000) can be provided (-1 for no limit). Returns an array of errors.
 * </odoc>
 */
S3.prototype.removeObjects = function(aBucket, aListObjectNames, aLimitPerCall) {
    _$(aBucket, "aBucket").isString().$_("Please provide a bucket name.");
    _$(aListObjectNames, "aListObjectNames").isArray().$_("Please provide an array of object names");
    aLimitPerCall = _$(aLimitPerCall, "aLimitePerCall").isNumber().default(-1);

    if (aLimitPerCall > 0) {
        var res = [];
        splitArray(aListObjectNames, aListObjectNames.length / aLimitPerCall).forEach(subArr => {
            res = res.concat(this.removeObjects(aBucket, subArr, -1));
        });
        return res;
    }

    var ll = new java.util.LinkedList();
    aListObjectNames.forEach(obj => {
        if (isString(obj)) {
            ll.add(new Packages.io.minio.messages.DeleteObject(obj));
        }
        if (isMap(obj)) {
            ll.add(new Packages.io.minio.messages.DeleteObject(obj.name, obj.version));
        }
    });

    var res = this.s3.removeObjects(Packages.io.minio.RemoveObjectsArgs.builder().bucket(aBucket).objects(ll).build());

    var errors = [];
    var ii = res.iterator();

    while(ii.hasNext()) {
        errors.push(ii.next());
    }

    return errors;
}

/**
 * <odoc>
 * <key>S3.removeObject(aBucket, aObjectName)</key>
 * Removes aObjectName from aBucket.
 * </odoc>
 */
S3.prototype.removeObject = function(aBucket, aObjectName) {
    _$(aBucket).isString().$_("Please provide a bucket name.");
    _$(aObjectName).isString().$_("Please provide an object name.");

    this.s3.removeObject(Packages.io.minio.RemoveObjectArgs.builder().bucket(aBucket).object(aObjectName).build());
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

    //var co = new Packages.io.minio.CopyConditions();

    var coa = Packages.io.minio.CopyObjectArgs.builder()
              .bucket(aTargetBucket)
              .object(aDestObjectName)
              .source(Packages.io.minio.CopySource.builder().bucket(aSourceBucket).object(aObjectName).build());
    if (isDef(aMetaMap) && isMap(aMetaMap)) {
        co.setReplaceMetadataDirective();
        var hmm = Packages.com.google.common.collect.HashMultimap.create();
        Object.keys(aMetaMap).forEach(k => {
            hmm.put(k, aMetaMap[k]);
        });
        coa = coa.userMetadata(hmm);
        //this.s3.copyObject(aSourceBucket, aObjectName, aTargetBucket, aDestObjectName, co, af.toJavaMap(aMetaMap));
    } // else {
    if (isDef(aCopyOptions) && isMap(aCopyOptions)) {
        if (isDef(aCopyOptions.matchETag) && isString(aCopyOptions.matchETag)) { coa = coa.matchETag(aCopyOptions.matchETag); }
        if (isDef(aCopyOptions.matchETagNone) && isString(aCopyOptions.matchETagNone)) { coa = coa.notMatchEtag(aCopyOptions.matchETagNone); }
        if (isDef(aCopyOptions.modified) && isDate(aCopyOptions.modified)) { coa = coa.modifiedSince(aCopyOptions.modified); }
        if (isDef(aCopyOptions.unmodified) && isDate(aCopyOptions.unmodified)) { coa = coa.unmodifiedSice(aCopyOptions.unmodified); }
    }
    //this.s3.copyObject(aSourceBucket, aObjectName, aTargetBucket, aDestObjectName, co);
    this.s3.copyObject(coa.build());
    //}
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

    var rlst = ow.obj.fromArray2Obj(this.listObjects(aBucket, aPrefix, __, true), "filename");
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
 * <key>S3.deleteFolderActions(aBucket, aPrefix, beRecursive) : Array</key>
 * Given aBucket and a "folder" aPrefix returns an array of actions to remove all objects under that "folder". Use S3.execActions
 * to execute the returned actions.
 * </odoc>
 */
S3.prototype.deleteFolderActions = function(aBucket, aPrefix) {
    _$(aBucket).isString().$_("Please provide a bucket name.");
    _$(aPrefix).isString().$_("Please provide a prefix.");

    if (!(aPrefix.endsWith("/")) && aPrefix.length > 0) aPrefix += "/";

    var actions = [];
    var lst = this.listObjects(aBucket, aPrefix, __, beRecursive);
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
    var lst = this.listObjects(aBucket, aPrefix, __, true);
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
 * <key>S3.execActions(anArrayOfActions, aLogFunction, aLogErrorFunction, numThreads, ignoreActions)</key>
 * Given anArrayOfActions produce by other S3.*Actions functions will execute them in parallel recording changes with,
 * optionally, the provided aLogFunction and aLogErrorFunction (that receive a text message). To execute actions with a 
 * given order (for example: first copy then delete) each element of anArrayOfActions should be an array of actions (e.g.
 * an array of copy actions on the first element and an array of delete actions on the second element). Optionally you 
 * can provide the number of threads.
 * </odoc>
 */
S3.prototype.execActions = function(anArrayOfActions, aLogFunction, aLogErrorFunction, numThreads, ignoreActions) {
    var parent = this;

    ignoreActions = _$(ignoreActions, "ignoreActions").isArray().default([])
    anArrayOfActions = _$(anArrayOfActions).isArray().default([]);
    aLogFunction = _$(aLogFunction).isFunction().default(log);
    aLogErrorFunction = _$(aLogErrorFunction).isFunction().default(logErr);

    if (isArray(anArrayOfActions[0])) {
        for(var ii in anArrayOfActions) {
            this.execActions(anArrayOfActions[ii], aLogFunction, aLogErrorFunction, numThreads, ignoreActions)
        }
        return
    }

    parallel4Array(anArrayOfActions, function(action) {
        try {
            if (ignoreActions.indexOf(action.cmd) >= 0) {
                aLogFunction("Ignoring action: " + af.toSLON(action))
                return true
            }

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

ow.loadCh()
/**
  * <odoc>
  * <key>ow.ch.types.s3</key>
  * The s3 channel OpenAF implementation is similar to type "file" where instead of keeping a JSON or YAML file
  * in the local filesystem it's kept on a S3 bucket. The creation options are:\
  * \
  *    - s3url       (String)  The S3 URL to use\
  *    - s3bucket    (String)  The S3 bucket name\
  *    - s3accessKey (String)  The S3 access key\
  *    - s3secretKey (String)  The S3 secret key\
  *    - s3object    (String)  The s3 complete path to a JSON or YAML object to use (if multifile is false)\
  *    - s3prefix    (String)  The s3 prefix to use to store JSON or YAML objects to use (if multifile is true)\
  *    - yaml        (Boolean) Use YAML instead of JSON (defaults to false)\
  *    - compact     (Boolean) If JSON and compact = true the JSON format will be compacted (defaults to false or shouldCompress option)\
  *    - multifile   (Boolean) If true instead of keeping values in one file it will be kept in multiple files (*)\
  *    - multipart   (Boolean) If YAML and multipart = true the YAML file will be multipart\
  *    - key         (String)  If a key contains "key" it will be replaced by the "key" value\
  *    - multipath   (Boolean) Supports string keys with paths (e.g. ow.obj.setPath) (defaults to false)\
  *    - lock        (String)  If defined the filepath to a dummy file for a local filesystem lock while accessing the file\
  *    - gzip        (Boolean) If true the output file will be gzip (defaults to false)\
  * \
  * (*) - Be aware that althought there is a very small probability of collision between the unique id (sha-512) for filenames it still exists\
  * \
  * </odoc>
  */
ow.ch.__types.s3 = {
    __channels: {},
    __l: (m) => (isString(m.lock) ? $flock(m.lock).lock() : __),
    __ul: (m) => (isString(m.lock) ? $flock(m.lock).unlock() : __),
    __r: (m) => {
        var r = {}
        if (!io.fileExists(m._tmp)) {
            m._tmp = io.createTempFile("tmp-", ".s3")
        }

        try {
            m._s3.getObject(m.s3bucket, (m.multifile ? m.s3prefix + "/index" + (m.yaml ? ".yaml" : ".json") + (m.gzip ? ".gz" : "") : m.s3object), m._tmp)
        } catch(e) {
            if (String(e).indexOf("Object does not exist" >= 0)) {
                try {
                    m._s3.putObject(m.s3bucket, (m.multifile ? m.s3prefix + "/index" + (m.yaml ? ".yaml" : ".json") + (m.gzip ? ".gz" : ""): m.s3object), m._tmp)
                } catch(e2) {
                    logErr("Error creating object: " + e)
                    throw e
                }
            } else {
                logErr("Error getting object: " + e)
                throw e
            }
        }
        if (m.yaml) {
            if (m.gzip) {
                try {
                    var is = io.readFileGzipStream(m._tmp)
                    r = af.fromYAML(af.fromInputStream2String(is))
                    if (m.multipart && isDef(m.key)) r = $a4m(r, m.key)
                    is.close()
                } catch(e) {
                    if (String(e).indexOf("java.io.EOFException") < 0) throw e	
                }
            } else {
                r = io.readFileYAML(m._tmp)
            }
        } else {
            if (m.gzip) {
                try {
                    var is = io.readFileGzipStream(m._tmp)
                    r = jsonParse(af.fromInputStream2String(is), true)
                    is.close()
                } catch(e) {
                    if (String(e).indexOf("java.io.EOFException") < 0) throw e	
                }
            } else {
                r = io.readFileJSON(m._tmp)
            }
        }

        if (!isMap(r)) r = {};
        return r;
    },
    __rf: (m, k) => {
        var r = {}
        var _tmpf = io.createTempFile("tmp-", ".s3")
        var _id = sha512(stringify(sortMapKeys(k, true)))
        try {
            m._s3.getObject(m.s3bucket, m.s3prefix + "/" + _id + (m.yaml ? ".yaml" : ".json") + (m.gzip ? ".gz" : ""), _tmpf)
        } catch(e) {
            if (String(e).indexOf("Object does not exist" >= 0)) {
                return __
            } else {
                logErr("Error getting object: " + e)
                throw e
            }
        }
        if (m.yaml) {
            if (m.gzip) {
                try {
                    var is = io.readFileGzipStream(_tmpf)
                    r = af.fromYAML(af.fromInputStream2String(is))
                    //if (m.multipart && isDef(m.key)) r = $a4m(r, m.key)
                    is.close()
                } catch(e) {
                    if (String(e).indexOf("java.io.EOFException") < 0) throw e	
                }
            } else {
                r = io.readFileYAML(_tmpf)
            }
        } else {
            if (m.gzip) {
                try {
                    var is = io.readFileGzipStream(_tmpf)
                    r = jsonParse(af.fromInputStream2String(is), true)
                    is.close()
                } catch(e) {
                    if (String(e).indexOf("java.io.EOFException") < 0) throw e	
                }
            } else {
                r = io.readFileJSON(_tmpf)
            }
        }

        io.rm(_tmpf)
        if (!isMap(r)) r = {};
        return r;
    },
    __w: (m, o) => {
        if (!io.fileExists(m._tmp)) {
            m._tmp = io.createTempFile("tmp-", ".s3")
        }
        if (m.yaml) {
            if (m.gzip) {
                var os = io.writeFileGzipStream(m._tmp)
                ioStreamWrite(os, af.toYAML((m.multipart && isDef(m.key) ? $m4a(o, m.key) : o), m.multipart))
                os.close()
            } else {
                io.writeFileYAML(m._tmp, (m.multipart && isDef(m.key) ? $m4a(o, m.key) : o), m.multipart)
            }
        } else {
            if (m.gzip) {
                var os = io.writeFileGzipStream(m._tmp)
                ioStreamWrite(os, stringify(o, __, m.compact ? "" : __))
                os.close()
            } else {
                io.writeFileJSON(m._tmp, o, m.compact ? "" : __)
            }
        }
        try {
            m._s3.putObject(m.s3bucket, (m.multifile ? m.s3prefix + "/index" + (m.yaml ? ".yaml" : ".json") + (m.gzip ? ".gz" : "") : m.s3object), m._tmp)
        } catch(e) {
            logErr("Error putting object: " + e)
            throw e
        }
    },
    __wf: (m, k, v) => {
        var _tmpf = io.createTempFile("tmp-", ".s3")
        var _id = sha512(stringify(sortMapKeys(k, true)))
        if (m.yaml) {
            if (m.gzip) {
                var os = io.writeFileGzipStream(_tmpf)
                ioStreamWrite(os, af.toYAML(v))
                os.close()
            } else {
                io.writeFileYAML(_tmpf, v)
            }
        } else {
            if (m.gzip) {
                var os = io.writeFileGzipStream(_tmpf)
                ioStreamWrite(os, stringify(v, __, m.compact ? "" : __))
                os.close()
            } else {
                io.writeFileJSON(_tmpf, v, m.compact ? "" : __)
            }
        }
        try {
            m._s3.putObject(m.s3bucket, m.s3prefix + "/" + _id + (m.yaml ? ".yaml" : ".json") + (m.gzip ? ".gz" : ""), _tmpf)
        } catch(e) {
            logErr("Error putting object: " + e)
            throw e
        } finally {
            io.rm(_tmpf)
        }

        return _id
    },
    __df: (m, k) => {
        var _id = sha512(stringify(sortMapKeys(k, true)))
        try {
            m._s3.removeObject(m.s3bucket, m.s3prefix + "/" + _id + (m.yaml ? ".yaml" : ".json") + (m.gzip ? ".gz" : ""))
        } catch(e) {
            logErr("Error removing object: " + e)
            throw e
        }
    },
    create       : function(aName, shouldCompress, options) {
        ow.loadObj();
        options = _$(options).isMap().default({});
        this.__channels[aName] = {};
        this.__channels[aName].compact   = _$(options.compact, "options.compact").isBoolean().default(shouldCompress);
        this.__channels[aName].s3object    = _$(options.s3object, "options.s3object").isString().default(__)
        this.__channels[aName].s3prefix    = _$(options.s3prefix, "options.s3prefix").isString().default(__)
        this.__channels[aName].s3url     = _$(options.s3url, "options.s3url").isString().default(__)
        this.__channels[aName].s3bucket  = _$(options.s3bucket, "options.s3bucket").isString().$_()
        this.__channels[aName].s3accessKey = _$(options.s3accessKey, "options.s3accessKey").isString().default(__)
        this.__channels[aName].s3secretKey = _$(options.s3secretKey, "options.s3secretKey").isString().default(__)
        this.__channels[aName].s3region    = _$(options.s3region, "options.s3region").isString().default(__)
        this.__channels[aName].s3ignoreCert = _$(options.s3ignoreCert, "options.s3ignoreCert").isBoolean().default(false)
        this.__channels[aName].yaml      = _$(options.yaml, "options.yaml").isBoolean().default(false);
        this.__channels[aName].multifile = _$(options.multifile, "options.multifile").isBoolean().default(false)
        this.__channels[aName].multipart = _$(options.multipart, "options.multipart").isBoolean().default(false);
        this.__channels[aName].multipath = _$(options.multipath, "options.multipath").isBoolean().default(false);
        this.__channels[aName].key       = _$(options.key, "options.key").isString().default(__);
        this.__channels[aName].lock      = _$(options.lock, "options.lock").isString().default(__);
        this.__channels[aName].gzip      = _$(options.gzip, "options.gzip").isBoolean().default(false)

        if (this.__channels[aName].multifile) {
            if (isUnDef(this.__channels[aName].s3prefix)) throw "options.s3prefix is required"
        } else {
            if (isUnDef(this.__channels[aName].s3object)) throw "options.s3object is required"
        }

        this.__channels[aName]._s3 = new S3(this.__channels[aName].s3url, this.__channels[aName].s3accessKey, this.__channels[aName].s3secretKey, this.__channels[aName].s3region, __, this.__channels[aName].s3ignoreCert)
        this.__channels[aName]._tmp = io.createTempFile("tmp-", ".s3")
    },
    destroy      : function(aName) {
        if (isDef(this.__channels[aName]._tmp)) io.rm(this.__channels[aName]._tmp)
        this.__channels[aName]._s3.close()
        delete this.__channels[aName]
    },
    size         : function(aName) {
        var s;
        this.__l(this.__channels[aName]);
        try {
            s = Object.keys(this.__r(this.__channels[aName])).length;
        } finally {
            this.__ul(this.__channels[aName]);
        }
        
        return s;
    },
    forEach      : function(aName, aFunction) {
        var m;
        this.__l(this.__channels[aName]);
        try {
            m = this.__r(this.__channels[aName]);
        } finally {
            this.__ul(this.__channels[aName]);
        }
        Object.keys(m).forEach(k => {
	    var _k = jsonParse(k)
            if (this.__channels[aName].multifile) {
                try { aFunction(_k, this.__rf(this.__channels[aName], _k)) } catch(e) {}
            } else {
                try { aFunction(_k, m[_k]) } catch(e) {}
            }
        });
    },
    getAll      : function(aName, full) {
        var m, mv
        this.__l(this.__channels[aName]);
        try {
            m  = this.__r(this.__channels[aName])
            if (this.__channels[aName].multifile) {
                mv = Object.keys(m).map(k => this.__rf(this.__channels[aName], jsonParse(k)))
            } 
        } finally {
            this.__ul(this.__channels[aName]);
        }
        return this.__channels[aName].multifile ? mv : Object.values(m)
    },
    getKeys      : function(aName, full) {
        var m;
        this.__l(this.__channels[aName]);
        try {
            m = this.__r(this.__channels[aName]);
        } finally {
            this.__ul(this.__channels[aName]);
        }
        return Object.keys(m).map(k => jsonParse(k));
    },
    getSortedKeys: function(aName, full) {
        var m;
        this.__l(this.__channels[aName]);
        try {
            m = this.__r(this.__channels[aName]);
        } finally {
            this.__ul(this.__channels[aName]);
        }
        var res = Object.keys(m).map(k => jsonParse(k)); 
        return res;	
    },
    getSet       : function getSet(aName, aMatch, aK, aV, aTimestamp)  {
        var res;
        res = this.get(aName, aK);
        if ($stream([res]).anyMatch(aMatch)) {
            return this.set(aName, aK, aV, aTimestamp);
        }
        return __;
    },
    set          : function(aName, aK, aV, aTimestamp) {
        var m;
        this.__l(this.__channels[aName]);
        try {
            m = this.__r(this.__channels[aName]);
            if (isMap(aK) && isDef(aK[this.__channels[aName].key])) aK = { key: aK[this.__channels[aName].key] };
            var id = isDef(aK.key)   ? aK.key   : stringify(sortMapKeys(aK), __, "");

            if (this.__channels[aName].multifile) {
                var _id = this.__wf(this.__channels[aName], aK, aV)
                if (isString(id) && id.indexOf(".") > 0 && this.__channels[aName].multipath) {
                    ow.obj.setPath(m, id, _id)
                } else {
                    m[id] = _id
                }  
            } else {
                if (isString(id) && id.indexOf(".") > 0 && this.__channels[aName].multipath) {
                    ow.obj.setPath(m, id, isDef(aV.value) ? aV.value : aV);
                } else {
                    m[id]  = isDef(aV.value) ? aV.value : aV;
                }
            }
            this.__w(this.__channels[aName], m)
        } finally {
            this.__ul(this.__channels[aName]);
        }
        
        return aK;
    },
    setAll       : function(aName, aKs, aVs, aTimestamp) {
        ow.loadObj();

        var m;
        this.__l(this.__channels[aName]);
        try {
            m = this.__r(this.__channels[aName]);
            for(var i in aVs) {
                var aK = ow.obj.filterKeys(aKs, aVs[i]), aV = aVs[i]

                if (isMap(aK) && isDef(aK[this.__channels[aName].key])) aK = { key: aK[this.__channels[aName].key] };
                var id = isDef(aK.key)   ? aK.key   : stringify(sortMapKeys(aK), __, "");

                if (this.__channels[aName].multifile) {
                    var _id = this.__wf(this.__channels[aName], aK, aV)
                    if (isString(id) && id.indexOf(".") > 0 && this.__channels[aName].multipath) {
                        ow.obj.setPath(m, id, _id)
                    } else {
                        m[id] = _id
                    }  
                } else {
                    if (isString(id) && id.indexOf(".") > 0 && this.__channels[aName].multipath) {
                        ow.obj.setPath(m, id, isDef(aV.value) ? aV.value : aV);
                    } else {
                        m[id] = isDef(aV.value) ? aV.value : aV;
                    }
                }
            }
            this.__w(this.__channels[aName], m);
        } finally {
            this.__ul(this.__channels[aName]);
        }
    },
    unsetAll     : function(aName, aKs, aVs, aTimestamp) {
        ow.loadObj();
        var m;
        this.__l(this.__channels[aName]);
        try {
            m = this.__r(this.__channels[aName]);
            for(var i in aVs) {
                var aK = ow.obj.filterKeys(aKs, aVs[i]), aV = aVs[i]
                
                if (isMap(aK) && isDef(aK[this.__channels[aName].key])) aK = { key: aK[this.__channels[aName].key] };
                var id = isDef(aK.key)   ? aK.key   : stringify(sortMapKeys(aK), __, "");
                delete m[id];
                if (isString(id) && id.indexOf(".") > 0 && this.__channels[aName].multipath) {
                    ow.obj.setPath(m, id, __);
                } else {
                    delete m[id];
                }

                if (this.__channels[aName].multifile) {
                    this.__df(this.__channels[aName], aK)
                }
            }
            this.__w(this.__channels[aName], m);
        } finally {
            this.__ul(this.__channels[aName]);
        }
    },		
    get          : function(aName, aK) {
        if (this.__channels[aName].multifile) {
            return this.__rf(this.__channels[aName], aK)
        } else {
            var m;
            this.__l(this.__channels[aName]);
            try {
                m = this.__r(this.__channels[aName]);
            } finally {
                this.__ul(this.__channels[aName]);
            }
            if (isMap(aK) && isDef(aK[this.__channels[aName].key])) aK = { key: aK[this.__channels[aName].key] };
            var id = isDef(aK.key)   ? aK.key   : stringify(sortMapKeys(aK), __, "");
            if (isString(id) && id.indexOf(".") > 0 && this.__channels[aName].multipath) {
                return ow.obj.getPath(m, id);
            } else {
                return m[id];
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
        var m;
        this.__l(this.__channels[aName]);
        try {
            m = this.__r(this.__channels[aName]);
            if (isMap(aK) && isDef(aK[this.__channels[aName].key])) aK = { key: aK[this.__channels[aName].key] };
            var id = isDef(aK.key)   ? aK.key   : stringify(sortMapKeys(aK), __, "");
            delete m[id];
            if (isString(id) && id.indexOf(".") > 0 && this.__channels[aName].multipath) {
                ow.obj.setPath(m, id, __);
            } else {
                delete m[id];
            }
            this.__w(this.__channels[aName], m)
            if (this.__channels[aName].multifile) this.__df(this.__channels[aName], aK)
        } finally {
            this.__ul(this.__channels[aName]);
        }
    }
}

