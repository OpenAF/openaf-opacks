# RocksDB oPack

Channel utilities for [RocksDB](https://rocksdb.org/). The oPack bundles the native `rocksdbjni` library and augments the
`ow.ch` channel implementation with helpers to inspect live options, read statistics, and clean log directories for RocksDB-based
stores.

## Installation

```bash
opack install rocksdb
```

## Usage

```javascript
loadLib("rocksdb.js");
ow.ch.use("rocksdb");
ow.ch.create("state", false, { path: "./db" });
print(ow.ch.utils.rocksdb.liveStats("state"));
```

Use `ow.ch.utils.rocksdb.cleanDir(path)` to remove stale log files and `liveOptions/liveDBOptions` to introspect configuration
applied to running databases. All JNI dependencies are loaded automatically when the oPack is installed.
