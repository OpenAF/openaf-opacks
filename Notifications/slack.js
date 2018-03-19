/**
 * <odoc>
 * <key>Slack.Slack(webhookURL) : Object</key>
 * Initializes an object to send Slack messages given a webhookURL.
 * </odoc>
 */
var Slack = function(webhookURL) {
    ow.loadObj();
    this.url = webhookURL;
};

/**
 * <odoc>
 * <key>Slack.send(aMessage) : String</key>
 * Sends aMessage. Check more in https://api.slack.com/docs/message-formatting
 * </odoc>
 */
Slack.prototype.send = function(aMessage) {
    if (isString(aMessage) && aMessage.length > 0) {
        var h = new ow.obj.http();
        var res = ow.obj.rest.jsonSet(this.url, {}, { text: aMessage });
        return res;
    } else {
        throw "You need to provide a message. Received: " + aMessage;
    }
};

/**
 * <odoc>
 * <key>Slack.sendAttachments(aText, anArray) : String</key>
 * Sends a slack message with aText and anArray. Check more info in https://api.slack.com/docs/message-formatting
 * </odoc>
 */
Slack.prototype.sendAttachments = function(aText, anArray) {
    if (isString(aText) && isArray(anArray)) {
        var h = new ow.obj.http();
        return ow.obj.rest.jsonSet(this.url, {}, { text: aText, attachments: anArray });
    } else {
        throw "You need to provide a text and an array. Received: " + aText + " and " + anArray;
    }
};