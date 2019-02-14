// ------------------------------------------------------------------
// Generator
// ------------------------------------------------------------------

/**
 * <odoc>
 * <key>genData(chGen, chDump) : GenData</key>
 * Shortcut to crate a new instance of GenData.
 * </odoc>
 */
var genData = function(chGen, chDump) {
    return new GenData(chGen);
};

/**
 * <odoc>
 * <key>GenData.GenData(chGen, chDump)</key>
 * Creates a new GenData instance. Optionally you can provide a generation channel and/or a dump channel.
 * </odoc>
 */
var GenData = function(chGen, chDump) {
    ow.loadFormat();

    this.opackpath = getOPackPath("GenData") || ".";
    io.listFiles(this.opackpath + "/libs").files.forEach((v) => {
        af.externalAddClasspath("file:///" + v.canonicalPath);
    });

    if (isUnDef(chGen)) {
        chGen = "genDat::gen";
        $ch(chGen).destroy();
        $ch(chGen).create(1, "simple");
    }

    if (isUnDef(chDump)) {
        this.chDump = chGen;
    } else {
        this.chDump = chDump;
    }
    this.chGen = chGen;

    this.list = {};
    this.listType = {};
    this.extraFuncs = {};
    this.parallel = false;

    listFilesRecursive(this.opackpath + "/funcs").forEach((v) => {
        this.extraFuncs = merge(this.extraFuncs, require(v.canonicalPath));
    });
};

GenData.prototype.getPath = function() {
    return this.opackpath;
};

/**
 * <odoc>
 * <key>GenData.getGenCh() : Channel</key>
 * Retrieves the current generation channel in use.
 * </odoc>
 */
GenData.prototype.getGenCh = function() {
    return $ch(this.chGen);
};

/**
 * <odoc>
 * <key>GenData.getDumpCh() : Channel</key>
 * Retrieves the current dump channel in use.
 * </odoc>
 */
GenData.prototype.getDumpCh = function() {
    return $ch(this.chDump);
};

GenData.prototype.setParallel = function(aFlag) {
    this.parallel = aFlag;
    return this;
};

// GENERATE FUNCTIONS
// ------------------

/**
 * <odoc>
 * <key>GenData.generate(aFunction, numberOfSamples) : GenData</key>
 * Calls aFunction with the parameters: GenData (this object), auxiliaryFunctions (union of all functions under the funcs folder). The
 * return of aFunction will be consider the generated object and added to the generate channel. The number of times the generate
 * function is called is numberOfSamples (which defaults to 1).
 * </odoc>
 */
GenData.prototype.generate = function(aFunc, numberOfSamples) {
    if (isUnDef(numberOfSamples)) numberOfSamples = 1;
    var res = [];

    if (this.parallel) {
        var parent = this;
        // Probably divide in small chunks for big number of samples
        var arr = Object.keys(new Array(numberOfSamples).join().split(','));
        res = parallel4Array(arr, function(v) {
            var rec = aFunc(parent, parent.extraFuncs);
            if (isObject(rec)) {
                rec.___i = nowNano() + v;
                return rec;
            } else {
                return void 0;
            }
        });
    } else {
        for (var ii = 0; ii < numberOfSamples; ii++) {
            var rec = {};
            rec = aFunc(this, this.extraFuncs);
            if (isObject(rec)) {
                rec.___i = nowNano();
                res.push(rec);
            } else {
                throw "not an object: '" + rec + "'";
            }
        }
    }

    this.getGenCh().setAll(["___i"], res);
    return this;
};

/**
 * <odoc>
 * <key>GenData.generateFromList(aListName, aFunction) : GenData</key>
 * For each object in an existing list aListName calls aFunction with the parameters: GenData (this object), auxiliaryFunctions (union of all functions under the funcs folder) and
 * an object from aListName. The return of aFunction will be consider the generated object and added to the generate channel. 
 * </odoc>
 */
GenData.prototype.generateFromList = function(aName, aFunc) {
    if (isUnDef(this.list[aName])) throw "List " + aName + " doesn't exist.";
    var res = [];

    var lis;
    if (this.listType[aName] == "C") lis = this.list[aName].getKeys();
    if (this.listType[aName] == "S") lis = this.list[aName];

    if (this.parallel) {
        var parent = this;
        res = parallel4Array(lis, function(v) {
            var rec = aFunc(parent, parent.extraFuncs, v);
            rec.___i = nowNano();
            return rec;
        });
    } else {
        for(var ii in lis) {
            var rec = aFunc(this, this.extraFuncs, lis[ii]);
            rec.___i = nowNano();
            res.push(rec);
        }
    }

    this.getGenCh().setAll(["___i"], res);
    return this;
};

