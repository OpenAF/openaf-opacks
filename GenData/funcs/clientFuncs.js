(function() {
    /**
     * <odoc>
     * <key>GenData.funcs.genUSAddress(aGenData, aAddressList) : String</key>
     * Tries to generate random door number addresses from a provided GenData::AddressList list (if not provided it will try to load,
     * as clientAddresses, the list lists/clients/list_addresses.db).
     * </odoc>
     */
    exports.genUSAddress = function(aGenData, aAddressList) {
        if (isUnDef(aAddressList)) {
            aAddressList = "GenData::AddressList";
            aGenData.loadIfNotExists("GenData::AddressList", aGenData.getPath() + "/lists/clients/list_addresses.db");
        }

        var st = aGenData.getFromList(aAddressList); 
        st.address = st.address.replace(/^\d+/, aGenData.randomLong(aGenData.oneOf([{v:1,w:25},{v:2,w:25},{v:3,w:50}], "w").v));
        
        return { 
            address: st.address, 
            state: st.state, 
            zip: st.zip, 
            city: st.city 
        };
    };
})();