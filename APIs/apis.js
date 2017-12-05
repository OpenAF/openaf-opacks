(function() {
    ow.loadObj();
    ow.loadFormat();

    exports.serialize = function(obj) {
        var str = [];
        for(var p in obj)
            if (obj.hasOwnProperty(p)) {
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            }
        return str.join("&");
    };

    /**
     * <odoc>
     * <key>APIs.Currency</key>
     * From: http://fixer.io
     * Auth: none
     * </odoc>
     */
    exports.Currency = {
        /**
         * <odoc>
         * <key>APIs.Currency.getExchangeRates(aMap) : Map</key>
         * Returns a map with the currency exchanges between aMap.base currency with 3 letter
         * designation (defaults to EUR) a to the specific aMap.date (defaults to today). If
         * needed you can specify an array of currency symbols in aMap.symbols.
         * </odoc>
         */
        getExchangeRates: function(aMap) {
            var args, extra = {};
            try {
                args = (isUnDef(aMap.date)) ? "latest" : ow.format.fromDate(aMap.date, "yyyy-MM-dd");
            } catch(e) {
                args = "latest";
            }
            if (!(isString(aMap.base))) extra.base = "EUR"; else extra.base = aMap.base; 
            if (isDef(aMap.symbols)) extra.symbols = aMap.symbols.join(",");
            return ow.obj.rest.jsonGet("https://api.fixer.io/" + args + "?" + exports.serialize(extra));
        }
    };

    /**
     * <odoc>
     * <key>APIs.Countries</key>
     * From: https://restcountries.eu
     * Auth: none
     * 
     * From: https://sunrise-sunset.org/api
     * Auth: none
     * </odoc>
     */
    exports.Countries = {
        getAllCountries: function() {
            return ow.obj.rest.jsonGet("https://restcountries.eu/rest/v2/all");
        },
        getCountry: function(aCountry) {
            return ow.obj.rest.jsonGet("https://restcountries.eu/rest/v2/name/" + aCountry);
        },
        getCountryByCode: function(aCode) {
            return ow.obj.rest.jsonGet("https://restcountries.eu/rest/v2/alpha?codes=" + aCode);
        },
        getCountryByCurrency: function(aCurrency) {
            return ow.obj.rest.jsonGet("https://restcountries.eu/rest/v2/currency/" + aCurrency);
        },
        getCountryByCallingCode: function(aCode) {
            return ow.obj.rest.jsonGet("https://restcountries.eu/rest/v2/callingcode/" + aCode);
        },
        getSunriseSunsetByLatLog: function(aLat, aLog, aDate) {
            if (isUnDef(aDate)) aDate = "today"; else aDate = ow.format.fromDate(aDate, "yyyy-MM-dd");
            if (isUnDef(aLat) && isUnDef(aLog)) {
                var here = exports.GeoIP.get(ow.format.getPublicIP().ip);
                aLat = here.latitude;
                aLog = here.longitude;
            }
            var res = ow.obj.rest.jsonGet("https://api.sunrise-sunset.org/json?" + exports.serialize({
                formatted: 0,
                date: aDate,
                lat: aLat,
                lng: aLog
            }));
            if (res.status == "OK") {
                var r = {};
                for(var i in res.results) {
                    if (isString(res.results[i])) {
                        r[i] = new Date(res.results[i]);
                    } else {
                        r[i] = res.results[i];
                    }
                }
                return r;
            } else {
                return res;
            }
        } 
    };

    /**
     * <odoc>
     * <key>APIs.Numbers</key>
     * From: http://numbersapi.com
     * Auth: none
     * </odoc>
     */
    exports.Numbers = {
        getTrivia: function(aNumber) {
            if (isUnDef(aNumber)) aNumber = "random";
            return ow.obj.rest.jsonGet("http://numbersapi.com/" + aNumber + "/trivia");
        },
        getMath: function(aNumber) {
            if (isUnDef(aNumber)) aNumber = "random";
            return ow.obj.rest.jsonGet("http://numbersapi.com/" + aNumber + "/math");
        },
        getDate: function(aDay, aMonth) {
            if (isUnDef(aDay)) aDay = "random";
            if (isUnDef(aMonth)) aMonth = "";
            return ow.obj.rest.jsonGet("http://numbersapi.com/" + aMonth + "/" + aDay + "/date");
        },
        getYear: function(aYear) {
            if (isUnDef(aYear)) aYear = "random";
            return ow.obj.rest.jsonGet("http://numbersapi.com/" + aYear + "/year");
        }
    };

    /**
     * <odoc>
     * <key>APIs.GeoIP</key>
     * From: https://freegeoip.net
     * Auth: none (limited requests)
     * </odoc>
     */
    exports.GeoIP = {
        get: function(aIPAddress) {
            return ow.obj.rest.jsonGet("https://freegeoip.net/json/" + aIPAddress);
        }
    };

    /**
     * <odoc>
     * <key>APIs.Weather</key>
     * From: https://www.metaweather.com/api
     * Auth: none (limited requests)
     * 
     * TODO: https://developer.yahoo.com/weather/
     * </odoc>
     */
    exports.Weather = {
        getByLatLog: function(aLat, aLog) {
            if (isUnDef(aLat) && isUnDef(aLog)) {
                var here = exports.GeoIP.get(ow.format.getPublicIP().ip);
                aLat = here.latitude;
                aLog = here.longitude;
            }
            var woeid = ow.obj.rest.jsonGet("http://www.metaweather.com/api/location/search/?" + exports.serialize({
                lattlong: aLat + "," + aLog
            }));
            if (isDef(woeid) && isArray(woeid) && woeid.length > 0)
                return ow.obj.rest.jsonGet("http://www.metaweather.com/api", { location: woeid[0].woeid });
        },
        getByCity: function(aCity) {
            var woeid = ow.obj.rest.jsonGet("http://www.metaweather.com/api/location/search/?" + exports.serialize({
                query: aCity
            }));
            if (isDef(woeid) && isArray(woeid) && woeid.length > 0)
                return ow.obj.rest.jsonGet("http://www.metaweather.com/api", { location: woeid[0].woeid });
        }
    };

    /**
     * <odoc>
     * <key>APIs.test</key>
     * From: https://httpbin.org
     * Auth: none
     * </odoc>
     */
    exports.test = {
        getHeaders: function(aBaseURI, aIndexMap, aLoginOrFunction, aPassword, aTimeout, aRequestMap) {
            return ow.obj.rest.jsonGet("https://httpbin.org/headers", aIndexMap, aLoginOrFunction, aPassword, aTimeout, aRequestMap);
        },
        get: function(aBaseURI, aIndexMap, aLoginOrFunction, aPassword, aTimeout, aRequestMap) {
            return ow.obj.rest.jsonGet("https://httpbin.org/get", aIndexMap, aLoginOrFunction, aPassword, aTimeout, aRequestMap);
        },
        set: function(aBaseURI, aIndexMap, aDataRowMap, aLoginOrFunction, aPassword, aTimeout, aRequestMap) {
            return ow.obj.rest.jsonSet("https://httpbin.org/put", aIndexMap, aDataRowMap, aLoginOrFunction, aPassword, aTimeout, aRequestMap);
        },
        create: function(aBaseURI, aIndexMap, aDataRowMap, aLoginOrFunction, aPassword, aTimeout, aRequestMap) {
            return ow.obj.rest.jsonCreate("https://httpbin.org/post", aIndexMap, aDataRowMap, aLoginOrFunction, aPassword, aTimeout, aRequestMap);
        },
        remove: function(aBaseURI, aIndexMap, aLoginOrFunction, aPassword, aTimeout, aRequestMap) {
            return ow.obj.rest.jsonRemove("https://httpbin.org/delete", aIndexMap, aLoginOrFunction, aPassword, aTimeout, aRequestMap);
        }
    }
})();