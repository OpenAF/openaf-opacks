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