# Dependency update checks

`packageUpdates.js` is loaded by the dependency update workflows from the
repository root. It compares package files with Git HEAD, including staged
changes, deletions and untracked additions.

Both ghcopilot update jobs only bump the version and run `opack genpack` when
files other than `.package.yaml` change. Downloading identical Maven artifacts
therefore leaves the existing package version intact.

The JDBC generator can rewrite package metadata and license reports on each
build. After generation, the workflow restores tracked `.package.yaml` and
`LICENSES.txt` files for packages without other changes. This preserves the
previous policy of ignoring license-report-only churn, but checks file names
instead of the number of changed files. A single changed JAR or wrapper is a
real update and is retained, along with its generated metadata and licenses.

These helpers are intended for clean CI checkouts. The JDBC cleanup restores
generated files from HEAD; do not use it to preserve manual metadata edits.

Run the focused regression checks (using disposable Git repositories) with:

```sh
node --test .github/scripts/tests/packageUpdates.test.cjs
```

No oPack payload is modified by this workflow fix, so it needs no package
regeneration or date-based package version bump.
