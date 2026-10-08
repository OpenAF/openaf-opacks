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
$ch("state").create("rocksdb", { path: "./db" });
print(ow.ch.utils.rocksdb.liveStats("state"));
```

Use `ow.ch.utils.rocksdb.cleanDir(path)` to remove stale log files and `liveOptions/liveDBOptions` to introspect configuration
applied to running databases. All JNI dependencies are loaded automatically when the oPack is installed.

## Dependency refresh (2026-10-09)

The 20261009 local package bundles RocksDB JNI 11.1.2 for all six existing
platform templates, matching the library version already shipped on master.
