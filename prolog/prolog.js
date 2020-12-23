// Author: Nuno Aguiar

loadExternalJars(getOPackPath("Prolog") || ".");

/**
 * <odoc>
 * <key>Prolog.Prolog(aInput) : Prolog</key>
 * Creates a Prolog instance. If aInput is defined and corresponds to a file, it will be loaded 
 * as Prolog terms and clauses; if it's a string it will be loaded as Prolog terms and clauses.
 * (currently using Projog (http://www.projog.org/manual.html))
 * </odoc>
 */
var Prolog = function(aInput) {
   this.pl = new Packages.org.projog.api.Projog();
   if (isString(aInput)) {
      if (io.fileExists(aInput)) {
         this.consultFile(aInput);
      } else {
         if (aInput.trim().endsWith(".")) {
            this.consult(aInput);
         }
      }
   }
};

/**
 * <odoc>
 * <key>Prolog.getJavaObj() : Java</key>
 * Returns the internal java object.
 * </odoc>
 */
Prolog.prototype.getJavaObj = function() {
   return this.pl;
};

/**
 * <odoc>
 * <key>Prolog.consult(aString)</key>
 * Loads aString with Prolog terms and clauses.
 * </odoc>
 */
Prolog.prototype.consult = function(aK) {
   this.pl.consultReader(new java.io.StringReader(aK));
};

/**
 * <odoc>
 * <key>Prolog.consultFile(aFile)</key>
 * Loads Prolog terms and clauses from aFile.
 * </odoc>
 */
Prolog.prototype.consultFile = function(aFile) {
   this.pl.consultFile(new java.io.File(aFile));
};

/**
 * <odoc>
 * <key>Prolog.assert(aFact, onStart) : Boolean</key>
 * Includes aFact in the current knowledge base, by default on the end (onStart = true it will be added on the
 * begining). Returns true or false.
 * </odoc>
 */
Prolog.prototype.assert = function(aFact, onStart) {
   onStart = _$(onStart, "onStart").isBoolean().default(false);
 
   var cmd;
   if (onStart) cmd = "asserta"; else cmd = "assertz";

   aFact = cmd + "(" + aFact.trim().replace(/\.$/, "") + ").";
   return this.__parseresult(this.pl.query(aFact));
};

Prolog.prototype.__parseresult = function(aQ, aT, aL) {
   aL = _$(aL, "aLimit").isNumber().default(-1);

   var r1 = aQ.getResult(), res = [];
   var ks = af.fromJavaArray(r1.getVariableIds().toArray());

   if (isDef(aT) && isMap(aT)) { Object.keys(aT).forEach(k => r1.setTerm(k, new org.projog.core.term.Atom(aT[k]))) }

   if (ks.length == 0) return r1.next();
   while(r1.next() && (aL < 0 || aL > res.length)) {
      var r = {};
      ks.forEach(k => {
         r[k] = r1.getTerm(k);
      }); 
      res.push(r);
   }
   return res;
};

/**
 * <odoc>
 * <key>Prolog.query(aQuery, aTerms, aLimit) : Object</key>
 * Performs the provides aQuery on the current knowledge base. Optionally a aTerms map can be provided to 
 * narrow the query. Returns an array with all results (or up to aLimit if provided).
 * </odoc>
 */
Prolog.prototype.query = function(aQuery, aTerms, aLimit) {
   if (!aQuery.endsWith(".")) aQuery += ".";
   var q = this.pl.query(aQuery);

   return this.__parseresult(q, aTerms, aLimit);
};

/**
 * <odoc>
 * <key>Prolog.q(aQuery, aMapOrArray, aKey, aPrefix, otherGoals, aTerms, aLimit) : Object</key>
 * Performs aQuery over the current knowledge if none is provided through aMapOrArray and/or otherGoals. If new knowledge
 * is provided it will clean existing knowledge and consult new one based on aMapOrArray and otherGoals (will prefix aMapOrArray).
 * If aMapOrArray is provided a map aKey should be provided with an optional aPrefix (defaults to "m_"). A query limiting aTerms map and/or
 * aLimit number of results can also be provided. 
 * </odoc>
 */
