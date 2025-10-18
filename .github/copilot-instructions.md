# Copilot Instructions for openaf-opacks

This repository contains a large collection of OpenAF opacks—modular wrappers and utilities for integrating external APIs, services, and libraries into OpenAF automations. Each opack is self-contained, typically with its own `README.md` and example usage.

## Architecture & Structure
- **Monorepo of opacks:** Each subdirectory in `openaf-opacks/` is an independent opack (plugin/module). Key examples: `Kube`, `Badgen`, `plugin-SMB`, `Debug`, etc.
- **Entry points:** Most opacks expose a main JS file (e.g., `badgen.js`, `kube.js`) and are loaded via `require()` or `loadLib()` in OpenAF scripts.
- **Documentation:** Each opack should have a `README.md` with install and usage instructions. Refer to these for conventions and integration details.

## Developer Workflows
- **Install opacks:** Use `opack install <opackName>` to add an opack to your environment. Some opacks require dependencies (e.g., `BouncyCastle` for security features).
- **Testing:** There is no global test runner; tests are opack-specific. Look for test scripts or instructions in each opack's directory.
- **Debugging:** Use the `Debug` opack to enable debug output in scripts: `oaf -c "require('debug.js').load('yourScript.js')"`.
- **Kubernetes Integration:** The `Kube` opack wraps Kubernetes REST API calls. Example:
  ```javascript
  loadLib("kube.js")
  $kube().getNS() // List namespaces
  $kube().apply(def) // Apply resource definition
  ```
- **SMB Integration:** The `plugin-SMB` opack provides wrappers for Windows file sharing. Example:
  ```javascript
  plugin("SMB");
  var smb = new SMB("smb://host/share", "DOMAIN\\user", "password");
  smb.list("/");
  smb.copyTo("/remote/file", "./local/file");
  ```
- **Badgen:** The `Badgen` opack generates SVG badges. Example:
  ```javascript
  var r = require("badgen.js")
  r.badgen({ label: "build", status: "passing", color: "green" })
  ```

## Project Conventions
- **Opack pattern:** Each opack is a self-contained module with its own install, usage, and sometimes dependencies.
- **No global build/test:** Workflows are decentralized; always check the opack's own documentation.
- **External dependencies:** Some opacks wrap external APIs (AWS, GCP, Docker, etc.) and may require credentials or environment setup.
- **YAML/JSON:** Many opacks accept resource definitions in YAML or JSON. Use `io.readFileYAML()` to convert YAML to JSON in OpenAF scripts.
- **Versioning and packaging:** Whenever you change any sub-folder (opack), run:
  ```bash
  opack genpack .
  ```
  Then update the `version` field in the corresponding `.package.yaml`, `.package.yml`, or `.package.json` file inside that folder to the current day in `yyyyMMdd` format (e.g., `20251018`).

## Key Files & Directories
- `README.md` in each opack: Always check for usage, options, and integration notes.
- `.github/badges/`: Contains SVG badges for opack status.
- Main JS files (e.g., `badgen.js`, `kube.js`): Entry points for opack functionality.

## Examples
- **Install and use an opack:**
  ```bash
  opack install Badgen
  ```
  ```javascript
  var r = require("badgen.js")
  r.badgen({ label: "test", status: "ok" })
  ```
- **Debug a script:**
  ```bash
  oaf -c "require('debug.js').load('yourScript.js')"
  ```

---
If any section is unclear or missing important patterns, please provide feedback to improve these instructions.
