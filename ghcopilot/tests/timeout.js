// Run from the opack directory: oaf -f tests/timeout.js
var source = io.readFileString('ghcopilot.js')
var start = source.indexOf('    var _sendAndWait = ')
var end = source.indexOf('    var _extractUsage = ', start)
var aOptions = { timeout: 1000 }
var _setDebug = () => {}
var closed, aborted, unsubscribed, future, _session
var event = (type, data, agent) => ({ getType: () => type, getData: () => data, getAgentId: () => agent || null })
var user = id => event('user.message', { messageId: () => id })
var answer = (id, agent) => event('assistant.message', { originatingMessageId: () => id }, agent)
var idle = agent => event('session.idle', { aborted: () => false, mode: () => null }, agent)
var setup = (events, failure) => {
  closed = aborted = unsubscribed = false
  future = new java.util.concurrent.CompletableFuture()
  var handler
  _session = {
    on: h => { handler = h; return { close: () => { unsubscribed = true } } },
    send: mo => {
      // Events may arrive before the send acknowledgement.
      events.forEach(evt => handler.accept(evt))
      if (failure) future.completeExceptionally(failure)
      else future.complete('request-1')
      return future
    },
    sendAndWait: () => { throw 'must not use completion RPC' },
    abort: () => { aborted = true; return java.util.concurrent.CompletableFuture.completedFuture(null) },
    close: () => { closed = true }
  }
}
var check = (condition, message) => { if (!condition) throw message }
eval(source.substring(start, end))
var expected = answer('request-1')
setup([idle(), user('other'), answer('other'), idle(), user('request-1'), answer('request-1', 'child'), idle('child'), expected, idle()])
check(_sendAndWait({}) === expected, 'wrong response or premature idle completion')
check(unsubscribed && !closed && !aborted, 'success cleanup incorrect')
setup([user('request-1'), event('session.error', { message: () => 'denied' })])
try { _sendAndWait({}); throw 'expected error' } catch(e) { check(String(e).indexOf('denied') >= 0, 'session error lost') }
check(unsubscribed, 'session error listener leaked')
setup([user('request-1'), expected,
  event('session.idle', { aborted: () => false, mode: () => 'autopilot' }),
  answer('request-1'), event('session.autopilot_stopped', {})])
check(_sendAndWait({}) !== expected, 'autopilot intermediate idle completed request')
setup([user('request-1'), event('session.idle', { aborted: () => true, mode: () => null })])
try { _sendAndWait({}); throw 'expected abort' } catch(e) { check(String(e).indexOf('was aborted') >= 0, 'abort lost') }
setup([], new java.util.concurrent.TimeoutException('send timeout'))
try { _sendAndWait({}); throw 'expected timeout' } catch(e) { check(String(e).indexOf('send timeout') >= 0, 'send error lost') }
check(isUnDef(_session) && closed && aborted && unsubscribed, 'send timeout session not retired')
aOptions.timeout = 5
setup([user('request-1'), answer('request-1', 'child'), idle('child')])
try { _sendAndWait({}); throw 'expected timeout' } catch(e) { check(String(e).indexOf('TimeoutException') >= 0, 'event timeout lost') }
check(isUnDef(_session) && closed && aborted && unsubscribed, 'event timeout session not retired')
check((source.match(/var ev\s*= _sendAndWait\(mo\)/g) || []).length === 3, 'not all prompt paths use shared wait')
print('PASS: completion without SDK wait RPC, early-event buffering, request/subagent correlation, session errors, send/event timeouts and cleanup')
