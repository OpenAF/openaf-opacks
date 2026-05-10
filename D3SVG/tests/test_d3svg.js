/**
 * D3SVG basic regression tests
 *
 * Tests cover: SVG builder, scales, path generators, axes, and chart helpers.
 * Run with: oaf -f test_d3svg.js
 */

var d = require("../d3svg.js")

var _pass = 0
var _fail = 0

function assert(desc, actual, expected) {
  if (String(actual) === String(expected)) {
    _pass++
    // print("  PASS: " + desc)
  } else {
    _fail++
    print("  FAIL: " + desc)
    print("        expected: " + expected)
    print("        actual  : " + actual)
  }
}

function assertApprox(desc, actual, expected, tol) {
  tol = tol === undefined ? 0.01 : tol
  var ok = Math.abs(Number(actual) - Number(expected)) <= tol
  if (ok) {
    _pass++
  } else {
    _fail++
    print("  FAIL: " + desc)
    print("        expected: ~" + expected + " (±" + tol + ")")
    print("        actual  : " + actual)
  }
}

function assertContains(desc, haystack, needle) {
  if (String(haystack).indexOf(needle) >= 0) {
    _pass++
  } else {
    _fail++
    print("  FAIL: " + desc)
    print("        expected to contain: " + needle)
    print("        string was         : " + String(haystack).slice(0, 200))
  }
}

function assertNotContains(desc, haystack, needle) {
  if (String(haystack).indexOf(needle) < 0) {
    _pass++
  } else {
    _fail++
    print("  FAIL: " + desc)
    print("        expected NOT to contain: " + needle)
  }
}

function assertIsValidSVG(desc, svgStr) {
  var ok = svgStr && svgStr.indexOf('<svg ') >= 0 && svgStr.indexOf('</svg>') >= 0
           && svgStr.indexOf('xmlns="http://www.w3.org/2000/svg"') >= 0
  if (ok) {
    _pass++
  } else {
    _fail++
    print("  FAIL: " + desc + " — not a valid SVG string")
    print("        preview: " + String(svgStr).slice(0, 200))
  }
}

// ─── SVG builder ─────────────────────────────────────────────────────────────

print("▶ SVG builder")
;(function() {
  var svg = new d.SVG({ width: 200, height: 100, title: "Test SVG" })
  var out = svg.toString()

  assertIsValidSVG("SVG.toString() produces valid SVG", out)
  assertContains("SVG has width attribute", out, 'width="200"')
  assertContains("SVG has height attribute", out, 'height="100"')
  assertContains("SVG has viewBox attribute", out, 'viewBox="0 0 200 100"')
  assertContains("SVG has xmlns attribute", out, 'xmlns="http://www.w3.org/2000/svg"')
  assertContains("SVG has <title>", out, '<title>Test SVG</title>')
})()

;(function() {
  var svg = new d.SVG({ width: 100, height: 100 })
  svg.rect({ x: 10, y: 10, width: 80, height: 80, fill: "red" })
  var out = svg.toString()
  assertContains("rect element in SVG", out, '<rect')
  assertContains("rect fill attribute", out, 'fill="red"')
})()

;(function() {
  var svg = new d.SVG({ width: 100, height: 100 })
  svg.text({ x: 50, y: 50, "text-anchor": "middle" }, "Hello <World>")
  var out = svg.toString()
  assertContains("text element present", out, '<text')
  assertContains("text content escaped", out, 'Hello &lt;World&gt;')
})()

;(function() {
  var svg = new d.SVG({ width: 100, height: 100 })
  svg.addDef('<marker id="m1" markerWidth="10" markerHeight="10"/>')
  var out = svg.toString()
  assertContains("defs block present", out, '<defs>')
  assertContains("def content present", out, '<marker id="m1"')
})()

// ─── _escapeXml ──────────────────────────────────────────────────────────────

print("▶ _escapeXml")
assert("& → &amp;",  d._escapeXml("a & b"), "a &amp; b")
assert("< → &lt;",   d._escapeXml("a < b"), "a &lt; b")
assert("> → &gt;",   d._escapeXml("a > b"), "a &gt; b")
assert('" → &quot;', d._escapeXml('"'),      "&quot;")
assert("' → &apos;", d._escapeXml("'"),      "&apos;")
assert("null → ''",  d._escapeXml(null),     "")

// ─── scaleLinear ──────────────────────────────────────────────────────────────

print("▶ scaleLinear")
;(function() {
  var s = d.scaleLinear().domain([0, 100]).range([0, 500])
  assertApprox("scaleLinear(0) → 0",   s(0),   0)
  assertApprox("scaleLinear(50) → 250", s(50),  250)
  assertApprox("scaleLinear(100) → 500", s(100), 500)
})()

