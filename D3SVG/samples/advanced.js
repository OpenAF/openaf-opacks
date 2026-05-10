/**
 * D3SVG advanced samples — new chart types, diagrams and infographics
 *
 * Covers: areaChart, stackedBarChart, scatterPlot, heatmap, sparkline,
 *         gauge, progressBar, kpiCard, bulletChart, timeline
 *
 * Run with: oaf -f advanced.js
 */

var d = require("../d3svg.js")

// ── Area chart ────────────────────────────────────────────────────────────────

var revData = [
  { month: 0, revenue: 5  }, { month: 1, revenue: 12 }, { month: 2, revenue: 8  },
  { month: 3, revenue: 20 }, { month: 4, revenue: 15 }, { month: 5, revenue: 25 },
  { month: 6, revenue: 18 }, { month: 7, revenue: 30 }, { month: 8, revenue: 28 },
  { month: 9, revenue: 38 }, { month:10, revenue: 35 }, { month:11, revenue: 45 }
]

io.writeFileString("area.svg", d.areaChart(revData, {
  width : 620,
  height: 360,
  x     : { field: "month",   label: "Month" },
  y     : { field: "revenue", label: "Revenue ($k)" },
  title : "Annual Revenue Trend",
  curve : "monotone",
  fillOpacity: 0.3,
  showDots: false,
  showGrid: true
}))
print("Written: area.svg")

// Multi-series area
io.writeFileString("area_multi.svg", d.areaChart([
  { name: "Actual",  values: [ {x:0,y:5},{x:1,y:12},{x:2,y:8},{x:3,y:20},{x:4,y:15},{x:5,y:25} ] },
  { name: "Target",  values: [ {x:0,y:8},{x:1,y:14},{x:2,y:12},{x:3,y:22},{x:4,y:18},{x:5,y:28} ] }
], {
  width: 620, height: 360, title: "Actual vs Target Revenue",
  showLegend: true, curve: "monotone", fillOpacity: 0.2
}))
print("Written: area_multi.svg")

// ── Stacked bar chart ─────────────────────────────────────────────────────────

io.writeFileString("stacked_bar.svg", d.stackedBarChart([
  { quarter: "Q1", dev: 45, qa: 20, ops: 15, design: 10 },
  { quarter: "Q2", dev: 52, qa: 18, ops: 22, design: 12 },
  { quarter: "Q3", dev: 60, qa: 25, ops: 18, design: 15 },
  { quarter: "Q4", dev: 55, qa: 30, ops: 20, design: 18 }
], {
  category: "quarter",
  series  : [
    { key: "dev",    label: "Engineering" },
    { key: "qa",     label: "QA" },
    { key: "ops",    label: "Operations" },
    { key: "design", label: "Design" }
  ],
  title      : "Team Effort by Quarter",
  width      : 600,
  height     : 380,
  showLegend : true,
  showGrid   : true,
  y          : { label: "Story Points" }
}))
print("Written: stacked_bar.svg")

// ── Scatter plot ──────────────────────────────────────────────────────────────

io.writeFileString("scatter.svg", d.scatterPlot([
  { x: 10, y: 20, label: "A" }, { x: 30, y: 5,  label: "B" },
  { x: 15, y: 35, label: "C" }, { x: 45, y: 28, label: "D" },
  { x: 28, y: 42, label: "E" }, { x: 52, y: 15, label: "F" },
  { x: 35, y: 50, label: "G" }, { x: 60, y: 22, label: "H" }
], {
  width      : 560,
  height     : 380,
  title      : "Height vs Weight Distribution",
  showGrid   : true,
  showLabels : true,
  dotRadius  : 7,
  x          : { label: "Height (cm)" },
  y          : { label: "Weight (kg)" }
}))
print("Written: scatter.svg")

// Multi-series scatter
io.writeFileString("scatter_groups.svg", d.scatterPlot([
  { name: "Group A", values: [ {x:5,y:10},{x:10,y:8},{x:15,y:12},{x:8,y:16} ] },
  { name: "Group B", values: [ {x:30,y:5},{x:35,y:8},{x:28,y:12},{x:40,y:6} ] },
  { name: "Group C", values: [ {x:20,y:25},{x:25,y:30},{x:18,y:22},{x:28,y:28} ] }
], { width: 560, height: 380, title: "Cluster Analysis", showLegend: true }))
print("Written: scatter_groups.svg")

// ── Heatmap ───────────────────────────────────────────────────────────────────

var heatData = []
var days   = ["Mon", "Tue", "Wed", "Thu", "Fri"]
var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
// Use deterministic values for reproducibility
var vals = [
  [10, 25, 42, 38, 55, 60], [20, 35, 28, 50, 45, 72],
  [15, 48, 60, 55, 68, 80], [5,  18, 32, 42, 38, 55],
  [30, 42, 55, 48, 72, 88]
]
days.forEach(function(day, di) {
  months.forEach(function(mo, mi) {
    heatData.push({ day: day, month: mo, commits: vals[di][mi] })
  })
})

