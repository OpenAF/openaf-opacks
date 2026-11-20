// Offline ECR image inspector. Run from AWS/: oaf -f tests/ecr-browse-details.js
ow.loadFormat()
ow.loadServer()
ow.loadTemplate()
const common = getEnv("BROWSE_SOURCE") || getOPackPath("oJob-common")
const http = io.readFileYAML(common + "/oJobHTTPd.yaml")
const helpers = http.jobs.find(job => String(job.exec).includes("global.__ojobHttpRelativePath =")).exec
new Function(helpers.substring(0, helpers.indexOf("var ks")))()
const job = io.readFileYAML("oJobECR.yaml").jobs[0].exec

var assertions = 0
function check(value, label) {
  assertions++
  if (!value) throw new Error(label)
}
const digest = ch => "sha256:" + ch.repeat(64)
const index = digest("a"), amd = digest("b"), arm = digest("c"), config = digest("d"), attestation = digest("e"), docker = digest("2")

// Exercise the registry wrapper without network traffic, including redirect credentials and byte integrity.
function WireAWS() {}
const URL = java.net.URL
const wireBytes = new java.lang.String('{"schemaVersion":2}').getBytes("UTF-8")
var wireCalls = [], wireStatus = 200, wireRedirect = false, wireLength = wireBytes.length
function mockURL(base, location) {
  const parsed = isDef(location) ? new URL(new URL(base), location) : new URL(base)
  return {
    getHost: () => parsed.getHost(), getProtocol: () => parsed.getProtocol(),
    getUserInfo: () => parsed.getUserInfo(), getPort: () => parsed.getPort(),
    openConnection: () => {
      const call = { host: String(parsed.getHost()), headers: {} }
      wireCalls.push(call)
      return {
        setInstanceFollowRedirects: () => {}, setConnectTimeout: () => {}, setReadTimeout: () => {},
        setRequestProperty: (key, value) => { call.headers[key] = value },
        getResponseCode: () => wireRedirect && wireCalls.length == 1 ? 307 : wireStatus,
        getHeaderField: () => "https://ecr-configs.s3.eu-west-1.amazonaws.com/signed?credential=fixture",
        getContentLengthLong: () => wireLength,
        getInputStream: () => new java.io.ByteArrayInputStream(wireBytes),
        disconnect: () => { call.closed = true }
      }
    }
  }
}
// The wrapper passes its first constructed URL back as the base for a redirect.
function wireURL(base, location) {
  return mockURL(isString(base) ? base : "https://" + base.getHost(), location)
}
const javaFixture = { net: { URL: wireURL }, io: java.io, lang: java.lang, nio: java.nio }
new Function("AWS", "java", io.readFileString("aws_ecr.js"))(WireAWS, javaFixture)
const wire = new WireAWS(), wireDigest = "sha256:" + sha256(wireBytes)
wire.ECR_GetAuthorizationToken = () => ({ authorizationToken: "Zml4dHVyZQ==" })
function registryRead(kind, ref) { return wire.ECR_ReadRegistryJSON("eu-west-1", "123456789012", "team/image", kind, ref) }
check(registryRead("manifests", wireDigest).schemaVersion == 2, "registry wrapper parses verified digest")
check(wireCalls[0].headers.Accept.includes("manifest.list.v2") && wireCalls[0].closed, "registry requests Docker and OCI index types and closes")
wireCalls = []
wireRedirect = true
check(registryRead("blobs", wireDigest).schemaVersion == 2 && wireCalls.length == 2, "config blob follows the AWS S3 redirect")
check(isDef(wireCalls[0].headers.Authorization) && isUnDef(wireCalls[1].headers.Authorization), "registry authorization stays on the registry host")
wireRedirect = false
wireStatus = 403
var resultStatus
try { registryRead("manifests", wireDigest) } catch (e) { resultStatus = e.httpStatus }
check(resultStatus == 403, "registry preserves permission status")
wireStatus = 200
var mismatch
try { registryRead("manifests", digest("0")) } catch (e) { mismatch = e.message }
check(mismatch == "ECR metadata digest mismatch", "registry rejects a digest mismatch")

