const { test } = require('node:test')
const assert = require('node:assert/strict')
const m = require('../mavenMaintenance.js')
const fs = require('node:fs')
const { spawnSync } = require('node:child_process')
const oaf = process.env.OAF_BIN || '/Applications/OpenAF/oaf'
const nativeComparisons = new Map()
global.ow = { loadFormat: () => ({ compareVersion: (a, b) => {
  const key = JSON.stringify([a,b])
  if (!nativeComparisons.has(key)) {
    const result = spawnSync(oaf, ['-c', 'print(ow.loadFormat().compareVersion(' + JSON.stringify(a) + ',' + JSON.stringify(b) + '))'], {encoding:'utf8',timeout:15000})
    assert.equal(result.status,0,result.stderr)
    nativeComparisons.set(key,Number(result.stdout.trim()))
  }
  return nativeComparisons.get(key)
} }) }
const pom = fs.readFileSync(require('node:path').join(__dirname, '../../../pom.xml'), 'utf8')
test('versions distinguish release risks and downgrades', {skip:!fs.existsSync(oaf)}, () => {
  for (const [a, b, expected] of [['1.2.3','2.0.0','major'],['0.2.0','0.3.0','pre-1.0-minor'],['1.2','1.3','minor'],['1.2.3','1.2.4','patch'],['1.3','1.2','downgrade'],['v2026','v2027','unknown'],[null,'1.0','unknown']]) assert.equal(m.classify(a,b),expected)
  assert.equal(m.compare('1.10','1.9'),1)
  for (const v of ['1.0-SNAPSHOT','2.0-beta1','3.0-rc2','4.0-M1','4.0-preview']) assert.equal(m.stable(v),false,v)
  for (const v of ['1.0','4.2.18.Final','v20260218','1.5.7-17']) assert.equal(m.stable(v),true,v)
})
test('POM synchronization preserves newer targets and unrelated content', {skip:!fs.existsSync(oaf)}, () => {
  const before = m.pomEntries(pom)
  const after = m.syncPom(pom, {'org.apache.kafka:kafka-clients':'99.0.0','org.xerial.snappy:snappy-java':'0.1','example:added':'2.0'})
  const entries = m.pomEntries(after)
  assert.equal(entries['org.apache.kafka:kafka-clients'],'99.0.0')
  assert.equal(entries['org.xerial.snappy:snappy-java'],before['org.xerial.snappy:snappy-java'])
  assert.equal(entries['example:added'],'2.0')
  assert.equal(m.syncPom(pom,{}),pom)
})
test('ambiguous POM and unsafe paths are blocked', () => {
  assert.throws(() => m.pomEntries('<dependency><groupId>x</groupId><artifactId>y</artifactId><version>${v}</version></dependency>'))
  for (const p of ['../Kafka','/tmp/Kafka','Kafka/../../x','.git/config','Kafka\\lib']) assert.throws(() => m.relPath(p))
  assert.equal(m.relPath('Docker/lib'),'Docker/lib')
})
test('legacy manifests retain location and templates', () => {
  assert.deepEqual(m.normalize({libs:[{artifact:'org.mongodb.mongo-java-driver',location:'lib',template:'mongo-{{version}}.jar'}]}),[{group:'org.mongodb',id:'mongo-java-driver',location:'lib',template:'mongo-{{version}}.jar',version:undefined}])
  assert.throws(() => m.normalize({}))
})

