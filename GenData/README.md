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
        number: f.genPhone(g, "GB", "mobile" , true).phone 
    }; 
}, 3).dump()
````

results in a similar result to:

````javascript
[
  {
    "name": "Kian Walsh",
    "number": "+4917996438144"
  },
  {
    "name": "Jeffrey Shannon",
    "number": "+4917176757845"
  },
  {
    "name": "Alondra Schroeder",
    "number": "+4916387928346"
  }
]
````