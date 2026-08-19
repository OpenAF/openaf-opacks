# Avro

Provides a wrapper around handling Avro files.

## Usage

Installing the Avro oPack:

```bash
opack install avro
```

## Quick start

```javascript
loadLib("avro.js")

var avro = new Avro()
avro.fromArray("test.avro", [
    { name: "John", age: 30 },
    { name: "Jane", age: 25 }
])

var records = new Avro().loadFile("test.avro").toArray()
// [ { name: "John", age: 30 }, { name: "Jane", age: 25 } ]
```

## API

### `new Avro()`

Creates a new wrapper instance. Nothing is opened until `loadFile` or `loadStream` is called.

---

### `avro.loadFile(aFile) : Avro`

Opens `aFile` for reading. Throws `"File not found."` if it doesn't exist. Any previously open
stream on this instance is closed first. Returns `this`.

---

### `avro.loadStream(aStream) : Avro`

Same as `loadFile` but reads from an already-open input stream (e.g. `io.readFileStream(...)`
or a command's output stream). Returns `this`.

---

### `avro.close()`

Closes the current reader/stream and resets the instance so it can be reused with another
`loadFile`/`loadStream` call.

---

### `avro.getSchema() : Map`

Returns the file's Avro schema as a parsed JS object (via `Schema.toString(true)` → JSON).

---

### `avro.getMeta() : Map`

Returns a map of the file's Avro metadata keys (e.g. `avro.schema`, `avro.codec`). Values whose
text starts with `"{"` are JSON-parsed; everything else is returned as a plain string.

---

### `avro.getStats() : Map`

Walks every block in the file and returns `{ blockCount, sizeInBytes, avgSizePerBlockInBytes,
codec, fileSizeInBytes }`. This fully consumes and closes the reader, so call it before
`forEach`/`toArray` if you need both.

---

### `avro.forEach(aFn, dontConvert)`

Calls `aFn(record)` once per record in the file, then closes the reader (the stream is
single-pass/non-restartable — call `loadFile` again for another pass). By default each
`record` is parsed into a plain JS object (`jsonParse(record.toString())`); pass
`dontConvert: true` to receive the raw Avro `GenericRecord` Java object instead.

---

### `avro.toArray() : Array`

Convenience wrapper around `forEach` that collects every (converted) record into an array.

---

### `avro.fromArray(aFile, aArray, codecToUse, aSchema)`

Writes `aArray` to `aFile` as an Avro container file.

| Argument | Type | Description |
|---|---|---|
| `aFile` | String | Output filename |
| `aArray` | Array | Rows to write (each a plain object) |
| `codecToUse` | String | One of `snappy` (default), `bzip2`, `deflate`, `xz`, `zstandard` |
| `aSchema` | Map | Optional explicit Avro schema; inferred from `aArray[0]`'s keys if omitted |

When inferring the schema, every field is written as `["null", <type>]` (nullable union), with
JS `number` → `double`, `boolean` → `boolean`, and everything else (including `bytearray`,
`array`, `map`) → `string`. Dates are serialized with `.toISOString()`.

> **Field-type coercion limitation**: when writing each row, `fromArray` only special-cases
> field types containing `"double"` or `"boolean"` — every other Avro type (including e.g.
> `"int"`, `"long"`, `"float"`) falls through to `String(value)`. If you pass an explicit
> `aSchema` with a numeric type other than `"double"`, writing will fail with an
> Avro `ClassCastException`. Use `"double"` for numeric fields in a custom schema.
>
> **Codec validation**: `codecToUse` isn't actually validated against its allowed list at
> runtime — an unrecognized value is silently ignored (the file ends up with no codec set)
> rather than raising an error or falling back to `snappy`.

---

### `avro.getStreamReader() : Object`

Returns the raw underlying `org.apache.avro.file.DataFileStream` Java object, for anything not
covered by the wrapper above.

## Running the tests

```bash
ojob tests/autoTestAvro.yaml
```

## oafp usage

### ⬇️  Avro input types:

Extra input types added by the Avro lib:

| Input type | Description |
|------------|-------------|
| avro       | Reads an Avro file (optionally with snappy compression) |

#### 🧾 Avro input options

List of options to use when _in=avro_:

| Option | Type | Description |
|--------|------|-------------|
| inavrostats | Boolean | Returns the number of records/blocks, avg & total blocks size, codec and file size if available | 
| inavrometa  | Boolean | Returns the Avro metadata as a map |
| inavroschema | Boolean | Returns the Avro schema |

### ⬆️  Avro output types

Extra output formats added by the test lib:

| Output format | Description |
|---------------|-------------|
| avro          | Writes an Avro file |

#### 🧾 Avro output options

List of options to use when _out=avro_:

| Option | Type | Description |
|--------|------|-------------|
| avrofile | String | The Avro filename to create | 
| avrocodec  | String | One of the following options: snappy, bzip2, deflate, xz or zstandard |
| avroschema | Map | A JSON/SLON string to force the schema to use. |

> Example of a schema: avroschema="(type: record, name: my_record, fields: [(name: id, type: double) | (name: value, type: string)])"
>
> Note: Avro record/field names can't contain hyphens, and (per the `fromArray` limitation
> above) numeric fields should use `double` -- other numeric types will fail to write.

### Examples of usage with _oafp_

> Don't forget to install the avro opack first

#### Check the oafp avro help

```bash
oafp libs=avro help=avro
```

### Get statistics of an Avro's file

```bash
oafp libs=avro samples/userdata5.avro inavrostats=true
```

### Getting statistics from several files

```bash
find samples/*.avro -exec oafp libs=avro file={} inavrostats=true path="amerge(@,{file:'{}'})" out=json \; | oafp in=ndjson ndjsonjoin=true out=ctable
```

### Retrieve specific fields from an input avro file into a csv

```bash
oafp libs=avro samples/userdata5.avro sql="select id, first_name, last_name, country, email, title order by first_name, last_name" out=csv
```

### Add sample data to an output avro file with a specific codec

```bash
oafp data="[(id: 1, value: aaaaaa) | (id: 2, value: bbbbbb) | (id: 3, value: aaaaaa) | (id: 4, value: bbbbbb)]" in=slon out=json libs=avro out=avro avrofile=test.avro avrocodec=bzip2
```

### Copy specific data from an input avro file into another avro file

```bash
oafp libs=avro samples/userdata5.avro sql="select id, first_name, last_name, country, email, title" out=avro avrofile=test.avro
```

### Retrieve an Avro's file metadata

```bash
oafp libs=avro samples/userdata5.avro inavrometa=true
```

### Retrieve an Avro's file schema

```bash
oafp libs=avro samples/twitter.snappy.avro inavroschema=true
```

