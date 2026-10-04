# S3

Client to access a compatible S3 object storage.

## Usage

Install it:

````bash
$ opack install S3
````

On a script or on an openaf console:

````javascript
var s3 = new S3("https://s3.fr-par.scw.cloud", apiKey, apiSecret, "fr-par"); // connecting to ScaleWay

var s3 = new S3("https://s3.eu-central-1.amazonaws.com", apiKey, apiSecret, "eu-central-1"); // connecting to AWS S3
````

If `aRegion` is omitted for AWS endpoints, the client tries `AWS_REGION`, then
`AWS_DEFAULT_REGION`, and finally falls back to `us-east-1` to avoid provider
region auto-detection failures on some S3-compatible responses.

### Managing files

Upload to a bucket: 
````javascript
// from the filesystem
s3.putObject("my_bucket", "/my/folder/on/bucket/myFile.zip", "/home/me/myFile.zip");

// from a Java stream object
s3.putObjectStream("my_bucket", "/my/folder/on/bucket/myFile.zip", aJavaStreamObject);

// giving custom metada to store with the object
s3.putObject("my_bucket", "/my/folder/on/bucket/myFile.zip", "/home/me/myFile.zip", {
    processed      : "done",
    numberOfRecords: "56789",
})
````

Download from a bucket:

````javascript
s3.getObject("my_bucket", "/my/folder/on/bucket/my_file.csv", "/my/data/csvs/my_file.csv");

// to a Java stream object
var readStream = s3.getObjectStream("my_bucket", "/my/folder/on/bucket/my_file.csv");

// to a Java stream object from a specific offset for a specific length
var readStream = s3.getObjectStream("my_bucket", "/my/folder/on/bucket/my_file.csv", 12345, 128);
````

### Querying objects with S3 Select

`selectObjectContent` executes an S3 Select SQL expression server-side and returns a Java input stream. Close the stream after consuming it; `stats()` is available on the returned stream after it has been fully read.

Input serialization maps accept `type: "CSV"`, `"JSON"`, or `"PARQUET"`. CSV accepts `compression` (`NONE`, `GZIP`, `BZIP2`), `allowQuotedRecordDelimiter`, `fieldDelimiter`, `recordDelimiter`, `fileHeaderInfo` (`USE`, `IGNORE`, `NONE`), `quoteCharacter`, `quoteEscapeCharacter`, and `comments`. JSON accepts `compression` and `jsonType` (`LINES` or `DOCUMENT`). Output maps accept `type: "CSV"` or `"JSON"`; CSV accepts `fieldDelimiter`, `recordDelimiter`, `quoteCharacter`, `quoteFields` (`ALWAYS` or `ASNEEDED`), and `quoteEscapeCharacter`; JSON accepts `recordDelimiter`. Each delimiter or quote option is a single character. An optional sixth map supports `requestProgress`, `scanStartRange`, and `scanEndRange`.

CSV and JSON (`jsonType: "LINES"`) work against both AWS S3 and MinIO. Parquet is supported by AWS S3 but not enabled by default on MinIO servers.

CSV in, CSV out:

````javascript
// data/people.csv contains: name,age\nAna,17\nBob,21\n
var result = s3.selectObjectContent(
  "my_bucket",
  "data/people.csv",
  "SELECT s.name, s.age FROM S3Object s WHERE CAST(s.age AS INT) >= 18",
  { type: "CSV", fileHeaderInfo: "USE" },
  { type: "CSV" }
);

try {
  var csv = af.fromInputStream2String(result);
  print(csv); // Bob,21
  sprint(result.stats());
} finally {
  result.close();
}
````

JSON Lines in, JSON out:

````javascript
// data/people.jsonl contains one JSON object per line:
// {"name":"Ana","age":17}
// {"name":"Bob","age":21}
var result = s3.selectObjectContent(
  "my_bucket",
  "data/people.jsonl",
  "SELECT s.name FROM S3Object s WHERE s.age >= 18",
  { type: "JSON", jsonType: "LINES" },
  { type: "JSON" }
);

