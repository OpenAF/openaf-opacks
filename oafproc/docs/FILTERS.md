# OpenAF processor filters

Filters run in a fixed order, regardless of command-line argument order:

**input** → `ifrom` → `isql` → `path` → `ijq` (alias `jq`) → **transforms** → `from` → `sql` → `opath` → `ojq` → **output**

Every filter is optional. `path` and `opath` use OpenAF's `$path` (JMESPath plus OpenAF functions); `ijq` and `ojq` use `$jq`; `ifrom`/`from` use nLinq; `isql`/`sql` use SQL. Input filters select data before transforms, and output filters select the transformed result.

```sh
# Select an array, keep active entries, then return their names.
oafp in=json data='{"users":[{"name":"Ana","active":true},{"name":"Ben","active":false}]}' path=users jq='map(select(.active))' ojq='map(.name)' out=json
# ["Ana"]

# Retrieve one exact function row, including its signature and example.
oafp help="filter=keys" out=raw
```

Use `help=filters` for this reference. `help="filter=<name>"` selects an exact, case-sensitive function name (for example `tF`), and supports normal Markdown rendering, `out=raw`, and `pause=true`.

---

## 🪚 Path

The _path=_ filter tool is based on the JMESPath library. To see all the available options please refer to http://jmespath.org. Here are some examples:

### Slicing

When querying arrays it’s possible to “slice” them in different ways (examples: the first five; from the third to the fifth; the first two; the last element; etc.)

* "[0:5]"
* "[5:10]"
* "[:5]"
* "[::2]"
* "[::-1]"

### Projections

As with projections it’s also possible to “project” multiple fields.

* "a[*].first"
* "a.*.b"
* "[]"

### Filters

It’s possible to apply simple conditions (including using functions) to query an array.

* "a[?b=='xyz'].c"
* "a[?b>`1`].x"

### MultiSelect

As with projections it’s also possible to “project” multiple fields.

* "a[].[x, y]"
* "a[].{ x: x, y: y }"

### Pipe

Using the same unix “pipe” mechanism it’s possible to apply different categories of queries in sequence.

* "a[*].b | [0]"

### Functions

This reference covers 26 base JMESPath functions and 109 built-in OpenAF extensions. `base` means a standard JMESPath function; dates identify existing OpenAF availability metadata, and `all` is legacy metadata for an OpenAF extension. Older runtimes may not provide newer extensions.

Examples are JMESPath expressions for `path=` or `opath=`, not JavaScript calls. `@` means the current value; single quotes enclose strings; backticks enclose JSON literals such as `1`, `true`, `null`, arrays, or objects. In shell commands, protect literal backticks from shell expansion. In table cells, `\|` represents a literal pipe in the expression. Every argument shown in an OpenAF extension signature is required; pass an appropriate value for each position.

`ojob`, `sh`, `sh_json`, `sh_jsslon`, and `sh_yaml` require `__flags.PATH_SAFE=false`. Some other extensions access runtime state, channels, environment variables, or optional libraries. The `path` and `opath` **functions** inside an expression are distinct from oafp's filter parameters.