wireLength = 1048577
var oversized
try { registryRead("blobs", wireDigest) } catch (e) { oversized = e.message }
check(oversized == "ECR metadata exceeds the size limit", "registry checks declared size before reading")

const serviceCalls = []
wire.postURLEncoded = (url, path, query, params, service, host, region, headers) => {
  serviceCalls.push({ url: url, path: path, params: JSON.parse(JSON.stringify(params)), service: service, headers: headers })
  if (service == "ecr") return { referrers: [], nextToken: "page2" }
  if (!params.nextToken) return { responses: [], nextToken: "usage2" }
  return { responses: [{ awsEcrContainerAggregation: { imageSha: amd, accountId: "123456789012", repository: "team/image",
    inUseCount: 0, lastInUseAt: 1711050100, severityCounts: { critical: 99 } } }] }
}
check(wire.ECR_ListImageReferrers("eu-west-1", "team/image", "123456789012", amd, "page1").nextToken == "page2" &&
  serviceCalls[0].params.subjectId.imageDigest == amd && serviceCalls[0].params.nextToken == "page1" &&
  serviceCalls[0].headers["X-Amz-Target"].endsWith(".ListImageReferrers"), "referrers request is digest-scoped and paginated")
const usageResponse = wire.ECR_GetImageRuntimeUsage("eu-west-1", "team/image", "123456789012", amd)
check(usageResponse.inUseCount === 0 && usageResponse.lastInUseAt == 1711050100 && !usageResponse.severityCounts &&
  serviceCalls[1].params.accountIds[0].value == "123456789012" && serviceCalls[2].params.nextToken == "usage2" &&
  serviceCalls[1].path == "/findings/aggregation/list" && serviceCalls[1].service == "inspector2", "Inspector request is scoped and exposes only usage")

const scan = []
let descriptions = 0
const referrerCalls = []
const configs = { os: "linux", architecture: "amd64", variant: "v2", created: "2024-03-21T19:40:00Z", author: "Image builder",
  rootfs: { diff_ids: [digest("3"), digest("4")] }, config: {
  Entrypoint: ["/app"], Cmd: ["start"], WorkingDir: "/work", User: "app", ExposedPorts: { "8080/tcp": {} },
  Env: ["EXAMPLE_URL=https://example.test/?q=<test>&page=1", "EMPTY="], Labels: { "org.example.title": "<b>literal label</b>" },
  Volumes: { "/data": {} }, StopSignal: "SIGTERM", Healthcheck: { Test: ["CMD", "/health"] }
}, history: [
  { created_by: "ADD base", author: "Layer builder" }, { created_by: "LABEL <script>danger</script>", empty_layer: true }, { created_by: "COPY app" }
] }
const manifest = { schemaVersion: 2, mediaType: "application/vnd.oci.image.manifest.v1+json",
  config: { digest: config, mediaType: "application/vnd.oci.image.config.v1+json" },
  annotations: { "<b>key</b>": "<i>literal tag</i>", version: "2026", reference: "https://example.invalid/" },
  layers: [{ digest: digest("f"), size: 100, mediaType: "test", annotations: { "org.example.layer": "base" } }, { digest: digest("1"), size: 1200000, mediaType: "test" }] }
const metadata = (ref, tags) => ({ registryId: "123456789012", imageDigest: ref, imageTags: tags, imagePushedAt: 1711050000, imageSizeInBytes: 1200100, imageStatus: "ACTIVE",
  lastRecordedPullTime: 1711050100, lastArchivedAt: 1711050010, lastActivatedAt: 1711050090 })
