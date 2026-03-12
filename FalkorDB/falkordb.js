/**
 * <odoc>
 * <key>FalkorDB.FalkorDB(aHost, aPort, aGraph, aUser, aPass)</key>
 * Creates a new FalkorDB wrapper instance.
 * </odoc>
 */
var FalkorDB = function(aHost, aPort, aGraph, aUser, aPass) {
  var path = getOPackPath("FalkorDB") || ".";
  $path(io.listFiles(path).files, "[?ends_with(filename, '.jar') == `true`].canonicalPath").forEach((v) => {
    af.externalAddClasspath("file:///" + v.replace(/\\/g, "/"));
  });

  this.host = _$(aHost).isString().default("127.0.0.1");
  this.port = _$(aPort).isNumber().default(6379);
  this.graphName = _$(aGraph).isString().default("graph");
  this.user = _$(aUser).isString().default(__);
  this.pass = _$(aPass).isString().default(__);

  if (isDef(this.user) && isDef(this.pass)) {
    this.__driver = Packages.com.falkordb.FalkorDB.driver(this.host, this.port, String(this.user), String(this.pass));
  } else {
    this.__driver = Packages.com.falkordb.FalkorDB.driver(this.host, this.port);
  }

  this.__graph = this.__driver.graph(this.graphName);
};

FalkorDB.prototype.__normalizeKey = function(aKey) {
  if (isMap(aKey) && isDef(aKey.key)) aKey = aKey.key;
  if (isMap(aKey)) aKey = stringify(sortMapKeys(aKey), __, "");

  return String(aKey);
};

FalkorDB.prototype.__normalizeValue = function(aValue) {
  if (isMap(aValue) && isDef(aValue.value)) aValue = aValue.value;
  if (isMap(aValue) || isArray(aValue)) return stringify(sortMapKeys(aValue), __, "");
  if (isDate(aValue)) return aValue.toISOString();

  return isDef(aValue) ? String(aValue) : __;
};

FalkorDB.prototype.__parse = function(aValue) {
  if (!isString(aValue)) return aValue;

  var s = String(aValue).trim();
  if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
    try {
      return jsonParse(s, true);
    } catch(e) {
      return aValue;
    }
  }

  return aValue;
};

FalkorDB.prototype.__fromJava = function(aObj) {
  if (isUnDef(aObj)) return aObj;

  if (isDef(aObj.entrySet)) return this.__fromJava(af.fromJavaMap(aObj));
  if (isDef(aObj.toArray)) return af.fromJavaArray(aObj.toArray()).map(v => this.__fromJava(v));

  if (isArray(aObj)) return aObj.map(v => this.__fromJava(v));

  if (isMap(aObj)) {
    var out = {};
    Object.keys(aObj).forEach(k => {
      out[k] = this.__fromJava(aObj[k]);
    });
    return out;
  }

  return aObj;
};

