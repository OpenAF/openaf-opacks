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
