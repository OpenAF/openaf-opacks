# Copilot Instructions for openaf-opacks

This repository is a monorepo of OpenAF opacks—self-contained modules that extend OpenAF with integrations, utilities, and automations. Each opack lives in its own subdirectory under the repo root and usually carries its own `README.md`, package metadata, and main JavaScript entry file.

## Architecture & Layout
- **Independent opacks:** Every folder (e.g., `Kube`, `Badgen`, `plugin-SMB`) is an installable opack with its own source, documentation, and packaging files. Avoid assuming shared state across folders.
- **Entry points:** Opacks generally expose a primary `.js` file (`kube.js`, `badgen.js`, etc.) that scripts load through `require()` or `loadLib()`. Some opacks provide additional helper scripts or assets.
- **Documentation:** Always check the opack’s `README.md`, `.package.yaml`/`.package.json`, and any `docs/` or `examples/` directory for usage notes, dependencies, and testing hints.
- **Repo metadata:** Shared assets such as `.github/badges/` contain resources (for example SVG badges) that opacks may reference.

## Developer Workflows
- **Inspect before editing:** Read the target opack’s `README.md` and package file to understand its purpose, external requirements, and expected runtime environment.
- **Install for local usage:** Use `opack install <OpackName>` to load an opack into your OpenAF environment when you need to test it manually.
- **Packaging workflow:** After modifying an opack, run `opack genpack .` from inside that opack’s directory. Update the `version` field in its package file to the current date (`yyyyMMdd`).
- **Testing:** There is no global test runner. Look for opack-specific scripts (e.g., `tests/`, `ojob`, or `*.test.js`). Follow instructions documented in the opack itself.
- **Debugging:** Leverage the `Debug` opack when troubleshooting OpenAF scripts. Example:
  ```bash
  oaf -c "require('debug.js').load('yourScript.js')"
  ```

## Updating OpenAF Opack JARs from Maven

When an opack depends on OpenAF core JARs or other Maven-provided artifacts and you need to refresh them to the latest published versions, follow this repeatable workflow inside the opack directory (or repo root if jars are centralized):

1. Remove existing JARs so stale/renamed versions don't linger:
  ```bash
  rm *.jar
  ```
2. Download current Maven artifacts referenced by the opack using the helper job:
  ```bash
  ojob ojob.io/oaf/mavenGetJars folder=.
  ```
  (Adjust `folder=` if jars are stored in a subfolder.)
3. Normalize and optionally prune outdated JARs, ignoring version differences where appropriate:
  ```bash
  ojob ojob.io/oaf/checkOAFJars path=. remove=true versioninsensitive=true
  ```
  - `remove=true` will delete obsolete or duplicate jars.
  - `versioninsensitive=true` treats certain artifacts as equivalent across patch versions when cleaning.
4. Update the `pom.xml` (at the project root: `/pom.xml`) to reflect any dependency version bumps or artifact additions/removals:
  - Sync versions to what was just downloaded.
  - Remove entries for jars that were pruned.
  - Add new dependencies if new jars appeared.
  - Keep formatting and ordering consistent with existing style.

After updating, regenerate the package for the opack if its bundle includes these jars (`opack genpack .`) and bump the opack version (`yyyyMMdd`) in its package metadata. Document the change (e.g., in the opack `README.md` or PR description) noting updated dependencies.

Checklist:
- [ ] Old jars deleted
- [ ] New jars fetched via `mavenGetJars`
- [ ] Cleanup executed via `checkOAFJars`
- [ ] `pom.xml` aligned with actual jars
- [ ] Opack version bumped & package regenerated
- [ ] Notes added for reviewers/users

## Coding & Style Conventions
- JavaScript executes inside OpenAF. Follow the existing style in each opack—commonly two-space indentation, `var` declarations, and camelCase for identifiers. Respect any established naming patterns (e.g., `_internalState`, PascalCase helpers).
- Keep changes localized. Introducing shared logic across opacks should be avoided unless explicitly intended.
- Do not add third-party dependencies unless the opack already documents them or you coordinate the change.
- YAML configuration files typically use two-space indentation and lower-case keys; ensure generated content matches the surrounding style.

## Common Integrations & Examples
- **Kube:** Wraps Kubernetes REST APIs. Typical usage:
  ```javascript
  loadLib("kube.js")
  $kube().getNS()
  $kube().apply(resourceDefinition)
  ```
- **plugin-SMB:** Provides SMB file share access:
  ```javascript
  plugin("SMB")
  var smb = new SMB("smb://host/share", "DOMAIN\\user", "password")
  smb.list("/")
  ```
- **Badgen:** Generates SVG badges:
  ```javascript
  var badge = require("badgen.js")
  badge.badgen({ label: "build", status: "passing", color: "green" })
  ```
- Many other opacks bridge external services (AWS, GCP, Docker, Redis, etc.). Review their README to learn about required credentials or environment configuration.

## Tips for Agents
- Start by understanding the opack’s documented behavior and dependencies before modifying code.
- Highlight when credentials, API keys, or infrastructure are required to reproduce results.
- Surface packaging steps (`opack genpack`, version bumps) in PR descriptions to remind reviewers.
- When adding new functionality, include usage notes or update the opack’s README if behavior changes, new options are introduced, or additional setup is required.

With these guidelines, agents can navigate the monorepo effectively and respect the conventions that keep each opack self-contained and releasable.