/**
 * <odoc>
 * <key>GenData.generateFromArray(anArray, aFunction) : GenData</key>
 * For each object in anArray calls aFunction with the parameters: GenData (this object), auxiliaryFunctions (union of all functions under the funcs folder) and
 * an object from anArray. The return of aFunction will be consider the generated object and added to the generate channel. 
 * </odoc>
 */
GenData.prototype.generateFromArray = function(anArray, aFunc) {
    _$(anArray).isArray("Need to provide an array.");
    var res = [];

    if (this.parallel) {
        var parent = this;
        res = parallel4Array(anArray, function() {
            var rec = aFunc(parent, parent.extraFuncs, anArray[ii]);
            rec.___i = nowNano();
            return rec;
        });
    } else {
        for(var ii in anArray) {
            var rec = aFunc(this, this.extraFuncs, anArray[ii]);
            rec.___i = nowNano();
            res.push(rec);
        }
    }

    this.getGenCh().setAll(["___i"], res);
    return this;
};

// UTIL FUNCTIONS
//

/**
 * <odoc>
 * <key>GenData.randomRange(min, max) : Number</key>
 * Generates a random long number between min and max.
 * </odoc>
 */
GenData.prototype.randomRange = function(min, max) {
    return Math.floor((Math.random() * (max+1-min)) + min);
};

/**
 * <odoc>
 * <key>GenData.randomDateRange(aFormat, aMin, aMax) : Date</key>
 * Generates a random date between aMin date string and aMax date string which the corresponding format is determined
 * by aFormat. For example:\
 * \
 * randomDateRange("yyyyMMdd hhmm", "19991231 2300", "20000101 0200");\
 * \
 * </odoc>
 */
GenData.prototype.randomDateRange = function(aFormat, aMin, aMax) {
    return new Date(this.randomRange(
        ow.format.toDate(aMin, aFormat).getTime(),
        ow.format.toDate(aMax, aFormat).getTime()
    ));
};

/**
 * <odoc>
 * <key>GenData.randomRegEx(aRegEx) : String</key>
 * Generates a sample string that complies with the provided aRegEx (regular expression).
 * </odoc>
 */
GenData.prototype.randomRegEx = function(aRegEx) {
    return String((new Packages.com.mifmif.common.regex.Generex(aRegEx)).random());
};

/**
 * <odoc>
 * <key>GenData.padNumber(aNumber, leftPad, rightPad) : String</key>
 * Pads the provided aNumber with leftPad number of zeros and/or rightPad number of zeros.
 * </odoc>
 */
GenData.prototype.padNumber = function(aNumber, leftPad, rightPad) {
    var anum = String(aNumber);
    if (isDef(leftPad) && leftPad > 0 && leftPad > anum.length) {
        anum = ow.format.string.leftPad(anum, leftPad, "0");
    } 

    if (isDef(rightPad) && rightPad > 0 && rightPad > anum.length) {
        anum = ow.format.string.rightPad(anum, rightPad, "0");
    }

    return anum;
};

/**
 * <odoc>
 * <key>GenData.randomLong(numberOfDigits) : Number</key>
 * Generates a random long with the provided numberOfDigits.
 * </odoc>
 */
GenData.prototype.randomLong = function(numberOfDigits) {
    var res = "";

    for(var ii = numberOfDigits; ii > 0; ii = ii - 17) {
        var c = (ii > 17) ? 17 : ii;
        var mult = Number("1" + repeat(c, '0'));
        res += Math.floor(mult * Math.random());
    }

    return res;
};

/**
 * <odoc>
 * <key>GenData.randomLongString(numberOfDigits) : String</key>
 * Generates a random long number string padded with zeros to the right.
 * </odoc>
 */
GenData.prototype.randomLongString = function(numberOfDigits) {
    return this.padNumber(this.randomLong(numberOfDigits), void 0, numberOfDigits);
};

/**
 * <odoc>
 * <key>GenData.randomFloat(numberOfDigits, numberOfDecimals) : Number</key>
 * Generates a random float number with the provided numberOfDigits and numberOfDecimals.
 * </odoc>
 */
GenData.prototype.randomFloat = function(numberOfDigits, numberOfDecimals) {
    var mult = Number("1" + repeat(numberOfDigits, '0'));

    return ow.format.round(mult * Math.random(), numberOfDecimals);
};

