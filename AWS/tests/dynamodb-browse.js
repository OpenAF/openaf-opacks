// Run from AWS/ with oaf -f tests/dynamodb-browse.js. No AWS calls.
ow.loadTemplate()
var common = io.readFileYAML(getOPackPath("oJob-common") + "/oJobBrowse.yaml")
var support = {}
new Function("exports", common.code["ojob-browse-contract.js"])(support)
var http = io.readFileYAML(getOPackPath("oJob-common") + "/oJobHTTPd.yaml")
var start = http.jobs.find(job => String(job.exec).indexOf("global.__ojobHttpRelativePath =") >= 0).exec
new Function(start.substring(0, start.indexOf("var ks")))()
global.__ojobHttpUriPrefix = { 18888: "/prefix" }
var checks = 0
function ok(v, msg) { checks++; if (!v) throw new Error(msg) }
function eq(a,b,msg) { ok(JSON.stringify(a) == JSON.stringify(b), msg + " got " + JSON.stringify(a)) }
function denies(fn, msg) {
  try { fn() } catch (e) { ok(e.httpStatus == 404 || e.httpStatus == 400, msg + " " + e); return }
  throw new Error(msg)
}
var keys = ["900719925474099312345601", "900719925474099312345602", "900719925474099312345603", "900719925474099312345604"]
function makeItem(id, status, city, total, archived) {
  return { pk: { N: id }, sk: { B: "c2VjcmV0" }, status: { S: status }, total: { N: String(total) },
    shipping: { M: { city: { S: city } } }, archived: { BOOL: archived }, notes: { S: "hidden-note" }, extra: { S: "detail-only" } }
}
var items = [makeItem(keys[0], "OPEN", "Porto", 4, false), makeItem(keys[1], "OPEN", "Porto", 4, false),
  makeItem(keys[2], "CLOSED", "Braga", 10, false), makeItem(keys[3], "PRIVATE", "Braga", 12, true)]
var scans = 0, describes = 0, gets = 0, lastKey, projections = []
var client = {
  DYNAMO_DescribeTable: () => {
    describes++
    return { Table: { KeySchema: [{KeyType:"RANGE", AttributeName:"sk"}, {KeyType:"HASH", AttributeName:"pk"}] } }
  },
  __DYNAMO_Request: (region, op, p) => {
    if (op == "GetItem") {
      gets++
      lastKey = p.Key
      ok(p.ConsistentRead === true, "fresh detail read")
      return { Item: items.filter(row => row.pk.N == p.Key.pk.N && row.sk.B == p.Key.sk.B)[0] }
    }
    eq(op, "Scan", "read operation")
    ok(p.ConsistentRead === false, "eventually consistent scan")
    projections.push(p.ExpressionAttributeNames || null)
    scans++
    var i = p.ExclusiveStartKey ? keys.indexOf(p.ExclusiveStartKey.pk.N) + 1 : 0
    var page = items.slice(i, i + Math.min(2,p.Limit)), last = page[page.length-1]
    if (p.ProjectionExpression) {
      var fields = p.ProjectionExpression.split(", ").map(alias => p.ExpressionAttributeNames[alias])
      page = page.map(item => Object.fromEntries(fields.filter(k => k in item).map(k => [k,item[k]])))
    }
    return { Items: page, ScannedCount: page.length, LastEvaluatedKey: i + page.length < 5 ? {pk:last.pk, sk:last.sk} : __ }
  }
}
var table = { name:"Orders", maxItems:4, columns:["pk","sk","status","total","shipping","notes"], hideColumns:["notes","archived"],
  hidePrimaryKeys:true, fullItem:true, baseFilter:{path:"[?archived == `false`]"},
  filters:{open:{from:"equals(status,'OPEN')"}, city:{path:"[?shipping.city == 'Braga']"}, none:{jq:'map(select(.total > 100))'},
    project:{jq:'map({town:.shipping.city})'}, scalar:{path:"length(@)"}, group:{sql:"select status, sum(total) as amount from data group by status"},
    invalid:{jq:"map("}, hidden:{jq:"map(has(\"notes\") or has(\"pk\") or has(\"archived\"))"} } }
