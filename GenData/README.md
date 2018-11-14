# GenData

Helps in the quick generation of dummy data with already provided/custom lists and already provided/custom functions (including telecom functions) and lists.

## How to install it

````
opack install GenData
````

## How to use it

First of all load it:

````
load("genData.js");
````

### Simple example

Using the provided list of names and the generator of sample phone numbers, executing:

````javascript
genData()
.loadList("names", "lists/clients/list_names.yaml")
.generate((g, f) => { 
    return { 
        name  : g.getFromList("names").name,
        number: f.genPhone(g, "GB", "mobile").phone 
    }; 
}, 3).dump()
````

results in a similar result to:

````javascript
[
  {
    "name": "Kian Walsh",
    "number": "7991699324"
  },
  {
    "name": "Jeffrey Shannon",
    "number": "7921242841"
  },
  {
    "name": "Alondra Schroeder",
    "number": "7572383939"
  }
]
````

## Helper functions

### Core

#### Generating a random long

Generate a random long with x limit amount of digits.

````javascript
> genData().randomLong(5);
35158
````

#### Generating a random long string

This will generate a string padding with zeros to the right if needed to ensure the provided size.

````javascript
> genData().randomLongString(100);
5490806517385768055076223657184418799061856542776670635937531744603042016670896166070568710920243000
````

#### Generating a random float

This allows you to generate a random float with a limit number of digits and decimal digits.

````javascript
> genData().randomFloat(5, 3)
40429.719
````

#### Generating a random long between a integer range

This allows you to generate a random integer within an integer range.

````javascript
> genData().randomRange(5, 10)
7
````

#### Generating a random date within a range

This allows you to generate a random date within a range of dates formated from a date format (see ow.format.toDate help for format help).

````javascript
> genData().randomDateRange("yyyyMMdd HHmmss", "20181105 120000", "20181105 135959")
"2018-11-05T12:29:47.589Z"
````

#### Generating a random string based on a regular expression

Providing a regular expression a valid random string will be generated.

````javascript
> genData().randomRegEx("[0-9]{2}-[A-Z]{2}-[0-9]{2}");
68-DY-57 
````

_Note: Java regular expressions are supported._

## More examples

Generating date ranges:

````javascript
$from( genData()
.generate((g, f) => {
  var m = g.oneOf([
    { l: "INFO", m: "Login in app for user X", w: 35 },
    { l: "INFO", m: "Logout of app for user X", w: 35 },
    { l: "WARN", m: "Processing huge as started.", w: 30 }
  ], "w");

  return {
    "@timestamp": g.randomDateRange("yyyyMMdd HHmmss", "20181102 000000", "20181105 235959"),
    host: "myhost",
    level: m.l,
    message: m.m
  };
}, 10).dump() 
).sort("@timestamp").select();
````

results in a similiar result to (using the printTable function):

|             @timestamp               | host |level|          message |
|--------------------------------------|------|-----|------------------|
| Fri Nov 02 2018 20:58:43 GMT-0000 (GMT)|myhost|WARN |Processing huge as started. |
| Sat Nov 03 2018 04:33:29 GMT-0000 (GMT)|myhost|WARN |Processing huge as started. |
| Sat Nov 03 2018 13:42:17 GMT-0000 (GMT)|myhost|INFO |Login in app for user X |
| Sat Nov 03 2018 15:25:51 GMT-0000 (GMT)|myhost|INFO |Logout of app for user X |
| Sat Nov 03 2018 20:26:54 GMT-0000 (GMT)|myhost|WARN |Processing huge as started. |
| Sun Nov 04 2018 01:04:47 GMT-0000 (GMT)|myhost|INFO |Logout of app for user X |
| Sun Nov 04 2018 06:34:36 GMT-0000 (GMT)|myhost|WARN |Processing huge as started. |
| Mon Nov 05 2018 01:05:02 GMT-0000 (GMT)|myhost|INFO |Login in app for user X |
| Mon Nov 05 2018 08:00:30 GMT-0000 (GMT)|myhost|INFO |Login in app for user X |
| Mon Nov 05 2018 18:20:46 GMT-0000 (GMT)|myhost|WARN |Processing huge as started. |