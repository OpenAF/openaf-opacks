loadExternalJars(getOPackPath("GCS") || ".")

var GCS = function(aInput) {
    var jsonStream
    if (isString(aInput) && aInput.endsWith(".json")) aInput = io.readFileJSON(aInput)
    if (isString(aInput) && aInput.endsWith(".yaml")) aInput = io.readFileYAML(aInput)
    if (isMap(aInput)) jsonStream = af.fromString2InputStream(stringify(aInput))

    this._srvCreds = com.google.auth.oauth2.ServiceAccountCredentials.fromStream(jsonStream)
    this._storage = com.google.cloud.storage.StorageOptions.newBuilder().setCredentials(this._srvCreds).build().getService()
}

/**
 * <odoc>
 * <key>GCS.bucketExists(aBucket) : boolean</key>
 * Determines if aBucket exists.
 * </odoc>
 */
GCS.prototype.bucketExists = function(aBucket) {
  // TODO
  throw "Not implemented yet"
}

/**
 * <odoc>
 * <key>GCS.makeBucket(aBucket, aRegion)</key>
 * Creates aBucket with an optional aRegion.
 * </odoc>
 */
GCS.prototype.makeBucket = function(aBucket, aRegion) {
  // TODO
  throw "Not implemented yet"
}

/**
 * <odoc>
 * <key>GCS.removeBucket(aBucket)</key>
 * Removes aBucket.
 * </odoc>
 */
GCS.prototype.removeBucket = function(aBucket) {
  // TODO
  throw "Not implemented yet"
}

/**
 * <odoc>
 * <key>GCS.listBuckets() : Array</key>
 * Returns an array with all the existing buckets.
 * </odoc>
 */
GCS.prototype.listBuckets = function() {
  // TODO
  throw "Not implemented yet"
}

/**
 * <odoc>
 * <key>GCS.listObjects(aBucket, aPrefix, needFull, needRecursive) : Array</key>
 * Returns a list of objects (equivalent to io.listFiles) in aBucket. Optionally you can 
 * provide aPrefix (e.g "myDir/") to simulate listing a folder. needFull is ignored and included only for compatibility. 
 * If needRecursive = true all "object paths" will be traversed.
 * </odoc>
 */
GCS.prototype.listObjects = function(aBucket, aPrefix, needFull, needRecursive) {
    _$(aBucket, "aBucket").isString().$_("Please provide a bucket name.")
    aPrefix       = _$(aPrefix, "aPrefix").isString().default("")
    needFull      = _$(needFull, "needFull").isBoolean().default(false)
    needRecursive = _$(needRecursive, "needRecursive").isBoolean().default(false)
 
    var _o = [ com.google.cloud.storage.Storage.BlobListOption.prefix(aPrefix) ]
    if (!needRecursive) _o.push(com.google.cloud.storage.Storage.BlobListOption.currentDirectory())
    var p  = this._storage['list(java.lang.String,com.google.cloud.storage.Storage$BlobListOption[])'](aBucket, _o)

    var data = []
    p.getValues().forEach(file => {
      if (file.isDirectory() && String(file.getName()) == "/") return 

      data.push({
        isDirectory: file.isDirectory(),
        isFile: !file.isDirectory(),
        isLatest: __,
        filename: String(file.getName()), 
        filepath: String(file.getName()),
        canonicalPath: String(file.getName()),
        lastModified: Number(file.getUpdateTime()),
        size: Number(file.getSize()),
        storageClass: String(file.getStorageClass()),
        etag: String(file.getEtag()),
        owner: String(file.getOwner()),
        version: __,
        metadata: af.fromJavaMap(file.getMetadata()),
        contentType: String(file.getContentType())
      })
    })

    return data
}

/**
 * <odoc>
 * <key>GCS.statObject(aBucket, aObjectName) : Map</key>
 * Retrieves the available metadata for aObjectName in aBucket.
 * </odoc>
 */
GCS.prototype.statObject = function(aBucket, aObjectName) {
  // TODO
  throw "Not implemented yet"
}

/**
 * <odoc>
 * <key>GCS.objectExists(aBucket, aObjectName) : boolean</key>
 * Tries to determine is aObjectName in aBucket currenlty exists.
 * </odoc>
 */
