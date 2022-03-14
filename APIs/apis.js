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
     * <key>apis.Currency</key>
     * From: http://fixer.io
     * Auth: none
     * </odoc>
     */
    exports.Currency = {
        /**
         * <odoc>
         * <key>apis.Currency.getExchangeRates(aMap) : Map</key>
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
     * <key>apis.Countries</key>
     * From: https://restcountries.com
     * Auth: none
     * 
     * From: https://sunrise-sunset.org/api
     * Auth: none
     * </odoc>
     */
    exports.Countries = {
        getAllCountries: function() {
            return $rest().get("https://restcountries.com/v3.1/all");
        },
        getCountry: function(aCountry) {
            return $rest().get("https://restcountries.com/v3.1/name/" + aCountry);
        },
        getCountryByCode: function(aCode) {
            return $rest().get("https://restcountries.com/v3.1/alpha?codes=" + aCode);
        },
        getCountryByCurrency: function(aCurrency) {
            return $rest().get("https://restcountries.com/v3.1/currency/" + aCurrency);
        },
        getCountryByCallingCode: function(aCode) {
            return $rest().get("https://restcountries.com/v2/callingcode/" + aCode);
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
     * <key>apis.Numbers</key>
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
     * <key>apis.GeoIP</key>
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
     * <key>apis.Weather</key>
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
     * <key>apis.OpenMeteo</key>
     * From: https://open-meteo.com
     * </odoc>
     */
    var _OpenMeteo_translateWeatherCode = aWC => {
        aWC = _$(aWC, "aWC").toNumber().isNumber().default(__)
        switch(aWC) {
        case 0         : return "Clear sky"
        case 1, 2, 3   : return "Mainly clear, partly cloudy, and overcast"
        case 45, 48    : return "Fog and depositing rime fog"
        case 51, 53, 55: return "Drizzle: Light, moderate, and dense intensity"
        case 56, 57    : return	"Freezing Drizzle: Light and dense intensity"
        case 61, 63, 65: return "Rain: Slight, moderate and heavy intensity"
        case 66, 67    : return "Freezing Rain: Light and heavy intensity"
        case 71, 73, 75: return "Snow fall: Slight, moderate, and heavy intensity"
        case 77        : return	"Snow grains"
        case 80, 81, 82: return "Rain showers: Slight, moderate, and violent"
        case 85, 86    : return	"Snow showers slight and heavy"
        case 95        : return "Thunderstorm: Slight or moderate"
        case 96, 99    : return "Thunderstorm with slight and heavy hail"
        default        : return aWC
        }
    }
    exports.OpenMeteo = {
        getHourlyForecast: (aLat, aLon) => {
            aLat = _$(aLat, "aLat").isNumber().default(__)
            aLon = _$(aLon, "aLon").isNumber().default(__)

            if (isUnDef(aLat) || isUnDef(aLog)) {
                ow.loadNet()
                var myPos = ow.net.getPublicIP()
                aLat = myPos.latitude
                aLon = myPos.longitude
            }

            var res = $rest().get("https://api.open-meteo.com/v1/forecast?latitude="+aLat+"&longitude="+aLon+"&hourly=temperature_2m,relativehumidity_2m,dewpoint_2m,apparent_temperature,pressure_msl,precipitation,weathercode,snow_depth,freezinglevel_height,shortwave_radiation,direct_radiation,diffuse_radiation,evapotranspiration")

            if (isDef(res) && isDef(res.hourly) && isArray(res.hourly.weathercode))
                res.hourly.weathercode = res.hourly.weathercode.map(_OpenMeteo_translateWeatherCode)

            return res
        },
        getDailyForecast: (aLat, aLon, aTZ) => {
            aLat = _$(aLat, "aLat").isNumber().default(__)
            aLon = _$(aLon, "aLon").isNumber().default(__)
            aTZ  = _$(aTZ, "aTZ").isString().default("UTC")

            if (isUnDef(aLat) || isUnDef(aLog)) {
                ow.loadNet()
                var myPos = ow.net.getPublicIP()
                aLat = myPos.latitude
                aLon = myPos.longitude
            }

            var res = $rest().get("https://api.open-meteo.com/v1/forecast?latitude="+aLat+"&longitude="+aLon+"&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,precipitation_sum,precipitation_hours,windspeed_10m_max,windgusts_10m_max,winddirection_10m_dominant&timezone="+aTZ)
            
            if (isDef(res) && isDef(res.daily) && isArray(res.daily.weathercode))
                res.daily.weathercode = res.daily.weathercode.map(_OpenMeteo_translateWeatherCode)

            return res
        },
        getSunRiseSetByLatLon: (aLat, aLon, aPeriod, aTZ) => {
            aLat = _$(aLat, "aLat").isNumber().default(__)
            aLon = _$(aLon, "aLon").isNumber().default(__)
            aTZ  = _$(aTZ, "aTZ").isString().default("UTC")
            aPeriod = _$(aPeriod, "aPeriod").oneOf(["sunset","sunrise"]).default("sunset,sunrise")

            if (isUnDef(aLat) || isUnDef(aLog)) {
                ow.loadNet()
                var myPos = ow.net.getPublicIP()
                aLat = myPos.latitude
                aLon = myPos.longitude
            }

            var res = $rest().get("https://api.open-meteo.com/v1/forecast?latitude="+aLat+"&longitude="+aLon+"&current_weather=true&timezone="+aTZ+"&daily="+aPeriod) 

            if (isDef(res.current_weather) && isNumber(res.current_weather.weathercode))
               res.weatherDesc = _OpenMeteo_translateWeatherCode(res.current_weather.weathercode)

            return res
        }
    }

    /**
     * <odoc>
     * <key>apis.LatLon</key>
     * From: https://nominatim.org/release-docs/develop/api/Search/
     * </odoc>
     */
    exports.LatLon = {
        getLatLon: (aQuery, retRaw) => {
            aQuery = _$(aQuery, "aQuery").isString().$_()
            retRaw = _$(retRaw, "retRaw").isBoolean().default(false)

            var res = $rest({uriQuery: true}).get("https://nominatim.openstreetmap.org/search", { 
                q: aQuery,
                format: "jsonv2" 
            })

            if (retRaw) {
                return res
            } else {
                return { lat: res[0].lat, lon: res[0].lon }
            }
        }
    }

    /**
     * <odoc>
     * <key>apis.SunRiseSet</key>
     * From: https://sunrise-sunset.org
     * </odoc>
     */
    exports.SunRiseSet = {
        getByLatLog: (aDat, aLat, aLon) => {
            aLat = _$(aLat, "aLat").isNumber().default(__)
            aLon = _$(aLon, "aLon").isNumber().default(__)
            aDat = _$(aDat, "aDat").isString().default("today")

            if (isUnDef(aLat) || isUnDef(aLog)) {
                ow.loadNet()
                var myPos = ow.net.getPublicIP()
                aLat = myPos.latitude
                aLon = myPos.longitude
            }

            var res = $rest({uriQuery: true}).get("https://api.sunrise-sunset.org/json", {
                lat      : aLat,
                lng      : aLon,
                date     : aDat,
                formatted: 0
            })

            return res.results
        }
    }
    /**
     * <odoc>
     * <key>apis.EvilInsult</key>
     * From: https://evilinsult.com/api/#generate-insult-get
     * </odoc>
     */
    exports.EvilInsult = {
        get: function() {
            return $rest().get("https://evilinsult.com/generate_insult.php?lang=en&type=json").insult
        }
    }
    /**
     * <odoc>
     * <key>apis.Loripsum</key>
     * From: https://loripsum.net
     * </odoc>
     */
    exports.Loripsum = {
        get: function(aNum, aSize) {
            aNum  = _$(aNum, "aNum").isNumber().default(__)
            aSize = _$(aSize, "aSize").oneOf(["short", "medium", "long", "verylong"]).default("short")

            var res = "/plaintext"
            if (isDef(aNum)) res += "/" + aNum
            if (isDef(aSize)) res += "/" + aSize

            return $rest().get("https://loripsum.net/api" + res)
        }
    }
    /**
     * <odoc>
     * <key>apis.RandomData</key>
     * From: https://random-data-api.com/documentation
     * </odoc>
     */
    exports.RandomData = { 
        get: function(aResource, aSize) {
            aResource = _$(aResource, "aResource").isString().default("stripe")
            aSize     = _$(aSize, "aSize").isNumber().default(__)

            return $rest().get("https://random-data-api.com/api/" + aResource + "/random_" + aResource + (isNumber(aSize) ? "?size=" + aSize : ""))
        }
    }
    /**
     * <odoc>
     * <key>apis.Metaphorpsum</key>
     * From: http://metaphorpsum.com
     * </odoc>
     */
    exports.Metaphorpsum = {
        get: function(aNumParagraphs, aNumSentences) {
            aNumParagraphs = _$(aNumParagraphs, "aNumParagraphs").isNumber().default(1)
            aNumSentences  = _$(aNumSentences, "aNumSentences").isNumber().default(1)

            var res = {}

            if (isDef(aNumSentences))  res = aNumSentences
            if (isDef(aNumParagraphs)) 
                res = "/paragraphs/" + aNumParagraphs + "/" + res
            else
                res = "/sentences/" + res

            return $rest().get("http://metaphorpsum.com" + res)
        }
    }
    /**
     * <odoc>
     * <key>apis.ChuckNorrisJokes</key>
     * From: https://api.chucknorris.io
     * Auth: none
     * </odoc>
     */
    exports.ChuckNorrisJokes = {
        getJson: function() {
            return ow.obj.rest.jsonGet("https://api.chucknorris.io/jokes/random");
        },
        get: function() {
            return this.getJson().value;
        }
    };

    /**
     * <odoc>
     * <key>apis.FakeData</key>
     * From: http://jsonplaceholder.typicode.com
     * Auth: none
     * </odoc>
     */
    exports.FakeData = {
        getPosts: function(extra) {
            if (isDef(extra) && !extra.match(/^\//)) extra = "/" + extra;
            if (isUnDef(extra)) extra = "";
            return ow.obj.rest.jsonGet("https://jsonplaceholder.typicode.com/posts" + extra);
        },
        getComments: function(extra) {
            if (isDef(extra) && !extra.match(/^\//)) extra = "/" + extra;
            if (isUnDef(extra)) extra = "";
            return ow.obj.rest.jsonGet("https://jsonplaceholder.typicode.com/comments" + extra);
        },
        getAlbums: function(extra) {
            if (isDef(extra) && !extra.match(/^\//)) extra = "/" + extra;
            if (isUnDef(extra)) extra = "";
            return ow.obj.rest.jsonGet("https://jsonplaceholder.typicode.com/albums" + extra);
        },
        getPhotos: function(extra) {
            if (isDef(extra) && !extra.match(/^\//)) extra = "/" + extra;
            if (isUnDef(extra)) extra = "";
            return ow.obj.rest.jsonGet("https://jsonplaceholder.typicode.com/photos" + extra);
        },
        getTodos: function(extra) {
            if (isDef(extra) && !extra.match(/^\//)) extra = "/" + extra;
            if (isUnDef(extra)) extra = "";
            return ow.obj.rest.jsonGet("https://jsonplaceholder.typicode.com/todos" + extra);
        },
        getUsers: function(extra) {
            if (isDef(extra) && !extra.match(/^\//)) extra = "/" + extra;
            if (isUnDef(extra)) extra = "";
            return ow.obj.rest.jsonGet("https://jsonplaceholder.typicode.com/users" + extra);
        },
    };

    /**
     * <odoc>
     * <key>apis.test</key>
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
    };

    /**
     * <odoc>
     * <key>apis.dnsOverHTTPS</key>
     * From: https://developers.google.com/speed/public-dns/docs/dns-over-https
     * From: https://developers.cloudflare.com/1.1.1.1/dns-over-https/json-format/ 
     * Auth: none
     * </odoc>
     */
    exports.dnsOverHTTPS = {
        resolve: function(aName, aType, aProvider) {
            aProvider = _$(aProvider).default("cloudflare");
            
            switch(aProvider) {
            case "google"    :
                var res = $rest().get("https://dns.google.com/resolve?" + $rest().query({ name: aName, type: aType }));
                if (isDef(res.Answer)) return res.Answer; else return void 0;
            case "cloudflare":
                var res = $rest({ requestHeaders: { accept: "application/dns-json"  } })
                          .get("https://1.1.1.1/dns-query?" + $rest()
                          .query({ name: aName, type: aType }));
            if (isDef(res.Answer)) return res.Answer; else return void 0;
            default: break;
            }
        },

        a: function(aName) {
            return this.resolve(aName, "a");
        },

        aaaa: function(aName) {
            return this.resolve(aName, "aaaa");
        },

        cname: function(aName) {
            return this.resolve(aName, "cname");
        },

        mx: function(aName) {
            return this.resolve(aName, "mx");
        },

        any: function(aName) {
            return this.resolve(aName, "any");
        }
    };

    /**
     * <odoc>
     * <key>apis.Facts</key>
     * From: https://cat-fact.herokuapp.com
     * Auth: none
     * </odoc>
     */
    exports.Facts = {
        getCatFacts: function() {
            return $rest().get("https://cat-fact.herokuapp.com/facts/random?" + $rest().query({animal_type: "cat"}));
        },
        getDogFacts: function() {
            return $rest().get("https://cat-fact.herokuapp.com/facts/random?" + $rest().query({animal_type: "dog"}));
        },
        getHorseFacts: function() {
            return $rest().get("https://cat-fact.herokuapp.com/facts/random?" + $rest().query({animal_type: "horse"}));
        }
    };

    /**
     * <odoc>
     * <key>apis.UINames</key>
     * From: https://github.com/thm/uinames
     * Auth: none
     * </odoc>
     */
    exports.UINames = {
        getBasicInfo: (anAmount, aGender, aRegion) => {
            return $rest({ uriQuery: true }).get("https://uinames.com/api/", {
                amount: anAmount,
                gender: aGender,
                region: aRegion
            });
        },
        getExtra: (anAmount, aGender, aRegion) => {
            return $rest({ uriQuery: true }).get("https://uinames.com/api/", {
                amount: anAmount,
                gender: aGender,
                region: aRegion,
                ext: true
            });
        },
    };

    /**
     * <odoc>
     * <key>apis.Binance</key>
     * From: https://api2.binance.com/api/v3/ticker/24hr
     * Auth: none
     * 
     * 24 hours crypto finance ticket
     * </odoc>
     */
    exports.Binance = {
        get: () => {
            return $rest().get("https://api2.binance.com/api/v3/ticker/24hr")
        }
    }

    /**
     * <odoc>
     * <key>apis.BoredActivity</key>
     * From: https://www.boredapi.com/api/activity
     * Auth: none
     * 
     * Provides activity suggestions
     * </odoc>
     */
    exports.BoredActivity = {
        getJson: () => {
            return $rest().get("https://www.boredapi.com/api/activity")
        },
        get: () => {
            return $rest().get("https://www.boredapi.com/api/activity").activity
        }
    }

    /**
     * <odoc>
     * <key>apias.CocktailDB</key>
     * From: https://www.thecocktaildb.com/api/json/v1/1/search.php?s=margarita
     * Auth: none
     * 
     * Provide cocktail information
     * </odoc>
     */
    exports.CocktailDB = {
        get: aDrink => {
            _$(aDrink, "aDrink").isString().$_()

            return $rest({ uriQuery: true }).get("https://www.thecocktaildb.com/api/json/v1/1/search.php", { s: aDrink })
        }
    }

    /**
     * <odoc>
     * <key>apis.Currency2</key>
     * From: https://api.coinbase.com/v2/currencies
     *       https://api.coingecko.com/api/v3/exchange_rates
     * Auth: none
     * 
     * Retrives a list of currency values
     * </odoc>
     */
    exports.Currency2 = {
        get: () => {
            return $rest().get("https://api.coinbase.com/v2/currencies")
        },
        getCrypto: () => {
            return $rest().get("https://api.coingecko.com/api/v3/exchange_rates")
        }
    }

    /**
     * <odoc>
     * <key>apis.Bitcoin</key>
     * From: https://api.coindesk.com/v1/bpi/currentprice.json
     * Auth: none
     * 
     * Retrives the current bitcoin price
     * </odoc>
     */
    exports.Bitcoin = {
        get: () => {
            return $rest().get("https://api.coindesk.com/v1/bpi/currentprice.json")
        }
    }

    /**
     * <odoc>
     * <key>apis.iTunesSearch</key>
     * From: https://itunes.apple.com/search
     * Auth: none
     * 
     * Retrieves itunes search information
     * </odoc>
     */
    exports.iTunesSearch = {
        get: aTerm => {
            _$(aTerm).isString().$_()
            return $rest({ uriQuery: true }).get("https://itunes.apple.com/search", { term: aTerm })
        }
    }

    /**
     * <odoc>
     * <key>apis.Joke</key>
     * From: https://v2.jokeapi.dev/joke/Any
     * Auth: none
     * 
     * Retrieves jokes
     * </odoc>
     */
    exports.Joke = {
        getJson: () => {
            return $rest().get("https://v2.jokeapi.dev/joke/Any")
        },
        get: () => {
            return $rest().get("https://v2.jokeapi.dev/joke/Any").joke
        }
    }

    /**
     * <odoc>
     * <key>apis.PublicHolidays</key>
     * From: https://date.nager.at/api/v2/publicholidays
     * Auth: None
     * 
     * Retrives a list of public holidays
     * </odoc>
     */
    exports.PublicHolidays = {
        get: (aCountry, aYear) => {
            _$(aCountry, "aCountry").isString().$_()
            ow.loadFormat()
            aYear = _$(aYear, "aYear").isNumber().default(ow.format.fromDate(new Date(), "yyyy"))

            return $rest().get("https://date.nager.at/api/v2/publicholidays/" + aYear + "/" + aCountry.toUpperCase())
        }
    }

    /**
     * <odoc>
     * <key>apis.PublicAPIs</key>
     * From: https://api.publicapis.org/entries
     * Auth: None
     * 
     * Retrieves a list of public APIs
     * </odoc>
     */
    exports.PublicAPIs = {
        get: () => {
            return $rest().get("https://api.publicapis.org/entries")
        }
    }
})();