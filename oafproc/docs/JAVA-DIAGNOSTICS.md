# Java diagnostics

Use a supported modern OpenAF collector to inspect Java 8–27 HotSpot targets. Availability depends on target commands, modules, ownership and namespaces. The live version matrix is not yet validated. External reduced-runtime attach currently uses OpenAF's Linux Java 16+ socket fallback; installed OpenAF must include the new diagnostic APIs.

## Collect and analyze

```sh
oafp in=javadiag javapid=123 javadiagop=capabilities out=json
oafp in=javadiag javapid=123 loop=2 loopcount=10 out=ndjson outfile=samples.ndjson outfileappend=true
oafp file=samples.ndjson in=ndjson ndjsonjoin=true out=javareport
oafp in=jcmd javapid=123 jcmdcommand=GC.heap_info out=raw
oafp in=javadiag javapid=123 javadiagop=threads out=raw path=data
oafp in=javastacks file=threads.txt out=javareport
oafp in=javaoom file=application.log out=javareport
oafp in=hprof file=heap.hprof.gz hprofmode=summary out=json
oafp in=javagc file=gc.log javagcjoin=true out=javareport
oafp in=jfr file=recording.jfr jfrjoin=true 'javaoptions=(events: [jdk.ExecutionSample], maxEvents: 10000)' out=javareport
```

JFR selection requires the updated OpenAF parser. GC reports summarize recognized events; concurrent event duration is not application pause time. JFR profile groups report observed stack samples, event bytes and durations; sample counts do not establish CPU time or total allocation. Full-stack grouping is currently for text platform-thread dumps; JSON dumps are preserved for subsequent analysis.

Histograms may collect/pause. Heap dumps and JFR start/dump/stop are explicit operations. Dump paths belong to the target filesystem. Do not retry a timed-out capture: the JVM may still be executing it. oafp requests isolated external diagnostic workers by default (`javaoptions.isolated=true`). Updated OpenAF enforces helper deadlines/output limits; loopduration itself only bounds scheduling.

## Export evidence

```sh
oafp file=samples.ndjson in=ndjson ndjsonjoin=true out=javabundle javabundledir=incident-001
oafp in=javadiag javadiagop=bundle javabundledir=incident-001 out=javareport
```

Review bundles before deliberate transfer. The manifest describes exclusions and SHA-256 file checksums. Default export excludes raw/value/context/sensitive-key fields and limits lists/text; it cannot guarantee anonymization. Original dumps remain external. Reports identify source evidence and missing sections. A snapshot after failure cannot prove a prior leak, OOM cause or kernel kill. HPROF serialized payload bytes exclude object headers/alignment and are not retained heap.

For counter rates use `counterdelta=(identity: target, timestamp: timestamp, counters: [counter])` with timestamped records. First sample, counter decrease or invalid interval has no rate. Use process-start identity rather than PID alone when available.

## Kubernetes and gcutils

Inspect the actual collector before use; published gcutils images may contain older OpenAF/oafp versions. Pin a tested image tag/digest. Existing gcutils JFR and hsperf jobs remain useful; dashboard services are optional.

```sh
kubectl --context CONTEXT -n NAMESPACE debug pod/POD -it --container=java-debug --target=APP_CONTAINER --image=nmaguiar/gcutils:TESTED_TAG --profile=general -- /bin/bash
```

`--target` requests target process namespace visibility, subject to runtime support; it does not share the application root filesystem. Locate the JVM with `ps` and verify `/proc/PID/status`, owner and `/proc/PID/root`. A root shell alone does not satisfy same-owner attach. Select UID/security settings through an appropriate custom debug profile; profile support depends on kubectl version and admission policy. `netadmin` is not a general JVM attach requirement. Ephemeral-container RBAC and Pod Security restrictions may prevent debugging.

Use `/proc/PID/root/tmp/...` to read accessible target artifacts. A GC.heap_dump filename is interpreted inside the target filesystem, even when the command originates in a debug container. Copy selected artifacts into a directory owned by the collector before bundling.

```sh
kubectl --context CONTEXT -n NAMESPACE cp -c java-debug POD:/tmp/incident-001 ./incident-001
# If tar is unavailable, stream individual files:
kubectl --context CONTEXT -n NAMESPACE exec POD -c java-debug -- cat /tmp/incident-001/manifest.json > manifest.json
kubectl --context CONTEXT -n NAMESPACE logs POD -c APP_CONTAINER --previous > previous.log
kubectl --context CONTEXT -n NAMESPACE get pod POD -o json > pod-status.json
```

Collect termination state, restart count, limits and time-scoped events explicitly. Correlate OOMKilled with cgroup evidence; exit 137 alone does not prove OOM. A copied debug pod runs a different process and cannot recover vanished process memory. Ephemeral containers cannot be individually removed from an existing pod; terminate the debug process and preserve artifacts before pod removal. Separately created debug pods require explicit cleanup.

For Docker/Podman run a tested gcutils image with target PID namespace access (`--pid=container:NAME`) and deliberate filesystem/UID access. Avoid granting privileges unrelated to the needed evidence. Host/node debugging requires additional rights and explicit operational approval.

Updated OpenAF resolves namespace PIDs and target-root socket locations on Linux. For explicitly enabled namespace entry, pass `javaoptions` with `transport: nsenter`, an absolute `nsenterPath`, and `nsenterHelper` as an argument array naming a preinstalled modern OpenAF launcher and `js/java-diagnostic-helper.js` inside the target mount namespace. The caller must already have namespace-entry privileges. The helper runs as the target UID/GID; runtime and output limits apply. Live container verification is outstanding. External Attach API isolation is available with `isolated:true`; a rebuilt OpenAF runtime is required in the child JVM too. Entering the target mount namespace may hide the collector executable/JRE; verify helper paths first. Never automatically escalate privileges or install tools in the target container.

Official references: [debug running pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/), [kubectl debug](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/).