io.writeFileString("heatmap.svg", d.heatmap(heatData, {
  width     : 540,
  height    : 320,
  row       : "day",
  col       : "month",
  value     : "commits",
  title     : "Commit Activity",
  showValues: true,
  colorLow  : "#eaf3fb",
  colorHigh : "#1a5276",
  x         : { label: "Month" }
}))
print("Written: heatmap.svg")

// ── Sparklines ────────────────────────────────────────────────────────────────

io.writeFileString("sparkline.svg", d.sparkline([3, 8, 5, 12, 7, 15, 10, 18, 14, 20], {
  width   : 160,
  height  : 55,
  showArea: true
}))
print("Written: sparkline.svg")

io.writeFileString("sparkline_flat.svg", d.sparkline([5, 5, 5, 5, 5], {
  width: 120, height: 40
}))
print("Written: sparkline_flat.svg (flat line edge case)")

// ── Gauge ─────────────────────────────────────────────────────────────────────

io.writeFileString("gauge.svg", d.gauge(72, {
  width      : 340,
  height     : 220,
  min        : 0,
  max        : 100,
  title      : "Performance Score",
  unit       : "%",
  showNeedle : true,
  showValue  : true,
  showMinMax : true,
  thresholds : [
    { value: 0,  color: "#e74c3c" },
    { value: 40, color: "#f39c12" },
    { value: 70, color: "#27ae60" }
  ]
}))
print("Written: gauge.svg")

io.writeFileString("gauge_dark.svg", d.gauge(45, {
  width : 320, height: 210, min: 0, max: 200,
  title : "Temperature", unit: "°C", theme: "dark",
  thresholds: [{ value:0,color:'#89b4fa'},{ value:100,color:'#fab387'},{ value:150,color:'#f38ba8'}]
}))
print("Written: gauge_dark.svg")

// ── Progress bar ──────────────────────────────────────────────────────────────

io.writeFileString("progress_single.svg", d.progressBar(72, {
  width : 420,
  title : "Download Progress",
  color : "#3498db"
}))
print("Written: progress_single.svg")

io.writeFileString("progress_multi.svg", d.progressBar([
  { label: "Frontend",   value: 85, color: "#3498db" },
  { label: "Backend",    value: 62, color: "#9b59b6" },
  { label: "Testing",    value: 45, color: "#e67e22" },
  { label: "Docs",       value: 30, color: "#1abc9c" }
], {
  width : 460,
  height: 230,
  title : "Project Completion"
}))
print("Written: progress_multi.svg")

// ── KPI cards ─────────────────────────────────────────────────────────────────

io.writeFileString("kpi.svg", d.kpiCard([
  { label: "Revenue",   value: "$2.4M", change: 18.5  },
  { label: "Users",     value: "48.2K", change: -2.1  },
  { label: "Uptime",    value: "99.9%", change:  0.1  },
  { label: "NPS Score", value: 72,      change:  5.3  }
], { width: 580, height: 135, cols: 4 }))
print("Written: kpi.svg")

io.writeFileString("kpi_dark.svg", d.kpiCard([
  { label: "CPU Usage",  value: "38%",  change: -5  },
  { label: "Memory",     value: "64%",  change:  3  },
  { label: "Disk I/O",   value: "120",  change: 12  }
], { width: 480, height: 135, cols: 3, theme: "dark" }))
print("Written: kpi_dark.svg")

// ── Bullet chart ──────────────────────────────────────────────────────────────

io.writeFileString("bullet.svg", d.bulletChart([
  {
    label : "Revenue",
    value : 220,
    target: 240,
    ranges: [
      { value: 150, color: "#fad7a0" },
      { value: 225, color: "#fef9e7" },
      { value: 300, color: "#eafaf1" }
    ]
  },
  {
    label : "Profit",
    value : 55,
    target: 70,
    ranges: [
      { value: 40, color: "#fadbd8" },
      { value: 65, color: "#fef9e7" },
      { value: 90, color: "#eafaf1" }
    ]
  },
  {
    label : "Orders",
    value : 180,
    target: 200,
    ranges: [
      { value: 120, color: "#d6eaf8" },
      { value: 185, color: "#eaf8ff" },
      { value: 240, color: "#eafaf1" }
    ]
  }
], {
  title      : "Sales Performance vs Target",
  width      : 560,
  height     : 210,
  showValues : true
}))
print("Written: bullet.svg")

// ── Timeline ──────────────────────────────────────────────────────────────────

io.writeFileString("timeline.svg", d.timeline([
  { label: "Kick-off", date: "Jan 2024", color: "#3498db" },
  { label: "Alpha",    date: "Mar 2024", color: "#9b59b6" },
  { label: "Beta",     date: "Jun 2024", color: "#f39c12" },
  { label: "RC",       date: "Sep 2024", color: "#e74c3c" },
  { label: "GA",       date: "Dec 2024", color: "#27ae60" }
], {
  width     : 660,
  height    : 190,
  title     : "Product Roadmap 2024",
  labelAbove: true
}))
print("Written: timeline.svg")
