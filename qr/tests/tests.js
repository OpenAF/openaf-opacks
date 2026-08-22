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
})();