function FixtureAWS() {}
FixtureAWS.prototype.ECR_DescribeRepositories = () => [{ repositoryName: "team/image" }]
FixtureAWS.prototype.ECR_DescribeImages = (region, repository, params) => {
  if (params.imageIds) {
    descriptions++
    return [metadata(params.imageIds[0].imageDigest, ["latest"])]
  }
  return [metadata(index, ["latest", "1.10.0-rc.10", "1.10.0"]), metadata(amd), metadata(docker, ["1.9.0", "1.10.0-rc.2"])]
}
FixtureAWS.prototype.ECR_ListImageReferrers = (region, repository, registry, subject, token) => {
  referrerCalls.push([subject, token])
  if (subject == docker) throw new Error("Denied")
  return token ? { referrers: [] } : { referrers: [{
    artifactType: "application/example", digest: attestation, mediaType: manifest.mediaType, size: 42,
    artifactStatus: "ACTIVE", annotations: { "<b>key</b>": "<i>annotation</i>" }
  }], nextToken: "page+2" }
}
FixtureAWS.prototype.ECR_ReadRegistryJSON = (region, registry, repository, kind, ref) => {
  scan.push([repository, kind, ref])
  if (ref == arm) {
    const e = new Error("Denied")
    e.httpStatus = 403
    throw e
  }
  if (ref == config) return configs
  if (ref == attestation) return { mediaType: "application/vnd.oci.image.manifest.v1+json", artifactType: "application/example", layers: [] }
  if (ref == index || ref == docker) return { mediaType: ref == docker ? "application/vnd.docker.distribution.manifest.list.v2+json" : "application/vnd.oci.image.index.v1+json", manifests: [
    { digest: amd, platform: { os: "linux", architecture: "amd64" } },
    { digest: arm, platform: { os: "linux", architecture: "arm64", variant: "v8" } },
    { digest: attestation, platform: { os: "unknown", architecture: "unknown" }, annotations: { "vnd.docker.reference.type": "attestation-manifest" } }
  ] }
  return manifest
}
const support = {}
new Function("exports", io.readFileYAML(common + "/oJobBrowse.yaml").code["ojob-browse-contract.js"])(support)
let clock = now()
const definition = new Function("args", "AWS", "loadLib", "require", "now", job)
const args = { region: "eu-west-1", cache: 30000, options: { imageDetails: true, operations: { enabled: true } } }
definition(args, FixtureAWS, () => {}, () => support, () => clock)
args.fns.init()
const opts = merge(args.options, { parentURI: "/ecr", port: 19861 })
function view(params, options) {
  return args.fns.getObj({ uri: "/ecr/team/image", params: params || {} }, options || opts)
}
const searchOptions = merge(opts, { query: { enabled:true, wildcards:true } })
function searchFolder(path, q, wildcards) {
  return args.fns.search({ uri:"/ecr/" + path, params:{ q:q, recursive:"0", wildcards:wildcards } }, searchOptions).list
}
check(searchFolder("", "te?m", "1").some(row => row.isDirectory && row.values["Repository Name"] == "team"), "shallow ECR search includes virtual folders")
check(!searchFolder("", "te?m", "0").length && !searchFolder("", "image", "0").length, "shallow literal ECR search excludes deeper repositories")
check(searchFolder("team", "image", "0").length == 1, "shallow repository name is relative")
check(searchFolder("team/image", "lat*", "1").some(row => row.values.Tag == "latest"), "shallow image search preserves tag rows")
const repository = view()
check(repository.data.includes("?image=" + encodeURIComponent(index)), "tag links to index digest")
check(repository.data.includes("?image=" + encodeURIComponent(amd)), "untagged digest links")
const tagPositions = ["1.9.0", "1.10.0-rc.2", "1.10.0-rc.10", "1.10.0", "latest"]
  .map(tag => repository.data.indexOf(">" + tag + "</a>"))
check(tagPositions.every((offset, i) => offset >= 0 && (i == 0 || offset > tagPositions[i-1])),
  "all tags are flattened and sorted by SemVer before the non-version alias")
