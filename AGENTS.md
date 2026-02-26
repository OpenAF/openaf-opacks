# openaf-opacks Agent Guide

## Repo Layout
- This repository is a monorepo of independent OpenAF opacks located in subdirectories such as `Kube`, `Badgen`, or `plugin-SMB`.
- Each opack ships with its own entry point (usually a `*.js` file) that scripts load via `require()` or `loadLib()`, plus documentation like `README.md` and package metadata (`.package.yaml`, `.package.json`, etc.).
- Shared resources live under `.github/` (for example `.github/badges/` contains SVG assets) but functionality is otherwise isolated within each opack directory.

## Working on Opacks
- Start by reading the opack’s `README.md` and package file to understand its purpose, dependencies, and usage expectations.
- Keep changes localized to the targeted opack; avoid introducing cross-opack coupling unless explicitly required.
- Match the existing code style inside the opack—typically two-space indentation, `var` declarations, and camelCase identifiers. Preserve established naming patterns such as `_internalState` prefixes or PascalCase helper constructors.
- Document behavior changes or new options in the opack’s README or docs when relevant.

## Packaging & Versioning
- After modifying an opack, run `opack genpack .` from within that opack’s directory to regenerate the package bundle.
- Update the opack `version` in its package file to the current date in `yyyyMMdd` format (for example `20250312`).
- Highlight packaging actions and version bumps in your change notes to guide reviewers.

## Helpful Commands
- Create or update `.package.yaml`: run `opack genpack .` in the opack folder.
- Create or update `.odoc.db`: run `ojob ojob.io/oaf/genODoc key=[opack-name] folder=.`
- Remove jars already included in OpenAF: run `ojob ojob.io/oaf/checkOAFJars path=. remove=true versioninsensitive=true`
- Download Maven jars based on `.maven.yaml`: run `ojob ojob.io/oaf/mavenGetJars folder=.`

## Testing & Debugging
- There is no global test harness. Look for opack-specific tests (`tests/`, `ojob` scripts, `*.test.js`, etc.) and follow the instructions provided in the folder.
- Install opacks locally with `opack install <OpackName>` if you need to exercise them in an OpenAF environment.
- When troubleshooting scripts that depend on an opack, load the `Debug` opack:
  ```bash
  oaf -c "require('debug.js').load('yourScript.js')"
  ```
- Capture any external prerequisites (credentials, infrastructure, environment variables) so others can reproduce results.

## Common Integrations
- **Kube:** `loadLib("kube.js")` to interact with Kubernetes (`$kube().getNS()`, `$kube().apply(def)`).
- **plugin-SMB:** `plugin("SMB")` then `new SMB("smb://host/share", "DOMAIN\\user", "password")` for SMB file shares.
- **Badgen:** `require("badgen.js")` to generate SVG badges via `badgen({ label, status, color })`.
- Many other opacks wrap APIs and services (AWS, GCP, Docker, Redis, etc.). Their README documents required setup such as API keys or regional configuration.

## Agent Checklist
- [ ] Reviewed the target opack’s documentation and package metadata.
- [ ] Kept edits confined to the relevant opack and matched its coding conventions.
- [ ] Regenerated the package (`opack genpack .`) and bumped the date-based version when publishing updates.
- [ ] Documented new behavior, configuration, or dependencies for users and reviewers.
- [ ] Noted testing steps or limitations, including any external services needed for validation.

## Updating OpenAF Opack JARs from Maven

If an opack (or a shared support folder) includes OpenAF or other Maven-fetched JARs, use this workflow to refresh them cleanly:

1. Remove existing jars to avoid stale leftovers:
  ```bash
  rm *.jar
  ```
2. Fetch the latest Maven artifacts into the current folder:
  ```bash
  ojob ojob.io/oaf/mavenGetJars folder=.
  ```
3. Clean / normalize the jar set, pruning obsolete duplicates (version-insensitive where safe):
  ```bash
  ojob ojob.io/oaf/checkOAFJars path=. remove=true versioninsensitive=true
  ```
4. Update `/pom.xml` so dependency versions and artifact list match what was downloaded (remove missing, add new, bump versions). Keep existing formatting conventions.

Follow-up:
- Regenerate the opack package (`opack genpack .`) if these jars are part of the distributed bundle.
- Bump the opack version (`yyyyMMdd`) in its package metadata.
- Note the update and any version changes in the README or PR description for reviewers.

Quick checklist:
- [ ] Old jars removed
- [ ] New jars fetched
- [ ] Jar cleanup executed
- [ ] `pom.xml` aligned
- [ ] Package regenerated & version bumped
- [ ] Changes documented
