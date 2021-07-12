/**
 * <odoc>
 * <key>MSTeams.MSTeams(aURL) : MSTeams</key>
 * The MS Teams incoming webook URL.
 * </odoc>
 */
var MSTeams = function(aURL) {
   this.url = _$(aURL, "aURL").isString().$_();
};

/**
 * <odoc>
 * <key>MSTeams.send(aHTMLMessage)</key>
 * Tries to send a HTML message (can have limited markdown).
 * </odoc>
 */
MSTeams.prototype.send = function(aHTMLMessage) {
   _$(aHTMLMessage, "aHTMLMessage").isString().$_();
   
   $rest().post(this.url, { text: aHTMLMessage });
};

