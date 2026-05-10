/**
 * D3SVG sample — pie and donut charts
 *
 * Generates pie and donut chart SVGs.
 * Run with: oaf -f pie.js
 */

var d = require("../d3svg.js")

// ── Market share data ─────────────────────────────────────────────────────────

var marketShare = [
  { name: "Alpha Corp",  value: 35 },
  { name: "Beta Ltd",    value: 28 },
  { name: "Gamma Inc",   value: 20 },
  { name: "Delta Co",    value: 10 },
  { name: "Other",       value:  7 }
]

// ── Pie chart ─────────────────────────────────────────────────────────────────

var pieSVG = d.pieChart(marketShare, {
  width      : 520,
  height     : 520,
  label      : "name",
  value      : "value",
  title      : "Market Share",
  showLabels : true,
  showPercent: true,
  showLegend : true
})

io.writeFileString("pie_basic.svg", pieSVG)
print("Written: pie_basic.svg")

// ── Donut chart ───────────────────────────────────────────────────────────────

var donutSVG = d.pieChart(marketShare, {
  width      : 520,
  height     : 520,
  label      : "name",
  value      : "value",
  title      : "Market Share (donut)",
  donut      : true,
  donutRatio : 0.55,
  showLabels : true,
  showPercent: true,
  showLegend : true
})

io.writeFileString("pie_donut.svg", donutSVG)
print("Written: pie_donut.svg")

// ── Pie chart — dark theme, no labels ─────────────────────────────────────────

var darkPieSVG = d.pieChart(marketShare, {
  width      : 480,
  height     : 480,
  label      : "name",
  value      : "value",
  title      : "Market Share (dark)",
  theme      : "dark",
  donut      : true,
  donutRatio : 0.45,
  showLabels : false,
  showLegend : true
})

io.writeFileString("pie_dark.svg", darkPieSVG)
print("Written: pie_dark.svg")

// ── Budget breakdown ──────────────────────────────────────────────────────────

var budget = [
  { category: "R&D",       amount: 4200 },
  { category: "Marketing", amount: 1800 },
  { category: "Operations",amount: 3100 },
  { category: "Sales",     amount: 2200 },
  { category: "HR",        amount:  900 }
]

var budgetSVG = d.pieChart(budget, {
  width      : 520,
  height     : 520,
  label      : "category",
  value      : "amount",
  title      : "Budget Breakdown",
  donut      : true,
  showLegend : true,
  theme      : "minimal"
})

io.writeFileString("pie_budget.svg", budgetSVG)
print("Written: pie_budget.svg")