| Function | OpenAF | Description | Example |
|----------|--------|-------------|---------|
| a2m(arrFields, arrValues) | 20240209 | Builds a map given an array of fields and values | a2m(k, v) |
| a4m(arr, 'key', dontRemove) | 20240209 | Converts an array into a map | a4m(@, 'name', `true`) |
| abs(number) | base | The absolute value of a numeric field | [].{y:abs(y)} |
| add(number, number) | 20240217 | Adds two numbers | add(`1`, `2`) |
| amerge(x, y) | 20240215 | OpenAF's merge with support for arrays | amerge([], from_slon('(stamp:123)')) |
| assign(obj, objPath, value) | 20241010 | Sets a property path on obj and returns obj | assign(@, 'status', 'valid') |
| assignp(path, objPath, value) | 20241010 | Sets a property on the object selected from the original input and returns the original input | assignp('items[0]', 'status', 'valid') |
| avg(arrayNumber) | base | The average value of an array of numeric fields | avg([].y) |
| at(array, index) | 20241205 | Returns the element at the given array index | at(@, `0`) |
| ceil(number) | base | Returns the smallest integer greater than or equal to the number | ceil(`1.2`) |
| ch(name, op, arg1, arg2) | 20240801 | Wrapper for OpenAF's channel functions over a 'name' channel, an 'op' operation between get, set, unset, size, getAll, getKeys, unsetAll; depending on the 'op', 'arg1' and 'arg2' can be provided with values as objects or JSON/SLON | ch('a', 'get', 'key', `null`) |
| chq(name, op, max, value) | 20260423 | Wrapper for OpenAF's channel functions in queue mode over a 'name' channel, an 'op' operation between push/add (adds entry removing oldest if over 'max'), pop (removes/returns last), shift (removes/returns first), size (returns count), get/all (returns all entries); 'max' set to -1 for unlimited | chq('myq', 'push', `10`, @) |
| concat(x, y) | 20240209 | Concatenates arrays or strings | concat('abc', '123') |
| contains(string/array, any) | base | Returns whether a string contains a substring or an array contains a value | files[?contains(filename, 'openaf.jar')] |
| count_by(arr, 'field') | all | Returns a count by array with the '_count' per value of the provided 'field' | count_by([], 'isFile') |
| date_diff(field, 'unit', nullval) | 20240228 | Given a date field will return the numeric difference to now for the provided unit (e.g. seconds, minutes, hours, days, months, weeks, years). Optionally a nullval will be used if no difference can be calculated | date_diff(modifiedDate, 'days', '-1') |
| dec(name) | 20240428 | Decrements the counter 'name' provided returning the counter value | dec('my_counter') |
| delete(map, 'field') | all | Remove a field from the provided map | delete(data, 'timestamp')  |
| div(a, b) | 20240217 | Divides two numbers | div(`6`, `2`) |
| ends_with(string, suffix) | base | Returns whether a string ends with the suffix | files[?ends_with(filename, '.jar')] |
| env(string) | 20240812 | Retrieves a environment variable value | env('PATH') |
| envs(regex) | 20240812 | Retrieves an array of name and values of environment variables | envs('^STR_.+$') |
| flat_map(x) | all | Flattens nested keys into dot-separated keys in a map or array of maps. | flat_map(data) |
| floor(number) | base | Returns the greatest integer less than or equal to the number | floor(`1.8`) |
| format(x, 'format') | 20240209 | Formats a string or number using OpenAF's $ft with type conversion | format(`123.12`, '%05.0f') |
| formatn(x, 'format') | 20240209 | Formats a string or number using OpenAF's $f without type conversion | formatn(name, '%10s') |
| from_base64(str) | 20251115 | Given a base64 encoded string will decode it | from_base64('SGVsbG8gV29ybGQh') |
| from_bytesAbbr(x) | 20240209 | Given a string with a byte abbreviation will convert to bytes | from_bytesAbbr('12GB') |
| from_csv(str, options) | 20240801 | Given a string CSV representation tries to parse to an array | from_csv(@, '(withDelimiter:"\|",withHeader:false)') |
| from_datef(date, 'format') | 20240228 | Formats a date as text using a Java date pattern | from_datef(to_datef('20240202', 'yyyyMMdd'), 'yyyy') |
| from_kyaml(str) | 20251115 | Parses a KYAML/lenient JSON string | from_kyaml(@) |
| from_json(str) | 20240215 | Parses a JSON string | from_json('{"a":123}') |
| from_ms(x, 'format') | 20240209 | Shortcut for OpenAF's ow.format.elapsedTime4ms function. The format is represented as a SLON/JSON string | from_ms(`12000`,'(abrev:true)') |
| from_numSpace(str, sep) | 20241207 | Tries to convert a string number with thousands separators back to a number | from_numSpace('123 456', ' ') |
| from_siAbbr(x) | 20240209 | Given a string with SI numeric abbreviation will convert it to the absolute value | from_siAbbr('100m') |
| from_slon(str) | 20240215 | Converts a slon string representation into an object | from_slon('(abc: 123)') |
| from_timeAbbr(x) | 20240209 | Converts a time abbreviation into ms | from_timeAbbr('12s') |
| from_toml(str) | 20240502 | Given a TOML format string tries to convert it to an object | from_toml(@) |
| from_toon(str) | 20260116 | Given a TOON format string tries to convert it to an object | from_toon(@) |
| from_xml(str) | 20251115 | Given an XML format string tries to convert it to an object | from_xml(@) |
| from_yaml(str) | 20240215 | Converts a YAML string representation into an object | from_yaml(@) |
| get(nameOrPath) | 20240305 | Returns a truthy locally stored value, falling back to the corresponding path in the original input | packages[].{name: name, parentVersion: get('version')} |
| geta(nameOrPath, arrayIndex) | 20240415 | Returns a truthy indexed local value, falling back to the indexed original-input value | geta('arr', `0`) |
| getc(name) | 20240428 | Returns the current value of a counter name user with inc/dec | getc('my_counter') |
| group(arr, 'field') | all | Returns an object whose keys are field values and whose values are arrays of matching entries | group(files, 'isDirectory') |
| group_by(arr, 'field1,field2') | all | Returns nested objects grouping entries by the comma-delimited field names | group_by(files, 'isFile, permissions') |
| if(cond, then, else) | 20240828 | Returns 'then' or 'else' depending on the boolean result of 'cond' | if(answer=='n','Hupps...','GREAT!') |
| inc(name) | 20240428 | Increments the counter 'name' provided returning the counter value | [].{ id: inc('my_counter'), title: title } | 
| index_of(str, 'search') | 20240209 | Given a string will return the first index where the word 'search' occurs | index_of('This is a test', 'test') |
| insert(obj, 'field', value) | 20240302 | Sets a property path on a map and returns the map | insert(@, 'status', 'valid') |
| join(string, arrayString) | base | Returns a delimited list with the values of a specific array field | join(', ', files[].filename) |
| k2a(map, 'keyREmatch', 'outkey', removeEmpties) | 20240415 | Given a map will only consider keys that match 'keyREmatch' and will output an array with the corresponding values. Optionally a 'outkey' can be added and removeEmpties boolean flag | k2a(@, 'strIngredient', 'ingredients', `true`) |
| keys(object) | base | Returns a list of fields for a corresponding map | keys(files[0]) |
| last_index_of(str, 'search') | 20240209 | Given a string will return the last index where the word 'search' occurs | last_index_of('Test of a test', 'test') |
| length(string/array/object) | base | Returns string length, array length, or the number of object keys | length(@) |
| lower_case(str) | 20240209 | Given a string returns the lowercase converted version | lower_case('AbC') |
| m2a(arrFields, obj) | 20240209 | Given an array of fields returns an array with the corresponding values of the provided object map. | m2a(from_slon('[name \| size]'), @) |
| m4a(obj, 'key') | 20240209 | Given an object map where each entry corresponds to a map will return an array of maps with the extra field 'key' representing the corresponding map entry. | m4a(obj, 'key') |
| map(expression, array) | base | Returns an array mapping | map(&filename == 'openaf.jar', files[]) |
| match(str, 're', 'flags') | 20240209 | Equivalent to javascript's match function return a boolean value if a regular expression is matched to a string with optional flags | match('abc 123', '\\d+', 'g') |
| max(arrayNumber/arrayString) | base | Returns the largest number or string in an array | max(files[].size) |
| max_by(array, expression) | base | Returns the element for which the expression is the maximum | max_by(files[], &size) |
| merge(object, object) | base | Returns the merge of two objects | merge(`{"a":1}`, `{"b":2}`) |
| min(arrayNumber/arrayString) | base | Returns the smallest number or string in an array | min(files[].size) |
| min_by(array, expression) | base | Returns the element for which the expression is the minimum | min_by(files[], &size) |
| mod(a, b) | 20240217 | Returns the remainder of dividing a by b | mod(`5`, `2`)|
| mul(a, b) | 20240217 | Multiplies two numbers | mul(`5`, `2`) |
| not_null(any, ...) | base | Returns the first non-null argument | [].not_null(a,b) |
| now(diff) | 20240302 | Returns the current Unix timestamp in milliseconds minus diff; negative diff selects a future time | now(`0`) |
| nvl(field, value) | 20240216 | Returns the provided value in case a field value is undefined or null | nvl(nullField, 'n/a') |
| oafp(str) | 20240812 | Executes an oafp (inception) with the provided map in JSON or SLON string format | oafp('(file:data.json)') |
| oafpd(data, str) | 20240812 | Executes an oafp (inception) with the provided data and options map in JSON or SLON string format | oafpd(data, '(path:"name")') |
| ojob(file, jsslon) | 20241116 | Executes a 'file' oJob, with 'jsslon' as args, returning the output (if ow.ojob.output is used) | ojob('ojob.io/echo', obj) |
| opath(str) | 20240801 | Inception function to go over other path filters in 'str' applied over the original object before current transformations | files[].{ name: filename, path: opath('originalPath') } | 
| path(obj, str) | 20240801 | Inception function to have other path filters in 'str' applied over 'obj' | path(@, 'filename') |
| progress(value, max, min, size, indicator, space) | 20240712 | Builds a progress string within the given bounds and width | progress(`5`, `10`, `0`, `10`, '#', ' ') |
| random(min, max) | 20241205 | Returns a random integer between the inclusive bounds | random(`0`, `100`) |
| range(size) | 20240502 | Produces an array with exactly 'size' members from 1 to 'size' | range(`15`) |
| ranges(size, start, step) | 20240502 | Produces size numbers using (zero-based index + start) * step | ranges(`3`,`2`,`2`) |
| replace(str, 're', 'flags', 'replaceText') | 20240209 | Equivalent to Javascript's replace function that given a string will search for a regular expression, with the optional flags, a replace with the provided text | replace('This is a test', ' a', 'i', ' not a') |
| reverse(string/array) | base | Reverses a string or array | reverse(@) |
| search_keys(arr, 'text') | all | Returns an array of entries where 'text' was found as part of an object property. | search_keys(files, 'filename') |
| search_values(arr, 'text') | all | Returns an array of entries where 'text' was found as part of an object property value. | search_values(files, '.git') |
| set(obj, name) | 20240305 | Stores obj under a local name and returns obj | set(version, 'ver') |
| setp(obj, path, name) | 20240305 | Given an object will set the value to a name given the provided path | setp(@, 'version', 'ver').packages[].{ name: name, parentVersion: get('ver') } |
| semver(version, operation, arg) | 20240605 | Performs semantic version operations (e.g. 'isGreaterThan', 'isLessThan') on a version string | semver('1.2.3', 'isGreaterThan', '1.2.0') |
| sh(cmd, stdin) | 20241116 | Executes a shell command with a stdin. Returns stdout, stderr, exitcode, cmd and in. | sh('cat', '123').stdout |
| sh_json(cmd, stdin) | 20241116 | Runs a shell command and returns its parsed JSON output | sh_json('printf 123', '') |
| sh_jsslon(cmd, stdin) | 20241116 | Runs a shell command and returns its parsed JSON/SLON output | sh_jsslon('printf 123', '') |
| sh_yaml(cmd, stdin) | 20241116 | Runs a shell command and returns its parsed YAML output | sh_yaml('printf 123', '') |
| sort(arrayNumber/arrayString) | base | Sorts numbers or strings in ascending order | sort(@) |
| sort_by(array, expression) | base | Sorts the provided array by the provided expression | sort_by(files[], &size) |
| split(str, 'sep') | 20240209 | Equivalent to the split Javascript's function for a string given a separator | split(@, `"\n"`) |
| split_re(str, 're') | 20240228 | Equivalent to the split Javascript's function for a string given a regular expression separator | split_re(@, '\\s+')  |
| split_sep(str, sep, arrEnc) | 20240217 | Splits using a separator regexp, respecting and removing enclosure pairs | split_sep(@, ',', `[["(",")"]]`) |
| starts_with(string, prefix) | base | Returns whether a string starts with the prefix | files[?starts_with(filename, 'openaf.jar')] |
| sql_format(sql, format) | 20240528 | Returns a beautified SQL with optional 'format' options map in json/slon. Options: indent (str); uppercase (bool); linesBetweenQueries (num); maxColumnLength (int); skipWhitespaceNearBlockParentheses (bool); language (str) | sql_format(sql, '(uppercase: true)') |
| sort_semver(arrayVersions) | 20240605 | Sorts an array of strings with semantic versioning (e.g. 1.2.3) | sort_semver(@) |
| sort_by_semver(arrayMaps, stringExp) | 20240605 | Sorts and array of maps where a string represents a semantic version (e.g. 1.2.3) | sort_by_semver([], 'version') |
| srandom(min, max) | 20241205 | Returns a secure random integer between the inclusive bounds | srandom(`0`, `100`) |
| sub(a, b) | 20240217 | Subtracts the second number from the first | sub(`5`, `2`) |
| substring(str, ini, end) | all | Returns the substring between zero-based indices, excluding end | substring(@, `0`, `5`) |
| sum(arrayNumber) | base | Returns the sum of an array of numbers | sum(files[].size) |
| t(obj, 'template') | 20240228 | Applies the Handlebars 'template' to the provided array or map | t(@, '{{filename}} ({{size}})') |
| tF(obj, 'template') | 20240228 | Applies the Handlebars 'template', with all OpenAF helpers, to the provided array or map | tF(@, '{{filename}} ({{size}})')  |
| template(a, 'template') | 20240209 | Applies the Handlebars 'template' to the provided array or map | template(@, '{{filename}} ({{size}})') |
| templateF(x, 'template') | 20240209 | Applies the Handlebars 'template', with all OpenAF helpers, to the provided array or map | templateF(@, '{{filename}} ({{size}})') |
| timeago(num) | 20240209 | Given a ms timestamp will return a human readable string of how long ago that timestamp occurred. | files[].{path:filepath,howLongAgo:timeago(lastModified)} |
| timeagoAbbr(num) | 20240810 | Given a ms timestamp will return an abbreviated human readable string of how long ago that timestamp occurred. | files[].{path:filepath,howLongAgo:timeagoAbbr(lastModified)} |
| to_array(any) | base | Transforms any input into an array | to_array(`true`) |
| to_base64(str) | 20251115 | Given a string will return the base64 encoded version of it | to_base64('Hello World!') |
| to_bytesAbbr(x) | 20240209 | Given an absolute number of bytes will return a string with unit abbreviation. | to_bytesAbbr(`12345678`) |
| to_csv(obj, options) | 20240801 | Given an object will try to convert it to CSV with $csv options | to_csv(@, '(withDelimiter:"\|",withHeader:false)') |
| to_date(x) | 20240209 | Tries to convert a value to a date | to_date(createDate) |
| to_datef(str, 'pattern') | 20240228 | Uses a Java date format to convert a string into a date | to_datef(createDate, 'yyyyMMdd') |
| to_isoDate(x) | 20240209 | Tries to convert a string into an ISO date format string | to_isoDate( to_datef(createDate, 'yyyyMMdd') ) |
| to_json(obj, 'space') | 20240215 | Given an object will return the JSON string representation of it with the provided spacing | to_json(@, '') |
| to_kyaml(obj, isMultiDoc, shouldColor) | 20251115 | Returns KYAML with boolean multi-document and color controls | to_kyaml(@, `false`, `false`) |
| to_map(arr, 'field') | all | Given an array it will return a map where each entry is a property using the provided field with a map as value. | to_map(files, 'filename') |
| to_ms(date) | 20240810 | Converts a Date to Unix milliseconds; other values pass through unchanged | to_ms(createDate) |
| to_numAbbr(num) | 20240209 | Given an absolute number will return a string with SI abbreviation | to_numAbbr(`12345678`) |
| to_number(any) | base | Transforms any input into a number | to_number(`123`) |
| to_numSpace(num, space) | 20241207 | Transforms a number input to a string with thousands separator 'space' | to_numSpace(`123456`, ',') |
| to_slon(obj) | 20240215 | Given an object will return the SLON representation of it. | to_slon(@) |
| to_string(any) | base | Transforms any input into a string | to_string(`123`) |
| to_toml(obj) | 20240502 | Given an object outputs a TOML format string if possible | to_toml(@) |
| to_toon(obj) | 20260116 | Given an object will return the TOON representation of it. | to_toon(@) |
| to_xml(obj) | 20251115 | Given an object will return the XML representation of it. | to_xml(@) |
| to_yaml(obj, isMultiDoc) | 20240215 | Given an object will return the YAML representation of it with a boolean controlling multi-document output | to_yaml(@, `true`) |
| trim(str) | 20240209 | Given a string will return a trimmed version of it | trim(@) |
| type(any) | base | Returns the type of any input | type(to_number(`123`)) |
| unique(arr) | all | Given an array will return a new de-duplicated array. | unique([]) |
| upper_case(str) | 20240209 | Given a string returns the uppercase converted version | upper_case('AbC') |
| unset(obj, name) | 20240428 | Removes a value from OpenAF shared storage and returns obj | unset(@, 'my_counter') |
| values(a) | base | Returns an array with all the values of a map | values(files[0]) |

