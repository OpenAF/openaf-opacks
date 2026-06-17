ow.loadServer()
ow.loadTemplate()

var KATEX_PATH = getOPackPath("KaTeX") || "."

if (isUnDef(__flags.HTTPD_CUSTOMURIS)) __flags.HTTPD_CUSTOMURIS = {}

var KATEX_ASSETS = {
  "/js/katex.min.js": { file: "/lib/katex.min.js", mime: ow.server.httpd.mimes.JS },
  "/js/auto-render.min.js": { file: "/lib/auto-render.min.js", mime: ow.server.httpd.mimes.JS },
  "/js/showdown-katex.min.js": { file: "/lib/showdown-katex.min.js", mime: ow.server.httpd.mimes.JS },
  "/css/katex.min.css": { file: "/lib/katex.min.css", mime: ow.server.httpd.mimes.CSS }
}

Object.keys(KATEX_ASSETS).forEach(uri => {
  __flags.HTTPD_CUSTOMURIS[uri] = function(aHTTPd) {
    return aHTTPd.replyBytes(
      io.readFileBytes(KATEX_PATH + KATEX_ASSETS[uri].file),
      KATEX_ASSETS[uri].mime,
      ow.server.httpd.codes.OK,
      ow.server.httpd.cache.public
    )
  }
})

var __katexRuntimeSetup = '' +
  '<script>(function(){' +
  'if(window.__katexOpackReady)return;window.__katexOpackReady=true;' +
  'function patchShowdown(){' +
  'if(typeof window.showdown==="undefined")return;' +
  'if(typeof window.showdownKatex!=="function")return;' +
  'var Ctor=window.showdown.Converter;' +
  'if(!Ctor||Ctor.__katexPatched)return;' +
  'window.showdown.Converter=function(options){' +
  'options=options||{};' +
  'var extensions=options.extensions||[];' +
  'if(!Array.isArray(extensions))extensions=[extensions];' +
  'var hasKatex=false;' +
  'for(var i=0;i<extensions.length;i++){' +
  'if(extensions[i]===window.__katexShowdownExtension)hasKatex=true;' +
  '}' +
  'if(!hasKatex){window.__katexShowdownExtension=window.showdownKatex({throwOnError:false});extensions.push(window.__katexShowdownExtension);}' +
  'options.extensions=extensions;' +
  'return new Ctor(options);' +
  '};' +
  'window.showdown.Converter.prototype=Ctor.prototype;' +
  'window.showdown.Converter.__katexPatched=true;' +
  '}' +
  'function renderMath(){' +
  'if(typeof window.renderMathInElement!=="function")return;' +
  'window.renderMathInElement(document.body,{' +
  'delimiters:[{left:"$$",right:"$$",display:true},{left:"\\\\[",right:"\\\\]",display:true},{left:"$",right:"$",display:false},{left:"\\\\(",right:"\\\\)",display:false}],' +
  'throwOnError:false,trust:false' +
  '});' +
  '}' +
  'function init(){patchShowdown();renderMath();}' +
  'if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();' +
  '})();</script>';

var __katexAssetsHTML = [
  '<link rel="stylesheet" href="/css/katex.min.css">',
  '<script src="/js/katex.min.js"></script>',
  '<script src="/js/showdown-katex.min.js"></script>',
  '<script src="/js/auto-render.min.js"></script>',
  __katexRuntimeSetup
]

