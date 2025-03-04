/**
 * <odoc>
 * <key>Pushover.Pushover(anAPIToken) : Object</key>
 * Initializes an object to send Pushover messages given anAPIToken. Please go to http://pushover.net to 
 * register your script.
 * </odoc>
 */
var Pushover = function(anAPIToken) {
    plugin("HTTP");
    this.token = anAPIToken;
};

/**
 * <odoc>
 * <key>Pushover.send(aUserId, aMessage) : Map</key>
 * Sends aMessage to the group or user aUserId.
 * </odoc>
 */
Pushover.prototype.send = function(aUserId, aMessage) {
    if (isString(aMessage) && aMessage.length > 0) {
        /*var h = new HTTP();
        var res = h.exec("https://api.pushover.net/1/messages.json", "POST", "token=" + this.token + "&user=" + aUserId + "&message=" + encodeURI(aMessage));
        if (isDef(res.response)) res.response = jsonParse(res.response);
        return res;*/
        var res = $rest().post("https://api.pushover.net/1/messages.json", { token: this.token, user: aUserId, message: aMessage})
        return res
    } else {
        throw "You need to provide a message. Received: " + aMessage;
    }
};
