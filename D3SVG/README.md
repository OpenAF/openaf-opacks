# D3SVG

Server-side SVG chart and diagram generation for OpenAF, inspired by [d3.js](https://d3js.org/).

Generates **standalone SVG** with no browser DOM dependency — output is compatible with **JSVG** for rendering charts, diagrams, and infographics inside OpenAF scripts and pipelines.

## Installation

```bash
opack install D3SVG
```

## Quick start

```javascript
var d = require("d3svg.js")

var svg = d.barChart([
  { category: "A", value: 10 },
  { category: "B", value: 25 },
  { category: "C", value: 18 }
], {
  width : 600,
  height: 400,
  title : "Example bar chart"
})

io.writeFileString("bar.svg", svg)
```

---

## API reference

### `D3SVG.SVG(opts)`

Low-level SVG document builder. Returns an object with chainable helpers.

**Options:**

| Option  | Type   | Default                     | Description                   |
|---------|--------|-----------------------------|-------------------------------|
| width   | Number | 800                         | SVG width in pixels           |
| height  | Number | 400                         | SVG height in pixels          |
| viewBox | String | `"0 0 {width} {height}"`   | SVG viewBox attribute         |
| title   | String | `""`                        | `<title>` element content     |
| desc    | String | `""`                        | `<desc>` element content      |

**Methods:**

```javascript
var d   = require("d3svg.js")
var svg = new d.SVG({ width: 400, height: 300, title: "My chart" })

svg.addRaw('<circle cx="200" cy="150" r="50" fill="steelblue"/>')
svg.rect({ x: 10, y: 10, width: 80, height: 40, fill: "#4e79a7" })
svg.circle({ cx: 50, cy: 50, r: 20, fill: "red" })
svg.line({ x1: 0, y1: 0, x2: 100, y2: 100, stroke: "#333" })
svg.path({ d: "M 0 0 L 100 100", fill: "none", stroke: "blue" })
svg.text({ x: 20, y: 50, "text-anchor": "middle" }, "Hello SVG")
svg.addDef('<marker id="arrow" ...>...</marker>')

var output = svg.toString()  // returns SVG string
```

---

### `D3SVG.scaleLinear()`

Creates a continuous linear scale mapping a numeric domain to a range.

```javascript
var d = require("d3svg.js")

var x = d.scaleLinear()
  .domain([0, 100])
  .range([0, 500])

x(50)        // → 250
x.ticks(5)   // → [0, 25, 50, 75, 100]
x.nice()     // rounds domain to nice values, returns scale
```

---

### `D3SVG.scaleBand()`

Creates an ordinal/band scale for categorical data (bar charts).

```javascript
var d = require("d3svg.js")

var x = d.scaleBand()
  .domain(["A", "B", "C"])
  .range([0, 300])
  .padding(0.2)

x("A")           // → start position of band A
x.bandwidth()    // → width of each band
x.step()         // → step between band starts
```

---

### `D3SVG.axisBottom(scale, opts)` / `D3SVG.axisLeft(scale, opts)`

Renders an axis as an SVG string intended to be placed inside a `<g>` group.

**Options:**

| Option     | Type     | Default       | Description                  |
|------------|----------|---------------|------------------------------|
| tickCount  | Number   | 5             | Approximate number of ticks  |
| tickSize   | Number   | 6             | Length of tick lines (px)    |
| tickPad    | Number   | 3             | Padding between tick and label|
| label      | String   | `""`          | Axis label text              |
| fontSize   | Number   | 11            | Label font size              |
| fontFamily | String   | `sans-serif`  | Label font family            |
| color      | String   | `#333`        | Axis and tick color          |
| tickFormat | Function | default       | Custom tick label formatter  |

```javascript
var d = require("d3svg.js")

var yScale = d.scaleLinear().domain([0, 100]).range([400, 0])
var axisMarkup = d.axisLeft(yScale, { label: "Value", tickCount: 5 })
```

---

### `D3SVG.linePath(points, opts)` / `D3SVG.arcPath(opts)`

Low-level path generators.

```javascript
var d = require("d3svg.js")

// Line path from array of {x, y} points
var path = d.linePath([{x:0,y:0},{x:100,y:50},{x:200,y:25}])
// or from [x, y] arrays
var path = d.linePath([[0,0],[100,50],[200,25]], { curve: "monotone" })

// Arc path (slice of a circle, or full donut ring)
var arc = d.arcPath({ cx: 200, cy: 200, r: 100, innerRadius: 50,
                      startAngle: 0, endAngle: Math.PI })
```

---

### `D3SVG.barChart(data, opts)`

Generates a vertical (or horizontal) bar chart.

**Data format:**
```javascript
[{ category: "A", value: 10 }, { category: "B", value: 25 }, ...]
```

**Options:**

| Option      | Type    | Default                          | Description                         |
|-------------|---------|----------------------------------|-------------------------------------|
| width       | Number  | 600                              | SVG width                           |
| height      | Number  | 400                              | SVG height                          |
| margin      | Object  | `{top:40,right:20,bottom:60,left:60}` | Chart margins                 |
| x.field     | String  | `"category"`                     | Data field for X axis categories    |
| y.field     | String  | `"value"`                        | Data field for Y axis values        |
| x.label     | String  | `""`                             | X axis label                        |
| y.label     | String  | `""`                             | Y axis label                        |
| title       | String  | `""`                             | Chart title                         |
| subtitle    | String  | `""`                             | Chart subtitle                      |
| theme       | String  | `"default"`                      | Theme name: `default`, `dark`, `minimal` |
| colors      | Array   | theme colors                     | Override bar colors                 |
| tickCount   | Number  | 5                                | Y axis tick count                   |
| showGrid    | Boolean | `true`                           | Show horizontal grid lines          |
| showValues  | Boolean | `false`                          | Show value labels above bars        |
| barPadding  | Number  | 0.2                              | Band scale padding (0–1)            |
| horizontal  | Boolean | `false`                          | Render as horizontal bar chart      |

```javascript
var d = require("d3svg.js")

var svg = d.barChart([
  { category: "Jan", value: 120 },
  { category: "Feb", value: 98  },
  { category: "Mar", value: 145 }
], {
  width   : 600,
  height  : 400,
  x       : { field: "category", label: "Month" },
  y       : { field: "value",    label: "Sales" },
  title   : "Monthly Sales",
  showGrid: true
})

io.writeFileString("sales.svg", svg)
```

---

### `D3SVG.lineChart(data, opts)`

Generates a line chart from a single series or multiple series.

**Data formats:**

Single series (flat array):
```javascript
[{ x: 0, y: 10 }, { x: 1, y: 20 }, { x: 2, y: 15 }]
```

Multiple series:
```javascript
[
  { name: "Series A", values: [{ x: 0, y: 10 }, ...] },
  { name: "Series B", values: [{ x: 0, y: 20 }, ...] }
]
```

**Options:**

| Option      | Type    | Default                          | Description                          |
|-------------|---------|----------------------------------|--------------------------------------|
| width       | Number  | 600                              | SVG width                            |
| height      | Number  | 400                              | SVG height                           |
| margin      | Object  | `{top:40,right:20,bottom:60,left:60}` | Chart margins                  |
| x.field     | String  | `"x"`                            | X value field name                   |
| y.field     | String  | `"y"`                            | Y value field name                   |
| x.label     | String  | `""`                             | X axis label                         |
| y.label     | String  | `""`                             | Y axis label                         |
| title       | String  | `""`                             | Chart title                          |
| theme       | String  | `"default"`                      | Theme name                           |
| colors      | Array   | theme colors                     | Override line colors                 |
| curve       | String  | `"linear"`                       | `"linear"` or `"monotone"`           |
| showGrid    | Boolean | `true`                           | Show horizontal grid lines           |
| showDots    | Boolean | `true`                           | Show data point circles              |
| showLegend  | Boolean | `false`                          | Show series legend                   |

```javascript
var d = require("d3svg.js")

var svg = d.lineChart([
  { x: 0, y: 10 },
  { x: 1, y: 23 },
  { x: 2, y: 17 },
  { x: 3, y: 40 }
], {
  width : 600,
  height: 400,
  title : "Trend over time",
  curve : "monotone"
})

io.writeFileString("trend.svg", svg)
```

---

### `D3SVG.pieChart(data, opts)`

Generates a pie or donut chart.

**Data format:**
```javascript
[{ name: "Alpha", value: 40 }, { name: "Beta", value: 30 }, ...]
```

**Options:**

| Option      | Type    | Default    | Description                               |
|-------------|---------|------------|-------------------------------------------|
| width       | Number  | 500        | SVG width                                 |
| height      | Number  | 500        | SVG height                                |
| label       | String  | `"name"`   | Data field for slice labels               |
| value       | String  | `"value"`  | Data field for slice values               |
| donut       | Boolean | `false`    | Render as a donut chart                   |
| donutRatio  | Number  | 0.5        | Ratio of inner to outer radius (0–1)      |
| title       | String  | `""`       | Chart title                               |
| theme       | String  | `"default"`| Theme name                                |
| colors      | Array   | theme colors| Override slice colors                    |
| showLabels  | Boolean | `true`     | Show percentage/label inside slices       |
| showPercent | Boolean | `true`     | Show percentage in labels                 |
| showLegend  | Boolean | `false`    | Show legend beside chart                  |

```javascript
var d = require("d3svg.js")

var svg = d.pieChart([
  { name: "Alpha", value: 40 },
  { name: "Beta",  value: 30 },
  { name: "Gamma", value: 20 },
  { name: "Delta", value: 10 }
], {
  width      : 500,
  height     : 500,
  title      : "Market Share",
  donut      : true,
  showLegend : true
})

io.writeFileString("market.svg", svg)
```

---

### `D3SVG.getTheme(name)`

Returns a copy of a built-in theme object. Available themes: `"default"`, `"dark"`, `"minimal"`.

```javascript
var d     = require("d3svg.js")
var theme = d.getTheme("dark")
// { background, gridColor, axisColor, textColor, fontFamily, fontSize, titleSize, colors }
```

---

## Themes

| Theme     | Description                                      |
|-----------|--------------------------------------------------|
| `default` | White background, Tableau-inspired color palette |
| `dark`    | Dark (Catppuccin-inspired) background            |
| `minimal` | Clean white, muted matplotlib-inspired palette   |

---

## JSVG compatibility

This opack targets **JSVG-safe SVG**:

- Output SVG always includes `xmlns`, `width`, `height`, and `viewBox`.
- Styling uses **presentation attributes** (e.g., `fill`, `stroke`, `font-size`) rather than CSS `<style>` blocks.
- No `<script>`, `<foreignObject>`, or browser-dependent CSS features are used.
- Font stacks use safe generic families (`sans-serif`).
- IDs in `<defs>` are generated deterministically.
- Animations and transitions are not included.

### Known limitations

- Text measurement is approximated (no actual font metrics). Label overflow may occur with very long category names.
- Complex SVG filters (blur, drop-shadow) are not generated.
- Font rendering differences between JSVG and browser SVG renderers may affect text alignment.
- The `dominant-baseline` attribute (used for pie chart labels) may not be supported in all JSVG versions; adjust `y` manually if needed.

---

## Examples

See the `samples/` directory for runnable scripts:

- `samples/bar.js` — bar and horizontal bar chart
- `samples/line.js` — line chart (single and multi-series)
- `samples/pie.js`  — pie and donut chart

---

## License

Same as the [openaf-opacks repository](https://github.com/OpenAF/openaf-opacks/blob/master/LICENSE).
