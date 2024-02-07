# OpenAF processor
    
**Usage**: _oafp [file] [options]_

Takes an input, usually a data structure such as json, and transforms it to an equivalent data structure in another format or visualization. The output data can be filtered through JMESPath, SQL or OpenAF's nLinq and provided transformers can also be applied to it.

> If a _file_ or _file=somefile_ or _file=zipfile::somefile_ is not provided the input will be expected to be provided through stdin/pipe.
> Options are expected to be provided as _option=value_. Check the lists below for all the available options.

## Main options:

| Option | Description | 
|--------|-------------|
| -h     | Show this document |
| help   | Alternative way to show this document or others (e.g. filters, template) |
| file   | The file to parse (if not provide stdin is used) |
| cmd    | Alternative to file and stdin to execute a command (e.g. kubectl, docker) to get the file contents |
| output | The output format (default: ctree) |
| input  | The input type (if not provided it will try to be auto-detected) |
| from   | An OpenAF nLinq path expression to filter output |
| sql    | A SQL expression to filter output |
| path   | A JMESPath expression to filter output |
| csv    | If type=csv, the CSV options to use | 
| outputkey | If defined the map/list output will be prefix with the provided key |
| pause  | If 'true' will try to pause contents in alternative to _less -r_ |
| -v     | Changes the input to a map with the tool's version info |
| version | Alternative way to change the input to a map with the tool's version |

> Filter options apply in the following order: _path_, _from_ and _sql_.

> For _path_ syntax check https://jmespath.org/tutorial.html

---

## ⬇️  Input types

