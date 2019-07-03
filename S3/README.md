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