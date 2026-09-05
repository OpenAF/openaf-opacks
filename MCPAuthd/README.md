# MCPAuthd

MCPAuthd is a standalone HTTP auth server implementing the server side of oJobMCP's `authapiurl`
contract: it verifies a JWT bearer credential, looks its id up in a `$ch` (a local file, DynamoDB,
or any other registered `$ch` type), and checks the id's validation date and its list of authorized
URIs. It replies `200` when everything checks out and `401`/`403` otherwise, failing closed on any
error. It can also be used as a generic nginx/Traefik forward-auth (`auth_request`) endpoint.

It runs on its own port, separate from the MCP server(s) it protects, and is provisioned separately
-- ids are added/updated with the `mcpAuthSetId`/`mcpAuthSign` jobs against the same channel.

Because `X-OJob-MCP-URI` is set once, at MCP-server startup, from oJobMCP.yaml's own `uri` argument
(not per-request), the URI patterns authorize which MCP endpoint an id may reach (useful when
several MCP servers, on different URIs/ports, share one auth server) -- not which individual tool
it may call.

## Install

With OpenAF installed execute:

````bash
opack install MCPAuthd
````

## Running it as a standalone daemon

`MCPAuthd.yaml` wraps `oJobMCPAuth.yaml`'s "HTTP MCP Auth Server" job (plus healthz/metrics) into a
ready-to-run daemon:

````bash
ojob MCPAuthd.yaml secret="a-very-long-shared-secret-of-32-bytes+"
````

### Arguments

| Argument | Description | Default |
|---|---|---|
| `port` | The port where the auth server should be made available | `8092` |
| `uri` | The URI to handle validation requests on | `/auth` |
| `chName` | The `$ch` channel name used to store id records | `mcpauth` |
| `chType` | The `$ch` type to use -- file, dynamo, or any other registered `$ch` type | `file` |
| `chArgs` | JSSLON/JSON map with the `$ch` args (required for `chType=dynamo`, e.g. `"(tableName: mcpauth, region: eu-west-1)"`) | a local `mcpauth.yaml` file for `chType=file` |
| `chKey` | The `$ch` key field used to look up an id's record | `key` |
| `authheader` | The request header to read the credential from | `authorization` (or env `OJOB_MCPAUTH_HEADER`) |
| `authscheme` | The scheme prefix expected before the token | `Bearer` (or env `OJOB_MCPAUTH_SCHEME`) |
| `authrealm` | The realm reported in the `WWW-Authenticate` challenge | `MCP` |
| `keytype` | How to resolve the verification key -- `secret`, `pubkey` or `kms` | `secret` |
| `secret` | The HS* shared secret, used when `keytype=secret` | (or env `OJOB_MCPAUTH_SECRET`) |
| `pubkey` | A PEM or base64 DER-encoded public key, used when `keytype=pubkey` | |
| `pubkeyfile` | A file path to read the public key from, alternative to `pubkey` | |
| `kmsregion` | The AWS region of the KMS key, used when `keytype=kms` | (or env `OJOB_MCPAUTH_KMS_REGION`) |
| `kmskeyid` | The KMS key id or ARN, used when `keytype=kms` | (or env `OJOB_MCPAUTH_KMS_KEYID`) |
| `idclaim` | The JWT claim carrying the id to look up | `sub` |
| `issuer` | If defined, the token's `iss` claim must equal this value | |
| `audience` | If defined, the token's `aud` claim must contain this value | |
| `cachettl` | If greater than 0, caches a decision (per token + uri) for this many milliseconds | `0` (disabled) |
| `audit` | If true, logs every allow/deny decision | `true` (or env `OJOB_MCPAUTH_AUDIT`) |
| `auditdenyonly` | If true, only denials are logged | `false` |
| `debug` | If true, extra detail is logged on denials | `false` |

## Using it as a library (oJobMCPAuth.yaml)

`oJobMCPAuth.yaml` can also be included directly into your own oJob, alongside oJobMCP.yaml, to run
the auth endpoint and the protected MCP server(s) in the same process.

