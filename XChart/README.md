# XChart

An OpenAF wrapper for the **[Knowm XChart](https://knowm.org/open-source/xchart/)** Java library. XChart is a light-weight Java library for plotting data. This opack makes it easy to generate beautiful, highly customizable charts, save them to PNG, or encode them as Base64 strings for inline embedding in HTML reports, emails, or markdown.

## Installation

```bash
opack install XChart
```

## Quick Start

Create a chart and save it as a PNG image:

```javascript
// Load the XChart opack
load("xchart.js");

// Initialize a new category chart
var chart = new XChart({
   title: "Monthly Sales Trend",
   xAxis: "Month",
   yAxis: "Sales ($)",
   x    : 800, // Width in pixels (default: 640)
   y    : 480, // Height in pixels (default: 480)
   series: [
      {
         name: "Sales",
         x: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
         y: [450, 680, 520, 910, 840, 1100]
      }
   ]
});

// Save to a PNG file
chart.savePNG("sales_trend.png");
```

---

## API Reference

### `new XChart(options)`

Constructs a new `CategoryChart` based on the provided configuration options.

#### Options Object Properties:

| Property | Type | Default | Description |
|---|---|---|---|
| `x` | `Number` | `640` | Width of the chart image in pixels. |
| `y` | `Number` | `480` | Height of the chart image in pixels. |
| `title` | `String` | `"Chart"` | The main title of the chart. |
| `xAxis` | `String` | `"X"` | X-axis label text. |
| `yAxis` | `String` | `"Y"` | Y-axis label text. |
| `series` | `Array` | `[]` | An array of series data objects. See below for format. |

#### Series Object Format:
```javascript
{
   name: "Series Name", // Unique name of the series
   x: [1, 2, 3],        // Array of X-axis categories/coordinates (numbers or strings)
   y: [10, 15, 8]       // Array of Y-axis values
}
```

---

### Chart Customization & Styling

#### `.setSeriesRenderStyle(seriesName, styleName)`
Sets a specific series to render in a given style.
- `seriesName` (`String`): The name of the series (defined in `series` configuration).
- `styleName` (`String`): The rendering style. Available options (case-insensitive):
  - `"line"` - Standard line chart
  - `"area"` - Shaded area chart
  - `"bar"` - Vertical column bar chart
  - `"stick"` - Stick plot
  - `"scatter"` - Scatter plot (points only)
  - `"steppedbar"` - Stepped column bar chart

```javascript
chart.setSeriesRenderStyle("Sales", "bar");
```

#### `.setSeriesToArea(seriesName)`
Shortcut method to quickly set a series render style to `"area"`.
- `seriesName` (`String`): The name of the series.

---

### Data Management

#### `.addData(seriesName, xData, yData)`
Adds a new data series dynamically after initialization.
- `seriesName` (`String`): Unique name for the new series.
- `xData` (`Array`): X-axis coordinates/categories.
- `yData` (`Array`): Y-axis values.

```javascript
chart.addData("Target", ["Jan", "Feb", "Mar"], [500, 600, 700]);
```

#### `.updateData(seriesName, xData, yData, [errorData])`
Updates the data for an existing series.
- `seriesName` (`String`): Name of the series to update.
- `xData` (`Array`): New X data list.
- `yData` (`Array`): New Y data list.
- `errorData` (`Array`, optional): Optional error data list.

#### `.removeData(seriesName)`
Removes an existing series from the chart.
- `seriesName` (`String`): Name of the series to remove.

---

### Exporting & Rendering

#### `.savePNG(filePath)`
Saves the chart image as a PNG file.
- `filePath` (`String`): Path where the PNG image should be written.

#### `.getBytes()`
Returns the chart image as a raw Java byte array (`byte[]`) in PNG format.

#### `.getBase64()`
Returns the PNG chart image as a Base64-encoded string. Excellent for embedding directly into HTML documents or emails.

```javascript
var base64Data = chart.getBase64();
var imgTag = '<img src="data:image/png;base64,' + base64Data + '" />';
io.writeFileString("report.html", "<h1>Sales Summary</h1>" + imgTag);
```

---

### Advanced Customization

For complex layouts, custom themes, grid colors, font tweaks, or legends, you can access the underlying Java objects directly.

#### `.getStyler()`
Returns the underlying Java `CategoryStyler` object (`org.knowm.xchart.style.CategoryStyler`). This grants you full access to all styling properties of XChart.

```javascript
var styler = chart.getStyler();

// Customize legend placement
styler.setLegendPosition(Packages.org.knowm.xchart.style.Styler.LegendPosition.InsideNE);

// Enable data labels (annotations) on bars/points
styler.setHasAnnotations(true);

// Set custom colors for the chart elements
styler.setChartBackgroundColor(java.awt.Color.WHITE);
```

#### `.getXChart()`
Returns the raw Java `CategoryChart` instance (`org.knowm.xchart.CategoryChart`). Use this if you need to call low-level Java methods directly on the chart object.

---

## Example: Multi-Series Combo Chart

Combining multiple series styles in a single chart:

```javascript
load("xchart.js");

var chart = new XChart({
   title : "Company Performance",
   xAxis : "Quarter",
   yAxis : "Amount",
   x     : 800,
   y     : 500,
   series: [
      {
         name: "Revenue",
         x: ["Q1", "Q2", "Q3", "Q4"],
         y: [12000, 15000, 18000, 22000]
      },
      {
         name: "Expenses",
         x: ["Q1", "Q2", "Q3", "Q4"],
         y: [8000, 9500, 11000, 12500]
      }
   ]
});

// Render Revenue as columns/bars
chart.setSeriesRenderStyle("Revenue", "bar");

// Render Expenses as a line running across
chart.setSeriesRenderStyle("Expenses", "line");

// Advanced Styler adjustments
var styler = chart.getStyler();
styler.setPlotGridLinesColor(new java.awt.Color(0xE6E6E6));
styler.setLegendPosition(Packages.org.knowm.xchart.style.Styler.LegendPosition.OutsideE);

// Save results
chart.savePNG("quarterly_report.png");
```

---

## License

This opack is distributed under the same license as the main OpenAF opacks repository.
