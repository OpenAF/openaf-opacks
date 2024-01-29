# OpenAF processor template

The _output=template_ option uses javascript [Handlebars](https://handlebarsjs.com/guide/) library.

Additionally OpenAF processor uses the following Handlebars custom helpers.

## 🎯 Generic OpenAF helpers

Here are some of the available helpers:

| Helper | Description |
|--------|-------------|
| $stringify      | shows a JSON representation of the provided parameter |
| $stringifyInLine| shows a JSON representation, without spaces, of the provided parameter |
| $toYAML         | shows the YAML version of the parameter  | 
| $toJSON         | shows the JSON version of the parameter  | 
| $env            | shows the current environment variable identified by the parameter |
| $escape         | shows an escaped version of the parameter | 
| $acolor         | shows an ansi color (first argument) escape sequence of the string parameter (second argument) |
| $f              | uses the $f format function                | 
| $ft             | uses the $ft format function               | 
| $path           | uses the $path function to query objects   | 
| $from           | uses the $from & fromNLinq to query objects | 
| $toSLON         | shows the ow.format.toSLON version of an object |
| $get            | shows the corresponding value for a key on $get |
| $getObj         | equivalent to $get with the extra parameter for $$.get path |
| $dateDiff       | shows a number of seconds for a provided date optionally (second argument) with minutes, hours, days, months, weeks or years and (third argument) a default value | 
| $switch         | equivalent to a javascript switch          | 
| $case           | to be used with $switch for each case      | 
| $default        | to be used with $switch for each case      | 
| $ptable         | shows an ansi ascii printTable representation of an object  |
| $ptree          | shows an ansi ascii printTree representation of an object  |
| $output         | shows an $output representation of an object (aObj as 1st arg and options in slon as 2nd arg) |
| $cjson          | shows an ansi ascii colority representation fo an object  |
| $cslon          | shows an ansi ascii colored SLON representation of an object |
| $pmap           | shows an ansi ascii printMap representation of an object |
| $jsmap          | shows a HTML representation of an object | 
| $t              | given a template and an object instance, as arguments, will process and return the template  |
| $date           | converts the argument provided to date     | 
| $isoDate        | converts the argument provided to an ISO date string  |
| $number         | casts the argument provided to number      | 
| $boolean        | casts the argument provided to boolean     | 
| $string         | casts the argument provided to string      | 
| $keys           | shows an array of keys of the provided map  |
| $values         | shows an array of values of the provided map  |
| $alen           | shows the ansi length of the argument provided  |
| $len            | shows the string length of the argument provided  |
| $repeat         | shortcut to the OpenAF's repeat function   | 
| $range          | shortcut to the OpenAF's range function    | 
| $a2m            | shortcut to the OpenAF's $a2m function     | 
| $a4m            | shortcut to the OpenAF's $a4m function     | 
| $m2a            | shortcut to the OpenAF's $m2a function     | 
| $m4a            | shortcut to the OpenAF's $m4a function       |
| $pass           | shows an empty string                      |
| $sline          | shortcut to the OpenAF's format withSideLine |
| $set            | block set of a provided key                  |
| $concat         | concatenates all arguments as a single value |

## 🤨 Conditional helpers

Here are some of the available conditional helpers:

| Helper | Description |
|--------|-------------|
| and | Enables building a block that runs if A 'and' B is true |
| compare | Enables building a block evaluating 'A' 'operation' 'B'. Operation can be: ==, ===, !=, !==, <, >, <=, >= and typeof  |
| contains | Enables building a block that runs if string 'A' contains string 'B' |
| gt | Enables building a block that runs if 'A' is greater than 'B' |
| gte | Enables building a block that runs if 'A' is greater or equal than 'B' |
| startsWith | Enables building a block that runs if string 'A' starts with 'B' |
| endsWith | Enables building a block that runs if string 'A' ends with 'B' |
| match | Enables building a block that runs if string 'A' matchs regular expression 'B' |
| has | Enables building a block that runs if map or array 'A' has 'B' property or element. |
| eq | Enables building a block that runs if 'A' equals to 'B' |
| ifEven | Enables building a block that runs if 'A' is even |
| ifOdd | Enables building a block that runs if 'A' is odd |
| is | Enables building a block that runs if 'A' is 'B' |
| isnt | Enables building a block that runs if 'A' isn't 'B' |
| lt | Enables building a block that runs if 'A' is lower than 'B' |
| lte | Enables building a block that runs if 'A' is lower or equal than 'B'|
| neither | Enables building a block that runs if 'A' and 'B' are not defined or false |
| or | Enables building a block that runs if A 'or' B is true |
| unlessEq | Enables building a block that runs unless 'A' equals to 'B' |
| unlessGt | Enables building a block that runs unless 'A' greater than 'B' |
| unlessLt | Enables building a block that runs unless 'A' lower than 'B' |
| unlessGteq | Enables building a block that runs unless 'A' greater than or equals 'B' |
| unlessLteq | Enables building a block that runs unless 'A' lower than or equals 'B' |

> See examples in https://assemble.io/helpers/helpers-comparison.html