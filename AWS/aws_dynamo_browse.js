// DynamoDB browser provider. Only sanitized records leave this module.
var formats = ["slon", "json", "yaml", "njsmap"]
var own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key)

function columns(rows) {
  var keys = new Set()
  rows.forEach(row => Object.keys(row).forEach(key => keys.add(key)))
  return Array.from(keys)
}

function pick(row, fields) {
  var result = Object.create(null)
  fields.forEach(field => { if (own(row, field)) result[field] = row[field] })
  return result
}

function numberValue(s) {
  var n = Number(s)
  if ((Number.isInteger(n) && !Number.isSafeInteger(n)) || !isFinite(n) ||
      new java.math.BigDecimal(String(s)).compareTo(new java.math.BigDecimal(String(n))) != 0) return s
  return n
}

function unpack(item) {
  function value(v) {
    var type = Object.keys(v)[0], data = v[type]
    switch (type) {
    case "S": case "B": case "SS": case "BS": case "BOOL": return data
    case "NULL": return null
    case "N": return numberValue(data)
    case "NS": return data.map(numberValue)
    case "M": return unpack(data)
    case "L": return data.map(value)
    default: throw new Error("Unknown DynamoDB attribute type")
    }
  }
  var row = Object.create(null)
  Object.keys(item).forEach(field => row[field] = value(item[field]))
  return row
}

// Object member order can change when a query engine copies a selected row.
function signature(value) {
  return JSON.stringify(value, (key, v) => isMap(v) ? pick(v, Object.keys(v).sort()) : v)
}

function indexRows(rows) {
  var index = new Map()
  rows.forEach((row, i) => {
    var sig = signature(row)
    index.set(sig, index.has(sig) ? -1 : i)
  })
  return index
}

function checkFilter(filter) {
  var keys = isMap(filter) ? Object.keys(filter) : []
  if (keys.length != 1 || ["path", "from", "jq", "sql"].indexOf(keys[0]) < 0 ||
      !isString(filter[keys[0]]) || !filter[keys[0]].trim()) throw new Error("Expected one path, from, jq or sql expression")
}

