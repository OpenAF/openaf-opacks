// Author: Nuno Aguiar
// CHManager - OpenAF Channel Manager core module

var CHManager = function() {
  this._defs    = {}
  this._active  = {}
  this._subs    = {}
  this._exposes = {}
  this._peers   = {}
  var _home = String(java.lang.System.getProperty("user.home"))
  this._storeDir  = _home + "/.openaf-ch-manager"
  this._storeFile = this._storeDir + "/channels.yaml"
}

// ─── Initialization ───────────────────────────────────────────────────────────

CHManager.prototype.init = function(args) {
  args = args || {}
  if (isString(args.libs) && args.libs.trim().length > 0) {
    args.libs.split(",").map(function(s) { return s.trim() }).filter(function(s) { return s.length > 0 }).forEach(function(lib) {
      try {
        if (lib.startsWith("@")) {
          var m = lib.match(/^@([^\/]+)\/(.+)$/)
          if (m) loadLib(getOPackPath(m[1]) + "/" + m[2])
          else logErr("CHManager: bad libs format: " + lib)
        } else {
          loadLib(lib)
        }
      } catch(e) { logErr("CHManager: failed to load lib '" + lib + "': " + e) }
    })
  }
  if (!io.fileExists(this._storeDir)) io.mkdir(this._storeDir)
  this._load()
  var _self = this
  Object.keys(this._defs).forEach(function(name) {
    if (_self._defs[name].autoOpen) {
      try { _self.open(name) } catch(e) { logWarn("CHManager: could not auto-open '" + name + "': " + e) }
    }
  })
}

// ─── Persistence ─────────────────────────────────────────────────────────────

CHManager.prototype._load = function() {
  if (io.fileExists(this._storeFile)) {
    try {
      var data = io.readFileYAML(this._storeFile)
      this._defs = isMap(data) ? data : {}
    } catch(e) {
      logWarn("CHManager: could not load definitions: " + e)
      this._defs = {}
    }
  }
}

CHManager.prototype._save = function() {
  if (!io.fileExists(this._storeDir)) io.mkdir(this._storeDir)
  io.writeFileYAML(this._storeFile, this._defs)
}

// ─── Definition management ────────────────────────────────────────────────────

CHManager.prototype.listDefs = function() {
  var _self = this
  return Object.keys(this._defs).map(function(name) {
    var d = _self._defs[name]
    return {
      name     : name,
      type     : d.type,
      autoOpen : d.autoOpen === true,
      isOpen   : _self._active[name] === true,
      isExposed: isDef(_self._exposes[name]),
      isPeered : isDef(_self._peers[name])
    }
  })
}

CHManager.prototype.addDef = function(name, type, options, autoOpen) {
  if (!isString(name) || name.trim().length === 0) throw "CHManager: name is required"
  if (!isString(type) || type.trim().length === 0) throw "CHManager: type is required"
  this._defs[name] = { type: type, options: isMap(options) ? options : {}, autoOpen: autoOpen === true }
  this._save()
}

CHManager.prototype.editDef = function(name, patch) {
  if (!this._defs[name]) throw "CHManager: definition '" + name + "' not found"
  this._defs[name] = merge(this._defs[name], patch)
  this._save()
}

CHManager.prototype.removeDef = function(name) {
  if (this._active[name]) this.close(name)
  delete this._defs[name]
  this._save()
}

CHManager.prototype.getDef = function(name) {
  return this._defs[name]
}

// ─── Channel lifecycle ────────────────────────────────────────────────────────

CHManager.prototype.open = function(name) {
  var d = this._defs[name]
  if (!d) throw "CHManager: definition '" + name + "' not found"
  if (this._active[name]) return
  ow.loadCh()
  $ch(name).create(d.type, d.options)
  this._active[name] = true
}

CHManager.prototype.close = function(name) {
  if (!this._active[name]) return
  try { $ch(name).destroy() } catch(e) {}
  delete this._active[name]
  delete this._subs[name]
  delete this._exposes[name]
  delete this._peers[name]
}

CHManager.prototype.isOpen = function(name) {
  return this._active[name] === true
}

// ─── Channel operations (pass-through) ───────────────────────────────────────