Prolog.prototype.q = function(aQuery, aMapOrArray, aKey, aPrefix, otherGoals, aTerms, aLimit) {
   _$(aQuery, "aQuery").isString().$_();
   otherGoals = _$(otherGoals, "otherGoals").isString().default("");

   if (isArray(aMapOrArray) || isMap(aMapOrArray) || otherGoals.length > 0) {
      this.pl = new Packages.org.projog.api.Projog();

      if (otherGoals.length > 0) {
         if (!otherGoals.trim().endsWith(".")) otherGoals += ".";
         this.consult(otherGoals);
      }
   
      if (isArray(aMapOrArray)) this.consultMapArray(aPrefix, aMapOrArray, aKey);
      if (isMap(aMapOrArray))   this.consultMap(aPrefix, aMapOrArray, aKey);
   }

   return this.query(aQuery, aTerms, aLimit);
};

/**
 * <odoc>
 * <key>Prolog.consultMapArray(aPrefix, anArray, aKey)</key>
 * Given anArray will use Prolog.fromMapArray2Prolog to add the corresponding facts converted from the map array given aPrefix and aKey.
 * </odoc>
 */
Prolog.prototype.consultMapArray = function(aPrefix, anArray, aKey) {
   this.consult(this.fromMapArray2Prolog(aPrefix, anArray, aKey));
};

/**
 * <odoc>
 * <key>Prolog.consultMap(aPrefix, aMap, aKey)</key>
 * Given aMap will use Prolog.fromMap2Prolog to add the corresponding facts converted from the map given aPrefix and aKey.
 * </odoc>
 */
Prolog.prototype.consultMap= function(aPrefix, aMap, aKey) {
   this.consult(this.fromMap2Prolog(aPrefix, aMap, aKey));
};

/**
 * <odoc>
 * <key>Prolog.fromMapArray2Prolog(aPrefix, anArray, aKey) : String</key>
 * Given anArray of maps will execute, for each, entry the Prolog.fromMap2Prolog function and return the cummulative
 * facts given also aPrefix and aKey.
 * </odoc>
 */
Prolog.prototype.fromMapArray2Prolog = function(aPrefix, anArray, aKey) {
   return anArray.map(v => this.fromMap2Prolog(aPrefix, v, aKey)).join("");
};

/**
 * <odoc>
 * <key>Prolog.fromMap2Prolog(aPrefix, aMap, aKey) : String</key>
 * Given aMap will flatten it (using ow.obj.flatten) and generate prolog facts given the map's aKey as first argument
 * and the value as the second argument. The relation name will be prefixed with aPrefix (defaults to 'm_') (the prefix
 * needs to start with a lower case).
 * </odoc>
 */
Prolog.prototype.fromMap2Prolog = function(aPrefix, aMap, aKey) {
   _$(aMap, "aMap").isMap().$_();
   _$(aKey, "aKey").isString().$_();
   aPrefix = _$(aPrefix, "aPrefix").isString().default("m_");

   if (isUnDef(aMap[aKey])) throw "Key not found in map.";

   var _v = v => {
      switch(descType(v)) {
      case 'date'   : return "'" + v.toISOString() + "'";
      case 'boolean': return "'" + String(v) + "'";
      case 'number' : return v;
      case 'string' : return "'" + v + "'";
      }
   };
   
   var res = "";
   traverse( aMap, (aK, aV, aP, aO) => {
      if (!isObject(aV)) {
         res += aPrefix + (aK + aP).replace(/[\s\.]/g, "_") + "(" + _v($$(aMap).get(aKey)) + ", " + _v(aV) + ").\n";
      }
   });
   return res;
};