// oafp's named SQL table form. Supply a rectangular input so sparse attributes
// are available on every row. H2 resolves unquoted SQL identifiers in uppercase.
function sqlRows(rows, expression) {
  var ast = af.fromSQL(expression).ast
  if (ast.length != 1 || ast[0].type != "select") throw new Error("Expected a SELECT query")
  if (!rows.length) return []
  var select = ast[0], wholeRows = select.columns.length == 1 && select.columns[0].expr.column == "*" &&
    select.from && select.from.length == 1 && String(select.from[0].table).toLowerCase() == "data" && !select._next
  var fields = columns(rows), names = Object.create(null), types = Object.create(null)
  fields.forEach(field => {
    var name = field.toUpperCase()
    if (own(names, name) || /["\x00]/.test(name)) throw new Error("Unsupported or ambiguous SQL column")
    names[name] = field
    var values = rows.map(r => own(r, field) ? r[field] : null).filter(v => v != null)
    types[name] = values.length && values.every(v => typeof v == "number") ? "DECFLOAT" :
      values.length && values.every(isBoolean) ? "BOOLEAN" : "VARCHAR"
  })
  var records = rows.map(row => {
    var record = Object.create(null)
    fields.forEach(field => {
      var v = own(row, field) ? row[field] : null
      record[field.toUpperCase()] = v == null ? null : isMap(v) || isArray(v) ? JSON.stringify(v) : v
    })
    return record
  })
  var labels = Object.assign(Object.create(null), names)
  select.columns.forEach(column => {
    if (isString(column.as)) labels[column.as.toUpperCase()] = column.as
  })
  var originals = new Map()
  if (wholeRows) records.forEach((record, i) => {
    var key = signature(record), previous = originals.get(key)
    if (isUnDef(previous)) originals.set(key, i)
    else if (previous >= 0 && signature(rows[i]) != signature(rows[previous])) originals.set(key, -1)
  })
  var sql = $sql()
  try {
    var result
    if (fields.length) {
      result = sql.table("DATA", records, types).query(expression)
    } else {
      // H2 can represent a row with zero visible columns. Keep its cardinality
      // for COUNT(*) without inventing an attribute visible to SELECT *.
      var data = "DATA AS (SELECT FROM SYSTEM_RANGE(1," + rows.length + "))"
      var query = /^WITH\s+(RECURSIVE\s+)?/i.test(expression) ?
        expression.replace(/^WITH\s+(RECURSIVE\s+)?/i, (m, recursive) => "WITH " + (recursive || "") + data + ", ") :
        "WITH " + data + " " + expression
      result = sql.query(query)
    }
    return result.map(row => {
      if (wholeRows) {
        var i = originals.get(signature(row))
        if (isDef(i) && i >= 0) return rows[i]
      }
      var out = Object.create(null)
      Object.keys(row).forEach(key => { out[own(labels, key) ? labels[key] : key] = row[key] })
      return out
    })
  } finally { sql.close() }
}

function evaluate(filter, rows) {
  var engine = Object.keys(filter)[0], expression = filter[engine].trim(), result
  switch (engine) {
  case "path": result = $path(rows, expression); break
  case "from": result = $from(rows).query(af.fromNLinq(expression)); break
  case "jq": result = $jq(rows, expression); break
  case "sql": result = sqlRows(rows, expression); break
  }
  return typeof result == "undefined" ? [] : isArray(result) ? result : [result]
}

function filterError(name, filter) {
  // Engine errors can include row values. Only report the configured filter and engine.
  var error = new Error("Could not evaluate " + name + " (" + Object.keys(filter)[0] + ")")
  error.filterMessage = error.message
  return error
}

// Some engines detach selected objects. Confirm provenance before assigning a
// link (or granting base-filter membership). A projection can coincidentally
// equal another item. A second, private evaluation on tagged copies can prove
// a whole-row selection without ever returning a tag or supplying a Dynamo key.
function selections(filter, rows, inputs, results) {
  var unique = indexRows(rows), identities = new Map()
  inputs.forEach((row, i) => identities.set(row, i))
  var candidates = results.map(row => isMap(row) ? unique.get(signature(row)) : -1)
  var unresolved = candidates.some((i, pos) => i >= 0 && identities.get(results[pos]) !== i)
  var proven = []
  if (unresolved) {
    var tag = "DYNAMO_" + genUUID().replace(/-/g, "")
    while (rows.some(row => own(row, tag))) tag += "_"
    var copies = rows.map((row, i) => {
      var copy = JSON.parse(JSON.stringify(row))
      copy[tag] = i
      return copy
    })
    try {
      evaluate(filter, copies).forEach((row, pos) => {
        if (!isMap(row) || !own(row, tag)) return
        var i = row[tag]
        if (!Number.isInteger(i) || i < 0 || i >= rows.length) return
        var original = pick(row, Object.keys(row).filter(k => k != tag))
        if (signature(original) == signature(rows[i])) proven[pos] = i
      })
    } catch (e) {
      // Presentation keeps the original result. Membership requires proof.
    }
  }
  return candidates.map((i, pos) => i >= 0 && (identities.get(results[pos]) === i || proven[pos] === i) ? i : -1)
}

function runFilter(filter, rows, name, identify) {
  try {
    // Keep the inventory immutable even for nLinq operations that edit a row.
    var inputs = JSON.parse(JSON.stringify(rows))
    var values = evaluate(filter, inputs.slice())
    return { values: values, indices: identify ? selections(filter, rows, inputs, values) : [] }
  } catch (e) { throw filterError(name, filter) }
}

function selectBase(table, rows) {
  if (!table.baseFilter) return rows.map((row, i) => i)
  var selected = runFilter(table.baseFilter, rows, "baseFilter", true).indices
  if (selected.some(i => i < 0)) throw filterError("baseFilter (must select original records)", table.baseFilter)
  return selected
}

exports.create = function(options, ttl, getClient, region, support) {
  support.check(options, support.capabilities)
  var tables = new Map(), salt = genUUID()
  if (!isArray(options.tables)) throw new Error("DynamoDBBrowse requires options.tables")
  options.tables.forEach(table => {
    if (!isMap(table) || !isString(table.name) || !/^[a-zA-Z0-9_.-]{3,255}$/.test(table.name) ||
        /^\.+$/.test(table.name) || tables.has(table.name)) throw new Error("Invalid or duplicate DynamoDB table")
    ;["columns", "hideColumns"].forEach(k => {
      if (isDef(table[k]) && (!isArray(table[k]) || !table[k].every(isString))) throw new Error("Invalid " + k)
    })
    ;["hidePrimaryKeys", "fullItem"].forEach(k => {
      if (isDef(table[k]) && !isBoolean(table[k])) throw new Error("Invalid " + k)
    })
    if (isDef(table.maxItems) && (!Number.isSafeInteger(table.maxItems) || table.maxItems < 1)) throw new Error("Invalid maxItems")
    if (isDef(table.complexFormat) && formats.indexOf(table.complexFormat) < 0) throw new Error("Invalid complexFormat")
    if (isDef(table.baseFilter)) checkFilter(table.baseFilter)
    if (isDef(table.filters) && !isMap(table.filters)) throw new Error("Expected a map of named filters")
    Object.keys(table.filters || {}).forEach(name => checkFilter(table.filters[name]))
    tables.set(table.name, table)
  })

  function locate(request, opts) {
    var path = global.__ojobHttpRelativePath(request.uri, opts.parentURI).replace(/\/$/, "")
    if (!path.length) return {}
    var parts = path.split("/"), table = tables.get(parts[0])
    if (!table || parts.length > 2 || parts.length == 2 &&
        (table.fullItem !== true || !/^[0-9a-f]{64}$/.test(parts[1]))) support.error(404, "Unknown location")
    return { table: table, token: parts[1] }
  }

  function load(name) {
    var table = tables.get(name), client = getClient()
    var schema = client.DYNAMO_DescribeTable(region, name)
    if (!schema.Table || !isArray(schema.Table.KeySchema)) throw new Error("Could not describe DynamoDB keys")
    var schemaKeys = schema.Table.KeySchema
    var keys = ["HASH", "RANGE"].map(type => schemaKeys.find(k => k.KeyType == type)).filter(Boolean).map(k => k.AttributeName)
    if (!keys.length || keys.length != schemaKeys.length || !keys.every(isString)) throw new Error("Invalid DynamoDB key schema")
    var hidden = new Set((table.hideColumns || []).concat(table.hidePrimaryKeys === true ? keys : []))
    var attributes = new Set(keys.concat(table.columns || []))
    var limit = table.maxItems || 1000, scanned = 0, cursor, items = [], ids = [], byId = new Map()
    var params = { TableName: name, ConsistentRead: false }
    if (isArray(table.columns) && !table.baseFilter) {
      params.ExpressionAttributeNames = {}
      params.ProjectionExpression = Array.from(attributes).filter(k => keys.includes(k) || !hidden.has(k)).map((field, i) => {
        var alias = "#c" + i
        params.ExpressionAttributeNames[alias] = field
        return alias
      }).join(", ")
    }
    do {
      params.Limit = limit - scanned
      var page = client.__DYNAMO_Request(region, "Scan", params)
      if (!isArray(page.Items)) throw new Error("Could not scan DynamoDB table")
      page.Items.forEach(item => {
        var key = pick(item, keys)
        if (Object.keys(key).length != keys.length) throw new Error("Scan omitted a primary key")
        var token = sha256(JSON.stringify([salt, name, key]))
        ids.push(token)
        byId.set(token, { key: key, index: items.length })
        items.push(unpack(item))
      })
      scanned += Math.max(page.ScannedCount || 0, page.Items.length)
      cursor = page.LastEvaluatedKey
      if (cursor && Object.keys(cursor).length == 0) cursor = null
      if (cursor && signature(cursor) == signature(params.ExclusiveStartKey)) throw new Error("Scan cursor did not advance")
      params.ExclusiveStartKey = cursor
    } while (cursor && scanned < limit)
    var selected = selectBase(table, items)
    if (!isArray(table.columns)) {
      selected.forEach(i => Object.keys(items[i]).forEach(field => attributes.add(field)))
    }
    var fields = Array.from(attributes).filter(k => !hidden.has(k))
    return { items: items, ids: ids, byId: byId, selected: selected, allowed: new Set(selected),
      hidden: hidden, fields: fields, partial: !!cursor, scanned: scanned }
  }

  // Keep the shared coalescing cache active even with search controls disabled.
  var provider = support.provider({ query: { enabled: true } })
  var inventory = provider.cache("dynamodb").ttl(isNumber(ttl) ? ttl : 5000).fn(key => load(key.uri)).create()
  var locks = new Map()
  tables.forEach((table, name) => locks.set(name, new java.lang.Object()))
  function snapshot(table) {
    return syncFn(() => inventory.get({ uri: table.name }), locks.get(table.name))
  }

  function list(request, opts) {
    var target = locate(request, opts), table = target.table, p = request.params || {}
    if (target.token) return { isFile: true }
    var fields = ["Table"], rows, partial = false, scanned = tables.size
    var q = String(p.q || ""), query = opts.query || {}
    if (q.length > (query.maxQueryLength || 256)) support.error(400, "Query too long")
    if (table) {
      if (p.format && formats.indexOf(p.format) < 0) support.error(400, "Invalid format")
      if (p.preset && !own(table.filters || {}, p.preset)) support.error(400, "Unknown preset")
      var data = snapshot(table)
      fields = data.fields
      partial = data.partial
      scanned = data.scanned
      var visible = data.selected.map(i => pick(data.items[i], fields))
      var values = visible, match
      if (p.preset) {
        var filtered = runFilter(table.filters[p.preset], visible, "preset " + p.preset, table.fullItem === true)
        values = filtered.values
        match = filtered.indices
      }
      rows = values.map((value, i) => {
        var row = { values: isMap(value) ? value : { Value: value } }
        var original = match ? match[i] : i
        if (table.fullItem === true && isDef(original) && original >= 0) row.item = data.ids[data.selected[original]]
        return row
      })
      if (p.preset && rows.length) fields = columns(rows.map(r => r.values))
    } else {
      rows = Array.from(tables.keys()).map(name => ({ isDirectory: true, values: { Table: name } }))
    }
    if (q && query.enabled) {
      var matches = support.searchMatcher(q, query.wildcards === true && p.wildcards != "0")
      rows = rows.filter(row => Object.keys(row.values).some(field => {
        var v = row.values[field]
        return matches(isMap(v) || isArray(v) ? JSON.stringify(v) : String(v))
      }))
    }
    var result = { isList: true, fields: fields, key: fields[0] || "", list: rows,
      searchInfo: { complete: !partial, truncated: partial, totalExact: !partial, scanned: scanned } }
    if (!query.enabled) return result
    // Give the shared sorter scalar comparison values for complex cells. Keep
    // its working rows private so the API retains original types and fields.
    var sortable = rows.map((row, i) => {
      var values = Object.create(null)
      fields.forEach(k => {
        var v = row.values[k]
        values[k] = isMap(v) || isArray(v) ? signature(v) : v
      })
      return { values: values, index: i, isDirectory: row.isDirectory }
    })
    // The contract coerces numeric text to Number. Rank exact Dynamo decimals
    // for this column when such coercion would lose ordering information.
    var sort = p.sort || result.key
    var decimals = sortable.map(row => row.values[sort])
    if (decimals.every(v => v == null || String(v).length <= 128 && /^-?\d+(?:\.\d+)?(?:e[+-]?\d{1,3})?$/i.test(String(v))) &&
        decimals.some(v => isString(v) && typeof numberValue(v) == "string")) {
      var ordered = Array.from(new Set(decimals.filter(v => v != null).map(String)))
      ordered.sort((a, b) => new java.math.BigDecimal(a).compareTo(new java.math.BigDecimal(b)))
      var ranks = new Map(ordered.map((v, i) => [v, i]))
      sortable.forEach(row => { if (row.values[sort] != null) row.values[sort] = ranks.get(String(row.values[sort])) })
    }
    var paged = support.query(Object.assign({}, result, { list: sortable, fields: fields.length ? fields : [""] }), request, opts)
    paged.fields = fields
    paged.list = paged.list.map(row => rows[row.index])
    return paged
  }

  function listing(request, opts) {
    try { return list(request, opts) }
    catch (e) {
      if (!e.filterMessage) throw e
      return { isList: true, fields: [], list: [], error: e.filterMessage, queryInfo: { applied: true } }
    }
  }

  function getObj(request, opts) {
    var target = locate(request, opts)
    if (!target.token) support.error(404, "Expected an item")
    var table = target.table, data = snapshot(table), entry = data.byId.get(target.token)
    if (!entry || !data.allowed.has(entry.index)) support.error(404, "Unknown item")
    var reply = getClient().__DYNAMO_Request(region, "GetItem", { TableName: table.name, Key: entry.key, ConsistentRead: true })
    if (!reply || reply.error) throw new Error("Could not read DynamoDB item")
    if (!reply.Item) support.error(404, "Unknown item")
    var item = unpack(reply.Item)
    if (table.baseFilter) {
      var current = data.items.slice()
      current[entry.index] = item
      if (selectBase(table, current).indexOf(entry.index) < 0) support.error(404, "Unknown item")
    }
    return { type: "json", data: pick(item, Object.keys(item).filter(k => !data.hidden.has(k))) }
  }

  var view = require("aws_dynamo_browse_view.js")
  return {
    validate: locate, getList: listing, search: listing, getObj: getObj,
    init: opts => {
      var render = opts._fns.renderList
      opts._fns.renderList = (result, server, req, options) =>
        view.list(render, result, server, req, options, locate(req, options).table)
    },
    renderObj: view.item,
    getStatus: () => provider.status(),
    getFreshness: (req, opts) => {
      var table = locate(req, opts).table
      return provider.freshness((name, key) => !table || key.uri == table.name)
    },
    refresh: (req, opts) => {
      var table = locate(req, opts).table
      var names = table ? [table.name] : Array.from(tables.keys())
      names.forEach(name => syncFn(() => provider.invalidate((unit, key) => key.uri == name), locks.get(name)))
      if (table) snapshot(table)
    }
  }
}
