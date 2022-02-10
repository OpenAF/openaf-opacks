# PEG

Wrapper around the [Peggy](https://github.com/peggyjs/peggy) javascript library enabling the parsing of input text given a provided grammar. 

## Installing 

````shell
$ opack install peg
````

## Example 

````javascript
loadLib("peg.js");

// Create a new instance of the wrapper
var peg = new PEG();

// Prepare the map structure to output the data you need
global.info = { scheme: "", host: "" };

// Add the actions plugin to call callback functions when the scheme a hostname terms are parsed
peg.addPlugin("ActionsPlugin", {
    scheme: t => {
        global.info.scheme = t;
        return t;
    },
    hostname: t => {
        global.info.host = t;
        return t;
    }
});

// Load the URI RFC3986 grammar
peg.loadGrammar("ietf/rfc3986-uri.pegjs");

// Running the parse
peg.parse("https://openaf.io");

sprint(global.info);
// scheme: https
// host: openaf.io
````

## Reference

### Grammars

Included grammars:

| Grammar | Description | Source URL |
|---------|-------------|------------|
| arithmetics | Parses simples expressions like '(2 + 2) * 3' | https://github.com/peggyjs/peggy |
| css | Parse css definitions | https://github.com/peggyjs/peggy |
| javascript | Parse javascript code | https://github.com/peggyjs/peggy |
| json | Parse JSON strings | https://github.com/peggyjs/peggy |
| ietf/rfc3339-timestamps | Parses RFC3389 timestamps | https://github.com/for-GET/core-pegjs |
| ietf/rfc3986-uri | Parses RFC3986 URIs | https://github.com/for-GET/core-pegjs |
| ietf/rfc5234-core-abnf | Provides a core definition for ietf basd grammars | https://github.com/for-GET/core-pegjs |

### Plugins

Included plugins:

| Plugin | Description | Options |
|--------|-------------|---------|
| **ActionsPlugin** | Enables to execute callbacks when specific terms are parsed | map with a function receiving the parsed text and location for the term designated by the key term. |
| **DebugPlugin** | Prints out the text and location details of each term parsed | n/a |