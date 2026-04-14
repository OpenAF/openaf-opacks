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
 * <key>$slack(webhookURL) : Slack</key>
 * Factory shortcut for new Slack(webhookURL).
 * </odoc>
 */
var $slack = function(webhookURL) { return new Slack(webhookURL); };

Slack.prototype._post = function(payload) {
    var res = $rest().post(this.url, payload);
    if (res !== "ok") throw "Slack error: " + res;
    return res;
};

/**
 * <odoc>
 * <key>Slack.send(aMessage, aOptions) : String</key>
 * Sends aMessage to Slack. Optionally aOptions map may contain channel, username, icon_emoji or icon_url
 * to override the webhook defaults. Check more in https://api.slack.com/docs/message-formatting
 * </odoc>
 */
Slack.prototype.send = function(aMessage, aOptions) {
    _$(aMessage, "aMessage").isString().$_("You need to provide a message.");
    aOptions = _$(aOptions, "aOptions").isMap().default({});

    return this._post(merge({ text: aMessage }, aOptions));
};

/**
 * <odoc>
 * <key>Slack.sendAttachments(aText, anArray, aOptions) : String</key>
 * Sends a slack message with aText and anArray of attachment maps. Optionally aOptions map may contain
 * channel, username, icon_emoji or icon_url overrides.
 * Check more info in https://api.slack.com/docs/message-formatting
 * </odoc>
 */
Slack.prototype.sendAttachments = function(aText, anArray, aOptions) {
    _$(aText, "aText").isString().$_("You need to provide a text.");
    _$(anArray, "anArray").isArray().$_("You need to provide an array.");
    aOptions = _$(aOptions, "aOptions").isMap().default({});

    return this._post(merge({ text: aText, attachments: anArray }, aOptions));
};

/**
 * <odoc>
 * <key>Slack.sendBlock(aSectionTxt, aContextTxt, aHeaderTxt, aHeaderEmoji, aOptions) : String</key>
 * Sends a block message. aSectionTxt is the main markdown section. aContextTxt is a string or array of
 * context lines. Optionally provide aHeaderTxt to prepend a header block (aHeaderEmoji defaults to ":bell:").
 * aOptions may contain channel, username, icon_emoji or icon_url overrides.
 * Returns whatever the answer was from Slack API.
 * </odoc>
 */
Slack.prototype.sendBlock = function(aSectionTxt, aContextTxt, aHeaderTxt, aHeaderEmoji, aOptions) {
    aSectionTxt  = _$(aSectionTxt,  "aSectionTxt").isString().default("");
    aContextTxt  = _$(aContextTxt,  "aContextTxt").default("");
    aHeaderTxt   = _$(aHeaderTxt,   "aHeaderTxt").isString().default(__);
    aHeaderEmoji = _$(aHeaderEmoji, "aHeaderEmoji").isString().default(":bell:");
    aOptions     = _$(aOptions,     "aOptions").isMap().default({});

    if (isString(aContextTxt)) aContextTxt = [ aContextTxt ];

    var blocks = [];
    if (isDef(aHeaderTxt)) {
        blocks.push({ type: "header", text: { type: "plain_text", text: aHeaderTxt, emoji: true } });
    }
    blocks.push({ type: "section", text: { type: "mrkdwn", text: aSectionTxt } });
    if (aContextTxt.length > 0) {
        blocks.push({ type: "context", elements: aContextTxt.map(s => ({ type: "mrkdwn", text: s })) });
    }

    return this._post(merge({ blocks: blocks }, aOptions));
};

/**
 * <odoc>
 * <key>Slack.sendMessage(aMap, aOptions) : String</key>
 * Sends an arbitrary raw payload aMap directly to Slack. Optionally aOptions map may contain channel,
 * username, icon_emoji or icon_url overrides that are merged into the payload.
 * </odoc>
 */
Slack.prototype.sendMessage = function(aMap, aOptions) {
    _$(aMap, "aMap").isMap().$_("Please provide a payload map.");
    aOptions = _$(aOptions, "aOptions").isMap().default({});

    return this._post(merge(aMap, aOptions));
};