;(function() {
  var s = d.scaleLinear().domain([0, 10]).range([200, 0])
  assertApprox("inverted range: s(0) → 200", s(0), 200)
  assertApprox("inverted range: s(5) → 100", s(5), 100)
  assertApprox("inverted range: s(10) → 0",  s(10), 0)
})()

;(function() {
  var ticks = d.scaleLinear().domain([0, 100]).range([0, 500]).ticks(5)
  assert("ticks returns array",    Array.isArray(ticks), "true")
  assert("ticks has values",       ticks.length > 0, "true")
  assert("first tick <= domain 0", ticks[0] <= 0, "true")
  assert("last tick >= domain 100",ticks[ticks.length - 1] >= 100, "true")
})()

;(function() {
  var s = d.scaleLinear().domain([0, 7]).range([0, 100]).nice()
  var dom = s.domain()
  assert("nice() rounds domain", dom[0] <= 0, "true")
  assert("nice() rounds domain up", dom[1] >= 7, "true")
})()

// ─── scaleBand ────────────────────────────────────────────────────────────────

print("▶ scaleBand")
;(function() {
  var s = d.scaleBand().domain(["A","B","C"]).range([0, 300]).padding(0)
  var bw = s.bandwidth()
  assertApprox("equal bandwidth ≈ 100", bw, 100, 1)
  assert("s('A') starts at 0", s("A") < 10, "true")
})()

;(function() {
  var s = d.scaleBand().domain(["X","Y"]).range([0, 200]).padding(0.2)
  assert("bandwidth shrinks with padding", s.bandwidth() < 100, "true")
  assert("s('X') defined", s("X") !== undefined, "true")
  assert("s('Y') > s('X')",  s("Y") > s("X"), "true")
})()

// ─── _linearTicks ─────────────────────────────────────────────────────────────

print("▶ _linearTicks")
;(function() {
  var ticks = d._linearTicks(0, 100, 5)
  assert("ticks array returned",    Array.isArray(ticks), "true")
  assert("ticks not empty",         ticks.length > 0,    "true")
  assert("first tick is 0",         ticks[0],             0)
  assert("last tick is 100",        ticks[ticks.length - 1], 100)
})()

;(function() {
  var ticks = d._linearTicks(0, 1, 5)
  assert("decimal ticks returned",  ticks.length > 0, "true")
})()

// ─── linePath ─────────────────────────────────────────────────────────────────

print("▶ linePath")
;(function() {
  var path = d.linePath([{x:0,y:0},{x:100,y:50},{x:200,y:25}])
  assertContains("linePath starts with M", path, "M ")
  assertContains("linePath has L segments", path, " L ")
})()

;(function() {
  var path = d.linePath([[0,0],[100,50]])
  assertContains("linePath from arrays: M", path, "M 0")
})()

;(function() {
  var path = d.linePath([])
  assert("empty points → empty path", path, "")
})()

;(function() {
  var path = d.linePath([{x:5,y:10}])
  assertContains("single point → M only", path, "M 5")
})()

;(function() {
  var path = d.linePath([{x:0,y:0},{x:50,y:25},{x:100,y:10}], { curve: "monotone" })
  assertContains("monotone starts with M", path, "M ")
})()

// ─── arcPath ─────────────────────────────────────────────────────────────────

print("▶ arcPath")
;(function() {
  var path = d.arcPath({ cx: 100, cy: 100, r: 50, startAngle: 0, endAngle: Math.PI })
  assertContains("arcPath has M command",  path, "M ")
  assertContains("arcPath has A command",  path, " A ")
})()

;(function() {
  var path = d.arcPath({ cx: 100, cy: 100, r: 50, innerRadius: 25, startAngle: 0, endAngle: Math.PI * 1.5 })
  assertContains("donut arc has A command", path, " A ")
})()

// ─── axisBottom ───────────────────────────────────────────────────────────────

print("▶ axisBottom")
;(function() {
  var s = d.scaleLinear().domain([0, 100]).range([0, 400])
  var axis = d.axisBottom(s, { tickCount: 5, label: "X axis" })
  assertContains("axisBottom has <g>",     axis, "<g")
  assertContains("axisBottom has <text>",  axis, "<text")
  assertContains("axisBottom label",       axis, "X axis")
  assertContains("axisBottom has <line>",  axis, "<line")
})()

;(function() {
  var s = d.scaleBand().domain(["A","B","C"]).range([0, 300])
  var axis = d.axisBottom(s)
  assertContains("band axisBottom has A",  axis, "A")
  assertContains("band axisBottom has B",  axis, "B")
})()

