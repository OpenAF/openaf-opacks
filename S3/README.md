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

_to be documented_

## ToDo

* oJob library
* Automated tests
* More examples and documentation on this file

## Tested on

* S3 (public)
* MinIO
* ScaleWay Object Storage
