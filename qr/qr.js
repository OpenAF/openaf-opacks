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
 * <key>QR.getBitMatrix(aText, aOptions) : Object</key>
 * Given aText will produce a ZXing BitMatrix for the QR code. aOptions can be a map with:
 *   - margin (Number) : Quiet zone margin in modules (default: 2).
 *   - ecc    (String) : Error correction level ('L', 'M', 'Q', 'H', default: 'L').
 * </odoc>
 */
QR.prototype.getBitMatrix = function(aText, aOptions) {
   _$(aText, "text").isString().$_();
   aOptions = _$(aOptions, "options").isMap().default({});

   var hints = new java.util.HashMap();
   if (isDef(aOptions.margin)) {
      hints.put(com.google.zxing.EncodeHintType.MARGIN, java.lang.Integer.valueOf(Number(aOptions.margin)));
   }
   if (isDef(aOptions.ecc)) {
      switch(String(aOptions.ecc).toUpperCase()) {
      case "L": hints.put(com.google.zxing.EncodeHintType.ERROR_CORRECTION, com.google.zxing.qrcode.decoder.ErrorCorrectionLevel.L); break;
      case "M": hints.put(com.google.zxing.EncodeHintType.ERROR_CORRECTION, com.google.zxing.qrcode.decoder.ErrorCorrectionLevel.M); break;
      case "Q": hints.put(com.google.zxing.EncodeHintType.ERROR_CORRECTION, com.google.zxing.qrcode.decoder.ErrorCorrectionLevel.Q); break;
      case "H": hints.put(com.google.zxing.EncodeHintType.ERROR_CORRECTION, com.google.zxing.qrcode.decoder.ErrorCorrectionLevel.H); break;
      }
   }

   var qrCodeWriter = new com.google.zxing.qrcode.QRCodeWriter();
   return qrCodeWriter.encode(aText, com.google.zxing.BarcodeFormat.QR_CODE, 0, 0, hints);
};

/**
 * <odoc>
 * <key>QR.getASCII(aText, aOptions, aInvert, aMargin, aAnsi, aECC) : String</key>
 * Given aText will produce an ASCII/Unicode string representation of a QR code suitable for terminal or text output.
 * aOptions can be a map (or aOptions can be a boolean for compact mode):
 *   - compact   (Boolean) : Uses Unicode half-block characters (▀, ▄, █, space) to fit 2 rows per line (default: true).
 *   - invert    (Boolean) : Inverts black and white modules (default: false).
 *   - ansi      (Boolean) : Uses ANSI escape color sequences (default: false).
 *   - margin    (Number)  : Quiet zone margin in modules (default: 4).
 *   - ecc       (String)  : Error correction level ('L', 'M', 'Q', 'H', default: 'M').
 *   - charBlack (String)  : Character(s) for black modules in non-compact mode (default: '  ').
 *   - charWhite (String)  : Character(s) for white modules in non-compact mode (default: '██').
 * </odoc>
 */
