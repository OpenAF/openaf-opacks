var path = getOPackPath("QR") || String((new java.io.File("")).getAbsolutePath()).replace(/\\/g, "/");
loadExternalJars(path + "/lib");

/**
 * <odoc>
 * <key>QR.QR()</key>
 * Creates an instance of the QR object.
 * </odoc>
 */
var QR = function() {
};

// http://goqr.me/api/doc/create-qr-code
QR.prototype.write2URL = function(aText, aW, aH) {
   aW = _$(aW, "width").isNumber().default(350);
   aH = _$(aH, "height").isNumber().default(350);

   return "https://api.qrserver.com/v1/create-qr-code/?" + $rest().query({
      data  : aText,
      size  : aW + "x" + aH,
      ecc   : "Q",
      margin: 10
   });
};

/**
 * <odoc>
 * <key>QR.write2File(aText, aFilePath, aWidth, aHeight, aType)</key>
 * Given aText (less than 4KB of size) will produce a QR code with a custom aWidth (defaults to 350px) and a custom aHeight (defaults to 350px)
 * on the provided aFilePath. Optionally a different format other than PNG can be provided with aType.
 * </odoc>
 */
QR.prototype.write2File = function(aText, aFilePath, aW, aH, aType) {
   _$(aText, "text").isString().$_();
   _$(aFilePath ,"a file path").isString().$_();
   aType   = _$(aType, "type").isString().default("PNG");
   aW      = _$(aW, "width").isNumber().default(350);
   aH      = _$(aH, "height").isNumber().default(350);

   var qrCodeWriter = new com.google.zxing.qrcode.QRCodeWriter();
   var bitMatrix    = qrCodeWriter.encode(aText, com.google.zxing.BarcodeFormat.QR_CODE, aW, aH);
   com.google.zxing.client.j2se.MatrixToImageWriter.writeToPath(bitMatrix, aType, java.nio.file.FileSystems.getDefault().getPath(aFilePath));
};

/**
 * <odoc>
 * <key>QR.write2Stream(aText, aOutputStream, aWidth, aHeight, aType)</key>
 * Given aText (less than 4KB of size) will produce a QR code with a custom aWidth (defaults to 350px) and a custom aHeight (defaults to 350px)
 * using the provided aOutputStream. Optionally a different format other than PNG can be provided with aType.
 * </odoc>
 */
QR.prototype.write2Stream = function(aText, aStream, aW, aH, aType) {
   _$(aText, "text").isString().$_();
   
   aType   = _$(aType, "type").isString().default("PNG");
   aW      = _$(aW, "width").isNumber().default(350);
   aH      = _$(aH, "height").isNumber().default(350);

   var qrCodeWriter = new com.google.zxing.qrcode.QRCodeWriter();
   var bitMatrix    = qrCodeWriter.encode(aText, com.google.zxing.BarcodeFormat.QR_CODE, aW, aH);
   com.google.zxing.client.j2se.MatrixToImageWriter.writeToStream(bitMatrix, aType, aStream);
};

/**
 * <odoc>
 * <key>QR.read4File(aFilePath) : Object</key>
 * Tries to decode a QR code on a provided aFilePath returning a reader object.
 * </odoc>
 */
QR.prototype.read4File = function(aFilePath) {
   var bufferedImage = javax.imageio.ImageIO.read(new java.io.File(aFilePath));
   var source = new com.google.zxing.client.j2se.BufferedImageLuminanceSource(bufferedImage);
   var bitmap = new com.google.zxing.BinaryBitmap(new com.google.zxing.common.HybridBinarizer(source));
   return com.google.zxing.MultiFormatReader().decode(bitmap);
};

/**
 * <odoc>
 * <key>QR.read4Stream(aInputStream) : Object</key>
 * Tries to decode a QR code from the provided aInputStream returning a reader object.
 * </odoc>
 */
QR.prototype.read4Stream = function(aStream) {
   var bufferedImage = javax.imageio.ImageIO.read(aStream);
   var source = new com.google.zxing.client.j2se.BufferedImageLuminanceSource(bufferedImage);
   var bitmap = new com.google.zxing.BinaryBitmap(new com.google.zxing.common.HybridBinarizer(source));
   return com.google.zxing.MultiFormatReader().decode(bitmap);
};

/**
 * <odoc>
 * <key>QR.genWifiString(aSSID, aPassword, aType, isHidden) : String</key>
 * Produces the QR text for sharing a wifi network details. aType can be "WPA" or "WEP" or nothing.
 * The boolean isHidden defaults to false.
 * </odoc>
 */
