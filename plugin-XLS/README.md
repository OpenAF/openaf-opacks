# plugin-XLS oPack

OpenAF plugin exposing Apache POI to create, read, and manipulate Excel workbooks. It bundles all required POI components
(`poi`, `poi-ooxml`, `xmlbeans`, etc.) along with convenience helpers packaged as an OpenAF plugin.

## Installation

```bash
opack install plugin-XLS
```

## Example

```javascript
plugin("XLS");
var xls = new XLS();
var workbook = xls.open("template.xlsx");
workbook.setValue("Sheet1", 1, 1, "Hello from OpenAF!");
workbook.saveAs("output.xlsx");
```

Use the plugin to automate report generation, spreadsheet ingestion, or XLSX transformations without having to manage POI
manually.

## Dependency refresh (2026-10-09)

The 20261009 package retains Apache POI 5.5.1, updates XMLBeans to 5.4.1,
and rebuilds the XLS/DOC plugin against the refreshed bundle.

## Dependency refresh (2026-11-02)

The 20261102 package updates all bundled Apache POI components to 6.0.0,
retains XMLBeans 5.4.1 and Log4j 2.26.1, and includes Ant 1.10.18 for
POI ExcelAnt. The full OOXML schema JAR supplies the schemas; the redundant
`poi-ooxml-lite` JAR is omitted. Dependencies supplied by OpenAF are pruned.

The XLS/DOC plugin is rebuilt for Java 21. DOC's hex conversion now uses the
JDK's `HexFormat`, removing its dependency on the legacy `javax.xml.bind` API.
POI 6.0.0 also changes `DataFormatter` to use cached formula values by default
and removes deprecated APIs; see the [POI release notes](https://poi.apache.org/changes.html).
