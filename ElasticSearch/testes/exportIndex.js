load("elasticsearch.js");

var es = new ElasticSearch("http://127.0.0.1:9200");

var initial = [];
initial.push(es.createScroll("guru", void 0, 100, void 0, 0, 5));
initial.push(es.createScroll("guru", void 0, 100, void 0, 1, 5));
initial.push(es.createScroll("guru", void 0, 100, void 0, 2, 5));
initial.push(es.createScroll("guru", void 0, 100, void 0, 3, 5));
initial.push(es.createScroll("guru", void 0, 100, void 0, 4, 5));
printErr("Dumping " + initial[0].hits.total + "...");
printErr("Dumping " + initial[1].hits.total + "...");
printErr("Dumping " + initial[2].hits.total + "...");
printErr("Dumping " + initial[3].hits.total + "...");
printErr("Dumping " + initial[4].hits.total + "...");

var ops = [], c = initial[0].hits.total;
var wstream = io.writeFileStream("teste");
parallel4Array(initial, function(ini) {
   try {
      var res = ini; var c = 0;
      printErr("Start " + ini._scroll_id + "...");
      while(res.hits.hits.length > 0) {
         res.hits.hits.forEach((v) => {
            var m = stringify(v._source, void 0, "") + "\n";
            ioStreamWrite(wstream, m, m.length, false);
         });
         res = es.nextScroll(res);
      }
      printErr("Done " + ini._scroll_id + "...");
   } catch(e) {
      sprintErr(e);
   }
   return true;
});

try {
   for(var is in initial) {
      es.deleteScroll(initial[is]);
   }
} catch(e) {
}

wstream.close();
log("done");