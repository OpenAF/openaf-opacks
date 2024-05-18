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
| sqlfiltertables | A JSON/SLON array composed of 'table' name and 'path' to each table's data to be used with the sqlfilter |
| path   | A JMESPath expression to filter output |
| csv    | If type=csv, the CSV options to use | 
| outkey | If defined the map/list output will be prefix with the provided key |
| outfile | If defined all output will be written to the provided file |
| outfileappend | If 'true' and outfile=true the output will be appended on the provided file |
| pause  | If 'true' will try to pause contents in alternative to _less -r_ |
| color  | If 'true' will force colored output if available |
| url    | Retrieves data from the provided URL |
| urlmethod | If 'url' is provided defines the http method to use if different from GET | 
| urlparams | If 'url' is provided extra parameters (equivalent to OpenAF's $rest) can be provided in JSON/SLON |
| urldata | If 'url' is provided a JSON/SLON/text data can be provided | 
| loop   | If defined will loop the processing by the number of seconds provided |
| loopcls | If 'true' and loop is defined it will clear the screen (or file) on each loop cycle |
| libs | Comma delimited list of installed OpenAF's oPacks to consider to extend oafp's inputs, transformations and outputs | 
| -examples | Will access an internet based list of oafp examples and list them |
| examples | Will search the provided keyword or 'category::subcategory' in the internet based list of oafp examples |
| version | Alternative way to change the input to a map with the tool's version |
| -v | Changes the input to a map with the tool's version info |

> Filter options apply in the following order: _path_, _from_ and _sql_.

> For _path_ syntax check https://jmespath.org/tutorial.html

> You can list inputs by using _in="?"_; outputs by _out="?"_; transforms by _transforms=true_

> _sqlfilterstable_ assumes and forces _sqlfilter=advanced_

> Use 'OAFP_RESET=true' to forces to reset the terminal before waiting for input or displaying an output (use this if you experience terminal related issues)

---

## ⬇️  Input types

List of data input types that can be auto-detected (through the file extension or through it's contents). You can always override it be using the _input_ option:

| Input type | Description |
|------------|-------------|
| base64 | A base64 text format |
| ch | An OpenAF channel format |
| csv | A CSV format (auto-detected) |
| db | A JDBC query to a database |
| gb64json | Equivalent to in=base64 and base64gzip=true |
| hsperf | A Java hsperfdata* file (requires file=hsperfdata_user/123) |
| ini | INI/Properties format |
| json | A JSON format (auto-detected) |
| jsonschema | Given a JSON schema format tries to generate sample data for it |
| lines | A given string/text to be processed line by line |
| llm | A large language model input (uses 'llmenv' or 'llmoptions') |
| llmmodels | Lists the large language models available (using 'llmenv' or 'llmoptions') |
| md | A Markdown format |
| mdtable | A Markdown table format |
| ndjson | A NDJSON format |
| oafp | Takes a JSON/SLON map input as parameters for calling a sub oafp process (arrays will call multiple oafp processes) |
| openmetrics | An OpenMetrics/Prometheus compatible format |
| raw | Passes the input directly to transforms and output |
| rawhex | Tries to read the input char by char converting into lines with the hexadecimal representation |
| slon | A SLON format (auto-detected) |
| sql | One or more SQLs statements to AST (Abstract Syntax Tree) |
| toml | TOML format |
| xls | A XLSx compatible file (requires file=abc.xlsx) |
| xml | An XML format (auto-detected) |
| yaml | A YAML format (auto-detected) |

---

## 🚜 Optional transforms:

These options will change the parsed input data included any filters provided.

| Option | Type | Description |
|--------|------|-------------|
| arraytomap | Boolean | If true will try to convert the input array to a map (see arraytomapkey, arraytomapkeepkey) |
| arraytomapkeepkey | Boolean | If true and arraytomap=true the defined arraytomapkey won't be removed from each map |
| arraytomapkey | String | For arraytomap=true defines the name of the map property that will be each element key (see arraytomapkeepkey) |
| cmlt | Boolean | If true will accumulate the input values into an output array (useful with loop) |
| correcttypes | Boolean | If true will try to convert alpha-numeric field values with just numbers to number fields, string date fields to dates and boolean fields |
| denormalize | String | Reverses 'normalize' given a JSON/SLON map with a normalize schema (see OpenAF's ow.ai.normalize.withSchema) |
| diff | String | A JSON/SLON map with a 'a' path and a 'b' path to compare and provide diff data |
| flatmap | Boolean | If true a map structure will be flat to just one level (optionally flatmapsep=[char] to use a different separator that '.') |
| getlist | Number | If true will try to find the first array on the input value (if number will stop only after the number of checks) |
| jsonschema | String | The JSON schema file to use for validation returning a map with a boolean valid and errors if exist |
| jsonschemacmd | String | Alternative option to 'jsonschema' to retrieve the JSON schema data to use for validation returning a map with a boolean valid and errors if exist |
| jsonschemagen | Boolean | If true will taken the provided input map as an example to generate an output json schema |
| kmeans | Number | Given an array of 'normalized' data will cluster data into the number of centroids provided |
| llmcontext | String | If 'llmprompt' is defined provides extra context to the model regarding the input data |
| llmprompt | String | A large language model prompt to transform the input data to json (uses the same input options 'llmenv' and 'llmoptions') |
| maptoarray | Boolean | If true will try to convert the input map to an array (see maptoarraykey) |
| maptoarraykey | String | If maptoarray=true defines the name of the map property that will hold the key for each map in the new array |
| merge | Boolean | If input is a list/array of maps will merge each element into one map |
| normalize | String | A JSON/SLON map with a normalize schema (see OpenAF's ow.ai.normalize.withSchema) |
| regression | String | Performs a regression (linear, log, exp, poly or power) over a provided list/array of numeric values |
| removedups | Boolean | If true will try to remove duplicates from an array |
| removenulls | Boolean | If true will try to remove nulls and undefined values from a map or array |
| searchkeys | String | Will return a map with only keys that match the provided string |
| searchvalues | String | Will return am map with only values that match the provided string |
| sortmapkeys | Boolean | If true the resulting map keys will be sorted |

---

## ⬆️  Output formats

List of available formats to use with the _output_ option:

| Output format | Description |
|---------------|-------------|
| base64 | A base64 text format |
| ch | An OpenAF channel format |
| chart | A line-chart like chart (usefull together with 'loop') |
| cjson | A JSON forcely colored format |
| cmd | Executes a command for each input data entry |
| cslon | A SLON format forcely colored |
| csv | A CSV format (only for list outputs) |
| ctable | A table-like forcely colored format (only for list outputs) |
| ctree | A tree-like forcely colored format |
| db | Output to a JDBC database |
| envs | Tries to output the input data as OS environment variables setting commands |
| gb64json | Equivalent to out=base64 and base64gzip=true |
| grid | A multiple output ascii grid (usefull together with 'loop') |
| html | An HTML format |
| ini | A INI/Properties format (arrays are not supported) |
| json | A JSON format without spacing |
| log | If input has Logstash compatible fields outputs a human-readable log |
| map | A rectangle map format |
| md | A Markdown format |
| mdtable | A Markdown table format (only for list outputs) |
| mdyaml | A multi document YAML format (only for list outputs) |
| ndjson | A NDJSON format |
| openmetrics | Converts a map or list to OpenMetrics/Prometheus compatible format |
| pjson | A JSON format with spacing (equivalent to prettyjson) |
| prettyjson | A JSON format with spacing |
| pxml | Tries to output the input data into pretty xml |
| raw | Tries to output the internal representation (string or json) of the input transformed data |
| schart | A static line-chart like chart (for a fixed list/array of values) |
| slon | A SLON format |
| sql | Outputs a series of SQL statements for an input list/array data |
| stable | A table-like format with separation (only for list outputs) |
| table | A table-like format without size constraints (only for list outputs) |
| template | A Handlebars template format |
| toml | A TOML format (arrays will have outkey=list) |
| tree | A tree-like format |
| xls | A XLSx output format |
| xml | An XML format |
| yaml | A YAML format |

> For 'template' check https://docs.openaf.io/docs/guides/oafp/oafp-template.html

> For 'log' you can use 'logtheme' or the environment variable 'OAFP_LOGTHEME' with a JSON/SLON map with the colors to use '(errorLevel: red, warnLevel: yellow, timestamp: bold)'

---

## ⬇️  Input options

---

### 🧾 CH input options

List of options to use when _in=ch_:

| Option | Type | Description |
|--------|------|-------------|
| inch   | String | A JSON/SLON configuration string with type and options/url |
| inchall | Boolean | A boolean flag to determine if the input map will be used for a getAll query |

> Example of options provided in JSON: inch="{type:'mvs',options:{file:'data.db'}}"
> Example of optiosn provided in SLON: inch="(type: remote, url: 'http://some.host:1234/chname')"

---

### 🧾 DB input options

List of options to use when _in=db_ (SQL query):

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

### 🧾 JSON input options

List of options to use when _in=json_:

| Option | Type | Description |
|--------|------|-------------|
| jsondesc | Boolean | If true the output will be a list of JSON paths of the original json.  |
| jsonprefix | String | Given the 'jsondesc=true' output list you can use each to filter big json files by prefix. |

---

### 🧾 Lines input options

List of options to use when _in=lines_:

| Option | Type | Description |
|--------|------|-------------|
| linesjoin | Boolean | If true it will return an array with each processed line |
| linesvisual | Boolean | If true it will try to determine header and column position from spaces and tabs |
| linesvisualsepre | String | Regular expression representing the separator between columns when linesvisual=true (defaults to ' \\s+') | 

---

### 🧾 ndJSON input options

List of options to use when _in=ndjson_:

| Option | Type | Description |
|--------|------|-------------|
| ndjsonjoin | Boolean | If true will join the ndjson records to build an output array |
| ndjsonfilter | Boolean | If true each line is interpreted as an array before filters execute (this allows to filter json records on a ndjson) |

---

### 🧾 RAWHEX input options

List of options to use when _in=rawhex_:

| Option | Type | Description |
|--------|------|-------------|
| inrawhexline | Number | Number of hexadecimal characters per returned array line | 

---

### 🧾 XLS input options

List of options to use when _in=xls_:

| Option | Type | Description |
|--------|------|-------------|
| xlssheet | String | The name of sheet to consider (default to the first sheet) |
| xlsevalformulas | Boolean | If false the existing formulas won't be evaluated (defaults to true) |
| xlscol | String | The column on the sheet where a table should be detected (e.g. "A") |
| xlsrow | Number | The row on the sheet where a table should be detected (e.g. 1) |

### 🧾 XML input options

List of options to use when _in=xml_:

| Option | Type | Description |
|--------|------|-------------|
| xmlignored | String | A comma-separated list of XML tags to ignore |
| xmlprefix | String | A prefix to add to all XML tags |
| xmlfiltertag | Boolean | If true will filter the XML tags |

---

## ⬇️⬆️  Input/Output options

---

### 🧾 Base64 input/output options

List of options to use when _in=base64_ or _out=base64_:

| Option | Type | Description |
|--------|------|-------------|
| base64gzip | Boolean | If true the contents will thet gzip/gunzip respectively to reduce the size of the base64 output |

---

### 🧾 CSV input/output options

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

## 🚜 Transform options

---

### 🧾 CMLT transform options

List of options to use when _cmlt=true_:

| Option | Type | Description |
|--------|------|-------------|
| cmltch | String | A JSON/SLON OpenAF channel configuration string with type and options/url (defaults to simple) |
| cmltsize | Number | The number of input data values to keep (default 100). If -1 it will keep without a limit |

---

### 🧾 Diff transform options

List of options to use when _diff=..._:

| Option | Type | Description |
|--------|------|-------------|
| difftheme | String | A JSON/SLON map with the colors to use if color = true |
| diffnlines | Boolean | If true will append each line with a line number of the final result of the differences between 'a' and 'b' (just for rough reference) |
| diffwords | Boolean | If true and the input is text based will perform the diff at the word level | 
| diffwordswithspace | Boolean | If true and the input is text based will perform the diff at the word + spaces level |
| difflines | Boolean | If true and the input is text based will perform the diff at the lines level |
| diffsentences | Boolean | If true and the input is text based will perfom the diff at the sentence level |
| diffchars | Boolean | If true and the input is text based will perform the diff at the char level |

> 'difftheme' example: "(added: GREEN, removed: RED, common: FAINT, linenum: ITALIC, linediv: FAINT, linesep: ':')"

> If color=true a visual colored diff will be output insted of an array of differences

> If both inputs are array based and color=false (or not provided) the comparition will be performed at the array elements level

> The contents of 'difftheme' can also be provided through the 'OAFP_DIFFTHEME' environment variable

---

### 🧾 LLM input/transform options

List of options to use when _in=llm_ or _llmprompt=..._:

| Option | Type | Description |
|--------|------|-------------|
| llmenv | String | The environment variable containing the value of 'llmoptions' (defaults to OAFP_MODEL) |
| llmoptions | String | A JSON or SLON string with OpenAF's LLM 'type' (e.g. openai/ollama), 'model' name, 'timeout' in ms for answersm, 'url' for the ollama type or 'key' for openai type | 
| llmconversation | String | File to keep the LLM conversation |
| llmimage | String | For visual models you can provide a base64 image or an image file path or an URL of an image |

---

### 🧾 Regression transform options

List of options to use when _regression=..._:

| Option | Type | Description |
|--------|------|-------------|
| regressionpath | String | The path to the array of y values for the regression formulas |
| regressionx | String | Optional path to the array of x values for the regression formulas (defaults to 1, 2, 3, ...) |
| regressionoptions | String | A JSON/SLON configuration with order (defaults to 2) and/or precision (defaults to 5) |
| regressionforecast | String | Optional path to an array of x values for which to forecast the corresponding y |

> Example: ```oafp data="[1,2,3]" regression=linear regressionforecast="from_slon('[4|5]')" out=ctable```

---

## ⬆️  Output options

---

### 🧾 CH output options

List of options to use when _out=ch_:

| Option | Type | Description |
|--------|------|-------------|
| ch   | String | A JSON/SLON configuration string with type and options/url |
| chkey | String | A comma delimited list of map keys to build a key from each array value |
| chunset | Boolean | If true the input data will be used to unset data on the output channel instead of set |

> Example of options provided in JSON: ch="{type:'mvs',options:{file:'data.db'}}"
> Example of optiosn provided in SLON: ch="(type: remote, url: 'http://some.host:1234/chname')"

---

### 🧾 Chart output options

List of options to use when _out=chart_:

| Option | Type | Description |
|--------|------|-------------|
| chart  | String | Chart definition in the format "<unit> <path:color:legend>... [-min:0] [-max:100]". Unit is either 'int', 'dec1', 'dec2', 'dec3', 'dec', 'bytes' or 'si'. Path is equivalent to the 'path' filter (quotes should be used for non-basic 'path' expressions). |
| chartcls | Boolean | If true the screen will be cleared for each execution |

Example: 
```oafp cmd="curl -s http://api.open-notify.org/iss-now.json" out=chart chartcls=true chart="dec3 iss_position.latitude:blue:lat iss_position.longitude:red:long" loop=5```

---

### 🧾 Cmd output options

List of options to use when _out=cmd_:

| Option | Type | Description |
|--------|------|-------------|
| outcmd | String | The command to execute receiving, in pipeline, each input entry in json |
| outcmdjoin | Boolean | If true and if input is an array the entire array will be the input entry |
| outcmdseq | Boolean | If true and if input is an array the commands will be executed in sequence |
| outcmdnl | Boolean | If true each command execution output will be appended with a new-line |
| outcmdparam | Boolean | If true the input entry will be replaced on the 'outcmd' where '{}' is found |

> If input is an array, without outcmdjoin=true, each entry will result in a command execution in parallel

---

### 🧾 DB output options

List of options to use when _out=db_:

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

> You can use _out=sql_ to get a preview of the SQL statements the _db_ output type will use

> JDBC oracle: jdbc:oracle:thin:@[host]:[port]:[database]
> JDBC postgreSQL: jdbc:postgresql://[host]:[port]/[database]
> JDBC H2: jdbc:h2:[file]   

---

### 🧾 Envs output options

List of options to use when _out=envs_:

| Option | Type | Description |
|--------|------|-------------|
| envscmd | String | If defined will output the provided command to set each environment variable (defaults to 'export' or 'set' in Windows) |
| envsprefix | String | If defined uses the provided prefix for each environment variable key (defaults to '_OAFP_') |

Example of a shell script using 'out=envs': 

```
#!/bin/sh
eval $(oafp -v out=envs)
echo Using OpenAF version: $_OAFP_openaf_version - $_OAFP_openaf_distribution
echo On the operating system: $_OAFP_os_name
```

---

### 🧾 Grid output options

List of options to use when _out=grid_:

| Option | Type | Description |
|--------|------|-------------|
| grid   | String | A JSON/SLON configuration composed of an array with another array per grid line. Each line array should have a map per column (see below for the map options) | 

Each map should be composed of a:

  * 'title'
  * 'type' (tree, map, chart, bar, table, area, text and md)
  * a 'path' to select the data (for non chart types) 
  * an 'obj' (for chart type the format is the same of chart=...) 
  * or 'cmd' (to run a command that outputs json on stdout)

---

### 🧾 HTML output options

List of options to use when _out=html_:

| Option | Type | Description |
|--------|------|-------------|
| htmlcompact | Boolean | Boolean flag that if true and the input data is a string or markdown the generated html will have a visual compact width format |
| htmlpart | Boolean | Boolean flag that if true and the input data is a string or markdown the generated html will be partial and not the complete file |
| htmlopen | Boolean | Boolean that if false won't try to open the output contents in a browser (defaults to true) |
| htmlwait | Number | Amount of ms, when htmlopen=true, to wait for the system browser to open an render the html output | 

---

### 🧾 Log output options

List of options to use when _out=log_:

| Option | Type | Description |
|--------|------|-------------|
| logprintall | Boolean | If true all original non data (string) lines will be output |

---

### 🧾 OpenMetrics output options

List of options to use when _out=openmetrics_:

| Option | Type | Description |
|--------|------|-------------|
| metricsprefix | String | The prefix to use for each metric (defaults to 'metrics') |
| metricstimestamp | Number | Unix Epoch in seconds for each metric |

---

### 🧾 SChart output options

List of options to use when _out=schart_:

| Option | Type | Description |
|--------|------|-------------|
| schart  | String | Chart definition in the format "<unit> <path:color:legend>... [-min:0] [-max:100]". Unit is either 'int', 'dec1', 'dec2', 'dec3', 'dec', 'bytes' or 'si'. Path is equivalent to the 'path' filter (quotes should be used for non-basic 'path' expressions). |

Example: 
```oafp data="[(x:1,y:2)|(x:2,y:5)|(x:1,y:4)|(x:2,y:5)|(x:1,y:5)]" in=slon out=schart schart="int '[].x':red:x '[].y':blue:y -min:0 -vsize:8"```

---

### 🧾 SQL output options

List of options to use when _out=sql_:

| Option | Type | Description |
|--------|------|-------------|
| sqltable | String | The table name to use for the SQL statements (defaults to 'data') |
| sqlicase | Boolean | If true the table and fields names won't be double-quoted |
| sqlnocreate | Boolean | If true the create table statement won't be generated |

---

### 🧾 Template output options

List of options to use when _out=template_:

| Option | Type | Description |
|--------|------|-------------|
| template | String | A file path to a HandleBars' template |
| templatepath | String | If 'template' is not provided a path to the template definition (pre-transformation) |
| templatedata | String | If defined the template data will be retrieved from the provided path |

---

### 🧾 XLS output options

List of options to use when _out=xls_:

| Option | Type | Description |
|--------|------|-------------|
| xlsfile | String | The output filename (if not defined a temporary file will be used to open with the OS's Excel-compatible application) |
| xlssheet | String | The name of sheet to use (default to 'data') |
| xlsformat | String | A SLON or JSON string with the formatting of the output file (e.g. (bold: true, borderBottom: "medium", borderBottomColor: "red")) |
| xlsopen | Boolean | If false it won't try to open the OS's Excel-compatible application (defaults to true) |
| xlsopenwait | Number | The amount of time, in ms, to keep the temporary file for the OS's Excel-compatible application to start and open the file |

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
```

```bash
# list of OpenAF oPacks and their corresponding version
oafp -v path="openaf.opacks" output=ctable

# list of OpenAF processor inputs, transforms and outputs
oafp -v path="oafp.inputs" output=cslon
oafp -v path="oafp.transforms" output=cslon
oafp -v path="oafp.outputs" output=cslon

# list examples with kubectl
oafp examples=kubectl
# list examples for category 'openaf' and sub-category 'oafp'
oafp examples=openaf::oafp
# list examples for category 'kubernetes'
oafp examples=kubernetes::
```

---

## 📚 Other help documents

| Help | Description |
|------|-------------|
| help=filters | Provides more details regarding the use of "path=", "from=" and "sql=" |
| help=template | Provides more details regarding the use of "output=template" |
| help=examples | Provide several examples |
| help=readme | Returns this document |
