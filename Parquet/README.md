# Parquet

Provides a wrapper around handling Parquet files.

## Usage

Installing the Parquet oPack:

```bash
opack install parquet
```

## Quick start

```javascript
loadLib("parquet.js")

var parquet = new Parquet()
parquet.fromArray("test.parquet", [
    { name: "John", age: 30 },
    { name: "Jane", age: 25 }
])

var rows = new Parquet().loadFile("test.parquet").toArray()
// [ { name: "John", age: 30 }, { name: "Jane", age: 25 } ]
```

## API

### `new Parquet()`

Creates a new wrapper instance. Nothing is opened until `loadFile` is called.

---

### `parquet.loadFile(aFile) : Parquet`

Points the instance at `aFile` for reading. Throws `"File not found."` if it doesn't exist.
Returns `this`.

---

### `parquet.close()`

Resets the currently loaded file (parquet-floor reads a file per-call rather than holding a
persistent stream open, so this just clears the wrapper's own state).

---

### `parquet.getSchema() : Array`

Returns an array with one entry per top-level schema field: `{ name, repetition, type,
logicalType? }`. Nested `GROUP` fields are reported by name/repetition only, without
descending into their children.

---

### `parquet.getMeta() : Map`

Returns the file's key/value metadata (`FileMetaData.getKeyValueMetaData()`) as a plain map.

---

### `parquet.getStats() : Map`

Returns `{ blockCount, rowCount, compressedSizeInBytes, uncompressedSizeInBytes, codec,
fileSizeInBytes }`, computed from the file's row-group (block) footer metadata.

---

### `parquet.forEach(aFn, fieldMapper)`

Calls `aFn(row)` once per row. Each row is a plain object keyed by the dot-joined column path
(e.g. `"tags.environment"` for a `MAP` column entry).

`fieldMapper` is optional: a function receiving the raw `String[]` column path for each field,
returning either the string key to use for that field in the row object, or `null`/`__` to skip
the field entirely. When a `fieldMapper` is given, the wrapper's hydrator uses whatever it
returns directly as the row key (via `String(...)`), so the mapper is responsible for returning
a sensible string key itself.

---

### `parquet.toArray(fieldMapper) : Array`

Convenience wrapper around `forEach` that collects every row into an array. See `forEach` for
the `fieldMapper` argument.

---

### `parquet.fromArray(aFile, aArray, aSchema)`

Writes `aArray` to `aFile` as a Parquet file.

| Argument | Type | Description |
|---|---|---|
| `aFile` | String | Output filename |
| `aArray` | Array | Rows to write (each a plain object) |
| `aSchema` | Array | Optional explicit schema: `[{ name, type }, ...]` where `type` is one of `DOUBLE`, `BOOLEAN` or `STRING`; inferred from `aArray[0]`'s keys if omitted |

Inferred fields are always `OPTIONAL`, so rows may omit keys (they read back as `null`). JS
`number` → `DOUBLE`, `boolean` → `BOOLEAN`, and everything else (including `Date`, serialized
with `.toISOString()`) → `STRING`/`BINARY`. A row's `null`/`undefined` values are simply not
written for that field, which is how parquet-floor represents an `OPTIONAL` field being absent.

> **No codec control**: the underlying `blue.strategic.parquet.ParquetWriter.writeFile(schema,
> file, dehydrator)` API doesn't expose a compression-codec parameter, so files are always
> written with whatever codec it defaults to internally (currently SNAPPY).
>
> **Flat schemas only**: `fromArray`'s schema inference only produces top-level primitive
> fields (`DOUBLE`/`BOOLEAN`/`BINARY`) — there's no support for inferring nested `GROUP`,
> `LIST` or `MAP` columns. `getSchema()`'s read side has the same top-level-only limitation.

---

### `parquet.getFile() : Object`

Returns the raw underlying `java.io.File` currently loaded, for anything not covered by the
wrapper above.

## Running the tests

```bash
ojob tests/autoTestParquet.yaml
```

## oafp usage

### ⬇️  Parquet input types:

Extra input types added by the Parquet lib:

| Input type | Description |
|------------|-------------|
| parquet    | Reads a Parquet file |

#### 🧾 Parquet input options

List of options to use when _in=parquet_:

| Option | Type | Description |
|--------|------|-------------|
| inparquetstats  | Boolean | Returns the row group (block) count, row count, compressed/uncompressed sizes, codec and file size |
| inparquetmeta   | Boolean | Returns the Parquet key/value metadata as a map |
| inparquetschema | Boolean | Returns the Parquet schema |

### ⬆️  Parquet output types

Extra output formats added by the Parquet lib:

| Output format | Description |
|---------------|-------------|
| parquet        | Writes a Parquet file |

#### 🧾 Parquet output options

List of options to use when _out=parquet_:

| Option | Type | Description |
|--------|------|-------------|
| parquetfile   | String | The Parquet filename to create |
| parquetschema | Map | A JSON/SLON string to force the schema to use: an array of { name, type } where type is one of DOUBLE, BOOLEAN or STRING. |

> Example of a schema: parquetschema="[(name: id, type: DOUBLE) | (name: value, type: STRING)]"

> See the `parquet.fromArray` API notes above for the codec and schema-inference limitations
> that also apply to this output type.

### Examples of usage with _oafp_

> Don't forget to install the parquet opack first

#### Check the oafp parquet help

```bash
oafp libs=parquet help=parquet
```

### Get statistics of a Parquet file

```bash
oafp libs=parquet samples/sample.parquet inparquetstats=true
```

### Retrieve specific fields from an input parquet file into a csv

```bash
oafp libs=parquet samples/sample.parquet sql="select name, age, city order by name" out=csv
```

### Add sample data to an output parquet file

```bash
oafp data="[(name: John, age: 30) | (name: Jane, age: 25)]" in=slon out=json libs=parquet out=parquet parquetfile=test.parquet
```

### Copy specific data from an input parquet file into another parquet file

```bash
oafp libs=parquet samples/sample.parquet sql="select name, age" out=parquet parquetfile=test.parquet
```

### Retrieve a Parquet file's metadata

```bash
oafp libs=parquet samples/sample.parquet inparquetmeta=true
```

### Retrieve a Parquet file's schema

```bash
oafp libs=parquet samples/sample.parquet inparquetschema=true
```
