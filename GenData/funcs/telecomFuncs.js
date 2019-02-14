(function() {
    /**
     * <odoc>
     * <key>GenData.funcs.genFullPhone(aGenData, aCountry, aType) : String</key>
     * Shortcut for GenData.funcs.genPhone where the country code with a '+' is prefixed to the phone number and returned.
     * </odoc>
     */
    exports.genFullPhone = function(aGenData, aCountry, aType) {
        var p = this.genPhone(aGenData, aCountry, aType, false, true);
        return "+" + p.countryCode + p.phone;
    };

    /**
     * <odoc>
     * <key>GenData.funcs.genPhone(aGenData, aCountry, aType, addOperator, addCountryCode) : Object</key>
     * Using the lists/telecom/list_phonePatterns.yaml (loaded as genData::phonePatterns list) will try to generate a random
     * weighted phone number for the specific aCountry. aType can be "fixed", "mobile", "tollFree", "premium", "voip", "voicemail", "sharedCost", "personal". If aType
     * is not provided the following weights will be used: fixed 10%, mobile 40%, tollFree 30%, premium 15% and personal 5%.
     * Optionally if addCountryCode = true the country code will be returned, if addCountryCode = true the operator if not 
     * ported if found will be returned. Returns an object with phone, countryCode (optional) and operator (optional).
     * </odoc>
     */
    exports.genPhone = function(aGenData, aCountry, aType, addOperator, addCountryCode) {
        aGenData.loadIfNotExists("genData::phonePatterns", aGenData.getPath() + "/lists/telecom/list_phonePatterns.yaml");
        aGenData.loadIfNotExists("genData::phonePrefixes", aGenData.getPath() + "/lists/telecom/list_phonePrefixes.yaml");

        if (isUnDef(aType)) {
            aType = aGenData.oneOf([ 
                { t: "fixed", w: 10 }, 
                { t: "mobile", w: 40 },
                { t: "tollFree", w: 30 },
                { t: "premium", w: 15 },
                { t: "personal", w: 5 } ], "w").t;
        }

        var country = $path(aGenData.getList("genData::phonePatterns"), "[?country=='" + aCountry + "'] | [0]");
        var number = aGenData.randomRegEx(country[aType]);
        var operator = void 0;
        if (addOperator) {
            var options = $path(aGenData.getList("genData::phonePrefixes"), "[?country==`" + country.countryCode + "`] | [*].{prefixes: prefixes, operator: operator}");
            var found = false;
            for(var ioption = 0; ioption < options.length && !found; ioption++) {
                found = ( options[ioption].prefixes.findIndex((v) => {
                    return (String(country.countryCode) + String(number)).indexOf(v) == 0;
                }) >= 0);
                if (found) operator = options[ioption].operator;
            }
        }

        return {
            phone: number,
            countryCode: ((addCountryCode) ? country.countryCode : void 0),
            operator: ((addOperator) ? operator : void 0)
        };
    };

    /**
     * <odoc>
     * <key>GenData.funcs.genIMSI(aGenData, aCountry, anOperator) : String</key>
     * Given anOperator from aCountry (two-letter) will generate a possible IMSI based on the lists/telecom/list_phoneOperators.yaml.
     * </odoc>
     */
    exports.genIMSI = function(aGenData, aCountry, anOperator) {
        aGenData.loadIfNotExists("genData::phoneOperators", aGenData.getPath() + "/lists/telecom/list_phoneOperators.yaml");

        var opr;
        if (isDef(anOperator)) 
            opr = $path(aGenData.getList("genData::phoneOperators"), "[?operator=='" + anOperator + "'] | [?country=='" + aCountry + "'] | [0]");
        else 
            opr = aGenData.getFromList("genData::phoneOperators");

        return {
            imsi: String(opr.mcc) + String(opr.mnc) + aGenData.randomLongString(15 - (opr.mcc.length + opr.mnc.length)),
            operator: String(opr.operator)
        };
    };

    /**
     * <odoc>
     * <key>GenData.funcs.genIMEI(aGenData, aModel) : String</key>
     * Given a device model, from the lists/telecom/list_phoneTACs.yaml, will generate a valid IMEI.
     * </odoc>
     */
    exports.genIMEI = function(aGenData, aModel) {
        aGenData.loadIfNotExists("genData::phoneTACs", aGenData.getPath()+ "/lists/telecom/list_phoneTACs.yaml");

        var opr;
        if (isDef(aModel)) {
            opr = $path(aGenData.getList("genData::phoneTACs"), "[?name=='" + aModel + "']");
            opr = aGenData.oneOf(opr);
        } else {
            opr = aGenData.getFromList("genData::phoneTACs");
        }

        if (isDef(opr)) {
            return {
                imei: String(opr.tac) + aGenData.randomLongString(15 - (opr.tac.length)),
                model: opr.name
            };
        } else {
            throw "Model not found.";
        }
    };

    /**
     * <odoc>
     * <key>GenData.funcs.genICCID(aGenData, anOperator) : String</key>
     * Given anOperator, from the lists/telecom/list_phoneOperators.yaml, will generate a possible SIM ICCID.
     * </odoc>
     */
    exports.genICCID = function(aGenData, anOperator) {
        aGenData.loadIfNotExists("genData::operatorsIIN", aGenData.getPath() + "/lists/telecom/list_iin.yaml");

        var getLuhn = function(aValue) {
            aValue = String(aValue);
        
            var luhnArr = [[0,1,2,3,4,5,6,7,8,9],[0,2,4,6,8,1,3,5,7,9]], sum = 0;
            aValue.replace(/\D+/g,"").replace(/[\d]/g, function(c, p, o){
                sum += luhnArr[ (o.length-p)&1 ][ parseInt(c,10) ];
            });
            return aValue + ((10 - sum%10)%10);
        };
        
        var opr;
    
        if (isDef(anOperator)) {
            opr = $path(aGenData.getList("genData::operatorsIIN"), "[?operator=='" + anOperator + "'] | [0]");
        } else {
            opr = aGenData.getFromList("genData::operatorsIIN");
        }

        //var mii = "89"; // Major industry identifier, 2 fixed digits, 89 for telecommunication
        //var countryCode = "1"; // 3 digits as defined in E.164
        //var issuer = "1234"; // 4 digits
        var issuer;
        if (isDef(opr) && isDef(opr.simIssuer))
            issuer = String(aGenData.oneOf(opr.simIssuer));
        else
            issuer = "8911234";

        var individualAccount = aGenData.randomLongString(19 - issuer.length);
        var final = getLuhn(String(issuer) + String(individualAccount));

        return final;
    };
})();