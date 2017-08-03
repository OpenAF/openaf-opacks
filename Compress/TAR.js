// author: nmaguiar@gmail.com

/**
 * <odoc>
 * <key>TAR.TAR(aTarGzFile)</key>
 * Creates an instance to handle the aTarGzFile.
 * </odoc>
 */
var TAR = function(aTarGZFile) {
	this.tarGZFile = aTarGZFile;
}

TAR.prototype.__open = function() {
	if (isDef(this.input)) this.__close();

	if (this.tarGZFile.match(/gz$/i)) {
		this.input = Packages.org.apache.commons.compress.archivers.tar.TarArchiveInputStream(io.readFileGzipStream(this.tarGZFile));
	} else {
		this.input = Packages.org.apache.commons.compress.archivers.tar.TarArchiveInputStream(io.readFileStream(this.tarGZFile));
	}
}

TAR.prototype.__open4write = function() {
	if (isDef(this.output)) this.__close4write();

	if (this.tarGZFile.match(/gz$/i)) {
		this.output = Packages.org.apache.commons.compress.archivers.tar.TarArchiveOutputStream(io.writeFileGzipStream(this.tarGZFile));
	} else {
		this.output = Packages.org.apache.commons.compress.archivers.tar.TarArchiveOutputStream(io.writeFileStream(this.tarGZFile));
	}
}

TAR.prototype.__close = function() {
	if (isDef(this.input)) this.input.close();
}

TAR.prototype.__close4write = function() {
	if (isDef(this.output)) this.output.close();
}

/**
 * <odoc>
 * <key>TAR.listFiles() : Array</key>
 * List the current entries on the TAR file.
 * </odoc>
 */
TAR.prototype.listFiles = function() {
	var files = [];

	this.__open();

	var e = this.input.getNextTarEntry();
	while (e != null) {
		files.push({
			isDirectory : e.isDirectory(),
			isFile      : e.isFile(),
			name        : String(e.getName()),
			groupId     : Number(e.getGroupId()),
			group       : String(e.getGroupName()),
			userId      : Number(e.getUserId()),
			user        : String(e.getUserName()),
			size        : Number(e.getSize()),
			lastModified: new Date(e.getModTime())
		});
		e = this.input.getNextTarEntry();
	}

	this.__close();

	return files;
}

/**
 * <odoc>
 * <key>TAR.getFile(aSourceFile, aTargetFile)</key>
 * Copies the TAR aSourceFile into the local aTargetFile.
 * </odoc>
 */
TAR.prototype.getFile = function(aSourceFile, aTargetFile) {
	this.__open();

	var e = this.input.getNextTarEntry();
	var cont = true;

	while (e != null && cont) {
		if (String(e.getName() == aSourceFile)) {
			var out = io.writeFileStream(aTargetFile);
			ioStreamCopy(out, this.input);

			out.flush();

			out.close();
			cont = false;
		}
	}

	this.__close();

	return undefined;
}

/**
 * <odoc>
 * <key>TAR.getFileStream(aSourceFile) : JavaStream</key>
 * Returns a java file stream for the TAR aSourceFile. Please close the java file stream after using it.
 * </odoc>
 */
TAR.prototype.getFileStream = function(aSourceFile) {
	this.__open();

	var e = this.input.getNextTarEntry();
	var cont = true;

	while (e != null && cont) {
		if (String(e.getName() == aSourceFile)) {
			return this.input;
		}
	}

	return undefined;
}

/**
 * <odoc>
 * <key>TAR.getFileBytes(aSourceFile) : ArrayOfBytes</key>
 * Returns an array of bytes with the contents of the TAR aSourceFile.
 * </odoc>
 */
TAR.prototype.getFileBytes = function(aSourceFile) {
	this.__open();

	var e = this.input.getNextTarEntry();
	var cont = true;

	while (e != null && cont) {
		if (String(e.getName() == aSourceFile)) {
			return Packages.org.apache.commons.io.IOUtils.toByteArray(this.input);
		}
	}	

	this.__close();
}

