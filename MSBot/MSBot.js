var packPath = (isDef(getOPackPath("MSBot")) ? getOPackPath("MSBot").replace(/\\/g, "/") : io.fileInfo(".").canonicalPath);
af.externalAddClasspath("file:" + io.fileInfo(packPath).canonicalPath + "/");

/**
 * <odoc>
 * <key>MSBot.MSBot(aFramework, aName, aClientId, aClientSecret, aDefaultTopic)</key>
 * Creates a new instance to access, via MS Bot Framework, to the aFramework (e.g. skype, slack) identified by aName (e.g. "MyBot")
 * using the MS Bot Framework provided aClientId and aClientSecret. Optionally it's possible to provide also aDefaultTopic to be used
 * if no topic is provided when sending messages. A special OpenAF channel (MSBot.getConversationsCh()) will be created to hold all conversations.
 * The entries on this channel will be composed of a key with the conversation id and the correspondent value composed of:\
 * \
 *    key - The conversation ID\
 *    lastMessage - The last message received in the conversation with the bot\
 *    lastTimestamp - The last message received timestamp by the bot\
 *    lastFromId - The provided Id that sent the last message to the bot\
 *    lastFromName - The provided Name that sent the last message to the bot\
 *    lastRecipientId - The conversation recipient id\
 *    lastRecipientName - The conversation recipient name\
 *    serviceUrl - The conversation service url being used\
 *    channelId - The bot framework channel id being used\
 * \
 * To handle responses and reply back simply subscribe the MSBot::conversations channel. Example:\
 * \
 * var sky = new MSBot("skype", "MyBot", "clientid", "clientsecret");\
 * sky.getConversationsCh().subscribe((aCh, aOp, aK, aV) => { ... sky.sendMsg(void 0, "Test", [ { id: aId, name "Test user"}], "Test"); ... });
 * sky.startEndpoint(3993, "0.0.0.0", "/mySSLKeys.jks", "changeit"); // see help MSBot.startEndpoint for more info\
 * \
 * </odoc>
 */
var MSBot = function(aFramework, aName, aClientId, aClientSecret, aDefaultTopic) {
	plugin("HTTP");
	ow.loadServer();
	ow.loadObj();
	var parent = this;

	this.name = aName;
	this.clientId = aClientId;
	this.clientSecret = aClientSecret;
        if (isUnDef(aFramework)) aFramework = "skype"; 

	this.serviceUrl = "https://" + aFramework + ".botframework.com";
	//this.serviceUrl = "https://smba.trafficmanager.net/apis";
	this.botId = aName;
	this.defaultTopic = aDefaultTopic;

	this.ch = "MSBot::conversations";

	$ch(this.ch).create();
	$ch(this.ch).subscribe(function(ach, op, k, v) {
		if (op == "set") {
			if (isDef(v.sendMessage)) {
				if (isUnDef(v.messageWasSent) || !v.messageWasSent) {
					log("Sending message '" + v.sendMessage + "'");
					try {
					   parent.sendMsg(k.key, v.sendMessage, [{ id: v.lastFromId, name: v.lastFromName}], aDefaultTopic);
					} catch(e) { logErr(e); }
					log("Sent '" + v.sendMessage + "'");
				}
			}
		}
	});
};

/**
 * <odoc>
 * <key>MSBot.getConversationsCh() : Channel</key>
 * Get the current conversations OpenAF channel.
 * </odoc>
 */
MSBot.prototype.getConversationsCh = function() {
	return $ch(this.ch);
};

MSBot.prototype.__receiveMsg = function(data) {
	if (isUnDef(data.type)) return {};
	switch(data.type) {
	case "message":
		var cId = data.conversation.id;
		var v = $ch(this.ch).get(cId);
		$ch(this.ch).set(cId, merge(v, {
			"key": cId, 
			"lastMessage": data.text,
			"lastTimestamp": data.localTimestamp,
			"lastFromId": data.from.id,
			"lastFromName": data.from.name,
			"lastRecipientId": data.recipient.id,
 			"lastRecipientName": data.recipient.name,
			"serviceUrl": data.serviceUrl,
 			"channelId": data.channelId
		}));
		break;
	}
	return {};
};

