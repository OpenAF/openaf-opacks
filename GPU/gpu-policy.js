exports.bucket = function(length) { return Math.floor(Math.log(Math.max(1, length)) / Math.LN2) }
exports.select = function(options, length, history) {
  if (options.backend == "cpu") return "explicit-cpu"
  if (length == 0) return "empty-workload"
  if ((options.backend == "opencl" || options.backend == "metal")) return "gpu-trial"
  if (length < options.minElements) return "below-workload-threshold"
  if (history.calls < 2) return "waiting-for-reuse"
  if (history.failed) return "previous-backend-failure"
  // Periodically measure actual CPU calls, never duplicate a user's call for calibration.
  if (history.gpuCount && history.calls % 16 == 0) return "cpu-calibration"
  if (history.gpuCount && history.cpuCount && history.gpuMs >= history.cpuMs * 0.9
      && history.calls % 16 != 1) return "observed-cpu-faster"
  return "gpu-trial"
}

// Opt-in multi-backend learning. Calibration consumes ordinary calls, never duplicates them.
exports.adaptive = function(history) {
  var candidates = history.candidates || []
  var usable = candidates.filter(function(c) { return !c.failed })
  if (!usable.length) return { reason: candidates.length ? "previous-backend-failure" : "gpu-unavailable" }
  if (history.calls % 32 == 0) return { reason: "cpu-calibration" }
  var pending = usable.filter(function(c) { return c.samples < 3 })[0]
  if (pending) return { reason: "gpu-trial", candidate: pending }
  if (history.cpuWarmSamples < 14) return { reason: "cpu-calibration" }
  // Refresh one backend every 32 calls; failure stays suppressed until cache reset.
  if (history.calls % 32 == 1) {
    var candidate = usable[history.refresh % usable.length]
    history.refresh++
    return { reason: "gpu-trial", candidate: candidate }
  }
  var best = usable.slice().sort(function(a,b) { return a.ms - b.ms })[0]
  return best.ms < history.cpuMs * 0.9
    ? { reason: "gpu-trial", candidate: best } : { reason: "observed-cpu-faster" }
}