List of data input types that can be auto-detected (through the file extension or through it's contents). You can always override it be using the _input_ option:

| Input type   | Description |
|---------|-------------|
| json    | A JSON format (auto-detected) |
| yaml    | A YAML format (auto-detected) |
| xml     | An XML format (auto-detected) |
| csv     | A CSV format (auto-detected) |
| ndjson  | A NDJSON format |
| hsperf  | A Java hsperfdata* file (requires file=hsperfdata_user/123) |
| base64  | A base64 text format |
| md      | A Markdown format |
| mdtable | A Markdown table format |
| sql     | One or more SQLs statements to AST (Abstract Syntax Tree) |
| ini     | INI/Properties format |
| xls     | A XLSx compatible file (requires file=abc.xlsx) |

---

## 🚜 Optional transforms:

These options will change the parsed input data included any filters provided.

| Option | Type | Description |
|--------|------|-------------|
| sortmapkeys | Boolean | If true the resulting map keys will be sorted |
| searchkeys | String | Will return a map with only keys that match the provided string |
| searchvalues | String | Will return am map with only values that match the provided string |
| arraytomap | Boolean | If true will try to convert the input array to a map (see arraytomapkey, arraytomapkeepkey) |
| arraytomapkey | String | For arraytomap=true defines the name of the map property that will be each element key (see arraytomapkeepkey) |
| arraytomapkeepkey | Boolean | If true and arraytomap=true the defined arraytomapkey won't be removed from each map |
| maptoarray | Boolean | If true will try to convert the input map to an array (see maptoarraykey) |
| maptoarraykey | String | If maptoarray=true defines the name of the map property that will hold the key for each map in the new array |
| flatmap | Boolean | If true a map structure will be flat to just one level |
| correcttypes | Boolean | If true will try to convert alpha-numeric field values with just numbers to number fields, string date fields to dates and boolean fields |
| removenulls | Boolean | If true will try to remove nulls and undefined values from a map or array |
| sqlfilter | String | Enables the forcing of the sql filter parser (values: auto, simple, advanced) |
| merge | Boolean | If input is a list/array of maps will merge each element into one map |

---

## ⬆️  Output formats

List of available formats to use with the _output_ option:

| Output format | Description |
|----------|-------------|
| ctree    | A tree-like forcely colored format |
| cjson    | A JSON forcely colored format |
| ctable   | A table-like forcely colored format (only for list outputs) |
| tree     | A tree-like format |
| json     | A JSON format without spacing |
| pjson    | A JSON format with spacing (equivalent to prettyjson) |
| prettyjson | A JSON format with spacing |
| yaml     | A YAML format |
| mdyaml   | A multi document YAML format (only for list outputs) |
| stable   | A table-like format with separation (only for list outputs) |
| table    | A table-like format without size constraints (only for list outputs) |
| xml      | An XML format |
| ndjson   | A NDJSON format |
| cslon    | A SLON format forcely colored |
| slon     | A SLON format |
| csv      | A CSV format (only for list outputs) |
| map      | A rectangle map format |
| html     | An HTML format |
| md       | A Markdown format |
| mdtable  | A Markdown table format (only for list outputs) |
| openmetrics | Converts a map or list to OpenMetrics format |
| base64   | A base64 text format | 
| ini      | A INI/Properties format (arrays are not supported) |
| xls      | A XLSx output format |
| template | A Handlebars template format (requires template=someTemplate.hbs) |
| log      | If input has Logstash compatible fields outputs a human-readable log |
| raw      | Tries to output the internal representation (string or json) of the input transformed data |

> For 'template' check https://github.com/OpenAF/openaf-opacks/blob/master/oafproc/docs/TEMPLATE.md

---

## 🧾 ndJSON input options

List of options to use when _input=ndjson_:

| Option | Type | Description |
|--------|------|-------------|
| ndjsonjoin | Boolean | If true will join the ndjson records to build an output array |
| ndjsonfilter | Boolean | If true each line is interpreted as an array before filters execute (this allows to filter json records on a ndjson) |

---

## 🧾 XLS input options

List of options to use when _input=xls_:

| Option | Type | Description |
|--------|------|-------------|
| xlssheet | String | The name of sheet to consider (default to the first sheet) |
| xlsevalformulas | Boolean | If false the existing formulas won't be evaluated (defaults to true) |
| xlscol | String | The column on the sheet where a table should be detected (e.g. "A") |
| xlsrow | Number | The row on the sheet where a table should be detected (e.g. 1) |

---

## 🧾 CSV input/output options

List of options to use with the _inputcsv_ input option (when input type=csv) and/or the _csv_ output option (when output=csv). Both expect the corresponding options to be provided in single JSON or SLON value (see below for example):

| Option | Type | Description |
|--------|------|-------------|
| format | String | You can choose between DEFAULT, EXCEL, INFORMIX_UNLOAD, INFORMIX_UNLOAD_CSV, MYSQL, RFC4180, ORACLE, POSTGRESQL_CSV, POSTGRESQL_TEXT and TDF |
| withHeader | Boolean | If true tries to automatically use the available header |
| withHeaders | Array | A list of headers to use with the corresponding order |
| quoteMode | String | You can choose between ALL, ALL_NON_NULL, MINIMAL, NON_NUMERIC and NONE. |
| withDelimiter | String | A single character as a custom delimiter  |
| withEscape | String | A single character as a custom escape |
| withNullString | String | String to use as representation of null values |

> Example of options provided in JSON: csv="{withHeader:false,withDelimiter:'|'}"
> Example of options provided in SLON: inputcsv="(withHeader: false, quoteMode: ALL)"

---

## 🧾 Base64 input/output options

List of options to use when _input=base64_ or _output=base64_:

| Option | Type | Description |
|--------|------|-------------|
| base64gzip | Boolean | If true the contents will thet gzip/gunzip respectively to reduce the size of the base64 output |

---

## 🧾 Log output options

List of options to use when _output=log_:

| Option | Type | Description |
|--------|------|-------------|
| logprintall | Boolean | If true all original non data (string) lines will be output |

---

## 🧾 XLS output options

List of options to use when _output=xls_:

| Option | Type | Description |
|--------|------|-------------|
| xlsfile | String | The output filename (if not defined a temporary file will be used to open with the OS's Excel-compatible application) |
| xlssheet | String | The name of sheet to use (default to 'data') |
| xlsformat | String | A SLON or JSON string with the formatting of the output file (e.g. (bold: true, borderBottom: "medium", borderBottomColor: "red")) |
| xlsopen | Boolean | If false it won't try to open the OS's Excel-compatible application (defaults to true) |
| xlsopenwait | Number | The amount of time, in ms, to keep the temporary file for the OS's Excel-compatible application to start and open the file |

---


## 🧾 OpenMetrics output options

List of options to use when _output=openmetrics_:

| Option | Type | Description |
|--------|------|-------------|
| metricsprefix | String | The prefix to use for each metric (defaults to 'metrics') |
| metricstimestamp | Number | Unix Epoch in seconds for each metric |

---

## 🧾 XML output options

List of options to use when _output=xml_:

| Option | Type | Description |
|--------|------|-------------|
| xmlignored | String | A comma-separated list of XML tags to ignore |
| xmlprefix | String | A prefix to add to all XML tags |
| xmlfiltertag | Boolean | If true will filter the XML tags |

---

## 📝 Examples

```bash
# simple processing through pipe
cat someJsonFile.json | oafp

# simple processing through pipe with scrolling
cat someJsonFile.json | oafp output=ctree | less -r

# specifying the input type and output format
cat data.ndjson | oafp input=ndjson output=cslon
```

```bash
# markdown parsing of a file
oafp file=someFile.md input=md

# table with the latest news from Google
curl -s -L https://blog.google/rss | oafp path="rss.channel.item" sql="select title, pubDate" output=ctable

# table with the number of people in space per space craft
curl -s http://api.open-notify.org/astros.json | oafp path="people" sql="select \"craft\", count(1) \"people\" group by \"craft\"" output=ctable

# markdown table with the current closest asteroids to earth
curl -s "https://api.nasa.gov/neo/rest/v1/feed?API_KEY=DEMO_KEY" | oafp path="near_earth_objects" maptoarray=true output=json | oafp path="[0][].{name:name,magnitude:absolute_magnitude_h,hazardous:is_potentially_hazardous_asteroid,distance:close_approach_data[0].miss_distance.kilometers}" sql="select * order by distance" output=mdtable
```

---

## 📚 Other help documents

| Help | Description |
|------|-------------|
| help=filters | Provides more details regarding the use of "path=", "from=" and "sql=" |
| help=template | Provides more details regarding the use of "output=template" |
| help=examples | Provide several examples |
| help=readme | Returns this document |