`oJobHTTPd.yaml` must be listed first, explicitly: both `oJobMCP.yaml` and `oJobMCPAuth.yaml`
include it too, and when two included files each nest-include the same file, the second file's own
jobs/shortcuts don't get registered. Listing the shared dependency first avoids that.

````yaml
include:
- oJobHTTPd.yaml
- oJobMCP.yaml
- oJobMCPAuth.yaml

ojob:
  daemon: true

jobs:
- name: ping
  exec: |
    args.text = "PONG!"

todo:
# --- auth server, on its own port
- (httpdStart)  : 8092
- (mcpAuthCh)   : mcpauth
  ((chType))    : file
  ((chArgs))    : { file: "mcpauth.yaml", yaml: true, lock: "mcpauth.lock" }
- (httpdMCPAuth): 8092
  ((uri))       : "/auth"
  ((keytype))   : secret
  ((secret))    : "a-very-long-shared-secret-of-32-bytes+"

# --- the protected MCP server
- (httpdStart)  : 8091
- (httpdMCP)    : 8091
  ((uri))       : "/mcp"
  ((authapiurl)): "http://127.0.0.1:8092/auth"
  ((fns))       :
    ping: ping
````

The auth endpoint runs on its own port (8092), separate from the protected MCP server (8091).
Sharing one port would make oJobMCP's `authapiurl` call block on the same httpd it's answering for
-- fine under the default threaded impl, but a deadlock risk under a bounded executor -- and is
also the more realistic deployment shape, since the auth server normally runs as a separate process
reachable only from the MCP hosts.

Note: `authapicachettl` on the oJobMCP side should be `<=` the shortest token lifetime, otherwise a
revoked/expired token keeps working for that cache window.

### Seeding an id and signing a token

A separate, short-lived ojob run against the same channel file:

````yaml
include:
- oJobHTTPd.yaml
- oJobMCPAuth.yaml

todo:
- (mcpAuthCh)   : mcpauth
  ((chType))    : file
  ((chArgs))    : { file: "mcpauth.yaml", yaml: true, lock: "mcpauth.lock" }
- (mcpAuthSetId): agent-alpha
  ((uris))        : ["/mcp"]
  ((validUntil))  : "2027-01-01T00:00:00Z"
- (mcpAuthSign) : agent-alpha
  ((secret))    : "a-very-long-shared-secret-of-32-bytes+"
  ((print))     : true
````

For a DynamoDB-backed channel: `chType: dynamo`, `chArgs: { tableName: mcpauth, region: eu-west-1 }`,
`chKey: id` (requires the AWS opack).

### Managing the `$ch` and rotating credentials

The channel contains authorization records, not JWT strings. The JWT identifies a record (by
`sub`, or by the configured `idclaim`) and has its own `exp` expiry. Keep the same `chName`,
`chType`, `chArgs`, and `chKey` in the daemon and in every provisioning job. `mcpAuthCh` creates
the channel if needed and reuses it on later runs; a channel's type and arguments are not changed
when it is reused.

The usual file-backed provisioning job is:

````yaml
include:
- oJobHTTPd.yaml
- oJobMCPAuth.yaml

todo:
- (mcpAuthCh)   : mcpauth
  ((chType))    : file
  ((chArgs))    : { file: "mcpauth.yaml", yaml: true, lock: "mcpauth.lock" }
- (mcpAuthSetId): agent-alpha
  ((uris))      : ["/mcp"]
  ((validUntil)): "2027-01-01T00:00:00Z"
- (mcpAuthSign) : agent-alpha
  ((secret))    : "a-very-long-shared-secret-of-32-bytes+"
  ((expiresIn)) : 3600000
  ((print))     : true
````

Run it as a short-lived provisioning command, for example `ojob manage-auth.yaml`. Store the
printed token in the client configuration or secret store; do not put it in `mcpauth.yaml` or
commit it to source control. The same pattern works with DynamoDB, using the same `chArgs` as the
daemon and `chKey: id`:

````yaml
- (mcpAuthCh)   : mcpauth
  ((chType))    : dynamo
  ((chArgs))    : { tableName: mcpauth, region: eu-west-1 }
  ((chKey))     : id
````

