// Run from this oPack: java -jar /path/to/openaf.jar -f tests/regression.js
ow.loadOJob();
ow.loadTest();
var definition = io.readFileYAML('rust.yaml').ojob.langs[0];
var run = new Function('args', 'job', 'code', definition.langFn + '\nreturn args;');
var job = {name:'Rust regression', typeArgs:{noTemplate:true,langTimeout:30000}};
var code = 'fn main() { println!("{{\\"value\\":{}}}", std::env::var("value").unwrap()); }';
var assert = (a,b,m) => ow.test.assert(a,b,m);
var failure = function(fn, text) {
  var error;
  try { fn(); } catch(e) { error=String(e); }
  assert(isString(error) && error.indexOf(text)>=0,true,'Expected '+text+'; got '+error);
};
try {
  var a=run({value:1},job,code);
  assert(a.value,1,'Args returned');
  var keys=Object.keys(global.__rustReuse);
  var binary=global.__rustReuse[keys[0]].binary;
  assert(io.fileExists(binary),true,'Compiled binary exists');
  var b=run({value:2},job,code);
  assert(b.value,2,'Cached binary uses current args');
  assert(Object.keys(global.__rustReuse).length,1,'One cache entry');
  assert(global.__rustReuse[keys[0]].binary,binary,'Binary reused');
  assert(io.fileExists(global.__rustReuse[keys[0]].directory+'/main.rs'),false,'Source removed');
  failure(()=>run({},job,'not valid rust'), 'compilation exit status');
  assert(Object.keys(global.__rustReuse).length,1,'Failed compilation not cached');
  failure(()=>run({}, {name:'timeout',typeArgs:{noTemplate:true,langTimeout:1500}}, 'fn main() { std::thread::sleep(std::time::Duration::from_secs(30)); }'), 'timed out');
  var priorEntries=Object.keys(global.__rustReuse).length;
  var errors = new java.util.concurrent.ConcurrentLinkedQueue();
  var concurrentCode=code+'\n// independently cached concurrent compilation';
  var promises = [3,4,5].map(v=>$do(()=>{ try { assert(run({value:v},job,concurrentCode).value,v,'Concurrent args'); } catch(e) { errors.add(String(e)); } }));
  $doWait($doAll(promises));
  assert(errors.isEmpty(),true,'Concurrent runs: '+errors.toString());
  var matches=Object.keys(global.__rustReuse).filter(k=>io.fileExists(global.__rustReuse[k].binary));
  assert(matches.length,priorEntries+1,'Only one new entry for concurrent compilation');
  var failedArgs={value:8};
  failure(()=>run(failedArgs,job,'fn main() { println!("{{}}"); std::process::exit(7); }'),'exit status 7');
  assert(failedArgs.value,8,'Failed execution does not merge');
  var dirs=Object.keys(global.__rustReuse).map(k=>global.__rustReuse[k].directory);
  ow.oJob.stop();
  dirs.forEach(d=>assert(io.fileExists(d),false,'Shutdown removes cache'));
  assert(Object.keys(global.__rustReuse).length,0,'Cache cleared');
  print('Rust regression tests passed');
} catch(e) { printErr(String(e)); exit(1); }
finally { ow.oJob.stop(); }
