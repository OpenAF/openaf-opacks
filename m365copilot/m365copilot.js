// Author: OpenAF community
ow.loadAI()

ow.ai.__gpttypes.m365copilot = {
  create: function(p) {
    var o = (p || {}).options || {}, history = [], id, last, access = o.token, refresh, expires = 0, busy = false
    var graph = 'https://graph.microsoft.com/beta/copilot/conversations'
    var scopes = 'https://graph.microsoft.com/Sites.Read.All https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/People.Read.All https://graph.microsoft.com/OnlineMeetingTranscript.Read.All https://graph.microsoft.com/Chat.Read https://graph.microsoft.com/ChannelMessage.Read.All https://graph.microsoft.com/ExternalItem.Read.All offline_access'
    var mode = o.authMode || (o.token || o.tokenProvider ? 'token' : 'deviceCode')
    if (o.token && o.tokenProvider || mode == 'deviceCode' && (o.token || o.tokenProvider)) throw 'Conflicting authentication options'
    if (mode != 'token' && mode != 'deviceCode') throw 'Unsupported authMode'
    if (mode == 'deviceCode' && (!o.tenantId || !o.clientId)) throw 'tenantId and clientId are required'
    var timeout = o.timeout || 120000

    function request(url, body, token, form, stream) {
      var conn = new java.net.URL(url).openConnection()
      conn.setConnectTimeout(timeout)
      conn.setReadTimeout(timeout)
      conn.setRequestMethod('POST')
      conn.setDoOutput(true)
      conn.setRequestProperty('Content-Type', form ? 'application/x-www-form-urlencoded' : 'application/json')
      if (token) conn.setRequestProperty('Authorization', 'Bearer ' + token)
      try {
        var data = form ? Object.keys(body).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(body[k])).join('&') : stringify(body)
        var out = conn.getOutputStream()
        try {
          out.write(new java.lang.String(data).getBytes('UTF-8'))
        } finally {
          out.close()
        }
        var status = conn.getResponseCode()
        if (status >= 400) {
          if (form) {
            var er = new java.io.BufferedReader(new java.io.InputStreamReader(conn.getErrorStream(), 'UTF-8')), eb = [], el
            try {
              while ((el = er.readLine()) !== null) eb.push(String(el))
            } finally {
              er.close()
            }
            var failure = jsonParse(eb.join(''))
            throw String(failure.error || 'oauth_error')
          }
          throw 'HTTP ' + status + ' request-id=' + conn.getHeaderField('request-id')
        }
        var reader = new java.io.BufferedReader(new java.io.InputStreamReader(conn.getInputStream(), 'UTF-8'))
        try {
          var line, lines = [], event = []
          while ((line = reader.readLine()) !== null) {
            line = String(line)
            if (stream) {
              if (line === '') {
                if (event.length) stream(jsonParse(event.join('\n')))
                event = []
              } else if (line.indexOf('data:') === 0) event.push(line.substring(5).trim())
            } else lines.push(line)
          }
          if (stream && event.length) stream(jsonParse(event.join('\n')))
          return stream ? __ : jsonParse(lines.join('\n'))
        } finally {
          reader.close()
        }
      } finally {
        conn.disconnect()
      }
    }

    function oauth(action, body) {
      return request('https://login.microsoftonline.com/' + encodeURIComponent(o.tenantId) + '/oauth2/v2.0/' + action, body, __, true)
    }

    function save(t) {
      access = t.access_token
      refresh = t.refresh_token || refresh
      expires = Date.now() + Number(t.expires_in) * 1000
    }

    function token() {
      if (o.tokenProvider) return o.tokenProvider()
      if (mode == 'token') {
        if (!access) throw 'A delegated Graph token is required'
        return access
      }
      if (access && Date.now() < expires - 60000) return access
      if (refresh) {
        save(oauth('token', { client_id: o.clientId, grant_type: 'refresh_token', refresh_token: refresh }))
        return access
      }
      var d = oauth('devicecode', { client_id: o.clientId, scope: scopes })
      if (o.onDeviceCode) o.onDeviceCode(d)
      else java.lang.System.err.println(d.message)
      var end = Date.now() + d.expires_in * 1000
      while (Date.now() < end) {
        sleep((d.interval || 5) * 1000, true)
        try {
          save(oauth('token', { client_id: o.clientId, grant_type: 'urn:ietf:params:oauth:grant-type:device_code', device_code: d.device_code }))
          return access
        } catch(e) {
          if (String(e) == 'authorization_pending') continue
          if (String(e) == 'slow_down') {
            d.interval = (d.interval || 5) + 5
            continue
          }
          throw 'Device authorization failed: ' + e
        }
      }
      throw 'Device authorization expired'
    }

    function run(prompt, model, temperature, json, tools, cb) {
      if (busy) throw 'A request is already active'
      if (model || isDef(temperature) || tools && tools.length) throw 'Model selection, temperature and tools are unsupported'
      if (!isString(prompt)) throw 'Only text prompts are supported'
      busy = true
      try {
        var t = token()
        var fresh = !id
        if (fresh) id = request(graph, {}, t).id
        var body = { message: { text: prompt + (json ? '\nReply strictly with valid JSON.' : '') }, locationHint: { timeZone: o.timeZone || String(java.util.TimeZone.getDefault().getID()) }, contextualResources: { webContext: { isWebEnabled: o.webSearch !== false } } }
        if (o.files) body.contextualResources.files = o.files.map(url => ({ uri: url }))
        body.additionalContext = (o.additionalContext || []).map(text => ({ text: text }))
        if (fresh && history.some(m => m.role != 'system')) body.additionalContext.push({ text: 'Previous conversation context:\n' + stringify(history.filter(m => m.role != 'system')) })
        history.filter(m => m.role == 'system').forEach(m => body.additionalContext.push({ text: m.content }))
        var full = ''

        function update(raw) {
          var messages = raw.messages || [], m = messages[messages.length - 1]
          if (m && m.text && m.text != prompt) {
            var previous = full
            full = m.text
            last = { response: full, conversationId: id, attributions: m.attributions || [], sensitivityLabel: m.sensitivityLabel, raw: raw }
            if (cb && full != previous) cb(full.indexOf(previous) === 0 ? full.substring(previous.length) : '', full)
          }
        }
        if (cb) request(graph + '/' + encodeURIComponent(id) + '/chatOverStream', body, t, false, update)
        else update(request(graph + '/' + encodeURIComponent(id) + '/chat', body, t))
        if (!full) throw 'No response text received'
        history.push({ role: 'user', content: prompt }, { role: 'assistant', content: full })
        if (json) last.response = jsonParse(full)
        return last
      } finally {
        busy = false
      }
    }

    var r = {
      prompt: (p, m, t, j, tools) => run(p, m, t, j, tools).response,
      rawPrompt: run,
      promptStream: (p, m, t, j, tools, cb) => run(p, m, t, j, tools, cb || function() {}).response,
      getConversation: () => history,
      setConversation: h => {
        history = h
        id = __
        return r
      },
      addPrompt: (role, text) => {
        history.push({ role: role, content: text })
        return r
      },
      addSystemPrompt: text => r.addPrompt('system', text),
      cleanPrompt: () => {
        history = []
        id = __
        last = __
        return r
      },
      getLastResponse: () => last,
      getConversationId: () => id,
      getModelName: () => 'm365copilot',
      getAuthStatus: () => ({ authMode: mode, authenticated: !!access }),
      close: () => {
        access = refresh = id = last = __
        history = []
      },
      promptImage: () => { throw 'Images are unsupported' },
      setTool: () => { throw 'Tools are unsupported' }
    }
    return r
  }
}
