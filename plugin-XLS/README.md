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