/**
 * <odoc>
 * <key>GenData.oneOf(anArray, aWeightField) : Object</key>
 * Chooses a random object from the provided anArray. If aWeightField is provided that field should be 
 * present in each object of anArray and it will be used to "weight" the probability of that element being choosen randomly.
 * </odoc>
 */
GenData.prototype.oneOf = function(anArray, aWeightField) {
    var max = anArray.length;
    if (isDef(aWeightField)) {
        var rWeight = this.randomRange(0, $path(anArray, "sum([]." + aWeightField + ")"));
        for(var ii in anArray) {
            rWeight = rWeight - anArray[ii][aWeightField];
            if (rWeight <= 0) return anArray[ii];
        }
    } else {
        return anArray[this.randomRange(0, max-1)];
    }
};

/**
 * <odoc>
 * <key>GenData.oneOfFn(anArrayFn, aWeightField) : Object</key>
 * Equivalent to GenData.oneOf but each object is expected to have a field "fn" which should be a function. A random 
 * object will be choosen and the corresponding function (fn) will be called. If aWeightField is provided that field should be 
 * present in each object of anArray and it will be used to "weight" the probability of that element being choosen randomly.
 * </odoc>
 */
GenData.prototype.oneOfFn = function(anArrayFn, aWeightField) {
    var o;
    if (isDef(aWeightField)) {
        o = this.oneOf(anArrayFn, aWeightField);
    } else {
        o = this.oneOf(anArrayFn);
    }

    if (isObject(o) && isFunction(o.fn)) return o.fn();
    if (isFunction(o)) return o();

    return void 0;
};

// LIST FUNCTIONS
// --------------

/**
 * <odoc>
 * <key>GenData.existsList(aName) : Boolean</key>
 * Returns true if aName list if defined for this GenData object instance (false otherwise).
 * </odoc>
 */
GenData.prototype.existsList = function(aName) {
    return (isDef(this.list[aName]));
};

/**
 * <odoc>
 * <key>GenData.loadList(aName, aFile, noSync) : GenData</key>
 * Tries to load all values of an array JSON or YAML aFile into a list named aName for this GenData object instance.
 * </odoc>
 */
GenData.prototype.loadList = function(aName, aFile) {
    var list = {};
    _$(aFile).isString("Please provide a filename");

    if (!(io.fileExists(aFile)) && io.fileExists(this.getPath()+"/" + aFile)) {
        aFile =  this.getPath() + "/" + aFile;
    }
    if (aFile.endsWith("yaml") || aFile.endsWith("yml")) {
        list = io.readFileYAML(aFile);
    } else {
        list = io.readFile(aFile);
    }

    this.setList(aName, list);  
    return this;
};

GenData.prototype.loadIfNotExists = function(aName, aFile) {
    var parent = this;
    sync(() => {
        if (parent.existsList(aName) == false) {
            parent.loadList(aName, aFile);
        }
    }, this);  
};

/**
 * <odoc>
 * <key>GenData.loadListFromDB(aName, aDB, aQuery) : GenData</key>
 * Tries to load all values resulting of executing aQuery on aDB into a list named aName for this GenData object instance.
 * </odoc>
 */
GenData.prototype.loadListFromDB = function(aName, aDB, aQuery) {
    aDB.convertDates(true);
    var res = aDB.q(aQuery);
    if (isDef(res)) {
        this.setList(aName, res.results);
    }
    return this;
};

/**
 * <odoc>
 * <key>GenData.loadListCh(aName) : GenData</key>
 * Creates a list named aName for a channel with the same aName.
 * </odoc>
 */
GenData.prototype.loadListCh = function(aName) {
    if ($ch().list().indexOf(aName) < 0) throw "Channel " + aName + " not found.";
    this.setList(aName, $ch(aName));

    return this;
};

/**
 * <odoc>
 * <key>GenData.createList(aName) : GenData</key>
 * Creates an empty list named aName.
 * </odoc>
 */
GenData.prototype.createList = function(aName) {
    this.setList(aName, []);

     return this;
};

/**
 * <odoc>
 * <key>GenData.setList(aName, anArray) : GenData</key>
 * Sets the list named aName with the contents of anArray (creating the list if it doesn't exist).
 * </odoc>
 */
GenData.prototype.setList = function(aName, anArray) {
    if (!(isArray(anArray))) throw "List " + aFile + " is not an array.";
    this.list[aName] = anArray;
    this.listType[aName] = "S";  

    return this;
};

