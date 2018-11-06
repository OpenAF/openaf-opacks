(function() {
    /**
     * <odoc>
     * <key>GenData.funcs.validateUnique(aName, aGenData, aRecord) : Boolean</key>
     * Keeps track of all the aRecord passed on a list aName. If the aRecord already exists on the list aName the function will 
     * return false otherwise it will return true and add aRecord the list aName.
     * </odoc>
     */
    exports.validateUnique = function(aName, aGenData, aRecord) {
        if (aGenData.containsList(aName, aRecord)) {
            return false;
        } else {
            aGenData.addToList(aName, aRecord);
            return true;
        }
    };
})();