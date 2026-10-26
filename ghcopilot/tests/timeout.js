// Run from the opack directory: oaf -f tests/timeout.js
var source = io.readFileString('ghcopilot.js')
var start = source.indexOf('    var _sendAndWait = ')
var end = source.indexOf('    var _extractUsage = ', start)
var aOptions = { timeout: 125000 }
var debug = []
var _setDebug = (type, data) => debug.push({ type: type, data: data })
var closed, aborted, unsubscribed, passedTimeout, future, _session
var setup = (failure) => {
  closed = aborted = unsubscribed = false
  future = new java.util.concurrent.CompletableFuture()
  if (failure) future.completeExceptionally(failure)
  else future.complete('ok')
  _session = {
    on: handler => ({ close: () => { unsubscribed = true } }),
    sendAndWait: (mo, timeout) => { passedTimeout = timeout; return future },
    abort: () => { aborted = true; return java.util.concurrent.CompletableFuture.completedFuture(null) },
    close: () => { closed = true }
  }
}
var check = (condition, message) => { if (!condition) throw message }
eval(source.substring(start, end))
setup()
check(String(_sendAndWait({})) === 'ok', 'successful response lost')
check(passedTimeout === 125000, 'configured timeout not forwarded')
check(unsubscribed && !closed && !aborted, 'success cleanup incorrect')
setup(new java.util.concurrent.TimeoutException('test timeout'))
try { _sendAndWait({}); throw 'expected timeout' } catch(e) {
  check(String(e).indexOf('test timeout') >= 0, 'original timeout lost')
}
check(isUnDef(_session) && closed && aborted && unsubscribed, 'timed-out session not retired')
setup(new java.lang.IllegalStateException('test error'))
try { _sendAndWait({}); throw 'expected error' } catch(e) {
  check(String(e).indexOf('test error') >= 0, 'original error lost')
}
check(isDef(_session) && !closed && !aborted && unsubscribed, 'non-timeout cleanup incorrect')
check((source.match(/var ev\s*= _sendAndWait\(mo\)/g) || []).length === 3, 'not all prompt paths use shared wait')
print('PASS: timeout forwarding, wrapped timeout cleanup, success/error cleanup, all prompt paths')

// Exercise the outer Java wait expiring before the SDK future completes.
setup()
future = new java.util.concurrent.CompletableFuture()
aOptions.timeout = 1
try { _sendAndWait({}); throw 'expected outer timeout' } catch(e) {
  check(String(e).indexOf('TimeoutException') >= 0, 'outer timeout lost')
}
check(future.isCancelled() && isUnDef(_session) && aborted && closed && unsubscribed, 'outer timeout not cancelled and retired')
print('PASS: outer wait timeout cancellation and cleanup')