const os = require('node:os')
const path = require('node:path')
const repo = path.resolve(__dirname, '../../..')
function fixture(t, options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'maven-maintenance-test-'))
  const pkg = fs.readFileSync(path.join(repo, 'Kafka/.package.yaml'), 'utf8')
  fs.mkdirSync(path.join(dir, 'Sample/lib'), {recursive:true})
  fs.writeFileSync(path.join(dir, 'Sample/.package.yaml'), pkg)
  fs.writeFileSync(path.join(dir, 'Sample/wrapper.js'), '// untouched\n')
  fs.writeFileSync(path.join(dir, 'Sample/lib/.maven.yaml'), 'artifacts:\n- group: org.apache.kafka\n  id: kafka-clients\n  version: 4.3.0\n')
  fs.writeFileSync(path.join(dir, 'pom.xml'), '<project>\n<dependencies>\n<dependency><groupId>org.apache.kafka</groupId><artifactId>kafka-clients</artifactId><version>4.3.0</version></dependency>\n</dependencies>\n</project>\n')
  if (options.reversedCoordinates) fs.writeFileSync(path.join(dir, 'Sample/lib/.maven.yaml'), 'artifacts:\n- group: kafka-clients\n  id: org.apache.kafka\n  version: 4.3.0\n')
  const config = {schemaVersion:1, holds:{'org.apache.kafka:kafka-clients':{version:'4.3.1',reason:'Offline fixture'}},opacks:{Sample:{tests:options.tests || [],...(options.adapter || {})}}}
  Object.assign(config.holds,options.holds || {})
  fs.writeFileSync(path.join(dir,'mavenMaintenance.json'),JSON.stringify(config))
  for (const args of [['init','-q'],['add','.']]) assert.equal(spawnSync('git',args,{cwd:dir}).status,0)
  const script = `
load(${JSON.stringify(path.join(repo,'.github/scripts/mavenMaintenance.js'))})
var realSh = $sh
var fixtureShell = function(command) {
  if (command[1] === "ojob.io/oaf/mavenGetJars" || command[1] === "ojob.io/oaf/checkOAFJars") {
    var cwd
    return { pwd: function(p) { cwd = p; return this }, get: function() {
      if (command[1] === "ojob.io/oaf/mavenGetJars") {
        ${options.mutateSource ? 'io.writeFileString("Sample/wrapper.js","manual edit")' : ''}
        ${options.failDownload ? 'return {exitcode:0,stdout:"",stderr:""}' : `io.cp(${JSON.stringify(path.join(repo,'Kafka/kafka-clients-4.3.1.jar'))}, cwd + "/kafka-clients-4.3.1.jar"); io.cp(${JSON.stringify(path.join(repo,'FalkorDB/commons-text-1.15.0.jar'))}, cwd + "/commons-text-1.15.0.jar")`}
      }
      return {exitcode:0,stdout:"fixture",stderr:""}
    } }
  }
  return realSh(command)
}
var r = mavenMaintenance.run({action:"update",folder:"Sample"}, {shell:fixtureShell})
io.writeFileJSON("result.json",r)
`
  fs.writeFileSync(path.join(dir, 'run.js'),script)
  function run(action = "update", extra = {}) {
    let content = script.replace('action:"update",folder:"Sample"', 'action:' + JSON.stringify(action) + ',folder:"Sample",' + Object.entries(extra).map(([k,v]) => JSON.stringify(k) + ':' + JSON.stringify(v)).join(','))
    fs.writeFileSync(path.join(dir, 'run.js'),content)
    const result = spawnSync(oaf,['-f','run.js'],{cwd:dir,encoding:'utf8',timeout:60000})
    assert.equal(result.status,0,result.stderr + result.stdout)
    return JSON.parse(fs.readFileSync(path.join(dir,'result.json'),'utf8'))
  }
  t.after(() => fs.rmSync(dir,{recursive:true,force:true}))
  return {dir, run}
}
test('native update packages nested dependencies and repeated update is unchanged', {skip:!fs.existsSync(oaf)}, t => {
  const f = fixture(t)
  const first = f.run()
  if (first.candidate) t.after(() => fs.rmSync(first.candidate,{recursive:true,force:true}))
  assert.equal(first.exitCode,0,JSON.stringify(first))
  assert.equal(first.opacks[0].status,'updated')
  assert.ok(fs.existsSync(path.join(f.dir,'Sample/lib/kafka-clients-4.3.1.jar')))
  assert.equal(first.opacks[0].afterJars['lib/kafka-clients-4.3.1.jar'].evidence,'filename-only')
  assert.equal(first.opacks[0].afterJars['lib/commons-text-1.15.0.jar'].metadata[0].coordinate,'org.apache.commons:commons-text')
  assert.match(fs.readFileSync(path.join(f.dir,'pom.xml'),'utf8'),/4.3.1/)
  assert.equal(fs.readFileSync(path.join(f.dir,'Sample/wrapper.js'),'utf8'),'// untouched\n')
  const second = f.run()
  if (second.candidate) t.after(() => fs.rmSync(second.candidate,{recursive:true,force:true}))
  assert.equal(second.exitCode,0,JSON.stringify(second))
  assert.equal(second.opacks[0].status,'unchanged')
})
test('native missing downloads never replace source even if command returns success', {skip:!fs.existsSync(oaf)}, t => {
  const f = fixture(t,{failDownload:true})
  const before = fs.readFileSync(path.join(f.dir,'Sample/lib/.maven.yaml'),'utf8')
  const r = f.run()
  if (r.candidate) t.after(() => fs.rmSync(r.candidate,{recursive:true,force:true}))
  assert.equal(r.exitCode,1)
  assert.match(r.error,/Missing downloaded artifact/)
  assert.equal(fs.readFileSync(path.join(f.dir,'Sample/lib/.maven.yaml'),'utf8'),before)
  assert.ok(!fs.existsSync(path.join(f.dir,'.maven-maintenance.lock')))
})
test('native failing tests retain candidate and keep source unchanged', {skip:!fs.existsSync(oaf)}, t => {
  const f = fixture(t,{tests:[{command:['sh','-c','exit 7']}]})
  const r = f.run()
  if (r.candidate) t.after(() => fs.rmSync(r.candidate,{recursive:true,force:true}))
  assert.equal(r.exitCode,1,JSON.stringify(r))
  assert.equal(r.opacks[0].tests[0].status,'failed')
  assert.ok(!fs.existsSync(path.join(f.dir,'Sample/lib/kafka-clients-4.3.1.jar')))
  assert.match(fs.readFileSync(path.join(f.dir,'pom.xml'),'utf8'),/4.3.0/)
})

