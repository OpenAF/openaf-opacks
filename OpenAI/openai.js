/**
 * <odoc>
 * <key>OpenAI.OpenAI(aKey, aTimeout) : OpenAI</key>
 * Creates a new wrapper with aKey. Optionally you can provide a different aTimeout in ms (defaults to 1 min).
 * </odoc>
 */
var OpenAI = function(aKey, aTimeout) {
   aTimeout = _$(aTimeout, "aTimeout").isNumber().default(60000)
   ow.loadObj()
   this._key = aKey
   this._h = new ow.obj.http(__, __, __, __, __, __, __, { timeout: aTimeout })
}

OpenAI.prototype._request = function(aURI, aData, aVerb) {
   _$(aURI, "aURI").isString().$_()
   aData = _$(aData, "aData").isMap().default({})
   aVerb = _$(aVerb, "aVerb").isString().default("POST")

   var _r = $rest({ 
      conTimeout    : 60000,
      httpClient    : this._h,
      requestHeaders: { 
         Authorization: "Bearer " + Packages.openaf.AFCmdBase.afc.dIP(this._key) 
      } 
   })

   //if (aURI.startsWith("/")) aURI = aURI.substring(1)

   switch(aVerb.toUpperCase()) {
   case "GET" : return _r.get("https://api.openai.com/" + aURI)
   case "POST": return _r.post("https://api.openai.com/" + aURI, aData)
   }
}

/**
 * <odoc>
 * <key>OpenAI.getModels : Map</key>
 * Retrieves the current list of OpenAI models.
 * </odoc>
 */
OpenAI.prototype.getModels = function() {
   return this._request("/v1/models", __, "GET")
}

/**
 * <odoc>
 * <key>OpenAI.chat(aContent, aModel, aTemperature) : Map</key>
 * Given aContent as an user sends the chat request to aModel (defaults to gpt-3.5-turbo) and
 * returns the corresponding chat completion.
 * Optionally you can provide a different temperature from 0.7.
 * </odoc>
 */
OpenAI.prototype.chat = function(aContent, aModel, aTemperature) {
   _$(aContent, "aContent").isString().$_()
   aTemperature = _$(aTemperature, "aTemperature").isNumber().default(0.7)
   aModel       = _$(aModel, "aModel").isString().default("gpt-3.5-turbo")

   return this._request("/v1/chat/completions", {
      model: aModel,
      temperature: aTemperature,
      messages: [ { role: "user", content: aContent }]
   })   
}

/**
 * <odoc>
 * <key>OpenAI.chatGPT(aContent, aModel, aTemperature) : String</key>
 * Same as OpenAI.chat but returns the assistant content directly.
 * </odoc>
 */
OpenAI.prototype.chatGPT = function(aContent, aModel, aTemperature) {
   var _r = this.chat(aContent, aModel, aTemperature)
   if (isArray(_r.choices) && _r.choices.length > 0) {
      if (_r.choices[0].finish_reason == "stop") {
         return _r.choices[0].message.content
      }
   }
   return _r
}

/**
 * <odoc>
 * <key>OpenAI.getCode(aResponse, aCommentChars) : String</key>
 * Given a response from OpenAI.chat or OpenAI.chatGPT will try to parse it to make suitable 
 * as code (specially usefull for code generation related queries). Optionally a different 
 * aCommentChars (defaults to "#") can be provided.
 * </odoc>
 */
OpenAI.prototype.getCode = function(aResponse, aCommentChars) {
   _$(aResponse, "aResponse").isString().$_()
   aCommentChars = _$(aCommentChars, "aCommentChars").isString().default("#")

   if (aResponse.indexOf("```") >= 0) {
      var code = false
      return aResponse.split("\n").map(line => {
         if (line.indexOf("```") >= 0) {
            var _t = aCommentChars + " ---" + (code ? "^^^" : "vvv") + "---"
            code = !code
            return _t
         }
         if (code) {
            return line
         } else {
            return (line.length > 0) ? aCommentChars + " " + line : ""
         }
      }).filter(isDef).join("\n")
   } else {
      return aResponse
   }
}