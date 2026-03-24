# BunnyNet

OpenAF wrapper around the bunny.net APIs using `$rest`.

It focuses on a small, pragmatic interface:

* generic authenticated request methods for the Core, Stream, Storage and Origin Errors APIs
* convenience helpers for common bunny.net resources
* no generated code dependency; everything is plain OpenAF JavaScript

The implementation follows bunny.net's current API documentation and OpenAPI references:

* Core / general API base URL: `https://api.bunny.net`
* Stream API base URL: `https://video.bunnycdn.com`
* Storage API base URL: `https://storage.bunnycdn.com` for the primary region, or `https://{region}.storage.bunnycdn.com` for region-specific endpoints such as `ny` or `sg`
* Origin Errors API base URL: `https://cdn-origin-logging.bunny.net`
* OpenAPI index: `https://docs.bunny.net/openapi`

## Install

```bash
opack install BunnyNet
```

## Load

```javascript
loadLib("bunnynet.js")

var bn = $bunnynet({
  apiKey       : "ACCOUNT_API_KEY",
  streamKey    : "STREAM_API_KEY",
  storageKey   : "STORAGE_ZONE_PASSWORD",
  storageZone  : "my-storage-zone",
  storageRegion: "storage"
})
```

Or with `require`:

```javascript
var bunny = require("bunnynet.js")
var bn = bunny.$bunnynet({ apiKey: "ACCOUNT_API_KEY" })
```

## Generic Requests

### Core API

```javascript
var zones = bn.core("get", "/pullzone")
```

### Stream API

```javascript
var videos = bn.stream("get", "/library/12345/videos")
```

### Storage API

```javascript
var files = bn.storage("get", "", __, __, {
  zone         : "my-storage-zone",
  region       : "storage",
  trailingSlash: true
})
```

### Origin Errors API

```javascript
var logs = bn.originErrors(308006, "10-14-2024")
```

## Examples

### Purge a URL

This wraps the same request style as:

```javascript
$rest({
  requestHeaders: {
    AccessKey: s
  }
}).post(
  "https://api.bunny.net/purge?" + $rest().query({
    url: "https://openaf.io/t8"
  })
)
```

With BunnyNet:

```javascript
bn.purge("https://openaf.io/t8")
```

### Pull zones

```javascript
var allZones = bn.listPullZones()
var oneZone  = bn.getPullZone(12345)
```

### Storage zones

```javascript
var zones = bn.listStorageZones()
var zone  = bn.getStorageZone(12345)
```

### DNS zones

```javascript
var dnsZones = bn.listDNSZones()
```

### Video libraries and videos

```javascript
var libraries = bn.listVideoLibraries()
var videos    = bn.listVideos(12345, { page: 1, itemsPerPage: 100 })
```

### Fetch a remote video into Stream

```javascript
bn.fetchVideo(12345, {
  url  : "https://example.org/video.mp4",
  title: "Imported video"
})
```

### List files in Storage

```javascript
var files = bn.listFiles("", {
  zone  : "my-storage-zone",
  region: "storage"
})
```

### Upload to Storage

```javascript
var data = io.readFileBytes("/tmp/test.txt")

bn.uploadFile("folder/test.txt", data, {
  zone  : "my-storage-zone",
  region: "storage"
})
```

### Download from Storage

```javascript
var out = bn.downloadFile("folder/test.txt", {
  zone  : "my-storage-zone",
  region: "storage"
})
```

### Sync a local folder to Storage

```javascript
bn.sync("/tmp/site", {
  path  : "site",
  zone  : "my-storage-zone",
  region: "storage"
})
```

### Sync from an S3 bucket to Storage

```javascript
bn.syncS3("my-bucket", "/site/", {
  path       : "site",
  zone       : "my-storage-zone",
  region     : "storage",
  s3URL      : "https://s3.eu-central-1.amazonaws.com",
  s3AccessKey: "S3_ACCESS_KEY",
  s3Secret   : "S3_SECRET",
  s3Region   : "eu-central-1"
})
```

## Constructor Options

* `apiKey` or `accessKey`: bunny.net account API key for Core API calls
* `streamKey`: Stream API key. Defaults to `apiKey`
* `storageKey`: Storage zone password / API key. Defaults to `apiKey`
* `storageZone`: default storage zone name for Storage API helpers
* `storageRegion`: default storage endpoint selector. Accepts `storage`, region prefixes like `ny`, or full hostnames/URLs such as `storage.bunnycdn.com` or `https://sg.storage.bunnycdn.com`
* `coreURL`: override core API URL
* `streamURL`: override stream API URL
* `storageURL`: override storage API URL directly; accepts either a full URL or hostname
* `originErrorsURL`: override origin errors API URL
* `requestHeaders`: extra headers merged into every request

## Available Helpers

Core:

* `purge(url, options)`
* `listPullZones(query, options)`
* `getPullZone(id, options)`
* `createPullZone(map, options)`
* `updatePullZone(id, map, options)`
* `deletePullZone(id, options)`
* `listStorageZones(query, options)`
* `getStorageZone(id, options)`
* `createStorageZone(map, options)`
* `updateStorageZone(id, map, options)`
* `deleteStorageZone(id, options)`
* `listDNSZones(query, options)`
* `getDNSZone(id, options)`
* `createDNSZone(map, options)`
* `updateDNSZone(id, map, options)`
* `deleteDNSZone(id, options)`
* `listVideoLibraries(query, options)`
* `getVideoLibrary(id, options)`
* `createVideoLibrary(map, options)`
* `updateVideoLibrary(id, map, options)`
* `deleteVideoLibrary(id, options)`
* `listCountries(query, options)`
* `listRegions(query, options)`
* `getStatistics(query, options)`
* `getBillingSummary(query, options)`
* `getAPIKeys(query, options)`

Stream:

* `listVideos(libraryId, query, options)`
* `getVideo(libraryId, videoId, options)`
* `createVideo(libraryId, map, options)`
* `updateVideo(libraryId, videoId, map, options)`
* `deleteVideo(libraryId, videoId, options)`
* `fetchVideo(libraryId, map, options)`
* `listCollections(libraryId, query, options)`
* `getCollection(libraryId, collectionId, options)`
* `createCollection(libraryId, map, options)`
* `deleteCollection(libraryId, collectionId, options)`

Storage:

* `listFiles(path, options)`
* `uploadFile(path, body, options)`
* `downloadFile(path, options)`
* `deleteFile(path, options)`
* `compare(path, localPath, options)`
* `squashLocalActions(path, localPath, options)`
* `squashRemoteActions(path, localPath, options)`
* `syncActions(path, localPath, options)`
* `execActions(actions, options, logFunction, logErrorFunction, numThreads)`
* `sync(localPath, options)`
* `compareS3(path, s3Bucket, s3Prefix, options)`
* `squashRemoteS3Actions(path, s3Bucket, s3Prefix, options)`
* `execS3Actions(actions, options, logFunction, logErrorFunction, numThreads)`
* `syncS3(s3Bucket, s3Prefix, options)`

Other:

* `originErrors(pullZoneId, date, query, options)`
* `core(method, path, query, body, options)`
* `stream(method, path, query, body, options)`
* `storage(method, path, query, body, options)`

## Notes

* bunny.net uses different credentials for different APIs. In practice `apiKey`, `streamKey` and `storageKey` are often not the same secret.
* For Storage API calls, the endpoint region must match the storage zone's primary region.
* `syncS3` requires the `S3` opack to be installed unless an existing `s3` client instance is provided in the options.
* The wrapper intentionally stays close to the HTTP API so undocumented or newly added endpoints can still be reached through `core`, `stream` and `storage`.
