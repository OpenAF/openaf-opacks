# Maven-backed oPack maintenance

The root `pom.xml` is a dependency alert/control manifest for Dependabot, rather
than an oPack build. `updateMaven.yaml` maps those dependencies to the oPacks that
consume them and prepares complete updates locally. It requires Git, OpenAF,
Maven (`mvn`), Java 9 or newer, the Maven oPack, and network access for version discovery/downloads.
Compiled plugin adapters also require a suitable JDK (`javac`).

## Commands

Run from the repository root:

```sh
ojob updateMaven.yaml action=list
```

```sh
# Discover newer stable direct dependencies online
ojob updateMaven.yaml action=list online=true

# Report consumers affected by POM changes relative to a Git revision
ojob updateMaven.yaml action=list base=origin/master

# Inspect one oPack, including bundled JAR evidence
ojob updateMaven.yaml action=list folder=Kafka format=json

# Preview latest versions, holds, build/test configuration and review warnings
ojob updateMaven.yaml action=plan folder=Kafka

# Prepare in a temporary copy, validate, and apply a successful candidate
ojob updateMaven.yaml action=update folder=Kafka report=/tmp/kafka-update.json
```

`list` is the default. `plan` and `update` require a top-level oPack folder with
`.package.yaml`. An explicitly selected untracked oPack is supported; default
inventory includes tracked manifests only. `list` without `online=true` performs
no dependency network requests. The POM baseline is optional and works offline
when the revision exists locally.

## Version and layout policy

Updates resolve latest stable releases for **all direct dependencies in the
selected oPack**, including existing pins. Known snapshot/prerelease qualifiers
are excluded. Version ordering uses OpenAF `ow.format.compareVersion`, including date/numeric
versions and its fallback for Maven qualifiers; unusual versions are reported as requiring review. Version numbers are
risk hints, not evidence of API compatibility.

Normal Maven transitive resolution is retained. Transitive artifacts appear in
before/after JAR inventories but are not independently promoted to latest.
Resolved direct versions are persisted, including previously unpinned entries.
Unchanged pinned manifests retain their original text. Changed manifests use
OpenAF YAML serialization, which can remove comments.

The root POM keeps one target per Maven coordinate. Successful updates advance
existing targets or add missing direct dependencies, preserving newer existing
targets and unrelated entries. Different versions in other oPacks remain visible
as drift; they are not implicitly updated. Unmapped POM dependencies are reported
rather than deleted, because they may represent transitive dependencies or
manually maintained tracking entries. Maven properties and conflicting duplicate
POM versions are explicitly unsupported and block processing.

`mavenMaintenance.json` configures exceptions:

```json
{
  "schemaVersion": 1,
  "repository": "https://repo.maven.apache.org/maven2",
  "holds": {
    "FalkorDB/redis.clients:jedis": {
      "version": "8.0.1",
      "reason": "Keep compatible with the selected JFalkorDB release"
    }
  },
  "opacks": {
    "Example": {
      "build": ["ojob", "compile.yaml"],
      "expected": ["plugin-example.jar"],
      "tests": [
        {"command": ["oaf", "-f", "tests/offline.js"]},
        {
          "command": ["ojob", "tests/integration.yaml"],
          "external": true,
          "prerequisites": "Local test server and test credentials"
        }
      ]
    }
  }
}
```

The example is illustrative; it does not establish a hold in the shipped config.
Keys under `holds` are either `group:artifact` globally or
`oPack/group:artifact` for one consumer; consumer holds take precedence.
Every hold needs an exact version and an explanation.

Adapters are registered explicitly, never inferred and executed automatically.
The five plugin compile jobs are registered with expected plugin JAR outputs.
An unregistered `compile.yaml` blocks preparation. Commands are argument arrays,
run from the candidate oPack root in a fresh process. Their exit status must
indicate failure, including failed assertions; recognized swallowed oJob and
compiler errors are also treated as failures. Tests must load checkout-relative
wrappers/JARs, rather than accidentally validating an installed oPack.

Nested `.maven.yaml` files use their containing directory as output. Legacy
`libs:` manifests support their `location` and `template`. Per-manifest adapters
can set `outputDir` relative to the manifest directory and `swapCoordinates`;
the shipped qr adapter corrects its reversed coordinates and targets `lib/`.
`additionalArtifacts` restores required direct dependencies missing from a manifest;
Docker registers `com.amihaiemil.web:docker-java-api` this way. The resolved entry is
persisted in its manifest. `blockedReason` stops preparation for known unsupported
layouts; GoogleCompiler needs a reviewed dual Java-baseline compiler adapter.
Plugin adapters use `cleanClasses` to discard newly generated loose class files
after packing their JAR. Existing build JARs are retained when their entry contents
are identical, avoiding package churn from ZIP timestamps alone. Registered
`stableArchives` apply the same comparison to generated `.odoc.db` help databases.
Empty manifests are reported; a selected oPack with no usable manifest blocks.
Symlinks and paths escaping the selected oPack are unsupported.

## Preparation, testing and packaging

Each update takes an exclusive repository lock, snapshots the working files,
and prepares in an OS temporary directory. Cleanup removes direct `.jar` files
only in the registered dependency directories, with compiled plugins rebuilt
by their adapters. Each directory runs:

```sh
ojob ojob.io/oaf/mavenGetJars folder=.
ojob ojob.io/oaf/checkOAFJars path=. remove=true versioninsensitive=true
```

