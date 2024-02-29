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
| data   | Alternative to file, stdin and cmd to provide data input |
| out    | The output format (default: ctree) |
| in     | The input type (if not provided it will try to be auto-detected) |
| from   | An OpenAF nLinq path expression to filter output |
| sql    | A SQL expression to filter output |
| sqlfilter | Enables the forcing of the sql filter parser (values: auto, simple, advanced) |
| path   | A JMESPath expression to filter output |
| csv    | If type=csv, the CSV options to use | 
| outputkey | If defined the map/list output will be prefix with the provided key |
| pause  | If 'true' will try to pause contents in alternative to _less -r_ |
| color  | If 'true' will force colored output if available |
| loop   | If defined will loop the processing by the number of seconds provided |
| -v     | Changes the input to a map with the tool's version info |
| version | Alternative way to change the input to a map with the tool's version |

> Filter options apply in the following order: _path_, _from_ and _sql_.

> For _path_ syntax check https://jmespath.org/tutorial.html

> You can list inputs by using _input="?"_; outputs by _output="?"_; transforms by _transforms=true_

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
| db      | A JDBC query to a database |
| md      | A Markdown format |
| ch      | An OpenAF channel format |
| mdtable | A Markdown table format |
| jsonschema | Given a JSON schema format tries to generate sample data for it |
| openmetrics | An OpenMetrics/Prometheus compatible format |
| lines   | A given string/text to be processed line by line |
| llm     | A large language model input (uses 'llmenv' or 'llmoptions') |
| sql     | One or more SQLs statements to AST (Abstract Syntax Tree) |
| ini     | INI/Properties format |
| xls     | A XLSx compatible file (requires file=abc.xlsx) |
| raw     | Passes the input directly to transforms and output |

---

## 🚜 Optional transforms:

These options will change the parsed input data included any filters provided.

| Option | Type | Description |
|--------|------|-------------|
| arraytomap | Boolean | If true will try to convert the input array to a map (see arraytomapkey, arraytomapkeepkey) |
| arraytomapkeepkey | Boolean | If true and arraytomap=true the defined arraytomapkey won't be removed from each map |
| arraytomapkey | String | For arraytomap=true defines the name of the map property that will be each element key (see arraytomapkeepkey) |
| correcttypes | Boolean | If true will try to convert alpha-numeric field values with just numbers to number fields, string date fields to dates and boolean fields |
| flatmap | Boolean | If true a map structure will be flat to just one level |
| jsonschema | String | The JSON schema file to use for validation returning a map with a boolean valid and errors if exist |
| jsonschemacmd | String | Alternative option to 'jsonschema' to retrieve the JSON schema data to use for validation returning a map with a boolean valid and errors if exist |
| jsonschemagen | Boolean | If true will taken the provided input map as an example to generate an output json schema |
| llmcontext | String | If 'llmprompt' is defined provides extra context to the model regarding the input data |
| llmprompt | String | A large language model prompt to transform the input data to json (uses the same input options 'llmenv' and 'llmoptions') |
| maptoarray | Boolean | If true will try to convert the input map to an array (see maptoarraykey) |
| maptoarraykey | String | If maptoarray=true defines the name of the map property that will hold the key for each map in the new array |
| merge | Boolean | If input is a list/array of maps will merge each element into one map |
| removedups | Boolean | If true will try to remove duplicates from an array |
| removenulls | Boolean | If true will try to remove nulls and undefined values from a map or array |
| searchkeys | String | Will return a map with only keys that match the provided string |
| searchvalues | String | Will return am map with only values that match the provided string |
| sortmapkeys | Boolean | If true the resulting map keys will be sorted |

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
| db       | Output to a JDBC database |
| md       | A Markdown format |
| ch       | An OpenAF channel format |
| chart    | A line-chart like chart (usefull together with 'loop') |
| mdtable  | A Markdown table format (only for list outputs) |
| openmetrics | Converts a map or list to OpenMetrics/Prometheus compatible format |
| base64   | A base64 text format | 
| ini      | A INI/Properties format (arrays are not supported) |
| xls      | A XLSx output format |
| template | A Handlebars template format (requires template=someTemplate.hbs) |
| log      | If input has Logstash compatible fields outputs a human-readable log |
| sql      | Outputs a series of SQL statements for an input list/array data |
| raw      | Tries to output the internal representation (string or json) of the input transformed data |

> For 'template' check https://github.com/OpenAF/openaf-opacks/blob/master/oafproc/docs/TEMPLATE.md

---

## 🧾 JSON input options

List of options to use when _input=json_:

| Option | Type | Description |
|--------|------|-------------|
| jsondesc | Boolean | If true the output will be a list of JSON paths of the original json.  |
| jsonprefix | String | Given the 'jsondesc=true' output list you can use each to filter big json files by prefix. |

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

## 🧾 Lines input options

List of options to use when _input=lines_:

| Option | Type | Description |
|--------|------|-------------|
| linesjoin | Boolean | If true it will return an array with each processed line |
| linesvisual | Boolean | If true it will try to determine header and column position from spaces and tabs |
| linesvisualsepre | String | Regular expression representing the separator between columns when linesvisual=true (defaults to ' \\s+') | 

---

## 🧾 DB input options

List of options to use when _input=db_ (SQL query):

