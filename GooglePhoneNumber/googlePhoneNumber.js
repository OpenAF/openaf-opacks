var GooglePhoneNumber = function(aLibPath) {
	if (isUnDef(aLibPath)) aLibPath = (isDef(getOPackPaths()["GooglePhoneNumber"]) ? getOPackPaths()["GooglePhoneNumber"]+"/lib" : "/lib");
	this.LIB_PATH = (new java.io.File(aLibPath)).getAbsolutePath();

        if (Object.keys(Packages.com.google.i18n.phonenumbers.PhoneNumberUtil).length <= 2) {
                delete Packages.com.google.i18n.phonenumbers.PhoneNumberUtil;
		$from(io.listFilenames(this.LIB_PATH)).ends(".jar").select(function(r) {
			af.externalAddClasspath("file:///" + r.replace(/\\/g, "/"));
		});
	} 

	this.pn = Packages.com.google.i18n.phonenumbers.PhoneNumberUtil.getInstance();
	this.p = new Packages.com.google.i18n.phonenumbers.Phonenumber.PhoneNumber();
	this.geo = Packages.com.google.i18n.phonenumbers.geocoding.PhoneNumberOfflineGeocoder.getInstance();
	this.ca = Packages.com.google.i18n.phonenumbers.PhoneNumberToCarrierMapper.getInstance();
        this.tz = Packages.com.google.i18n.phonenumbers.PhoneNumberToTimeZonesMapper.getInstance();
} 

GooglePhoneNumber.prototype.getInfo = function(aNumber, aLocation) {
	if (isUndefined(aLocation)) aLocation = "US";

	var num = this.pn.parseAndKeepRawInput(aNumber, aLocation.toUpperCase()); 

	var data = {
		"countryCode": num.getCountryCode(),
		"regionCode": String(this.pn.getRegionCodeForNumber(num)),
		"numberType": String(this.pn.getNumberType(num)),
		"nationalNumber": num.getNationalNumber(),
		"normalized": Number(this.pn.normalizeDigitsOnly(aNumber)),
		"e164": String(this.pn.format(num,  Packages.com.google.i18n.phonenumbers.PhoneNumberUtil.PhoneNumberFormat.E164)),
		"nationalFormatted": String(this.pn.format(num,  Packages.com.google.i18n.phonenumbers.PhoneNumberUtil.PhoneNumberFormat.NATIONAL)),
		"internationalFormatted": String(this.pn.format(num,  Packages.com.google.i18n.phonenumbers.PhoneNumberUtil.PhoneNumberFormat.INTERNATIONAL)),
		"extension": String(num.getExtension()),
		"isValidNumber": this.pn.isValidNumber(num),
		"isPossibleNumber": this.pn.isPossibleNumber(num),
		"isNANPA": this.pn.isNANPACountry(this.pn.getRegionCodeForNumber(num)),
		"nationalDestCode": (this.pn.getLengthOfNationalDestinationCode(num) > 0) ? Number(String(num.getNationalNumber()).substring(0, this.pn.getLengthOfNationalDestinationCode(num))) : "",
		"geocode": String(this.geo.getDescriptionForNumber(num, java.util.Locale.ENGLISH)),
		"carrierIfNotPorted": String(this.ca.getNameForNumber(num, java.util.Locale.ENGLISH)),
                "timeZone": this.getTimeZone(num) 
	};

	return data;
}

GooglePhoneNumber.prototype.__getNum = function(num, aLocation) {
 	var t;
        if (isString(num)) {
           t = this.pn.parseAndKeepRawInput(num, aLocation.toUpperCase());
        } else {
           t = num;
        }
	return t
}

GooglePhoneNumber.prototype.isNANPA = function(num, aLocation) {
	return this.pn.isNANPACountry(this.pn.getRegionCodeForNumber(this.__getNum(num, aLocation)));
}

GooglePhoneNumber.prototype.getE164 = function(num, aLocation) {
	return String(this.pn.format(this.__getNum(num, aLocation), Packages.com.google.i18n.phonenumbers.PhoneNumberUtil.PhoneNumberFormat.E164));
}

GooglePhoneNumber.prototype.isPossibleNumber = function(num, aLocation) {
	return this.pn.isPossibleNumber(this.__getNum(num, aLocation));
}

GooglePhoneNumber.prototype.isValidNumber = function(num, aLocation) {
	return this.pn.isValidNumber(this.__getNum(num, aLocation));
}

GooglePhoneNumber.prototype.getRegionCode = function(num, aLocation) {
	return String(this.pn.getRegionCodeForNumber(this.__getNum(num, aLocation))); 
}

GooglePhoneNumber.prototype.getNumberType = function(num, aLocation) {
	return String(this.pn.getNumberType(this.__getNum(num, aLocation)));
}

GooglePhoneNumber.prototype.getTimeZone = function(num, aLocation) {
        var res = [];
	var t = this.tz.getTimeZonesForNumber(this.__getNum(num, aLocation));

        if (isUnDef(t)) return res;

 	for(var i = 0; i < t.toArray().length; i++) {
 		res.push(String(t.toArray()[i]));
        }

	return res;
}

function GooglePhoneNumberUpdateJars(aLibPath) {
	if (isUnDef(aLibPath)) aLibPath = (isDef(getOPackPaths()["GooglePhoneNumber"]) ? getOPackPaths()["GooglePhoneNumber"]+"/lib" : "/lib");
	this.LIB_PATH = (new java.io.File(aLibPath)).getAbsolutePath();

	plugin("HTTP");

	function _getLastVersion(anURL) {
		return new XMLList(new HTTP(anURL).response().replace(/<\?.+\?>/, "")).versioning.latest.text()
	}

	var urls = [
		{   name: "geocoder",
			url: "http://repo1.maven.org/maven2/com/googlecode/libphonenumber/geocoder" },
		{   name: "carrier",
		    url: "http://repo1.maven.org/maven2/com/googlecode/libphonenumber/carrier" },
		{   name: "libphonenumber",
	        url:  "http://repo1.maven.org/maven2/com/googlecode/libphonenumber/libphonenumber" },
	    {   name: "prefixmapper",
	        url: "http://repo1.maven.org/maven2/com/googlecode/libphonenumber/prefixmapper" }
	];

	var current = ($from(io.listFilenames(this.LIB_PATH)).ends(".jar").select(function(r) {
		var e = r.replace(/.+[\\|\/]([a-zA-Z]+)-([\d|\.]+)\.jar/, "$1 $2").split(/ +/);
		return {
			"name": e[0],
			"version": e[1]
		}
	}));

	var latest = $from(urls).select(function(r) {
		return { 
			"name": r.name,
	 		"version": String(_getLastVersion(r.url + "/maven-metadata.xml"))
	 	};
	});

	var parent = this;
	$from(latest).select(function(r) {
		$from(current).equals("name", r.name).notEquals("version", r.version).select(function(rr) {
			log("Lib '" + rr.name + "' current version = '" + rr.version + "', latest version = '" + r.version + "'.");
			var url = $from(urls).equals("name", rr.name).first().url + "/" + r.version + "/" + rr.name + "-" + r.version + ".jar";
			var source = r.name + "-" + rr.version + ".jar";
			var target = rr.name + "-" + r.version + ".jar";
			log("Downloading " + url);
			io.writeFileBytes(parent.LIB_PATH + "/" + target, new HTTP(url, "GET", "", {}, true).responseBytes());
			af.mv(parent.LIB_PATH + "/" + source, parent.LIB_PATH + "/" + source + ".old");
		});
	});
}
