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

const scan = []
const configs = { os: "linux", architecture: "amd64", variant: "v2", config: {
  Entrypoint: ["/app"], Cmd: ["start"], WorkingDir: "/work", User: "app", ExposedPorts: { "8080/tcp": {} },
  Env: ["VISIBLE_NAME=SECRET_VALUE"]
}, history: [
  { created_by: "ADD base" }, { created_by: "LABEL <script>danger</script>", empty_layer: true }, { created_by: "COPY app" }
] }
const manifest = { schemaVersion: 2, mediaType: "application/vnd.oci.image.manifest.v1+json",
  config: { digest: config, mediaType: "application/vnd.oci.image.config.v1+json" },
  annotations: { "<b>key</b>": "<i>literal tag</i>", version: "2026", reference: "https://example.invalid/" },
  layers: [{ digest: digest("f"), size: 100, mediaType: "test" }, { digest: digest("1"), size: 1200000, mediaType: "test" }] }
const metadata = (ref, tags) => ({ registryId: "123456789012", imageDigest: ref, imageTags: tags, imagePushedAt: 1711050000, imageSizeInBytes: 1200100 })
function FixtureAWS() {}
FixtureAWS.prototype.ECR_DescribeRepositories = () => [{ repositoryName: "team/image" }]
FixtureAWS.prototype.ECR_DescribeImages = (region, repository, params) =>
  params.imageIds ? [metadata(params.imageIds[0].imageDigest, ["latest"])] : [metadata(index, ["latest", "1.10.0-rc.10", "1.10.0"]), metadata(amd), metadata(docker, ["1.9.0", "1.10.0-rc.2"])]
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
const definition = new Function("args", "AWS", "loadLib", "require", job)
const args = { region: "eu-west-1", cache: 30000, options: { imageDetails: true } }
definition(args, FixtureAWS, () => {}, () => support)
args.fns.init()
const opts = merge(args.options, { parentURI: "/ecr", port: 19861 })
function view(params, options) {
  return args.fns.getObj({ uri: "/ecr/team/image", params: params || {} }, options || opts)
}
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
check(scan.length == 2 && scan[1][2] == amd, "only the selected manifest is fetched")
const manifestView = view({ image: index, platform: amd, tab: "manifest" }).data
check(manifestView.includes('id="ecr-manifest"') && manifestView.includes('/js/njsmap.js') &&
  manifestView.includes('/css/nJSMap.css') && manifestView.includes('nJSMap(manifest, undefined, dark)'), "manifest tab uses the local nJSMap renderer")
check(manifestView.includes('&lt;b&gt;key&lt;/b&gt;') && manifestView.includes('&lt;i&gt;literal tag&lt;/i&gt;') &&
  !manifestView.includes('<i>literal tag</i>') && manifestView.includes('class="language-json"'), "manifest JSON fallback escapes keys and values")
check(!layerView.includes('/js/njsmap.js') && scan.length == 2, "manifest map is tab-scoped and needs no additional registry reads")
const history = view({ image: index, platform: amd, tab: "history" }).data
check(history.includes('<th scope="row"><strong>2</strong></th>'), "history steps have bold row headings")
check(history.includes('.ecr-detail-table th[scope="row"]{text-align:right}'), "digest table row headings align to the right")
check(history.includes("Metadata only") && history.includes("&lt;script&gt;danger&lt;/script&gt;"), "history handles metadata-only steps and escaped commands")
check(history.indexOf(digest("1")) > history.indexOf("COPY app"), "history keeps layer association after metadata-only step")
const runtime = view({ image: index, platform: amd, tab: "config" }).data
check(runtime.includes('<th scope="row"><strong>Entrypoint</strong></th>'), "configuration properties have bold row headings")
check(runtime.includes("VISIBLE_NAME") && !runtime.includes("SECRET_VALUE") && runtime.includes("8080/tcp"), "config displays names with no environment values")
check(scan.length == 3 && scan[2][1] == "blobs" && scan[2][2] == config, "History and Config share one config read")
const single = view({ image: amd, tab: "platforms" }).data
check(single.includes('<strong>Supported platform</strong>') && single.includes("linux/amd64/v2"), "single manifest platform comes from image config")
const overview = view({ image: index, platform: amd }).data
check(overview.includes('<strong>Platform</strong>') && overview.includes("linux/amd64"), "selected platform overview uses its index descriptor")
const artifactView = view({ image: index, platform: attestation }).data
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
print("PASS " + assertions + " ECR inspector assertions")