check(scan.length == 0, "repository adds no registry reads")
check(isArray(view({ image: index }, merge(opts, { _api: true })).data.ecrimgs), "API object response unchanged")
check(!view({}, merge(opts, { imageDetails: false })).data.includes("?image="), "inspector opt-in")
const platforms = view({ image: index, tab: "platforms" }).data
check(platforms.includes("linux/arm64/v8") && platforms.includes("Attestation"), "multiarchitecture and attached artifact rows")
check(scan.length == 1 && scan[0][2] == index, "index is fetched without children")
check(!view({ image: index, tab: "layers" }).data.includes("ecr-layer-chart"), "index requires a platform for layers")
const layerView = view({ image: index, platform: amd, tab: "layers" }).data
check(layerView.includes("ecr-layer-chart") && layerView.includes("1200000") &&
  layerView.includes('&quot;labels&quot;:[&quot;Layer 1&quot;,&quot;Layer 2&quot;]'), "layer chart follows manifest order with exact table sizes")
check(layerView.includes('aria-label="Image breadcrumb"') &&
  layerView.includes('href="?image=' + encodeURIComponent(index) + '&amp;tab=platforms"'), "selected platform links back to the original image")
check(scan.length == 3 && scan[1][2] == amd && scan[2][2] == config, "layers read the selected manifest and config")
check(layerView.includes("Uncompressed digest (DiffID)") && layerView.includes(digest("3")), "layers show matching DiffIDs")
const manifestView = view({ image: index, platform: amd, tab: "manifest" }).data
check(manifestView.includes('id="ecr-manifest"') && manifestView.includes('/js/njsmap.js') &&
  manifestView.includes('/css/nJSMap.css') && manifestView.includes('nJSMap.mount(tree, JSON.parse(source)'), "manifest tab uses the local nJSMap renderer")
check(manifestView.includes('&lt;b&gt;key&lt;/b&gt;') && manifestView.includes('&lt;i&gt;literal tag&lt;/i&gt;') &&
  !manifestView.includes('<i>literal tag</i>') && manifestView.includes('class="language-json"'), "manifest JSON fallback escapes keys and values")
check(!layerView.includes('/js/njsmap.js') && scan.length == 3, "manifest map is tab-scoped and needs no additional registry reads")
const history = view({ image: index, platform: amd, tab: "history" }).data
check(history.includes('<th scope="row"><strong>2</strong></th>'), "history steps have bold row headings")
check(history.includes('.ecr-detail-table th[scope="row"]{text-align:right}'), "digest table row headings align to the right")
check(history.includes("Metadata only") && history.includes("&lt;script&gt;danger&lt;/script&gt;"), "history handles metadata-only steps and escaped commands")
check(history.includes("Layer builder"), "history shows step author")
check(history.indexOf(digest("1")) > history.indexOf("COPY app"), "history keeps layer association after metadata-only step")
const runtime = view({ image: index, platform: amd, tab: "config" }).data
check(runtime.includes('<th scope="row"><strong>Entrypoint</strong></th>'), "configuration properties have bold row headings")
check(runtime.includes('id="ecr-env-title"><span aria-hidden="true">⚙️</span> Environment variables</h3>') &&
  runtime.includes('<th scope="col">Name</th><th scope="col">Value</th>') &&
  runtime.includes('<strong>EXAMPLE_URL</strong></th><td>https://example.test/?q=&lt;test&gt;&amp;page=1</td>') &&
  runtime.includes('<strong>EMPTY</strong></th><td></td>'), "config shows escaped environment values, including embedded equals signs and empty values")
check(runtime.includes("8080/tcp"), "config shows exposed ports")
check(runtime.includes("Image builder") && runtime.includes("/data") && runtime.includes("SIGTERM") &&
  runtime.includes("Health check") && !runtime.includes("org.example.title"), "config shows build and runtime properties")
check(scan.length == 3 && scan[2][1] == "blobs" && scan[2][2] == config, "Layers, History and Config share one config read")
const single = view({ image: amd, tab: "platforms" }).data
check(single.includes('<strong>Supported platform</strong>') && single.includes("linux/amd64/v2"), "single manifest platform comes from image config")
const overview = view({ image: index, platform: amd }).data
check(overview.includes('id="ecr-labels-title"><span aria-hidden="true">🏷️</span> Labels</h3>') && overview.includes("org.example.title") &&
  overview.includes("&lt;b&gt;literal label&lt;/b&gt;"), "overview shows escaped image labels")