test('native external tests are skipped and review warnings permit preparation', {skip:!fs.existsSync(oaf)}, t => {
  const f = fixture(t,{tests:[{command:['sh','-c','exit 9'],external:true,prerequisites:'Fixture server'}]})
  const r = f.run()
  if (r.candidate) t.after(() => fs.rmSync(r.candidate,{recursive:true,force:true}))
  assert.equal(r.exitCode,0,JSON.stringify(r))
  assert.equal(r.opacks[0].tests[0].status,'skipped')
})
test('native lock prevents updates before candidate creation', {skip:!fs.existsSync(oaf)}, t => {
  const f = fixture(t)
  fs.mkdirSync(path.join(f.dir,'.maven-maintenance.lock'))
  const r = f.run()
  assert.equal(r.exitCode,2)
  assert.equal(r.candidate,undefined)
  assert.ok(fs.existsSync(path.join(f.dir,'.maven-maintenance.lock')))
})
test('native recovery restores an interrupted application from verified backups', {skip:!fs.existsSync(oaf)}, t => {
  const f = fixture(t)
  const r = f.run()
  assert.equal(r.exitCode,0,JSON.stringify(r))
  t.after(() => fs.rmSync(r.candidate,{recursive:true,force:true}))
  const journalPath = path.join(r.candidate,'journal.json')
  const journal = JSON.parse(fs.readFileSync(journalPath,'utf8'))
  journal.state = 'applying'
  fs.writeFileSync(journalPath,JSON.stringify(journal))
  const recovered = f.run('recover',{candidate:r.candidate})
  assert.equal(recovered.exitCode,0,JSON.stringify(recovered))
  assert.equal(recovered.status,'recovered')
  assert.match(fs.readFileSync(path.join(f.dir,'pom.xml'),'utf8'),/4.3.0/)
  assert.ok(!fs.existsSync(path.join(f.dir,'Sample/lib/kafka-clients-4.3.1.jar')))
})
test('native tests cannot silently change packaged candidate contents', {skip:!fs.existsSync(oaf)}, t => {
  const f = fixture(t,{tests:[{command:['sh','-c','printf changed > wrapper.js']}]})
  const r = f.run()
  if (r.candidate) t.after(() => fs.rmSync(r.candidate,{recursive:true,force:true}))
  assert.equal(r.exitCode,1)
  assert.match(r.error,/Tests changed candidate/)
  assert.equal(fs.readFileSync(path.join(f.dir,'Sample/wrapper.js'),'utf8'),'// untouched\n')
})