CHManager.prototype._requireOpen = function(name) {
  if (!this._active[name]) throw "CHManager: channel '" + name + "' is not open"
}

CHManager.prototype.get = function(name, key) {
  this._requireOpen(name)
  return $ch(name).get(isString(key) ? jsonParse(key) : key)
}

CHManager.prototype.set = function(name, key, value) {
  this._requireOpen(name)
  var k = isString(key)   ? jsonParse(key)   : key
  var v = isString(value) ? jsonParse(value) : value
  return $ch(name).set(k, v)
}

CHManager.prototype.unset = function(name, key) {
  this._requireOpen(name)
  return $ch(name).unset(isString(key) ? jsonParse(key) : key)
}

CHManager.prototype.getKeys = function(name, page, pageSize) {
  this._requireOpen(name)
  var all = $ch(name).getKeys()
  if (isNumber(page) && isNumber(pageSize)) {
    var start = (page - 1) * pageSize
    return { keys: all.slice(start, start + pageSize), total: all.length, page: page, pageSize: pageSize }
  }
  return all
}

CHManager.prototype.getAll = function(name, page, pageSize) {
  this._requireOpen(name)
  var all = $ch(name).getAll()
  if (isNumber(page) && isNumber(pageSize)) {
    var start = (page - 1) * pageSize
    return { values: all.slice(start, start + pageSize), total: all.length, page: page, pageSize: pageSize }
  }
  return all
}

CHManager.prototype.size = function(name) {
  this._requireOpen(name)
  return $ch(name).size()
}

CHManager.prototype.clearAll = function(name) {
  this._requireOpen(name)
  var keys = $ch(name).getKeys()
  var _self = this
  keys.forEach(function(k) { $ch(name).unset(k) })
  return keys.length
}

// ─── Import / Export ─────────────────────────────────────────────────────────

CHManager.prototype.importFile = function(name, file) {
  this._requireOpen(name)
  var data
  if (file.endsWith(".yaml") || file.endsWith(".yml")) {
    data = io.readFileYAML(file)
  } else {
    data = io.readFile(file)
  }
  if (!isArray(data)) throw "CHManager: import file must contain an array"
  data.forEach(function(row) { $ch(name).set(row, row) })
  return data.length
}

CHManager.prototype.exportFile = function(name, file) {
  this._requireOpen(name)
  var data = $ch(name).getAll()
  if (file.endsWith(".yaml") || file.endsWith(".yml")) {
    io.writeFileYAML(file, data)
  } else {
    io.writeFile(file, stringify(data, __, 2))
  }
  return data.length
}

// ─── Network: expose / peer / remote ─────────────────────────────────────────

CHManager.prototype.expose = function(name, port, path, authFn) {
  this._requireOpen(name)
  ow.loadServer()
  var p = isString(path) ? path : ("/" + name)
  var uuid = ow.ch.server.expose(name, port, p, authFn)
  this._exposes[name] = { port: port, path: p, uuid: uuid }
  if (this._defs[name]) {
    this._defs[name].exposeConfig = { port: port, path: p }
    this._save()
  }
  return uuid
}

CHManager.prototype.unexpose = function(name) {
  if (!this._exposes[name]) return
  // ow.ch.server doesn't have a built-in unexpose; we track for display only
  delete this._exposes[name]
  if (this._defs[name]) {
    delete this._defs[name].exposeConfig
    this._save()
  }
}

CHManager.prototype.peer = function(name, port, path, remoteURLs) {
  this._requireOpen(name)
  ow.loadServer()
  var p = isString(path) ? path : ("/" + name)
  var urls = isArray(remoteURLs) ? remoteURLs : (isString(remoteURLs) ? remoteURLs.split(",").map(function(s){return s.trim()}) : [])
  var subs = ow.ch.server.peer(name, port, p, urls)
  this._peers[name] = { port: port, path: p, urls: urls, subs: subs }
  if (this._defs[name]) {
    this._defs[name].peerConfig = { port: port, path: p, urls: urls }
    this._save()
  }
  return subs
}

