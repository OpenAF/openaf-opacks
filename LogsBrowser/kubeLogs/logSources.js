// kubeLogs/logSources.js
//
// Log-source abstraction used by KubeLogsHTTPd.yaml.
//
// Every source registered under global.__logSources[name] must implement:
//   init(options)                                          -> void
//   listNamespaces()                                        -> [String]
//   listPods(namespace)                                      -> [{name, phase, containers:[{name,ready,restartCount}]}]
//   getLog(namespace, pod, container, opts)                   -> [{ts,pod,container,text}]   // one-shot; opts: {tailLines, order}
//   startTail(namespace, pod, container, onLine, onError)       -> {stop()}
//
// startTail is deliberately push-agnostic on the caller's side: the Kube
// implementation below wires a fabric8 LogWatch into onLine via a background
// thread (push). A future CloudWatch/S3 source would instead run an internal
// sleep-poll loop (GetLogEvents/getObjectStream) calling onLine on each new
// batch -- global.__logSessions below never needs to know the difference.
//
// global.__logSessions orchestrates SSE sessions (per-session queue,
// whitelisted transform piping, lifecycle) on top of whichever source a
// session names. None of that orchestration code is Kube-specific.

if (isUnDef(global.__logSources)) {

global.__logSources = {}

// ---------------------------------------------------------------------------
// Kube log source
// ---------------------------------------------------------------------------
var kube = {
	_conn: __,

	init: function(options) {
		loadLib("kube.js")
		// Empty map -> fabric8's ConfigBuilder().build() autoconfig, i.e. the
		// same kubeconfig resolution kubectl uses (KUBECONFIG env, ~/.kube/config,
		// or in-cluster service account).
		kube._conn = $kube({})
		if (isDef(options) && isDef(options.kubeContext) && String(options.kubeContext).length > 0) {
			kube._conn._k.setContext(String(options.kubeContext))
		}
	},

	listNamespaces: function() {
		// Deliberately bypasses Kube.prototype.getNamespaces()/__displayResult():
		// - getNamespaces(false) makes a raw HTTP call to `this.url + "/api/v1/pods"`,
		//   and this.url is undefined for local-kubeconfig connections -> throws.
		// - getNamespaces(true) routes through __displayResult(), which returns a
		//   plain array with capitalized/reflected keys (not the {items:[...]}
		//   shape one might expect), which is fragile to depend on.
		// Going straight at the fabric8 client sidesteps both issues.
		var items = kube._conn._k.client.namespaces().list().getItems()
		var out = []
		for (var i = 0; i < items.size(); i++) {
			out.push(String(items.get(i).getMetadata().getName()))
		}
		return out
	},

	listPods: function(namespace) {
		// Same reasoning as listNamespaces(): Kube.prototype.__displayResult's
		// full=false path wraps any java.util.List getter result (e.g.
		// getContainers()) as a single-element array containing the raw List
		// object, then tries to reflect getters off it -- which yields nothing
		// usable. Container names aren't reliably obtainable through the
		// wrapper's default path, so walk the fabric8 objects by hand instead.
		var items = kube._conn._k.client.inNamespace(namespace).pods().list().getItems()
		var out = []
		for (var i = 0; i < items.size(); i++) {
			try {
				var p = items.get(i)
				var statuses = {}
				var status = p.getStatus()
				if (!isNull(status) && !isNull(status.getContainerStatuses())) {
					var stList = status.getContainerStatuses()
					for (var k = 0; k < stList.size(); k++) {
						var s = stList.get(k)
						statuses[String(s.getName())] = {
							ready       : Boolean(s.getReady()),
							restartCount: Number(s.getRestartCount())
						}
					}
				}

				var containers = p.getSpec().getContainers()
				var cs = []
				for (var j = 0; j < containers.size(); j++) {
					var cName = String(containers.get(j).getName())
					var st = statuses[cName] || {}
					cs.push({
						name        : cName,
						ready       : isDef(st.ready) ? st.ready : false,
						restartCount: isDef(st.restartCount) ? st.restartCount : 0
					})
				}

				out.push({
					name      : String(p.getMetadata().getName()),
					phase     : (!isNull(status) && !isNull(status.getPhase())) ? String(status.getPhase()) : "Unknown",
					containers: cs
				})
			} catch(ePod) {
				// Skip a pod we can't fully read rather than failing the whole listing.
			}
		}
		return out
	},

	getLog: function(namespace, pod, container, opts) {
		opts = opts || {}
		var c = kube._conn._k.client.inNamespace(namespace).pods().withName(pod).inContainer(container)
			.usingTimestamps()
			.tailingLines(Number(opts.tailLines) || 200)
		var raw = String(c.getLog())
		var parse = __klParseTimestampedLine(pod, container)
		var lines = raw.split("\n").filter(l => l.length > 0).map(parse)
		if (opts.order === "desc") lines.reverse()
		return lines
	},

	startTail: function(namespace, pod, container, onLine, onError) {
		return __klStartKubeWatcher(namespace, pod, container, onLine, onError)
	}
}

global.__logSources.kube = kube

// fabric8's usingTimestamps() prefixes each line with an RFC3339 timestamp
// followed by a single space, e.g. "2026-08-05T10:11:12.123456789Z the log line".
function __klParseTimestampedLine(pod, container) {
	return function(rawLine) {
		var m = /^(\S+)\s(.*)$/.exec(rawLine)
		return m ? { ts: m[1], pod: pod, container: container, text: m[2] }
		         : { ts: __,   pod: pod, container: container, text: rawLine }
	}
}

function __klStartKubeWatcher(namespace, pod, container, onLine, onError) {
	var pos = new java.io.PipedOutputStream()
	var pis = new java.io.PipedInputStream(pos)
	var stopped = false
	var logWatch

	try {
		var c = kube._conn._k.client.inNamespace(namespace).pods().withName(pod).inContainer(container)
			.usingTimestamps()
			.tailingLines(Number((global.__kubeLogs || {}).tailLines) || 200)
		logWatch = c.watchLog(pos)
	} catch(e) {
		try { pos.close() } catch(e2) {}
		onError("failed to start watcher for " + pod + "/" + container + ": " + String(e))
		return { stop: function() {} }
	}

	var parse = __klParseTimestampedLine(pod, container)

	$doV(function() {
		var br = new java.io.BufferedReader(new java.io.InputStreamReader(pis, "UTF-8"))
		try {
			var line
			while ((line = br.readLine()) != null) {
				if (stopped) break
				try {
					onLine(parse(String(line)))
				} catch(eLine) {
					onError("line handling error for " + pod + "/" + container + ": " + String(eLine))
				}
			}
		} catch(eRead) {
			// Expected when stop() closes the piped streams -- only report if we
			// didn't cause it ourselves.
			if (!stopped) onError("watcher read error for " + pod + "/" + container + ": " + String(eRead))
		} finally {
			try { br.close() } catch(e3) {}
		}
	})

	return {
		// A thread blocked in readLine() on a pipe can't be woken by a flag --
		// closing the LogWatch then the PipedOutputStream is what makes
		// readLine() return/throw and let the reader thread actually exit.
		stop: function() {
			if (stopped) return
			stopped = true
			try { logWatch.close() } catch(e) {}
			try { pos.close() } catch(e) {}
			try { pis.close() } catch(e) {}
		}
	}
}

// ---------------------------------------------------------------------------
// Whitelisted transform pipe: one long-lived subprocess per (session, pod,
// container) watcher that has a transform attached -- not one per line.
// Filters like grep/sed/jq block-buffer stdout the moment it isn't a tty, so
// whitelist commands must be explicitly line-buffered (documented in the
// ojob's init: pipeTransforms comment); spawning fresh per line would also
// make streaming/ordering impossible.
// ---------------------------------------------------------------------------
function __klWrapWithTransform(cmd, pod, container, deliver, onError) {
	var pb = new java.lang.ProcessBuilder(["/bin/sh", "-c", cmd])
	pb.redirectErrorStream(false)
	var proc = pb.start()
	var stdin  = new java.io.PrintWriter(new java.io.OutputStreamWriter(proc.getOutputStream(), "UTF-8"), true)
	var stdout = new java.io.BufferedReader(new java.io.InputStreamReader(proc.getInputStream(), "UTF-8"))
	// FIFO of timestamps for lines currently in flight through the transform.
	// Best-effort pairing: a transform that DROPS lines (e.g. `grep -v`) will
	// cause the remaining timestamps to shift by one -- acceptable for
	// single-line filters, not exact request/response correlation.
	var pending = new Packages.java.util.concurrent.ConcurrentLinkedQueue()
	var stopped = false

	$doV(function() {
		try {
			var out
			while ((out = stdout.readLine()) != null) {
				if (stopped) break
				var meta = pending.poll()
				deliver({ ts: meta ? meta.ts : __, pod: pod, container: container, text: String(out) })
			}
		} catch(e) {
			if (!stopped) onError("transform reader error for " + pod + "/" + container + ": " + String(e))
		}
	})

	return {
		send: function(lineObj) {
			pending.add({ ts: lineObj.ts })
			try {
				stdin.println(lineObj.text)
			} catch(e) {
				onError("transform stdin error for " + pod + "/" + container + ": " + String(e))
			}
		},
		stop: function() {
			if (stopped) return
			stopped = true
			try { stdin.close() } catch(e) {}
			try { proc.destroy() } catch(e) {}
			try { if (proc.isAlive()) proc.destroyForcibly() } catch(e) {}
		}
	}
}

// ---------------------------------------------------------------------------
// Session orchestration (source-agnostic: only uses global.__logSources[name]
// and global.__kubeLogs config -- no Kube-specific code below this point).
// ---------------------------------------------------------------------------
global.__logSessions = {

	// opts: { source, namespace, targets:[{pod,container}], transform, tailLines, order }
	create: function(opts) {
		opts = opts || {}
		var sourceName = _$(opts.source).isString().default("kube")
		var source = global.__logSources[sourceName]
		if (isUnDef(source)) throw "Unknown log source '" + sourceName + "'"

		if (isUnDef(opts.namespace) || String(opts.namespace).length == 0) throw "namespace is required"

		var transformKey = _$(opts.transform).isString().default("none")
		if (isUnDef(global.__kubeLogs.transforms) || isUnDef(global.__kubeLogs.transforms[transformKey])) {
			throw "Unknown transform '" + transformKey + "'"
		}

		var uuid = String(genUUID())
		var sess = {
			uuid        : uuid,
			source      : sourceName,
			namespace   : String(opts.namespace),
			transform   : transformKey,
			queue       : new Packages.java.util.concurrent.ConcurrentLinkedQueue(),
			watchers    : {},
			closed      : false,
			droppedCount: 0,
			lastActivity: Date.now()
		}
		global.__kubeLogs.sessions[uuid] = sess

		var targets = isArray(opts.targets) ? opts.targets : []
		targets.forEach(function(t) {
			global.__logSessions.__addWatcher(sess, source, String(t.pod), String(t.container))
		})

		return uuid
	},

	update: function(uuid, add, remove) {
		var sess = global.__kubeLogs.sessions[uuid]
		if (isUnDef(sess) || sess.closed) throw "Unknown or closed session"
		var source = global.__logSources[sess.source]

		;(remove || []).forEach(function(t) {
			var key = t.pod + "/" + t.container
			if (isDef(sess.watchers[key])) {
				try { sess.watchers[key].stop() } catch(e) {}
				delete sess.watchers[key]
			}
		})
		;(add || []).forEach(function(t) {
			global.__logSessions.__addWatcher(sess, source, String(t.pod), String(t.container))
		})
	},

	stop: function(uuid) {
		var sess = global.__kubeLogs.sessions[uuid]
		if (isUnDef(sess)) return
		for (var key in sess.watchers) {
			try { sess.watchers[key].stop() } catch(e) {}
		}
		sess.watchers = {}
		sess.closed = true
	},

	readBody: function(request) {
		var bodyText
		if (isDef(request.files) && isDef(request.files.postData)) bodyText = request.files.postData
		else if (isDef(request.data)) bodyText = request.data
		if (isUnDef(bodyText)) return {}
		try {
			var parsed = jsonParse(bodyText)
			return isMap(parsed) ? parsed : {}
		} catch(e) {
			return {}
		}
	},

	__addWatcher: function(sess, source, pod, container) {
		var key = pod + "/" + container
		if (isDef(sess.watchers[key])) return

		var enqueue = function(lineObj) { global.__logSessions.__enqueue(sess, lineObj) }
		var onError = function(msg) {
			global.__logSessions.__enqueue(sess, { ts: __, pod: pod, container: container, text: "[watcher error] " + msg, isError: true })
		}

		var transformCmd = global.__kubeLogs.transforms[sess.transform]
		var transformHandle, onLine
		if (sess.transform !== "none" && isString(transformCmd) && transformCmd.length > 0) {
			transformHandle = __klWrapWithTransform(transformCmd, pod, container, enqueue, onError)
			onLine = function(lineObj) { transformHandle.send(lineObj) }
		} else {
			onLine = enqueue
		}

		var watcher = source.startTail(sess.namespace, pod, container, onLine, onError)
		sess.watchers[key] = {
			stop: function() {
				try { watcher.stop() } catch(e) {}
				if (transformHandle) try { transformHandle.stop() } catch(e) {}
			}
		}
	},

	__enqueue: function(sess, lineObj) {
		sess.queue.add(lineObj)
		sess.lastActivity = Date.now()
		if (sess.queue.size() > (global.__kubeLogs.maxSessionQueue || 5000)) {
			sess.queue.poll()
			sess.droppedCount++
		}
	}
}

} // isUnDef(global.__logSources)
