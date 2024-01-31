# OpenAF processor filters

## 🪚 Path

The _path=_ filter tool is based on the JMESPath library. To see all the available options please refer to http://jmespath.org. Here are some examples:

### Slicing

* "[0:5]"
* "[5:10]"
* "[:5]"
* "[::2]"
* "[::-1]"

### Projections

* "a[*].first"
* "a.*.b"
* "[]"

### Filters

* "a[?b=='xyz'].c"
* "a[?b>`1`].x"

### MultiSelect

* "a[].[x, y]"
* "a[].{ x: x, y: y }"

### Pipe

* "a[*].b | [0]"

### Base functions

* abs(x)
* avg(x)
* contains(x, y)
* ceil(x)
* floor(x)
* join(x, arr)
* keys(obj)
* length(x)
* map(expr, arr)
* max(x)
* max_by(x, y)
* merge(a, b)
* min(a)
* min_by(a, b)
* not_null(a)
* reverse(arr)
* sort(arr)
* sort_by(a, y)
* starts_with(a, b)
* ends_with(a, b)
* sum(a)
* to_array(a)
* to_string(a)
* to_number(a)
* type(a)
* values(a)

Example:

* a[?contains(@, 'b') == `true`]

### OpenAF custom functions

* count_by(arr, 'field')
* group(arr, 'field')
* group_by(arr, 'field1,field2')
* unique(arr)
* to_map(arr, 'field')
* flat_map(x)
* search_keys(arr, 'text')
* search_values(arr, 'text')
* delete(map, 'field')
* substring(a, ini, end)

Examples:

```bash
# Given all AWS EC2 instances in an account produces a table with name, type, vpc and private ip sorted by vpn

aws ec2 describe-instances | ./oafp path="Reservations[].Instances[].{name:join('',Tags[?Key=='Name'].Value),type:InstanceType,vpc:VpcId,ip:PrivateIpAddress} | sort_by(@, &vpc)" output=ctable
```

## 🏹 From

_tbc_

## 🤔 SQL

You can use simple SQL or H2 SQL. Althought you don't need to refer the table the data can be refered from the _'_TMP'_ table.

Examples:

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
