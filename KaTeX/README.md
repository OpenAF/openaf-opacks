# KaTeX


## Bundled JavaScript (2026-11-08)

Bundles KaTeX 0.19.1 with its matching auto-render helper, CSS and all fonts. The local showdown-katex adapter is preserved. Assets are served from the opack and do not require a CDN.

The release versions, archive URLs and npm integrity checksums are recorded in upstream.json. Upstream license notices are retained. Maintenance downloads are not required at runtime.

The HTML asset injector preserves literal display-math delimiters when inserting scripts into the head or body.

Verify this from the oPack directory with `oaf -f tests/markdownAssets.js`. Regenerate package metadata with `opack genpack . --exclude tests`; the test is development-only.