test('native additional artifact adapter restores missing direct dependencies', {skip:!fs.existsSync(oaf)}, t => {
  const f = fixture(t,{adapter:{manifests:{'lib/.maven.yaml':{additionalArtifacts:[{group:'org.apache.commons',id:'commons-text'}]}}},holds:{'org.apache.commons:commons-text':{version:'1.15.0',reason:'Fixture'}}})
  const r = f.run()
  if (r.candidate) t.after(() => fs.rmSync(r.candidate,{recursive:true,force:true}))
  assert.equal(r.exitCode,0,JSON.stringify(r))
  assert.match(fs.readFileSync(path.join(f.dir,'Sample/lib/.maven.yaml'),'utf8'),/commons-text/)
  assert.match(fs.readFileSync(path.join(f.dir,'pom.xml'),'utf8'),/commons-text/)
})
test('native unsupported layouts block before preparation', {skip:!fs.existsSync(oaf)}, t => {
  const f = fixture(t,{adapter:{blockedReason:'Needs a reviewed adapter'}})
  const r = f.run()
  assert.equal(r.exitCode,2)
  assert.match(r.error,/reviewed adapter/)
  assert.equal(r.candidate,undefined)
})
test('native recovery refuses subsequent user edits without restoring any files', {skip:!fs.existsSync(oaf)}, t => {
  const f = fixture(t)
  const r = f.run()
  assert.equal(r.exitCode,0,JSON.stringify(r))
  t.after(() => fs.rmSync(r.candidate,{recursive:true,force:true}))
  const journalPath = path.join(r.candidate,'journal.json')
  const journal = JSON.parse(fs.readFileSync(journalPath,'utf8'))
  journal.state = 'applying'
  fs.writeFileSync(journalPath,JSON.stringify(journal))
  fs.appendFileSync(path.join(f.dir,'pom.xml'),'<!-- manual edit -->')
  const recovered = f.run('recover',{candidate:r.candidate})
  assert.equal(recovered.exitCode,2)
  assert.match(recovered.error,/Recovery conflict/)
  assert.ok(fs.existsSync(path.join(f.dir,'Sample/lib/kafka-clients-4.3.1.jar')))
  assert.match(fs.readFileSync(path.join(f.dir,'pom.xml'),'utf8'),/manual edit/)
})

test('native generated help archives with identical entries do not bump packages', {skip:!fs.existsSync(oaf)}, t => {
  const command = ['oaf','-c','plugin("ZIP"); var z=new ZIP(); z.streamPutFile(".odoc.db","entry",af.fromString2Bytes("same"));']
  const f = fixture(t,{adapter:{build:command,stableArchives:['.odoc.db']}})
  const first = f.run()
  if (first.candidate) t.after(() => fs.rmSync(first.candidate,{recursive:true,force:true}))
  assert.equal(first.exitCode,0,JSON.stringify(first))
  const second = f.run()
  if (second.candidate) t.after(() => fs.rmSync(second.candidate,{recursive:true,force:true}))
  assert.equal(second.exitCode,0,JSON.stringify(second))
  assert.equal(second.opacks[0].status,'unchanged')
})

