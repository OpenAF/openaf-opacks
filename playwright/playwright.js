// Author: Nuno Aguiar

var __playwrightPath = getOPackPath("playwright") || "."
var __playwrightLocalPath = "."

var __playwrightListJars = function(aFolder, aExpr) {
  if (isUnDef(aFolder) || isUnDef(aExpr) || !io.fileExists(aFolder)) return []

  return $from(io.listFiles(aFolder).files)
         .match("filename", aExpr)
         .select(function(r) { return r.filename })
}

var __playwrightGetVersion = function(aFolder) {
  var _versions = []

  _versions = _versions.concat(__playwrightListJars(aFolder, "^driver-bundle-(.+)\\.jar$"))
  _versions = _versions.concat(__playwrightListJars(aFolder, "^playwright-(.+)\\.jar$"))
  _versions = _versions.concat(__playwrightListJars(aFolder, "^driver-(.+)\\.jar$"))

  if (_versions.length <= 0) return __

  var _res = String(_versions[0]).match(/-(.+)\.jar$/)
  return isDef(_res) ? _res[1] : __
}

var __playwrightHasBundle = function(aFolder) {
  return __playwrightListJars(aFolder, "^driver-bundle-(.+)\\.jar$").length > 0
}

var __playwrightEnsureBundle = function() {
  if (__playwrightHasBundle(__playwrightLocalPath) || __playwrightHasBundle(__playwrightPath)) return

  var _target = __playwrightLocalPath
  var _version = __playwrightGetVersion(__playwrightLocalPath)

  if (isUnDef(_version)) {
    _target = __playwrightPath
    _version = __playwrightGetVersion(__playwrightPath)
  }

  ow.loadJava()
  var maven = new ow.java.maven()

  printErr("Playwright driver bundle not found locally. Attempting to download from Maven Central...")
  if (isDef(_version)) {
    maven.getFileVersion("com.microsoft.playwright.driver-bundle", "driver-bundle-{{version}}.jar", _version, _target)
  } else {
    maven.getFile("com.microsoft.playwright.driver-bundle", "driver-bundle-{{version}}.jar", _target)
  }
  printErr("Playwright driver bundle downloaded successfully.")
}

__playwrightEnsureBundle()
loadExternalJars(__playwrightLocalPath)
if (__playwrightPath != __playwrightLocalPath) loadExternalJars(__playwrightPath)

var Playwright = function(aOptions) {
  this.options = _$(aOptions, "aOptions").isMap().default({})
}

Playwright.prototype._newPlaywright = function() {
  return Packages.com.microsoft.playwright.Playwright.create()
}

Playwright.prototype._newBrowserType = function(aPlaywright, aEngine) {
  var _engine = _$(aEngine, "engine").isString().default("chromium").toLowerCase()

  switch(_engine) {
  case "firefox": return aPlaywright.firefox()
  case "webkit" : return aPlaywright.webkit()
  default       : return aPlaywright.chromium()
  }
}

Playwright.prototype.run = function(aJob) {
  var _r = __
  var _job = _$(aJob, "aJob").isMap().default({})

  _job.url     = _$( _job.url, "aJob.url").isString().default("https://example.com")
  _job.engine  = _$( _job.engine, "aJob.engine").isString().default("chromium")
  _job.timeout = _$( _job.timeout, "aJob.timeout").isNumber().default(30000)
  _job.headless = _$( _job.headless, "aJob.headless").default(true)
  _job.waitUntil = _$( _job.waitUntil, "aJob.waitUntil").isString().default("load")
  _job.userAgent = _$( _job.userAgent, "aJob.userAgent").isString().default(__)

  var _p = this._newPlaywright()
  var _b, _c, _pg

  try {
    var _bt = this._newBrowserType(_p, _job.engine)
    var _bo = new Packages.com.microsoft.playwright.BrowserType.LaunchOptions().setHeadless(toBoolean(_job.headless))
    _b = _bt.launch(_bo)

    var _co = new Packages.com.microsoft.playwright.Browser.NewContextOptions()
    if (isDef(_job.userAgent)) _co.setUserAgent(String(_job.userAgent))
    _c = _b.newContext(_co)

    _pg = _c.newPage()
    _pg.navigate(_job.url, new Packages.com.microsoft.playwright.Page.NavigateOptions().setTimeout(Number(_job.timeout)).setWaitUntil(Packages.com.microsoft.playwright.options.WaitUntilState.valueOf(String(_job.waitUntil).toUpperCase())))

    if (isDef(_job.waitForSelector)) {
      _pg.waitForSelector(_job.waitForSelector, new Packages.com.microsoft.playwright.Page.WaitForSelectorOptions().setTimeout(Number(_job.timeout)))
    }

    _r = {
      url      : String(_pg.url()),
      title    : String(_pg.title()),
      content  : String(_pg.content())
    }

    if (isDef(_job.screenshotPath)) {
      _pg.screenshot(new Packages.com.microsoft.playwright.Page.ScreenshotOptions().setPath(java.nio.file.Paths.get(String(_job.screenshotPath))).setFullPage(toBoolean(_job.fullPage)))
      _r.screenshotPath = String(_job.screenshotPath)
    }

    if (isDef(_job.pdfPath)) {
      _pg.pdf(new Packages.com.microsoft.playwright.Page.PdfOptions().setPath(java.nio.file.Paths.get(String(_job.pdfPath))))
      _r.pdfPath = String(_job.pdfPath)
    }

    if (isDef(_job.script)) {
      _r.scriptResult = af.eval(_job.script, { page: _pg, context: _c, browser: _b })
    }
  } finally {
    if (isDef(_pg)) try { _pg.close() } catch(e) {}
    if (isDef(_c)) try { _c.close() } catch(e) {}
    if (isDef(_b)) try { _b.close() } catch(e) {}
    if (isDef(_p)) try { _p.close() } catch(e) {}
  }

  return _r
}