| Option | Type | Description |
|--------|------|-------------|
| indbjdbc | String | The JDBC URL to access the input database |
| indbuser | String | The JDBC access user |
| indbpass | String | The JDBC access password |
| indbtimeout | String | The JDBC access timeout |
| indblib | String | Use a JDBC driver oPack generated by ojob.io/db/getDriver |
| indbexec | Boolean | If true the input SQL is not a query but a DML statement | 

> JDBC oracle: jdbc:oracle:thin:@[host]:[port]:[database]
> JDBC postgreSQL: jdbc:postgresql://[host]:[port]/[database]
> JDBC H2: jdbc:h2:[file]   

---

## 🧾 CH input options

List of options to use when _input=ch_:

| Option | Type | Description |
|--------|------|-------------|
| inch   | String | A JSON/SLON configuration string with type and options/url |
| inchall | Boolean | A boolean flag to determine if the input map will be used for a getAll query |

> Example of options provided in JSON: inch="{type:'mvs',options:{file:'data.db'}}"
> Example of optiosn provided in SLON: inch="(type: remote, url: 'http://some.host:1234/chname')"

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

> You can also use _incsv_ as a shortcut for _inputcsv_

---

## 🧾 Base64 input/output options

List of options to use when _input=base64_ or _output=base64_:

| Option | Type | Description |
|--------|------|-------------|
| base64gzip | Boolean | If true the contents will thet gzip/gunzip respectively to reduce the size of the base64 output |

---

## 🧾 LLM input/transform options

List of options to use when _input=llm_ or _llmprompt=..._:

| Option | Type | Description |
|--------|------|-------------|
| llmenv | String | The environment variable containing the value of 'llmoptions' (defaults to OAFP_MODEL) |
| llmoptions | String | A JSON or SLON string with OpenAF's LLM 'type' (e.g. openai/ollama), 'model' name, 'timeout' in ms for answersm, 'url' for the ollama type or 'key' for openai type | 

---

## 🧾 Log output options

List of options to use when _output=log_:

| Option | Type | Description |
|--------|------|-------------|
| logprintall | Boolean | If true all original non data (string) lines will be output |

---

## 🧾 SQL output options

List of options to use when _output=sql_:

| Option | Type | Description |
|--------|------|-------------|
| sqltable | String | The table name to use for the SQL statements (defaults to 'data') |
| sqlicase | Boolean | If true the table and fields names won't be double-quoted |
| sqlnocreate | Boolean | If true the create table statement won't be generated |

---

## 🧾 DB output options

List of options to use when _output=db_:

| Option | Type | Description |
|--------|------|-------------|
| dbjdbc | String | The JDBC URL to access the input database |
| dbuser | String | The JDBC access user |
| dbpass | String | The JDBC access password |
| dbtimeout | String | The JDBC access timeout |
| dblib | String | Use a JDBC driver oPack generated by ojob.io/db/getDriver |
| dbtable | String | The db table in which should be inserted ('data' by default) | 
| dbnocreate | Boolean | If true no table creation command will be executed (if the table already exists set this to true) |
| dbicase | Boolean | If true table and field names will try to ignore case |
| dbbatchsize | Number | If defined it will changed the default batch data insert process | 

> You can use _output=sql_ to get a preview of the SQL statements the _db_ output type will use

> JDBC oracle: jdbc:oracle:thin:@[host]:[port]:[database]
> JDBC postgreSQL: jdbc:postgresql://[host]:[port]/[database]
> JDBC H2: jdbc:h2:[file]   

---

## 🧾 CH output options

List of options to use when _output=ch_:

| Option | Type | Description |
|--------|------|-------------|
| ch   | String | A JSON/SLON configuration string with type and options/url |
| chkey | String | A comma delimited list of map keys to build a key from each array value |
| chunset | Boolean | If true the input data will be used to unset data on the output channel instead of set |

> Example of options provided in JSON: ch="{type:'mvs',options:{file:'data.db'}}"
> Example of optiosn provided in SLON: ch="(type: remote, url: 'http://some.host:1234/chname')"

---

## 🧾 Chart output options

List of options to use when _output=chart_:

| Option | Type | Description |
|--------|------|-------------|
| chart  | String | Chart definition in the format "<unit> <path:color:legend>... [-min:0] [-max:100]". Unit is either 'int', 'dec1', 'dec2', 'dec3', 'dec', 'bytes' or 'si'. Path is equivalent to the 'path' filter (quotes should be used for non-basic 'path' expressions). |
| chartcls | Boolean | If true the screen will be cleared for each execution |

> Example: ```oafp cmd="curl -s http://api.open-notify.org/iss-now.json" out=chart chartcls=true chart="dec3 iss_position.latitude:blue:lat iss_position.longitude:red:long" loop=5```

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

```bash
# list of OpenAF oPacks and their corresponding version
oafp -v path="openaf.opacks" output=ctable

# list of OpenAF processor inputs, transforms and outputs
oafp -v path="oafp.inputs" output=cslon
oafp -v path="oafp.transforms" output=cslon
oafp -v path="oafp.outputs" output=cslon
```

---

## 📚 Other help documents

| Help | Description |
|------|-------------|
| help=filters | Provides more details regarding the use of "path=", "from=" and "sql=" |
| help=template | Provides more details regarding the use of "output=template" |
| help=examples | Provide several examples |
| help=readme | Returns this document |