QR.prototype.getASCII = function(aText, aOptions, aInvert, aMargin, aAnsi, aECC) {
   _$(aText, "text").isString().$_();

   var options = {};
   if (isMap(aOptions)) {
      options = aOptions;
   } else {
      if (isDef(aOptions)) options.compact = aOptions;
      if (isDef(aInvert))  options.invert  = aInvert;
      if (isDef(aMargin))  options.margin  = aMargin;
      if (isDef(aAnsi))    options.ansi    = aAnsi;
      if (isDef(aECC))     options.ecc     = aECC;
   }

   var compact   = _$(options.compact, "compact").isBoolean().default(true);
   var invert    = _$(options.invert, "invert").isBoolean().default(false);
   var ansi      = _$(options.ansi, "ansi").isBoolean().default(false);
   var margin    = _$(options.margin, "margin").isNumber().default(4);
   var ecc       = _$(options.ecc, "ecc").isString().default("M");
   var charBlack = _$(options.charBlack, "charBlack").isString().default("  ");
   var charWhite = _$(options.charWhite, "charWhite").isString().default("██");

   var bitMatrix = this.getBitMatrix(aText, { margin: margin, ecc: ecc });
   var w = bitMatrix.getWidth();
   var h = bitMatrix.getHeight();

   var out = "";
   if (compact) {
      for (var y = 0; y < h - 1; y += 2) {
         for (var x = 0; x < w; x++) {
            var top = bitMatrix.get(x, y);
            var bottom = bitMatrix.get(x, y + 1);

            if (ansi) {
               if (invert) {
                  top = !top;
                  bottom = !bottom;
               }
               var fg = top ? "30" : "37";
               var bg = bottom ? "40" : "47";
               out += "\u001b[" + fg + ";" + bg + "m▀";
            } else {
               if (top === bottom) {
                  if (top !== invert) {
                     out += " ";
                  } else {
                     out += "█";
                  }
               } else {
                  if (top !== invert) {
                     out += "▄";
                  } else {
                     out += "▀";
                  }
               }
            }
         }
         if (ansi) out += "\u001b[0m";
         out += "\n";
      }

      if (h % 2 === 1) {
         var y = h - 1;
         for (var x = 0; x < w; x++) {
            var top = bitMatrix.get(x, y);
            if (ansi) {
               if (invert) top = !top;
               var fg = top ? "30" : "37";
               out += "\u001b[" + fg + ";49m▀";
            } else {
               if (top !== invert) {
                  out += " ";
               } else {
                  out += "▀";
               }
            }
         }
         if (ansi) out += "\u001b[0m";
         out += "\n";
      }
   } else {
      for (var y = 0; y < h; y++) {
         for (var x = 0; x < w; x++) {
            var val = bitMatrix.get(x, y);
            if (ansi) {
               if (invert) val = !val;
               out += val ? "\u001b[40m  " : "\u001b[47m  ";
            } else {
               if (val !== invert) {
                  out += charBlack;
               } else {
                  out += charWhite;
               }
            }
         }
         if (ansi) out += "\u001b[0m";
         out += "\n";
      }
   }

   return out;
};

/**
 * <odoc>
 * <key>QR.write2ASCII(aText, aOptions, aInvert, aMargin, aAnsi, aECC) : String</key>
 * Alias of QR.getASCII.
 * </odoc>
 */
QR.prototype.write2ASCII = QR.prototype.getASCII;

/**
 * <odoc>
 * <key>QR.printASCII(aText, aOptions, aInvert, aMargin, aAnsi, aECC)</key>
 * Prints the ASCII/Unicode representation of a QR code to the console/stdout. See QR.getASCII for options.
 * </odoc>
 */