GCS.prototype.objectExists = function(aBucket, aObjectName) {
  // TODO
  var l = this.listObjects(aBucket, aObjectName)
  if (isArray(l) && l.length == 1) return true; else return false
}

/**
 * <odoc>
 * <key>GCS.getPresignedGetObject(aBucket, aObjectName, expireInSecs) : String</key>
 * Returns an URL to be used to retrieve aObjectName from aBucket with the necessary temporary credentials. If expireInSecs is
 * not provided it will default to 7 days.
 * </odoc>
 */
GCS.prototype.getPresignedGetObject = function(aBucket, aObjectName, expireInSecs) {
  // TODO
  throw "Not implemented yet"
}

/**
 * <odoc>
 * <key>GCS.getPresignedPutObject(aBucket, aObjectName, expireInSecs) : String</key>
 * Returns an URL to be used to send aObjectName to aBucket with the necessary temporary credentials. If expireInSecs is
 * not provided it will default to 7 days.
 * </odoc>
 */
GCS.prototype.getPresignedPutObject = function(aBucket, aObjectName, expireInSecs) {
  // TODO
  throw "Not implemented yet"
}

/**
 * <odoc>
 * <key>GCS.putObject(aBucket, aObjectName, aLocalPath)</key>
 * Puts the file on aLocalPath into aBucket with the name aObjectName.  Optionally you can provide a meta map.
 * Note: use "/" on the name to simulate folders.
 * </odoc>
 */
GCS.prototype.putObject = function(aBucket, aObjectName, aLocalPath, aMetaMap) {
  // TODO aMetaMap
  _$(aBucket, "aBucket").isString().$_()
  _$(aObjectName, "aObjectName").isString().$_()

  var is = io.readFileStream(aLocalPath)
  var blobId = com.google.cloud.storage.BlobId.of(aBucket, aObjectName)
  //  com.google.cloud.storage.Storage.BlobWriteOption
  var w = this._storage.writer(com.google.cloud.storage.BlobInfo.newBuilder(blobId).build(), [])
  ioStreamReadBytes(is, b => w.write(java.nio.ByteBuffer.wrap(b)))
  is.close()
  w.close()
}

/**
 * <odoc>
 * <key>GCS.putObjectByURL(aURL, aLocalPath)</key>
 * Puts the file on aLocalPath into aURL.  Optionally you can provide a meta map.
 * Note: use "/" on the name to simulate folders.
 * </odoc>
 */
GCS.prototype.putObjectByURL = function(aURL, aLocalPath, aMetaMap) {
  // TODO
  throw "Not implemented yet"
}

/**
 * <odoc>
 * <key>GCS.putObjectStream(aBucket, aObjectName, aStream, aMetaMap, aContentType)</key>
 * Puts the aStream into aBucket with the name aObjectName. Optionally you can provide a meta map.
 * Note: use "/" on the name to simulate folders.
 * </odoc>
 */
GCS.prototype.putObjectStream = function(aBucket, aObjectName, aStream, aMetaMap, aContentType) {
  // TODO aMetaMap
  _$(aBucket, "aBucket").isString().$_()
  _$(aObjectName, "aObjectName").isString().$_()

  var blobId = com.google.cloud.storage.BlobId.of(aBucket, aObjectName)
  var binfo = com.google.cloud.storage.BlobInfo.newBuilder(blobId)
  if (isString(aContentType)) binfo.setContentType(aContentType)
  var w = this._storage.writer(binfo.build())
  ioStreamReadBytes(aStream, b => w.write(java.nio.ByteBuffer.wrap(b)))
  aStream.close()
  w.close()
}

/**
 * <odoc>
 * <key>GCS.putObjectStreamByURL(aURL, aStream, aMetaMap)</key>
 * Puts the aStream into aURL. Optionally you can provide a meta map.
 * Note: use "/" on the name to simulate folders.
 * </odoc>
 */
GCS.prototype.putObjectStreamByURL = function(aURL, aStream, aMetaMap, aContentType) {
  // TODO
  throw "Not implemented yet"
}

/**
 * <odoc>
 * <key>GCS.getObjectStream(aBucket, aObjectName, offset, len) : JavaStream</key>
 * Returns a JavaStream to get aObjectName from aBucket. Optionally you can provide an offset and a length.
 * </odoc>
 */