try {
  print(af.fromInputStream2String(result)); // {"name":"Bob"}
} finally {
  result.close();
}
````

Parquet in, JSON out (AWS S3 only):

````javascript
var result = s3.selectObjectContent(
  "my_bucket",
  "data/people.parquet",
  "SELECT s.name FROM S3Object s WHERE CAST(s.age AS INT) >= 18",
  { type: "PARQUET" },
  { type: "JSON" }
);

try {
  print(af.fromInputStream2String(result)); // {"name":"Bob"}
} finally {
  result.close();
}
````

Getting object metadata:

````javascript
var metaDataMap = s3.statObject("my_bucket", "/my/folder/on/bucket/my_file.csv");
````

Listing objects:

````javascript
// List all objects
var myArrayList = s3.listObjects("my_bucket");

// List all objects of a folder
var myArrayList = s3.listObjects("my_bucket", "/my/folder/on/bucket/");

// List all objects with a prefix
var myArrayList = s3.listObjects("my_bucket", "/my/folder/on/bucket/2019-05");
````

Deleting a file on a bucket:

````javascript
s3.removeObject("my_bucket", "/my/folder/on/bucket/myFile.zip");
````

Copying files in buckets:

````javascript
// Copy a file to another bucket
s3.copyObject("my_source_bucket", "/my/csvs/my_csv.csv", "my_target_bucket", "/archive/csvs/my_csv.csv");

// Renaming an object
s3.copyObject("my_bucket", "/my/csvs/my_csv.csv", "my_bucket", "/my/csvs/my_csv.csv.done");

// Changing an existing object metadata
var metadata = s3.statObject("my_bucket", "/my/csvs/my_csv.csv");
metadata.processed = "yes";
s3.copyObject("my_bucket", "/my/csvs/my_csv.csv", "my_bucket", "/my/csvs/my_csv.csv", metadata);
````

### Managing buckets

Listing buckets:
````javascript
var myArrayOfBuckets = s3.listBuckets();
````

Create a new bucket:
````javascript
s3.makeBucket("my_second_bucket");
````

Removing a bucket:
````javascript
s3.removeBucket("my_second_bucket");
````

Verify that a bucket exists:
````javascript
if (!s3.bucketExists("my_second_bucket")) s3.makeBucket("my_second_bucket");
````

### Presigned Get/Put URLs

Obtain a presigned get/put URL:

````javascript
// Providing a presigned url to use with another tool
var url = s3.getPresignedGetObject("my_bucket", "/my/csvs/my_csv.csv", 60 * 60);
print("Use this command on the next hour: wget " + url);

// Providing a presigned url to use with another tool
var url = s3.getPresignedPutObject("my_object", "/my/csvs/new_csv.csv", 60 * 60 * 4);
print("Use this command on the next 4 hours to upload new data: curl -XPOST " + url + " --data-binary new_csv.csv");
````

### Syncing local folders with remote buckets

The planning methods return actions without uploading, downloading or deleting
anything. Review the plan before passing it to `execActions`.

| Method | Behavior |
|---|---|
| `compare(bucket, prefix, localPath)` / `syncActions(...)` | Plan transfers in both directions. For files present on both sides, the newer modification time wins. Files present on only one side are copied to the other. |
| `squashLocalActions(bucket, prefix, localPath)` | Make the local folder match the remote prefix: download changed or missing files and delete local-only files. The remote side is authoritative even if the local copy is newer. |
| `squashRemoteActions(bucket, prefix, localPath)` | Make the remote prefix match the local folder: upload changed or missing files and delete remote-only objects. The local side is authoritative even if the remote copy is newer. |

Comparison uses file size and modification time, not content hashes. Equal sizes
and timestamps are treated as equal. If timestamps match but sizes differ,
bidirectional sync reports a conflict and leaves that file unchanged; one-way
sync uses the authoritative side. Transfers can change modification times, so a
subsequent plan may propose another transfer even when content is unchanged.
The local folder must exist. Plans do not lock either side or provide a snapshot.

