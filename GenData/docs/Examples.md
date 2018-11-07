# Examples

## Generate subscribers

Generating sample numbers, IMSI, SIM ICCID and IMEIs using a provided list of random names of subscribers:

````javascript
genData()
.loadList("names", "lists/clients/list_names.yaml")
.generate((g, f) => { 
    return { 
        name  : g.getFromList("names").name, 
        msisdn: f.genPhone(g, "US", "mobile").phone, 
        imsi  : f.genIMSI(g, "US", "Verizon Wireless").imsi, 
        iccid : f.genICCID(g, "US", "Verizon Wireless"), 
        imei  : f.genIMEI(g, g.oneOf([
            { m: "Apple iPhone 5",     w: 50 },
            { m: "Apple iPhone 4s",    w: 15 },
            { m: "Nokia 3310",         w: 25 },
            { m: "Sony Ericsson W580", w: 10 }
        ], "w")).imei
    };
}, 5)
.dump()
````

results in a similar result to:

````javascript
[
  {
    "name": "Madilyn Ramos",
    "msisdn": "7738896529",
    "imsi": "310004607232500",
    "iccid": "89180851501038199197",
    "imei": "013052007556100"
  },
  {
    "name": "Reuben Friedman",
    "msisdn": "3515384487",
    "imsi": "310004547800017",
    "iccid": "89148360878029408808",
    "imei": "013346003615337"
  },
  {
    "name": "Darren Gutierrez",
    "msisdn": "9108995507",
    "imsi": "310004521661351",
    "iccid": "89148695210628015907",
    "imei": "013421008348750"
  },
  {
    "name": "Mina Bishop",
    "msisdn": "4707633203",
    "imsi": "310004198066359",
    "iccid": "89148364247139353831",
    "imei": "351107801745717"
  },
  {
    "name": "Jordon Farrell",
    "msisdn": "8209271067",
    "imsi": "310004750209690",
    "iccid": "89144430255384621702",
    "imei": "013418001508390"
  }
]
````