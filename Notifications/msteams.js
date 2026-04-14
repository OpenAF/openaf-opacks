/**
 * <odoc>
 * <key>MSTeams.MSTeams(aURL) : MSTeams</key>
 * The MS Teams incoming webhook URL. For new deployments use a Workflows webhook URL and the
 * sendAdaptiveCard or sendSection methods. The legacy send() method targets the deprecated
 * Office 365 Incoming Webhook connector.
 * </odoc>
 */
var MSTeams = function(aURL) {
   this.url = _$(aURL, "aURL").isString().$_();
};

/**
 * <odoc>
 * <key>$msteams(aURL) : MSTeams</key>
 * Factory shortcut for new MSTeams(aURL).
 * </odoc>
 */
var $msteams = function(aURL) { return new MSTeams(aURL); };

/**
 * <odoc>
 * <key>MSTeams.send(aHTMLMessage)</key>
 * Tries to send a HTML message (can have limited markdown).
 * Deprecated: targets the legacy Office 365 Incoming Webhook connector. For new MS Teams
 * Workflows webhooks use sendAdaptiveCard or sendSection instead.
 * </odoc>
 */
MSTeams.prototype.send = function(aHTMLMessage) {
   _$(aHTMLMessage, "aHTMLMessage").isString().$_();

   $rest().post(this.url, { text: aHTMLMessage });
};

/**
 * <odoc>
 * <key>MSTeams.sendAdaptiveCard(aCard)</key>
 * Sends an Adaptive Card to MS Teams via a Workflows webhook. aCard is the inner card content map,
 * at minimum { body: [...] }. Actions may be added via aCard.actions. The Workflows envelope and
 * Adaptive Card schema wrapper are added automatically.
 * </odoc>
 */
MSTeams.prototype.sendAdaptiveCard = function(aCard) {
   _$(aCard, "aCard").isMap().$_("Please provide an Adaptive Card content map.");

   var payload = {
      type: "message",
      attachments: [{
         contentType: "application/vnd.microsoft.card.adaptive",
         contentUrl : null,
         content    : merge({
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            type     : "AdaptiveCard",
            version  : "1.4"
         }, aCard)
      }]
   };

   var res = $rest().post(this.url, payload);
   if (isDef(res) && isDef(res.error)) throw "MS Teams error: " + stringify(res.error);
   return res;
};

/**
 * <odoc>
 * <key>MSTeams.sendSection(aTitle, aText, aFactsMap)</key>
 * Sends an Adaptive Card with a bold aTitle, body aText, and an optional aFactsMap of key-value pairs
 * rendered as a fact table. Uses sendAdaptiveCard internally and requires a Workflows webhook URL.
 * </odoc>
 */
MSTeams.prototype.sendSection = function(aTitle, aText, aFactsMap) {
   aTitle    = _$(aTitle,    "aTitle").isString().$_();
   aText     = _$(aText,     "aText").isString().$_();
   aFactsMap = _$(aFactsMap, "aFactsMap").isMap().default({});

   var body = [
      { type: "TextBlock", text: aTitle, weight: "bolder", size: "medium", wrap: true },
      { type: "TextBlock", text: aText, wrap: true }
   ];

   var facts = Object.keys(aFactsMap).map(function(k) { return { title: k, value: String(aFactsMap[k]) }; });
   if (facts.length > 0) body.push({ type: "FactSet", facts: facts });

   return this.sendAdaptiveCard({ body: body });
};
