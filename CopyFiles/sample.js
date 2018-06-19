// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------

// For each input dir you should provide a key and a value. Use commas to separate between entries
var inputDirs = {
   "test1"  : "/some/dir/test1/source",
   "testA"  : "/some/dir/testA/source"
}

// For each output dir you should provide a key and a value. Use commas to separate between entries
var outputDirs = {
   "test1"  : "/some/dir/test1/target",
   "testA"  : "/some/dir/testA/target"
}

// Transform aSourceFilePath into a return filepath given a inputDirs/outputDirs key. This is usefull to rename files if needed. The comparision between source and target to determine the files to copy will use this function.
function transformFilenames(aKey, aSourceFilename) {
   var newname;

   switch(aKey) {
   case "test1": newname = aSourceFilename.replace(/^([^\/]+)$/, aKey + ":$1"); break;
   default     : newname = aSourceFilename;
   }

   return newname;
}

// Executes for each file where the copy files giving the source filepath + filename and target filepath + filename when the copy is successfull.
function pass(source, target) {
   // Rename source file to .done
   sh("mv " + source + " " + source + ".done");
}

// Executes for each file where the copy files giving the source filepath + filename and target filepath + filename in case of failure.
function fail(source, target) {
   // Don't do anything if it fails
}

// Filter files to copy by a regular expression
FILTER = "\.done$";
// Negate the filter so it's everything that doesn't match the filter
NOT = true;


// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------