QR.prototype.genWifiString = function(ssid, password, type, hidden) {
   _$(ssid, "ssid").isString().$_();
   password = _$(password, "password").isString().default(void 0);
   type = _$(type, "type").oneOf(["WEP", "WPA"]).isString().default(void 0);
   hidden = _$(hidden, "isHidden").isBoolean().default(false);

   var out = "WIFI:";
   out += "S:" + ssid + ";";
   if (isDef(type) && type.length > 0) {
      out += "T:" + type.toUpperCase() + ";";
   }
   if (isDef(password) && password.length > 0) {
      out += "P:" + password + ";";
   }
   if (hidden) {
      out += "H:true";
   }
   out += ";";
   return out;
};

/**
 * <odoc>
 * <key>QR.genSMSString(aNumber, aMessage) : String</key>
 * Produces the QR text for sending a SMS aMessage to aNumber.
 * </odoc>
 */
QR.prototype.genSMSString = function(aNumber, aMessage) {
   _$(aNumber, "aNumber").isString().$_();
   _$(aMessage, "aMessage").isString().$_();
   var out = "smsto:";

   out += aNumber + ":" + aMessage;
   return out;
};

/**
 * <odoc>
 * <key>QR.genTelString(aNumber) : String</key>
 * Produces the QR text for calling aNumber.
 * </odoc>
 */
QR.prototype.genTelString = function(aNumber) {
   _$(aNumber, "aNumber").isString().$_();

   var out = "tel:";
   out += aNumber;

   return out;
};

/**
 * <odoc>
 * <key>QR.genGeoString(aLat, aLon, aQuery) : String</key>
 * Produces the QR text for a geolocation query. You can provide aLat and aLong as the decimal coordinates of (0, 0) 
 * with aQuery. aQuery should be a map composed of:\
 * \
 *    q     (String) Optional query text\
 *    z     (Number) Optional zoom level (from 1 (zoom out) to 20 (zoom in))\
 *    t     (String) Optional map type (m - map, k - satelite, h - hybrid, p - terrain, e - google earth, 8 - 8-bit)\
 *    layer (String) Optional layer type (t - traffic, c - street view)\
 * \
 * </odoc>
 */
QR.prototype.genGeoString = function(aLat, aLon, aQuery) {
   aLat = _$(aLat, "lat").isNumber().default(0);
   aLon = _$(aLon, "long").isNumber().default(0);
   aQuery = _$(aQuery, "query").isMap().default({});
   var out = "geo:";

   out += aLat + "," + aLon + (isDef(aQuery) ? "?" + $rest().query(aQuery) : "");
};

/**
 * <odoc>
 * <key>QR.genEmailString(toAddress, aSubject, aCCList, aBody) : String</key>
 * Produces the QR text for sending an email. The toAddress and aCCList can be strings or arrays of addresses.
 * </odoc>
 */
QR.prototype.genEmailString = function(toAddress, aSubject, aCCList, aBody) {
   _$(toAddress, "toAddress").$_();
   _$(aSubject, "aSubject").$_();
   aCCList = _$(aCCList, "aCCList").default(void 0);
   _$(aBody, "aBody").$_();

   var out = "mailto:";

   var list2str = (aTxt) => {
      if (isArray(aTxt)) 
         return aTxt.join(",");
      else
         return aTxt;
   };

   out += list2str(toAddress) + "?" + $rest().query({
      subject: list2str(aSubject),
      cc: list2str(aCCList),
      body: list2str(aBody)
   });

   return out;
};

/**
 * <odoc>
 * <key>QR.genContactString(aType, aContactMap) : String</key>
 * Produces the QR text to share a contact. aType can be either "mecard" or "vcard".
 * aContactMap can contain the following keys: name, company, tel, url, email, address, address2, title (only on vcard) and memo.
 * </odoc>
 */
QR.prototype.genContactString = function(aType, aContactMap) {
   var out = "";
   var pV = (value) => {
      value = value.replace("([\\\\:;])", "\\\\$1");
      value = value.replace("\\n", "");
      return value;
   };

   switch(aType){
   case "mecard":   
      if (isMap(aContactMap)) {
         out = "MECARD:";
         var addr = "";
         if (isDef(aContactMap.name))    out += "N:" + pV(aContactMap.name.replace(",", "")) + ";";
         if (isDef(aContactMap.company)) out += "ORG:" + pV(aContactMap.company) + ";";
         if (isDef(aContactMap.tel))     out += "TEL:" + pV(aContactMap.tel.replace("[^0-9+]+", "")) + ";";
         if (isDef(aContactMap.url))     out += "URL:" + pV(aContactMap.url) + ";";
         if (isDef(aContactMap.email))   out += "EMAIL:" + pV(aContactMap.email) + ";";
         if (isDef(aContactMap.address))  addr += aContactMap.address;
         if (isDef(aContactMap.address2)) addr += " " + aContactMap.address2;
         out += "ADR:" + pV(addr) + ";";
         if (isDef(aContactMap.memo))    out += "NOTE:" + pV(aContactMap.memo) + ";";
      }
      break;
   case "vcard":
      if (isMap(aContactMap)) {
         out = "BEGIN:VCARD\nVERSION:3.0\n";

         var addr = "";
         if (isDef(aContactMap.name))    out += "N:" + pV(aContactMap.name.replace(",", "")) + "\n";
         if (isDef(aContactMap.company)) out += "ORG:" + pV(aContactMap.company) + "\n";
         if (isDef(aContactMap.title))   out += "TITLE:" + pV(aContactMap.title) + "\n";
         if (isDef(aContactMap.tel))     out += "TEL:" + pV(aContactMap.tel.replace("[^0-9+]+", "")) + "\n";
         if (isDef(aContactMap.url))     out += "URL:" + pV(aContactMap.url) + "\n";
         if (isDef(aContactMap.email))   out += "EMAIL:" + pV(aContactMap.email) + "\n";
         if (isDef(aContactMap.address))  addr += aContactMap.address;
         if (isDef(aContactMap.address2)) addr += " " + aContactMap.address2;
         out += "ADR:" + pV(addr) + "\n";
         if (isDef(aContactMap.memo))    out += "NOTE:" + pV(aContactMap.memo) + "\n";
         out += "END:VCARD";
      }
      break;
   }
   return out;
};

