const {chromium} = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("fs");
const http = require("http");
const path = require("path");
const assert = require("assert");
const root = path.resolve(__dirname, "../..");
const {execFileSync} = require("child_process");
const temp = fs.mkdtempSync(path.join(require("os").tmpdir(), "opack-js-test-"));
const jar = process.env.OPENAF_JAR;
if (!jar) {
  throw new Error("Set OPENAF_JAR to the OpenAF JAR used by oaf.");
}
execFileSync("python3", ["-c", 'import zipfile,sys,pathlib; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[3]+"/ace"); pathlib.Path(sys.argv[3]+"/jquery.js").write_bytes(zipfile.ZipFile(sys.argv[2]).read("js/jquery.js"))', path.join(root, "inBrowser/gui/_ace/ace.zip"), jar, temp]);
const offline = path.join(temp, "docsify.html");
const input = {"/README.md":"# Offline test\n```mermaid\ngraph TD; A--\x3eB;\n```\n[Next](next.md)", "/next.md":"# Second page"};
execFileSync("oaf", ["-c", 'load("docsify.js"); var d=new Docsify(); io.writeFileString(' + JSON.stringify(offline) + ", d.genStaticVersion(" + JSON.stringify(input) + ",{mermaid:true}));"], {cwd:path.join(root, "Docsify"), stdio:"pipe"});
assert(fs.existsSync(offline), "OpenAF must generate the static document");
const runtimeCheck = "try { ow.loadTest(); load(" + JSON.stringify(path.join(root, "Compromise/compromise.js")) + '); var p=nlp("I was born on 2017"); ow.test.assert(p.values().data()[0].number,2017,"Compromise numbers"); ow.test.assert(p.verbs().data()[0].parts.verb,"born","Compromise verbs"); var a=require(' + JSON.stringify(path.join(root, "Asciidoc/lib/asciidoctor.min.js")) + ')(); var html=a.convert("Hello *world*!",{standalone:true,attributes:{webfonts:false}}); ow.test.assert(html.indexOf("<strong>world</strong>")>=0,true,"Asciidoctor conversion"); ow.test.assert(html.indexOf("fonts.googleapis.com")<0,true,"Asciidoctor offline fonts"); print("OpenAF runtime PASS"); } catch(e) { printErr(String(e)); exit(1); }';
console.log(execFileSync("oaf", ["-c", runtimeCheck], {encoding:"utf8"}).trim());
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://local");
  let f;
  if (url.pathname === "/") {
    res.setHeader("Content-Type", "text/html");
    return res.end('<!doctype html><div id="diagram">graph TD; A--\x3eB;</div><div id="math"></div><div id="player"></div><canvas id="chart"></canvas><div id="editor" style="width:600px;height:200px"></div><div id="menu">Menu</div>');
  }
  if (url.pathname.startsWith("/ace/")) {
    f = temp + "/ace/" + path.basename(url.pathname);
  } else if (url.pathname === "/core-highlight.js" && process.env.OPENAF_SOURCE) {
    f = path.join(process.env.OPENAF_SOURCE, "js/highlight.js");
  } else if (url.pathname === "/jquery.js") {
    f = temp + "/jquery.js";
  } else {
    f = path.join(root, url.pathname);
  }
  const types = {".js":"application/javascript", ".css":"text/css", ".woff2":"font/woff2", ".woff":"font/woff", ".ttf":"font/ttf"};
  res.setHeader("Content-Type", types[path.extname(f)] || "text/plain");
  try {
    res.end(fs.readFileSync(f));
  } catch {
    res.statusCode = 404;
    res.end("missing");
  }
});
(async() => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  const b = await chromium.launch({channel:"chrome", headless:true});
  try {
    const p = await b.newPage();
    const errors = [], external = [], failed = [];
    p.on("pageerror", e => errors.push(e.message));
    p.on("response", r => {
      if (r.status() >= 400) {
        failed.push(r.url());
      }
    });
    await p.route(/^https?:/, r => {
      if (r.request().url().startsWith(base + "/")) {
        r.continue();
      } else {
        external.push(r.request().url());
        r.abort();
      }
    });
    await p.goto(base);
    for (const f of ["Mermaid/lib/mermaid.min.js", "KaTeX/lib/katex.min.js", "KaTeX/lib/auto-render.min.js", "asciinema/libs/asciinema-player.min.js", "inBrowser/gui/_js/Chart.bundle.min.js", "jquery.js", "inBrowser/gui/_js/jquery.ui.position.min.js", "inBrowser/gui/_js/jquery.contextMenu.min.js", "ace/ace.js", "Asciidoc/lib/highlight.min.js"]) {
      await p.addScriptTag({url:base + "/" + f});
    }
    for (const f of ["KaTeX/lib/katex.min.css", "asciinema/libs/asciinema-player.min.css", "inBrowser/gui/_css/jquery.contextMenu.min.css"]) {
      await p.addStyleTag({url:base + "/" + f});
    }
    const result = await p.evaluate(async() => {
      mermaid.initialize({startOnLoad:false});
      await mermaid.run({nodes:[document.getElementById("diagram")]});
      katex.render("c=\\sqrt{a^2+b^2}", document.getElementById("math"));
      const chart = new Chart(document.getElementById("chart"), {type:"line", data:{labels:["a", "b"], datasets:[{data:[1, 2]}]}, options:{animation:false}});
      const data = '{"version":2,"width":80,"height":24}\n[0.1,"o","Hello offline\\r\\n"]\n';
      AsciinemaPlayer.create(URL.createObjectURL(new Blob([data])), document.getElementById("player"), {autoPlay:true});
      ace.config.set("basePath", "/ace");
      const editor = ace.edit("editor");
      editor.session.setMode("ace/mode/json");
      editor.setTheme("ace/theme/monokai");
      editor.setValue('{"offline":true}');
      $.contextMenu({selector:"#menu", items:{copy:{name:"Copy", icon:"copy"}}});
      $("#menu").contextMenu({x:20, y:20});
      await new Promise(r => setTimeout(r, 1500));
      await document.fonts.ready;
      return {svg:!!document.querySelector("#diagram svg"), math:!!document.querySelector("#math .katex"), chart:chart.data.datasets[0].data, player:document.querySelector("#player").textContent.includes("Hello offline"), ace:editor.session.getMode().$id, contextMenu:!!document.querySelector(".context-menu-list"), highlight:hljs.highlight("const a = 1", {language:"javascript"}).value.includes("hljs-keyword")};
    });
    assert.deepEqual(result, {svg:true, math:true, chart:[1, 2], player:true, ace:"ace/mode/json", contextMenu:true, highlight:true});
    console.log("browser assets PASS", result);
    if (process.env.OPENAF_SOURCE) {
      await p.addScriptTag({url:base + "/core-highlight.js"});
      const core = await p.evaluate(() => ({
        version:hljs.versionString,
        languages:hljs.listLanguages().length,
        extra:["prolog", "powershell", "pgsql", "awk", "handlebars", "asciidoc", "dos", "nginx", "dockerfile"].every(name => !!hljs.getLanguage(name))
      }));
      assert.deepEqual(core, {version:"11.12.0", languages:45, extra:true});
      console.log("OpenAF core highlight PASS", core);
    }

    await p.goto(require("url").pathToFileURL(offline).href);
    await p.waitForSelector("#main .mermaid svg");
    assert((await p.locator("#main h1").innerText()).includes("Offline test"));
    await p.getByRole("link", {name:"Next", exact:true}).click();
    await p.waitForFunction(() => document.querySelector("#main h1")?.textContent.includes("Second page"));
    await p.goBack();
    await p.waitForSelector("#main .mermaid svg");
    console.log("Docsify static rendering and navigation PASS");
    assert.deepEqual(external, []);
    assert.deepEqual(failed, []);
    assert.deepEqual(errors, []);
    console.log("PASS: zero external requests, missing assets or browser errors");
  } finally {
    await b.close();
    server.close();
    fs.rmSync(temp, {recursive:true, force:true});
  }
})().catch(e => {
  console.error(e);
  server.close();
  process.exitCode = 1;
});

