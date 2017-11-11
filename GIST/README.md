# oPack GIST

This oPack provides a OpenAF channel implementation to use GitHub's GIST as a object repository. Each GIST can be public or private, anonymous or associated with a GitHub account.

## Installing and loading the implementation

To install simple execute:

````bash
opack install GIST
````

On a script or in the openaf-console execute:

````javascript
load("gist.js");
````

## Creating the channel

To create the channel use the "gist" openaf channel type. To use GISTs associated with a GitHub account provide, as options, the **user** name and oath **token**. When generating the token please ensure that it has the "gist" permission.

````javascript
$ch("a").create(true, "gist", { user: "myGitHubUser", token: "1abc423" });
````

## Accessing the channel

After creating you can check the size and existing keys by using **.size()** and **.getKeys()**. The **.getKeys()** will return all the metadata for each GIST. The **.getSortedKeys()** will display the keys order by modified date.

## Getting data from an existing GIST

Each GIST is composed of one or more files for a given unique id. If you don't provide a filename the "object.json" filename will be assumed by default.

````javascript
$ch("a").get({ id: "aa5a315d61ae9438b18d", file: "ring.erl" });
````

The **.get()** function will return metadata for the corresponding file plus a *content* key. If a file is specified and the GIST type is JSON the *content* key associated value will be parsed into an object.

````javascript
var myObj = $ch("a").get({ id: "ba3b315d61ae9438b18d", file: "my.json" }).content;
````

## Creating or modifying a GIST

If no GIST id is provided to a **.set()** function it will be assumed that the intention is to create a new GIST. By default GIST are created private but you can change this with _public: yes_. You can also optionally provide a description.

````javascript
$ch("a").set({ public: false, description: "my test"}, { a: 1, b: 2 });
````

The value provided, as exemplified, can be any map, array, string or number. Whenever no filename is provide it will be assumed that the filename is _object.json_. If a GIST id is provided as part of the key that GIST will be modified instead of trying to create a new one:

````javascript
$ch("a").set( { id: "ba3b315d61ae9438b18d" }, { a: 2, b: 3 });
````
To provide a filename for a GIST you can:

  * provide a key **file** where the value will be the name as part of the **.set()** key parameter.
  * provide a map of **files** where each key is a filename and the corresponding values must contain a **contents** key.

Example providing the file on the key:

````javascript
$ch("a").set( { id: "ba3b315d61ae9438b18d", file: "other.json" }, { a: 3, b: 3 });
````

Example providing files on the value:

````javascript
$ch("a").set( { id: "ba3b315d61ae9438b18d", { 
    files: { 
        "value1.json": {
            content: "{ \"a\": 1 }"
        }, 
        "value2.json": { 
            content: "{\"a\" : 2}" 
        } 
    } 
});
````

The **.set()**, if successfull, will return the new or modified GIST metadata including the corresponding id needed for the get operation.

## To delete a GIST

To delete a GIST simply provide the GIST id executing:

````javascript
$ch("a").unset({ id: "ba3b315d61ae9438b18d" });
````