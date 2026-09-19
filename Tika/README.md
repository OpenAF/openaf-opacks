# Tika

Extract text and metadata from existing documents using Apache Tika 4.0.0.
Includes parsers for PDF, Microsoft Office (including DOCX/XLSX/PPTX), HTML,
plain text, email and image metadata. Format support depends on the bundled
parsers; this is not the full Tika application distribution.

Requires **Java 17+** and **OpenAF 20260918+**. Validated with OpenAF
20260918 and Java 26. Dependencies shared with OpenAF are removed during
packaging, so older OpenAF dependency sets have not been verified.

```sh
opack install Tika
```

```javascript
loadLib("tika.js")
var tika = new Tika()
var document = tika.extractFile("report.pdf")
print(document.text)
print(document.mediaType)
print(document.metadata)
```

Each extraction returns:

```javascript
{
  text: "Extracted document text...",
  metadata: { "Content-Type": ["application/pdf"] },
  mediaType: "application/pdf",
  source: "/absolute/path/report.pdf",
  truncated: false
}
```

Metadata keys are Tika's original keys; **all metadata values are arrays of
strings**, including single values. `mediaType` may include charset parameters.
Tika 4 uses `tk:` prefixes for some keys. Text retains parser whitespace.

## API

| Method | Description |
|---|---|
| `new Tika(options)` | Creates an extractor with the options below |
| `extractFile(path)` | Reads a regular local file; closes the opened stream; source is its canonical path |
| `extractBytes(bytes, name)` | Reads an OpenAF/Java byte array; optional filename hint becomes the source |
| `extractStream(stream, name, source)` | Consumes a Java InputStream from its current position; **caller must close it**; optional source defaults to name |

| Constructor option | Default | Meaning |
|---|---|---|
| `maxChars` | `1000000` | Maximum extracted UTF-16 characters; `-1` explicitly allows unlimited output; `0` retains no text |
| `ocr` | `false` | Enables Tesseract OCR and automatic PDF OCR |
| `ocrLanguage` | `"eng"` | Tesseract language selection, e.g. `"eng+por"` |
| `embedded` | `false` | Allows embedded documents/attachments to contribute to the text |

```javascript
var tika = new Tika({ maxChars: 200000, embedded: false })
var stream = io.readFileStream("document.docx")
try {
  var result = tika.extractStream(stream, "document.docx", "knowledge/manual")
} finally {
  stream.close()
}
```

When the character limit is reached, the result contains partial text and
`truncated: true`; metadata may also be incomplete. Other parser errors propagate
to the caller. An unsupported format may yield metadata with empty text.
Embedded extraction concatenates text; it does not return separate child records.
The default skips attachments, not the internal parts needed to read Office files.

The character limit bounds returned text, **not input size, parser memory, or
execution time**. Apply input-size limits and process isolation/timeouts outside
this wrapper when handling large or untrusted documents. No general parser
timeout or OCR accuracy guarantee is provided.

OCR is disabled by default. Enabling it requires a separately installed
`tesseract` executable and the selected language data on the system. The opack
does not install these. Scanned PDFs can return empty text with OCR disabled.
Live OCR has not been validated in the development environment.

## oafp

```sh
oafp libs=Tika in=tika file=report.pdf
oafp libs=Tika in=tika file=report.docx path=text out=raw
oafp libs=Tika in=tika file=report.pdf tikamaxchars=20000
oafp libs=Tika help=tika
```

Options are `tikamaxchars`, `tikaocr`, `tikaocrlanguage`, and `tikaembedded`.
They map to the constructor options above. The input requires `file=`; binary
stdin and `cmd=` are not supported. `in=tika` is explicit to avoid overriding
other document libraries. Files are opened by Tika without an initial oafp text
read. Check `truncated` before discarding the result envelope with `path=text`.

For lucene or Mini-A ingestion, map `text` to document content and retain `source`
and `metadata` alongside it. This opack does not create indexes or modify wikis.

## Development and validation

From this directory:

```sh
ojob ojob.io/oaf/mavenGetJars folder=.
ojob ojob.io/oaf/checkOAFJars path=. remove=true versioninsensitive=true
oaf -f tests/regression.js
opack genpack . --exclude .openaf_precompiled
```

When upgrading, remove the old JAR set first, fetch the pinned artifacts from
`.maven.yaml`, and align the root `pom.xml` direct dependencies. Tika 4's
`tika-parsers-standard-package` is POM-only; individual modules are listed so the
repository's JAR downloader works. The Log4j-to-SLF4J bridge routes parser logs
through OpenAF's logging setup.

Use the same `--exclude .openaf_precompiled` when running `opack pack .`.

Tests use small synthetic fixtures (no external services): HTML with Unicode,
PDF, DOCX and email, plus limits, error propagation, caller stream ownership and
the oafp adapter. Run the CLI examples above for end-to-end oafp validation.
JARs retain their upstream license/notice resources; Apache Tika is Apache-2.0.

Initial opack version: **20260919**.
