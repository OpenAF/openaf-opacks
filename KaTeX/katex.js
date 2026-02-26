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

[
  { t: "$", e: '<link rel="stylesheet" href="/css/katex.min.css">' },
  { t: "$", e: '<script src="/js/katex.min.js"></script>' },
  { t: "$", e: '<script src="/js/showdown-katex.min.js"></script>' },
  { t: "$", e: '<script src="/js/auto-render.min.js"></script>' },
  { t: "$", e: __katexRuntimeSetup }
].forEach(l => {
  if (isDef(ow.template.__mdHTMLTExtras)) {
    if ($from(ow.template.__mdHTMLTExtras).equals("t", l.t).equals("e", l.e).none())
      ow.template.__mdHTMLTExtras.push(l)
  } else {
    if (ow.template.__mdHTMLExtras.indexOf(l.e) < 0) ow.template.__mdHTMLExtras.push(l.e)
  }
})

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
  })
}