/**
 * <odoc>
 * <key>GenData.addToList(aName, aObj, aFile, nTimes) : GenData</key>
 * Adds aObj to the list named aName. If nTimes is defined it will repeatly add nTimes instead of one time (this can be done
 * with the propose of given more chances for aObj being randomly choosen). If aFile is provided the list will be saved to aFile also.
 * </odoc>
 */
GenData.prototype.addToList = function(aName, aMap, aFile, nTimes) {
    if (this.listType[aName] != "S") throw "Only possible for normal lists.";
    if (isUnDef(this.list[aName])) this.list[aName] = [];
    
    nTimes = _$(nTimes).isNumber().default(1);
    for(var ii = 0; ii < nTimes; ii++) {
        this.list[aName].push(clone(aMap));
    }

    if (isDef(aFile)) this.saveList(aName, aFile);

    return this;
};

/**
 * <odoc>
 * <key>GenData.saveList(aName, aFile) : GenData</key>
 * Saves the current list named aName to aFile (yaml or json).
 * </odoc>
 */
GenData.prototype.saveList = function(aName, aFile) {
    if (isDef(aFile)) {
        if (aFile.endsWith("yaml") || aFile.endsWith("yml")) {
            io.writeFileYAML(aFile, this.list[aName]);
        } else {
            io.writeFile(aFile, this.list[aName]);
        }
    }

    return this;
};

/**
 * <odoc>
 * <key>GenData.getFromList(aName) : Object</key>
 * Returns a random object from the list named aName.
 * </odoc>
 */
GenData.prototype.getFromList = function(aName) {
    if (isUnDef(this.list[aName])) throw "List " + aName + " doesn't exist.";
    switch(this.listType[aName]) {
    case "C": return this.list[aName].get(this.oneOf(this.list[aName].getKeys()));
    default : return this.oneOf(this.list[aName]);
    }
};

/**
 * <odoc>
 * <key>GenData.getList(aName) : Array</key>
 * Returns all the list named aName.
 * </odoc>
 */
GenData.prototype.getList = function(aName) {
    if (isUnDef(this.list[aName])) throw "List " + aName + " doesn't exist.";
    switch(this.listType[aName]) {
    case "C": return this.list[aName].getAll();
    default : return this.list[aName];
    }
};

/**
 * <odoc>
 * <key>GenData.containsList(aName, aObj) : GenData</key>
 * Returns true if aObj is an element of the list named aName (false otherwise).
 * </odoc>
 */
GenData.prototype.containsList = function(aName, aObj) {
    var all = this.getList(aName);
    var found = false;
    for(var ii = 0;
        (ii < all.length && !found);
        ii++) {
        if (compare(all[ii], aObj)) found = true;
    }

    return found;
};

// ------------------------------------------------------------------
// Validator
// ------------------------------------------------------------------

/**
 * <odoc>
 * <key>GenData.validate(aValidatorFunction) : GenData</key>
 * For each generated object on the generation channel, executes aValidatorFunction with the arguments: GenData (this object),
 * auxiliaryFunctions (union of all functions under the funcs folder) and the object to be validated.
 * If the return is an object that object will replace the object provided as argument. If the return is boolean, if true the object
 * will be kept, if false the object will be removed. This also sets and uses a dump channel keeping the original generated objects on the
 * generation channel.
 * </odoc>
 */
GenData.prototype.validate = function(aValidator) {
    loadLodash();

    if (this.chGen == this.chDump) {
        this.chDump = "genDat::dump";
        $ch(this.chDump).destroy();
        $ch(this.chDump).create(1, "simple");
    }

    var parent = this;
    var res = [];
    if (this.parallel) {
        res = parallel4Array(parent.getGenCh().getKeys(), (aK) => {
            var aV = parent.getGenCh().get(aK);
            var test = clone(aV);
            delete test.___i;
            var isGood = aValidator(parent, parent.extraFuncs, test);
            if (isObject(isGood)) {
                isGood.___i = aV.___i;
                return isGood;
            } else {
                if (isGood) {
                    return aV;
                } else {
                    return void 0;
                }
            }
        });

        res = _.compact(res);    
    } else {
        parent.getGenCh().forEach((aK, aV) => {    
            var test = clone(aV);
            delete test.___i;
            var isGood = aValidator(parent, parent.extraFuncs, test);
            if (isObject(isGood)) {
                isGood.___i = aV.___i;
                res.push(isGood);
            } else {
                if (isGood) {
                    res.push(aV);
                }
            }
        });
    }

    parent.getDumpCh().setAll(["___i"], res);

    return this;
};

// ------------------------------------------------------------------
// Dumper
// ------------------------------------------------------------------

