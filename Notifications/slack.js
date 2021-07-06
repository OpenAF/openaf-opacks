/**
 * <odoc>
 * <key>Slack.Slack(webhookURL) : Object</key>
 * Initializes an object to send Slack messages given a webhookURL.
 * </odoc>
 */
var Slack = function(webhookURL) {
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
        var res = $rest().post(this.url, { text: aMessage });
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
        return $rest().post(this.url, { text: aText, attachments: anArray });
    } else {
        throw "You need to provide a text and an array. Received: " + aText + " and " + anArray;
    }
};

/**
 * <odoc>
 * <key>Slack.sendBlock(aSectionTxt, aContextTxt) : String</key>
 * Sends a block that starts with a markdown aSectionTxt. That section can have one or more aContextTxt (string or array).
 * Returns whatever the answer was from Slack API.
 * </odoc>
 */
Slack.prototype.sendBlock = function(aSectionTxt, aContextTxt) {
    aSectionTxt = _$(aSectionTxt, "aSectionTxt").isString().default("");
    aContextTxt = _$(aContextTxt, "aContextTxt").default("");

    if (isString(aContextTxt)) aContextTxt = [ aContextTxt ];

    return $rest().post(this.url, {
        blocks: [
            { type: "section", text: { type: "mrkdwn", text: aSectionTxt } },
            { type: "context", elements: aContextTxt.map(s => ({ type: "mrkdwn", text: s })) }
        ]
    })
};