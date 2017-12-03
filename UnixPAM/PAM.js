(function() {
    var path = io.fileInfo(getOPackPath("UnixPAM") || ".").canonicalPath;
    af.externalAddClasspath("file:" + path + "/lib/libpam4j-1.8.jar");

    /**
     * <odoc>
     * <key>PAM.authenticate(aUser, aPassword) : Object</key>
     * Tries to authenticate aUser and aPassword with UNIX's PAM. Returns a Java UnixUser
     * object (http://libpam4j.kohsuke.org/apidocs/org/jvnet/libpam/UnixUser.html) or undefined
     * if the user cannot be authenticated.
     * </odoc>
     */
    exports.authenticate = function(aUser, aPassword) {
        var pam = new Packages.org.jvnet.libpam.PAM("pam");
        try {
            return pam.authenticate(aUser, Packages.wedo.openaf.AFCmdBase.afc.dIP(aPassword));
        } catch(e) {
            return undefined;
        }
    };
})();