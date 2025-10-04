# GCS oPack

OpenAF wrapper for Google Cloud Storage (GCS) built on top of the official Java client libraries. It simplifies connecting with
service-account credentials and exposes helpers to list, inspect, and manipulate objects stored in buckets from OpenAF jobs.

## Installation

```bash
opack install GCS
```

## Getting started

1. Download a service-account JSON key with the necessary GCS permissions.
2. Create a wrapper instance by passing the JSON file (or an equivalent map) to the constructor:

```javascript
loadLib("gcs.js");

var gcs = new GCS("service-account.json");
var objects = gcs.listObjects("my-bucket", "reports/", false, true);
print(ow.format.toYAML(objects));
```

The `listObjects` helper mirrors `io.listFiles`, returning metadata such as size, storage class, and custom attributes. Additional
methods let you probe object existence, read metadata, and generate presigned URLs as functionality is completed.

## Notes

The oPack bundles all transitive dependencies required by the `google-cloud-storage` Java client. No manual classpath management is
necessary—once the oPack is installed every OpenAF runtime can immediately leverage the Storage API.
