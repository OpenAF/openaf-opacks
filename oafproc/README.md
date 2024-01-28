# OpenAF parser
    
**Usage**: _oafp [file] [options]_

Takes an input, usually a data structure such as json, and transforms it to an equivalent data structure in another format or visualization. The output data can be filtered through JMESPath, SQL or OpenAF's nLinq and provided transformers can also be applied to it.

> If a _file_ or _file=somefile_ is not provided the input will be expected to be provided through stdin/pipe.
> Options are expected to be provided as _option=value_. Check the lists below for all the available options.

## Main options:

| Option | Description | 
|--------|-------------|
| -h     | Show this document |
| file   | The file to parse (if not provide stdin is used) |
| output | The output format (default: ctree) |
| input  | The input type (if not provided it will try to be auto-detected) |
| from   | An OpenAF nLinq path expression to filter output |
| sql    | A SQL expression to filter output |
| path   | A JMESPath expression to filter output |
| csv    | If type=csv, the CSV options to use |
| pause  | If 'true' will try to pause contents in alternative to _less -r_ |

---

## ⬇️  Input types

List of data input types that can be auto-detected (through the file extension or through it's contents). You can always override it be using the _input_ option:

| Input type   | Description |
|--------|-------------|
| json   | A JSON format (auto-detected) |
| yaml   | A YAML format (auto-detected) |
| xml    | An XML format (auto-detected) |
| csv    | A CSV format (auto-detected) |
| ndjson | A NDJSON format |
| md     | A Markdown format |

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

---

## ⬆️  Output formats

List of available formats to use with the _output_ option:

| Output format | Description |
|--------|-------------|
| ctree  | A tree-like forcely colored format |
| cjson  | A JSON forcely colored format |
| ctable | A table-like forcely colored format (only for list outputs) |
| tree   | A tree-like format |
| json   | A JSON format without spacing |
| prettyjson | A JSON format with spacing |
| yaml   | A YAML format |
| mdyaml | A multi document YAML format (only for list outputs) |
| stable | A table-like format with separation (only for list outputs) |
| table  | A table-like format without size constraints (only for list outputs) |
| xml    | An XML format |
| ndjson | A NDJSON format |
| cslon  | A SLON format forcely colored |
| slon   | A SLON format |
| csv    | A CSV format (only for list outputs) |
| map    | A rectangle map format |
| html   | An HTML format |
| md     | A Markdown format |
| log    | If input has Logstash compatible fields outputs a human-readable log |

---

## 🧾 ndJSON input options

List of options to use when _input=ndjson_:

| Option | Type | Description |
|--------|------|-------------|
| ndjsonjoin | Boolean | If true will join the ndjson records to build an output array |

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
``````

```bash
# markdown parsing of a file
oafp file=someFile.md input=md

# table with the latest news from Google
curl -L https://blog.google/rss | oafp path="rss.channel.item" sql="select title, pubDate" output=ctable

# table with the number of people in space per space craft
curl http://api.open-notify.org/astros.json | oafp path="people" sql="select \"craft\", count(1) \"people\" group by \"craft\"" output=ctable

# HTML with the list of all of the known meteorite landings
curl -L "https://data.nasa.gov/api/views/gh4g-9sfh/rows.csv?accessType=DOWNLOAD" | oafp output=html
```