Downloaded direct artifacts and expected build outputs must exist and be readable
JARs. Pruning uses the **invoked OpenAF runtime**, with its OpenAF/Java versions
recorded in the report. Before/after JAR inventories include hashes, sizes, and
embedded Maven `pom.properties` where available; filename evidence is explicitly
labelled and can be ambiguous. Platform-specific templates are preserved; download templates must be JAR
basenames, with output directories configured separately.

Major changes, pre-1.0 minor changes, downgrades and unclassifiable version changes
require review but do not prevent preparing/applying an otherwise valid update.
Missing tests also permit application with an explicit manual-testing warning.
Registered test failures leave the source unchanged and retain the candidate.
External tests are skipped unless `external=true`; their prerequisites and skipped
status appear in the report. Optional `requiredEnv` lists prerequisite environment
variables; external tests remain skipped if any are missing (Redis requires
`REDIS_TEST_HOST`). Tests that mutate candidate files fail validation.

Changed distributed files or Maven manifests trigger a date-based package version
and regeneration:

```sh
opack genpack . --exclude .git,.github,tests,.claude,.openaf_precompiled,.mini-a
```

Package file existence, hashes, exclusions and JAR coverage are verified before
application. Identical downloads and unchanged manifests retain the previous
package version and signatures. Existing dirty files are copied as the baseline;
unrelated work is preserved. Concurrent edits to the selected oPack or POM stop
application and retain the candidate.

The job records backups and an application journal, then copies only changed files
and the synchronized POM. Failed preparation never changes the working oPack.
The job does not install, commit, push, publish, or build the final external oPack
archive. Generated files and signature updates remain available for review.

## Reports and recovery

Output uses `ow.oJob.output` with an array of dependency rows for `ctable`
(default), `table`, `stable`, and `csv`. JSON, YAML and other structured formats
receive the full report. Standard oJob flags (for example `-json` or
`__format=yaml`) take precedence over `format=...`. Markdown tables use
`ow.template.md.table`, shared by local output and the CI summary.
`report=<path>` additionally writes the complete JSON report. Schema version 1
contains runtime details, per-oPack dependency targets/drift/holds, review warnings,
JAR inventories/changes, pruning records, byte-size changes, test statuses,
changed paths, command diagnostics, and the retained candidate directory.

Exit codes are `0` for completed processing, including review warnings; `1` for
operational, build, test or package-validation failure; and `2` for blocked
configuration, unsupported layout, lock contention or concurrent edits.

Candidates and reports remain in the temporary directory printed by the job.
They may contain proprietary source or test output; keep reports free of secrets
and remove retained candidates when review is complete. OS temporary cleanup can
remove them, so copy a needed failed candidate before reboot/cleanup.

An interrupted application may have copied only some files. Restore its verified
original backups with:

```sh
ojob updateMaven.yaml action=recover candidate=/absolute/path/from/report
```

Recovery checks every current file against its original/candidate hash before
restoring anything and refuses conflicts or missing/corrupt backups. Completed
journals cannot be recovered. A stale lock owned by a dead process with the same
candidate is cleared during recovery. A live or unowned lock remains blocked;
inspect `.maven-maintenance.lock/owner.json` before manually removing a stale lock.
Run only one maintenance process per checkout, including during recovery.

## CI and validation

The Maven report workflow uses the existing OpenAF `t8` distribution and read-only
repository permissions. Pull requests affecting the POM, Maven manifests or the
maintenance implementation receive an offline report and JSON artifact; manual
dispatch reports all tracked consumers. It performs no downloads, builds or
repository writes and does not replace existing updater workflows. Local runtime
pruning may differ from `t8`; runtime details make that difference visible.

Run focused checks:

```sh
node --test .github/scripts/tests/mavenMaintenance.test.cjs
node --test .github/scripts/tests/packageUpdates.test.cjs
```

Native transaction tests use `OAF_BIN` or `/Applications/OpenAF/oaf`, disposable Git
repositories, real packaging and fixture JARs. They stub only dependency download
and pruning, so these tests do not prove external Maven resolution or runtime
pruning. Version and native transaction tests are skipped if that executable is unavailable. Hosted CI
execution, authenticated services and compatibility against live infrastructure
are separate validation requirements.

## OpenAF helper choices

Version comparison uses `ow.format.compareVersion`; output uses `ow.oJob.output`
and `ow.template.md.table`. Filesystem operations reuse `io.getCanonicalPath`,
`io.cp`, `io.mv`, `io.fileInfo`, `io.mkdir`, and `getPid()`. Journal renaming through
`io.mv` is atomic; the explicit force-to-disk step is retained before renaming.

The directory traversal deliberately skips excluded subtrees before descending
and rejects symlinks; `listFilesRecursive` does not provide that pruning contract.
Persistent candidate directories use Java NIO because `io.createTempDir` registers
shutdown deletion. `pidCheck` can return false on permission/command failures, so
recovery retains Java's process-liveness check. The directory lock also retains
its owner/candidate metadata protocol rather than replacing it with `$flock`.

Maven metadata versions are read through the XML plugin. Selecting stable releases
remains policy code: `ow.java.maven.getLatestVersion` returns the metadata's latest
entry, which may be a prerelease. POM edits preserve existing text/formatting;
replacing them with a Maven model serialization would rewrite unrelated content.
Version tests use the installed OpenAF comparator, rather than duplicating it in
Node. An OpenAF runtime exposing `ow.format.compareVersion` is required.
