# playwright oPack

Wrapper around [Microsoft Playwright for Java](https://playwright.dev/java/) for OpenAF.

## Install

```bash
opack install playwright
```

## Library usage

```javascript
loadLib("playwright.js")

var pw = new Playwright()
var res = pw.run({
  url      : "https://example.com",
  engine   : "chromium", // chromium | firefox | webkit
  headless : true,
  timeout  : 30000
})

sprint(res)
```

### Screenshot

```javascript
var res = pw.run({
  url           : "https://example.com",
  screenshotPath: "example.png",
  fullPage      : true
})
```

### PDF

```javascript
var res = pw.run({
  url    : "https://example.com",
  pdfPath: "example.pdf"
})
```

## oafp usage

```bash
oafp libs=playwright in=playwright data="https://example.com" out=json
```

Generate a screenshot:

```bash
oafp libs=playwright in=playwright data="https://example.com" out=playwrightscreenshot playwrightscreenshot=example.png
```

## oJob wrapper and shortcuts

Use the bundled `oJobPlaywright.yaml` wrapper jobs:

```bash
ojob oJobPlaywright.yaml job="Playwright Page Info" url="https://example.com"
ojob oJobPlaywright.yaml job="Playwright Screenshot" url="https://example.com" screenshotPath=example.png
```

Shortcut forms:

```bash
ojob oJobPlaywright.yaml playwrightInfo="https://example.com"
ojob oJobPlaywright.yaml playwrightShot="https://example.com" screenshotPath=example.png
```

## Maven dependencies

This opack uses `.maven.yaml` with `com.microsoft.playwright:playwright`.
Download jars with:

```bash
ojob ojob.io/oaf/mavenGetJars folder=.
```

## Notes

On first execution Playwright may download browser binaries for the current platform.