var opts = { tables:[table], parentURI:"/dynamo", port:18888, query:{enabled:true,pageSize:1,wildcards:true} }
var create = require("aws_dynamo_browse.js").create
var f = create(opts, 60000, () => client, "local", support)
// Initialize the same generic job used by the shortcuts, including its renderer.
var setup = common.jobs.find(job => job.name == "HTTP Browse generic").exec
function initBrowser(options, fns) {
  new Function("args", "require", setup)({port:options.port, uri:options.parentURI, options:options, fns:fns, templates:{}},
    name => name == "ojob-browse-contract.js" ? support : require(name))
}
initBrowser(opts,f)
function req(path, p) { return { uri:"/dynamo/" + path, params:p || {} } }
function list(p) { return f.getList(req("Orders/",p),opts) }
function html(result, p) { return String(f.renderList(result,{},req("Orders/",p),opts)) }
function noSecrets(value) {
  ;[keys[0],keys[1],keys[2],keys[3],"c2VjcmV0","hidden-note","PRIVATE"].forEach(text => ok(value.indexOf(text)<0,"redacted " + text))
}
eq(f.search(req("",{q:"ord*"}),opts).list[0].values.Table,"Orders","root wildcard")
eq(describes + scans, 0, "root is local")
denies(() => f.getList(req("Other"),opts),"allowlist")
var first = list()
eq(first.fields, ["status","total","shipping"], "visible columns")
eq(first.pageInfo.total,3,"base filter selects before pagination")
ok(first.searchInfo.truncated && first.searchInfo.scanned == 4, "bounded scan")
eq(projections, [null,null],"base filter reads undisplayed attributes")
var results = list({size:10}), token = results.list[0].item
ok(token && token.length==64, "opaque link")
ok(results.list[1].item != results.list[2].item,"duplicate visible source rows have distinct links")
eq(list({preset:"city"}).list[0].item, token, "nested path selects complete unique item")
eq(list({preset:"open"}).pageInfo.total, 2, "nLinq selection")
ok(!list({preset:"open"}).list[0].item, "ambiguous preset match standalone")
eq(list({preset:"none"}).pageInfo.total,0,"empty jq result")
eq(list({preset:"scalar"}).list[0].values.Value,3,"scalar")
eq(list({preset:"project"}).fields,["town"],"projection")
ok(!list({preset:"project"}).list[0].item,"projection standalone")
eq(list({preset:"group",q:"open"}).list[0].values.amount,8,"group SQL across all pages before search")
eq(list({preset:"group",sort:"amount",order:"desc"}).list[0].values.amount,10,"sort aggregate before paging")
eq(list({preset:"hidden"}).list[0].values.Value,false,"preset receives redacted input")
ok(list({preset:"invalid"}).error.indexOf("preset invalid (jq)")>=0,"explicit expression error")
eq(list({q:"*rag?", page:1}).pageInfo.total,0,"whole-value glob")
eq(list({q:"*braga*"}).pageInfo.total,1,"nested text search")
eq(list({page:3}).list.length,1,"last page")
eq(scans,2,"presets and pages reuse inventory")
denies(() => list({preset:"nonexistent"}),"unknown preset")
var json, path = "Orders/" + token
json = f.getObj(req(path),opts)
eq(lastKey,{pk:{N:keys[2]},sk:{B:"c2VjcmV0"}},"exact composite GetItem key")
eq(json.data.extra,"detail-only","full item")
noSecrets(JSON.stringify(json))
;["slon","json","yaml","njsmap"].forEach(format => {
  var p = {format:format,preset:"city",q:"braga",sort:"total",page:1}
  var page = html(list(p),p)
  ok(page.indexOf("Braga")>=0 && page.indexOf(token)>=0,format+" HTML matches API")
  ok(page.indexOf("loaded records")>=0 && page.indexOf("/prefix/dynamo/")>=0,"partial and URI prefix")
  noSecrets(page)
})
ok(html(list({preset:"group"}),{preset:"group"}).indexOf("aggregates cover only")>=0,"aggregate notice")
var nativeSearch = html(list({preset:"city",format:"json"}),{preset:"city",format:"json"})
ok(nativeSearch.includes('id="browse-search-form"') && nativeSearch.includes('id="browse-options-toggle"'),"shared search popover")
ok(!nativeSearch.includes('<select name="format"') && !/\d+ rows?<\/p>/.test(nativeSearch),"no format dropdown or row count")
ok(nativeSearch.includes('<dynamo-column-tools data-field="shipping" data-format="json" data-explicit="true">') &&
  !nativeSearch.includes('<dynamo-column-tools data-field="total"'),"only complex columns get header controls")