CHManager.prototype.unpeer = function(name, remoteURL) {
  this._requireOpen(name)
  ow.loadServer()
  if (isString(remoteURL)) {
    ow.ch.server.unpeer(name, remoteURL)
  } else if (this._peers[name] && isArray(this._peers[name].urls)) {
    var _self = this
    this._peers[name].urls.forEach(function(u) { ow.ch.server.unpeer(name, u) })
  }
  delete this._peers[name]
  if (this._defs[name]) {
    delete this._defs[name].peerConfig
    this._save()
  }
}

CHManager.prototype.createRemote = function(defName, url, login, pass) {
  if (!isString(defName) || defName.trim().length === 0) throw "CHManager: defName is required"
  var opts = { url: url }
  if (isString(login)) opts.login = login
  if (isString(pass))  opts.password = pass
  this.addDef(defName, "remote", opts, false)
}

// ─── Subscribers ─────────────────────────────────────────────────────────────

CHManager.prototype.subscribe = function(name, fn, onlyFromNow) {
  this._requireOpen(name)
  var id = $ch(name).subscribe(fn, onlyFromNow === true)
  if (!this._subs[name]) this._subs[name] = []
  this._subs[name].push(id)
  return id
}

CHManager.prototype.unsubscribe = function(name, subId) {
  this._requireOpen(name)
  $ch(name).unsubscribe(subId)
  if (this._subs[name]) this._subs[name] = this._subs[name].filter(function(id) { return id !== subId })
}

CHManager.prototype.addMirrorSubscriber = function(srcName, targetName, filterFn) {
  this._requireOpen(srcName)
  if (!this._active[targetName]) throw "CHManager: target channel '" + targetName + "' is not open"
  ow.loadCh()
  var fn = ow.ch.utils.getMirrorSubscriber(targetName, filterFn)
  return this.subscribe(srcName, fn, false)
}

CHManager.prototype.addHousekeepSubscriber = function(name, maxKeys) {
  this._requireOpen(name)
  ow.loadCh()
  var fn = ow.ch.utils.getHousekeepSubscriber(name, isNumber(maxKeys) ? maxKeys : 100)
  return this.subscribe(name, fn, false)
}

CHManager.prototype.addBufferSubscriber = function(srcName, targetName, idxs, byNum, byTime) {
  this._requireOpen(srcName)
  if (!this._active[targetName]) throw "CHManager: target channel '" + targetName + "' is not open"
  ow.loadCh()
  var indexes = isArray(idxs) ? idxs : (isString(idxs) ? idxs.split(",").map(function(s){return s.trim()}) : ["id"])
  var fn = ow.ch.utils.getBufferSubscriber(srcName, indexes, isNumber(byNum) ? byNum : 100, isNumber(byTime) ? byTime : 2500, targetName)
  return this.subscribe(srcName, fn, false)
}

CHManager.prototype.syncChannels = function(idxs, srcName, targetName, syncFn) {
  this._requireOpen(srcName)
  if (!this._active[targetName]) throw "CHManager: target channel '" + targetName + "' is not open"
  ow.loadCh()
  var indexes = isArray(idxs) ? idxs : (isString(idxs) ? idxs.split(",").map(function(s){return s.trim()}) : ["id"])
  ow.ch.utils.syncCh(indexes, srcName, targetName, isFunction(syncFn) ? syncFn : function(a,b) { return true })
}

// ─── Type Registry ────────────────────────────────────────────────────────────