test('native concurrent source edits retain candidate without replacing manual work', {skip:!fs.existsSync(oaf)}, t => {
  const f = fixture(t,{mutateSource:true})
  const r = f.run()
  if (r.candidate) t.after(() => fs.rmSync(r.candidate,{recursive:true,force:true}))
  assert.equal(r.exitCode,2,JSON.stringify(r))
  assert.match(r.error,/Source changed/)
  assert.equal(fs.readFileSync(path.join(f.dir,'Sample/wrapper.js'),'utf8'),'manual edit')
  assert.match(fs.readFileSync(path.join(f.dir,'pom.xml'),'utf8'),/4.3.0/)
})

test('native coordinate adapter is idempotent after correcting legacy fields', {skip:!fs.existsSync(oaf)}, t => {
  const f = fixture(t,{reversedCoordinates:true,adapter:{manifests:{'lib/.maven.yaml':{swapCoordinates:true}}}})
  const first = f.run()
  if (first.candidate) t.after(() => fs.rmSync(first.candidate,{recursive:true,force:true}))
  assert.equal(first.exitCode,0,JSON.stringify(first))
  const second = f.run()
  if (second.candidate) t.after(() => fs.rmSync(second.candidate,{recursive:true,force:true}))
  assert.equal(second.exitCode,0,JSON.stringify(second))
  assert.equal(second.opacks[0].dependencies[0].coordinate,'org.apache.kafka:kafka-clients')
  assert.equal(second.opacks[0].status,'unchanged')
})

test('native unsafe download templates block before creating a candidate', {skip:!fs.existsSync(oaf)}, t => {
  const f = fixture(t)
  fs.appendFileSync(path.join(f.dir,'Sample/lib/.maven.yaml'),'  template: ../escape.jar\n')
  const r = f.run()
  assert.equal(r.exitCode,2)
  assert.match(r.error,/JAR basename/)
  assert.equal(r.candidate,undefined)
})

test('report formats delegate to OpenAF and honor standard format flags', () => {
  const calls = [], prints = []
  const context = {module:{exports:{}},print:v=>prints.push(v),ow:{oJob:{output:(value,args)=>calls.push({value,args})},loadTemplate:()=>({md:{table:rows=>{calls.push({markdown:rows});return 'native markdown'}}})}}
  require('node:vm').runInNewContext(fs.readFileSync(path.join(repo,'.github/scripts/mavenMaintenance.js'),'utf8'),context)
  const api=context.module.exports
  const report={opacks:[{folder:'Example',dependencies:[{coordinate:'a:b',declared:'1.0',pom:'1.0',target:'1.1',change:'minor',drift:'aligned'}],status:'listed'}],warnings:[]}
  api.printReport(report,{format:'ctable',__format:'json'})
  assert.equal(calls[0].value,report)
  assert.equal(calls[0].args.__format,'json')
  assert.equal(prints.length,0)
  api.printReport(report,{format:'table'})
  assert.equal(calls[1].args.__format,'table')
  assert.equal(calls[1].value[0].Dependency,'a:b')
  api.printReport(report,{format:'csv'})
  assert.equal(calls[2].args.__format,'csv')
  assert.equal(prints.length,0)
  api.printReport(report,'markdown')
  assert.equal(calls[3].markdown[0].oPack,'Example')
  assert.deepEqual(prints,['native markdown'])
})

test('native package validation accepts CRLF text without changing source bytes', {skip:!fs.existsSync(oaf)}, t => {
  const f = fixture(t)
  const source = '// Windows text\r\n// preserved\r\n'
  fs.writeFileSync(path.join(f.dir,'Sample/wrapper.js'),source)
  const result = f.run()
  if (result.candidate) t.after(() => fs.rmSync(result.candidate,{recursive:true,force:true}))
  assert.equal(result.exitCode,0,JSON.stringify(result))
  assert.equal(fs.readFileSync(path.join(f.dir,'Sample/wrapper.js'),'utf8'),source)
  const second = f.run()
  if (second.candidate) t.after(() => fs.rmSync(second.candidate,{recursive:true,force:true}))
  assert.equal(second.exitCode,0,JSON.stringify(second))
  assert.equal(second.opacks[0].status,'unchanged')
})