```javascript
loadLib("s3.js")
var s3 = new S3(endpoint, accessKey, secret, region)
try {
  // Recursive comparison under backups/, with /data/export as the source.
  var actions = s3.squashRemoteActions("my-bucket", "backups", "/data/export")
  print(actions) // Review, especially delRemote actions.
  // Execute only after reviewing the plan:
  // if (!s3.execActions(actions)) throw new Error("Incomplete S3 sync")
} finally {
  s3.close()
}
```

Nonempty prefixes are normalized to end with `/`; an empty prefix selects the
whole bucket. One-way sync deletes entries missing from its authoritative side.
Within a flat action list, work can run in parallel. Ordered groups such as
`[copyActions, deleteActions]` run one group at a time; a failed or ignored action
prevents subsequent groups. Already completed changes are not rolled back.

### Folder move and deletion plans

`renameFolderActions(sourceBucket, sourcePrefix, targetBucket, targetPrefix)`
returns `[copyActions, deleteActions]`. Keep these groups intact when calling
`execActions` so deletion follows successful copying. Prefixes are literal strings.
Use distinct, non-overlapping prefixes for moves within the same bucket; the
planner does not detect collisions or protect existing destination objects.

`deleteFolderActions(bucket, prefix, recursive)` returns deletion actions. Set
`recursive` to `true` to include nested objects; omission keeps nonrecursive
listing behavior. Review the returned keys before execution.

### oJob sync and copy jobs

Include `s3.yaml` to use `S3 Sync folder` and `S3 Copy object`. For example, save
this job beside the installed library or resolve `s3.yaml` through your oJob path:

```yaml
include:
- s3.yaml
todo:
- name: S3 Sync folder
  args:
    url: https://s3.example.com
    bucket: my-bucket
    prefix: backups
    localPath: /data/export
    squash: remote
    execute: false
```

Supply `accessKey`, `secret` and `region` through your normal runtime configuration.
`execute` defaults to `false`, returning the plan in `args.actions`. Omit `squash`
for bidirectional sync, use `remote` to overwrite/delete remote entries, or
`local` to overwrite/delete local entries. Set `execute: true` to apply the plan.
`numThreads` controls parallelism; `ignore` is an array of action commands to skip
(`get`, `put`, `copy`, `delLocal`, `delRemote`). Skipped or failed execution is
reported as a job error, and the client closes on both success and failure.

`S3 Copy object` takes `sourceBucket`, `sourceObject`, `targetBucket` and
`targetObject`, plus the same endpoint/credential options. It does not require a
separate `bucket` argument. Optional `meta` and `copyOptions` are forwarded to
`copyObject`.

## ToDo

* More examples and documentation on this file

## Tested on

* S3 (public)
* MinIO
* ScaleWay Object Storage

## Corrections (2026-09-18)

`deleteFolderActions(bucket, prefix, beRecursive)` forwards the optional recursion flag to `listObjects`. The default remains nonrecursive; inspect the returned action list before executing it. Sync conflict reporting handles equal timestamps with different sizes.

Run the service-independent regression checks from this directory:

```sh
oaf -f tests/regression.js
oaf -f tests/legacy.js
```

These checks use local fixtures and test doubles; they do not verify a live external service.

## Corrections (2026-10-04)

`renameFolderActions` treats source and destination prefixes literally, including
regular-expression characters and dollar signs.

`execActions` returns `true` only if all actions complete successfully. A failed,
ignored or unknown action returns `false`; no subsequent ordered action group is
started. In particular, a failed or ignored copy phase prevents the delete phase
of a folder move. Actions within a group can still run in parallel, and completed
changes are not rolled back. Check the result and logged errors before retrying.

The 20261004 package also corrects longstanding one-way sync planning: changed
files now follow the chosen source even when its timestamp is older, including
equal-timestamp size conflicts. The normal sync oJob passes all three planning
arguments correctly, and the copy oJob accepts its documented bucket arguments.
The local tests exercise these planners and job bodies without contacting S3.