GCS.prototype.getObjectStream = function(aBucket, aObjectName, offset, len) {
  _$(aBucket, "aBucket").isString().$_("Please provide a bucket name.")
  _$(aObjectName, "aObjectName").isString().$_("Please provide the object to get.")

  if (isDef(offset) || isDef(len)) throw "offset or len not supported in this GCS wrapper"

  var cr = this._storage.reader(aBucket, aObjectName)
  return java.nio.channels.Channels.newInputStream(cr)
}

/**
 * <odoc>
 * <key>GCS.getObjectStreamByURL(aURL, offset, len) : JavaStream</key>
 * Returns a JavaStream to get an object from aURL. Optionally you can provide an offset and a length.
 * </odoc>
 */
GCS.prototype.getObjectStreamByURL = function(aURL, offset, len) {
  // TODO
  throw "Not implemented yet"
}

/**
 * <odoc>
 * <key>GCS.getObject(aBucket, aObjectName, aRemotePath)</key>
 * Gets aObjectName from aBucket storing the file locally in aRemotePath.
 * </odoc>
 */
GCS.prototype.getObject = function(aBucket, aObjectName, aRemotePath) {
  // TODO
  var is = this.getObjectStream(aBucket, aObjectName)
  var os = io.writeFileStream(aRemotePath)
  ioStreamCopy(os, is)
}

/**
 * <odoc>
 * <key>GCS.decomposeURL(aURL) : Map</key>
 * Given a GCS compatible aURL returns a map with the identified bucket and objectName.
 * </odoc>
 */
GCS.prototype.decomposeURL = function(aURL) {
  var url = new java.net.URL(aURL)
  return {
      bucket: String(url.getHost()).replace(/([^\.]+)\..+/, "$1"),
      objectName: String(url.getPath()).replace(/^\/+/, "")
  }
}

/**
 * <odoc>
 * <key>GCS.getObjectByURL(aURL, aRemotePath)</key>
 * Gets an object from an aURL storing the file locally in aRemotePath.
 * </odoc>
 */
GCS.prototype.getObjectByURL = function(aURL, aRemotePath) {
  var o = this.decomposeURL(aURL)
  return this.getObject(o.bucket, o.objectName, aRemotePath)
}

/**
 * <odoc>
 * <key>GCS.getObjectURL(aBucket, aObjectName) : String</key>
 * Returns the URL to access aObjectName in aBucket.
 * </odoc>
 */
GCS.prototype.getObjectURL = function(aBucket, aObjectName) {
  _$(aBucket).isString().$_("Please provide a bucket name.")
  _$(aObjectName).isString().$_("Please provide an object name.")

  // TODO
  throw "Not implemented yet"
}

/**
 * <odoc>
 * <key>GCS.removeObjectsByPrefix(aBucket, aPrefix, aLimitPerCall) : Array</key>
 * Tries to remove all objects recursively on aBucket with the provided aPrefix. Optionally aLimitPerCall (e.g. GCS is limited to 1000)
 * can be provided (-1 for no limit). Returns an array of errors.
 * </odoc>
 */
GCS.prototype.removeObjectsByPrefix = function(aBucket, aPrefix, aLimitPerCall) {
  _$(aBucket).isString().$_("Please provide a bucket name.")
  _$(aPrefix).isString().$_("Please provide a prefix.")

  var lst = this.listObjects(aBucket, aPrefix, false, true)
  return this.removeObjects(aBucket, lst.map(r => r.canonicalPath), aLimitPerCall)
}

/**
 * <odoc>
 * <key>GCS.removeObjects(aBucket, aListObjectNames, aLimitPerCall) : Array</key>
 * Tries to remove aListObjectNames (an array of strings or an array of maps with a "name" and a "version") on aBucket 
 * aLimitPerCall is not used, included only for compatibility. Returns an array of errors.
 * </odoc>
 */
GCS.prototype.removeObjects = function(aBucket, aListObjectNames, aLimitPerCall) {
  // TODO
  _$(aBucket, "aBucket").isString().$_()
  aListObjectNames = _$(aListObjectNames, "aListObjectNames").isArray().default([])

  var errors = []
  aListObjectNames.forEach(obj => {
    try {
      this.removeObject(aBucket, obj)
    } catch(e) {
      errors.push(e)
    }
  })

  return errors
}