Example:

```bash
# Given all AWS EC2 instances in an account produces a table with name, type, vpc and private ip sorted by vpn

aws ec2 describe-instances | ./oafp path="Reservations[].Instances[].{name:join('',Tags[?Key=='Name'].Value),type:InstanceType,vpc:VpcId,ip:PrivateIpAddress} | sort_by(@, &vpc)" output=ctable
```

## 🏹 From

| Function |
|----------|
| all |
| and |
| andBegin |
| andBetween |
| andBetweenEquals |
| andContains |
| andEmpty |
| andEnds |
| andEquals |
| andGreater |
| andGreaterEquals |
| andIs |
| andLess |
| andLessEquals |
| andMatch |
| andNot |
| andNotBetween |
| andNotBetweenEquals |
| andNotContains |
| andNotEmpty |
| andNotEnds |
| andNotEquals |
| andNotGreater |
| andNotGreaterEquals |
| andNotIs |
| andNotLess |
| andNotLessEquals |
| andNotMatch |
| andNotStarts |
| andNotType |
| andNotWhere |
| andStarts |
| andType |
| andWhere |
| any |
| apply |
| assign |
| at |
| attach |
| average |
| averageBy |
| begin |
| between |
| betweenEquals |
| cartesian |
| contains |
| count |
| countBy |
| define |
| detach |
| distinct |
| each |
| empty |
| end |
| ends |
| equals |
| except |
| filter |
| first |
| fnBy |
| greater |
| greaterEquals |
| group |
| groupBy |
| head |
| ignoreCase |
| intersect |
| is |
| join |
| last |
| less |
| lessEquals |
| limit |
| match |
| max |
| maxBy |
| min |
| minBy |
| mselect |
| none |
| not |
| notBetween |
| notBetweenEquals |
| notContains |
| notEmpty |
| notEnds |
| notEquals |
| notGreater |
| notGreaterEquals |
| notIs |
| notLess |
| notLessEquals |
| notMatch |
| notStarts |
| notType |
| notWhere |
| or |
| orBegin |
| orBetween |
| orBetweenEquals |
| orContains |
| orEmpty |
| orEnds |
| orEquals |
| orGreater |
| orGreaterEquals |
| orIs |
| orLess |
| orLessEquals |
| orMatch |
| orNot |
| orNotBetween |
| orNotBetweenEquals |
| orNotContains |
| orNotEmpty |
| orNotEnds |
| orNotEquals |
| orNotGreater |
| orNotGreaterEquals |
| orNotIs |
| orNotLess |
| orNotLessEquals |
| orNotMatch |
| orNotStarts |
| orNotType |
| orNotWhere |
| orStarts |
| orType |
| orWhere |
| pselect |
| query |
| removed |
| reverse |
| select |
| setWhere |
| skip |
| skipTake |
| skipWhile |
| sort |
| starts |
| stream |
| streamFn |
| sum |
| sumBy |
| tail |
| take |
| takeWhile |
| toDate |
| type |
| union |
| useCase |
| where |

