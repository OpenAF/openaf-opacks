(function() {
    /**
     * <odoc>
     * <key>GenData.funcs.genCounter(aName, aInitValue) : Number</key>
     * Starts an internal counter named aName with the initial value aInitValue. Everytime the function is executed
     * for the same aName it increments the counter and returns the value.
     * </odoc>
     */
    exports.genCounter = function(aName, ini) {
        ini = _$(ini).isNumber().default(0);
        if (isUnDef(this.__counter)) this.__counter = {};
        if (isUnDef(this.__counter[aName])) this.__counter[aName] = ini;
        return this.__counter[aName]++;
    };

    /**
     * <odoc>
     * <key>GenData.funcs.genUsername(aGenData, aFullName) : String</key>
     * Tries to generate an username from aFullName (with first and last name separated with a space).
     * Will randomly return either "First.Last" or "FirstLast" or "FLast".
     * </odoc>
     */
    exports.genUsername = function(aGenData, aFullName) {
        var names = aName.toLowerCase().split(/ +/);

        return aGenData.oneOf([
            names[0] + names[1],
            names[0] + "." + names[1],
            names[0][0] + names[1]
        ]);
    };

    /**
     * <odoc>
     * <key>GenData.funcs.genUnique(aName, aFunction, maxTries) : Object</key>
     * Keeps track of the results of calling aFunction on an internal list aName. If the result is repeated 
     * it will execute aFunction, with a maximum of maxTries (defaults to 15), until an unique result is returned.
     * After maxTries it returns null.
     * </odoc>
     */
    exports.genUnique = function(aName, fn, maxTries) {
        if (isUnDef(this.__unique)) this.__unique = {};
        if (isUnDef(this.__unique[aName])) this.__unique[aName] = [];

        _$(fn).isFunction("Please provide a function.");
        maxTries = _$(maxTries).isNumber().default(15);
        var res;
        do {
            maxTries--;
            res = fn();
        } while(maxTries > 0 && this.__unique[aName].indexOf(res) >= 0);

        if (maxTries <= 0) {
            return null;
        } else {
            this.__unique[aName].push(res);
            return res;
        }
    };
})();