QR.prototype.printASCII = function(aText, aOptions, aInvert, aMargin, aAnsi, aECC) {
   print(this.getASCII(aText, aOptions, aInvert, aMargin, aAnsi, aECC));
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
 * Produces the QR text for sharing a Wi-Fi network configuration.
 * aType can be "WPA", "WPA2", "WPA3", "WEP", "nopass", or undefined (defaults to "WPA" if password provided, "nopass" otherwise).
 * The boolean isHidden defaults to false.
 * </odoc>
 */
QR.prototype.genWifiString = function(ssid, password, type, hidden) {
   _$(ssid, "ssid").isString().$_();
   password = _$(password, "password").isString().default(void 0);
   type = _$(type, "type").isString().default(void 0);
   hidden = _$(hidden, "isHidden").isBoolean().default(false);

   var out = "WIFI:";
   out += "S:" + ssid + ";";
   if (isDef(type) && type.length > 0) {
      out += "T:" + type.toUpperCase() + ";";
   } else if (isDef(password) && password.length > 0) {
      out += "T:WPA;";
   } else {
      out += "T:nopass;";
   }
   if (isDef(password) && password.length > 0) {
      out += "P:" + password + ";";
   }
   if (hidden) {
      out += "H:true;";
   }
   out += ";";
   return out;
};

/**
 * <odoc>
 * <key>QR.genSMSString(aNumber, aMessage) : String</key>
 * Produces the QR text for sending an SMS to aNumber with optional aMessage.
 * </odoc>
 */
QR.prototype.genSMSString = function(aNumber, aMessage) {
   _$(aNumber, "aNumber").isString().$_();
   aMessage = _$(aMessage, "aMessage").isString().default("");
   var out = "smsto:";

   out += aNumber + (aMessage.length > 0 ? ":" + aMessage : "");
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

   return "tel:" + aNumber;
};

/**
 * <odoc>
 * <key>QR.genGeoString(aLat, aLon, aQuery) : String</key>
 * Produces the QR text for a geolocation coordinate. You can provide aLat and aLon as decimal coordinates.
 * aQuery can be a string query (e.g. "Lisbon") or an object composed of:
 *    q     (String) Optional query text
 *    z     (Number) Optional zoom level (from 1 (zoom out) to 20 (zoom in))
 *    t     (String) Optional map type (m - map, k - satellite, h - hybrid, p - terrain, e - google earth, 8 - 8-bit)
 *    layer (String) Optional layer type (t - traffic, c - street view)
 * </odoc>
 */
QR.prototype.genGeoString = function(aLat, aLon, aQuery) {
   aLat = _$(aLat, "lat").isNumber().default(0);
   aLon = _$(aLon, "long").isNumber().default(0);
   var out = "geo:" + aLat + "," + aLon;

   if (isMap(aQuery) && Object.keys(aQuery).length > 0) {
      out += "?" + $rest().query(aQuery);
   } else if (isString(aQuery) && aQuery.length > 0) {
      out += "?q=" + encodeURIComponent(aQuery);
   }
   return out;
};

/**
 * <odoc>
 * <key>QR.genEmailString(toAddress, aSubject, aCCList, aBody) : String</key>
 * Produces the QR text for composing an email. toAddress and aCCList can be strings or arrays of addresses.
 * </odoc>
 */
QR.prototype.genEmailString = function(toAddress, aSubject, aCCList, aBody) {
   _$(toAddress, "toAddress").$_();
   aSubject = _$(aSubject, "aSubject").isString().default("");
   aCCList  = _$(aCCList, "aCCList").default(void 0);
   aBody    = _$(aBody, "aBody").isString().default("");

   var list2str = (aTxt) => {
      if (isArray(aTxt)) 
         return aTxt.join(",");
      else if (isDef(aTxt))
         return String(aTxt);
      else
         return void 0;
   };

   var q = {};
   if (isDef(aSubject) && aSubject.length > 0) q.subject = aSubject;
   if (isDef(aCCList) && (isArray(aCCList) ? aCCList.length > 0 : String(aCCList).length > 0)) q.cc = list2str(aCCList);
   if (isDef(aBody) && aBody.length > 0) q.body = aBody;

   var qs = Object.keys(q).length > 0 ? "?" + $rest().query(q) : "";
   return "mailto:" + list2str(toAddress) + qs;
};

/**
 * <odoc>
 * <key>QR.genContactString(aType, aContactMap) : String</key>
 * Produces the QR text to share a contact card. aType can be either "mecard" or "vcard" (defaults to "vcard").
 * aContactMap can contain: name, fn (formatted name), company (or org), title, tel (or phone), url, email, address, address2, memo (or note).
 * </odoc>
 */
QR.prototype.genContactString = function(aType, aContactMap) {
   aType = _$(aType, "aType").isString().default("vcard").toLowerCase();
   _$(aContactMap, "aContactMap").isMap().$_();

   var out = "";
   var pV = (value) => {
      if (isUnDef(value)) return "";
      value = String(value).replace(/([\\:;])/g, "\\$1");
      value = value.replace(/\r?\n/g, " ");
      return value;
   };

   switch(aType){
   case "mecard":   
      out = "MECARD:";
      var addr = "";
      if (isDef(aContactMap.name))    out += "N:" + pV(aContactMap.name.replace(/,/g, "")) + ";";
      if (isDef(aContactMap.company)) out += "ORG:" + pV(aContactMap.company) + ";";
      else if (isDef(aContactMap.org)) out += "ORG:" + pV(aContactMap.org) + ";";
      if (isDef(aContactMap.tel))     out += "TEL:" + pV(aContactMap.tel) + ";";
      else if (isDef(aContactMap.phone)) out += "TEL:" + pV(aContactMap.phone) + ";";
      if (isDef(aContactMap.url))     out += "URL:" + pV(aContactMap.url) + ";";
      if (isDef(aContactMap.email))   out += "EMAIL:" + pV(aContactMap.email) + ";";
      if (isDef(aContactMap.address))  addr += aContactMap.address;
      if (isDef(aContactMap.address2)) addr += (addr.length > 0 ? " " : "") + aContactMap.address2;
      if (addr.length > 0)             out += "ADR:" + pV(addr) + ";";
      if (isDef(aContactMap.memo))    out += "NOTE:" + pV(aContactMap.memo) + ";";
      else if (isDef(aContactMap.note)) out += "NOTE:" + pV(aContactMap.note) + ";";
      out += ";";
      break;
   case "vcard":
   default:
      out = "BEGIN:VCARD\nVERSION:3.0\n";
      if (isDef(aContactMap.name))    out += "N:" + pV(aContactMap.name) + "\n";
      if (isDef(aContactMap.fn))      out += "FN:" + pV(aContactMap.fn) + "\n";
      else if (isDef(aContactMap.name)) out += "FN:" + pV(aContactMap.name.replace(/;/g, " ")) + "\n";
      if (isDef(aContactMap.company)) out += "ORG:" + pV(aContactMap.company) + "\n";
      else if (isDef(aContactMap.org)) out += "ORG:" + pV(aContactMap.org) + "\n";
      if (isDef(aContactMap.title))   out += "TITLE:" + pV(aContactMap.title) + "\n";
      if (isDef(aContactMap.tel))     out += "TEL:" + pV(aContactMap.tel) + "\n";
      else if (isDef(aContactMap.phone)) out += "TEL:" + pV(aContactMap.phone) + "\n";
      if (isDef(aContactMap.url))     out += "URL:" + pV(aContactMap.url) + "\n";
      if (isDef(aContactMap.email))   out += "EMAIL:" + pV(aContactMap.email) + "\n";
      var vAddr = "";
      if (isDef(aContactMap.address))  vAddr += aContactMap.address;
      if (isDef(aContactMap.address2)) vAddr += (vAddr.length > 0 ? " " : "") + aContactMap.address2;
      if (vAddr.length > 0)            out += "ADR:;;" + pV(vAddr) + ";;;;\n";
      if (isDef(aContactMap.memo))    out += "NOTE:" + pV(aContactMap.memo) + "\n";
      else if (isDef(aContactMap.note)) out += "NOTE:" + pV(aContactMap.note) + "\n";
      out += "END:VCARD";
      break;
   }
   return out;
};

/**
 * <odoc>
 * <key>QR.genCalString(aName, aBeginDate, aEndDate, aLocation, aDescription) : String</key>
 * Produces the QR text to share a calendar event (iCalendar / vEvent) named aName between aBeginDate and aEndDate
 * at aLocation with aDescription. For all day events provide string dates in 'yyyyMMdd' format.
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
   if (isString(aBeginDate) && isString(aEndDate) && aBeginDate.length === 8 && aEndDate.length === 8) {
      out += "DTSTART;VALUE=DATE:" + aBeginDate + "\r\n" + "DTEND;VALUE=DATE:" + aEndDate + "\r\n";
   } else {
      var startStr = isDate(aBeginDate) ? ow.format.fromDate(aBeginDate, "yyyyMMdd'T'HHmmss'Z'", "UTC") : String(aBeginDate);
      var endStr   = isDate(aEndDate)   ? ow.format.fromDate(aEndDate, "yyyyMMdd'T'HHmmss'Z'", "UTC") : String(aEndDate);
      out += "DTSTART:" + startStr + "\r\nDTEND:" + endStr + "\r\n";
   }
   if (aLocation.length > 0)    out += "LOCATION:" + aLocation + "\r\n";
   if (aDescription.length > 0) out += "DESCRIPTION:" + aDescription + "\r\n";
   out += "END:VEVENT\r\n";
   return out;
};

/**
 * <odoc>
 * <key>QR.genURLString(aURL) : String</key>
 * Produces the QR text for opening a URL in a browser. Prepends https:// if no scheme is specified.
 * </odoc>
 */
QR.prototype.genURLString = function(aURL) {
   _$(aURL, "aURL").isString().$_();
   if (!aURL.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//)) {
      aURL = "https://" + aURL;
   }
   return aURL;
};

/**
 * <odoc>
 * <key>QR.genBookmarkString(aTitle, aURL) : String</key>
 * Produces the QR text for saving a browser bookmark using the MEBKM format.
 * </odoc>
 */
QR.prototype.genBookmarkString = function(aTitle, aURL) {
   _$(aTitle, "aTitle").isString().$_();
   _$(aURL, "aURL").isString().$_();
   return "MEBKM:TITLE:" + aTitle.replace(/;/g, "") + ";URL:" + aURL + ";;";
};

/**
 * <odoc>
 * <key>QR.genYTString(aVideoId) : String</key>
 * Produces the QR text to share a YouTube video.
 * </odoc>
 */
QR.prototype.genYTString = function(aVideoId) {
   _$(aVideoId, "videoId").isString().$_();
   if (aVideoId.startsWith("http://") || aVideoId.startsWith("https://") || aVideoId.startsWith("youtube://")) {
      return aVideoId;
   }
   return "https://www.youtube.com/watch?v=" + aVideoId;
};

/**
 * <odoc>
 * <key>QR.genFTString(aId, onlyAudio) : String</key>
 * Produces the QR text to start a FaceTime video or audio call to aId.
 * </odoc>
 */
QR.prototype.genFTString = function(aId, onlyAudio) {
   _$(aId, "aId").isString().$_();
   onlyAudio = _$(onlyAudio, "onlyAudio").isBoolean().default(false);
   return "facetime" + (onlyAudio ? "-audio" : "") + ":" + aId;
};

/**
 * <odoc>
 * <key>QR.genWhatsAppString(aPhone, aMessage) : String</key>
 * Produces the QR text (wa.me link) to start a WhatsApp chat with aPhone and optional prefilled aMessage.
 * </odoc>
 */
QR.prototype.genWhatsAppString = function(aPhone, aMessage) {
   aPhone   = _$(aPhone, "aPhone").isString().default("");
   aMessage = _$(aMessage, "aMessage").isString().default("");

   var cleanPhone = aPhone.replace(/[^0-9]/g, "");
   var url = "https://wa.me/" + cleanPhone;
   if (aMessage.length > 0) {
      url += "?text=" + encodeURIComponent(aMessage);
   }
   return url;
};

QR.prototype.genWAString = QR.prototype.genWhatsAppString;

/**
 * <odoc>
 * <key>QR.genTelegramString(aUsername, aMessage) : String</key>
 * Produces the QR text (t.me link) to open a Telegram user/channel or share a message.
 * </odoc>
 */
QR.prototype.genTelegramString = function(aUsername, aMessage) {
   aUsername = _$(aUsername, "aUsername").isString().default("");
   aMessage  = _$(aMessage, "aMessage").isString().default("");

   var cleanUser = aUsername.replace(/^@/, "");
   if (cleanUser.length > 0 && aMessage.length === 0) {
      return "https://t.me/" + cleanUser;
   } else if (cleanUser.length > 0 && aMessage.length > 0) {
      return "https://t.me/" + cleanUser + "?text=" + encodeURIComponent(aMessage);
   } else if (aMessage.length > 0) {
      return "https://t.me/share/url?text=" + encodeURIComponent(aMessage);
   }
   return "https://t.me/";
};

/**
 * <odoc>
 * <key>QR.genOTPAuth(aAccountName, aIssuerName, aSecret, aAlg, aDigits, aPeriod, aType) : String</key>
 * Produces the QR text (Key URI Format) to configure an OTP authenticator app (e.g. Google Authenticator, Authy, 1Password).
 * aType can be "totp" (default) or "hotp".
 * </odoc>
 */
QR.prototype.genOTPAuth = function(aAccountName, aIssuerName, aSecret, aAlg, aDigits, aPeriod, aType) {
   aDigits      = _$(aDigits, "digits").isNumber().default(6);
   aPeriod      = _$(aPeriod, "period").isNumber().default(30);
   aAlg         = _$(aAlg, "algorithm").isString().default("SHA1");
   aIssuerName  = _$(aIssuerName, "issuerName").isString().default("na");
   aAccountName = _$(aAccountName, "accountName").isString().default("na");
   aType        = _$(aType, "type").isString().default("totp");

   var q = {
      secret   : aSecret,
      issuer   : aIssuerName,
      algorithm: aAlg,
      digits   : aDigits
   };
   if (aType.toLowerCase() === "totp") {
      q.period = aPeriod;
   }

   return "otpauth://" + aType.toLowerCase() + "/" + encodeURIComponent(aIssuerName) + ":" + encodeURIComponent(aAccountName) + "?" + $rest().query(q);
};

/**
 * <odoc>
 * <key>QR.genCryptoString(aCoin, aAddress, aAmount, aLabel, aMessage) : String</key>
 * Produces the QR text for cryptocurrency payment URIs (bitcoin, ethereum, litecoin, monero, or custom coins).
 * </odoc>
 */
QR.prototype.genCryptoString = function(aCoin, aAddress, aAmount, aLabel, aMessage) {
   _$(aCoin, "aCoin").isString().$_();
   _$(aAddress, "aAddress").isString().$_();
   aCoin = aCoin.toLowerCase();

   var q = {};
   switch(aCoin) {
   case "bitcoin":
   case "btc":
      if (isDef(aAmount) && Number(aAmount) > 0) q.amount = Number(aAmount);
      if (isDef(aLabel) && aLabel.length > 0) q.label = aLabel;
      if (isDef(aMessage) && aMessage.length > 0) q.message = aMessage;
      return "bitcoin:" + aAddress + (Object.keys(q).length > 0 ? "?" + $rest().query(q) : "");
   case "ethereum":
   case "eth":
      if (isDef(aAmount) && Number(aAmount) > 0) q.value = String(aAmount);
      return "ethereum:" + aAddress + (Object.keys(q).length > 0 ? "?" + $rest().query(q) : "");
   case "litecoin":
   case "ltc":
      if (isDef(aAmount) && Number(aAmount) > 0) q.amount = Number(aAmount);
      if (isDef(aLabel) && aLabel.length > 0) q.label = aLabel;
      return "litecoin:" + aAddress + (Object.keys(q).length > 0 ? "?" + $rest().query(q) : "");
   case "monero":
   case "xmr":
      if (isDef(aAmount) && Number(aAmount) > 0) q.tx_amount = Number(aAmount);
      if (isDef(aLabel) && aLabel.length > 0) q.recipient_name = aLabel;
      if (isDef(aMessage) && aMessage.length > 0) q.tx_description = aMessage;
      return "monero:" + aAddress + (Object.keys(q).length > 0 ? "?" + $rest().query(q) : "");
   default:
      if (isDef(aAmount) && Number(aAmount) > 0) q.amount = Number(aAmount);
      if (isDef(aLabel) && aLabel.length > 0) q.label = aLabel;
      if (isDef(aMessage) && aMessage.length > 0) q.message = aMessage;
      return aCoin + ":" + aAddress + (Object.keys(q).length > 0 ? "?" + $rest().query(q) : "");
   }
};

/**
 * <odoc>
 * <key>QR.genBitcoinString(aAddress, aAmount, aLabel, aMessage) : String</key>
 * Produces the QR text for a Bitcoin payment URI (BIP 21).
 * </odoc>
 */
QR.prototype.genBitcoinString = function(aAddress, aAmount, aLabel, aMessage) {
   return this.genCryptoString("bitcoin", aAddress, aAmount, aLabel, aMessage);
};

/**
 * <odoc>
 * <key>QR.genEthereumString(aAddress, aAmount) : String</key>
 * Produces the QR text for an Ethereum payment URI (EIP 681).
 * </odoc>
 */
QR.prototype.genEthereumString = function(aAddress, aAmount) {
   return this.genCryptoString("ethereum", aAddress, aAmount);
};

/**
 * <odoc>
 * <key>QR.genEPCString(aIBAN, aName, aAmount, aBIC, aRemittance, aRemittanceRef, aPurpose) : String</key>
 * Produces the European Payments Council SEPA QR code standard (EPC069-12 / GiroCode) for bank transfers in Europe.
 * </odoc>
 */
QR.prototype.genEPCString = function(aIBAN, aName, aAmount, aBIC, aRemittance, aRemittanceRef, aPurpose) {
   _$(aIBAN, "aIBAN").isString().$_();
   _$(aName, "aName").isString().$_();
   
   var cleanIBAN = aIBAN.replace(/\s+/g, "").toUpperCase();
   var cleanBIC  = isDef(aBIC) ? aBIC.replace(/\s+/g, "").toUpperCase() : "";
   var amt       = isDef(aAmount) && Number(aAmount) > 0 ? "EUR" + Number(aAmount).toFixed(2) : "";
   var purpose   = isDef(aPurpose) ? aPurpose : "";
   var ref       = isDef(aRemittanceRef) ? aRemittanceRef : "";
   var rem       = isDef(aRemittance) ? aRemittance : "";

   var lines = [
      "BCD",
      "002",
      "1",
      "SCT",
      cleanBIC,
      aName.substring(0, 70),
      cleanIBAN,
      amt,
      purpose.substring(0, 4),
      ref,
      rem.substring(0, 140)
   ];

   return lines.join("\n");
};

QR.prototype.genSEPAString = QR.prototype.genEPCString;
QR.prototype.genGiroCodeString = QR.prototype.genEPCString;

/**
 * <odoc>
 * <key>QR.genUPIString(aVPA, aName, aAmount, aNote, aCurrency, aMerchantCode, aTransactionRef) : String</key>
 * Produces the Unified Payments Interface (UPI) payment QR text.
 * </odoc>
 */
QR.prototype.genUPIString = function(aVPA, aName, aAmount, aNote, aCurrency, aMerchantCode, aTransactionRef) {
   _$(aVPA, "aVPA").isString().$_();
   aName     = _$(aName, "aName").isString().default("");
   aCurrency = _$(aCurrency, "aCurrency").isString().default("INR");

   var q = {
      pa: aVPA,
      cu: aCurrency
   };
   if (aName.length > 0) q.pn = aName;
   if (isDef(aAmount) && Number(aAmount) > 0) q.am = Number(aAmount).toFixed(2);
   if (isDef(aNote) && aNote.length > 0) q.tn = aNote;
   if (isDef(aMerchantCode) && aMerchantCode.length > 0) q.mc = aMerchantCode;
   if (isDef(aTransactionRef) && aTransactionRef.length > 0) q.tr = aTransactionRef;

   return "upi://pay?" + $rest().query(q);
};

/**
 * <odoc>
 * <key>QR.genSkypeString(aUsername, aAction) : String</key>
 * Produces the QR text for a Skype action ("call" or "chat").
 * </odoc>
 */
QR.prototype.genSkypeString = function(aUsername, aAction) {
   _$(aUsername, "aUsername").isString().$_();
   aAction = _$(aAction, "aAction").isString().default("call");
   return "skype:" + aUsername + "?" + aAction.toLowerCase();
}; 