## jq

`jq=` is an alias for `ijq=` and runs after `path`, before transforms. `ojq=` runs after `opath`. Do not supply both `jq` and `ijq`; input and output jq may be combined.

```sh
oafp in=json data='[1,2,3]' jq='map(select(. > 1))' out=json
# [2,3]
oafp in=json data='{"a":2}' jq='.a' ojq='. * 3' out=json
# 6
oafp in=raw data='hello' jq='ascii_upcase' out=json
# "HELLO"
```

Expressions use OpenAF's `$jq` API (jq 1.6 mode), with one JSON value as input. An array remains one input value; use `.[]` to iterate it. Zero emissions (`empty`, or a failing `select`) suppress the record and stop its pipeline. One emission becomes its value; multiple emissions become one collected array. This preserves `null`, `false`, `0`, empty strings, and empty arrays. It does not emit separate pipeline records for multiple jq results.

For NDJSON and `in=json stream=true`, each record is queried directly when any jq filter is present. Other filters in that invocation also receive the record directly, rather than oafp's legacy singleton-array wrapper. Use `ndjsonjoin=true` to query all NDJSON records as one array. The jq expressions run on the calling thread; each call collects its results in memory.

Inputs must be JSON-compatible: plain objects, dense arrays, strings, finite numbers, booleans, or null. Dates, Java objects, undefined values, cycles, and other non-JSON values are rejected; convert them explicitly before the jq stage. An OpenAF runtime providing `$jq` is required. Compile and evaluation errors propagate without partial results. Filesystem imports, jq CLI input streams/options, OpenAF callbacks, and `$path` extension functions are unavailable in jq expressions. jq filters cannot be used as startup filters in file-backed `idesc` mode.

## 🤔 SQL

You can use simple SQL or H2 SQL. Although a table name is not required for simple queries, the input array is available as the `_TMP` table.

## Examples

```bash
# Simple SQL getting specific fields and ordering by one of them

curl -s https://api.github.com/repos/openaf/openaf/releases | oafp sql="select name, tag_name, published_at order by published_at" output=ctable

```

## Using Path, From and/or SQL at the same time

### Using path and from

```bash
# Using "path" to rename fields and then using "from" to limit the number of records

curl -s https://api.github.com/repos/openaf/openaf/releases | oafp path="[].{version:name, description:body}" from="limit(3)"
```

### Use path to select a markdown field and parse it

```bash
# Get just the markdown body of the latest release and parsing it

curl -s https://api.github.com/repos/openaf/openaf/releases | oafp path="[0].body" output=md
```

### Use path projections and SQL aggregation

```bash
# Use path to rename fields and the SQL to group by category of drink

curl -s "https://www.thecocktaildb.com/api/json/v1/1/search.php?s=martini" | oafp path="drinks[].{drink:strDrink,category:strCategory,alchool:strAlcoholic}" sql="select \"category\", count(1) \"count\" group by \"category\"" output=ctable
```