// ─── axisLeft ─────────────────────────────────────────────────────────────────

print("▶ axisLeft")
;(function() {
  var s = d.scaleLinear().domain([0, 100]).range([400, 0])
  var axis = d.axisLeft(s, { tickCount: 5, label: "Y axis" })
  assertContains("axisLeft has <g>",      axis, "<g")
  assertContains("axisLeft has <text>",   axis, "<text")
  assertContains("axisLeft label",        axis, "Y axis")
})()

// ─── barChart ─────────────────────────────────────────────────────────────────

print("▶ barChart")
;(function() {
  var data = [
    { category: "A", value: 10 },
    { category: "B", value: 20 },
    { category: "C", value: 15 }
  ]
  var svg = d.barChart(data, { width: 400, height: 300 })
  assertIsValidSVG("barChart produces valid SVG", svg)
  assertContains("barChart has rect elements", svg, "<rect")
  assertContains("barChart has axis", svg, "axis")
})()

;(function() {
  var svg = d.barChart([], {})
  assertIsValidSVG("barChart empty data returns placeholder SVG", svg)
  assertContains("empty barChart shows 'No data'", svg, "No data")
})()

;(function() {
  var data = [{ category: "A", value: -5 }, { category: "B", value: 10 }]
  var svg = d.barChart(data, { width: 400, height: 300 })
  assertIsValidSVG("barChart with negative values", svg)
})()

;(function() {
  var data = [{ category: "A", value: 10 }, { category: "B", value: 20 }]
  var svg = d.barChart(data, { horizontal: true, width: 400, height: 300 })
  assertIsValidSVG("horizontal barChart valid SVG", svg)
})()

;(function() {
  var data = [{ category: "A", value: 10 }]
  var svg  = d.barChart(data, { showValues: true, title: "Title", subtitle: "Sub" })
  assertContains("showValues in barChart", svg, "10")
  assertContains("title present in barChart", svg, "Title")
})()

// ─── lineChart ────────────────────────────────────────────────────────────────

print("▶ lineChart")
;(function() {
  var data = [{ x: 0, y: 0 }, { x: 1, y: 5 }, { x: 2, y: 3 }]
  var svg  = d.lineChart(data, { width: 400, height: 300 })
  assertIsValidSVG("lineChart produces valid SVG", svg)
  assertContains("lineChart has path", svg, "<path")
})()

;(function() {
  var svg = d.lineChart([], {})
  assertIsValidSVG("lineChart empty data returns placeholder", svg)
  assertContains("empty lineChart shows 'No data'", svg, "No data")
})()

;(function() {
  var series = [
    { name: "A", values: [{ x: 0, y: 0 }, { x: 1, y: 10 }] },
    { name: "B", values: [{ x: 0, y: 5 }, { x: 1, y:  8 }] }
  ]
  var svg = d.lineChart(series, { showLegend: true })
  assertIsValidSVG("multi-series lineChart valid SVG", svg)
  assertContains("legend series name A", svg, ">A<")
})()

;(function() {
  var data = [{ x: 0, y: 0 }, { x: 1, y: 5 }, { x: 2, y: 3 }]
  var svg  = d.lineChart(data, { curve: "monotone" })
  assertIsValidSVG("monotone curve lineChart", svg)
  assertContains("monotone curve uses C commands", svg, " C ")
})()

// ─── pieChart ─────────────────────────────────────────────────────────────────

print("▶ pieChart")
;(function() {
  var data = [
    { name: "A", value: 30 },
    { name: "B", value: 50 },
    { name: "C", value: 20 }
  ]
  var svg = d.pieChart(data, { width: 400, height: 400 })
  assertIsValidSVG("pieChart produces valid SVG", svg)
  assertContains("pieChart has path elements", svg, "<path")
})()

;(function() {
  var data = [{ name: "A", value: 50 }, { name: "B", value: 50 }]
  var svg  = d.pieChart(data, { donut: true, donutRatio: 0.6 })
  assertIsValidSVG("donut pieChart valid SVG", svg)
})()

;(function() {
  var svg = d.pieChart([], {})
  assertIsValidSVG("pieChart empty data returns placeholder", svg)
  assertContains("empty pieChart shows 'No data'", svg, "No data")
})()

;(function() {
  var data = [{ name: "A", value: 0 }, { name: "B", value: 0 }]
  var svg  = d.pieChart(data, {})
  assertIsValidSVG("pieChart all-zero data returns placeholder", svg)
  assertContains("all-zero pieChart message", svg, "No data")
})()

