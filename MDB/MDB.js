var MDB = function(aLibPath) {
    if (isUnDef(aLibPath)) aLibPath = (isDef(getOPackPaths()["MDB"]) ? getOPackPaths()["MDB"]+"/lib" : "/lib");
    this.LIB_PATH = (new java.io.File(aLibPath)).getAbsolutePath();

    if (Object.keys(Packages.net.ucanaccess.jdbc.UcanaccessDriver).length <= 2) {
            delete Packages.net.ucanaccess.jdbc.UcanaccessDriver;
            $from(io.listFilenames(this.LIB_PATH)).ends(".jar").select(function(r) {
                    af.externalAddClasspath("file:///" + r.replace(/\\/g, "/"));
            });
    } 
}

MDB.prototype.getAccessDB = function(aFilePath) {
	return new DB("net.ucanaccess.jdbc.UcanaccessDriver", "jdbc:ucanaccess://" + aFilePath + ";memory=false", "", "");
}