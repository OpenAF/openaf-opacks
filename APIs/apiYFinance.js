// Author: Nuno Aguiar
(function() {
    var url = "https://query1.finance.yahoo.com";
    var surl = "https://finance.yahoo.com/quote";
    ow.loadObj();

    /**
     * <odoc>
     * <key>apiYFinance.getTicketData(aTicketSymbol, returnRaw) : Map</key>
     * Retrieves a map of basic info for aTicketSymbol transforming some data. Optionally if returnRaw = true no
     * transformation is performed.
     * </odoc>
     */
    exports.getTicketData = function(aTicker, returnRaw) {
        var res = $rest().get(url + "/v8/finance/chart/" + aTicker);
        if (isDef(res) && isDef(res.chart) && isDef(res.chart.result) && isArray(res.chart.result)) {
            var m = res.chart.result[0];
            if (returnRaw) return m;

            if (isDef(m.timestamp)) {
                var timestamps = m.timestamp;
                if (isDef(m.indicators)) {
                    var keys = m.indicators.quote[0];
                    m.indicators.quotes = {};
                    for(var key in keys) {
                        var c = 0;
                        m.indicators.quotes[key] = m.indicators.quote[0][key].map(entry => {
                            return {
                                date : new Date(timestamps[c++] * 1000),
                                value: entry
                            };
                        });
                    }
                }
                delete m.timestamp;
                delete m.indicators.quote;
            }
            return m;
        } else {
            return void 0;
        }
    };

    /**
     * <odoc>
     * <key>apiYFinance.getTicketFundamentals(aTicketSymbol, returnRaw) : Map</key>
     * Retrieves a map of fundamental info for aTicketSymbol transforming some data. Optionally if returnRaw = true no
     * transformation is performed.
     * </odoc>
     */
    exports.getTicketFundamentals = function(aTicker, returnRaw) {
        var res = $rest().get(surl + "/" + aTicker);
        if (res.indexOf("QuoteSummaryStore") > 0) {
            var data = jsonParse( res.split('root.App.main =')[1].split('(this)')[0].split(';\n}')[0] );
            data = data.context.dispatcher.stores.QuoteSummaryStore;
            if (returnRaw) return data;

            return data;
        }
        return void 0;
    };
})();
/*
var apiYFinance = function apiYFinance() {
    this.url = "https://query1.finance.yahoo.com";
};

apiYFinance.prototype.getTicketData = function(aTicker) {
    return $rest().get(this.url + "/v8/finance/chart/" + aTicker);
};*/