check(!overview.includes("Runtime usage") && !view({ image: index }).data.includes('id="ecr-labels-title"'),
  "overview omits Runtime usage and empty Labels sections")
check(overview.includes("Last recorded pull") && overview.includes("Last archived") && overview.includes("Last activated") && overview.includes("ACTIVE"), "overview shows registry lifecycle metadata")
check(overview.includes('<strong>Platform</strong>') && overview.includes("linux/amd64"), "selected platform overview uses its index descriptor")
check(overview.includes('id="ecr-annotations-title"><span aria-hidden="true">📝</span> Annotations</h3>') &&
  overview.includes("&lt;b&gt;key&lt;/b&gt;") && overview.includes("&lt;i&gt;literal tag&lt;/i&gt;") &&
  !overview.includes("<i>literal tag</i>") && overview.includes("org.example.layer"), "overview shows escaped manifest and layer annotations")
check(view({ image: index }).data.includes("Index entry 3 · Attestation"), "index overview shows its annotated entries")
check(!view({ image: attestation }).data.includes('id="ecr-annotations-title"'), "unannotated images omit the section")
const artifactView = view({ image: index, platform: attestation }).data
check(artifactView.includes('<h4><span aria-hidden="true">📄</span> Index descriptor</h4>') && artifactView.includes("vnd.docker.reference.type"),
  "selected artifact overview shows the parent descriptor annotations")
check(platforms.includes(encodeURIComponent(attestation) + '">Attestation</a>') &&
  artifactView.includes('aria-label="Image breadcrumb"') && artifactView.includes('<strong>Artifact</strong>'), "artifact details retain the original image breadcrumb")
check(view({ image: docker, tab: "platforms" }).data.includes("linux/amd64"), "Docker manifest list shows platform details")
check(view({ image: index, platform: arm, tab: "layers" }).data.includes("denied access"), "permission error stays in requested view")
function status(params, expected) {
  var actual
  try { view(params) } catch (e) { actual = e.httpStatus }
  check(actual == expected, "invalid or unrelated selection returns " + expected)
}
status({ image: "invalid" }, 400)
status({ image: index, platform: config, tab: "manifest" }, 404)
check(!referrerCalls.length, "other tabs do not load referrers")
const artifacts = view({ image: index, platform: amd, tab: "artifacts" }).data
check(artifacts.includes("application/example") && artifacts.includes("artifactPage=page%2B2") &&
  artifacts.includes("&lt;i&gt;annotation&lt;/i&gt;") && referrerCalls[0][0] == amd, "selected platform lists escaped referrers and a next link")
view({ image: index, platform: amd, tab: "artifacts" })
check(referrerCalls.length == 1, "referrers share the mutable metadata cache")
check(view({ image: index, platform: amd, tab: "artifacts", artifactPage: "page+2" }).data.includes("First page") &&
  referrerCalls[1][1] == "page+2", "referrer pages have independent cache keys")
check(view({ image: docker, tab: "artifacts" }).data.includes("Attached artifacts are unavailable"),
  "attached artifacts handles denied access")
status({ image: index, tab: "usage" }, 400)
status({ image: index, platform: config, tab: "artifacts" }, 404)
const before = scan.length, beforeDescriptions = descriptions
clock += 31000
view({ image: index, platform: amd, tab: "history" })
view({ image: index, platform: amd, tab: "manifest" })
check(scan.length == before && descriptions == beforeDescriptions,
  "switching tabs reuses registry metadata, manifests and config past the overview metadata TTL")
view({ image: index, platform: amd })
check(scan.length == before && descriptions == beforeDescriptions + 1,
  "overview refreshes tag metadata and reuses digest-addressed documents")
clock += 300000
view({ image: index, platform: amd, tab: "history" })
check(scan.length == before + 3, "expired index, manifest and config are fetched again")
args.fns.refresh({ uri: "/ecr/team/image", params: {} }, opts)
view({ image: index, platform: amd, tab: "history" })
check(scan.length == before + 6, "repository refresh invalidates the inspector cache")
print("PASS " + assertions + " ECR inspector assertions")