var defaultPage = html(list({preset:"city"}),{preset:"city"})
ok(defaultPage.includes('<dynamo-column-tools data-field="shipping" data-format="njsmap">'),"njsmap is the default complex format")
ok(!nativeSearch.includes("4 loaded records"),"partial scope notice omits row counts")
ok(!nativeSearch.includes('<select name="wildcards"'),"DynamoDB leaves wildcard controls to the shared popup")
if (setup.includes('id="browse-wildcards"')) {
  ok(nativeSearch.includes('id="browse-wildcards"') && nativeSearch.includes('id="browse-recursive"'),"original wildcard and subfolder controls")
}
ok(nativeSearch.includes('name="preset" value="city"') && nativeSearch.includes('name="format" value="json"'),"shared search preserves table settings")
var request = req("Orders/",{preset:"city",q:"braga",format:"njsmap"})
request.method = "GET"
request.header = {"x-openaf-browse-fragment":"1"}
var fragment = f.renderList(f.search(request,opts),{},request,opts)
eq(fragment.status,200,"shared live search fragment response")
;["browse-listing","browse-pagination","browse-cache-age","browse-search-notice"].forEach(id =>
  ok(fragment.data.includes('id="'+id+'"'),"shared fragment target "+id))
ok(fragment.data.includes(token) && fragment.data.includes("Braga") && !fragment.data.includes('id="browse-search-form"'),"fragment contains visible cells and item link")
ok(fragment.data.includes('<dynamo-column-tools data-field="shipping"') && fragment.data.includes('data-slon='),
  "live replacement carries header controls and inline representations")
