// Shared OpenAF implementation; pure helpers are also exercised by Node tests.
var mavenMaintenance = (function() {
  var excludes = [ ".git", ".github", "tests", ".claude", ".openaf_precompiled", ".mini-a" ]
  function blocked(message) { var e = new Error(message); e.blocked = true; throw e }
  function stable(version) { return !/(?:snapshot|alpha|beta|milestone|preview|early|(?:^|[.\-_])(?:rc|cr|m|ea)\d*(?:$|[.\-_\d]))/i.test(version) }
  function compare(a, b) { return ow.loadFormat().compareVersion(String(a), String(b)) }
  function classify(a, b) {
    if (a === b) return "unchanged"
    if (!/^\d+\.\d+(?:\.\d+)?$/.test(a || "") || !/^\d+\.\d+(?:\.\d+)?$/.test(b || "")) return "unknown"
    var x = a.split(".").map(Number), y = b.split(".").map(Number)
    if (compare(b, a) < 0) return "downgrade"
    if (x[0] !== y[0]) return "major"
    if (x[1] !== y[1]) return x[0] === 0 ? "pre-1.0-minor" : "minor"
    return "patch"
  }
  function tag(s, name) { var m = s.match(new RegExp("<" + name + ">\\s*([^<]+)\\s*</" + name + ">")); return m ? m[1].trim() : undefined }
  function pomEntries(s) {
    var out = {}, blocks = s.match(/<dependency>[^]*?<\/dependency>/g) || []
    blocks.forEach(function(b) {
      var g = tag(b, "groupId"), a = tag(b, "artifactId"), v = tag(b, "version")
      if (!g || !a || !v || v.indexOf("${") >= 0) blocked("Unsupported POM dependency: " + b)
      var key = g + ":" + a
      if (out[key] && out[key] !== v) blocked("Conflicting POM versions for " + key)
      out[key] = v
    })
    return out
  }
  function syncPom(s, targets) {
    var seen = {}
    s = s.replace(/<dependency>[^]*?<\/dependency>/g, function(b) {
      var key = tag(b, "groupId") + ":" + tag(b, "artifactId"), old = tag(b, "version")
      seen[key] = true
      if (targets[key] && compare(targets[key], old) >= 0) return b.replace(/<version>[^<]*<\/version>/, "<version>" + targets[key] + "</version>")
      return b
    })
    var extra = Object.keys(targets).filter(function(k) { return !seen[k] }).sort().map(function(k) {
      var p = k.split(":")
      return "        <dependency>\n            <groupId>" + p[0] + "</groupId>\n            <artifactId>" + p[1] + "</artifactId>\n            <version>" + targets[k] + "</version>\n        </dependency>\n"
    }).join("")
    if (extra && s.indexOf("</dependencies>") < 0) blocked("POM has no dependencies section")
    return s.replace(/([ \t]*)<\/dependencies>/, extra + "$1</dependencies>")
  }
  function normalize(data) {
    if (Array.isArray(data.artifacts)) return data.artifacts
    if (Array.isArray(data.libs)) return data.libs.map(function(a) {
      var pos = a.artifact.lastIndexOf(".")
      if (pos < 1) blocked("Invalid legacy artifact " + a.artifact)
      return { group: a.artifact.substring(0, pos), id: a.artifact.substring(pos + 1), version: a.version, template: a.template, location: a.location || "." }
    })
    blocked("Manifest requires artifacts or libs")
  }
  function relPath(p) {
    if (!p || p.charAt(0) === "/" || p.indexOf("\\") >= 0 || p.split("/").some(function(x) { return x === ".." || x === ".git" || x === "" })) blocked("Unsafe relative path: " + p)
    return p
  }
  function run(args, hooks) {
    var shell = hooks && hooks.shell || $sh
    var report = { schemaVersion: 1, action: args.action || "list", exitCode: 0, opacks: [], warnings: [], steps: [] }
    var root = io.getCanonicalPath("."), stage, locked = false, lock = root + "/.maven-maintenance.lock"
    function read(p) { return io.readFileString(p) }
    function saveJournal(path, journal) {
      var temporary = path + ".tmp"
      io.writeFileJSON(temporary, journal)
      var channel = new java.io.RandomAccessFile(temporary, "rw")
      try { channel.getChannel().force(true) } finally { channel.close() }
      io.mv(temporary, path)
    }
    function exec(command, cwd) {
      var actual = command.slice()
      if ([ "ojob", "opack", "oaf" ].indexOf(actual[0]) >= 0) actual[0] = getOpenAFPath() + actual[0]
      var r = shell(actual).pwd(cwd || root).get(0)
      if (command[0] !== "git") report.steps.push({ command: command, exitCode: r.exitcode, stdout: r.stdout, stderr: r.stderr })
      if (Number(r.exitcode) !== 0 || /Error while executing operation|Exception.*(?:Error|Exception)|Tests FAILED: [1-9]|(?:^|\n).*\berror: /.test(String(r.stderr || "") + "\n" + String(r.stdout || ""))) throw new Error("Command failed: " + command.join(" ") + "\n" + r.stderr)
      return String(r.stdout || "")
    }
    function git(command) { return exec([ "git" ].concat(command), root) }
    function entries(dir) {
      var out = {}
      function walk(d, prefix) {
        io.listFiles(d).files.forEach(function(f) {
          if (java.nio.file.Files.isSymbolicLink(new java.io.File(d + "/" + f.filename).toPath())) blocked("Symlink not supported: " + f.canonicalPath)
          if (excludes.indexOf(f.filename) >= 0 && f.filename !== "tests") return
          var p = prefix + f.filename
          if (f.isDirectory) walk(f.canonicalPath, p + "/")
          else out[p] = f
        })
      }
      walk(dir, "")
      return out
    }
    function files(dir) {
      var inventory = entries(dir), out = {}
      Object.keys(inventory).forEach(function(p) { var f = inventory[p]; out[p] = { hash: sha1(io.readFileBytes(f.canonicalPath)), size: Number(f.size) } })
      return out
    }
    function copy(src, dest) {
      io.mkdir(dest)
      Object.keys(entries(src)).forEach(function(p) {
        io.mkdir(String(new java.io.File(dest + "/" + p).getParent()))
        io.cp(src + "/" + p, dest + "/" + p)
      })
    }
    function changed(a, b) { return Object.keys(a).concat(Object.keys(b)).filter(function(p, i, all) { return all.indexOf(p) === i && (!a[p] || !b[p] || a[p].hash !== b[p].hash) }).sort() }
    function jars(dir) { var out = {}; Object.keys(entries(dir)).filter(function(p) { return /\.jar$/.test(p) }).forEach(function(p) { out[p] = filesJar(dir + "/" + p) }); return out }
    function filesJar(path) {
      plugin("ZIP")
      var z = new ZIP(), entries = z.list(path), metadata = []
      Object.keys(entries).forEach(function(k) {
        var name = entries[k].name || k
        if (/META-INF\/maven\/[^/]+\/[^/]+\/pom.properties$/.test(name)) {
          var props = new java.util.Properties()
          props.load(new java.io.ByteArrayInputStream(z.streamGetFile(path, name)))
          metadata.push({ coordinate: String(props.getProperty("groupId")) + ":" + String(props.getProperty("artifactId")), version: String(props.getProperty("version")), evidence: "pom.properties" })
        }
      })
      z.close()
      return { hash: sha1(io.readFileBytes(path)), size: Number(io.fileInfo(path).size), metadata: metadata, evidence: metadata.length ? "pom.properties" : "filename-only" }
    }
    function archiveContents(path) {
      plugin("ZIP")
      var z = new ZIP(), entries = z.list(path)
      var signature = Object.keys(entries).sort().filter(function(k) { return !/\/$/.test(k) }).map(function(k) { return k + ":" + sha1(z.streamGetFile(path, entries[k].name || k)) }).join("\n")
      z.close()
      return sha1(signature)
    }
    try {
      var config = io.readFileJSON(root + "/mavenMaintenance.json")
      if (config.schemaVersion !== 1) blocked("Unsupported configuration schema")
      var pomText = read(root + "/pom.xml"), pom = pomEntries(pomText)
      report.runtime = { openaf: String(getVersion()), java: String(java.lang.System.getProperty("java.version")), jar: getOpenAFJar() }
      if (report.action === "recover") {
        if (!args.candidate) blocked("candidate is required")
        var candidatePath = io.getCanonicalPath(args.candidate)
        var journal = io.readFileJSON(candidatePath + "/journal.json")
        if (journal.state === "applied" || journal.state === "recovered") blocked("Journal is already complete")
        if (journal.root !== root) blocked("Recovery repository differs")
        if (io.fileExists(lock + "/owner.json")) {
          var owner = io.readFileJSON(lock + "/owner.json")
          var handle = java.lang.ProcessHandle.of(Number(owner.pid))
          if (owner.candidate === candidatePath && (!handle.isPresent() || !handle.get().isAlive())) io.rm(lock)
        }
        if (!io.mkdir(lock)) blocked("Maintenance lock exists; inspect its owner before recovery")
        locked = true
        relPath(journal.folder)
        journal.changes.forEach(function(c) {
          relPath(c.path)
          if (c.path !== "pom.xml" && c.path.indexOf(journal.folder + "/") !== 0) blocked("Recovery path outside selected oPack")
          if (c.before !== null && (!io.fileExists(candidatePath + "/backup/" + c.path) || sha1(io.readFileBytes(candidatePath + "/backup/" + c.path)) !== c.before)) blocked("Recovery backup is missing or corrupted: " + c.path)
          var dest = root + "/" + relPath(c.path), current = io.fileExists(dest) ? sha1(io.readFileBytes(dest)) : null
          if (current !== c.before && current !== c.after) blocked("Recovery conflict: " + c.path)
        })
        journal.changes.forEach(function(c) {
          var dest = root + "/" + c.path
          if (c.before === null) { if (io.fileExists(dest)) io.rm(dest) }
          else { io.mkdir(String(new java.io.File(dest).getParent())); io.cp(candidatePath + "/backup/" + c.path, dest) }
        })
        journal.state = "recovered"; saveJournal(candidatePath + "/journal.json", journal)
        report.status = "recovered"
        return report
      }
      if ([ "list", "plan", "update" ].indexOf(report.action) < 0) blocked("Unknown action")
      if (report.action !== "list" && !args.folder) blocked("folder is required")
      var folder = args.folder ? relPath(String(args.folder).replace(/^\.\//, "").replace(/\/$/, "")) : undefined
      if (folder && io.getCanonicalPath(root + "/" + folder) !== root + "/" + folder) blocked("Symlink oPack folder is unsupported")
      if (folder && (config.opacks[folder] || {}).blockedReason && report.action !== "list") blocked(config.opacks[folder].blockedReason)
      if (folder && folder.indexOf("/") >= 0) blocked("Select the top-level oPack folder")
      var manifests = git([ "ls-files", "-z" ]).split("\0").filter(function(p) { return /\/.maven.yaml$/.test(p) })
      if (folder) {
        if (!io.fileExists(root + "/" + folder + "/.package.yaml")) blocked("Missing .package.yaml")
        manifests = Object.keys(files(root + "/" + folder)).filter(function(p) { return /(^|\/)\.maven.yaml$/.test(p) }).map(function(p) { return folder + "/" + p })
      }
      var basePom = args.base ? pomEntries(git([ "show", String(args.base) + ":pom.xml" ])) : null, latestCache = {}
      function latest(key) {
        if (latestCache[key]) return latestCache[key]
        plugin("XML")
        var body = $rest().get(config.repository + "/" + key.split(":")[0].replace(/\./g, "/") + "/" + key.split(":")[1] + "/maven-metadata.xml")
        if (body.error) throw new Error("Metadata fetch failed: " + key + ": " + stringify(body))
        var xml = new XML(String(body)).toNativeXML()
        var nodes = xml.versioning.versions.version, versions = []
        for (var i = 0; i < nodes.length(); i++) versions.push(String(nodes[i]).trim())
        versions = versions.filter(stable).sort(compare)
        if (!versions.length) throw new Error("No stable release found: " + key)
        return latestCache[key] = versions[versions.length - 1]
      }
      var mapped = {}, rows = {}, manifestData = [], online = report.action !== "list" || String(args.online) === "true"
      manifests.sort().forEach(function(p) {
        if (io.getCanonicalPath(root + "/" + p) !== root + "/" + p) blocked("Symlink manifest is unsupported: " + p)
        var name = p.split("/")[0], data = io.readFileYAML(root + "/" + p)
        if (Array.isArray(data) && data.length === 0) { report.warnings.push("Empty Maven manifest: " + p); return }
        var manifestBefore = stringify(data)
        var artifacts = normalize(data)
        var layout = (config.opacks[name] || {}).manifests || {}
        var manifestOptions = layout[p.substring(name.length + 1)] || {}
        ;(manifestOptions.additionalArtifacts || []).forEach(function(a) {
          if (!artifacts.some(function(existing) { return existing.group === a.group && existing.id === a.id })) artifacts.push({ group: a.group, id: a.id, version: a.version })
        })
        if (manifestOptions.swapCoordinates) artifacts.forEach(function(a) {
          if (a.group.indexOf(".") < 0 && a.id.indexOf(".") >= 0) { var tmp = a.group; a.group = a.id; a.id = tmp }
        })
        if (manifestOptions.outputDir) artifacts.forEach(function(a) { a.location = manifestOptions.outputDir })
        var item = { path: p, data: data, artifacts: artifacts, legacy: !Array.isArray(data.artifacts), before: manifestBefore }
        manifestData.push(item)
        if (!rows[name]) rows[name] = { folder: name, dependencies: [], warnings: [], tests: [], status: "listed" }
        artifacts.forEach(function(a) {
          if (!/^[\w.\-]+$/.test(a.group || "") || !/^[\w.\-]+$/.test(a.id || "")) blocked("Invalid Maven coordinate in " + p)
          if (a.template && (/[\\/]/.test(a.template) || !/\.jar$/.test(a.template))) blocked("Template must be a JAR basename: " + a.template)
          var key = a.group + ":" + a.id, hold = config.holds[name + "/" + key] || config.holds[key]
          mapped[key] = true
          if (hold && (!hold.version || !hold.reason)) blocked("Hold requires version and reason: " + key)
          var target = hold ? String(hold.version) : online ? latest(key) : pom[key]
          var dep = { coordinate: key, manifest: p, declared: a.version ? String(a.version) : null, pom: pom[key] || null, target: target || null, held: hold || null, template: a.template || null, location: a.location || "." }
          dep.change = classify(dep.declared, dep.target)
          dep.pomChanged = !!basePom && basePom[key] !== pom[key]
          dep.drift = !pom[key] ? "missing-from-pom" : !a.version ? "unpinned" : dep.declared !== pom[key] ? "different" : "aligned"
          if (a.location && a.location !== ".") relPath(a.location)
          rows[name].dependencies.push(dep)
          if (online && (!target || !/^[\w.+\-]+$/.test(target))) blocked("Invalid resolved version: " + key)
          a.version = target
          delete a.latest
        })
      })
      report.opacks = Object.keys(rows).sort().map(function(k) { return rows[k] })
      report.unmappedPom = folder ? [] : Object.keys(pom).filter(function(k) { return !mapped[k] })
      if (basePom) report.affected = report.opacks.filter(function(r) { return r.dependencies.some(function(d) { return d.pomChanged }) }).map(function(r) { return r.folder })
      if (folder && !manifestData.length) blocked("No Maven manifests found")
      report.opacks.forEach(function(o) {
        if ((config.opacks[o.folder] || {}).blockedReason) o.warnings.push(config.opacks[o.folder].blockedReason)
        {
          o.bundledJars = jars(root + "/" + o.folder)
          o.dependencies.forEach(function(d) {
            var versions = []
            Object.keys(o.bundledJars).forEach(function(p) {
              var jar = o.bundledJars[p]
              jar.metadata.filter(function(md) { return md.coordinate === d.coordinate }).forEach(function(md) { versions.push({ jar: p, version: md.version, evidence: md.evidence }) })
              if (!jar.metadata.length) {
                var id = d.coordinate.split(":")[1]
                var name = p.substring(p.lastIndexOf("/") + 1)
                if (name.indexOf(id + "-") === 0) versions.push({ jar: p, version: name.substring(id.length + 1, name.length - 4), evidence: "filename-only" })
              }
            })
            d.bundled = versions
            if (!d.declared && versions.length === 1) d.change = classify(versions[0].version, d.target)
          })
        }
      })
      if (report.action === "list") return report
      var row = rows[folder], adapter = config.opacks[folder] || {}
      if (io.fileExists(root + "/" + folder + "/compile.yaml") && !adapter.build) blocked("Unregistered compile adapter: " + folder)
      row.dependencies.forEach(function(d) { if ([ "major", "unknown", "pre-1.0-minor", "downgrade" ].indexOf(d.change) >= 0) row.warnings.push(d.coordinate + ": " + d.change + " requires review") })
      row.testCommands = adapter.tests || []
      if (!row.testCommands.length) row.warnings.push("No registered compatibility tests; manual testing required")
      if (report.action === "plan") { row.status = "planned"; return report }
      if (!io.mkdir(lock)) blocked("Another maintenance run or interrupted application holds " + lock)
      locked = true
      io.writeFileJSON(lock + "/owner.json", { pid: getPid(), started: String(new Date()) })
      stage = String(java.nio.file.Files.createTempDirectory("opack-maven-").toFile().getCanonicalPath())
      report.candidate = stage
      io.writeFileJSON(lock + "/owner.json", { pid: getPid(), candidate: stage })
      var source = root + "/" + folder, work = stage + "/" + folder, original = files(source), originalPomHash = sha1(pomText)
      copy(source, work)
      row.beforeJars = jars(source)
      manifestData.forEach(function(m) {
        var destination = work + m.path.substring(folder.length), dir = String(new java.io.File(destination).getParent())
        if (m.legacy) {
          m.data.libs.forEach(function(a, i) { a.version = m.artifacts[i].version })
          if (stringify(m.data) !== m.before) io.writeFileYAML(destination, m.data)
        } else if (stringify(m.data) !== m.before) io.writeFileYAML(destination, m.data)
        var byLocation = {}
        m.artifacts.forEach(function(a) { var loc = a.location || "."; if (!byLocation[loc]) byLocation[loc] = []; byLocation[loc].push(a) })
        Object.keys(byLocation).forEach(function(loc) {
          var dependencyDir = loc === "." ? dir : dir + "/" + loc
          io.mkdir(dependencyDir)
          var temporaryManifest = dependencyDir + "/.maven.yaml", saved = io.fileExists(temporaryManifest) ? read(temporaryManifest) : null
          io.writeFileYAML(temporaryManifest, { artifacts: byLocation[loc] })
          io.listFiles(dependencyDir).files.filter(function(f) { return !f.isDirectory && /\.jar$/.test(f.filename) }).forEach(function(f) { io.rm(f.canonicalPath) })
          exec([ "ojob", "ojob.io/oaf/mavenGetJars", "folder=." ], dependencyDir)
          var downloaded = jars(dependencyDir)
          byLocation[loc].forEach(function(a) {
            var key = a.group + ":" + a.id, ok = Object.keys(downloaded).some(function(p) {
              var j = downloaded[p]
              if (a.template) return p === a.template.replace(/{{version}}/g, a.version) && j.size > 0
              return j.metadata.some(function(md) { return md.coordinate === key && md.version === a.version }) || p === a.id + "-" + a.version + ".jar"
            })
            if (!ok) throw new Error("Missing downloaded artifact " + key + ":" + a.version)
          })
          exec([ "ojob", "ojob.io/oaf/checkOAFJars", "path=.", "remove=true", "versioninsensitive=true" ], dependencyDir)
          var pruned = jars(dependencyDir)
          if (!row.removedBundled) row.removedBundled = []
          Object.keys(downloaded).filter(function(p) { return !pruned[p] }).forEach(function(p) { row.removedBundled.push({ directory: dependencyDir.substring(work.length + 1), jar: p, metadata: downloaded[p].metadata }) })
          if (saved !== null) io.writeFileString(temporaryManifest, saved); else io.rm(temporaryManifest)
        })
      })
      if (adapter.build) exec(adapter.build, work)
      ;(adapter.expected || []).forEach(function(p) {
        if (!io.fileExists(work + "/" + relPath(p)) || Number(io.fileInfo(work + "/" + p).size) === 0) throw new Error("Missing build output " + p)
        filesJar(work + "/" + p)
        if (io.fileExists(source + "/" + p) && archiveContents(source + "/" + p) === archiveContents(work + "/" + p)) io.cp(source + "/" + p, work + "/" + p)
      })
      ;(adapter.stableArchives || []).forEach(function(p) {
        relPath(p)
        if (io.fileExists(source + "/" + p) && io.fileExists(work + "/" + p) && archiveContents(source + "/" + p) === archiveContents(work + "/" + p)) io.cp(source + "/" + p, work + "/" + p)
      })
      if (adapter.cleanClasses) Object.keys(files(work)).filter(function(p) { return /\.class$/.test(p) && !original[p] }).forEach(function(p) { io.rm(work + "/" + p) })
      // Build jobs may download again. Normalize their output using the chosen runtime.
      if (adapter.build) exec([ "ojob", "ojob.io/oaf/checkOAFJars", "path=.", "remove=true", "versioninsensitive=true" ], work)
      row.afterJars = jars(work)
      row.jarChanges = changed(row.beforeJars, row.afterJars)
      function total(js) { return Object.keys(js).reduce(function(n, p) { return n + js[p].size }, 0) }
      row.sizeChange = total(row.afterJars) - total(row.beforeJars)
      // Package metadata must reflect candidate contents before package-aware tests.
      var payloadChanges = changed(original, files(work)).filter(function(p) { return p !== ".package.yaml" })
      if (payloadChanges.length) {
        var pkg = io.readFileYAML(work + "/.package.yaml")
        pkg.version = ow.loadFormat().fromDate(new Date(), "yyyyMMdd")
        io.writeFileYAML(work + "/.package.yaml", pkg)
        exec([ "opack", "genpack", ".", "--exclude", excludes.join(",") ], work)
        pkg = io.readFileYAML(work + "/.package.yaml")
        var snapshot = files(work)
        ;(pkg.files || []).forEach(function(p) {
          relPath(p)
          if (p.split("/").some(function(x) { return excludes.indexOf(x) >= 0 })) throw new Error("Excluded path packaged: " + p)
          if (!snapshot[p]) throw new Error("Missing packaged file: " + p)
          if (p !== ".package.yaml" && (!pkg.filesHash || pkg.filesHash[p] !== snapshot[p].hash)) throw new Error("Package hash mismatch: " + p)
        })
        Object.keys(snapshot).filter(function(p) { return /\.jar$/.test(p) }).forEach(function(p) { if (pkg.files.indexOf(p) < 0) throw new Error("JAR missing from package: " + p) })
        row.packageVersion = String(pkg.version)
      }
      var beforeTests = files(work)
      ;(adapter.tests || []).forEach(function(test) {
        if (test.external && (String(args.external) !== "true" || (test.requiredEnv || []).some(function(k) { var v = java.lang.System.getenv(k); return v === null || String(v).trim() === "" }))) { row.tests.push({ command: test.command, status: "skipped", prerequisites: test.prerequisites }); row.warnings.push("External test skipped: " + test.prerequisites); return }
        try { exec(test.command, work) } catch(e) { row.tests.push({ command: test.command, status: "failed", error: String(e) }); throw e }
        row.tests.push({ command: test.command, status: "passed" })
      })
      if (changed(beforeTests, files(work)).length) throw new Error("Tests changed candidate files; package must be regenerated and reviewed")
      var after = files(work), changes = changed(original, after), targets = {}
      row.dependencies.forEach(function(d) { targets[d.coordinate] = d.target })
      var newPom = syncPom(pomText, targets)
      if (sha1(read(root + "/pom.xml")) !== originalPomHash || changed(original, files(source)).length) blocked("Source changed during preparation; candidate retained")
      var journal = { root: root, folder: folder, state: "prepared", changes: changes.map(function(p) { return { path: folder + "/" + p, before: original[p] ? original[p].hash : null, after: after[p] ? after[p].hash : null } }) }
      if (newPom !== pomText) journal.changes.push({ path: "pom.xml", before: originalPomHash, after: sha1(newPom) })
      journal.changes.forEach(function(c) {
        if (c.before !== null) { var dest = stage + "/backup/" + c.path; io.mkdir(String(new java.io.File(dest).getParent())); io.cp(root + "/" + c.path, dest) }
      })
      saveJournal(stage + "/journal.json", journal)
      journal.state = "applying"; saveJournal(stage + "/journal.json", journal)
      changes.forEach(function(p) { var dest = source + "/" + p; if (!after[p]) io.rm(dest); else { io.mkdir(String(new java.io.File(dest).getParent())); io.cp(work + "/" + p, dest) } })
      if (newPom !== pomText) io.writeFileString(root + "/pom.xml", newPom)
      journal.changes.forEach(function(c) {
        var dest = root + "/" + c.path, actual = io.fileExists(dest) ? sha1(io.readFileBytes(dest)) : null
        if (actual !== c.after) throw new Error("Application verification failed: " + c.path)
      })
      journal.state = "applied"; saveJournal(stage + "/journal.json", journal)
      row.status = changes.length || newPom !== pomText ? "updated" : "unchanged"
      row.changedFiles = journal.changes.map(function(c) { return c.path })
    } catch(e) {
      report.exitCode = e.blocked ? 2 : 1
      report.error = String(e)
      if (report.opacks.length && report.action === "update") report.opacks[0].status = "failed-candidate"
    } finally {
      if (locked) {
        if (stage && io.fileExists(stage + "/journal.json") && io.readFileJSON(stage + "/journal.json").state === "applying") {
          report.warnings.push("Interrupted application requires recovery using " + stage)
        }
        io.rm(lock)
      }
      if (stage) io.writeFileJSON(stage + "/report.json", report)
    }
    return report
  }
  function reportRows(r, onlyChanged) {
    var rows = []
    r.opacks.forEach(function(o) {
      o.dependencies.filter(function(d) { return !onlyChanged || d.pomChanged }).forEach(function(d) {
        rows.push({ oPack: o.folder, Dependency: d.coordinate, Declared: d.declared || "unpinned", POM: d.pom || "missing", Target: d.target || "unknown", Change: d.change, Drift: d.held ? "held: " + d.held.reason : d.drift })
      })
    })
    return rows
  }
  function markdownReport(r, onlyChanged) {
    return ow.loadTemplate().md.table(reportRows(r, onlyChanged))
  }
  function printReport(r, options) {
    if (!ow.oJob) ow.loadOJob()
    if (typeof options === "string") options = { format: options }
    options = options || {}
    var outputArgs = {}
    Object.keys(options).forEach(function(k) { outputArgs[k] = options[k] })
    var format = String(options.__format || options.__FORMAT || options.format || "ctable").toLowerCase()
    outputArgs.__format = format
    var rowFormat = [ "table", "ctable", "stable", "csv", "markdown", "md" ].indexOf(format) >= 0
    if (!rowFormat) { ow.oJob.output(r, outputArgs); return }
    if (format === "csv") { ow.oJob.output(reportRows(r), outputArgs); return }
    if (r.error) print("ERROR: " + r.error)
    ;(r.warnings || []).forEach(function(w) { print(w) })
    if (r.candidate) print("Candidate and report: " + r.candidate)
    if (format === "markdown" || format === "md") print(markdownReport(r))
    else ow.oJob.output(reportRows(r), outputArgs)
    r.opacks.forEach(function(o) {
      ;(o.warnings || []).forEach(function(w) { print(o.folder + ": " + w) })
      if (o.status !== "listed") print(o.folder + ": " + o.status)
      if (o.sizeChange !== undefined) print(o.folder + ": JAR size change " + o.sizeChange + " bytes")
      if (o.removedBundled) o.removedBundled.forEach(function(j) { print(o.folder + ": OpenAF-bundled JAR removed " + j.jar) })
      if (o.changedFiles) print(o.folder + ": changed files " + o.changedFiles.join(", "))
      ;(o.tests || []).forEach(function(t) { print(o.folder + ": test " + t.command.join(" ") + " " + t.status) })
    })
    if (r.unmappedPom && r.unmappedPom.length) print("Unmapped POM dependencies: " + r.unmappedPom.join(", "))
    if (r.affected) print("Affected oPacks: " + r.affected.join(", "))
  }
  return { run: run, printReport: printReport, reportRows: reportRows, markdownReport: markdownReport, stable: stable, compare: compare, classify: classify, pomEntries: pomEntries, syncPom: syncPom, normalize: normalize, relPath: relPath }
})()
if (typeof module !== "undefined") module.exports = mavenMaintenance