To add an ID, run `mcpAuthSetId` with its URI patterns and optional `validUntil`, then issue a
token with `mcpAuthSign` (or `generateMCPJWT.yaml`). Updating `mcpAuthSetId` for an existing ID
replaces that record, so it can be used to change its URI permissions, extend its authorization
date, or re-enable it with `enabled: true`.

To replace an expired JWT, issue a new token for the same ID with `mcpAuthSign` or
`generateMCPJWT.yaml`; the `$ch` record normally does not need to change. The token lifetime and the
record's `validUntil` are independent, and both must still be valid. Issuing a new JWT does not
invalidate an older, still-unexpired JWT for the same ID. To revoke all tokens for an ID, disable
the record:

````yaml
- (mcpAuthSetId): agent-alpha
  ((uris))      : ["/mcp"]
  ((enabled))   : false
````

Alternatively, set `validUntil` to a time in the past. If `cachettl` is enabled, a previously
allowed decision can remain effective until that cache entry expires; use `cachettl: 0` when
immediate record changes are required, or keep it shorter than the required revocation window.
To rotate without briefly sharing an ID, provision a new ID, issue its token, update the client,
then disable the old ID. Since the channel key is the ID, changing `chKey` or moving between
backends requires a separately named channel and coordinated daemon/client cutover.

### Managing it from `oafc` / `openaf-console`

The same operations can be performed interactively. Start either `oafc` or `openaf-console`, then
open the channel in that console process. For the default file backend:

````bash
oafc
````

````javascript
var authCh = $ch("mcpauth")
if ($ch().list().indexOf("mcpauth") < 0) {
  authCh.create(1, "file", { file: "mcpauth.yaml", yaml: true, lock: "mcpauth.lock" })
}
````

The channel must be opened in the console even when MCPAuthd is already running in another
process; `$ch` registrations are process-local, while the file backend and its lock coordinate
access to the shared file. For DynamoDB, load the AWS library and create/open the channel with the
same table, region, and key configuration:

````javascript
loadLib("aws.js")
var authCh = $ch("mcpauth")
if ($ch().list().indexOf("mcpauth") < 0) {
  authCh.create(1, "dynamo", { tableName: "mcpauth", region: "eu-west-1" })
}
````

With `chKey: key` (the file default), add or replace an authorization record with `set`:

````javascript
authCh.set({ key: "agent-alpha" }, {
  enabled: true,
  validUntil: "2027-01-01T00:00:00Z",
  uris: [ "/mcp", "/mcp/*" ]
})
authCh.get({ key: "agent-alpha" })
authCh.getAll()
````

Use the actual key field for other backends, for example `authCh.set({ id: "agent-alpha" },
{ ... })` when `chKey` is `id`. To disable an ID without deleting its record, set `enabled: false`;
to remove it entirely, use `authCh.unset({ key: "agent-alpha" })`. These changes affect all
tokens whose ID resolves to that record. They do not replace an individual JWT.

To issue or replace a token directly in the console:

````javascript
ow.loadServer()
var token = ow.server.jwt.sign("a-very-long-shared-secret-of-32-bytes+", {
  expiration: new Date(now() + 3600000),
  claims: { sub: "agent-alpha" }
})
print(token)
````

Copy the token to the client secret store. The secret, token, and private key must not be saved in
the channel file or committed to source control. For asymmetric signing, pass a Java private-key
object instead of the string secret, or use `mcpAuthSign`/`generateMCPJWT.yaml` as described below.

### Generating a token directly

`generateMCPJWT.yaml` is a standalone ojob that prints a token compatible with MCPAuthd. It uses
OpenAF's native `ow.server.jwt.sign` implementation and supports the same shared-secret or PEM
private-key signing modes as `mcpAuthSign`:

````bash
ojob generateMCPJWT.yaml id=agent-alpha secret="a-very-long-shared-secret-of-32-bytes+"
````

For asymmetric verification, provide a PKCS8 PEM private key and select its algorithm (for example
`alg=RS256`); configure MCPAuthd with the corresponding public key. `expiresIn` is in milliseconds
and defaults to one hour. The `idclaim`, `issuer`, and `audience` arguments map to the claims
checked by MCPAuthd.

