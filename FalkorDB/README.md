# FalkorDB opack

OpenAF wrapper around the official JFalkorDB Java client.

## Usage

```javascript
loadLib("falkordb.js");

var fdb = new FalkorDB("127.0.0.1", 6379, "demo");
fdb.query("CREATE (:Person {name: 'Alice'})");
fdb.createOrUpdateNode("Alice", "Person", { age: 30, city: "Lisbon" });
fdb.linkNodes("Alice", "Person", "Bob", "Person", "KNOWS", { since: 2024 });
var res = fdb.readOnlyQuery("MATCH (n:Person) RETURN n.name AS name");
print(res);
fdb.close();
```

`createOrUpdateNode(name, type, properties)` merges a `:Node` by `name` and `type`, then applies the provided properties map.

`linkNodes(fromName, fromType, toName, toType, relationship, properties)` merges two `:Node` entries by `name` and `type`, creates the relationship between them, and applies the provided relationship properties map.

## OpenAF channel

`falkordb.js` also provides `ow.ch.__types.falkordb`. On channel creation, `options.label` is mandatory and names the key field whose string value becomes the FalkorDB node label. Set `options.keyFields` to the list of additional channel key properties that uniquely identify a node within that label. In practice you should set `keyFields` whenever you expect `getKeys()`, `getAll()`, `pop()`, or `shift()` to preserve non-key properties correctly. Channel values are persisted directly as node properties, and graph-wide operations such as `size` and `destroy` apply to the whole configured graph. Set `options.timestamps` to `true` to also persist `createdAt` and `updatedAt`; it defaults to `false`. Set `options.typeField` to control which special field name is used in channel keys for the FalkorDB node label; it defaults to `_TYPE`. Set `options.edgesField` to control which special field name is used for outgoing edges in channel values; it defaults to `_EDGES`.

Channel reads such as `get`, `getAll`, `pop`, and `shift` convert Java map results into native OpenAF/JavaScript maps with `af.fromJavaMap`.

`getKeys()` returns key maps containing only `typeField` and the configured `keyFields`. `get()` and `getAll()` return node values without those key fields, and add `edgesField` when configured.

`getAll()` also accepts an optional GQL/Cypher query instead of the usual `full` flag. You can pass either a query string or a map like `{ gql: "MATCH (n:Person) RETURN n.name AS name", params: { ... }, readOnly: true }`. Query mode returns the raw row maps from FalkorDB, while the default mode still returns channel values.

Examples:

```javascript
$ch("people").getAll("MATCH (n:Person) RETURN n.name AS name");
$ch("people").getAll({ gql: "MATCH (n:Person) WHERE n.age > $age RETURN n", params: { age: 30 } });
$ch("people").getAll({ query: "CREATE (n:Tmp {name:$name}) RETURN n", params: { name: "x" }, readOnly: false });
```

Edges use an array of `{ type, target, properties, value }` entries. `type` is the relationship name, `target` identifies the destination node and may include either the configured `label` field or `typeField`, `properties` applies relationship properties, and `value` optionally updates the destination node properties.

You can create a channel directly from an instance with `getCh`:

```javascript
var ch = fdb.getCh("people", { label: "type", keyFields: ["name"], timestamps: true, typeField: "_TYPE", edgesField: "_EDGES" });
ch.set(
  { _TYPE: "Person", name: "Alice" },
  {
    city: "Lisbon",
    _EDGES: [
      {
        type: "KNOWS",
        target: { _TYPE: "Person", name: "Bob" },
        properties: { since: 2024 },
        value: { name: "Bob", city: "Porto" }
      }
    ]
  }
);
var alice = ch.get({ _TYPE: "Person", name: "Alice" });
print(ch.getKeys()[0]._TYPE);
print(alice._EDGES[0].target.name);
```
