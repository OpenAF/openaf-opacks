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

## 📝 Examples

### Weather JSON output to a markdown report

Taking the JSON output from a weather service and converting it into a markdown report.

Let's start by creating the HandleBars template (save it as _weather.hbs_):

```handlebars
# Weather report ({{nearest_area.0.areaName.0.value}}, {{nearest_area.0.country.0.value}})

## Currently ({{current_condition.0.observation_time}})

{{#with current_condition}}
| |
|---|
| 🌡️  {{0.weatherDesc.0.value}} with a temperature of {{0.temp_C}}°C ({{0.temp_F}}°F) - feels like {{0.FeelsLikeC}}°C ({{0.FeelsLikeF}})°F |
| 💨 {{0.windspeedKmph}} km/h ({{0.windspeedMiles}} miles/h) winds from the {{0.winddir16Point}}. |
| 💦 {{0.humidity}}% humidity. |
| ☔️ {{0.precipMM}}mm of precipitation expected. |
| 🌥️  {{0.cloudcover}}% cloud cover. |
| 🌫️  Visibility is {{0.visibility}} km ({{0.visibilityMiles}} miles) |
| 🛞  Pressure is {{0.pressure}} mbar. |
| 🌞 UV index is {{0.uvIndex}}. |
| 🌞 The sun rises at {{../weather.0.astronomy.0.sunrise}} and sets at {{../weather.0.astronomy.0.sunset}}. |
| 🌙 The moon rises at {{../weather.0.astronomy.0.moonrise}} and sets at {{../weather.0.astronomy.0.moonset}}. |
| 🌙 The moon phase is {{../weather.0.astronomy.0.moon_phase}}. |
{{/with}}

## Forecast

{{#each weather}}
### {{date}}

| Hour | Weather | Temperature | Feels like | Wind | Humidity | Precipitation | Visibility | Pressure | UV Index |
|---|---|---|---|---|---|---|---|---|---|
{{#each hourly}}
| {{$ft '%04d' ($number time)}} | {{weatherDesc.0.value}} | {{tempC}}°C ({{tempF}}°F) | {{FeelsLikeC}}°C ({{FeelsLikeF}}°F) | {{windspeedKmph}} km/h ({{windspeedMiles}} miles/h) from the {{winddir16Point}} | {{humidity}}% | {{precipMM}}mm | {{visibility}} km ({{visibilityMiles}} miles) | {{pressure}} mbar | {{uvIndex}} |
{{/each}}
---
{{/each}}
```

Now execute (changing the location if needed):

```bash
# Using oafp to parse the generated markdown
curl -s "wttr.in/Paris?view=j1" | oafp output=template template=weather.hbs | oafp input=md

# Saving the generated markdown
curl -s "wttr.in/New%20York?view=j1" | oafp output=template template=weather.hbs > weather.md
```