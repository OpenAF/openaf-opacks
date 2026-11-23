# AWS oPack

## oJob YAML files

The oPack ships four oJob definition files. Include them from your own oJob
(with the `AWS` and `oJob-common` oPacks listed under `ojob.opacks`) and call
their shortcuts from `todo`. Every shortcut registers on a port that must first
be started with `httpdStart` (from `oJobHTTPd.yaml`, pulled in automatically).

| File | Job name | Shortcut | Purpose | Details |
| --- | --- | --- | --- | --- |
| `oJobECR.yaml` | `HTTP Browse - ecr` | `ECRBrowse` | HTML browser for ECR repositories, tags and the image inspector | [ECR options](#ecr-options), [Inspecting ECR images](#inspecting-ecr-images) |
| `oJobECR.yaml` | `HTTP Browse - ecr - API` | `ECRBrowseAPI` | JSON API over a registered ECR browser | [API registration](#api-registration-and-request-parameters) |
| `oJobCodeArtifact.yaml` | `HTTP Browse - codeartifact` | `CodeArtifactBrowse` | HTML browser for CodeArtifact domains, repositories, packages, versions and assets | [CodeArtifact options](#codeartifact-options), [Previewing assets](#previewing-codeartifact-assets) |
| `oJobCodeArtifact.yaml` | `HTTP Browse - codeartifact - API` | `CodeArtifactBrowseAPI` | JSON API over a registered CodeArtifact browser | [API registration](#api-registration-and-request-parameters) |
| `oJobDynamoDB.yaml` | `HTTP Browse - dynamodb` | `DynamoDBBrowse` | HTML browser for an allowlist of DynamoDB tables | [DynamoDB options](#dynamodb-options), [Browsing DynamoDB tables](#browsing-dynamodb-tables) |
| `oJobDynamoDB.yaml` | `HTTP Browse - dynamodb - API` | `DynamoDBBrowseAPI` | JSON API over a registered DynamoDB browser | [API registration](#api-registration-and-request-parameters) |
| `oJobLambda.yaml` | `HTTP AWS Lambda` | `httpdAWSLambda` | Forwards HTTP requests to a Lambda function | [Serving a Lambda function over HTTP](#serving-a-lambda-function-over-http) |

Each job carries a `help` section listing its arguments, which is the
authoritative short reference. A minimal oJob combining several of them:

```yaml
include:
- oJobECR.yaml
- oJobCodeArtifact.yaml

ojob:
  daemon: true
  opacks:
  - oJob-common
  - AWS

todo:
- (httpdStart): 8091
  ((mapLibs)): true
- (ECRBrowse): 8091
  ((uri)): /ecr
  ((region)): eu-west-1
- (CodeArtifactBrowse): 8091
  ((uri)): /codeartifact
  ((region)): eu-west-1
- (ECRBrowseAPI): 8091
  ((uri)): /api/browse
```

Run it with `ojob myBrowse.yaml` and open `http://localhost:8091/ecr` or
`http://localhost:8091/api/browse?browseUri=/ecr&action=list`.

## HTTP browsing

ECR, CodeArtifact and DynamoDB browse jobs accept the oJob-common `options.query`,
`options.preview`, and `options.operations` contract. Enhanced options require
updated oJob-common definitions (browse contract 1), checked before clients are
created. Legacy configurations retain support for the current OpenAF runtime.
API jobs refer to an existing browser; register the browser before serving API
requests. API operations additionally require `operationsBrowseUris` on the API.
POST refresh also requires a configured API `operationsToken` and a matching
`X-OpenAF-Browse-Token` header.

### Browse job shortcuts

Include the YAML file for the provider you want, then register the browser on
the same port as `httpdStart`. The AWS jobs include `oJobBrowse.yaml` from
oJob-common. In a `todo` entry, the shortcut value is the server `port`
(default `8091`). Sibling arguments use double parentheses, such as
`((uri)): /ecr`. Keys inside `((options))` are ordinary YAML keys.

| Include | Browser shortcut | API shortcut |
| --- | --- | --- |
| `oJobBrowse.yaml` | `httpdBrowse` (generic filesystem or callbacks), `httpdBrowser` (registered OpenAF browser type) | `httpdBrowserAPI` |
| `oJobECR.yaml` | `ECRBrowse` | `ECRBrowseAPI` |
| `oJobCodeArtifact.yaml` | `CodeArtifactBrowse` | `CodeArtifactBrowseAPI` |
| `oJobDynamoDB.yaml` | `DynamoDBBrowse` | `DynamoDBBrowseAPI` |

#### Browser registration arguments

| Argument | Browser shortcuts | Meaning and default |
| --- | --- | --- |
| `uri` | All | Browser mount URI. Defaults to `/`. Give each browser on a port its own URI. |
| `options` | All | Map of settings for the chosen browser. Shared renderer, query and provider settings are listed below. |
| `type` | `httpdBrowser` | Name registered under `ow.server.httpd.browse`. Defaults to `files`. The selected type receives `options` directly. |
| `path` | `httpdBrowse`, ECR, CodeArtifact | Generic base path, empty by default. For the filesystem this selects the directory to serve. The AWS providers use the base when matching cache locations for operations. Use the provider's scope settings to limit AWS content. |
| `templates`, `fns` | `httpdBrowse` | Optional maps for custom implementations. The built-in renderer supplies its own markup. Callback names include `init`, `getList`, `getObj`, `renderList`, `renderObj`, `renderEmpty`, `search`, `validate`, `prefetch`, `getStatus`, `getFreshness` and `refresh`. Custom providers enabling operations must supply `validate`. |
| `accessKey`, `secret`, `token` | All three AWS browsers | Optional AWS access key ID, secret access key and session token. Omit them to use the AWS oPack credential chain. |
| `region`, `assumeRole` | All three AWS browsers | AWS region (client default `us-east-1`) and optional IAM role ARN to assume before accessing the service. |
| `cache` | All three AWS browsers | Provider cache lifetime in milliseconds. Enhanced ECR, enhanced CodeArtifact and DynamoDB default to `5000`. |
| `browse`, `logo`, `incURI`, `sortTab` | ECR, CodeArtifact | Shortcut arguments for the shared renderer's `browse`, `logo`, `showURI` and `sortTab` settings, respectively. |

#### Shared browser options

These keys go inside `((options))`. Presentation settings apply to views
drawn by the shared renderer. DynamoDB uses its search, paging and sorting controls
and supplies the record cells and item inspector. In oJob-common `20261119`,
the shared search popup starts in literal mode with **Include subfolders**
selected. Enabling `query.wildcards` adds the **Use wildcards** button. ECR,
CodeArtifact and S3 use the subfolder setting for hierarchical searches.
DynamoDB searches the current list of tables or records.

| Option | Effect |
| --- | --- |
| `browse` | Listings are visible by default. Set `false` to suppress them. Explicit `true` also opens a filesystem Markdown file as a complete page. |
| `default`, `web.enabled` | `default` names the entry to open automatically when present. With `web.enabled: true`, a provider that reports the default entry can open it even when listings are suppressed. |
| `logo`, `showURI`, `footer` | Set the logo URL (default `/fonts/openaf_small.png`), include the mount URI in breadcrumbs (off by default), or append Markdown to rendered pages. |
| `sortTab`, `sortTabAsc`, `fullWidth` | Enable sortable table headers, initially sort the first data column ascending with client-side sorting, or stretch the listing table to the page width. All default to off. |
| `noRaw` | Set `true` to ignore `raw=true` on browser and preview requests and hide the shared renderer's raw-download controls. The API's `obj` action is separate. |
| `old` | Set `true` for the legacy renderer. It drops enhanced query, preview, operations, prefetch, web and full-width settings. |
| `path`, `_fns`, `useMDRaw`, `useMDTemplate` | For the legacy `httpdBrowser` type `files`, `path` selects the local root (default `.`) and `_fns` supplies callbacks. `useMDRaw` returns Markdown as raw content. `useMDTemplate` expands Markdown as an OpenAF template with the request in scope. |
| `serverOrPort` | Optional server or port used to resolve the HTTP prefix for JSON viewer assets and legacy Markdown rendering. |
| `prefetch` | Allows a provider's optional prefetch callback. CodeArtifact uses this to warm repository trees when users hover or focus a link. |

| Query, preview or operations option | Default | Meaning |
| --- | --- | --- |
| `query.enabled` | `false`, DynamoDB `true` | Enables server-side search, sorting and pagination for supported views. |
| `query.pageSize`, `query.maxPageSize` | `100` (DynamoDB `50`), `500` | Default rows per page and largest permitted request. Use positive integers up to 500 and keep the default within the configured maximum. |
| `query.wildcards` | `false` | Allows case-insensitive wildcard search. Plain text matches a substring. With wildcards active, `*` matches any sequence and `?` one character against the whole name, path or value being searched. |
| `query.maxQueryLength` | `256` | Maximum search text length, configurable from 1 to 4096. |
| `query.maxResults` | `1000` | Maximum matches collected by filesystem, ECR repository and CodeArtifact searches (1–1000). DynamoDB bounds the scanned inventory with `maxItems`. |
| `query.maxScanned`, `query.timeoutMs` | `10000`, `5000` | Filesystem search walk budgets in entries and milliseconds. Maximums are 1,000,000 entries and 60,000 ms. |
| `preview.formats` | Provider defaults | Map extensions (e.g. `pom: xml`) or exact filenames (e.g. `'name:Dockerfile': dockerfile`) to renderers. A supplied map replaces the defaults. An empty map disables format matching. |
| `preview.maxBytes` | `4194304` | Byte limit for bounded source/text previews, from 1 to 16777216. See the CodeArtifact section for streamed formats and raw downloads. |
| `operations.enabled` | `false` | Enables `@@/status`, `@@/freshness`, `@@/metrics` and POST `@@/refresh` under the browser URI. |
| `operations.ttlMs` | `30000` | Lifetime in milliseconds recorded by the shared operations tracker. Use the AWS job's `cache` argument to change provider data freshness. |

#### ECR options

| Setting | Meaning |
| --- | --- |
| `((restrict))` | A regular expression string or list of strings. Matching repository names are excluded and requests matching a restricted path prefix are denied. |
| `((s3bucket))`, `((s3prefix))` | Set both to look up Markdown descriptions. The object key is the prefix followed by the relative path and `.md`, so include any separating slash in the prefix. |
| `((s3url))`, `((s3region))`, `((s3accesskey))`, `((s3secret))` | Optional endpoint URL, region, access key and secret for the description S3 client. The ECR job loads the S3 oPack library. |
| `options.summaries` | Defaults to `true`. Set `false` to skip per-repository image summaries on directory rows. |
| `options.usePull` | Set `true` to show the last recorded pull time. |
| `options.registry` | Registry host to prefix displayed pull references, for example `registry.example.com`. Defaults to an empty prefix. |
| `options.refLink` | URL template for pull instructions. It receives `{{image}}` (the pull reference) and `{{type}}` (the artifact media type). |
| `options.imageDetails` | Set `true` to link tags and digests to the image inspector. Add `query.enabled` to search a repository's tag listing. |

#### CodeArtifact options

| Setting | Meaning |
| --- | --- |
| `((domain))`, `((repository))` | Limit browsing to an exact domain and/or a repository **name prefix**. Omit either to leave that scope open. |
| `((format))`, `((namespace))` | Exact package format and namespace filters. For example, use `maven` and `com.example`. |
| `((initialize))` | SLON/JSON string containing an array of `{domain, repository}` pairs to warm at startup. |
| `((download))` | Set `true` to enable original asset downloads in the browser and via the API. Formatted previews can be enabled independently with `options.preview`. |
| `options.page`, `options.pageSize` | Starting page and page size for legacy provider paging. Defaults are page 1 and no paging. With enhanced queries, use `options.query.pageSize`. |
| `options.prefetch` | Defaults to off. Set `true` with a positive cache lifetime to enable hover/focus prefetch. |

When using full job names with an `args` map, both AWS repository jobs also
read `default` for the default entry. CodeArtifact additionally reads
`restrict` (regexes checked against request path prefixes) and `page` and
`pageSize` (override legacy paging defaults). These keys have no dedicated
argument in the corresponding browser shortcuts.

#### DynamoDB options

`options.tables` is a required array. Each entry configures one allowed table.

| Table key | Default | Meaning |
| --- | --- | --- |
| `name` | Required | Unique DynamoDB table name. |
| `columns` | All visible attributes | Omit to discover top-level attributes across the loaded records that pass `baseFilter`. A list sets the display order after the primary keys. An empty list shows only visible primary keys. |
| `hideColumns`, `hidePrimaryKeys` | `[]`, `false` | Omit named top-level attributes or both primary key fields from visible data, including item inspection and downloads. |
| `maxItems` | `1000` | Positive integer limiting the number of records scanned per inventory load, before filtering and paging. |
| `complexFormat` | `njsmap` | Display maps and arrays as `slon`, `json`, `yaml` or `njsmap`. |
| `baseFilter` | None | One `path`, `from`, `jq` or `sql` expression selecting original records before column hiding. |
| `filters` | None | Map of preset names to expressions, each with one of the same four keys. Presets run on visible rows and may project or aggregate them. |
| `fullItem` | `false` | Enables item inspection and download for rows that identify a single original record. |

#### API registration and request parameters

API shortcuts use the server port as their value. Their `uri` defaults to
`/api/browse`. Register a browser first. The API reads its credentials, scope
and data from the selected browser.

| Registration argument | Applies to | Meaning |
| --- | --- | --- |
| `browseUri` | `httpdBrowserAPI`, `DynamoDBBrowseAPI` | Default browser mount to read. Optional if supplied in the request. |
| `operationsBrowseUris` | All four API shortcuts | Array of exact browser mount URIs allowed for operations. Defaults to empty. |
| `operationsToken` | All four API shortcuts | Secret required for API refresh. Send the matching value in the `X-OpenAF-Browse-Token` header with POST. |

`ECRBrowseAPI` and `CodeArtifactBrowseAPI` inherit their provider's shortcut
argument map. Their `options` can require capabilities from the target mount.
Select the target in the request (e.g. `/api/browse?browseUri=/ecr&action=list`),
or register `httpdBrowserAPI` with a fixed `((browseUri))`.

| Request parameters | Use |
| --- | --- |
| `browseUri`, `uri`, `path`, `action` | The API checks the request's `browseUri`, the configured default, then the request's `uri`. `path` is relative to the mount and defaults to the root. Actions are `list` (default), `obj`, `search`, `preview`, `status`, `freshness`, `metrics` and POST `refresh`, subject to mount capabilities. |
| `q`, `wildcards`, `recursive` | Search text and per-request switches. Use `wildcards=0` for literal text or `1` when enabled. Filesystem, ECR and CodeArtifact search recursively by default. Use `recursive=0` for immediate children. |
| `page`, `size` or `pageSize`, `sort`, `order` | One-based page, rows per page, displayed column name and `asc` or `desc` order for server queries. |
| `raw`, `parse`, `view` | `raw=true` requests original content where enabled. For filesystem JSON, `parse=false` or `view=source` shows source. The JSON viewer uses `view=json` and `view=json-data`. |
| ECR `image`, `platform`, `tab`, `artifactPage` | The inspector selects an image digest and optional child digest. Tabs are `overview` (default), `platforms`, `layers`, `history`, `config`, `manifest` and `artifacts`. The artifacts pager supplies the continuation token. |
| ECR `detailTable`, `detailSort`, `detailOrder` | Sort a repository detail table (`details`, `pull` or `manifest`) by its column label in `asc` or `desc` order. |
| CodeArtifact `asset`, `view`, `raw`, `searchAll` | Select a version asset by name. Use `view=source` for its source preview or `raw=true` for an enabled download. An explicit browser search with `searchAll=1` can load remaining repositories in scope. |
| DynamoDB `preset`, `format` | Select a configured named filter and override the display format for complex cells. To inspect an item, append its returned token to the table path. |

### Repository browsing behavior

CodeArtifact enforces the configured domain, repository name prefix, format,
and exact namespace on direct requests as well as listings. Package versions
and assets must belong to the selected repository's inventory. ECR's optional
S3 descriptions use Jsoup to retain static Markdown formatting and discard
active content. Descriptions larger than 4 MiB are omitted.

ECR directory links use plain path segments (for example,
`/internal/3rdparty/`); directory labels omit the trailing slash added by the
shared browser renderer.

`query: { enabled: true, pageSize: 100 }` enables server sorting and paging.
ECR sorts repository names before fetching summaries for visible rows; sorting
globally by summary fields is unsupported. CodeArtifact sorts complete candidate
lists before paging and searches loaded package trees, reporting incomplete search
coverage. Cache keys are isolated per browser and cold loads coalesce.
CodeArtifact orders the Version column using SemVer 2 precedence before
pagination. With `sortTab: true`, the version table sorts across all pages
even when enhanced search is disabled. Labels outside SemVer use a text
fallback.
CodeArtifact resets a carried sort column to the current view's name column when
entering or clearing a search changes the available columns (for example,
`Domain` to `Package`). Unknown sort columns remain invalid.

ECR uses API pages of up to 1,000 entries and reuses its AWS client, renewing
known temporary credentials one minute before expiration. Repository paths,
children and descendant counts are indexed when the repository cache reloads.
With enhanced browsing enabled, visible repository summaries load with up to
three concurrent image requests in a background `$doV` coordinator using
`parallel4Array`. Cold listings return immediately with blank summary columns;
reload the page to see summaries after they finish. All visible rows are queued
and drained without another visit. Warm listings keep their previous summaries
while expired image data refreshes in the background; duplicate refreshes
coalesce, and failed background refreshes retain their data and retry after one
cache interval. Freshness reports expose queued and running background activity. Repository detail
requests wait for the image cache, and explicit refresh clears retained summaries.
Summary data may therefore be older than the configured TTL during refresh or
service failures. Legacy browsing keeps its existing background-cache behavior.

Set `options.summaries: false` to browse repository names without fetching image
metadata for directory rows; opening a repository still loads its full details.
Choose `cache` (milliseconds) according to your freshness requirements, for example:

```yaml
- (ECRBrowse): 18888
  ((region)): eu-west-1
  ((cache)): 300000
  ((options)):
    query:
      enabled: true
      pageSize: 25
    # summaries: false
```

The enhanced cache defaults to five seconds when `cache` is omitted. Smaller
browser pages reduce cold image requests; API page size is independent of browser
page size. Detail HTML sorts images once, and raw/API image arrays remain complete.
Run `oaf -f tests/ecr-browse.js` and `oaf -f tests/ecr-cache.js` for offline navigation,
concurrency, caching, refresh and credential-renewal checks. These do not measure
live AWS latency or verify account permissions.

CodeArtifact requests API pages of up to 1,000 entries and reuses its AWS client,
renewing known temporary credentials one minute before expiration. Repository
listings share one account-wide cache across domains. When both `format` and
`namespace` are configured, namespace filtering is also sent to AWS; the browser
retains its exact namespace match.

Packages and their sorted hierarchy indexes share one repository snapshot.
Enhanced browsing serves an expired snapshot immediately while one background
refresh runs per repository, with at most three concurrent package loads.
Freshness/status operations report queued and running refreshes. Failed refreshes
retain the previous tree and retry on a later visit after one cache interval
(at least one second). Explicit refresh waits for active package loads, cancels
matching queued refreshes and invalidates matching data. Version and asset caches
still load on demand; cold repository requests wait for the complete snapshot.
With enhanced search, Apply starts a missing package load for the current
repository. Broader searches show the coverage of loaded repositories and offer
**Search remaining repositories**. This action loads authorized repositories
through the same worker limit and shows partial package matches as pages arrive.
Typing reuses available data and in-flight loads.

Set `cache` explicitly for the desired freshness interval. For example, to warm a
frequently used CodeArtifact repository at startup:

```yaml
- (CodeArtifactBrowse): 18888
  ((region)): eu-west-1
  ((cache)): 300000
  ((initialize)): '[{domain: "my-domain", repository: "my-repo"}]'
  ((options)):
    query:
      enabled: true
      pageSize: 100
```

Initialization runs in the background; visits before it finishes still wait for
that initial load. Browser paging reduces response size but does not reduce the
initial complete package fetch. Run `oaf -f tests/codeartifact.js` for offline
pagination, navigation, large-tree, credential renewal, concurrency and refresh
checks. Live AWS latency and permissions require separate validation.

### Browsing DynamoDB tables

Include `oJobDynamoDB.yaml` and register a browser before its API. The table list
is an allowlist. Opening or searching the root uses only the configured names.

```yaml
include:
- oJobDynamoDB.yaml

ojob:
  daemon: true
  opacks:
  - AWS
  - oJob-common

todo:
- (httpdStart): 18888
  ((mapLibs)): true
- (DynamoDBBrowse): 18888
  ((uri)): /dynamo
  ((region)): eu-west-1
  ((cache)): 60000
  ((options)):
    query: { enabled: true, pageSize: 50, wildcards: true }
    tables:
    - name: Orders
      columns: [orderNumber, status, total, shipping]
      hideColumns: [internalNotes, archived]
      hidePrimaryKeys: true
      maxItems: 1000
      complexFormat: slon
      fullItem: true
      baseFilter:
        path: "[?archived == `false`]"
      filters:
        open: { from: "equals(status,'OPEN')" }
        porto: { path: "[?shipping.city == 'Porto']" }
        towns: { jq: 'map({town: .shipping.city})' }
        totals: { sql: "select status, sum(total) as amount from data group by status" }
    - name: Customers
      columns: [displayName, tier]
- (DynamoDBBrowseAPI): 18888
  ((uri)): /api/dynamo
  ((browseUri)): /dynamo
```

Each table scan reads up to `maxItems` records (default 1,000), following
DynamoDB continuation keys with eventually consistent reads. A browser caches
each table independently for `cache` milliseconds (default 5,000). Concurrent
loads share the scan. Changing the preset, search, sort, page or display format
reuses that inventory until expiry. When a continuation key remains, the page
labels the results and aggregates as partial. The API reports
`searchInfo.truncated` and `searchInfo.scanned`. [DynamoDB Scan](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html)

When configured, `baseFilter` applies to every view and must select original
records. It receives all attributes, including fields omitted from
`columns`. The listing shows the partition key, sort key (if present), then
the configured columns. If you omit `columns`, every visible top-level attribute
in the base-filtered inventory gets a column, even if it first appears on a later
scan page. Use `hideColumns` for exact top-level names and
`hidePrimaryKeys: true` for both discovered keys. Hiding applies throughout
listings, named filters, detail pages, previews and downloads.

Each preset takes one configured oafp `path`, `from`, `jq` or `sql` expression.
The browser runs it across all visible rows that passed the base filter, then
applies text search, sorting and pagination. Choose **All records** to clear
the preset. Object results use their output field names, scalar results use
`Value`, and an empty selection shows zero rows. SQL exposes the rows as the
table `data`, with nested cells available as JSON text in SQL expressions.
The interface and API identify invalid expressions by filter name and engine.

For example, open `/dynamo/Orders/?preset=totals&sort=amount&order=desc`, or
request `/api/dynamo?path=Orders&action=search&preset=porto&q=OPEN&page=1`.
On the table list or inside a table, open **Table options** or press `/` to search.
Typing previews matches, Enter applies the search and Shift+Enter clears it.
The active preset and complex-value format carry through each search. Use `size`
to request a different page size. Search is case-insensitive.
When enabled, wildcard patterns use `*` for any sequence and `?` for one
character. Use `wildcards=0` for literal text.

Each column containing an object or array has two header buttons beside its
sort controls. The format button cycles through the rendered nJSMap tree (the
default), inline SLON, YAML and inline JSON. Complex cells start collapsed. The
double chevron in the header collapses or expands every complex cell in that
column on the current page, and each cell has its own chevron to collapse or
expand just that value. The browser remembers each column’s format and
collapse choice in local storage, so it persists across sorting, paging, live
searches and later visits. Set `complexFormat` on a table to change the
starting format, or pass `format=slon|json|yaml|njsmap` in the URL to override
the remembered format. The API returns
structured values in all four modes. Binary values use base64 and numbers
that exceed JavaScript precision retain their decimal text.

With `fullItem: true`, **Inspect** opens an nJSMap tree with a readable JSON
fallback. Extra item attributes follow the same hiding rules. Original rows
and unambiguous whole-record selections have an opaque `item` token.
Projections, aggregates and ambiguous preset matches are standalone. Read
`/api/dynamo?action=obj&path=Orders/<item>` for detail JSON, or use
`action=preview` for the inspector. The browser retains the original typed
key and rechecks the base filter against the freshly read item in its bounded
inventory. Deleted or excluded records return HTTP 404. [DynamoDB GetItem](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_GetItem.html)

Use the existing AWS credential chain or the shortcut's `accessKey`, `secret`,
`token` and optional `assumeRole`. Grant `dynamodb:DescribeTable` and
`dynamodb:Scan` on the configured table ARNs, plus `dynamodb:GetItem` on
tables with full inspection. Role assumption also requires `sts:AssumeRole`.
Enable `options.operations.enabled` for cache status and protected refresh.
API operations use `operationsBrowseUris` and the refresh token described
above. Run `oaf -f tests/dynamodb-browse.js` from the AWS directory for
fixture checks.

### Prefetching CodeArtifact repository trees

Set `options.prefetch: true` with a positive cache TTL to warm one cold
repository tree when its link is hovered or focused for 225 ms. This works
independently of enhanced search. Prefetch shares the normal repository
cache and skips a hint when the background slot is busy. It does not warm
package versions or assets. With Browse operations enabled, Status shows
prefetch requests queued, trees loaded, and prefetched trees used by a visit.

### Inspecting ECR images

Set `options.imageDetails: true` on ECR Browse to link tags and untagged digests
to image details. The tag listing shows one row per tag, newest push first.
Sorting by Tag uses SemVer precedence. Enable `options.query.enabled` to search
tags and digests within the repository. Select a shortened digest in the detail tables to reveal the full
value. Select a platform or artifact from an image index to inspect its
details, with a breadcrumb back to the original index. For a single image
manifest, the inspector reads the supported platform from the image config.
The layer chart shows the largest compressed layers in manifest order and
uses the local Chart.js asset. Install the optional Mermaid
oPack for the platform diagram. Both tables are available independently of
the diagrams. The Overview tab shows an Annotations section when the image manifest, index,
or its descriptors contain annotations. The Manifest tab displays a nested nJSMap view, with formatted
JSON as a fallback. Config lists the environment variable names and values stored in the image. History displays
the build commands stored by the image publisher.

Inspector tabs share a bounded cache of manifests and configs keyed by digest.
These entries are reusable for at least five minutes unless evicted. Overview
refreshes tag and push metadata on the configured cache interval, with a
five-second minimum. Browse refresh also invalidates cached inspector data for
the selected repository scope.

Overview includes image status and recorded pull, archive and activation times when
available, and shows image labels when present. Config shows runtime settings. Layers and History
can show uncompressed layer digests and build-step authors.

**Attached artifacts** lists OCI referrers for the selected digest, one page at a
time. The tab loads on demand and uses the metadata cache interval. It requires
the permissions for [ECR ListImageReferrers](https://docs.aws.amazon.com/service-authorization/latest/reference/list_ecr.html).

The inspector uses the browser's private ECR credentials. The IAM principal
needs `ecr:DescribeImages`, `ecr:GetAuthorizationToken`,
`ecr:BatchGetImage`, and `ecr:GetDownloadUrlForLayer`. The existing
repository list continues to use its current listing permissions. Run
`oaf -f tests/ecr-browse-details.js` for offline inspector checks.

### Previewing CodeArtifact assets

Set `options.preview: {}` for the default previews, including JSON, POM/XML,
HTML, and the Browse text formats. `preview.formats` replaces the default
allowlist and accepts extension keys and exact `name:` keys. Set
`preview.maxBytes` to override the 4 MiB server-side preview limit. JSON
streams to the browser's nJSMap viewer, which accepts up to 16 MiB. Larger or
invalid JSON can be viewed as bounded source. POM/XML assets use OpenAF XML
conversion and nJSMap, including POMs with leading license comments.
The Source view shows the original XML, which is also the fallback when
conversion or rendering is unavailable.

HTML previews stream the complete asset directly to the browser in a sandbox
that blocks scripts, form submissions, and external resources. The
`view=source` option displays bounded, escaped HTML. With `download: true`,
the download action streams the complete original asset as an attachment,
including binary assets. API asset reads continue to stream the original bytes.

Operations expose status, freshness, metrics and POST refresh. See the
oJob-common browse documentation for authentication and refresh controls.

Load the required service library, for example `loadLib("aws_sqs.js")`.

SQS receive calls accept the requested maximum message count, and FIFO sends accept group IDs in either positional arguments or a message map. Performance Insights uses the client instance region. Each Bedrock provider keeps its own options.

Route 53 listings retrieve every page, including record name/type/identifier cursors and hosted-zone markers. See the [record listing API](https://docs.aws.amazon.com/Route53/latest/APIReference/API_ListResourceRecordSets.html) and [hosted-zone listing API](https://docs.aws.amazon.com/Route53/latest/APIReference/API_ListHostedZones.html).

Run the service-independent regression checks from this directory:

```sh
oaf -f tests/regression.js
```

These checks use local fixtures and test doubles; they do not verify a live external service.

`EKS_GetToken` signs an STS `GetCallerIdentity` URL locally without calling STS. Tokens use unpadded Base64URL encoding and report expiration in UTC (14 minutes by default). STS presigning hashes the empty request body; S3 presigning retains `UNSIGNED-PAYLOAD`.

Run the focused offline EKS token and STS/S3 signing checks with `oaf -f tests/eks.js`. These use dummy credentials and do not verify live EKS authentication.

## Serving a Lambda function over HTTP

`oJobLambda.yaml` provides the `httpdAWSLambda` shortcut (job `HTTP AWS Lambda`).
It registers a URI on an `httpdStart` server and, for every request, invokes a
Lambda function with an API Gateway-style event, then replies with the
function's `body`, `statusCode`, `mimeType` and `headers`.

```yaml
include:
- oJobLambda.yaml

ojob:
  daemon: true
  opacks:
  - oJob-common
  - AWS

todo:
- (httpdStart): 17878
- (httpdAWSLambda): 17878
  ((uri)): /echo
  ((region)): eu-west-1
  ((lambda)): echo
  ((params)):
    stage: prod
  ((timeout)): 30000
  ((debug)): true
```

| Argument | Default | Meaning |
| --- | --- | --- |
| port (shortcut value) | `8091` | Port of an existing `httpdStart` server. |
| `uri` | `/` | URI to serve. Each URI gets its own handler, so several functions can share a port. |
| `region` | `us-east-1` | Region of the Lambda function. |
| `lambda` | Required | Function name or ARN to invoke. |
| `version` | None | Optional version or alias (qualifier). |
| `params` | `{}` | Base event map. The request is merged over it as `resource`, `path` (both the request URI), `httpMethod`, `headers`, `queryStringParameters`, `pathParameters` (both the query/form parameters) and `body` (POST data, when present). |
| `accessKey`, `secret`, `token` | Credential chain | Optional explicit AWS credentials. |
| `assumeRole` | None | IAM role ARN to assume before invoking the function. |
| `timeout` | OpenAF default | HTTP connect and read timeout in milliseconds for the Lambda calls (sets `__flags.HTTP_CON_TIMEOUT` and `HTTP_READ_TIMEOUT`). |
| `debug` | `false` | Logs each Lambda request and response. |

The function should return a map such as
`{ statusCode: 200, body: "...", headers: { ... } }`. Invocation failures are
logged and answered with HTTP 500 `Internal error!`. The principal needs
`lambda:InvokeFunction` on the function (plus `sts:AssumeRole` when assuming a
role).

## Lambda Web Functions, MicroVMs, and network connectors

Load `aws_lambda.js` and construct an AWS client with credentials using the existing AWS setup. The management wrappers accept `(aRegion, aParams)`; use `undefined` for the instance region. Omit `aParams` for operations with no required fields. Each call makes one request and returns the existing REST transport's response, including pagination tokens and errors. Empty responses follow the transport's usual behavior.

The wrappers cover all 20 [Web Functions operations](https://docs.aws.amazon.com/lambda/latest/lambda-web/API_Operations.html), all 24 [MicroVM operations](https://docs.aws.amazon.com/lambda/latest/microvm-api/API_Operations.html), and the five Core connector operations: `CreateNetworkConnector`, `DeleteNetworkConnector`, `GetNetworkConnector`, `ListNetworkConnectors`, and `UpdateNetworkConnector`. Prefix operation names with `LAMBDA_WEB_`, `LAMBDA_MICROVM_`, or `LAMBDA_CORE_`, preserving AWS spelling (`Microvm`, for example).

Parameter maps use AWS SDK input field names, including their casing. In particular, Web tagging uses `{ resource, tags }` and `{ resource, tagKeys }`, while MicroVM tagging uses `{ Resource, Tags }` and `{ Resource, TagKeys }`. Web `PutResourcePolicy` accepts `{ resourceArn, policy, revisionId }`. The wrappers translate the Web body fields to the wire keys `Tags`, `Policy`, and `RevisionId`. Nested configuration is passed unchanged. Required identifiers and parameter-map types are checked locally; AWS validates configuration and service limits. Caller maps are not modified.

Web creation, revisions, and endpoints (configuration maps below are caller supplied):

```javascript
loadLib("aws_lambda.js");
var aws = new AWS(accessKey, secretKey, sessionToken, "eu-west-1");

var created = aws.LAMBDA_WEB_CreateWebFunction(undefined, {
   functionName: "my-app",
   revisionConfig: revisionConfig,
   endpointConfig: endpointConfig
});
var revision = aws.LAMBDA_WEB_CreateWebFunctionRevision(undefined, {
   functionName: "my-app",
   buildConfig: buildConfig,
   serviceConfig: serviceConfig
});
var endpoint = aws.LAMBDA_WEB_CreateWebFunctionEndpoint(undefined, {
   functionName: "my-app",
   endpointName: "main",
   endpointType: endpointType,
   authType: authType
});
aws.LAMBDA_WEB_UpdateWebFunctionEndpoint(undefined, {
   functionName: "my-app", endpointName: "main", description: "Production"
});
var page = aws.LAMBDA_WEB_ListWebFunctions(undefined, { maxResults: 10 });
// Request another page explicitly with { maxResults: 10, nextToken: page.nextToken }.
```

MicroVM images, lifecycle, and authentication tokens:

```javascript
var image = aws.LAMBDA_MICROVM_CreateMicrovmImage(undefined, {
   name: "my-image",
   baseImageArn: baseImageArn,
   buildRoleArn: buildRoleArn,
   codeArtifact: { uri: "s3://my-bucket/code.zip" }
});
var imageState = aws.LAMBDA_MICROVM_GetMicrovmImage(undefined, {
   imageIdentifier: imageArn
});
// Once the selected image/version is ready, start it explicitly.
var vm = aws.LAMBDA_MICROVM_RunMicrovm(undefined, { imageIdentifier: imageArn });
var token = aws.LAMBDA_MICROVM_CreateMicrovmAuthToken(undefined, {
   microvmIdentifier: microvmId,
   expirationInMinutes: 10,
   allowedPorts: [{ port: 8080 }]
});
var shellToken = aws.LAMBDA_MICROVM_CreateMicrovmShellAuthToken(undefined, {
   microvmIdentifier: microvmId, expirationInMinutes: 10
});
aws.LAMBDA_MICROVM_SuspendMicrovm(undefined, { microvmIdentifier: microvmId });
aws.LAMBDA_MICROVM_ResumeMicrovm(undefined, { microvmIdentifier: microvmId });
aws.LAMBDA_MICROVM_TerminateMicrovm(undefined, { microvmIdentifier: microvmId });
```

Core network connectors retain uppercase field names:

```javascript
var connector = aws.LAMBDA_CORE_CreateNetworkConnector(undefined, {
   Name: "private-egress",
   Configuration: {
      VpcEgressConfiguration: {
         SubnetIds: ["subnet-example"],
         SecurityGroupIds: ["sg-example"],
         NetworkProtocol: "IPv4",
         AssociatedComputeResourceTypes: ["MicroVm"]
      }
   },
   OperatorRole: operatorRoleArn
});
var state = aws.LAMBDA_CORE_GetNetworkConnector(undefined, { Identifier: connector.Arn });
var connectors = aws.LAMBDA_CORE_ListNetworkConnectors(undefined, { MaxItems: 10 });
```

These are individual management calls. Callers manage pagination, readiness polling, deployment order, application HTTP requests, and shell connections. No SDK dependency or runtime model download is required. The regional endpoint and signing service are both Lambda; access remains subject to AWS service availability and IAM permissions.

Run `oaf -f tests/lambda.js` for offline request/signing and compatibility checks with dummy credentials and intercepted HTTP. Its static fixtures come from AWS's published operation request syntax, cross-checked against the botocore [Web](https://raw.githubusercontent.com/boto/botocore/develop/botocore/data/lambda-web/2025-03-07/service-2.json), [MicroVM](https://raw.githubusercontent.com/boto/botocore/develop/botocore/data/lambda-microvms/2025-09-09/service-2.json), and [Core](https://raw.githubusercontent.com/boto/botocore/develop/botocore/data/lambda-core/2026-04-30/service-2.json) models on 2026-10-20. These checks do not deploy resources or validate live AWS access.

## Recent Bedrock GPT and Claude models

GPT-5.4, GPT-5.5, GPT-5.6 Sol/Terra/Luna, GPT-6 Astra/Sol/Luna, and GPT-6.1
Sol/Terra use the signed OpenAI Responses API for normal and streaming calls.
Base IDs such as `openai.gpt-6-luna` use Mantle in the configured region;
profile IDs such as `global.openai.gpt-6-luna` use Bedrock Runtime. The adapter
never changes your region or inference profile. Check the
[AWS model cards](https://docs.aws.amazon.com/bedrock/latest/userguide/model-cards.html)
for endpoint availability and account permissions. GPT OSS retains its existing path.

Use `options.params.reasoning: { effort: "medium" }` or the
`reasoning_effort: "medium"` alias (the alias takes precedence). Responses supports
reasoning alongside function tools, so Luna no longer needs reasoning disabled.
`max_output_tokens` takes precedence over `max_completion_tokens`, then `max_tokens`;
only `max_output_tokens` is sent. Legacy sampling temperature is omitted.
`tool_choice`, `parallel_tool_calls`, `text`, `service_tier`, `include`,
`prompt_cache_key`, and `prompt_cache_retention` are forwarded when configured.
AWS validates model-specific values. Normal and streaming calls execute registered
function tools and continue with their results. Native output items, including
opaque reasoning, are retained for replay; stateless calls request encrypted
reasoning content. Legacy JSON flags select `text.format.type: "json_object"`
unless an explicit `params.text` is supplied.

Claude keeps full native assistant blocks (including thinking, signatures, and
redacted thinking) in protocol history. `showReasoning: false` hides reasoning
from returned text, without deleting the history needed for subsequent tool turns.
Keep the model, system prompt, tools, and prior turns stable when replaying bound
thinking. Automatic message cache breakpoints stay stable across later turns.
`getConversation()` is raw protocol history; portable conversation
exports are for transfer and do not preserve signed reasoning.

Opus 4.7/4.8 and the supported Opus/Sonnet/Haiku 5.x models omit sampling
parameters from requests. Fable/Mythos 5.x omit unsupported sampling values and
`top_k`; valid fixed sampling values remain supported. Sonnet/Haiku 4.5 prefer
`top_p` over temperature when both are configured. Older models otherwise retain
their existing behavior.

Configure adaptive thinking with `params.thinking: { type: "adaptive" }` and
`params.output_config: { effort: "medium" }`. Manual `enabled`/`budget_tokens`
settings are rejected locally on models that require adaptive thinking. Sonnet 5.5
accepts `{ type: "between_tools" }` at low, medium, or high effort, and rejects
`disabled`. Opus 5.5 and Fable/Mythos 5.x reject `disabled`; Opus 5, Sonnet 5,
and Haiku 5.5 allow it through high effort. See
[AWS adaptive thinking](https://docs.aws.amazon.com/bedrock/latest/userguide/claude-messages-adaptive-thinking.html).

## Bedrock Claude native structured output

With an OpenAF build providing `ow.ai.__decision` and the structured-output hooks
(the sibling OpenAF source includes them), load `aws_bedrock.js` before creating
an LLM. No OpenAF core changes or extra validation dependency are required.
The adapter uses the existing signed, non-streaming `BEDROCK_InvokeModel`
transport with `output_config.format: { type: "json_schema", schema: <object> }`.
It never retries as prompt-only JSON. Ordinary prompts, JSON flags, streaming,
tools, and other Bedrock model providers retain their existing paths.

Configure credentials through the existing AWS environment/profile setup:
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and optional `AWS_SESSION_TOKEN`.
Region and model remain explicit adapter options:

```javascript
loadLib("aws_bedrock.js")
var llm = $llm({
  type: "bedrock", timeout: 180000,
  options: {
    region: "us-east-1",
    model: "global.anthropic.claude-sonnet-4-5-20250929-v1:0",
    params: { max_tokens: 1024 }
  }
})
var person = llm.getGPT().jsonSchemaPrompt("Extract the person: Alice, 30.", {
  name: "person", strict: true,
  schema: {
    type: "object",
    properties: { name: { type: "string" }, age: { type: "integer" } },
    required: ["name", "age"], additionalProperties: false
  }
})
var result = llm.decide({ ticket: "Charged twice" }, {
  billing: { type: "boolean", instructions: "Is this a billing issue?" },
  priority: { type: "score", instructions: "Assess urgency", criteria: ["Routine", "Urgent"] }
}, { strategy: "structured" })
// result.answers.billing.value; probability fields and score expectedScore are null.
var withStats = llm.decideWithStats("Duplicate charge", {
  billing: { type: "boolean", instructions: "Is this a billing issue?" }
}, { strategy: "structured" })
```

`jsonSchemaPromptWithStats` returns `{response, stats}` too. The inspected OpenAF
core has no AI `extract()` method; use `jsonSchemaPrompt` for schema-based extraction.
The public schema descriptor is `{name, description, schema, strict}`; raw JSON
Schemas are also accepted by this adapter's helper. Metadata stays local, and
both `strict` settings retain native enforcement and local validation.

Capability policy is deliberately conservative. The known models include
Sonnet/Haiku/Opus 4.5, Sonnet/Opus 4.6, Opus 4.7/4.8, Sonnet/Opus 5,
Sonnet/Opus/Haiku 5.5, Fable 5/5.1/5.2, and Mythos 5/5.1. Model IDs and profile
prefixes are explicitly listed in `_structuredCapability`; unknown combinations
require opt-in. Recognized profiles include the documented US, EU, AU, JP, India,
Canada, and GovCloud combinations where listed for that model. This does **not**
guarantee availability in your region or access from your account. The documented
`in.anthropic.claude-haiku-4-5-20251001-v1:0` exclusion always rejects native output.
Other Claude IDs and opaque/custom profile ARNs are unknown and disabled by
default. For a newer recognized Claude ID verified against its AWS model card,
set `options.nativeStructuredOutput: true`. This opt-in does not bypass the known
India/Haiku exclusion or enable non-Claude/opaque identifiers. Set it to `false`
to disable native schemas. No capability probes are sent.

`getCapabilities()` advertises structured choice, boolean, and score decisions
only for enabled models, with no probabilities and no structured streaming.
Known exclusions report incompatible availability; enabled and unknown model
availability remains unknown until execution (unknown models are ineligible).
Native *decision scoring* is unsupported; `strategy: "structured"` uses native
JSON Schema generation. `auto` can select this structured strategy.

Schemas use the intersection of OpenAF's existing validator and Bedrock's subset:
single `type` (object, array, string, integer, number, boolean, null), `properties`,
`required`, primitive `enum`, `items`, `minItems` of 0 or 1, `description`, and
`title`. Every object must explicitly set `additionalProperties: false`.
At most 12 optional properties are allowed across nested objects. Unsupported
keywords fail before HTTP, including numeric bounds, `maxItems`, patterns,
references, unions, formats, defaults, and compositions, even where Bedrock
supports some of them. Constraints are never silently removed. Core-compiled
score bounds become equivalent finite integer enums on the wire; the original
core schema still validates the response. Validation does not use global Ajv
coercion/default settings.

The helper keeps text system messages/history and appends only a successful
exchange. Decisions and raw structured hooks isolate their requests from history
and registered tools. Explicit nonempty tools and history containing non-text
blocks are rejected on the schema helper; ordinary tool calls still work.
Prompt caching follows `options.promptCaching`, including supported explicit
text-block cache markers. `aJsonFlag` remains the legacy instruction to answer in
JSON; it does not enable native schema enforcement.

Native calls accept inference `params.max_tokens` (default 1024), `temperature`
(0–1), `top_p`, `top_k`, `stop_sequences`, `thinking`, `service_tier`, `system`, and
`anthropic_version: "bedrock-2023-05-31"`, `anthropic_beta` (an array of strings),
and `output_config: { effort: "low" | "medium" | "high" | "xhigh" | "max" }`.
The adapter adds its schema format alongside effort; caller-supplied format fields
are rejected. `thinking.type: "between_tools"` is accepted for Sonnet 5.5.
Conflicting schema/message/tool fields
and unrecognized parameters fail locally. Model-specific inference combinations
remain subject to AWS validation. The existing core currently accepts no Bedrock
`decide` provider options: configure inference through `options.params` instead.
The schema helper also accepts its standard positional temperature/model override.

Errors follow OpenAF codes: `LLM_DECISION_UNSUPPORTED` for ineligible capabilities,
`LLM_DECISION_INVALID_REQUEST` for invalid schemas/options,
`LLM_DECISION_PROVIDER_ERROR` for HTTP/API/connection/timeout failures, and
`LLM_DECISION_INVALID_RESPONSE` for empty, malformed, refused, truncated,
tool-use, or schema-invalid output. Only finalized `end_turn` text blocks are
parsed; thinking blocks are excluded. No fallback or second inference is used for
normalization. Execution-scoped statistics are returned directly; `getLastStats`
remains last-call mutable state. Usage from a received response remains available
when output validation fails, while preflight failures clear previous usage.

AWS can take approximately 90 seconds to compile a new schema; compiled grammars
are cached for 24 hours. Configure the existing timeout to at least 120 seconds
for first use and enough output tokens to avoid `max_tokens` truncation. See the
[AWS structured-output guide](https://docs.aws.amazon.com/bedrock/latest/userguide/structured-output.html),
[Claude announcement and InvokeModel example](https://aws.amazon.com/blogs/machine-learning/structured-outputs-for-anthropic-claude-models-on-amazon-bedrock/),
and [model cards](https://docs.aws.amazon.com/bedrock/latest/userguide/model-cards.html)
for regional/profile availability and service limitations.

Run deterministic tests from `AWS/` using the sibling OpenAF build:

```sh
java -jar ../../openaf/openaf.jar -f tests/bedrock.js
```

HTTP responses and credentials are mocked; these tests make no AWS requests.
The separate live smoke test skips by default and incurs inference charges only
with explicit opt-in. Supply `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, optional
`AWS_SESSION_TOKEN`, `AWS_REGION`, and `BEDROCK_MODEL_ID`, then run:

```sh
OPENAF_BEDROCK_LIVE=1 java -jar ../../openaf/openaf.jar -f tests/bedrock-live.js
```

For a verified newer model, additionally set `BEDROCK_NATIVE_STRUCTURED_OUTPUT=true`.
The smoke test performs one schema extraction and reports statistics. Offline test
success does not establish live AWS model availability or access.

## Signing without sending

`AWS.signRequest(options)` returns headers for a request, without transmitting it.
Load only `aws_core.js` if no service helpers are needed. Example for direct OTLP
metrics and logs (these calls only sign; send the exact same body string yourself):

```javascript
loadLib("aws_core.js")
var aws = AWS.forSigning("eu-west-1") // Lazy, bounded discovery; no network yet.
var metricBody = JSON.stringify({ resourceMetrics: [{ scopeMetrics: [{ metrics: [{
   name: "example_gauge", gauge: { dataPoints: [{ asDouble: 1,
      timeUnixNano: String(Date.now()) + "000000" }] }
}] }] }] })
var metricHeaders = aws.signRequest({ method: "POST",
   url: "https://monitoring.eu-west-1.amazonaws.com/v1/metrics",
   region: "eu-west-1", service: "monitoring", body: metricBody,
   headers: { "Content-Type": "application/json" }, timeoutMs: 5000 })
var logBody = JSON.stringify({ resourceLogs: [{ scopeLogs: [{ logRecords: [{
   timeUnixNano: String(Date.now()) + "000000", body: { stringValue: "Example warning" },
   severityNumber: 13, severityText: "WARN"
}] }] }] })
var logHeaders = aws.signRequest({ method: "POST",
   url: "https://logs.eu-west-1.amazonaws.com/v1/logs",
   region: "eu-west-1", service: "logs", body: logBody,
   headers: { "Content-Type": "application/json", "x-aws-log-group": "/nattrmon/warnings",
      "x-aws-log-stream": "monitoring-01" }, timeoutMs: 5000 })
```

URLs must use HTTPS, a simple unescaped path, and no credentials, query or
fragment. Headers are cloned and normalized; duplicate names and caller-supplied
signature, host and transport framing headers are rejected. Temporary session
tokens are signed. The body must already be a string; serialize it exactly once.

`AWS.forSigning(region)` creates a lazy signing-only instance. `new AWS(...)`
continues to perform its existing eager connection; it also supports the new
instance method. Explicit constructor credentials remain caller-managed. Existing
request helpers and private signing APIs keep their previous refresh behavior.

For discovered credentials, `signRequest` preserves expiration from the existing
credential process, web identity, container and IMDS providers. It refreshes 60
seconds before expiration, or rechecks credentials without expiration after five
minutes. Refresh and signing are serialized per instance; credentials are published
only as a complete valid session. On failure a still-valid session remains usable;
refresh failures are throttled to one attempt every 30 seconds. Expired sessions
fail signing. `timeoutMs` includes lock wait, acquisition and signing. Acquisition
runs in an isolated time-bounded task; a timed-out result is never published.
Provider error text and credentials are excluded from signing errors. No new
credential providers or output-specific credential fields are introduced.

Run `openaf -f tests/signing.js` from `AWS/` for offline independent-JCA signature,
Unicode, header immutability, expiration, timeout and concurrency checks. Also run
`tests/credentials.js`, `tests/lambda.js` and `tests/bedrock.js`. The nAttrMon
repository supplies `tests/opentelemetry-aws-live.js` as an opt-in end-to-end test
against an existing log group/stream; offline checks do not establish live delivery.

## Bedrock Converse and ConverseStream

`options.api` selects the inference backend. Leaving it out preserves all existing
routing, including Claude native thinking/caching and modern GPT Responses continuation.
No AWS SDK or new runtime dependency is required.

| Value | Selection |
| --- | --- |
| omitted | Existing model-native behavior, including existing GPT Responses routing |
| `invoke` | Existing InvokeModel implementation; rejects IDs without a native handler |
| `responses` | Signed Responses for recognized compatible GPT IDs, or an explicit capability override |
| `converse` | Converse only; unknown model IDs can attempt text inference |
| `auto` | Existing compatible native/Responses path, or an explicitly verified Converse entry for additional models |

Selection happens before transport. Provider errors never trigger an endpoint switch,
model substitution or region change. Capabilities describe protocol support, not account
access or regional availability. Regional/global inference IDs and ARNs are sent unchanged.
Opaque profile ARNs need exact capability overrides for advanced features.

```javascript
loadLib("aws_bedrock.js")
var llm = $llm({
  type: "bedrock",
  timeout: 180000,
  options: {
    region: "eu-west-1",
    model: "deepseek.v3-v1:0", // choose an ID available to your account and region
    api: "converse",
    temperature: 0.2,
    params: { max_tokens: 2048 }
  }
})
print(llm.prompt("Explain what a hash table does."))
```

A model can also be identified by an inference profile, for example
`eu.anthropic.claude-sonnet-4-5-20250929-v1:0`, a global profile such as
`global.openai.gpt-6.1-sol`, or a complete inference-profile/application-profile ARN.
Use the identifier supported by AWS in your configured source region. The adapter does
not resolve an opaque application profile to its underlying model through AWS calls.

### Parameters and history

Common aliases map as follows:

| Parameter | Converse request field |
| --- | --- |
| `max_tokens`, `max_output_tokens` | `inferenceConfig.maxTokens` |
| `temperature` | `inferenceConfig.temperature` |
| `top_p` | `inferenceConfig.topP` |
| `stop_sequences` | `inferenceConfig.stopSequences` |

Precedence is generic options, then `params` aliases, then explicit prompt-call
arguments, then explicit `params.inferenceConfig` fields. `max_output_tokens` wins
when both token aliases are present. No temperature or token budget is added by default.
An explicit field overrides its alias; other unrecognized parameters fail locally.

`options.params` also accepts `additionalModelRequestFields`,
`additionalModelResponseFieldPaths`, `performanceConfig`, `serviceTier`, `requestMetadata`,
`guardrailConfig`, `outputConfig`, `toolConfig`, `system`, and `promptVariables`.
Use `additionalModelRequestFields` for model-specific settings such as thinking or
reasoning; native fields like `anthropic_version` are not Converse request fields.
Explicit system instructions precede system messages extracted from the conversation.
Prompt-management ARNs cannot combine their managed settings with generated system,
inference, tool or additional-model settings.

Conversation strings and existing portable tool histories are converted into Converse
blocks without modifying caller arrays. `getConversation`/`setConversation` retain full
backend blocks, including signatures and redacted reasoning. `exportConversation` and
`importConversation` retain their existing portable text/tool format; portable export is
not a lossless archive for signed reasoning, images or documents. Continue signed sessions
using full history and the same backend. Incompatible opaque native/Responses history is
rejected rather than converted into text.

### Tools and streaming

```javascript
var chat = $llm({ type: "bedrock", timeout: 180000, options: {
  region: "eu-west-1", model: "eu.anthropic.claude-sonnet-4-5-20250929-v1:0",
  api: "converse", params: { max_tokens: 2048 }
} }).getGPT().model
chat.setTool("lookup", "Look up a value", {
  type: "object",
  properties: { key: { type: "string" } },
  required: ["key"],
  additionalProperties: false
}, function(args) { return { value: "value for " + args.key } })
print(chat.rawPrompt("Use lookup for key example."))

// Select only on models whose streamingTools capability is verified.
var result = chat.rawPromptStream("Use lookup for key next.", undefined,
  undefined, false, ["lookup"], function(delta, event) { printnl(delta) })
if (result.error) printErr(stringify(result.error))
```

Tools use the existing registered handlers, JSON argument objects and tool IDs.
Multiple calls execute in order. Exceptions become correlated error results. Both paths
use the same continuation loop, with `options.maxToolRounds` defaulting to 10; zero
disables execution. Repeated IDs cannot execute twice within one prompt invocation.
Complete tool exchanges remain in history if a subsequent inference fails. Incomplete
stream arguments never execute and incomplete assistant messages are not committed.

For text-only streaming, pass `[]` for the tools argument. `promptStream`,
`promptStreamJSON` and stats wrappers use the same transport; the provider also exposes
`rawPromptStreamJSON`. Text callbacks retain `(delta, event)`. Indexed blocks are
reconstructed in block order; callbacks retain event arrival order. Raw events/history
retain reasoning, while displayed text hides reasoning unless `showReasoning` is true.
Unknown streaming content variants fail clearly; video ingestion is not implemented.

The low-level methods are `aws.BEDROCK_Converse(region, modelId, input)` and
`aws.BEDROCK_ConverseStream(region, modelId, input, callback)`. The latter calls
`callback(eventUnion, { headers })` incrementally and returns `{ events, error? }`.
It validates framing, typed headers, UTF-8, prelude/message CRC32, frame lengths and
truncation. Callback failures propagate as stream errors and resources close on failure.
An individual frame is limited to 32 MiB to bound buffering. It never buffers the entire
response before delivering events; the returned events array retains delivered events.

### Structured output and decisions

```javascript
var person = llm.getGPT().jsonSchemaPromptWithStats("Extract Alice, age 30.", {
  name: "person",
  schema: {
    type: "object",
    properties: { name: { type: "string" }, age: { type: "integer" } },
    required: ["name", "age"],
    additionalProperties: false
  }
})
print(stringify(person))
var decision = llm.decideWithStats("The service is healthy.", {
  healthy: { type: "boolean", instructions: "Is the service healthy?" }
}, { strategy: "structured" })
```

Eligible models use native `outputConfig.textFormat` with a JSON-string schema.
The adapter retains OpenAF's schema subset and validation: every object explicitly needs
`additionalProperties: false`, numerical bounds and unsupported keywords fail locally,
`minItems` is 0 or 1, and at most 12 optional properties are allowed. Decision score bounds
become finite enums. GPT-6.1 Sol's profile additionally requires every property in
`required` and injects `additionalModelRequestFields.text.format.strict=true`.
Conflicting strict settings fail. Schema-specific methods own output configuration and
do not execute tools. Refusals, truncation, invalid JSON and schema mismatches fail without
committing history. Raw requests with explicit `outputConfig` also validate the schema
and completed output. Plain JSON prompt flags remain best-effort instructions and parsing,
not guaranteed native schema enforcement. Native Claude schemas retain their existing path.

### Images, documents and caching

On an image-capable model, `chat.promptImage("Describe this image", "image.png")`
uses OpenAF's existing image preparation. The local path is not sent to AWS.
Explicit user message blocks can contain `{ image: { format: "png", source: { bytes:
"<base64>" } } }` or `{ document: { name: "Document 1", format: "txt", source: {
bytes: "<base64>" } } }`. A document requires accompanying text. Binary blocks are not
serialized as text. Sources use base64 bytes rather than file paths or remote URLs.

Image limits are 20 per message, 3.75 MiB each, and 8000 pixels per side. Document limits
are five per message and 4.5 MiB each. Model restrictions can be narrower. Use neutral
alphanumeric document names without local paths. Images/documents require user roles.
Explicit video input and unsupported content variants fail rather than being stringified.

Converse caching uses explicit `cachePoint` blocks on verified models. Native
`promptCaching:true` is not automatically translated; an explicit request for it fails
with guidance to use cache points. Default native Claude caching is unaffected.
GPT-6.1 Sol supports implicit caching but not Converse `cachePoint` blocks.

### Capabilities and troubleshooting

The conservative registry has exact entries, not an exhaustive model list. `?` means
unverified by this adapter, not proven unsupported. Evidence was reviewed on 2026-11-15;
no live account availability is implied. `stream` denotes documented runtime response
streaming; tool streaming remains independently gated.

| Model | Converse | Stream | Tools | Stream tools | Images | Documents | Native schema | Explicit cache |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [DeepSeek V3.1](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-deepseek-deepseek-v3-1.html) | Yes | Yes | Yes | ? | No | ? | Yes | ? |
| [Qwen3 Coder 480B](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-qwen-qwen3-coder-480b-a35b-instruct.html) | Yes | Yes | Yes | ? | No | ? | Yes | ? |
| [Llama 3.3 70B](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-meta-llama-3-3-70b-instruct.html) | Yes | Yes | Yes | No | No | ? | No | ? |
| [Devstral 2](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-mistral-ai-devstral-2-123b.html) | Yes | Yes | ? | ? | No | ? | Yes | ? |
| [Magistral Small 2509](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-mistral-ai-magistral-small-2509.html) | Yes | Yes | ? | ? | Yes | ? | Yes | ? |
| [GLM 4.7](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-zai-glm-4-7.html) | Yes | Yes | ? | ? | No | ? | Yes | ? |
| [Gemma 3 12B IT](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-google-gemma-3-12b-it.html) | Yes | Yes | ? | ? | Yes | ? | Yes | ? |
| [Jamba 1.5 Large](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-ai21-labs-jamba-1-5-large.html) | Yes | ? | ? | ? | ? | ? | ? | ? |
| [Claude Sonnet 4.5](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-4-5.html) | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| [GPT-6.1 Sol](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-openai-gpt-6-1-sol.html) | Yes | Yes | ? | ? | Yes | No | Yes, strict | No |

Reasoning blocks are retained without inferring model support from a family name.
Cohere Command R is EOL according to its AWS card; explicit Converse text remains possible
for other/new Cohere models without adding a handler. Unknown optional capabilities
require an exact override after checking the model's AWS documentation:

```javascript
var options = {
  model: "<exact-model-id-or-profile-arn>", region: "eu-west-1", api: "converse",
  modelCapabilities: {
    "<exact-model-id-or-profile-arn>": {
      converse: { text: true, streaming: true, tools: true, streamingTools: true }
    }
  }
}
var custom = $llm({ type: "bedrock", options: options })
```

Overrides are instance-local caller assertions, not AWS verification. Boolean capability
keys include `text`, `streaming`, `tools`, `streamingTools`, `images`, `documents`,
`reasoning`, `promptCaching`, `structuredOutput`, and `strictOutput`; `schemaProfile`
can be `required` for models requiring all properties. Inspect effective entries with
`chat.getBedrockCapabilities(modelId, "converse")`. Unknown capabilities are omitted;
`false` is an explicit negative. `auto` never treats unknown as supported.

Converse requires `bedrock:InvokeModel`; streaming requires
`bedrock:InvokeModelWithResponseStream`. IAM policies must cover the requested resource
and any required cross-region inference resources. AccessDenied/ValidationException
errors retain provider details and never cause fallback. Verify the exact model ID,
profile, region and permissions. Schema compilation can be slow: configure a sufficient
`$llm` timeout, for example 180000 ms. Converse uses that instance timeout and does not
retry partial streams or tool executions automatically.

Stats retain existing token field meanings, raw `usage`, cache-read/write counters and
stop reasons, adding `api: "converse"` and `latencyMs` when supplied. Cache tokens are not
added again to provider `totalTokens`. Stats represent the latest inference response,
including the final tool continuation. Converse debug records use `setDebugCh` and report
model/API/round/finish metadata without credentials, binary content or opaque reasoning.

Run `oaf -f tests/bedrock.js` for existing and Converse offline regressions, or
`oaf -f tests/bedrock-converse.js` for the focused fixtures. Live tests incur costs and are
opt-in: set `OPENAF_BEDROCK_LIVE=1`, AWS credentials/region and `BEDROCK_MODEL_ID`, then
`BEDROCK_API=converse` and `BEDROCK_LIVE_CASES=text,stream,tools,schema` before running
`oaf -f tests/bedrock-live.js`. Use `image` with `BEDROCK_IMAGE_FILE` for images. Advanced
unknown models can supply `BEDROCK_MODEL_CAPABILITIES` as the JSON override map above.
Unverified/unsupported cases skip; unexpected provider failures fail. Repeat with another
model ID to test another family. Without `BEDROCK_API=converse`, the original live native
schema test remains the default.