;(function() {
  var data = [{ name: "A", value: 40 }, { name: "B", value: 60 }]
  var svg  = d.pieChart(data, { showLegend: true, showPercent: true })
  assertContains("legend in pieChart", svg, "A")
  assertContains("percentage label", svg, "%")
})()

// ─── getTheme ─────────────────────────────────────────────────────────────────

print("▶ getTheme")
;(function() {
  var t = d.getTheme("default")
  assert("default theme has background",  typeof t.background,  "string")
  assert("default theme has colors",      Array.isArray(t.colors), "true")
  assert("theme colors not empty",        t.colors.length > 0, "true")
})()

;(function() {
  var t = d.getTheme("dark")
  assert("dark theme returned",  t.background, d.themes.dark.background)
})()

;(function() {
  var t = d.getTheme("nonexistent")
  assert("unknown theme falls back to default", t.background, d.themes['default'].background)
})()

// ─── _formatNum ───────────────────────────────────────────────────────────────

print("▶ _formatNum")
assert("integer formats cleanly",    d._formatNum(100),        "100")
assert("float formats cleanly",      d._formatNum(3.14159),    "3.14159")
assert("zero formats cleanly",       d._formatNum(0),          "0")
assert(".2f specifier",              d._formatNum(1.2345, ".2f"), "1.23")
assert(".0% specifier",              d._formatNum(0.5, ".0%"),    "50%")

// ─── areaChart ────────────────────────────────────────────────────────────────

print("▶ areaChart")
;(function() {
  var data = [{x:0,y:0},{x:1,y:5},{x:2,y:3},{x:3,y:8}]
  var svg  = d.areaChart(data, { title: "Area test" })
  assertIsValidSVG("areaChart valid SVG", svg)
  assertContains("areaChart has path", svg, "<path")
  assertContains("areaChart has fill-opacity", svg, "fill-opacity")
})()
;(function() {
  assertIsValidSVG("areaChart empty", d.areaChart([],{}))
  assertContains("areaChart empty No data", d.areaChart([],{}), "No data")
})()

// ─── stackedBarChart ─────────────────────────────────────────────────────────

print("▶ stackedBarChart")
;(function() {
  var data = [{q:'Q1',a:10,b:20},{q:'Q2',a:15,b:18}]
  var svg  = d.stackedBarChart(data, {
    category:'q', series:[{key:'a',label:'A'},{key:'b',label:'B'}],
    showLegend:true, title:'Stacked'
  })
  assertIsValidSVG("stackedBarChart valid SVG", svg)
  assertContains("stackedBarChart has rect", svg, "<rect")
  assertContains("stackedBarChart has legend", svg, ">A<")
})()
;(function() {
  assertIsValidSVG("stackedBarChart empty", d.stackedBarChart([],{}))
  assertContains("stackedBarChart empty No data", d.stackedBarChart([],{}), "No data")
})()

// ─── scatterPlot ─────────────────────────────────────────────────────────────

print("▶ scatterPlot")
;(function() {
  var data = [{x:10,y:20},{x:30,y:5},{x:15,y:35}]
  var svg  = d.scatterPlot(data, { title: "Scatter" })
  assertIsValidSVG("scatterPlot valid SVG", svg)
  assertContains("scatterPlot has circle", svg, "<circle")
})()
;(function() {
  assertIsValidSVG("scatterPlot empty", d.scatterPlot([],{}))
  assertContains("scatterPlot empty No data", d.scatterPlot([],{}), "No data")
})()
;(function() {
  var multi = [{name:'A',values:[{x:1,y:2}]},{name:'B',values:[{x:3,y:4}]}]
  assertIsValidSVG("scatterPlot multi-series", d.scatterPlot(multi, {}))
})()

// ─── heatmap ─────────────────────────────────────────────────────────────────

print("▶ heatmap")
;(function() {
  var data = [{row:'R1',col:'C1',value:10},{row:'R1',col:'C2',value:50},
              {row:'R2',col:'C1',value:80},{row:'R2',col:'C2',value:30}]
  var svg  = d.heatmap(data, { showValues: true })
  assertIsValidSVG("heatmap valid SVG", svg)
  assertContains("heatmap has rect", svg, "<rect")
})()
;(function() {
  assertIsValidSVG("heatmap empty", d.heatmap([],{}))
  assertContains("heatmap empty No data", d.heatmap([],{}), "No data")
})()

// ─── sparkline ───────────────────────────────────────────────────────────────