/**
 * <odoc>
 * <key>GCS.removeObject(aBucket, aObjectName)</key>
 * Removes aObjectName from aBucket.
 * </odoc>
 */
GCS.prototype.removeObject = function(aBucket, aObjectName) {
  _$(aBucket, "aBucket").isString().$_()
  _$(aObjectName, "aObjectName").isString().$_()

  this._storage['delete(java.lang.String,java.lang.String,com.google.cloud.storage.Storage$BlobSourceOption[])'](aBucket, aObjectName, [])
}

/**
 * <odoc>
 * <key>GCS.copyObject(aSourceBucket, aObjectName, aTargetBucket, aDestObjectName, aMetaMap, aCopyOptions)</key>
 * Copies the aObjectName in aSourceBucket to aDestObjectName in aTargetBucket. You can optionally define a new aMetaMap and/or
 * aCopyOptions. aCopyOptions is a map with the following properties: matchETag (string), matchETagNone (string), modified, unmodified
 * </odoc>
 */
GCS.prototype.copyObject = function(aSourceBucket, aObjectName, aTargetBucket, aDestObjectName, aMetaMap, aCopyOptions) {
  // TODO aMetaMap, aCopyOptions
  _$(aSourceBucket, "aSourceBucket").isString().$_()
  _$(aObjectName, "aObjectName").isString().$_()
  _$(aTargetBucket, "aTargetBucket").isString().$_()
  _$(aDestObjectName, "aDestObjectName").isString().$_()

  var cr = com.google.cloud.storage.Storage.CopyRequest.newBuilder()
  cr = cr.setSource(aSourceBucket, aObjectName)
  cr = cr.setTarget(com.google.cloud.storage.BlobId.of(aTargetBucket, aDestObjectName))
  this._storage.copy(cr.build())
}

/**
 * <odoc>
 * <key>GCS.compare(aBucket, aPrefix, aLocalPath) : Array</key>
 * Given aBucket and "folder" aPrefix compares the corresponding objects with files in the aLocalPath provided returning
 * an array of actions to make both "equal" in terms of object/file size and most recent modification. Should be use mainly for
 * compare proposes. For sync actions please use GCS.squashLocalActions, GCS.squashRemoteActions and GCS.syncActions.
 * </odoc>
 */
GCS.prototype.compare = function(aBucket, aPrefix, aLocalPath) {
  _$(aBucket).isString().$_("Please provide a bucket name.")
  aPrefix = _$(aPrefix).isString().default("")
  _$(aLocalPath).isString().$_("Please provide a local path.")
  
  if (!(aPrefix.endsWith("/")) && aPrefix.length > 0) aPrefix += "/"

  ow.loadObj()
  loadLodash()

  var rlst = ow.obj.fromArray2Obj(this.listObjects(aBucket, aPrefix, __, true), "filename")
  var slst = ow.obj.fromArray2Obj($from(listFilesRecursive(aLocalPath)).equals("isFile", true).select(), "canonicalPath")

  var realLocalPath = String((new java.io.File(aLocalPath)).getCanonicalPath()).replace(/\\/g, "/") + "/"

  // First pass
  var actions = []
  for(var sf in slst) {
      var sfname = aPrefix + sf.substring(realLocalPath.length, sf.length)
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
                      })
                  } else {
                      actions.push({
                          cmd: "get",
                          status: "replace",
                          source: sfname,
                          sourceBucket: aBucket,
                          target: sf
                      })
                  }
              } else {
                  print("Conflict with the same modified dates: " + sfname + " (" + slst[sf].lastModified + ") vs " + sf + " (" + rlsft[sfname].lastModified + ") ")
              }
          }
      } else {
          actions.push({
              cmd: "put",
              status: "new",
              source: sf,
              target: aPrefix + sf.substring(realLocalPath.length, sf.length),
              targetBucket: aBucket
          })
      }
  }

  // Second pass
  for(var rf in rlst) {
      var rsname = realLocalPath + rf.substring(aPrefix.length, rf.length)
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
                      })
                  } else {
                      actions.push({
                          cmd: "get",
                          status: "replace",
                          source: rf,
                          sourceBucket: aBucket,
                          target: rsname
                      })
                  }
              } else {
                  print("Conflict with the same modified dates: " + rsname + " (" + slst[rsname].lastModified + ") vs " + rf + " (" +  rlst[rf].lastModified + ") ")
              }
          }
      } else {
          actions.push({
              cmd: "get",
              status: "new",
              source: rf,
              sourceBucket: aBucket,
              target: realLocalPath + rf.substring(aPrefix.length, rf.length)
          })
      }
  }

  return _.uniqBy(actions, (e) => { return e.cmd + e.sourceBucket + e.source + e.target + e.targetBucket })
}

