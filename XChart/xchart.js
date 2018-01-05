ow.loadFormat();
var OPACK_PATH = getOPackPaths()["XChart"] || ".";

af.externalAddClasspath((new java.io.File(OPACK_PATH + "/lib/xchart-3.5.0.jar")).toURL());

/**
 * <odoc>
 * <key>XChart.XChart(aJson) : XChart</key>
 * Creates a new XChart given the provided aJson definition. Do use getStyler and savePNG functions to customize it further
 * if needed. Check examples of the XChart library in http://knowm.org/open-source/xchart/.\
 * \
 * Example:\
 *    var xc = new XChart({ series: [ { name: "series1", x: [1, 2, 3, 4, 5], y: [1, 2, 3, 2, 1] } ] });\
 * \
 * </odoc>
 */
var XChart = function(aJson) {
   this.data = aJson;

   var x = (isDef(aJson.x) ? aJson.x : 640);
   var y = (isDef(aJson.y) ? aJson.y : 480);
   var title = (isDef(aJson.title) ? aJson.title : "Chart");
   var xAxis = (isDef(aJson.xAxis) ? aJson.xaxis : "X");
   var yAxis = (isDef(aJson.yAxis) ? aJson.yaxis : "Y");

   this.c = new Packages.org.knowm.xchart.CategoryChartBuilder().width(x).height(y).title(title).xAxisTitle(xAxis).yAxisTitle(yAxis).build();

   this.__addData();
};

XChart.prototype.__addData = function() {
   for(var i in this.data.series) {
      this.c.addSeries(this.data.series[i].name, this.data.series[i].x, this.data.series[i].y);
   }
};

/**
 * <odoc>
 * <key>XChart.setSeriesRenderStyle(aSeries, aStyle)</key>
 * Sets aSeries name to use aStyle on the chart. Available styles are: line, area, bar, stick, scatter and steppedbar.
 * </odoc>
 */
XChart.prototype.setSeriesRenderStyle = function(aSeries, aStyle) {
    switch(aStyle.toLowerCase()) {
    case "line"      : this.getXChart().getSeriesMap().get(aSeries).setChartCategorySeriesRenderStyle(Packages.org.knowm.xchart.CategorySeries.CategorySeriesRenderStyle.Line); break;
    case "area"      : this.getXChart().getSeriesMap().get(aSeries).setChartCategorySeriesRenderStyle(Packages.org.knowm.xchart.CategorySeries.CategorySeriesRenderStyle.Area); break;
    case "bar"       : this.getXChart().getSeriesMap().get(aSeries).setChartCategorySeriesRenderStyle(Packages.org.knowm.xchart.CategorySeries.CategorySeriesRenderStyle.Bar); break;
    case "stick"     : this.getXChart().getSeriesMap().get(aSeries).setChartCategorySeriesRenderStyle(Packages.org.knowm.xchart.CategorySeries.CategorySeriesRenderStyle.Stick); break;
    case "scatter"   : this.getXChart().getSeriesMap().get(aSeries).setChartCategorySeriesRenderStyle(Packages.org.knowm.xchart.CategorySeries.CategorySeriesRenderStyle.Scatter); break;
    case "steppedbar": this.getXChart().getSeriesMap().get(aSeries).setChartCategorySeriesRenderStyle(Packages.org.knowm.xchart.CategorySeries.CategorySeriesRenderStyle.SteppedBar); break;
    default: this.getXChart().getSeriesMap().get(aSeries).setChartCategorySeriesRenderStyle(Packages.org.knowm.xchart.CategorySeries.CategorySeriesRenderStyle.Line);
    }
};

XChart.prototype.setSeriesToArea = function(aSeries) {
    this.getXChart().getSeriesMap().get(aSeries).setChartCategorySeriesRenderStyle(Packages.org.knowm.xchart.CategorySeries.CategorySeriesRenderStyle.Area);
};

XChart.prototype.savePNG = function(aFile) {
   Packages.org.knowm.xchart.BitmapEncoder.saveBitmap(this.c, aFile, Packages.org.knowm.xchart.BitmapEncoder.BitmapFormat.PNG);
};

XChart.prototype.getBytes = function() {
   return Packages.org.knowm.xchart.BitmapEncoder.getBitmapBytes(this.c, Packages.org.knowm.xchart.BitmapEncoder.BitmapFormat.PNG);
};

XChart.prototype.getBase64 = function() {
   return af.fromBytes2String(af.toBase64Bytes(af.fromArray2Bytes(af.fromBytes2Array(this.getBytes())))); 
};

XChart.prototype.getStyler = function() {
   return this.c.getStyler();
};

XChart.prototype.getXChart = function() {
   return this.c;
};

XChart.prototype.updateData = function(aSeries, aXData, aYData, aErrorData) {
   this.c["updateCategorySeries(java.lang.String,java.util.List,java.util.List,java.util.List)"](aSeries, aXData, aYData, aErrorData);
   return this;
};

XChart.prototype.addData = function(aSeries, aXData, aYData) {
   this.c.addSeries(aSeries, aXData, aYData);
   return this;
};

XChart.prototype.removeData = function(aSeries) {
   this.c.removeSeries(aSeries);
   return this;
};