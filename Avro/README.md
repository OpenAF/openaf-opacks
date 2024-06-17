# Avro

Provides a wrapper around handling Avro files.

## Usage

Installing the Avro oPack:

```bash
opack install avro
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

> Example of a schema: avroschema="(type: record, name: my-record, fields: [(name: id, type: int) | (name: value, type: string)])"

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

### Retrive specific fields from an input avro file into a csv

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

