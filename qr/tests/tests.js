(function() {
    load("qr.js");

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
})();