MSBot.prototype.__getToken = function() {
	try {
		var body = templify("grant_type={{grant_type}}&client_id={{client_id}}&client_secret={{client_secret}}&scope={{scope}}" , { 
			"grant_type": "client_credentials",
			"client_id": this.clientId,
			"client_secret": this.clientSecret,
			"scope": "https://api.botframework.com/.default"
		});
		var tokenRes = (new ow.obj.http()).exec("https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token", "POST", body, {
			"Content-Type": "application/x-www-form-urlencoded",
			"Host": "login.microsoftonline.com"
		});

		return jsonParse(tokenRes.response);
	} catch(e) {
		logErr(stringify(e));
	}
};

/**
 * <odoc>
 * <key>MSBot.sendMsg(aConversationId, aMessage, aToArray, aTopic)</key>
 * Sends aMessage on the provided aConversationId (typically provided in the conversations channel key) to the provided recipients in aToArray
 * (array of maps composed of id (e.g. lastFromId) and name (e.g. lastFromName)) with a provided aTopic.
 * </odoc>
 */
MSBot.prototype.sendMsg = function(aConversationId, aMessage, aToArray, aTopic) {
	var token = this.__getToken();

	if ($from($ch(this.ch).getKeys()).equals("key", aConversationId).none()) {
		try {
			var res = ow.obj.rest.jsonCreate(this.serviceUrl + "/v3/conversations", {}, {
				bot: {
					id: this.botId,
					name: this.name
				},
				isGroup: false,
				members: aToArray,
				topicName: aTopic,
				activity: {
					type: 'message',
					text: aMessage, 
				},
				channelData: {}
			}, void 0, void 0, void 0, {
				"Authorization": String(token.token_type + " " + token.access_token)
			});
			
			aConversationId = res.id;
			$ch(this.ch).set(aConversationId, {
				"key": aConversationId,
				"members": aToArray,
				"topicName": aTopic,
				"serviceUrl": "https://smba.trafficmanager.net/apis"

			});
		} catch(e) {
			logErr(e);
		}
	} else {
	  try {
		var last = $ch(this.ch).get(aConversationId);

		var res = ow.obj.rest.jsonCreate(last.serviceUrl + "/v3/conversations/" + aConversationId + "/activities", {}, { 
			type: 'message', 
			text: aMessage,
			from: {
				id: last.lastRecipientId,
				name: last.lastRecipientName 
			}
		}, void 0, void 0, void 0, {
			"Authorization": String(token.token_type + " " + token.access_token)
		});

		var v = $ch(this.ch).get(aConversationId);
		v.sendMessage = aMessage;
		v.messageWasSent = true;
		v.messageSentTimestamp = new Date();
		$ch(this.ch).set(aConversationId, v);
	   } catch(e) {
		throw e;
	   }
   	}
};

/**
 * <odoc>
 * <key>MSBot.startEndpoint(aPort, aBindingIPAddress, aKeyStorePath, aPass)</key>
 * Starts an endpoint to receive data from MS Bot Framework on the provided aPort binded on aBindingIPAddress (e.g. 0.0.0.0 for public access)
 * with the provided aKeyStorePath (should be part of the current openaf classpath, by default it can be placed on this opack main folder) and 
 * the corresponding aPass to access it.
 * </odoc>
 */
MSBot.prototype.startEndpoint = function(aPort, aHost, aKeyStore, aPass) {
	var hss = ow.server.httpd.start(aPort, aHost, aKeyStore, aPass);
	var parent = this;
	ow.server.httpd.route(hss, {
		"/": function(req) {
			return hss.replyOKJSON(stringify(parent.__receiveMsg(jsonParse(req.files.postData))));
		}
	}, function(r) { return aHTTPd.reply("", "", 401, {}); });

	return hss;
};