var __katexApplyPrefix = (aHTML, aURIPrefix) => {
  aURIPrefix = ow.server.httpd.getHTMLPrefix(aURIPrefix)
  if (aURIPrefix == "") return aHTML

  return String(aHTML)
    .replace(/\b(src|href)=(["'])(\/[^"']*)\2/g, (m, attr, quote, uri) => attr + '=' + quote + aURIPrefix + uri + quote)
    .replace(/url\((["']?)(\/[^)"']*)\1\)/g, (m, quote, uri) => 'url(' + quote + aURIPrefix + uri + quote + ')')
}

var __katexHasInlineMath = aMarkdownString => {
  aMarkdownString = String(aMarkdownString)

  var inFence = false, inInlineCode = false
  for (var i = 0; i < aMarkdownString.length; i++) {
    if (aMarkdownString.substr(i, 3) == '```') {
      inFence = !inFence
      i += 2
      continue
    }

    var ch = aMarkdownString.charAt(i)
    if (!inFence && ch == '`') {
      inInlineCode = !inInlineCode
      continue
    }

    if (inFence || inInlineCode) continue

    if (ch == '$' && aMarkdownString.charAt(i - 1) != '\\' && aMarkdownString.charAt(i + 1) != '$') {
      if ((aMarkdownString.charAt(i + 1) || '').match(/\s/)) continue

      for (var j = i + 1; j < aMarkdownString.length; j++) {
        var cj = aMarkdownString.charAt(j)
        if (cj == '\n') break
        if (cj == '$' && aMarkdownString.charAt(j - 1) != '\\' && aMarkdownString.charAt(j - 1) != ' ' && aMarkdownString.charAt(j + 1) != '$') return true
      }
    }
  }

  return false
}

var __katexHasMath = aMarkdownString => {
  aMarkdownString = String(aMarkdownString)
  return /(^|\n)\$\$[\s\S]*?\$\$(?=\n|$)/.test(aMarkdownString) ||
         /\\\([\s\S]*?\\\)/.test(aMarkdownString) ||
         /\\\[[\s\S]*?\\\]/.test(aMarkdownString) ||
         __katexHasInlineMath(aMarkdownString)
}


var __katexStripAssets = aHTML => String(aHTML)
  .replace(/<link rel="stylesheet" href="[^"]*\/css\/katex\.min\.css">/g, '')
  .replace(/<script src="[^"]*\/js\/katex\.min\.js"><\/script>/g, '')
  .replace(/<script src="[^"]*\/js\/showdown-katex\.min\.js"><\/script>/g, '')
  .replace(/<script src="[^"]*\/js\/auto-render\.min\.js"><\/script>/g, '')
  .replace(/<script>\(function\(\)\{if\(window\.__katexOpackReady\)return;window\.__katexOpackReady=true;[\s\S]*?<\/script>/g, '')

if (isDef(ow.template.__mdHTMLTExtras)) {
  ow.template.__mdHTMLTExtras = ow.template.__mdHTMLTExtras.filter(r => String(r.e).indexOf('katex.min.') < 0 && String(r.e).indexOf('__katexOpackReady') < 0)
}
if (isDef(ow.template.__mdHTMLExtras)) {
  ow.template.__mdHTMLExtras = ow.template.__mdHTMLExtras.filter(r => String(r).indexOf('katex.min.') < 0 && String(r).indexOf('__katexOpackReady') < 0)
}

ow.template.__katexOriginalParseMD2HTML = ow.template.__katexOriginalParseMD2HTML || ow.template.parseMD2HTML
ow.template.__katexParseMD2HTMLWrapped = true
ow.template.parseMD2HTML = function(aMarkdownString, isFull, removeMaxWidth, extraDownOptions, forceDark, aURIPrefix) {
  var out = ow.template.__katexOriginalParseMD2HTML.call(this, aMarkdownString, isFull, removeMaxWidth, extraDownOptions, forceDark, aURIPrefix)
  if (!isFull) return out

  var cleanedOut = __katexStripAssets(out)
  if (!__katexHasMath(aMarkdownString)) return cleanedOut
  if (String(cleanedOut).indexOf('katex.min.js') >= 0 || String(cleanedOut).indexOf('katex.min.css') >= 0) return cleanedOut

  var extras = __katexAssetsHTML.map(r => __katexApplyPrefix(r, aURIPrefix)).join('')
  if (String(cleanedOut).indexOf('</head>') >= 0) return String(cleanedOut).replace('</head>', extras + '</head>')
  if (String(cleanedOut).indexOf('<body') >= 0) return String(cleanedOut).replace(/<body([^>]*)>/, extras + '<body$1>')
  return extras + cleanedOut
}

if (isDef(ow.template.__srcPath)) {
  ow.template.__srcPath["/js/katex.min.js"] = KATEX_PATH + "/lib/katex.min.js"
  ow.template.__srcPath["/js/auto-render.min.js"] = KATEX_PATH + "/lib/auto-render.min.js"
  ow.template.__srcPath["/js/showdown-katex.min.js"] = KATEX_PATH + "/lib/showdown-katex.min.js"
  ow.template.__srcPath["/css/katex.min.css"] = KATEX_PATH + "/lib/katex.min.css"
}

var fontsPath = KATEX_PATH + "/lib/fonts"
if (io.fileExists(fontsPath)) {
  io.listFiles(fontsPath).files.forEach(f => {
    __flags.HTTPD_CUSTOMURIS["/fonts/" + f.filename] = function(aHTTPd) {
      return aHTTPd.replyBytes(
        io.readFileBytes(f.canonicalPath),
        ow.server.httpd.getMimeType(f.filename),
        ow.server.httpd.codes.OK,
        ow.server.httpd.cache.public
      )
    }
    if (isDef(ow.template.__srcPath)) {
      ow.template.__srcPath["/fonts/" + f.filename] = f.canonicalPath
      ow.template.__srcPath["/css/fonts/" + f.filename] = f.canonicalPath
    }
  })
}
