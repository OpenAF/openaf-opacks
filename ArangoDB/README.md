# ArangoDB opack

OpenAF wrapper around the official Java ArangoDB driver.

## Usage

```javascript
loadLib("arangodb.js");

var adb = new ArangoDB("127.0.0.1", 8529, "_system", "root", "password");
var res = adb.query("FOR d IN @@col LIMIT 5 RETURN d", { "@col": "users" });
print(res);
adb.close();
```