/**
 * <odoc>
 * <key>GenData.clean() : GenData</key>
 * Removes all the objects in the dump channel.
 * </odoc>
 */
GenData.prototype.clean = function() {
    var parent = this;
    this.getDumpCh().forEach((k, v) => {
        parent.getDumpCh().unset(k);
    });
    return this;
};

/**
 * <odoc>
 * <key>GenData.dump(aTimeout) : Array</key>
 * Returns all the objects in the dump channel resulted from an object generation (and also validated if defined).
 * If aTimeout is defined it will try to wait aTimeout for any subscribers of the dump channel.
 * </odoc>
 */
GenData.prototype.dump = function(aTimeout) {
    aTimeout = _$(aTimeout).isNumber().default(void 0);
    this.getDumpCh().waitForJobs(aTimeout);
    var o = this.getDumpCh().getAll();
    for(var ii = 0; ii < o.length; ii++) { 
        delete o[ii].___i; 
    }

    return o;
};

GenData.prototype.dumpNDJSON = function(aFile, aEncode, aTimeout) {
    aTimeout = _$(aTimeout).isNumber().default(void 0);
    var stream = io.writeFileStream(aFile), delim = "";
    this.getDumpCh().forEach((k, v) => {
        delete v.___i;
        var s = delim + stringify(v, void 0, "");
        ioStreamWrite(stream, s, s.length, true);
        delim = "\n";
    });
    stream.close();

    return this;
};

GenData.prototype.__getDBArrays = function(arrKeys) {
    arrKeys = _$(arrKeys).isArray().default([]);
    var n = [], nk = [];
    var rses = [];
    var o = this.dump();

    for(var ii in o) {
        var r = [], rk = [];
        for(var jj in o[ii]) {
            if (ii == 0) {
                if (arrKeys.indexOf(jj) >= 0) {
                    nk.push("\"" + jj + "\""); 
                } else {
                    n.push("\"" + jj + "\""); 
                }
            }
            if (isString(o[ii][jj])) {
                if (arrKeys.indexOf(jj) >= 0) {
                    rk.push(String(o[ii][jj]));
                } else {
                    r.push(String(o[ii][jj]));
                }
            } else {
                if (isDate(o[ii][jj])) {
                    if (arrKeys.indexOf(jj) >= 0) {
                        rk.push(new java.sql.Date(o[ii][jj]));
                    } else {
                        r.push(new java.sql.Date(o[ii][jj]));
                    }
                } else {
                    if (arrKeys.indexOf(jj) >= 0) {
                        rk.push(o[ii][jj]);
                    } else {
                        r.push(o[ii][jj]);
                    }
                }
            }
        }
        rses.push(r.concat(rk));
    }

    return {
        fields: n,
        values: rses,
        keyFields: nk
    };
};

/**
 * <odoc>
 * <key>GenData.dumpDB(aDB, aTableName, shouldTruncate) : GenData</key>
 * Tries to insert all objects in the dump channel to aTableName. If shouldTruncate = true it will try to truncate the 
 * table first.
 * </odoc>
 */
GenData.prototype.dumpDB = function(aDB, aTable, shouldTruncate) {
    if (shouldTruncate) aDB.u("TRUNCATE TABLE " + aTable);

    var dbData = this.__getDBArrays();
    var binds = [];
    dbData.fields.forEach((v) => {
        binds.push("?");
    });

    aDB.usArray("INSERT INTO " + aTable + " (" + dbData.fields.join(", ") + ") values (" + binds.join(", ") + ")", dbData.values);
    aDB.commit();

    return this;
};

/**
 * <odoc>
 * <key>GenData.updateDB(aDB, aTable, anArrayKeys) : GenData</key>
 * Tries to update existing records on aTable using the object data from the dump channel. The update statements will use the fields specified
 * in arrayKeys for filtering the records to update.
 * </odoc>
 */
GenData.prototype.updateDB = function(aDB, aTable, arrayKeys) {
    _$(arrayKeys).isArray("Need to provide an array of keys.");

    if (arrayKeys.length <= 0) throw "Please provide at least one key";

    var dbData = this.__getDBArrays(arrayKeys);
    var binds = [], bindsK = [];

    dbData.fields.forEach((v) => {
        binds.push(v + " = ?");
    });

    dbData.keyFields.forEach((v) => {
        bindsK.push(v + " = ?");
    });

    aDB.usArray("UPDATE " + aTable + " SET " + binds.join(", ") + " WHERE " + bindsK.join(" AND "), dbData.values);
    aDB.commit();
    
    return this;
};