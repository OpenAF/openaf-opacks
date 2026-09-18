// Run with tests/run.sh: tests actual sibling OpenAF sources and a disposable Ignite node.
var checks=0, ignite, client, failed=false;
function check(v,m) {if(!v) throw new Error(m);checks++;}
function same(a,b,m) {check(JSON.stringify(a)===JSON.stringify(b),m+': '+stringify(a));}
try {
  ow.loadCh();ow.loadDev();ow.loadServer();
  var core=getEnv('OPENAF_SOURCE') || '../../openaf/js';
  load(core+'/owrap.ch.js');ow.ch.__types.ignite=OpenWrap.ch.prototype.__types.ignite;
  load(core+'/owrap.dev.js');ow.dev.loadIgnite=OpenWrap.dev.prototype.loadIgnite;
  load(core+'/owrap.server.js');ow.server.locks=OpenWrap.server.prototype.locks;
  loadExternalJars('.');plugin('Ignite');ignite=new Ignite();
  var work=io.createTempDir('openaf-ignite3-test-'),config=work+'/node.conf';
  var port=Number(getEnv('IGNITE_TEST_PORT') || 34444);
  io.writeFileString(config,'ignite { network {port:'+port+', nodeFinder.netClusterNodes:["localhost:'+port+'"]},clientConnector.port:'+(port+1)+',rest.port:'+(port+2)+',storage.profiles:[{name:"default",engine:"aipersist"}] }');
  ignite.configure({configFile:config,workDir:work,clusterName:'regression'});ignite.start('regression');
  print('Started embedded node');
  client=new Ignite();client.configure({addresses:['127.0.0.1:'+(port+1)]});client.start('client',__,true);
  $ch('server').create(1,'ignite',{ignite:ignite,cacheName:'shared',keepOnDestroy:true});
  $ch('client').create(1,'ignite',{ignite:client,cacheName:'shared',keepOnDestroy:true});
  var key={b:2,a:{z:3,x:1}},value={text:'quotes " and \\ and\nlines',list:[1,{nested:true}],nil:null};
  $ch('server').set(key,value);
  same($ch('client').get({a:{x:1,z:3},b:2}),value,'JSON roundtrip and stable keys over thin client');
  same($ch('client').get({absent:true}),__,'missing key');
  same($ch('server').getKeys(),[{a:{x:1,z:3},b:2}],'key enumeration');
  check($ch('client').size()===1,'size');
  check(isUnDef($ch('client').getSet({text:'different'},key,{bad:true})),'CAS mismatch');
  same($ch('server').get(key),value,'CAS mismatch does not write');
  check(isDef($ch('client').getSet({text:value.text},key,{ok:true})),'CAS match');
  same($ch('server').get(key),{ok:true},'CAS visible across clients');
  $ch('server').setAll(['id'],[{id:1,v:'a'},{id:2,v:'b'}]);check($ch('client').size()===3,'setAll');
  $ch('client').unsetAll(['id'],[{id:1},{id:2}]);check($ch('server').size()===1,'unsetAll');
  check(isDef($ch('server').pop()),'pop');check($ch('client').size()===0,'pop removes');
  $ch('server').set({id:1},{v:2});same($ch('client').shift(),{v:2},'shift');
  $ch('server').set({nested:[[1,2],{z:2,a:1}]},{array:true});
  same($ch('client').get({nested:[[1,2],{a:1,z:2}]}),{array:true},'nested array keys');
  same($ch('server').getKeys(),[{nested:[[1,2],{a:1,z:2}]}],'nested arrays preserved in enumerated keys');
  $ch('client').unset({nested:[[1,2],{a:1,z:2}]});
  var seen=0;$ch('server').set({id:1},{v:2});$ch('server').forEach(function(k,v){seen++;same(v,{v:2},'forEach value');});check(seen===1,'forEach count');
  same(ignite.call(ignite.getIgnite(),'var text="quoted";\nreturn {text:text+"\\nline",nested:[1,true,null]};'),{text:'quoted\nline',nested:[1,true,null]},'compute multiline body');
  same(client.broadcast(client.getIgnite(),'return "yes";'),['yes'],'thin client broadcast');
  check(isUnDef(ignite.call(ignite.getIgnite(),'return undefined;')),'compute undefined');
  var threw=false;try{client.call(client.getIgnite(),'throw new Error("remote failure");');}catch(e){threw=true;}check(threw,'compute errors propagate');
  ow.dev.loadIgnite('server',ignite);ow.dev.loadIgnite('client',client);
  check(isDef(ow.dev.__i.server)&&isDef(ow.dev.__i.client),'loadIgnite retains grids');
  var result,failure;
  $doWait($do(function(){}).thenAny(function(){return {text:'"quote"',nested:{a:1}};},__,'server').then(function(v){result=v;},function(e){failure=e;}));
  check(isUnDef(failure),'thenAny rejection: '+failure);same(result,{text:'"quote"',nested:{a:1}},'thenAny serialization');
  result=__;$doWait($do(function(){}).thenAll(()=>'arrow "quote"').then(function(v){result=v;},function(e){failure=e;}));
  check(isUnDef(failure),'thenAll rejection: '+failure);same(result,['arrow "quote"'],'thenAll arrow function');
  var a=new ow.server.locks(false,'server'),b=new ow.server.locks(false,'client');
  check(a.lock('exclusive',0,1,10000),'first lock');check(!b.lock('exclusive',0,1,10000),'second client excluded');
  a.unlock('exclusive');check(b.lock('exclusive',0,1,10000),'released lock');b.unlock('exclusive');
  $ch('server').set({lock:'expired'},{lock:'expired',value:true,timeout:nowUTC()-1});
  check(b.lock('expired',0,1,10000),'expired lock');b.unlock('expired');
  var state=ow.ch.__types.ignite.__channels.server, original=state.cache;
  $ch('server').set({lock:'extension'},{lock:'extension',value:true,timeout:nowUTC()-1});
  var extended=nowUTC()+10000;
  state.cache={
    get:function(k){return original.get(k);},
    replace:function(k,oldValue,newValue){
      original.put(k,JSON.stringify({lock:'extension',value:true,timeout:extended}));
      return original.replace(k,oldValue,newValue);
    }
  };
  try {check(a.isLocked('extension').value===true,'concurrent timeout extension survives stale expiry');}
  finally {state.cache=original;}
  a.unlock('extension');
  state.cache={get:function(){throw new Error('simulated storage failure');}};
  var storageError=false;
  try {a.isLocked('exclusive');}catch(e){storageError=true;}finally{state.cache=original;}
  check(storageError,'storage errors fail closed');
  var wins=new java.util.concurrent.atomic.AtomicInteger(0);
  $doWait($doAll([a,b].map(function(lock){return $do(function(){if(lock.lock('race',0,1,10000))wins.incrementAndGet();});})));
  check(wins.get()===1,'single concurrent lock winner');a.unlock('race');
  var local=new ow.server.locks();check(local.lock('local',0,1),'local lock');check(!local.lock('local',0,1),'local lock excludes');local.unlock('local');
  var globalLock=new ow.server.locks(false,__,{ignite:client,cacheName:'global-lock-options'});
  check(globalLock.lock('options',0,1),'global constructor options');globalLock.unlock('options');$ch(globalLock.name).destroy();
  $ch('server').set({persist:true},{value:42});$ch('server').destroy();$ch('client').destroy();client.stop();ignite.stop();
  ignite=new Ignite();ignite.configure({configFile:config,workDir:work,clusterName:'regression'});ignite.start('regression');
  $ch('restart').create(1,'ignite',{ignite:ignite,cacheName:'shared'});
  same($ch('restart').get({persist:true}),{value:42},'persistence restart');$ch('restart').destroy();
  check(ignite.getOrCreateCache('shared').size()===0,'destroy drops table');
  var rejected=false;try{new Ignite().start('bad','old-secret',true);}catch(e){rejected=true;}check(rejected,'legacy secret rejected');
  print('PASS plugin-Ignite: '+checks+' live assertions');
} catch(e) {printErr(e);if(e.javaException)e.javaException.printStackTrace();failed=true;}
finally {if(isDef(ignite))ignite.stopAll(false);}
if(failed)exit(1);
