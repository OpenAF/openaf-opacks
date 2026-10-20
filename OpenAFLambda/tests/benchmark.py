#!/usr/bin/env python3
"""Compare OpenAF's validated CDS archive with -Xshare:off in the same deployment ZIP."""
import argparse
import json
import pathlib
import re
import statistics
import time
import types
import zipfile

import test_runtime as runtime


def median(values):
    return round(statistics.median(values), 2)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--zip", type=pathlib.Path, required=True)
    parser.add_argument("--arch", choices=("arm64", "x86_64"), default="arm64")
    parser.add_argument("--runs", type=int, default=7)
    parser.add_argument("--warm-events", type=int, default=20)
    parser.add_argument("--kind", choices=("js", "ojob"), default="ojob")
    parser.add_argument("--output", type=pathlib.Path, required=True)
    args = parser.parse_args()
    if args.runs < 2 or args.warm_events < 1:
        parser.error("Use at least two runs and one warm event")
    runtime.OPTIONS = types.SimpleNamespace(zip=args.zip, arch=args.arch)
    runtime.RuntimeTests.setUpClass()
    rows = []
    diagnostic = ""
    try:
        # Alternate order to reduce bias from filesystem/host warmup.
        for index in range(args.runs):
            for mode in (("auto", "off") if index % 2 == 0 else ("off", "auto")):
                test = runtime.RuntimeTests()
                test.setUp()
                try:
                    code = ('__pmOut = { uptimeMs: Number(java.lang.management.ManagementFactory.getRuntimeMXBean().getUptime()), '
                            'prepareJvmUptimeMs: io.readFileJSON(getEnv("OAF_LAMBDA_STATE") + "/runtime.json").prepareJvmUptimeMs };\n')
                    handler = "main.js" if args.kind == "js" else "main.json"
                    if args.kind == "js":
                        (test.function / handler).write_text(code)
                    else:
                        (test.function / handler).write_text(json.dumps({"ojob": {"sequential": True, "logToConsole": False},
                            "todo": ["Run"], "jobs": [{"name": "Run", "exec": code}]}))
                    start = time.monotonic()
                    test.start([{}] * (args.warm_events + 1), OAF_JAVA_XSHARE=mode, _HANDLER=handler)
                    test.wait(args.warm_events + 1)
                    if any(kind != "response" for kind, _ in test.fixture.responses):
                        raise RuntimeError(repr(test.fixture.responses) + test.logs.read_text())
                    first = test.fixture.responses[0][1]
                    if "prepareJvmUptimeMs" not in first:
                        raise RuntimeError("Rebuild the ZIP with benchmark timing support")
                    rows.append({"mode": mode, "run": index,
                        "coldWallMs": (test.fixture.received_at[0] - start) * 1000,
                        "coldJvmMs": first["uptimeMs"] + first["prepareJvmUptimeMs"],
                        "prepareJvmMs": first["prepareJvmUptimeMs"], "invokeJvmMs": first["uptimeMs"],
                        "warmMs": [(received - sent) * 1000 for sent, received in zip(test.fixture.sent_at[1:], test.fixture.received_at[1:])]})
                    print(json.dumps({key: value for key, value in rows[-1].items() if key != "warmMs"}), flush=True)
                finally:
                    test.tearDown()
        # Separate from timings: confirm auto actually maps OpenAF's archive instead of silently falling back.
        test = runtime.RuntimeTests()
        test.setUp()
        try:
            (test.function / "main.js").write_text('__pmOut = {ok: true};')
            test.start([{}], OAF_JAVA_XSHARE="auto", JAVA_TOOL_OPTIONS="-Xlog:cds=info")
            test.wait()
            diagnostic = test.logs.read_text()
            if ".shared.oaf" not in diagnostic or len(re.findall(r"Mapped static\s+region #0", diagnostic)) < 2:
                raise RuntimeError("CDS mapping was not confirmed:\n" + diagnostic)
        finally:
            test.tearDown()
    finally:
        runtime.RuntimeTests.tearDownClass()
    with zipfile.ZipFile(args.zip) as archive:
        manifest = json.loads(archive.read("build-manifest.json"))
        archive_bytes = sum(file.file_size for file in archive.infolist() if file.filename.endswith(".shared.oaf"))
    summary = {}
    for mode in ("auto", "off"):
        selected = [row for row in rows if row["mode"] == mode]
        summary[mode] = {"coldWallMedianMs": median([row["coldWallMs"] for row in selected]),
            "coldJvmMedianMs": median([row["coldJvmMs"] for row in selected]),
            "warmMedianMs": median([value for row in selected for value in row["warmMs"]])}
    result = {"artifact": str(args.zip), "architecture": args.arch, "workload": args.kind, "build": manifest,
              "environment": "Docker Desktop AL2023, 512 MiB, 1 CPU; new processes, warm host filesystem; not live AWS Lambda",
              "openafArchiveBytes": archive_bytes, "summary": summary, "samples": rows}
    result["cdsMappingVerified"] = True
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n")
    args.output.with_suffix(".cds.log").write_text(diagnostic)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
