/**
 * SQLDeveloperPasswordUtil
 *
 * @author Nuno Aguiar
 */
var SQLDeveloperPasswordUtil = function(jarPath) {
	if (typeof jarPath === 'undefined') {
		jarPath = getOPackPath("SQLDeveloperUtils") + "/lib";
 		jarPath = jarPath.replace(/\\/g, "/");
	}
	this.referenceWorkerClass = af.externalClass([ "file:///" + jarPath + "/db-ca.jar",
							                       "file:///" + jarPath + "/adf-share-ca.jar"],
	                   							   "oracle.jdevimpl.db.adapter.ReferenceWorker");
}

/**
 * Decrypts a SQLDeveloper cipher text
 *
 * @param  {String} aKey The main key used to encrypt the text (use getWinSystemKey for the system key)
 * @param  {String} aSecret The encrypted text.
 * @return {String} The decrypted text
 */
SQLDeveloperPasswordUtil.prototype.decrypt = function(aKey, aSecret) {
    var referenceWorker = this.referenceWorkerClass.getDeclaredMethod("createDefaultWorker", [ java.lang.String ]).invoke("createDefaultWorker", aKey);
    var stringRefAddr = new javax.naming.StringRefAddr(null, aSecret);
    return new java.lang.String(referenceWorker.decrypt(stringRefAddr, null));
}

/**
 * Encrypts a text using SQLDeveloper encrypt
 *
 * @param  {String} aKey    The key to use to encrypt the text
 * @param  {String} aSecret The text to cipher
 * @return {String}         The encrypted text
 */
SQLDeveloperPasswordUtil.prototype.encrypt = function(aKey, aSecret) {
	var referenceWorker = this.referenceWorkerClass.getDeclaredMethod("createDefaultWorker", [ java.lang.String ]).invoke("createDefaultWorker", aKey);
	return referenceWorker.encrypt("", (new java.lang.String(aSecret)).toCharArray(), "").getContent();
}

/**
 * Tries to retrieve the SQLDeveloper system key used to encrypt passwords (Windows version)
 *
 * @return {String} Returns the system key
 */
SQLDeveloperPasswordUtil.prototype.getWinSystemKey = function() {
	return this.getSystemKey(af.sh("cmd /c echo %APPDATA%").replace(/[\\\n\r]+/g, "/") + "/SQL Developer");
}

/**
 * Tries to retrieve the SQLDeveloper local connections (Windows version)
 *
 * @return {Map} Returns a connections map
 */
SQLDeveloperPasswordUtil.prototype.getWinConnections = function() {
	return this.getConnections(af.sh("cmd /c echo %APPDATA%").replace(/[\\\n\r]+/g, "/") + "/SQL Developer");
}

/**
 * Tries to retrieve the SQLDeveloper system key used to encrypt passwords
 *
 * @param  {String} sqlDeveloperPreferencesPath Path to the SQLDeveloper preferences
 * @return {String} Returns the system key
 */
SQLDeveloperPasswordUtil.prototype.getSystemKey = function(sqlDeveloperPreferencesPath) {
	var versions = [];
	var userpath = sqlDeveloperPreferencesPath;
	var listFiles = af.listFiles(userpath);
	for(i in listFiles.files) {
		var file = listFiles.files[i];

		if (file.isDirectory) {
			if (file.filename.match(/^system/)) {
				versions.push(file.filename);
			}
		}
	}

	var userpath = userpath + "/" + versions.sort().reverse()[0];
	listFiles = af.listFiles(userpath);
	for(i in listFiles.files) {
		var file = listFiles.files[i];

		if (file.isDirectory) {
			try {
				var sxml = af.readFileString(userpath + "/" + file.filename + "/product-preferences.xml");
				af.plugin("XML");
				var xml = new XML(sxml);
				return xml.find("//value[@n='db.system.id']").getAttribute("v");
				break;
			} catch(e) {
			}
		}
	}

	return "";
}

/**
 * Exports a connections XML to a Map
 *
 * @param  {String} decryptKey          Secret key used to decrypt password and checksum
 * @param  {String} filePathToExportXML Filepath to export xml file
 * @return {Map}                        A map with the corresponding connections
 */
