ow.loadObj();

log("Get countries patterns...");
var o = ow.obj.rest.get("https://raw.githubusercontent.com/googlei18n/libphonenumber/master/resources/PhoneNumberMetadata.xml");
var x = new XMLList(o.response.substring(o.response.indexOf("<phoneNumberMetadata>")));

var l = [];
function prep(aS) {
    return aS.replace(/\(\?\:/mg, "(")
             .replace(/^\s+/mg, "")
             .replace(/\n/mg, "")
             .replace(/\\/mg, "\\");
}

for (var ii = 0; ii < x.territories.territory.@id.length(); ii++) {
    var cc = String(x.territories.territory.@id[ii]);
    if (cc.match(/[A-Z]{2}/)) {
        var s = {
            country: cc,
            countryCode: Number(x.territories.territory.(@id==cc).@countryCode.toString()),
            fixed: prep(x.territories.territory.(@id==cc).fixedLine.nationalNumberPattern.toString()),
            mobile: prep(x.territories.territory.(@id==cc).mobile.nationalNumberPattern.toString()),
            tollFree: prep(x.territories.territory.(@id==cc).tollFree.nationalNumberPattern.toString()),
            premium: prep(x.territories.territory.(@id==cc).premiumRate.nationalNumberPattern.toString()),
            personal: prep(x.territories.territory.(@id==cc).uan.nationalNumberPattern.toString()),
            sharedCost: prep(x.territories.territory.(@id==cc).sharedCost.nationalNumberPattern.toString()),
            voip: prep(x.territories.territory.(@id==cc).voip.nationalNumberPattern.toString()),
            voicemail: prep(x.territories.territory.(@id==cc).voicemail.nationalNumberPattern.toString())
        };
        l.push(s);
    }
};

log("Get operators patterns for countries...");
var countries = $path(l, "[].countryCode");
var operators = {};
for(var ii in countries) {
    try {
        var o = ow.obj.rest.get("https://raw.githubusercontent.com/googlei18n/libphonenumber/master/resources/carrier/en/" + countries[ii] + ".txt");
        var prefixes = $path(o.response.split(/\n/), "[?!starts_with(@, '#')] | [?length(@)>`0`]");
        for(var jj in prefixes) {
            var parts = prefixes[jj].split(/\|/);
            var operator = parts[1];
            var prefix = parts[0];
            if (isUnDef(operators[operator])) operators[operator] = { operator: operator, country: countries[ii], prefixes: [] };
            operators[operator].prefixes.push(Number(prefix));
        }
    } catch(e) {
        logWarn(e);
    }
}

io.writeFileYAML("list_phonePrefixes.yaml", ow.obj.fromObj2Array(operators));
io.writeFileYAML("list_phonePatterns.yaml", l);