print("▶ sparkline")
;(function() {
  var svg = d.sparkline([3,8,5,12,7,15], {width:120, height:40})
  assertIsValidSVG("sparkline valid SVG", svg)
  assertContains("sparkline has path", svg, "<path")
})()
;(function() {
  assertIsValidSVG("sparkline empty returns SVG", d.sparkline([],{}))
})()
;(function() {
  var svg = d.sparkline([{y:3},{y:8},{y:5}], {})
  assertContains("sparkline from objects has path", svg, "<path")
})()

// ─── gauge ───────────────────────────────────────────────────────────────────

print("▶ gauge")
;(function() {
  var svg = d.gauge(75, { min: 0, max: 100, title: "Speed", unit: "mph" })
  assertIsValidSVG("gauge valid SVG", svg)
  assertContains("gauge has arc path", svg, "<path")
  assertContains("gauge shows value", svg, "75")
  assertContains("gauge has needle", svg, "<line")
})()
;(function() {
  var svg = d.gauge(0, { min: 0, max: 100 })
  assertIsValidSVG("gauge value 0", svg)
})()
;(function() {
  var svg = d.gauge(150, { min: 0, max: 100 })
  assertIsValidSVG("gauge clamped over max", svg)
})()

// ─── progressBar ─────────────────────────────────────────────────────────────

print("▶ progressBar")
;(function() {
  var svg = d.progressBar(72, { width: 400, title: "Download" })
  assertIsValidSVG("progressBar valid SVG", svg)
  assertContains("progressBar has rects", svg, "<rect")
  assertContains("progressBar shows pct", svg, "%")
})()
;(function() {
  var svg = d.progressBar([
    {label:'CPU',value:65},{label:'Memory',value:42}
  ], { width: 400 })
  assertIsValidSVG("progressBar multi valid SVG", svg)
  assertContains("progressBar multi has label", svg, "CPU")
})()

// ─── kpiCard ─────────────────────────────────────────────────────────────────

print("▶ kpiCard")
;(function() {
  var svg = d.kpiCard([
    {label:'Revenue', value:'$2M', change:15},
    {label:'Users',   value:48200, change:-2}
  ], { width: 380, height: 120 })
  assertIsValidSVG("kpiCard valid SVG", svg)
  assertContains("kpiCard has label", svg, "Revenue")
  assertContains("kpiCard has change arrow", svg, "▲")
})()
;(function() {
  var svg = d.kpiCard({label:'Score', value:95}, {})
  assertIsValidSVG("kpiCard single item", svg)
  assertContains("kpiCard single label", svg, "Score")
})()

// ─── bulletChart ─────────────────────────────────────────────────────────────

print("▶ bulletChart")
;(function() {
  var data = [
    {label:'Sales', value:75, target:90, ranges:[{value:60,color:'#fadbd8'},{value:120,color:'#d5f5e3'}]},
    {label:'Profit',value:45, target:60}
  ]
  var svg = d.bulletChart(data, { showValues: true })
  assertIsValidSVG("bulletChart valid SVG", svg)
  assertContains("bulletChart has rect", svg, "<rect")
  assertContains("bulletChart has target line", svg, "<line")
  assertContains("bulletChart has label", svg, "Sales")
})()
;(function() {
  assertIsValidSVG("bulletChart empty", d.bulletChart([],{}))
  assertContains("bulletChart empty No data", d.bulletChart([],{}), "No data")
})()

// ─── timeline ────────────────────────────────────────────────────────────────

print("▶ timeline")
;(function() {
  var data = [
    {label:'Start', date:'Jan', color:'#3498db'},
    {label:'Launch',date:'Jun', color:'#27ae60'}
  ]
  var svg = d.timeline(data, { width: 500, height: 160, title: "Roadmap" })
  assertIsValidSVG("timeline valid SVG", svg)
  assertContains("timeline has circles", svg, "<circle")
  assertContains("timeline has label", svg, "Start")
})()
;(function() {
  assertIsValidSVG("timeline empty", d.timeline([],{}))
  assertContains("timeline empty No events", d.timeline([],{}), "No events")
})()

// ─── _interpolateColor ────────────────────────────────────────────────────────

print("▶ _interpolateColor")
assert("interpolateColor t=0", d._interpolateColor('#ffffff','#000000',0), "rgb(255,255,255)")
assert("interpolateColor t=1", d._interpolateColor('#ffffff','#000000',1), "rgb(0,0,0)")
assert("interpolateColor mid red", d._interpolateColor('#000000','#ff0000',0.5), "rgb(128,0,0)")

// ─── Summary ─────────────────────────────────────────────────────────────────

print("")
print("Results: " + _pass + " passed, " + _fail + " failed out of " + (_pass + _fail) + " tests")

if (_fail > 0) {
  throw "Test suite failed with " + _fail + " failure(s)"
}