/**
* <odoc>
* <key>GCS.deleteFolderActions(aBucket, aPrefix, beRecursive) : Array</key>
* Given aBucket and a "folder" aPrefix returns an array of actions to remove all objects under that "folder". Use GCS.execActions
* to execute the returned actions.
* </odoc>
*/
GCS.prototype.deleteFolderActions = function(aBucket, aPrefix) {
  _$(aBucket).isString().$_("Please provide a bucket name.")
  _$(aPrefix).isString().$_("Please provide a prefix.")

  if (!(aPrefix.endsWith("/")) && aPrefix.length > 0) aPrefix += "/"

  var actions = []
  var lst = this.listObjects(aBucket, aPrefix, __, beRecursive)
  for(var vi in lst) {
      var v = lst[vi]
      actions.push({
          cmd: "delRemote",
          source: v.filename,
          sourceBucket: aBucket
      })
  }
  return actions
}

/**
* <odoc>
* <key>GCS.renameFolderActions(aBucket, aPrefix, aTargetBucket, aTargetPrefix) : Array</key>
* Given aBucket and a "folder" aPrefix returns an array of actions to "rename"/"move" all objects to a new aTargetBucket (can
* be the same) and a new "folder" aTargetPrefix.
* </odoc>
*/
GCS.prototype.renameFolderActions = function(aBucket, aPrefix, aTargetBucket, aTargetPrefix) {
  _$(aBucket).isString().$_("Please provide a bucket name.")
  _$(aPrefix).isString().$_("Please provide a prefix.")
  _$(aTargetBucket).isString().$_("Please provide a target bucket name.")
  _$(aTargetPrefix).isString().$_("Please provide a target prefix.")

  if (!(aPrefix.endsWith("/")) && aPrefix.length > 0) aPrefix += "/"
  if (!(aTargetPrefix.endsWith("/")) && aTargetPrefix.length > 0) aTargetPrefix += "/"

  var copyActions = [], delActions = []
  var lst = this.listObjects(aBucket, aPrefix, __, true)
  for(var vi in lst) {
      var v = lst[vi]
      copyActions.push({
          cmd: "copy",
          source: v.filename,
          sourceBucket: aBucket,
          target: v.filename.replace(new RegExp("^" + aPrefix), aTargetPrefix),
          targetBucket: aTargetBucket
      })
      delActions.push({
          cmd: "delRemote",
          source: v.filename,
          sourceBucket: aBucket
      })
  }
  return [copyActions, delActions]
};

/**
* <odoc>
* <key>GCS.squashLocalActions(aBucket, aPrefix, aLocalPath) : Array</key>
* Given aBucket with a "folder" aPrefix will compare it to aLocalPath and return the an array of actions to squash the bucket/remote
* state on aLocalPath (by retrieving object/files from the bucket and deleting local files). The actions can be executed with GCS.execActions.
* </odoc>
*/
GCS.prototype.squashLocalActions = function(aBucket, aPrefix, aLocalPath) {
  var actions = this.compare(aBucket, aPrefix, aLocalPath)
  $from(actions)
  .equals("cmd", "put")
  .equals("status", "new")
  .select((r) => { r.cmd = "delLocal" })

  $from(actions)
  .equals("cmd", "put")
  .equals("status", "replace")
  .select((r) => { r.cmd = "void" })

  var ractions = []
  for(var ii in actions) { 
      if (actions[ii].cmd != "void") {
          ractions.push(actions[ii])
          delete actions[ii]
      } 
  }

  return ractions
}

