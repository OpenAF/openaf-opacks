# oPack GIST

This oPack provides a generic OpenAF channel implementation to use GitHub's GIST as a object repository and a object to simplify and examplify it's use. Do remember that each GIST can be public or private, anonymous or associated with a GitHub account and that GitHub as associated limitations depending on the type of GIST.

## Installing and loading

To install simple execute:

````bash
opack install GIST
````

On a script or in the openaf-console execute:

````javascript
loadLib("gist.js");
````

## GIST object


The GIST object provides simplified functionality to allow to use GitHub's GIST as a JSON object repository through which you can easily share JSON objects between OpenAF scripts.

To start you can either use it anonymously:

````javascript
var g = new GIST();
````

Or enter an oAuth token for your account (check GitHub's developer settings documentation on how to create your own oAuth token and ensure it has the 'gist' permission):

````javascript
var g = new GIST({ user: "myGitHubUser", token: "1abc423" });
````

Keep in mind that currently GitHub won't allow you to delete anonymous GIST so to get full funcionality you should probably use an oAuth token.

The GIST object creates an OpenAF channel '__gist' so creating multiple instances will actually refer just to the first created channel. To use different channels (e.g. to use different accounts) please provide the extra options map key *ch* to use another channel name.

### Clipping objects

After initializing a GIST object instance you can start to "clip" your JSON objects into a GIST. Keep in mind that each GIST can have multiple files (e.g. it's really like a small GIT repository) and you should store your JSON objects in a file. To clip a object use **.clip(aFilename, aDescription, aObject)**

````javascript
> var myObj = { a: null, b:1, c: "a", d: true};
> g.clip("myobj.json", "This is a copy of myobj", myObj);
{
  "id": "93b2ee53ddc307",
  "gistURL": "https://gist.github.com/93b2ee53ddc307",
  "fileURL": "https://gist.githubusercontent.com/myGitHubUser/93b2ee53ddc307/raw/b667d4a9e5eb59/myobj.json"
}
````

If successfull you will obtain, as a result:

   * The created GIST ID
   * A gistURL for the full GitHub web interface for this GIST
   * A fileURL to download directly this GIST file.

You can now provide this GIST ID to any other OpenAF script and together with the filename "myobj.json" it will be enough to rebuild this myObj. 

### Getting clipped objects

If you have a GIST ID and a filename it's very easy to rebuild the original object:

````javascript
> g.getClip("93b2ee53ddc307", "myobj.json");
{
    "a": null,
    "b": 1,
    "c": "a",
    "d": true
}
````

Even without the GIST opack you can use the *fileURL* to retrieve it directly:

````javascript
> ow.obj.rest.jsonGet("https://gist.githubusercontent.com/myGitHubUser/93b2ee53ddc307/raw/1a2c34e5e6d7e89/myobj.json")
{
    "a": null,
    "b": 1,
    "c": "a",
    "d": true
}
````

### Modify an existing clipped object

If you use **.clip()** a new GIST will created so how can you change an existing GIST file? Just provide the GIST ID, file and the new object to **.setClip**:

````javascript
> myObj.a = "stuff";
> g.setClip("93b2ee53ddc307", "myobj.json", myObj);
````

The **.setClip** function will return again the GIST ID, GIST URL and file URL in the same way that **.clip** does. Since it's actually a GIT repository if you access the GIT URL you can actually check differences and previous object versions. You can even retrieve a previous commited version if you have the version hash and add it after a '/' to the GIST ID:

````javascript
> g.getClip("93b2ee53ddc307/e2ce131c0c8b5fbbcc", "myobj.json");
````

### Get a list of all GIST

You can obtain a list of your GISTs (if you provided your GitHub account) by executing:

````javascript
> g.getClips()
````

This will return an array with id, description and filenames for each GIST. If you want more details regarding a GIST files just execute:

````javascript
> g.getClips("93b2ee53ddc307");
````

### Unclip a GISTs

Using the GIST ID execute:

````javascript
> g.unClip("93b2ee53ddc307");
````

## GIST OpenAF channel implementation

### Creating the channel

To create the channel use the "gist" openaf channel type. To use GISTs associated with a GitHub account provide, as options, the **user** name and oath **token**. When generating the token please ensure that it has the "gist" permission.

````javascript
$ch("a").create(true, "gist", { user: "myGitHubUser", token: "1abc423" });
````

### Accessing the channel

After creating you can check the size and existing keys by using **.size()** and **.getKeys()**. The **.getKeys()** will return all the metadata for each GIST. The **.getSortedKeys()** will display the keys order by modified date.

### Getting data from an existing GIST

Each GIST is composed of one or more files for a given unique id. If you don't provide a filename the "object.json" filename will be assumed by default.

````javascript
$ch("a").get({ id: "aa5a315d61ae9438b18d", file: "ring.erl" });
````

The **.get()** function will return metadata for the corresponding file plus a *content* key. If a file is specified and the GIST type is JSON the *content* key associated value will be parsed into an object.

````javascript
var myObj = $ch("a").get({ id: "ba3b315d61ae9438b18d", file: "my.json" }).content;
````

### Creating or modifying a GIST

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

### To delete a GIST

To delete a GIST simply provide the GIST id executing:

````javascript
$ch("a").unset({ id: "ba3b315d61ae9438b18d" });
````