FalkorDB.prototype.__escapeLabel = function(aLabel) {
  return "`" + String(aLabel).replace(/`/g, "``") + "`";
};

FalkorDB.prototype.__escapeProp = function(aProp) {
  _$(aProp, "property name").isString().$_();
  if (!String(aProp).match(/^[A-Za-z_][A-Za-z0-9_]*$/)) throw "Invalid FalkorDB property name '" + aProp + "'.";

  return aProp;
};

FalkorDB.prototype.__escapeRelation = function(aRelation) {
  _$(aRelation, "relationship type").isString().$_();
  if (!String(aRelation).match(/^[A-Za-z_][A-Za-z0-9_]*$/)) throw "Invalid FalkorDB relationship type '" + aRelation + "'.";

  return aRelation;
};

FalkorDB.prototype.__normalizeNodeMap = function(aMap) {
  aMap = _$(aMap).isMap().default({});

  var out = {};
  Object.keys(aMap).forEach(k => {
    out[this.__escapeProp(k)] = this.__normalizeValue(aMap[k]);
  });

  return out;
};

FalkorDB.prototype.__splitNodeKey = function(aLabelField, aKey, shouldRequireLabel) {
  _$(aLabelField, "label field").isString().$_();
  aLabelField = this.__escapeProp(aLabelField);

  if (isString(aKey) || isNumber(aKey)) {
    var m = {};
    m[aLabelField] = String(aKey);
    aKey = m;
  }

  aKey = this.__normalizeNodeMap(aKey);

  if (shouldRequireLabel) _$(aKey[aLabelField], "key." + aLabelField).isString().$_();

  var out = merge({}, aKey);
  var label = out[aLabelField];
  delete out[aLabelField];

  return {
    field: aLabelField,
    label: label,
    props: out
  };
};

FalkorDB.prototype.__mergeNodeProps = function(aKeyProps, aValue) {
  aValue = this.__normalizeNodeMap(_$(aValue, "value").isMap().$_());

  return merge(aValue, aKeyProps);
};

FalkorDB.prototype.__buildSetClauses = function(aProps, aPrefix, aAlias) {
  aProps = _$(aProps).isMap().default({});
  aPrefix = _$(aPrefix).isString().default("prop");
  aAlias = _$(aAlias).isString().default("c");

  var params = {};
  var clauses = [];
  var idx = 0;

  Object.keys(aProps).forEach(k => {
    var p = aPrefix + idx;
    clauses.push(aAlias + "." + this.__escapeProp(k) + " = $" + p);
    params[p] = aProps[k];
    idx++;
  });

  return {
    clauses: clauses,
    params: params
  };
};

FalkorDB.prototype.__buildMatch = function(aLabelField, aFilter, shouldRequireLabel, aAlias) {
  var key = this.__splitNodeKey(aLabelField, aFilter, shouldRequireLabel);
  aAlias = _$(aAlias).isString().default("c");
  var q = "MATCH (" + aAlias;
  var p = {};
  var clauses = [];

  if (isDef(key.label)) q += ":" + this.__escapeLabel(key.label);
  q += ")";

  Object.keys(key.props).forEach(k => {
    var pk = aAlias + "_" + k;
    p[pk] = key.props[k];
    clauses.push(aAlias + "." + this.__escapeProp(k) + " = $" + pk);
  });

  if (clauses.length > 0) q += " WHERE " + clauses.join(" AND ");

  return {
    query: q,
    params: p,
    key: key
  };
};

FalkorDB.prototype.__buildMerge = function(aLabelField, aFilter, shouldRequireLabel, aAlias) {
  var key = this.__splitNodeKey(aLabelField, aFilter, shouldRequireLabel);
  aAlias = _$(aAlias).isString().default("c");
  var q = "MERGE (" + aAlias;
  var p = {};
  var props = [];

  if (isDef(key.label)) q += ":" + this.__escapeLabel(key.label);

  Object.keys(key.props).forEach(k => {
    var pk = aAlias + "_" + k;
    p[pk] = key.props[k];
    props.push(this.__escapeProp(k) + ": $" + pk);
  });

  if (props.length > 0) q += " {" + props.join(", ") + "}";
  q += ")";

  return {
    query: q,
    params: p,
    key: key
  };
};

FalkorDB.prototype.__restoreNodeKey = function(aLabelField, aLabel, aNode) {
  var out = this.__parse(isDef(aNode) ? aNode : {});
  if (!isMap(out)) out = {};

  out[aLabelField] = aLabel;
  return out;
};

FalkorDB.prototype.chSize = function(aLabelField, aChannel) {
  var res = this.query(
    "MATCH (c) RETURN count(c) AS total"
  );

  return (isArray(res) && res.length > 0 && isDef(res[0].total)) ? Number(res[0].total) : 0;
};

FalkorDB.prototype.chGetKeys = function(aLabelField, aChannel, aFilter) {
  var m = this.__buildMatch(aLabelField, aFilter, false);
  var res = this.query(
    m.query + " RETURN labels(c)[0] AS label, properties(c) AS node ORDER BY label",
    m.params
  );

  return res.map(r => this.__restoreNodeKey(m.key.field, String(r.label), this.__fromJava(r.node)));
};

FalkorDB.prototype.chGet = function(aLabelField, aChannel, aKey) {
  var m = this.__buildMatch(aLabelField, aKey, true);
  var res = this.query(
    m.query + " RETURN properties(c) AS node",
    m.params
  );

  return (isArray(res) && res.length > 0) ? this.__fromJava(this.__parse(res[0].node)) : __;
};

FalkorDB.prototype.chGetWithLabel = function(aLabelField, aChannel, aKey) {
  var m = this.__buildMatch(aLabelField, aKey, true);
  var res = this.query(
    m.query + " RETURN labels(c)[0] AS label, properties(c) AS node",
    m.params
  );

  if (!(isArray(res) && res.length > 0)) return __;

  return {
    label: String(res[0].label),
    node: this.__fromJava(this.__parse(res[0].node))
  };
};

FalkorDB.prototype.__normalizeEdge = function(aLabelField, aTypeField, anEdge) {
  anEdge = _$(anEdge, "edge").isMap().$_();

  var target = _$(anEdge.target, "edge.target").isMap().$_();
  if (isDef(aTypeField) && isDef(target[aTypeField]) && isUnDef(target[aLabelField])) target[aLabelField] = target[aTypeField];

  var relType = _$(anEdge.type, "edge.type").isString().$_();
  var relProps = this.__normalizeNodeMap(_$(anEdge.properties).isMap().default({}));
  var targetData = merge({}, target);
  var targetValue = _$(anEdge.value).isMap().default({});

  if (isDef(aTypeField)) delete targetData[aTypeField];

  var targetKey = this.__splitNodeKey(aLabelField, targetData, true);

  return {
    type: this.__escapeRelation(relType),
    target: targetKey,
    node: this.__mergeNodeProps(targetKey.props, targetValue),
    properties: relProps
  };
};

FalkorDB.prototype.chGetEdges = function(aLabelField, aChannel, aKey, aTypeField) {
  var m = this.__buildMatch(aLabelField, aKey, true, "s");
  var res = this.query(
    m.query + " MATCH (s)-[r]->(t) RETURN type(r) AS type, properties(r) AS properties, labels(t)[0] AS label, properties(t) AS node ORDER BY type(r), label",
    m.params
  );

  return res.map(r => {
    var target = this.__restoreNodeKey(aLabelField, String(r.label), this.__fromJava(r.node));
    if (isDef(aTypeField)) target[aTypeField] = String(r.label);

    return {
      type: String(r.type),
      target: target,
      properties: this.__fromJava(this.__parse(r.properties))
    };
  });
};

FalkorDB.prototype.chSetEdges = function(aLabelField, aChannel, aKey, anEdges, aTypeField) {
  anEdges = _$(anEdges).isArray().default([]);

  var source = this.__buildMatch(aLabelField, aKey, true, "s");
  this.query(
    source.query + " OPTIONAL MATCH (s)-[r]->() DELETE r",
    source.params
  );

  anEdges.forEach((anEdge, idx) => {
    var edge = this.__normalizeEdge(aLabelField, aTypeField, anEdge);
    var targetFilter = merge({}, edge.target.props);
    targetFilter[aLabelField] = edge.target.label;

    var target = this.__buildMerge(aLabelField, targetFilter, true, "t");
    var targetSet = this.__buildSetClauses(edge.node, "tProp" + idx + "_", "t");
    var relSet = this.__buildSetClauses(edge.properties, "rProp" + idx + "_", "r");
    var q = source.query + " " + target.query + " MERGE (s)-[r:" + edge.type + "]->(t)";
    var p = merge(source.params, merge(target.params, merge(targetSet.params, relSet.params)));
    var sets = targetSet.clauses.concat(relSet.clauses);

    if (sets.length > 0) q += " SET " + sets.join(", ");
    this.query(q, p);
  });
};

FalkorDB.prototype.chSet = function(aLabelField, aChannel, aKey, aValue, aTimestamp, withDates) {
  var m = this.__buildMerge(aLabelField, aKey, true);
  var value = this.__mergeNodeProps(m.key.props, aValue);
  var ts = isDate(aTimestamp) ? aTimestamp.toISOString() : String(new Date().toISOString());
  var q = m.query;
  var setData = this.__buildSetClauses(value, "prop");
  var p = merge({}, setData.params);

  p = merge(m.params, p);

  if (withDates) {
    if (setData.clauses.length > 0) {
      q += " SET " + setData.clauses.join(", ") + ", c.updatedAt = $updatedAt";
    } else {
      q += " SET c.updatedAt = $updatedAt";
    }
    q += " ON CREATE SET c.createdAt = $createdAt";
    p.updatedAt = ts;
    p.createdAt = ts;
  } else {
    if (setData.clauses.length > 0) q += " SET " + setData.clauses.join(", ");
  }

  this.query(
    q + " RETURN properties(c) AS node",
    p
  );

  return aKey;
};

FalkorDB.prototype.chUnset = function(aLabelField, aChannel, aKey) {
  var m = this.__buildMatch(aLabelField, aKey, true);
  var total = this.chGet(aLabelField, aChannel, aKey);

  this.query(
    m.query + " DELETE c",
    m.params
  );

  return isDef(total) ? 1 : 0;
};

FalkorDB.prototype.chDestroy = function(aLabelField, aChannel) {
  this.query(
    "MATCH (c) DELETE c"
  );
};

/**
 * <odoc>
 * <key>FalkorDB.exportChStream(aLabelField, aFn, aMap) : Number</key>
 * Streams graph nodes in batches invoking aFn(aBatch, aMeta) for each batch.
 * Each entry has the channel-compatible shape `{ key, value }`, where key
 * includes aLabelField and any optional aMap.keyFields. value includes node
 * properties and, by default, outgoing edges in aMap.edgesField (`_EDGES`).
 * Use aMap.batchSize (defaults to 100), aMap.typeField (`_TYPE`),
 * aMap.edgesField (`_EDGES`), aMap.withEdges (defaults to true),
 * aMap.keyFields (defaults to []), and aMap.filter (optional key filter).
 * Returns the total exported record count.
 * </odoc>
 */
FalkorDB.prototype.exportChStream = function(aLabelField, aFn, aMap) {
  _$(aLabelField, "label field").isString().$_();
  _$(aFn, "callback function").isFunction().$_();
  aMap = _$(aMap).isMap().default({});

  var batchSize = _$(aMap.batchSize).isNumber().default(100);
  var typeField = _$(aMap.typeField).isString().default("_TYPE");
  var edgesField = _$(aMap.edgesField).isString().default("_EDGES");
  var withEdges = _$(aMap.withEdges).isBoolean().default(true);
  var keyFields = _$(aMap.keyFields).isArray().default([]);
  var filter = _$(aMap.filter).isMap().default(__);
  var keys = this.chGetKeys(aLabelField, __, filter);
  var total = 0;

  if (batchSize <= 0) batchSize = 100;

  for (var i = 0; i < keys.length; i += batchSize) {
    var batch = [];
    var bs = keys.slice(i, i + batchSize);

    bs.forEach(k => {
      var key = {};
      var value = this.chGet(aLabelField, __, k);

      key[typeField] = k[aLabelField];
      keyFields.forEach(f => {
        if (isDef(k[f])) key[f] = k[f];
      });

      if (withEdges) value[edgesField] = this.chGetEdges(aLabelField, __, k, typeField);

      batch.push({ key: key, value: value });
      total++;
    });

    aFn(batch, {
      op: "batch",
      batch: Number(i / batchSize) + 1,
      count: batch.length,
      total: total
    });
  }

  return total;
};

/**
 * <odoc>
 * <key>FalkorDB.importChStream(aLabelField, aFn, aMap) : Number</key>
 * Imports graph nodes in batches by repeatedly invoking aFn(aMeta) until it
 * returns undefined/null. Each returned batch can be either an array of
 * `{ key, value }` records or a map containing `items`/`batch` with that array.
 * Keys must include the configured type field (`aMap.typeField`, defaults to
 * `_TYPE`) so the node label can be mapped into aLabelField. Edge arrays can
 * be provided in value[aMap.edgesField] (`_EDGES`). Returns the total imported
 * record count.
 * </odoc>
 */
FalkorDB.prototype.importChStream = function(aLabelField, aFn, aMap) {
  _$(aLabelField, "label field").isString().$_();
  _$(aFn, "callback function").isFunction().$_();
  aMap = _$(aMap).isMap().default({});

  var typeField = _$(aMap.typeField).isString().default("_TYPE");
  var edgesField = _$(aMap.edgesField).isString().default("_EDGES");
  var timestamps = _$(aMap.timestamps).isBoolean().default(false);
  var total = 0;
  var idx = 0;

  while(true) {
    var raw = aFn({ op: "next", batch: idx + 1, total: total });
    if (isUnDef(raw) || raw === null) break;

    var records = raw;
    if (isMap(raw)) records = _$(raw.items).isArray().default(_$(raw.batch).isArray().default([]));
    records = _$(records, "batch records").isArray().$_();
    if (records.length <= 0) break;

    records.forEach(rec => {
      rec = _$(rec, "record").isMap().$_();

      var key = _$(rec.key, "record.key").isMap().default({});
      var value = _$(rec.value, "record.value").isMap().default({});

      if (isDef(key[typeField]) && isUnDef(key[aLabelField])) {
        key[aLabelField] = key[typeField];
        delete key[typeField];
      }
      if (isDef(value[typeField]) && isUnDef(key[aLabelField])) key[aLabelField] = value[typeField];
      _$(key[aLabelField], "record.key." + aLabelField).isString().$_("Missing record key type/label field.");

      var edges = _$(value[edgesField]).isArray().default(__);
      if (isDef(edges)) delete value[edgesField];

      this.chSet(aLabelField, __, key, value, __, timestamps);
      if (isDef(edges)) this.chSetEdges(aLabelField, __, key, edges, typeField);
      total++;
    });

    idx++;
  }

  return total;
};

/**
 * <odoc>
 * <key>FalkorDB.query(aCypher, aParams) : Array</key>
 * Executes a Cypher query and returns an array of row maps.
 * </odoc>
 */
FalkorDB.prototype.query = function(aCypher, aParams) {
  _$(aCypher).isString().$_("Please provide a Cypher query.");

  var rs = isDef(aParams) ? this.__graph.query(aCypher, af.toJavaMap(aParams)) : this.__graph.query(aCypher);
  var out = [];

  for (var r of rs) {
    var item = {};
    var keys = af.fromJavaArray(r.keys().toArray());
    for (var i in keys) item[keys[i]] = this.__fromJava(r.getValue(keys[i]));
    out.push(item);
  }

  return out;
};

FalkorDB.prototype.readOnlyQuery = function(aCypher, aParams) {
  _$(aCypher).isString().$_("Please provide a Cypher query.");

  var rs = isDef(aParams) ? this.__graph.readOnlyQuery(aCypher, af.toJavaMap(aParams)) : this.__graph.readOnlyQuery(aCypher);
  var out = [];

  for (var r of rs) {
    var item = {};
    var keys = af.fromJavaArray(r.keys().toArray());
    for (var i in keys) item[keys[i]] = this.__fromJava(r.getValue(keys[i]));
    out.push(item);
  }

  return out;
};

/**
 * <odoc>
 * <key>FalkorDB.createOrUpdateNode(aName, aType, aProperties) : Map</key>
 * Creates or updates a node identified by the provided name and type,
 * applying all properties from the provided map.
 * </odoc>
 */
FalkorDB.prototype.createOrUpdateNode = function(aName, aType, aProperties) {
  _$(aName).isString().$_("Please provide a node name.");
  _$(aType).isString().$_("Please provide a node type.");

  aProperties = _$(aProperties).isMap().default({});

  var params = merge(aProperties, {
    name: aName,
    type: aType
  });

  var res = this.query(
    "MERGE (n:Node {name: $name, type: $type}) " +
    "SET " + Object.keys(params).map((k, i) => "n." + this.__escapeProp(k) + " = $prop" + i).join(", ") + " " +
    "SET n.name = $name, n.type = $type " +
    "RETURN properties(n) AS node",
    merge({
      name: aName,
      type: aType
    }, Object.keys(params).reduce((r, k, i) => {
      r["prop" + i] = this.__normalizeValue(params[k]);
      return r;
    }, {}))
  );

  return isArray(res) && res.length > 0 ? res[0].node : __;
};

/**
 * <odoc>
 * <key>FalkorDB.linkNodes(aFromName, aFromType, aToName, aToType, aRelationship, aProperties) : Map</key>
 * Creates or updates a relationship between two nodes identified by the provided
 * names and types, applying all properties from the provided map.
 * </odoc>
 */
FalkorDB.prototype.linkNodes = function(aFromName, aFromType, aToName, aToType, aRelationship, aProperties) {
  _$(aFromName).isString().$_("Please provide the source node name.");
  _$(aFromType).isString().$_("Please provide the source node type.");
  _$(aToName).isString().$_("Please provide the target node name.");
  _$(aToType).isString().$_("Please provide the target node type.");
  aRelationship = this.__escapeRelation(aRelationship);
  aProperties = _$(aProperties).isMap().default({});

  var propData = this.__buildSetClauses(this.__normalizeNodeMap(aProperties), "relProp", "r");
  var query =
    "MERGE (from:Node {name: $fromName, type: $fromType}) " +
    "MERGE (to:Node {name: $toName, type: $toType}) " +
    "MERGE (from)-[r:" + aRelationship + "]->(to)";

  if (propData.clauses.length > 0) query += " SET " + propData.clauses.join(", ");
  query += " RETURN properties(r) AS relationship";

  var res = this.query(
    query,
    merge({
      fromName: aFromName,
      fromType: aFromType,
      toName: aToName,
      toType: aToType
    }, propData.params)
  );

  return isArray(res) && res.length > 0 ? res[0].relationship : __;
};

FalkorDB.prototype.deleteGraph = function() {
  return String(this.__graph.deleteGraph());
};

FalkorDB.prototype.getGraph = function() {
  return this.__graph;
};

FalkorDB.prototype.getDriver = function() {
  return this.__driver;
};

FalkorDB.prototype.close = function() {
  this.__graph.close();
  this.__driver.close();
};

/**
 * <odoc>
 * <key>FalkorDB.getCh(aCh, extraChannelOptions) : Channel</key>
 * Creates and returns a new channel with aCh using the current FalkorDB connection
 * details. Use `extraChannelOptions.label` to define the mandatory key field whose
 * value becomes the FalkorDB node label.
 * </odoc>
 */
FalkorDB.prototype.getCh = function(aCh, options) {
  _$(aCh, "aCh").isString().$_();
  options = _$(options).isMap().default({});

  $ch(aCh).create(1, "falkordb", merge({
    host: this.host,
    port: this.port,
    graph: this.graphName,
    user: this.user,
    pass: this.pass
  }, options));

  return $ch(aCh);
};

ow.loadCh();
ow.loadObj();

/**
* <odoc>
* <key>ow.ch.types.falkordb</key>
* A FalkorDB-backed OpenAF channel implementation. The creation options are:\
* \
*    - host  (String)  The FalkorDB server host.\
*    - port  (Number)  The FalkorDB server port (e.g. 6379).\
*    - graph (String)  The graph name to use.\
*    - label (String)  Mandatory key field name whose string value determines the FalkorDB node label.\
*    - keyFields (Array) Optional list of additional key properties. Recommended when using `getKeys`/`getAll`/`pop`/`shift` so non-key properties are preserved on reads.\
*    - typeField (String) Optional special field name for the FalkorDB node label on `get`/`getAll` and accepted on `set`/`setAll`. Defaults to `_TYPE`.\
*    - edgesField (String) Optional special field name for outgoing edges on `get`/`getAll` and accepted on `set`/`setAll`. Defaults to `_EDGES`.\
*    - timestamps (Boolean) When true stores `createdAt` and `updatedAt` fields. Defaults to false.\
*    - user  (String)  Optional FalkorDB username.\
*    - pass  (String)  Optional FalkorDB password.\
* \
* Channel values are persisted directly as node properties. The key must include the configured `label` field. Graph-wide operations such as `size` and `destroy` apply to all nodes in the configured graph. `getAll()` also accepts either a GQL/Cypher string or a map like `{ gql, params, readOnly }`, returning the raw query rows.
* </odoc>
*/
ow.ch.__types.falkordb = {
  __channels: {},
  __toPublicKey: function(aName, aKey) {
    if (!isMap(aKey)) return aKey;

    var o = this.__channels[aName].o;
    var out = merge({}, aKey);

    if (isDef(out[o.label])) {
      out[o.typeField] = out[o.label];
      delete out[o.label];
    }

    return out;
  },
  __prepareSpecialFields: function(aName, aObj) {
    aObj = _$(aObj).isMap().default({});
    var o = this.__channels[aName].o;
    var out = merge({}, aObj);
    var res = {
      value: out,
      type: __,
      edges: __
    };

    if (isDef(o.typeField) && isDef(out[o.typeField])) {
      res.type = out[o.typeField];
      delete out[o.typeField];
    }

    if (isDef(o.edgesField) && isDef(out[o.edgesField])) {
      res.edges = out[o.edgesField];
      delete out[o.edgesField];
    }

    return res;
  },
  __prepareKey: function(aName, aK, aV) {
    var o = this.__channels[aName].o;
    var key = isMap(aK) ? merge({}, aK) : aK;

    if (isMap(key) && isDef(o.typeField) && isDef(key[o.typeField]) && isUnDef(key[o.label])) {
      key[o.label] = key[o.typeField];
      delete key[o.typeField];
    }

    if (isMap(aV) && isDef(o.typeField) && isDef(aV[o.typeField]) && isMap(key) && isUnDef(key[o.label])) {
      key[o.label] = aV[o.typeField];
    }

    return key;
  },
  __extractPublicKey: function(aName, aObj) {
    if (!isDef(aObj) || !isMap(aObj)) return aObj;

    var o = this.__channels[aName].o;
    var out = {};

    if (isDef(aObj[o.label])) out[o.typeField] = aObj[o.label];

    var keyFields = _$(o.keyFields).isArray().default([]);
    keyFields.forEach(k => {
      if (isDef(aObj[k])) out[k] = aObj[k];
    });

    return out;
  },
  __getRawKeys: function(aName, aFilter) {
    return this.__channels[aName].f.chGetKeys(this.__channels[aName].o.label, aName, aFilter);
  },
  __stripKeyFields: function(aName, aObj, aK) {
    if (!isDef(aObj) || !isMap(aObj)) return aObj;

    var out = merge({}, aObj);
    var publicKey = this.__extractPublicKey(aName, this.__prepareKey(aName, aK));

    if (isMap(publicKey)) {
      Object.keys(publicKey).forEach(k => {
        if (k == this.__channels[aName].o.typeField) return;
        delete out[k];
      });
    }

    return out;
  },
  __withSpecialFields: function(aName, aObj, anEdges) {
    var o = this.__channels[aName].o;
    if (!isDef(aObj) || !isMap(aObj)) return aObj;

    if (isString(o.edgesField) && o.edgesField.length > 0) aObj[o.edgesField] = _$(anEdges).isArray().default([]);

    return aObj;
  },
  __isQueryRequest: function(aRequest) {
    return isString(aRequest) || (isMap(aRequest) && (isDef(aRequest.gql) || isDef(aRequest.cypher) || isDef(aRequest.query)));
  },
  __runGetAllQuery: function(aName, aRequest) {
    var req = isString(aRequest) ? { gql: aRequest } : aRequest;
    req = _$(req, "query request").isMap().$_();

    var gql = _$(req.gql).isString().default(_$(req.cypher).isString().default(_$(req.query).isString().default(__)));
    _$(gql, "query request.gql").isString().$_("Please provide a GQL/Cypher query.");

    var params = _$(req.params, "query request.params").isMap().default(__);
    var readOnly = _$(req.readOnly).isBoolean().default(true);

    return readOnly
      ? this.__channels[aName].f.readOnlyQuery(gql, params)
      : this.__channels[aName].f.query(gql, params);
  },
  create: function(aName, shouldCompress, options) {
    options = _$(options, "options").isMap().default({});
    _$(options.host, "falkordb host").isString().$_();
    options.port = _$(options.port, "falkordb port").isNumber().default(6379);
    options.graph = _$(options.graph, "falkordb graph").isString().default("graph");
    options.label = _$(options.label, "falkordb label").isString().$_();
    options.keyFields = _$(options.keyFields, "falkordb keyFields").isArray().default([]);
    options.typeField = _$(options.typeField, "falkordb typeField").isString().default("_TYPE");
    options.edgesField = _$(options.edgesField, "falkordb edgesField").isString().default("_EDGES");
    options.timestamps = _$(options.timestamps, "falkordb timestamps").isBoolean().default(false);

    this.__channels[aName] = {
      f: new FalkorDB(options.host, options.port, options.graph, options.user, options.pass),
      o: options
    };
  },
  destroy: function(aName) {
    this.__channels[aName].f.close();
    delete this.__channels[aName];
  },
  size: function(aName) {
    return this.__channels[aName].f.chSize(this.__channels[aName].o.label, aName);
  },
  forEach: function(aName, aFunction) {
    this.__getRawKeys(aName).forEach(k => aFunction(this.__extractPublicKey(aName, k), this.get(aName, k)));
  },
  getAll: function(aName, full) {
    if (this.__isQueryRequest(full)) return this.__runGetAllQuery(aName, full);
    return this.__getRawKeys(aName, full).map(k => this.get(aName, k));
  },
  getKeys: function(aName, full) {
    return this.__getRawKeys(aName, full).map(k => this.__extractPublicKey(aName, k));
  },
  getSortedKeys: function(aName, full) {
    return this.getKeys(aName, full);
  },
  getSet: function(aName, aMatch, aK, aV, aTimestamp) {
    var res = this.get(aName, aK);
    if ($stream([res]).anyMatch(aMatch)) return this.set(aName, aK, aV, aTimestamp);
    return __;
  },
  set: function(aName, aK, aV, aTimestamp) {
    var sv = this.__prepareSpecialFields(aName, aV);
    var key = this.__prepareKey(aName, aK, aV);
    var res = this.__channels[aName].f.chSet(this.__channels[aName].o.label, aName, key, sv.value, aTimestamp, this.__channels[aName].o.timestamps);

    if (isDef(sv.edges)) this.__channels[aName].f.chSetEdges(this.__channels[aName].o.label, aName, key, sv.edges, this.__channels[aName].o.typeField);
    return res;
  },
  setAll: function(aName, aKs, aVs, aTimestamp) {
    aKs = _$(aKs).isArray().default([]);
    _$(aVs).isArray().$_();

    var c = 0;
    aVs.forEach(v => {
      c++;
      this.set(aName, ow.obj.filterKeys(aKs, v), v, aTimestamp);
    });
    return c;
  },
  unsetAll: function(aName, aKs, aVs, aTimestamp) {
    aKs = _$(aKs).isArray().default([]);
    _$(aVs).isArray().$_();

    var c = 0;
    aVs.forEach(v => {
      c++;
      this.unset(aName, ow.obj.filterKeys(aKs, v), aTimestamp);
    });
    return c;
  },
  get: function(aName, aK) {
    var key = this.__prepareKey(aName, aK);
    var res = this.__channels[aName].f.chGetWithLabel(this.__channels[aName].o.label, aName, key);
    return isDef(res) ? this.__withSpecialFields(aName, this.__stripKeyFields(aName, res.node, aK), this.__channels[aName].f.chGetEdges(this.__channels[aName].o.label, aName, key, this.__channels[aName].o.typeField)) : __;
  },
  pop: function(aName) {
    var ks = this.__getRawKeys(aName);
    if (ks.length <= 0) return __;

    var key = ks[ks.length - 1];
    var res = this.get(aName, key);
    this.unset(aName, key);
    return res;
  },
  shift: function(aName) {
    var ks = this.__getRawKeys(aName);
    if (ks.length <= 0) return __;

    var key = ks[0];
    var res = this.get(aName, key);
    this.unset(aName, key);
    return res;
  },
  unset: function(aName, aK, aTimestamp) {
    return this.__channels[aName].f.chUnset(this.__channels[aName].o.label, aName, this.__prepareKey(aName, aK));
  }
};
