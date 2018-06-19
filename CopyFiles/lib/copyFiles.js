/*
var TEST = (isDefined(params.test)) ? true : false;
var NOT = (isDefined(params.not)) ? true : false;
var ONLYNEW = (isDefined(params.onlynew)) ? true : false;
var EXCLUDEFILE = (isDefined(params.excludefile)) ? params.excludefile : undefined;
var FILTER = undefined;
if (isDefined(params.filter)) { 
   if (isDefined(params.filterParam)) 
      FILTER = new RegExp(params.filter, params.filterParam);
   else
      FILTER = new RegExp(params.filter);
}
var KEY = (isDefined(params.key)) ? params.key : undefined;
*/

ow.loadFormat();
loadUnderscore();

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------

function filesToTransfer(aDirectory, aFilter, aOutputDirectory, transformFunc, aKey, exc) {
   log("Checking files in " + aDirectory + "...");
   var files = io.listFilenames(aDirectory);
   var res;

   if (isArray(exc)) {
      var newfiles = $from(files).select(function(x) {
         if (exc.indexOf(x) < 0) {
           return x;
         }
      }); 
   
      files = _.compact(newfiles);
   } 

   if (isDefined(aFilter)) {
      log("Calculating files to copy from " + aDirectory + " using filter: '" + FILTER + "' (NOT = " + NOT + ") ...");
      if (NOT)
         res = $from(files).not().match(aFilter).select();
      else
         res = $from(files).match(aFilter).select();
   
      log("Found #" + ow.format.addNumberSeparator(files.length) + " files and filtered down to #" + ow.format.addNumberSeparator(res.length) + " files.");
   } else {
      res = files;
      if (isUndefined(aOutputDirectory)) {
         log("Calculating files to copy from " + aDirectory + "...");
         log("Found #" + ow.format.addNumberSeparator(res.length) + " files.");
      } else {
         log("Calculating files to copy from " + aDirectory + " compared with " + aOutputDirectory + "...");
         var outFiles = io.listFilenames(aOutputDirectory, true);
        
         var newres = $from(res).select(function(x) {
            if ((isArray(exc) && exc.indexOf(x) < 0) || !isArray(exc)) {
               var newfile = transformFunc(aKey, x.replace(/.+\//, ""));
               if (outFiles.indexOf(newfile) < 0)  
                  return x; 
            }
         } );

         newres = _.compact(newres); 

         log("Found #" + ow.format.addNumberSeparator(files.length) + " files. It was filtered down to #" + ow.format.addNumberSeparator(newres.length) + " files."); 
         res = newres;
      }
   }

   return res;
}

function copyFiles(aKey, aInputDirs, aOutputDirs, transformFilenameFunc, passFunc, failFunc, aFilter, test) {
   var files;
   var excludeList, filelist;  
 
   if (ONLYNEW) {
      log("Excluding comparing with " + aOutputDirs[aKey]);
      filelist = aOutputDirs[aKey];
   }
   if (isDefined(EXCLUDEFILE)) {
      log("Excluding from list on " + EXCLUDEFILE);
      excludeList = io.readFileAsArray(EXCLUDEFILE);
   }

   if (isUndefined(transformFilenameFunc)) {
      transformFilenameFunc = function(aKey, aFile) { return aFile; }
   }

   files = filesToTransfer(aInputDirs[aKey], aFilter, filelist, transformFilenameFunc, aKey, excludeList);

   if (test) log("TEST MODE -- nothing will be copied!");

   parallel4Array(files, function(file) {
      try {
         var newFile = aOutputDirs[aKey] + (aOutputDirs[aKey].match(/\/$/) ? "" : "/") + transformFilenameFunc(aKey, file.replace(/.+\//, ""));
         log(aKey + " | Copy " + file + " to " + newFile);
         //if (!test) io.writeFileBytes(newFile, io.readFileBytes(file)); 
         if (!test) {
            resh = sh("cp -p \"" + file + "\" \"" + newFile + "\" ; echo $?"); 
            if (resh == 1) throw "Error during copy " + resh;
         }
         if (!test && isDefined(passFunc)) passFunc(file, newFile, aKey);
      } catch(e) {
         logErr(aKey + " | Error for " + file + ": " + e);
         if (!test && isDefined(file) && isDefined(failFunc)) failFunc(file, newFile, aKey, e);
      }
      return file;
   }, NUMTHREADS); 
}

if (isDefined(KEY)) {
   var keys = KEY.split(",");
   for(i in keys) {
      log(keys[i] + " | Start copy");
      copyFiles(keys[i], inputDirs, outputDirs, transformFilenames, pass, fail, FILTER, TEST);
      log(keys[i] + " | Done copy");
   }
} else {
   parallel4Array(Object.keys(inputDirs), function(aKey) {
      log(aKey + " | Start copy");
      copyFiles(aKey, inputDirs, outputDirs, transformFilenames, pass, fail, FILTER, TEST);
      log(aKey + " | Done copy");
   }, NUMTHREADS);
}