SQLDeveloperPasswordUtil.prototype.export2Map = function(decryptKey, filePathToExportXML) {
	var connections = {};

	try {
		var sxml = af.readFileString(filePathToExportXML);
		af.plugin("XML");
		var xml = new XML(sxml);
		var nodes = xml.findAll("//Reference[@className='oracle.jdeveloper.db.adapter.DatabaseProvider']");
		for(var i = 0; i < nodes.getLength(); i++) {
			var name = nodes.item(i).getAttribute("name");
			var childNodes = xml.findAll("//Reference[@name='" + name + "']/RefAddresses/*");
			connections[name] = {};
			for(var j = 0; j < childNodes.getLength(); j++) {
				var childName = childNodes.item(j).getAttribute("addrType") + "";
				connections[name][childName] = (childNodes.item(j).getTextContent() + "").replace(/\n/g, "").trim();
				if (childName == 'password' || childName == 'ExportKeyChecksum') {
					connections[name][childName] = this.decrypt(decryptKey, connections[name][childName]) + "";
				}
			}
		}
		return(connections);
	} catch(e) {
		throw(e);
	}
}

SQLDeveloperPasswordUtil.prototype.createMap = function(name, jdbcURL, hostname, port, login, password, sid, servicename) {
	var connection = {};

	connection.role = "";
	connection.SavePassword = "true";
	connection.OracleConnectionType = "BASIC";
	connection.RaptorConnectionType = "Oracle";
	if (typeof sid === 'undefined') {
		connection["serviceName"] = servicename;
	} else {
		connection["sid"] = sid;
	}
	connection.ExportPasswordMode = "Key";
	connection.customUrl = jdbcURL;
	connection.oraDriverType = "thin";
	connection.NoPasswordConnection = "TRUE";
	connection.password = password;
	connection.hostname = hostname;
	connection.driver = "oracle.jdbc.OracleDriver";
	connection.port = port;
	connection.subtype = "oraJDBC";
	connection.OS_AUTHENTICATION = "false";
	connection.ConnName = name;
	connection.KERBEROS_AUTHENTICATION = "false";
	connection.user = login;
	connection.ExportKeyChecksum = "ValidKey";

	return connection;
}

SQLDeveloperPasswordUtil.prototype.map2XML = function(encryptKey, connections) {
	af.plugin("XML");
	var xml = new XML();
	var mainnode = xml.x("References").a("xmlns", "http://xmlns.oracle.com/adf/jndi");
	for(i in connections) {
		var connection = connections[i];
		var refaddr = mainnode.e("Reference").a("name", i).a("className", "oracle.jdeveloper.db.adapter.DatabaseProvider").a("xmlns", "")
                              .e("Factory").a("className", "oracle.jdevimpl.db.adapter.DatabaseProviderFactory1212")
                               .up()
                              .e("RefAddresses");
		for(j in connection) {
			var attrValue = connection[j];
			if (j == 'password' || j == 'ExportKeyChecksum') {
				attrValue = this.encrypt(encryptKey, attrValue) + "";
			}
			refaddr.e("StringRefAddr").a("addrType", j)
			       .e("Contents").t(attrValue);
		}
	}
	af.plugin("Beautifiers");

	return beautify.xml("<?xml version = '1.0' encoding = 'UTF-8'?>" + xml.w());
}

/**
 * Tries to retrieve the SQLDeveloper local connections
 *
 * @param  {String} sqlDeveloperPreferencesPath Path to the SQLDeveloper preferences
 * @return {Map} Connections map
 */
SQLDeveloperPasswordUtil.prototype.getConnections = function(sqlDeveloperPreferencesPath) {
	var versions = [];
	var connections = {};
	var userpath = sqlDeveloperPreferencesPath;
	var listFiles = af.listFiles(userpath);
	for(i in listFiles.files) {
		var file = listFiles.files[i];

		if (file.isDirectory) {
			if (file.filename.match(/^system/)) {
				versions.push(file.filename);
			}
		}
	}

	var systemKey = this.getSystemKey(sqlDeveloperPreferencesPath);

	var userpath = userpath + "/" + versions.sort().reverse()[0];
	listFiles = af.listFiles(userpath);
	for(i in listFiles.files) {
		var file = listFiles.files[i];

		if (file.isDirectory) {
			try {
				connections = this.export2Map(systemKey, userpath + "/" + file.filename + "/connections.xml");
				return(connections);
				break;
			} catch(e) {
				if (!(e.message.match(/FileNotFoundException/))) logErr(e);
			}
		}
	}

	return {};
}