/**
* <odoc>
* <key>GCS.squashRemoteActions(aBucket, aPrefix, aLocalPath) : Array</key>
* Given aBucket with a "folder" aPrefix will compare it to aLocalPath and return the an array of actions to squash aLocalPath state with
* the bucket/remote (by sending object/files to the bucket and deleting bucket object/files). The actions can be executed with GCS.execActions.
* </odoc>
*/

GCS.prototype.squashRemoteActions = function(aBucket, aPrefix, aLocalPath) {
  var actions = this.compare(aBucket, aPrefix, aLocalPath)
  $from(actions)
  .equals("cmd", "get")
  .equals("status", "new")
  .select((r) => { r.cmd = "delRemote" })

  $from(actions)
  .equals("cmd", "get")
  .equals("status", "replace")
  .select((r) => { r.cmd = "void" })

  var ractions = []
  for(var ii in actions) { 
      if (actions[ii].cmd != "void") {
          ractions.push(actions[ii])
          delete actions[ii]
      } 
  }

  return ractions
}

/**
* <odoc>
* <key>GCS.syncActions(aBucket, aPrefix, aLocalPath) : Array</key>
* Given aBucket and "folder" aPrefix compares the corresponding objects with files in the aLocalPath provided returning
* an array of actions to make both "equal" in terms of object/file size and most recent modification. The result should 
* be used, after review with GCS.execActions. Do note that after updating objects will change their modified date making
* that each call to syncActions will always return actions. Use GCS.squashLocalActions and GCS.squashRemoteActions for 
* "syncing" in one direction only.
* </odoc>
*/
GCS.prototype.syncActions = function(aBucket, aPrefix, aLocalPath) {
  var actions = this.compare(aBucket, aPrefix, aLocalPath)

  return actions
}

/**
* <odoc>
* <key>GCS.execActions(anArrayOfActions, aLogFunction, aLogErrorFunction, numThreads)</key>
* Given anArrayOfActions produce by other GCS.*Actions functions will execute them in parallel recording changes with,
* optionally, the provided aLogFunction and aLogErrorFunction (that receive a text message). To execute actions with a 
* given order (for example: first copy then delete) each element of anArrayOfActions should be an array of actions (e.g.
* an array of copy actions on the first element and an array of delete actions on the second element). Optionally you 
* can provide the number of threads.
* </odoc>
*/
GCS.prototype.execActions = function(anArrayOfActions, aLogFunction, aLogErrorFunction, numThreads) {
  var parent = this

  anArrayOfActions = _$(anArrayOfActions).isArray().default([])
  aLogFunction = _$(aLogFunction).isFunction().default(log)
  aLogErrorFunction = _$(aLogErrorFunction).isFunction().default(logErr)

  if (isArray(anArrayOfActions[0])) {
      for(var ii in anArrayOfActions) {
          this.execActions(anArrayOfActions[ii], aLogFunction, aLogErrorFunction)
      }
      return
  }

  parallel4Array(anArrayOfActions, function(action) {
      try {
          switch(action.cmd) {
          case 'get': 
              aLogFunction("Get '" + action.sourceBucket + ":" + action.source + "' to '" + action.target + "'")
              parent.getObject(action.sourceBucket, action.source, action.target)
              break
          case 'put': 
              aLogFunction("Put '" + action.source + "' in '" + action.targetBucket + ":" + action.target + "'")
              parent.putObject(action.targetBucket, action.target, action.source)
              break
          case 'copy':
              aLogFunction("Copy '" + action.sourceBucket + ":" + action.source + "' to '" + action.targetBucket + ":" + action.target + "'")
              parent.copyObject(action.sourceBucket, action.source, action.targetBucket, action.target)
              break
          case 'delRemote':
              aLogFunction("Delete '" + action.sourceBucket + ":" + action.source + "'")
              parent.removeObject(action.sourceBucket, action.source)
              break
          case 'delLocal':
              aLogFunction("Local delete '" + action.source + "'")
              io.rm(action.source)
              break
          }
          return true
      } catch(e) { aLogErrorFunction(e); return false }
  }, numThreads)
}

/**
* <odoc>
* <key>GCS.getObj() : JavaObject</key>
* Returns the internal java object to access the GCS compatible object storage.
* </odoc>
*/
GCS.prototype.getObj = function() {
  return this._storage
}