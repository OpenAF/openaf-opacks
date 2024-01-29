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

## 🏹 From

_tbc_

## 🤔 SQL

_tbc_