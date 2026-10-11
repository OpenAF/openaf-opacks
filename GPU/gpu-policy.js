exports.bucket = function(length) { return Math.floor(Math.log(Math.max(1, length)) / Math.LN2) }
exports.select = function(options, length, history) {
  if (options.backend == "cpu") return "explicit-cpu"
  if (length == 0) return "empty-workload"
  if (options.backend == "opencl") return "gpu-trial"
  if (length < options.minElements) return "below-workload-threshold"
  if (history.calls < 2) return "waiting-for-reuse"
  if (history.failed) return "previous-backend-failure"
  // Periodically measure actual CPU calls, never duplicate a user's call for calibration.
  if (history.gpuCount && history.calls % 16 == 0) return "cpu-calibration"
  if (history.gpuCount && history.cpuCount && history.gpuMs >= history.cpuMs * 0.9
      && history.calls % 16 != 1) return "observed-cpu-faster"
  return "gpu-trial"
}
