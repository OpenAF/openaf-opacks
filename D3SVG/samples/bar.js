/**
 * D3SVG sample — bar chart
 *
 * Generates a vertical bar chart and a horizontal bar chart SVG.
 * Run with: oaf -f bar.js
 */

var d = require("../d3svg.js")

// ── Sample data ───────────────────────────────────────────────────────────────

var monthlySales = [
  { month: "Jan", sales: 120 },
  { month: "Feb", sales: 98  },
  { month: "Mar", sales: 145 },
  { month: "Apr", sales: 162 },
  { month: "May", sales: 134 },
  { month: "Jun", sales: 188 }
]

// ── Vertical bar chart ────────────────────────────────────────────────────────

var verticalSVG = d.barChart(monthlySales, {
  width    : 640,
  height   : 420,
  x        : { field: "month", label: "Month"  },
  y        : { field: "sales", label: "Sales"  },
  title    : "Monthly Sales",
  subtitle : "Jan – Jun",
  showGrid : true,
  showValues: true,
  barPadding: 0.25
})

io.writeFileString("bar_vertical.svg", verticalSVG)
print("Written: bar_vertical.svg")

// ── Horizontal bar chart ──────────────────────────────────────────────────────

var categories = [
  { product: "Widget A", revenue: 4500 },
  { product: "Widget B", revenue: 3200 },
  { product: "Widget C", revenue: 5100 },
  { product: "Widget D", revenue: 2800 },
  { product: "Widget E", revenue: 3900 }
]

var horizontalSVG = d.barChart(categories, {
  width      : 640,
  height     : 400,
  x          : { field: "product", label: "Product"  },
  y          : { field: "revenue", label: "Revenue ($)" },
  title      : "Revenue by Product",
  horizontal : true,
  theme      : "minimal",
  showGrid   : true
})

io.writeFileString("bar_horizontal.svg", horizontalSVG)
print("Written: bar_horizontal.svg")

// ── Dark theme bar chart ──────────────────────────────────────────────────────

var darkSVG = d.barChart(monthlySales, {
  width : 640,
  height: 420,
  x     : { field: "month", label: "Month" },
  y     : { field: "sales", label: "Sales" },
  title : "Monthly Sales (dark theme)",
  theme : "dark"
})

io.writeFileString("bar_dark.svg", darkSVG)
print("Written: bar_dark.svg")
