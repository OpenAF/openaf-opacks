# OpenAF processor filters

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

| Function | OpenAF | Description | Example |
|----------|--------|-------------|---------|
| a2m(arrFields, arrValues) | 20240209 | Builds a map given an array of fields and values | a2m(k, v) |
| a4m(arr, 'key', dontRemove) | 20240209 | Converts an array into a map | a4m([], 'name', \`true`) |
| abs(number) | base | The absolute value of a numeric field | [].{y:abs(y)} |
| add(number, number) | 20240217 | Adds two numbers  | add(1, 2) |
| amerge(x, y) | 20240215 | OpenAF's merge with support for arrays | amerge([], from_slon('(stamp:123)')) |
| avg(arrayNumber) | base | The average value of an array of numeric fields | avg([].y) |
| ceil(number) | base | Returns the smallest integer that is equal or less than a specific numeric field value | [].ceil(y) |
| concat(x, y) | 20240209 | Concats arrays or strings | concat('abc', '123') |
| contains(string/array, any) | base | Returns true of false if a string field contains a specific value | files[?contains(filename, 'openaf.jar') == `true` |
| count_by(arr, 'field') | all | Returns a count by array with the '_count' per value of the provided 'field' | count_by([], 'isFile') |
| date_diff(field, 'unit', nullval) | 20240228 | Given a date field will return the numeric difference to now for the provided unit (e.g. seconds, minutes, hours, days, months, weeks, years). Optionally a nullval will be used if no difference can be calculated | date_diff(modifiedDate, 'days', '-1') |
| delete(map, 'field') | all | Remove a field from the provided map | delete(data, 'timestamp')  |
| div(a, b) | 20240217 | Divides two numbers.  | div(6, 2) |
| ends_with(string, array) | base | Returns true if a field has the provided suffix | files[?ends_with(filename, '.jar')] |
| flat_map(x) | all | Returns a flat, one level, version of the provided map. | flat_map(data) |
| floor(number) | base | Returns the greatest integer that is equal or greater than a specific numeric field value | [].floor(y) |
| format(x, 'format') | 20240209 | OpenAF's function $f (similar to printf) with type conversion | format(to_number(`123.12`), '%05.0f') |
| formatn(x, 'format') | 20240209 | OpenAF's function $ft (similar to printf) without type conversion | format(string, '%10s')  |
| from_bytesAbbr(x) | 20240209 | Given a string with a byte abbreviation will convert to bytes | from_bytesAbbr('12GB') |
| from_datef(date, 'format') | 20240228 | Converts a date type into a string given a 'format' (equivalent to OpenAF's ow.format.fromDate) | from_datef(to_datef('20240202', 'yyyyMMdd'), 'yyyy') |
| from_json(str) | 20240215 | Converts a json string representation into an object | from_json('{a:123}')" |
| from_ms(x, 'format') | 20240209 | Shortcut for OpenAF's ow.format.elapsedTime4ms function. The format is represented as a SLON/JSON string | from_ms(`12000`,'(abrev:true)') |
| from_siAbbr(x) | 20240209 | Given a string with SI numeric abbreviation will convert it to the absolute value | from_siAbbr('100m') |
| from_slon(obj) | 20240215 | Converts a slon string representation into an object | from_slon('(abc: 123)') |
| from_timeAbbr(x) | 20240209 | Converts a time abbreviation into ms | from_timeAbbr('12s') |
| group(arr, 'field') | all | Given an array will return a new array grouping the entries for each value of the provided field | group(files, 'isDirectory') |
| group_by(arr, 'field1,field2') | all | Given ar array will return a multi-level array grouping entries for each value of the provided fields (comma delimited) | group_by(files, 'isFile, permissions') |
| index_of(str, 'search') | 20240209 | Given a string will return the first index where the word 'search' occurs | index_of('This is a test', 'test') |
| insert(obj, 'field', value) | 20240302 | Adds a 'field' with the corresponding value to the object. |
| join(string, arrayString) | base | Returns a delimited list with the values of a specific array field | join(', ', files[].filename) |
| keys(object) | base | Returns a list of fields for a corresponding map | keys(files[0]) |
| last_index_of(str, 'search') | 20240209 | Given a string will return the last index where the word 'search' occurs | last_index_of('Test of a test', 'test') |
| length(string/array/object) | base | Returns the size of any array or list | length(keys(files[0])) |
| lower_case(str) | 20240209 | Given a string returns the lowercase converted version | lower_case('AbC') |
| m2a(arrFields, obj) | 20240209 | Given an array of fields returns an array with the corresponding values of the provided object map. | m2a(from_slon('[name | size]'), @) |
| m4a(obj, 'key') | 20240209 | Given an object map where each entry corresponds to a map will return an array of maps with the extra field 'key' representing the corresponding map entry. | m4a(obj, 'key') |
| map(expression, array) | base | Returns an array mapping | map(&filename == 'openaf.jar', files[]) |
| match(str, 're', 'flags') | 20240209 | Equivalent to javascript's match function return a boolean value if a regular expression is matched to a string with optional flags | match('abc 123', '\\d+', 'g') |
| max(number) | base | Returns the maximum of a numeric field | max(files[].size) |
| max_by(array, expression) | base | Returns the element for which the expression is the maximum | max_by(files[], &size) |
| merge(object, object) | base | Returns the merge of two objects | merge([0],[1]) |
| min(number) | base | Returns the minimum of a numeric field | min(files[].size) |
| min_by(array, expression) | base | Returns the element for which the expression is the minimum | min_by(files[], &size) |
| mod(a, b) | 20240217 | Returns the modular of two numbers | mod(`5`, `2`)|
| mul(a, b) | 20240217 | Multiplies two numbers | mul(`5`, `2`) |
| not_null(any) | base | Returns the non-null value between the provided fields | [].not_null(a,b) |
| now(diff) | 20240302 | Returns the current unix timestamp number with a negative diff (or positive for dates in the future) |
| nvl(field, value) | 20240216 | Returns the provided value in case a field value is undefined or null | nvl(nullField, 'n/a') |
| replace(str, 're', 'flags', 'replaceText') | 20240209 | Equivalent to Javascript's replace function that given a string will search for a regular expression, with the optional flags, a replace with the provided text | replace('This is a test', ' a', 'i', ' not a') |
| reverse(array) | base | Reverse the provided array | "reverse(@)" |
| search_keys(arr, 'text') | all | Returns an array of entries where 'text' was found as part of an object property. | search_keys(files, 'filename') |
| search_values(arr, 'text') | all | Returns an array of entries where 'text' was found as part of an object property value. | search_values(files, '.git') |
| sort(array) | base | Sorts the provided array | "sort(@)" |
| sort_by(array, expression) | base | Sorts the provided array by the provided expression | sort_by(files[], &size) |
| split(str, 'sep') | 20240209 | Equivalent to the split Javascript's function for a string given a separator | split(@, '\n') |
| split_re(str, 're') | 20240228 | Equivalent to the split Javascript's function for a string given a regular expression separator | split_re(@, '\\s+')  |
| split_sep(str, sep, arrEnc) | 20240217 | Given a string, a separator regexp and an array of pairs of enclosure chars | split_sep(@, '\\s+', from_slon('[['{'|'}']|['('|')']]'))  |
| starts_with(string, array) | base | Returns true if a field has the provided prefix | files[?starts_with(filename, 'openaf.jar')] |
| sub(a, b) | 20240217 | Substracts two numbers | sub(`2`, `2`) |
| substring(str, ini, end) | all | Given a string will return a sub-string starting on the initial index until the ending index | substring(@, index_of('test'), 5) |
| sum(array) | base | Sums the numberic field of a provided array | sum(files[].size) |
| t(obj, 'template') | 20240228 | Applies the Handlebars 'template' to the provided array or map | t(@, '{{filename}} ({{size}})') |
| tF(obj, 'template') | 20240228 | Applies the Handlebars 'template', with all OpenAF helpers, to the provided array or map | tF(@, '{{\$env 'TITLE'}}: {{filename}}')  |
| template(a, 'template') | 20240209 | Applies the Handlebars 'template' to the provided array or map | t(@, '{{filename}} ({{size}})') |
| templateF(x, 'template') | 20240209 | Applies the Handlebars 'template', with all OpenAF helpers, to the provided array or map | tF(@, '{{\$env 'TITLE'}}: {{filename}}')  |
| timeago(num) | 20240209 | Given a ms timestamp will return a human readable string of how log ago that timestamp occurred. | files[].{path:filepath,howLongAgo:timeago(lastModified)} |
| to_array(any) | base | Transforms any input into an array | to_array(`true`) |
| to_bytesAbbr(x) | 20240209 | Given an absolute number of bytes will return a string with unit abbreviation. | to_bytesAbbr(`12345678`) |
| to_date(x) | 20240209 | Tries to convert a value to a date | to_date(createDate) |
| to_datef(str, 'pattern') | 20240228 | Uses a Java date format to convert a string into a date | to_datef(createDate, 'yyyyMMdd') |
| to_isoDate(x) | 20240209 | Tries to convert a string into an ISO date format string | to_isoDate( to_datef(createDate, 'yyyyMMdd') ) |
| to_json(obj, 'space') | 20240215 | Given an object will return the JSON string representation of it with the provided spacing | to_json(@, '') |
| to_map(arr, 'field') | all | Given an array it will return a map where each entry is a property using the provided field with a map as value. | to_map(files, 'filename') |
| to_numAbbr(num) | 20240209 | Given an absolute number will return a string with SI abbreviation | to_numAbbr(`12345678`) |
| to_number(any) | base | Transforms any input into a number | to_number(`123`) |
| to_slon(obj) | 20240215 | Given an object will return the SLON representation of it. | to_slon(@) |
| to_string(any) | base | Transforms any input into a string | to_string(`123`) |
| trim(str) | 20240209 | Given a string will return a trimmed version of it | trim(@) |
| type(any) | base | Returns the type of any input | type(to_number(`123`)) |
| unique(arr) | all | Given an array will return a new de-duplicated array. | unique([]) |
| upper_case(str) | 20240209 | Given a string returns the uppercase converted version | upper_case('AbC') |
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

## 🤔 SQL

You can use simple SQL or H2 SQL. Althought you don't need to refer the table the data can be refered from the _'_TMP'_ table.

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