/**
 * <odoc>
 * <key>QR.genCalString(aName, aBeginDate, aEndDate, aLocation, aDescription) : String</key>
 * Produces the QR text to share a calendar event named aName between aBeginDate and aEndDate
 * at aLocation with aDescription. For all day events please provide a string aBeginDate and aEndDate with the 
 * format 'yyyymmdd' where aEndDate is one day after aBeginDate.
 * </odoc>
 */
QR.prototype.genCalString = function(aName, aBeginDate, aEndDate, aLocation, aDescription) {
   _$(aName, "aName").isString().$_();
   aBeginDate = _$(aBeginDate, "aBeginDate").default(new Date());
   aEndDate = _$(aEndDate, "aEndDate").default(new Date(nowUTC() + (1000 * 60 * 60)));
   aLocation = _$(aLocation, "aLocation").default("");
   aDescription = _$(aDescription, "aDescription").default("");

   var out = "BEGIN:VEVENT\r\n";

   ow.loadFormat();
   out += "SUMMARY:" + aName + "\r\n";
   if (isString(aBeginDate) && isString(aEndDate)) {
      out += "DTSTART;VALUE=DATE:" + aBeginDate + "\r\n" + "DTEND;VALUE=DATE:" + aEndDate + "\r\n";
   } else {
      if (isDate(aBeginDate)) aBeginDate = ow.format.fromDate(aBeginDate, "yyyyMMdd'T'hhmmss'Z'");
      if (isDate(aEndDate))   aEndDate   = ow.format.fromDate(aEndDate, "yyyyMMdd'T'hhmmss'Z'");
      out += "DTSTART:" + aBeginDate + "\r\nDTEND:" + aEndDate + "\r\n";
   }
   out += "LOCATION:" + aLocation + "\r\n";
   out += "DESCRIPTION:" + aDescription + "\r\n";
   out += "END:VEVENT\r\n";
   return out;
};

/**
 * <odoc>
 * <key>QR.genYTString(aVideoId) : String</key>
 * Produces the QR text to share a YouTube video
 * </odoc>
 */
QR.prototype.genYTString = function(aVideoId) {
   var out = "";
   out += "youtube://" + aVideoId;
   return out;
};

/**
 * <odoc>
 * <key>QR.genFTString(aId, onlyAudio) : String</key>
 * Produces the QR test to share a FaceTime call to aId optionally onlyAudio (true/false)
 * </odoc>
 */
QR.prototype.genFTString = function(aId, onlyAudio) {
   var out = "";
   out += "facetime" + (onlyAudio ? "-audio" : "") + ":" + aId;
   return out;
};

/**
 * <odoc>
 * <key>QR.genOTPAuth(aAccountName, aIssuerName, aSecret, aAlg, aDigits, aPeriod) : String</key>
 * Produces the QR test to share an OTP (One-Time-Password) for aAccountName, aIssuerName, aSecret, aAlg (e.g. SHA1), aDigits and aPeriod.
 * </odoc>
 */
QR.prototype.genOTPAuth = function(aAccountName, aIssuerName, aSecret, aAlg, aDigits, aPeriod) {
   var out = "";
   aDigits = _$(aDigits).isNumber().default(6);
   aPeriod = _$(aPeriod).isNumber().default(30);
   aAlg    = _$(aAlg).isString().default("SHA1");
   aIssuerName = _$(aIssuerName).isString().default("na");
   aAccountName = _$(aAccountName).isString().default("na");

   out += "otpauth://totp/" + aAccountName + ":" + aIssuerName + "?" + $rest.query({
      secret: aSecret,
      issuer: aIssuerName,
      algorithm: aAlg,
      digits: aDigits,
      period: aPeriod
   });

   return out;
}; 