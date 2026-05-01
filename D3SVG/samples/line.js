/**
 * D3SVG sample — line chart
 *
 * Generates single-series and multi-series line charts.
 * Run with: oaf -f line.js
 */

var d = require("../d3svg.js")

// ── Single-series line chart ──────────────────────────────────────────────────

var temperatureData = []
for (var i = 0; i <= 12; i++) {
  temperatureData.push({ month: i, temp: 10 + 15 * Math.sin((i / 12) * 2 * Math.PI) + Math.random() * 3 })
}

var singleSVG = d.lineChart(temperatureData, {
  width : 640,
  height: 400,
  x     : { field: "month", label: "Month" },
  y     : { field: "temp",  label: "Temperature (°C)" },
  title : "Monthly Temperature",
  curve : "monotone",
  showDots: true,
  showGrid: true
})

io.writeFileString("line_single.svg", singleSVG)
print("Written: line_single.svg")

// ── Multi-series line chart ───────────────────────────────────────────────────

var multiSeries = [
  {
    name  : "Product A",
    values: [
      { x: 1, y: 30 }, { x: 2, y: 45 }, { x: 3, y: 38 },
      { x: 4, y: 52 }, { x: 5, y: 60 }, { x: 6, y: 55 }
    ]
  },
  {
    name  : "Product B",
    values: [
      { x: 1, y: 20 }, { x: 2, y: 28 }, { x: 3, y: 35 },
      { x: 4, y: 30 }, { x: 5, y: 40 }, { x: 6, y: 48 }
    ]
  },
  {
    name  : "Product C",
    values: [
      { x: 1, y: 10 }, { x: 2, y: 15 }, { x: 3, y: 12 },
      { x: 4, y: 18 }, { x: 5, y: 22 }, { x: 6, y: 25 }
    ]
  }
]

var multiSVG = d.lineChart(multiSeries, {
  width      : 680,
  height     : 440,
  x          : { label: "Quarter" },
  y          : { label: "Units sold" },
  title      : "Product Sales Comparison",
  curve      : "monotone",
  showGrid   : true,
  showDots   : true,
  showLegend : true
})

io.writeFileString("line_multi.svg", multiSVG)
print("Written: line_multi.svg")

// ── Minimal theme line chart ──────────────────────────────────────────────────

var trendData = []
for (var j = 0; j <= 20; j++) {
  trendData.push({ x: j, y: Math.pow(j, 1.5) / 5 })
}

var minimalSVG = d.lineChart(trendData, {
  width   : 600,
  height  : 380,
  title   : "Growth curve",
  theme   : "minimal",
  curve   : "monotone",
  showDots: false
})

io.writeFileString("line_minimal.svg", minimalSVG)
print("Written: line_minimal.svg")