## Jobs (and shortcuts)

Each job's full argument list is available via its `help` block (e.g. `ojob oJobMCPAuth.yaml --help "HTTP MCP Auth Server"`).

| Job | Shortcut | Purpose |
|---|---|---|
| MCP Auth Channel | `mcpAuthCh` | Creates (or reuses) the `$ch` channel used to store MCP auth id records. Must run before "HTTP MCP Auth Server" and "MCP Auth Set Id" -- both simply read the channel by name and fail loudly if it doesn't exist, so that a channel's type/args are only ever set once, here. |
| HTTP MCP Auth Server | `httpdMCPAuth` | Starts the HTTP endpoint that validates a JWT bearer credential against the `$ch` of id records. Requires "MCP Auth Channel" to have already created the channel. Fails closed on any error, missing credential, expired token, expired/disabled record or unauthorized URI. |
| MCP Auth Set Id | `mcpAuthSetId` | Provisioning/test helper that creates or updates an id record on the MCP auth channel. |
| MCP Auth Sign Token | `mcpAuthSign` | Test/provisioning helper that signs a JWT for a given id, using a local secret or PEM private key. Sets `args.token`. |

### Record format

For the "file" backend with `chKey: key`, records live as plain top-level keys in the channel's
YAML file (`mcpauth.yaml` by default) and are hand-editable:

````yaml
agent-alpha:
  enabled   : true
  validUntil: "2026-12-31T23:59:59.000Z"
  uris      :
  - /mcp
  - /mcp/*
agent-beta:
  validUntil: "2026-09-01T00:00:00.000Z"
  uris      :
  - /internal-mcp
````

Do not use `value` as a record field name -- the "file" backend's `set` unwraps a `{ value: ... }`
map.

### Auditing

On by default, because this is an auth server and the log is its primary forensic record. Every
decision is logged -- allows via `log()`, denials via `logWarn()` so they stand out and can be
alerted on separately. The default template is:

````
AUDIT MCPAUTH | {{result}} {{status}} id={{id}} uri={{uri}} reason={{reason}} tid={{tid}} ({{ip}}; {{ua}}) {{ms}}ms cached={{cached}}
````

Sample output:

````
2026-08-15 01:29:46 | INFO | AUDIT MCPAUTH | ALLOW 200 id=agent-alpha uri=/mcp reason=ok tid=02affe0b2d5e (127.0.0.1; curl/8.7.1) 4ms cached=false
2026-08-15 01:29:37 | WARN | AUDIT MCPAUTH | DENY 403 id=agent-expired uri=/mcp reason=record_expired tid=3a613241ca81 (127.0.0.1; curl/8.7.1) 6ms cached=false
````

The "reason" taxonomy (`ok`, `no_credential`, `bad_alg`, `invalid_signature`, `token_expired`,
`unknown_id`, `disabled`, `record_expired`, `uri_required`, `insufficient_scope`, `key_unavailable`,
`error`) is internal to the log only -- the HTTP response body always carries the coarse
`invalid_token` / `insufficient_scope` / `token_expired` error code, so the wire response never
reveals whether an id exists. The token itself, the secret, and any signature material are never
logged -- only a `sha512(token)` prefix (`tid`), so repeated failures from one credential can be
correlated without the credential being recoverable from the log. Header values (id, uri,
user-agent, IP) are sanitized (`\r`/`\n` stripped, capped at 256 chars) before being logged, so a
crafted header can't forge a second log line.

### Note on HS* algorithms

OpenAF's jjwt-backed signer/verifier NUL-pads a string secret to 32, 48 or 64 bytes and
auto-selects HS256/384/512 accordingly -- the resulting alg depends on the secret's length, not on
an explicit choice. A short secret also will not interoperate with other JWT libraries unless they
pad identically.

### KMS signing note

KMS signing is deliberately not supported by "MCP Auth Sign Token" -- AWS KMS's `ECDSA_SHA_*`
signatures are DER-encoded while JOSE ES* requires raw R||S, so a KMS-EC-signed token would not
verify; for KMS-backed verification use an RSA key and sign externally, or convert DER to R||S.