noSecrets(fragment.data)
var root = req("",{q:"Ord*"})
var rootPage = f.renderList(f.search(root,opts),{},root,opts)
ok(rootPage.includes('id="browse-search-input"') && rootPage.includes('href="Orders/"'),"root uses searchable directory listing")
var raw = f.renderObj(json,{},req(path,{raw:"true"}),opts)
eq(JSON.parse(raw.data), json.data, "raw redaction")
var detail = f.renderObj(json,{},req(path),opts)
ok(detail.data.indexOf("nJSMap.mount")>=0 && detail.data.indexOf("detail-only")>=0,"inspector fallback")
noSecrets(detail.data)
items[2].archived.BOOL=true
denies(() => f.getObj(req(path),opts),"changed record excluded")
items[2].archived.BOOL=false
denies(() => f.getObj(req("Orders/"+Array(65).join("0")),opts),"unknown token")
;["pk","sk"].forEach(hidden => {
  var rule = Object.assign({},table,{baseFilter:__,hidePrimaryKeys:false,hideColumns:[hidden,"notes"]})
  var o = Object.assign({},opts,{tables:[rule]})
  var other = create(o,60000,()=>client,"local",support)
  var r = other.getList(req("Orders"),o)
  ok(r.fields.indexOf(hidden)<0 && r.fields.indexOf(hidden=="pk"?"sk":"pk")>=0,"hide just "+hidden)
  var j = other.getObj(req("Orders/"+r.list[0].item),o).data
  ok(!Object.prototype.hasOwnProperty.call(j,hidden),"detail hides just "+hidden)
  ok(projections[projections.length-1] && Object.values(projections[projections.length-1]).indexOf("notes")<0,"bounded projection")
  denies(()=>other.getObj(req(path),o),"browser-isolated token")
})
// Selections may be detached from their source objects by the query engine.
table.filters.jqCity = { jq: 'map(select(.shipping.city == "Braga"))' }
table.filters.sqlCity = { sql: "select * from data where status = 'CLOSED'" }
table.filters.lookalike = { jq: 'map(select(.status == "CLOSED") | {status, total, shipping})' }
eq(list({preset:"jqCity"}).list[0].item,token,"detached jq selection keeps its link")
eq(list({preset:"sqlCity"}).list[0].item,token,"SQL selection retains nested data and link")
ok(!list({preset:"lookalike"}).list[0].item,"identical-looking projection has no link")
eq(list({sort:"shipping"}).pageInfo.total,3,"sort structured cells")
items[0].total.N = "4.25"
f.refresh(req("Orders"),opts)
eq(list({preset:"group",q:"open"}).list[0].values.amount,8.25,"decimal SQL aggregate")
eq(list({preset:"city"}).list[0].item,token,"typed item token survives cache reload")
var badBase = Object.assign({},table,{baseFilter:{jq:"map({status})"}})
var failed = create(Object.assign({},opts,{tables:[badBase]}),60000,()=>client,"local",support).getList(req("Orders"),opts)
ok(failed.error.indexOf("must select original records")>=0 && failed.list.length==0,"base projection fails closed")
var onlyKeys = Object.assign({},table,{columns:[],hidePrimaryKeys:false,baseFilter:__,fullItem:false})
var onlyOptions = Object.assign({},opts,{tables:[onlyKeys]})
var only = create(onlyOptions,60000,()=>client,"local",support)
var before = scans
var pages = parallel4Array([1,2,3,4], page => only.getList(req("Orders",{page:page,sort:"pk",order:"desc"}),onlyOptions),4)
eq(scans-before,2,"four cold requests share one inventory")
eq(pages.map(page=>page.list[0].values.pk).sort(),keys.slice().sort(),"lossless keys on every page")
eq(only.getList(req("Orders",{order:"desc"}),onlyOptions).list[0].values.pk,keys[3],"sort exact high-precision keys")
eq(pages[0].fields,["pk","sk"],"default key order")
denies(()=>only.getObj(req(path),onlyOptions),"fullItem disabled")
var emptyFields = Object.assign({},onlyKeys,{hidePrimaryKeys:true})
var emptyOptions = Object.assign({},opts,{tables:[emptyFields]})
var noColumns = create(emptyOptions,60000,()=>client,"local",support)
var empty = noColumns.getList(req("Orders"),emptyOptions)
eq(empty.fields,[],"all keys hidden and no configured columns")
eq(empty.pageInfo.total,4,"all-hidden table can still page")
eq(empty.list[0].values,{},"all-hidden row")
emptyFields.filters.count = {sql:"select count(*) as n from data"}
eq(Number(noColumns.getList(req("Orders",{preset:"count"}),emptyOptions).list[0].values.n),4,"SQL counts all-hidden rows")
items[2].carrier = { S: "Parcel Express" }
items[3].archivedReason = { S: "expired" }
var discover = {name:"Orders", maxItems:4, hideColumns:["notes"]}
var discoverOpts = Object.assign({},opts,{tables:[discover]})
var discoverFns = create(discoverOpts,60000,()=>client,"local",support)
var discovered = discoverFns.getList(req("Orders/"),discoverOpts)
eq(projections.slice(-2),[null,null],"omitted columns scans all attributes on every page")
eq(discovered.fields,["pk","sk","status","total","shipping","archived","extra","carrier","archivedReason"],"discover sparse columns across scan pages with keys first")
ok(!("carrier" in discovered.list[0].values),"missing sparse value stays absent")
var filteredTable = Object.assign({},table)
delete filteredTable.columns
var filteredOpts = Object.assign({},opts,{tables:[filteredTable]})
var filteredFns = create(filteredOpts,60000,()=>client,"local",support)
initBrowser(filteredOpts,filteredFns)
var carrierSearch = req("Orders/",{q:"Parcel Express"})
var carrierResult = filteredFns.search(carrierSearch,filteredOpts)
eq(carrierResult.fields,["status","total","shipping","extra","carrier"],"discover only allowed attributes after base filtering and hiding")
eq(carrierResult.pageInfo.total,1,"search a discovered column on a later scan page")
eq(carrierResult.list[0].values.carrier,"Parcel Express","return discovered value in API")
var carrierHTML = filteredFns.renderList(carrierResult,{},carrierSearch,filteredOpts)
ok(carrierHTML.includes("Parcel Express") && !carrierHTML.includes("archivedReason"),"render discovered fields and exclude filtered schema")
print("PASS: "+checks+" DynamoDB browser checks")
