(function() {
    exports.testConnect = function() {
        plugin("SMB");
        plugin("Console");
        var con = new Console();

        global.url    = con.readLinePrompt("Test server (e.g. smb://127.0.0.1/c$): ");
        global.domain = con.readLinePrompt("Test server domain                   : ");
        global.user   = con.readLinePrompt("Test server username                 : ");
        global.pass   = con.readLinePrompt("Test server password                 : ", "*");

        var smb = new SMB(global.url, global.domain, global.user, global.pass);
        print("\nSuccessfully connected to " + global.url);
    };

    exports.testList = function() {
        plugin("SMB");

        var smb = new SMB(global.url, global.domain, global.user, global.pass);
        print("List | Successfully connected to " + global.url);
        print("List | Listing...");
        var fileList = smb.listFiles(global.url);
        print("List | Found #" + fileList.files.length + " entries.");
        if (fileList.files.length > 0) {
            var entry = fileList.files[0];

            ow.test.assert(isString(entry.filename), true, "Filename list entry not found.");
            ow.test.assert(isString(entry.filepath), true, "Filepath list entry not found.");
            ow.test.assert(isNumber(entry.size), true, "Size list entry not found.");
            ow.test.assert(isString(entry.permissions), true, "Permission list entry not found.");
            ow.test.assert(isNumber(entry.lastModified), true, "Last modified list entry not found.");
            ow.test.assert(isNumber(entry.createTime), true, "Create time list entry not found.");
            ow.test.assert(isBoolean(entry.isDirectory), true, "isDirectory list entry not found.");
            ow.test.assert(isBoolean(entry.isFile), true, "isFile list entry not found.");
        }
    };

    exports.testGetPutFile = function() {
        plugin("SMB");

        var smb = new SMB(global.url, global.domain, global.user, global.pass);
        print("GetPutFile | Successfully connected to " + global.url);

        print("GetPutFile | Generating test file...");
        io.writeFileString("test.txt", "Hello World!");

        print("GetPutFile | Put file test.txt on remote share...");
        var res = smb.putFile("test.txt", global.url + "/test.txt");

        ow.test.assert(res, "Hello World!".length, "PutFile bytes count not expected.");
        
        print("GetPutFile | Trying to retrieve file from remote share...");
        res = smb.getFile(global.url + "/test.txt", "test.txt");
        ow.test.assert(res, "Hello World!".length, "GetFile bytes count not expected.");
        ow.test.assert(io.readFileString("test.txt").length, "Hello World!".length, "GetFile retrieved file no equal.");

        print("GetPutFile | Removing test file from remote share...");
        smb.rm(global.url + "/test.txt");

        print("GetPutFile | Removing test file...");
        io.rm("test.txt");
    };

    exports.testGetPutFileStream = function() {
        plugin("SMB");

        var smb = new SMB(global.url, global.domain, global.user, global.pass);
        print("GetPutFile | Successfully connected to " + global.url);

        print("GetPutFile | Generating test file...");
        io.writeFileString("testStream.txt", "Hello World!");

        print("GetPutFile | Put file testStream.txt on remote share via stream...");
        var rstream = io.readFileStream("testStream.txt");
        smb.writeFileStream(global.url + "/testStream.txt", rstream);
        rstream.close();
        
        print("GetPutFile | Trying to retrieve file from remote share via stream...");
        rstream = smb.getInputStream(global.url + "/testStream.txt");
        var wstream = af.newOutputStream();
        ioStreamCopy(wstream, rstream);

        ow.test.assert(String(wstream.toString()), "Hello World!", "GetFileStream content not expected.");
        wstream.close();
        rstream.close();

        print("GetPutFile | Removing test file from remote share...");
        smb.rm(global.url + "/testStream.txt");

        print("GetPutFile | Removing test file...");
        io.rm("testStream.txt");
    };    

    exports.testGetPutFileBytes = function() {
        plugin("SMB");

        var smb = new SMB(global.url, global.domain, global.user, global.pass);
        print("GetPutFileBytes | Successfully connected to " + global.url);

        print("GetPutFileBytes | Put file test.jar on remote share...");
        smb.writeFileBytes(global.url + "/test.jar", af.fromString2Bytes("Hello World!"));
        
        print("GetPutFileBytes | Trying to retrieve file from remote share...");
        var res = smb.getFileBytes(global.url + "/test.jar");
        ow.test.assert(af.fromBytes2String(res), "Hello World!", "GetFile bytes not expected.");

        print("GetPutFileBytes | Removing test file from remote share...");
        smb.rm(global.url + "/test.jar");
    };    
})();        