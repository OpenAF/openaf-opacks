// OpenAPI 3.x client for OpenAF. No additional JARs required.
var _oaOwn = function(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k) }
var _oaPut = function(o, k, v) {
  Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true })
  return o
}
var _oaCopy = function(o) { return JSON.parse(JSON.stringify(o)) }
var _oaMerge = function(a, b) {
  var r = {}
  Object.keys(a || {}).concat(Object.keys(b || {})).forEach(function(k) {
    _oaPut(r, k, _oaOwn(b, k) ? b[k] : a[k])
  })
  return r
}
var _oaEncode = function(v) {
  if (v === null || typeof v == "object" || typeof v == "undefined") throw new Error("Expected a scalar parameter value")
  return encodeURIComponent(String(v)).replace(/[!'()*]/g, function(c) { return "%" + c.charCodeAt(0).toString(16).toUpperCase() })
}
var _oaHeader = function(headers, name, value) {
  if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || /[\r\n]/.test(String(value))) throw new Error("Invalid HTTP header")
  Object.keys(headers).forEach(function(k) { if (k.toLowerCase() == name.toLowerCase()) delete headers[k] })
  _oaPut(headers, name, String(value))
}

/**
 * <odoc>
 * <key>OpenAPI.OpenAPI(aSource, aOptions) : OpenAPI</key>
 * Loads an OpenAPI 3.0/3.1 map, JSON/YAML file or HTTP(S) URL. Options include baseURL,
 * serverIndex, serverVariables, auth (by security scheme name), headers, restOptions,
 * documents (explicit external reference documents), sourceURL and specRestOptions.
 * </odoc>
 */
var OpenAPI = function(aSource, aOptions) {
  this.options = aOptions || {}
  if (!isMap(this.options)) throw new Error("Options must be a map")
  this.sourceURL = this.options.sourceURL
  if (typeof aSource == "string") {
    if (/^https?:\/\//i.test(aSource)) {
      this.sourceURL = aSource
      aSource = $rest(_oaMerge(this.options.specRestOptions, { throwExceptions: true })).get(aSource)
    } else {
      aSource = io.readFileString(aSource)
    }
    if (typeof aSource == "string") aSource = af.fromYAML(aSource)
  }
  if (!aSource || !/^3\.(0|1)\.\d+$/.test(String(aSource.openapi)) || !isMap(aSource.paths)) {
    throw new Error("Expected an OpenAPI 3.0/3.1 document with paths")
  }
  this.spec = _oaCopy(aSource)
  this.documents = _oaCopy(this.options.documents || {})
  this.operations = {}
  var self = this
  Object.keys(this.spec.paths).forEach(function(path) {
    if (path.indexOf("x-") == 0) return
    if (path.charAt(0) != "/" || /[?#]/.test(path)) throw new Error("Invalid API path: " + path)
    var item = self._resolve(self.spec.paths[path], "", [], false)
    ;["get", "put", "post", "delete", "options", "head", "patch", "trace"].forEach(function(method) {
      if (!_oaOwn(item, method)) return
      var op = item[method]
      if (!isMap(op)) throw new Error("Invalid operation: " + method + " " + path)
      var id = op.operationId || method.toUpperCase() + " " + path
      if (typeof id != "string") throw new Error("Invalid operationId")
      if (_oaOwn(self.operations, id)) throw new Error("Duplicate operationId: " + id)
      _oaPut(self.operations, id, { operationId: id, method: method, path: path, operation: op, pathItem: item })
    })
  })
}

var $openapi = function(aSource, aOptions) { return new OpenAPI(aSource, aOptions) }

// External documents are registered explicitly; references never initiate I/O.
OpenAPI.prototype._resolve = function(value, base, stack, deep) {
  if (stack.length > 64) throw new Error("Reference depth exceeds 64")
  var self = this
  if (value && typeof value == "object" && typeof value.$ref == "string") {
    if (Object.keys(value).some(function(k) { return ["$ref", "summary", "description"].indexOf(k) < 0 })) {
      throw new Error("Reference siblings other than summary/description are not supported")
    }
    var ref = value.$ref, hash = ref.indexOf("#"), doc = hash < 0 ? ref : ref.substring(0, hash)
    var fragment = hash < 0 ? "" : decodeURIComponent(ref.substring(hash + 1))
    if (doc && base) doc = String(new java.net.URI(base).resolve(doc))
    doc = doc || base
    var key = doc + "#" + fragment
    if (stack.indexOf(key) >= 0) throw new Error("Circular reference: " + key)
    var target = doc ? (_oaOwn(this.documents, doc) ? this.documents[doc] : undefined) : this.spec
    if (typeof target == "undefined") throw new Error("External reference requires options.documents: " + doc)
    if (fragment) {
      if (fragment.charAt(0) != "/") throw new Error("Only JSON Pointer references are supported: " + ref)
      fragment.substring(1).split("/").forEach(function(part) {
        part = part.replace(/~1/g, "/").replace(/~0/g, "~")
        if (!_oaOwn(target, part)) throw new Error("Unresolved reference: " + ref)
        target = target[part]
      })
    }
    // Expand referenced subtrees to retain their external document context.
    var resolved = this._resolve(target, doc, stack.concat([key]), true)
    if (_oaOwn(value, "summary") || _oaOwn(value, "description")) {
      resolved = _oaCopy(resolved)
      ;["summary", "description"].forEach(function(k) { if (_oaOwn(value, k)) _oaPut(resolved, k, value[k]) })
    }
    return resolved
  }
  if (!deep || value === null || typeof value != "object") return value
  if (Array.isArray(value)) return value.map(function(v) { return self._resolve(v, base, stack, true) })
  var result = {}
  Object.keys(value).forEach(function(k) { _oaPut(result, k, self._resolve(value[k], base, stack, true)) })
  return result
}

/**
 * <odoc>
 * <key>OpenAPI.resolve(aValue) : Object</key>
 * Returns a resolved copy. JSON Pointer references are supported; cycles fail explicitly.
 * </odoc>
 */
OpenAPI.prototype.resolve = function(value) { return _oaCopy(this._resolve(value, "", [], true)) }

OpenAPI.prototype._operation = function(id) {
  if (!_oaOwn(this.operations, id)) throw new Error("Unknown operation: " + id)
  return this.operations[id]
}

/**
 * <odoc>
 * <key>OpenAPI.listOperations() : Array</key>
 * Lists operationId, method, path, summary, description and tags without making requests.
 * </odoc>
 */
OpenAPI.prototype.listOperations = function() {
  var self = this
  return Object.keys(this.operations).map(function(id) {
    var entry = self.operations[id], op = entry.operation
    return { operationId: id, method: entry.method.toUpperCase(), path: entry.path,
      summary: op.summary || "", description: op.description || "", tags: _oaCopy(op.tags || []) }
  })
}

OpenAPI.prototype._parameters = function(entry) {
  var self = this, parameters = {}
  ;(entry.pathItem.parameters || []).concat(entry.operation.parameters || []).forEach(function(p) {
    p = self._resolve(p, "", [], false)
    if (!p.name || ["path", "query", "header", "cookie"].indexOf(p.in) < 0) throw new Error("Invalid parameter")
    _oaPut(parameters, p.in + ":" + p.name, p)
  })
  return Object.keys(parameters).map(function(k) { return parameters[k] })
}

OpenAPI.prototype._baseURL = function(entry) {
  var options = this.options, servers = entry.operation.servers || entry.pathItem.servers || this.spec.servers || [{ url: "/" }]
  var server = servers[typeof options.serverIndex == "undefined" ? 0 : options.serverIndex]
  if (!options.baseURL && !server) throw new Error("Invalid serverIndex")
  var url = options.baseURL || server.url
  if (!options.baseURL) url = url.replace(/\{([^}]+)\}/g, function(all, name) {
    var definition = (server.variables || {})[name] || {}
    var value = _oaOwn(options.serverVariables, name) ? options.serverVariables[name] : definition.default
    if (typeof value == "undefined") throw new Error("Missing server variable: " + name)
    if (definition.enum && definition.enum.indexOf(value) < 0) throw new Error("Invalid server variable: " + name)
    return String(value)
  })
  if (!/^https?:\/\//i.test(url) && this.sourceURL) url = String(new java.net.URI(this.sourceURL).resolve(url))
  if (!/^https?:\/\//i.test(url)) throw new Error("An absolute HTTP(S) baseURL is required for local specs with relative servers")
  var uri = new java.net.URI(url)
  if (uri.getHost() == null || uri.getUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null) throw new Error("Invalid server URL")
  return url.replace(/\/+$/, "")
}

// Returns a serialized value for path/header, or pairs for query/cookie.
OpenAPI.prototype._serialize = function(p, value) {
  var location = p.in, style = p.style || ((location == "query" || location == "cookie") ? "form" : "simple")
  var explode = typeof p.explode == "undefined" ? style == "form" : p.explode
  if (p.content || p.allowReserved) throw new Error("Parameter content and allowReserved are not supported: " + p.name)
  var array = Array.isArray(value), object = value !== null && typeof value == "object" && !array
  if (location == "cookie" && (array || object)) throw new Error("Only scalar cookie parameters are supported")
  var enc = location == "header" ? function(v) {
    if (v === null || typeof v == "object" || /[\r\n]/.test(String(v))) throw new Error("Invalid header parameter")
    return String(v)
  } : _oaEncode
  var keys = object ? Object.keys(value) : [], parts = array ? value.map(enc) : object ? keys.map(function(k) { return enc(k) + (explode ? "=" : ",") + enc(value[k]) }) : [enc(value)]
  var name = _oaEncode(p.name)
  if (location == "path") {
    if (["simple", "label", "matrix"].indexOf(style) < 0) throw new Error("Unsupported path style: " + style)
    if (style == "simple") return parts.join(",")
    if (style == "label") return "." + parts.join(explode ? "." : ",")
    if (object && explode) return ";" + parts.join(";")
    if (array && explode) return ";" + parts.map(function(v) { return name + "=" + v }).join(";")
    return ";" + name + "=" + parts.join(",")
  }
  if (location == "header") {
    if (style != "simple") throw new Error("Unsupported header style: " + style)
    return parts.join(",")
  }
  if (style == "deepObject" && location == "query" && object && explode) {
    return keys.map(function(k) { return name + "%5B" + _oaEncode(k) + "%5D=" + enc(value[k]) })
  }
  if (["spaceDelimited", "pipeDelimited"].indexOf(style) >= 0 && location == "query" && array && !explode) {
    return [name + "=" + parts.join(style == "spaceDelimited" ? "%20" : "%7C")]
  }
  if (style != "form") throw new Error("Unsupported parameter style: " + style)
  if (object && explode) return keys.map(function(k) { return _oaEncode(k) + "=" + enc(value[k]) })
  if (array && explode) return parts.map(function(v) { return name + "=" + v })
  return [name + "=" + parts.join(",")]
}

OpenAPI.prototype._security = function(entry, headers, query, cookies) {
  var self = this, requirements = typeof entry.operation.security == "undefined" ? this.spec.security : entry.operation.security
  if (!requirements || !requirements.length) return
  var schemes = (this.spec.components || {}).securitySchemes || {}, auth = this.options.auth || {}
  var selected = requirements.filter(function(r) {
    return Object.keys(r).every(function(name) { return _oaOwn(auth, name) })
  })[0]
  if (!selected) throw new Error("Missing credentials for operation: " + entry.operationId)
  Object.keys(selected).forEach(function(name) {
    if (!_oaOwn(schemes, name)) throw new Error("Unknown security scheme: " + name)
    var scheme = self._resolve(schemes[name], "", [], false), credential = auth[name]
    if (scheme.type == "apiKey") {
      if (typeof credential != "string") throw new Error("API key must be a string: " + name)
      if (scheme.in == "header") _oaHeader(headers, scheme.name, credential)
      else if (scheme.in == "query") query.push(_oaEncode(scheme.name) + "=" + _oaEncode(credential))
      else if (scheme.in == "cookie") cookies.push(_oaEncode(scheme.name) + "=" + _oaEncode(credential))
      else throw new Error("Unsupported API key location")
    } else if (scheme.type == "http" && String(scheme.scheme).toLowerCase() == "basic") {
      if (!credential || typeof credential.username != "string" || typeof credential.password != "string" || credential.username.indexOf(":") >= 0) throw new Error("Basic auth requires username and password")
      _oaHeader(headers, "Authorization", "Basic " + String(java.util.Base64.getEncoder().encodeToString(af.fromString2Bytes(credential.username + ":" + credential.password))))
    } else if ((scheme.type == "http" && String(scheme.scheme).toLowerCase() == "bearer") || scheme.type == "oauth2" || scheme.type == "openIdConnect") {
      if (typeof credential != "string") throw new Error("Bearer credential must be a token string: " + name)
      _oaHeader(headers, "Authorization", "Bearer " + credential)
    } else throw new Error("Unsupported security scheme: " + name)
  })
}

/**
 * <odoc>
 * <key>OpenAPI.buildRequest(aOperationId, aArgs) : Map</key>
 * Builds a request without I/O. Args contain path, query, header, cookie, body and contentType.
 * The returned headers/URL can contain credentials; do not log them indiscriminately.
 * </odoc>
 */
OpenAPI.prototype.buildRequest = function(id, args) {
  args = args || {}
  if (!isMap(args)) throw new Error("Operation arguments must be a map")
  Object.keys(args).forEach(function(k) {
    if (["path", "query", "header", "cookie", "body", "contentType"].indexOf(k) < 0) throw new Error("Unknown argument: " + k)
    if (["path", "query", "header", "cookie"].indexOf(k) >= 0 && !isMap(args[k])) throw new Error("Parameter groups must be maps: " + k)
  })
  var self = this, entry = this._operation(id), path = entry.path, query = [], cookies = [], headers = {}
  if (["get", "post", "put", "patch", "delete", "head"].indexOf(entry.method) < 0) throw new Error("Unsupported HTTP method: " + entry.method)
  var declared = { path: {}, query: {}, header: {}, cookie: {} }
  Object.keys(this.options.headers || {}).forEach(function(k) { _oaHeader(headers, k, self.options.headers[k]) })
  this._parameters(entry).forEach(function(p) {
    _oaPut(declared[p.in], p.name, true)
    // OpenAPI ignores these header parameter definitions.
    if (p.in == "header" && /^(accept|content-type|authorization)$/i.test(p.name)) return
    var values = args[p.in] || {}, schema = p.schema ? self._resolve(p.schema, "", [], false) : {}
    var value = _oaOwn(values, p.name) ? values[p.name] : schema.default
    if (typeof value == "undefined") {
      if (p.required || p.in == "path") throw new Error("Missing required " + p.in + " parameter: " + p.name)
      return
    }
    if (p.in == "path" && (value === "." || value === "..")) throw new Error("Dot segments are not valid path parameter values")
    var serialized = self._serialize(p, value)
    if (p.in == "path") path = path.split("{" + p.name + "}").join(serialized)
    else if (p.in == "header") _oaHeader(headers, p.name, serialized)
    else if (p.in == "query") query = query.concat(serialized)
    else cookies = cookies.concat(serialized)
  })
  Object.keys(declared).forEach(function(location) {
    Object.keys(args[location] || {}).forEach(function(name) {
      if (!_oaOwn(declared[location], name)) throw new Error("Unknown " + location + " parameter: " + name)
    })
  })
  if (/\{[^}]+\}/.test(path)) throw new Error("Unresolved path template")
  var body, requestBody = entry.operation.requestBody
  if (requestBody) {
    requestBody = this._resolve(requestBody, "", [], false)
    if (requestBody.required && typeof args.body == "undefined") throw new Error("Missing required request body")
    if (typeof args.body != "undefined") {
      var content = requestBody.content || {}, types = Object.keys(content)
      var type = args.contentType || (_oaOwn(content, "application/json") ? "application/json" : types[0])
      if (!_oaOwn(content, type)) throw new Error("Undeclared request content type")
      if (["post", "put", "patch"].indexOf(entry.method) < 0) throw new Error("Request bodies are supported only for POST, PUT and PATCH")
      if (/^application\/(?:[^;]+\+)?json$/.test(type)) body = JSON.stringify(args.body)
      else if (type == "text/plain" && typeof args.body == "string") body = args.body
      else if (type == "application/x-www-form-urlencoded" && isMap(args.body)) {
        var encoding = content[type].encoding || {}, fields = []
        Object.keys(args.body).forEach(function(name) {
          var definition = encoding[name] || {}
          if (definition.contentType || definition.headers) throw new Error("Form contentType/headers encoding is not supported")
          fields = fields.concat(self._serialize(_oaMerge(definition, { name: name, in: "query" }), args.body[name]))
        })
        body = fields.join("&")
      }
      else throw new Error("Unsupported request content type: " + type)
      _oaHeader(headers, "Content-Type", type)
    }
  } else if (typeof args.body != "undefined") throw new Error("Operation has no requestBody")
  this._security(entry, headers, query, cookies)
  if (cookies.length) {
    var previous = Object.keys(headers).filter(function(k) { return k.toLowerCase() == "cookie" })[0]
    _oaHeader(headers, "Cookie", (previous ? headers[previous] + "; " : "") + cookies.join("; "))
  }
  return { operationId: id, method: entry.method, url: this._baseURL(entry) + path + (query.length ? "?" + query.join("&") : ""), headers: headers, body: body }
}

/**
 * <odoc>
 * <key>OpenAPI.call(aOperationId, aArgs) : Object</key>
 * Executes a declared operation through $rest. HTTP and transport errors throw by default.
 * </odoc>
 */
OpenAPI.prototype.call = function(id, args) {
  var request = this.buildRequest(id, args)
  var options = _oaMerge({ throwExceptions: true }, this.options.restOptions)
  options.requestHeaders = request.headers
  var rest = $rest(options)
  return typeof request.body == "undefined" ? rest[request.method](request.url) : rest[request.method](request.url, request.body)
}

// Convert the OpenAPI 3.0 schema keywords whose JSON Schema semantics differ.
OpenAPI.prototype._toolSchema = function(value) {
  var schema = this.resolve(value)
  if (this.spec.openapi.indexOf("3.0.") != 0) return schema
  function convert(s) {
    if (!isMap(s)) return s
    if (s.nullable === true && typeof s.type == "string") s.type = [s.type, "null"]
    delete s.nullable
    ;["minimum", "maximum"].forEach(function(k) {
      var exclusive = k == "minimum" ? "exclusiveMinimum" : "exclusiveMaximum"
      if (typeof s[exclusive] == "boolean") {
        if (s[exclusive] && typeof s[k] == "number") { s[exclusive] = s[k]; delete s[k] }
        else delete s[exclusive]
      }
    })
    ;["properties", "patternProperties", "definitions", "$defs"].forEach(function(k) {
      Object.keys(s[k] || {}).forEach(function(name) { s[k][name] = convert(s[k][name]) })
    })
    ;["items", "additionalProperties", "not"].forEach(function(k) { if (isMap(s[k])) s[k] = convert(s[k]) })
    ;["allOf", "anyOf", "oneOf"].forEach(function(k) { if (Array.isArray(s[k])) s[k] = s[k].map(convert) })
    return s
  }
  return convert(schema)
}

/**
 * <odoc>
 * <key>OpenAPI.toTools(aOperationIds) : Array</key>
 * Returns selected tool descriptors with name, description, inputSchema and an execute(args) function.
 * Selection is mandatory. This does not start an MCP server or execute operations.
 * </odoc>
 */
OpenAPI.prototype.toTools = function(ids) {
  if (!Array.isArray(ids)) throw new Error("An explicit operationId array is required")
  var self = this, names = {}
  return ids.map(function(id) {
    var entry = self._operation(id), name = id.replace(/[^A-Za-z0-9_-]/g, "_")
    if (!name || name.length > 64 || _oaOwn(names, name)) throw new Error("Invalid or colliding tool name: " + name)
    _oaPut(names, name, true)
    var schema = { type: "object", properties: {}, additionalProperties: false }, required = []
    self._parameters(entry).forEach(function(p) {
      if (p.in == "header" && /^(accept|content-type|authorization)$/i.test(p.name)) return
      if (p.content) throw new Error("Parameter content is not supported")
      if (!_oaOwn(schema.properties, p.in)) _oaPut(schema.properties, p.in, { type: "object", properties: {}, additionalProperties: false })
      var group = schema.properties[p.in]
      _oaPut(group.properties, p.name, self._toolSchema(p.schema || {}))
      if (p.required || p.in == "path") {
        if (!group.required) group.required = []
        group.required.push(p.name)
        if (required.indexOf(p.in) < 0) required.push(p.in)
      }
    })
    if (entry.operation.requestBody) {
      var body = self._resolve(entry.operation.requestBody, "", [], false), content = body.content || {}
      var type = _oaOwn(content, "application/json") ? "application/json" : Object.keys(content)[0]
      if (!type || (!/^application\/(?:[^;]+\+)?json$/.test(type) && ["text/plain", "application/x-www-form-urlencoded"].indexOf(type) < 0)) throw new Error("Unsupported tool request content type")
      schema.properties.body = self._toolSchema(content[type].schema || {})
      if (body.required) required.push("body")
    }
    if (required.length) schema.required = required
    return { name: name, description: entry.operation.description || entry.operation.summary || id,
      inputSchema: schema, execute: function(args) { return self.call(id, args) } }
  })
}

/**
 * <odoc>
 * <key>OpenAPI.toJobs(aOperationIds, aSpecFile) : Map</key>
 * Generates an oJob document containing selected jobs. Jobs accept args.openapiArgs and runtime
 * args.openapiOptions and place responses in args.result. No credentials are embedded.
 * </odoc>
 */
OpenAPI.prototype.toJobs = function(ids, specFile) {
  if (typeof specFile != "string" || !specFile.length) throw new Error("A spec file or URL is required")
  var self = this
  this.toTools(ids) // Validate explicit selection and name collisions.
  return { jobs: ids.map(function(id) {
    self._operation(id)
    return { name: id, exec: 'var api = require("openapi.js").$openapi(' + JSON.stringify(specFile) + ', args.openapiOptions || {})\nargs.result = api.call(' + JSON.stringify(id) + ', args.openapiArgs || {})' }
  }) }
}

if (typeof exports != "undefined") {
  exports.OpenAPI = OpenAPI
  exports.$openapi = $openapi
}