CHManager.typeRegistry = {
  // ── Built-in types ─────────────────────────────────────────────────────────
  "simple": {
    desc: "In-memory key/value store (default)",
    options: {}
  },
  "big": {
    desc: "Compressed in-memory store for large datasets",
    options: {}
  },
  "file": {
    desc: "JSON/YAML/TOON file-backed storage",
    odoc: "ow.ch.types.file",
    options: {
      file      : { type: "string", required: false, desc: "Path to single JSON/YAML file" },
      path      : { type: "string", required: false, desc: "Directory path for multi-file mode" },
      yaml      : { type: "boolean", default: false, desc: "Use YAML format" },
      toon      : { type: "boolean", default: false, desc: "Use TOON format" },
      compact   : { type: "boolean", default: false, desc: "Compact JSON output" },
      multifile : { type: "boolean", default: false, desc: "Separate file per entry" },
      multipart : { type: "boolean", default: false, desc: "YAML multipart file" },
      multipath : { type: "boolean", default: false, desc: "Support string keys with paths (ow.obj.setPath)" },
      key       : { type: "string", required: false, desc: "Special key field name" },
      gzip      : { type: "boolean", default: false, desc: "Gzip the output" },
      lz4       : { type: "boolean", default: false, desc: "LZ4 compression" },
      lock      : { type: "string", required: false, desc: "Path to lock file" },
      tmp       : { type: "boolean", default: false, desc: "Temporary file (auto-destroy)" }
    }
  },
  "db": {
    desc: "Database table channel",
    odoc: "ow.ch.types.db",
    options: {
      db  : { type: "string", required: true, desc: "DB object or JSON {url,user,pass,driver}" },
      from: { type: "string", required: true, desc: "Table or view name" },
      keys: { type: "array",  required: true, desc: "Array of key field names" },
      cs  : { type: "boolean", default: false, desc: "Case-sensitive keys" }
    }
  },
  "cache": {
    desc: "Caching layer with TTL and size-based eviction",
    odoc: "ow.ch.types.cache",
    options: {
      func      : { type: "function", required: true,  desc: "Function called on cache miss: (key) => value" },
      ttl       : { type: "number",  default: 5000,   desc: "Time-to-live in ms" },
      size      : { type: "number",  default: -1,     desc: "Max entries (-1 = unlimited)" },
      method    : { type: "string",  default: "t",    desc: "Eviction: t=time, p=count" },
      default   : { type: "object",  required: false, desc: "Default value to store and return on cache miss if func is not defined" },
      ch        : { type: "string",  required: false, desc: "Backing storage channel name" },
      useDefault: { type: "boolean", default: false,  desc: "Return default instead of calling func" }
    }
  },
  "buffer": {
    desc: "Buffer writes and flush periodically to another channel",
    odoc: "ow.ch.types.buffer",
    options: {
      bufferCh      : { type: "string",  required: true,  desc: "Target channel to flush into" },
      bufferIdxs    : { type: "array",   required: true,  desc: "Key field names" },
      bufferByNumber: { type: "number",  default: 100,    desc: "Flush after N entries" },
      bufferByTime  : { type: "number",  default: 2500,   desc: "Flush after N ms" },
      bufferTmpCh   : { type: "string",  required: false, desc: "Auxiliary temporary buffer storage channel" },
      bufferFunc    : { type: "function", required: false, desc: "Function that can trigger a buffer flush when it returns true" },
      timeout       : { type: "number",  default: 1500,   desc: "Flush/wait timeout in ms" },
      errorFn       : { type: "function", required: false, desc: "Optional error handler function" }
    }
  },
  "proxy": {
    desc: "Intercept and optionally modify all channel operations",
    odoc: "ow.ch.types.proxy",
    options: {
      chTarget : { type: "string",   required: true, desc: "Target channel name" },
      proxyFunc: { type: "function", required: true, desc: "Intercept function: (map) => value" }
    }
  },
  "dummy": {
    desc: "No-op sink: all writes discarded, reads return empty",
    odoc: "ow.ch.types.dummy",
    options: {}
  },
  "ops": {
    desc: "Wrap functions as channel operations",
    odoc: "ow.ch.types.ops",
    options: {}
  },
  "remote": {
    desc: "HTTP client to a remote exposed channel",
    odoc: "ow.ch.types.remote",
    options: {
      url            : { type: "string", required: true,  desc: "Remote channel URL" },
      login          : { type: "string", required: false, desc: "Basic auth username" },
      password       : { type: "string", required: false, desc: "Basic auth password" },
      timeout        : { type: "number", default: 5000,   desc: "Request timeout in ms" },
      default        : { type: "object", required: false, desc: "Default value to return when a request fails" },
      stopWhen       : { type: "function", required: false, desc: "Function that stops the underlying HTTP retry when true" },
      throwExceptions: { type: "boolean", default: true,  desc: "Throw on remote errors" },
      preAction      : { type: "function", required: false, desc: "Function called before every HTTP request" }
    }
  },
  "elasticsearch": {
    desc: "Elasticsearch index channel",
    odoc: "ow.ch.types.elasticsearch",
    options: {
      url   : { type: "string", required: true,  desc: "Elasticsearch URL" },
      index : { type: "string", required: true,  desc: "Index name or dynamic function" },
      format: { type: "string", required: false, desc: "Index date format used with ow.ch.utils.getElasticIndex" },
      user  : { type: "string", required: false, desc: "Elasticsearch username" },
      pass  : { type: "string", required: false, desc: "Elasticsearch password" },
      idKey : { type: "string", required: false, desc: "Field to use as ES _id" },
      fnId  : { type: "function", required: false, desc: "Function/hash name to calculate idKey from the key" },
      size  : { type: "number", default: 1000,   desc: "Max results for getAll/getKeys" },
      stamp : { type: "object", required: false, desc: "Stamp map merged with stored documents" },
      timeout: { type: "number", required: false, desc: "Request timeout in ms" },
      preAction: { type: "function", required: false, desc: "Function called before every request" }
    }
  },
  "prometheus": {
    desc: "Prometheus metrics storage channel",
    odoc: "ow.ch.types.prometheus",
    options: {
      urlQuery : { type: "string", required: false, desc: "Query endpoint URL" },
      urlPushGW: { type: "string", required: false, desc: "Push gateway URL" },
      prefix   : { type: "string", required: false, desc: "Metric name prefix" },
      gwGroup  : { type: "object", required: false, desc: "Grouping labels for push gateway ingestion" },
      helpMap  : { type: "object", required: false, desc: "OpenMetrics help map" }
    }
  },
  "simpleold": {
    desc: "Legacy in-memory key/value store",
    odoc: "ow.ch.types.simpleold",
    options: {}
  },
  "mvs": {
    desc: "H2 MVStore key/value storage",
    odoc: "ow.ch.types.mvs",
    options: {
      file          : { type: "string", required: false, desc: "MVStore file path; omitted means in-memory" },
      shouldCompress: { type: "boolean", required: false, desc: "Compress the MVStore structure" },
      compact       : { type: "boolean", default: false, desc: "Compact the file on create/destroy" },
      map           : { type: "string", default: "default", desc: "Map name or function used for sharding" },
      closeOnShutdown: { type: "boolean", default: true, desc: "Close the store on shutdown" }
    }
  },
  "etcd": {
    desc: "etcd v2 HTTP key/value channel",
    odoc: "ow.ch.types.etcd",
    options: {
      url            : { type: "string", required: true, desc: "HTTP(S) URL of the etcd daemon" },
      folder         : { type: "string", required: false, desc: "Key prefix/folder path" },
      throwExceptions: { type: "boolean", default: true, desc: "Throw HTTP errors as exceptions" },
      default        : { type: "object", required: false, desc: "Default value when a request fails" },
      preAction      : { type: "function", required: false, desc: "Function called before every HTTP request" }
    }
  },
  // ── Opack types ─────────────────────────────────────────────────────────────
  "redis": {
    desc: "Redis key/value store channel",
    opack: "Redis",
    odoc: "ow.ch.types.redis",
    options: {
      host: { type: "string", required: true,  default: "localhost", desc: "Redis host" },
      port: { type: "number", required: false, default: 6379,        desc: "Redis port" },
      dbid: { type: "string", required: false, desc: "Redis database ID" }
    }
  },
  "falkordb": {
    desc: "FalkorDB graph database channel",
    opack: "FalkorDB",
    odoc: "ow.ch.types.falkordb",
    options: {
      host      : { type: "string", required: true,  default: "localhost", desc: "FalkorDB host" },
      port      : { type: "number", required: false, default: 6379,        desc: "FalkorDB port" },
      graph     : { type: "string", required: false, default: "graph",     desc: "Graph name" },
      label     : { type: "string", required: true,  desc: "Key field whose value becomes node label" },
      typeField : { type: "string", required: false, default: "_TYPE", desc: "Special field name for FalkorDB node label on read/write" },
      edgesField: { type: "string", required: false, default: "_EDGES", desc: "Special field name for outgoing edges" },
      user      : { type: "string", required: false, desc: "FalkorDB username" },
      pass      : { type: "string", required: false, desc: "FalkorDB password" },
      timestamps: { type: "boolean", default: false, desc: "Store createdAt/updatedAt" },
      keyFields : { type: "array",  required: false, desc: "Additional key property names" },
      options   : { type: "object", required: false, desc: "Low-level FalkorDB constructor options" }
    }
  },
  "vectordb": {
    desc: "Lucene vector (k-NN) database channel",
    opack: "lucene",
    odoc: "ow.ch.types.vectordb",
    options: {
      path       : { type: "string", required: true,  desc: "Filesystem path for Lucene index" },
      dimension  : { type: "number", default: 384,    desc: "Vector dimensionality" },
      idField    : { type: "string", default: "id",   desc: "Unique ID field name" },
      vectorField: { type: "string", default: "vector", desc: "Vector field name" },
      vectorStoreField: { type: "string", required: false, desc: "Stored vector field name" },
      payloadField: { type: "string", default: "payload", desc: "Payload metadata field" },
      metaPrefix  : { type: "string", default: "meta_", desc: "Prefix for individual metadata fields" },
      similarity : { type: "string", default: "cosine", desc: "Similarity: cosine, dot_product, euclidean" },
      autoCommit : { type: "boolean", default: true,  desc: "Auto-commit after writes" },
      autoRefresh: { type: "boolean", default: true,  desc: "Auto-refresh searcher after writes" }
    }
  },
  "searchdb": {
    desc: "Lucene full-text search channel",
    opack: "lucene",
    odoc: "ow.ch.types.searchDB",
    options: {
      path        : { type: "string", required: true,  desc: "Filesystem path for Lucene index" },
      idField     : { type: "string", default: "id",   desc: "Unique ID field name" },
      contentField: { type: "string", default: "content", desc: "Searchable content field" },
      payloadField: { type: "string", default: "payload", desc: "Payload field name" },
      analyzer    : { type: "string", default: "standard", desc: "Lucene analyzer: standard, whitespace, english, keyword" },
      schema      : { type: "object", required: false, desc: "Schema for additional fields" },
      facetFields : { type: "array", required: false, desc: "Facet field names" },
      defaultSortField: { type: "string", required: false, desc: "Default sort field" },
      taxonomyPath: { type: "string", required: false, desc: "Facet taxonomy storage path" },
      autoCommit  : { type: "boolean", default: true,  desc: "Auto-commit after writes" },
      autoRefresh : { type: "boolean", default: true,  desc: "Auto-refresh searcher after commits" }
    }
  },
  "rocksdb": {
    desc: "RocksDB persistent key/value channel",
    opack: "rocksdb",
    odoc: "ow.ch.types.rocksdb",
    options: {
      path    : { type: "string",  required: true,  desc: "Filesystem path for RocksDB files" },
      dboptions: { type: "object", required: false, desc: "RocksDB DBOptions map" },
      options : { type: "object", required: false, desc: "RocksDB column family options map" },
      readonly: { type: "boolean", default: false,  desc: "Open in read-only mode" },
      compact : { type: "boolean", default: false,  desc: "Compact DB on destroy" }
    }
  },
  "s3": {
    desc: "AWS S3 (or compatible) object storage channel",
    opack: "S3",
    odoc: "ow.ch.types.s3",
    options: {
      s3bucket   : { type: "string",  required: true,  desc: "S3 bucket name" },
      s3url      : { type: "string",  required: true,  desc: "S3 endpoint URL" },
      s3accessKey: { type: "string",  required: false, desc: "S3 access key" },
      s3secretKey: { type: "string",  required: false, desc: "S3 secret key" },
      s3region   : { type: "string",  required: false, desc: "S3 region" },
      s3ignoreCert: { type: "boolean", default: false, desc: "Ignore S3 endpoint TLS certificate validation" },
      s3object   : { type: "string",  required: false, desc: "S3 object path (single-file mode)" },
      s3prefix   : { type: "string",  required: false, desc: "S3 key prefix (multi-file mode)" },
      yaml       : { type: "boolean", default: false,  desc: "Use YAML format" },
      compact    : { type: "boolean", default: false,  desc: "Compact JSON output" },
      multifile  : { type: "boolean", default: false,  desc: "Separate S3 object per entry" },
      multipart  : { type: "boolean", default: false,  desc: "YAML multipart object" },
      key        : { type: "string",  required: false, desc: "Special key field name" },
      multipath  : { type: "boolean", default: false,  desc: "Support string keys with paths" },
      lock       : { type: "string",  required: false, desc: "Local filesystem lock file path" },
      gzip       : { type: "boolean", default: false,  desc: "Gzip the stored content" }
    }
  },
  "dynamo": {
    desc: "AWS DynamoDB table channel",
    opack: "AWS",
    odoc: "ow.ch.types.dynamo",
    options: {
      tableName : { type: "string", required: true,  desc: "DynamoDB table name" },
      accessKey : { type: "string", required: false, desc: "AWS access key" },
      secretKey : { type: "string", required: false, desc: "AWS secret key" },
      region    : { type: "string", required: false, desc: "AWS region" },
      setUpdate : { type: "boolean", default: false, desc: "Use UPDATE instead of PUT" }
    }
  },
  "awssecrets": {
    desc: "AWS Secrets Manager read-only channel",
    opack: "AWS",
    odoc: "ow.ch.types.awssecrets",
    options: {}
  },
  "etcd3": {
    desc: "etcd3 key/value channel",
    opack: "etcd3",
    odoc: "ow.ch.types.etcd3",
    options: {
      host           : { type: "string",  required: true,  default: "localhost", desc: "etcd host" },
      port           : { type: "number",  required: true,  default: 2379,        desc: "etcd port" },
      namespace      : { type: "string",  required: false, desc: "Key namespace prefix" },
      login          : { type: "string",  required: false, desc: "etcd username" },
      pass           : { type: "string",  required: false, desc: "etcd password" },
      default        : { type: "object",  required: false, desc: "Default value when a request fails" },
      keyStamp       : { type: "object",  required: false, desc: "Map stamped into keys" },
      stamp          : { type: "object",  required: false, desc: "Map stamped into values" },
      watch          : { type: "boolean", default: false,  desc: "Enable watch mode for change notifications" },
      throwExceptions: { type: "boolean", default: true,   desc: "Throw on errors" }
    }
  },
  "cq": {
    desc: "Chronicle Queue append-only channel",
    opack: "cq",
    odoc: "ow.ch.types.cq",
    options: {
      path : { type: "string", required: false, default: ".", desc: "Chronicle Queue files path" },
      cycle: { type: "string", default: "DAILY", desc: "Roll cycle: DAILY, HOURLY, MINUTELY, etc." },
      cb   : { type: "function", required: false, desc: "Callback invoked when the store file changes" }
    }
  },
  "mongo": {
    desc: "MongoDB collection channel",
    opack: "Mongo",
    odoc: "ow.ch.types.mongo",
    options: {
      url       : { type: "string", required: false, default: "mongodb://localhost:27017", desc: "MongoDB connection URL" },
      database  : { type: "string", required: false, default: "default",                  desc: "Database name" },
      collection: { type: "string", required: false, default: "collection",               desc: "Collection name" },
      key       : { type: "string", required: false, desc: "Custom key field name" }
    }
  },
  "gist": {
    desc: "GitHub Gist storage channel",
    opack: "GIST",
    odoc: "ow.ch.types.gist",
    options: {
      token: { type: "string", required: false, desc: "GitHub API token" },
      user : { type: "string", required: false, desc: "GitHub username" }
    }
  }
}

CHManager.prototype.getTypeRegistry = function() {
  return CHManager.typeRegistry
}

CHManager.prototype.getTypeInfo = function(type) {
  return CHManager.typeRegistry[type]
}

CHManager.prototype.isOPackAvailable = function(opackName) {
  if (!isString(opackName)) return true
  try { return isString(getOPackPath(opackName)) } catch(e) { return false }
}

CHManager.prototype.listTypes = function(filter) {
  var _self = this
  return Object.keys(CHManager.typeRegistry)
    .filter(function(t) { return !isString(filter) || t.indexOf(filter) >= 0 })
    .map(function(t) {
      var info = CHManager.typeRegistry[t]
      return {
        type     : t,
        desc     : info.desc,
        odoc     : info.odoc,
        options  : info.options || {},
        opack    : info.opack || "(built-in)",
        available: !info.opack || _self.isOPackAvailable(info.opack)
      }
    })
}
