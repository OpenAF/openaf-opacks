(function() {
    load("qr.js");
    ow.loadTest();

    exports.testStream = function() {
        var msg = "hello world";
        var os = af.newOutputStream();

        var bc = new QR();
        bc.write2Stream(msg, os);
        var res = bc.read4Stream(af.fromBytes2InputStream(os.toByteArray()));
        
        ow.test.assert(String(res), msg, "Problem with write2Stream and read4Stream");
    };

    exports.testFile = function() {
        var msg = "hello world";
        var aFile = "text.png";
    
        var bc = new QR();
        bc.write2File(msg, aFile);
        var res = bc.read4File(aFile);
        
        ow.test.assert(String(res), msg, "Problem with write2File and read4File");
        io.rm(aFile);
    };

    exports.testBitMatrix = function() {
        var msg = "hello world";
        var bc = new QR();
        var matrix = bc.getBitMatrix(msg, { margin: 2, ecc: "M" });
        ow.test.assert(isDef(matrix) && matrix.getWidth() > 0 && matrix.getHeight() > 0, true, "Problem with getBitMatrix");
    };

    exports.testASCII = function() {
        var msg = "hello world";
        var bc = new QR();

        // Default compact mode
        var resCompact = bc.getASCII(msg);
        ow.test.assert(isString(resCompact) && resCompact.length > 0, true, "Problem with getASCII compact default");
        ow.test.assert(resCompact.indexOf("█") >= 0, true, "Problem with getASCII compact characters");

        // Non-compact mode with custom characters
        var resNonCompact = bc.getASCII(msg, { compact: false, charBlack: "##", charWhite: "  " });
        ow.test.assert(isString(resNonCompact) && resNonCompact.indexOf("##") >= 0, true, "Problem with getASCII non-compact");

        // ANSI mode
        var resANSI = bc.getASCII(msg, { ansi: true });
        ow.test.assert(isString(resANSI) && resANSI.indexOf("\u001b[") >= 0, true, "Problem with getASCII ansi mode");

        // write2ASCII alias
        var resWrite2 = bc.write2ASCII(msg);
        ow.test.assert(resWrite2, resCompact, "Problem with write2ASCII alias");
    };

    exports.testFormats = function() {
        var qr = new QR();

        // Wifi
        var wifi = qr.genWifiString("MyNet", "MyPass", "WPA");
        ow.test.assert(wifi, "WIFI:S:MyNet;T:WPA;P:MyPass;;", "Problem with genWifiString");

        // SMS
        var sms = qr.genSMSString("+123456", "Hello");
        ow.test.assert(sms, "smsto:+123456:Hello", "Problem with genSMSString");

        // Tel
        var tel = qr.genTelString("+123456");
        ow.test.assert(tel, "tel:+123456", "Problem with genTelString");

        // Geo
        var geo = qr.genGeoString(38.72, -9.14, "Lisbon");
        ow.test.assert(geo, "geo:38.72,-9.14?q=Lisbon", "Problem with genGeoString");

        // Email
        var email = qr.genEmailString("user@test.com", "Hi", "cc@test.com", "Body");
        ow.test.assert(email.startsWith("mailto:user@test.com?"), true, "Problem with genEmailString");

        // Contact vcard
        var vcard = qr.genContactString("vcard", { name: "Doe;John", fn: "John Doe", tel: "+123" });
        ow.test.assert(vcard.indexOf("BEGIN:VCARD") >= 0 && vcard.indexOf("FN:John Doe") >= 0, true, "Problem with vcard");

        // Contact mecard
        var mecard = qr.genContactString("mecard", { name: "Doe,John", tel: "+123" });
        ow.test.assert(mecard.startsWith("MECARD:") && mecard.endsWith(";;"), true, "Problem with mecard");

        // Cal
        var cal = qr.genCalString("Event", "20260901", "20260902", "Room", "Desc");
        ow.test.assert(cal.indexOf("BEGIN:VEVENT") >= 0 && cal.indexOf("SUMMARY:Event") >= 0, true, "Problem with cal");

        // URL
        var url = qr.genURLString("openaf.io");
        ow.test.assert(url, "https://openaf.io", "Problem with genURLString");

        // Bookmark
        var bkm = qr.genBookmarkString("OpenAF", "https://openaf.io");
        ow.test.assert(bkm, "MEBKM:TITLE:OpenAF;URL:https://openaf.io;;", "Problem with genBookmarkString");

        // WhatsApp
        var wa = qr.genWhatsAppString("+123456", "Hi");
        ow.test.assert(wa, "https://wa.me/123456?text=Hi", "Problem with genWhatsAppString");

        // Telegram
        var tg = qr.genTelegramString("mychan", "Hi");
        ow.test.assert(tg, "https://t.me/mychan?text=Hi", "Problem with genTelegramString");

        // YouTube
        var yt = qr.genYTString("dQw4w9WgXcQ");
        ow.test.assert(yt, "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "Problem with genYTString");

        // FaceTime
        var ft = qr.genFTString("user@test.com", true);
        ow.test.assert(ft, "facetime-audio:user@test.com", "Problem with genFTString");

        // OTP
        var otp = qr.genOTPAuth("user@test.com", "App", "JBSWY3DPEHPK3PXP");
        ow.test.assert(otp.startsWith("otpauth://totp/App:user%40test.com?"), true, "Problem with genOTPAuth");

        // Crypto
        var btc = qr.genBitcoinString("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", 0.01, "Donation", "Thanks");
        ow.test.assert(btc.startsWith("bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?"), true, "Problem with genBitcoinString");

        // EPC
        var epc = qr.genEPCString("PT50000000000000000000000", "John", 10.50, "TESTPTPL", "Ref123");
        ow.test.assert(epc.startsWith("BCD\n002\n1\nSCT\nTESTPTPL\nJohn\nPT50000000000000000000000\nEUR10.50"), true, "Problem with genEPCString");

        // UPI
        var upi = qr.genUPIString("user@upi", "John", 100, "Dinner");
        ow.test.assert(upi.startsWith("upi://pay?"), true, "Problem with genUPIString");

        // Skype
        var skype = qr.genSkypeString("echo123", "chat");
        ow.test.assert(skype, "skype:echo123?chat", "Problem with genSkypeString");
    };
})();