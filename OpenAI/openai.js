/**
 * <odoc>
 * <key>OpenAI.OpenAI(aKey, aTimeout) : OpenAI</key>
 * Creates a new wrapper with aKey. Optionally you can provide a different aTimeout in ms (defaults to 5 min).
 * </odoc>
 */
var OpenAI = function(aKey, aTimeout) {
   aTimeout = _$(aTimeout, "aTimeout").isNumber().default(5 * 60000)
   ow.loadObj()
   this._key = aKey
   this._timeout = aTimeout
   this.conversation = []
}

OpenAI.prototype._request = function(aURI, aData, aVerb) {
   _$(aURI, "aURI").isString().$_()
   aData = _$(aData, "aData").isMap().default({})
   aVerb = _$(aVerb, "aVerb").isString().default("POST")

   var _h = new ow.obj.http(__, __, __, __, __, __, __, { timeout: this._timeout })
   var _r = $rest({ 
      conTimeout    : 60000,
      httpClient    : _h,
      requestHeaders: { 
         Authorization: "Bearer " + Packages.openaf.AFCmdBase.afc.dIP(this._key) 
      } 
   })
   _h.close()
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
 * <key>OpenAI.chat(aContent, aCId, aModel, aTemperature) : Map</key>
 * Given aContent (string or array of the conversation) as an user sends the chat request to aModel (defaults to gpt-3.5-turbo) and
 * returns the corresponding chat completion.
 * Optionally you can provide a different temperature from 0.7.
 * </odoc>
 */
OpenAI.prototype.chat = function(aContent, aCId, aModel, aTemperature) {
   aContent     = _$(aContent, "aContent").default(this.conversation)
   aCId         = _$(aCId, "aCId").isString().default(__)
   aTemperature = _$(aTemperature, "aTemperature").isNumber().default(0.7)
   aModel       = _$(aModel, "aModel").isString().default("gpt-3.5-turbo")

   var msgs = []
   if (isString(aContent)) aContent = [ aContent ]
   msgs = aContent.map(c => isMap(c) ? c : { role: aRole, content: c })

   return this._request("/v1/chat/completions", {
      id: aCId,
      model: aModel,
      temperature: aTemperature,
      messages: msgs
   })   
}

OpenAI.prototype.add = function(aRole, aContent) {
   if (isUnDef(aContent)) {
      aContent = aRole
      aRole = "user"
   }
   if (isString(aContent)) this.conversation.push({ role: aRole.toLowerCase(), content: aContent })
   if (isArray(aContent))  this.conversation = this.conversation.concat(aContent)
   return this
}

OpenAI.prototype.buildChat4JSOJob = function() {
   this.conversation = [{
      role:"system", 
      content: `You can only output a json map with a property called 'code' with javascript code, a property  to be integrated a larger piece of code which must
         be browser compatible code and should have all inputs and outputs has properties of a javascript map called 'args' 
         that doesn't need to be declared or output. No use of the 'const' keyword is allowed.
         No user input should be requested neigher any output should be printed. Any input should not be checked for type or value on the code.
         You should comment the written code liberally to explain what each piece does and why it's written that way.`
   }]
   return this
}

OpenAI.prototype.buildChat4PythonOJob = function() {
   this.conversation = [{
      role:"system", 
      content: `You are writing code snippet so you can only reply with Python 3 compatible code using the standard libraries assuming all inputs
         and outputs are properties of a dictionary called 'args'. Comment the code liberally to explain what each piece does and why it's written 
         that way.`
   }]
   return this
}

OpenAI.prototype.buildChat4ShellOJob = function() {
   this.conversation = [{
      role:"system", 
      content: `You are writing code snippet so you can only reply with unix shell script compatible code assuming all inputs are environment
         variables and all outputs are written to environment variables. If the code snippet has outputs the absolute last line of the code snippet
         must be always a comment line starting with the word 'return' (in lower case) followed by a space followed by the list of output environment
         variables separated with commas. Comment the code liberally to explain what each piece does and why it's written that way.`
   }]
   return this
}

OpenAI.prototype.buildChat4JSON = function() {
   this.conversation = [{
      role:"system",
      content:"You can only output answers in JSON format."
   }]
   return this
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

OpenAI.prototype.jsonChatGPT = function(aContent, aModel, aTemperature) {
   this.buildChat4JSON().add(aContent)

   var out = this.chatGPT(__, aModel, aTemperature)
   return isString(out) ? jsonParse(out, __, __, true) : out
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