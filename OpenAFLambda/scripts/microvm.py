#!/usr/bin/env python3
"""Package an existing OpenAF Lambda runtime as a Lambda MicroVM image source ZIP."""
import argparse
import hashlib
import json
import pathlib
import stat
import zipfile

SOURCE = pathlib.Path(__file__).resolve().parents[1]


def package(runtime_zip, output):
    output = pathlib.Path(output)
    output.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(runtime_zip) as original:
        manifest = json.loads(original.read("build-manifest.json"))
        # The current AWS service model supports ARM_64 only. Fail before upload.
        if manifest["architecture"] != "arm64":
            raise ValueError("Lambda MicroVM images currently require an arm64 runtime ZIP.")
        seen = set()
        for entry in original.infolist():
            path = pathlib.PurePosixPath(entry.filename)
            if path.is_absolute() or ".." in path.parts or "\\" in entry.filename or entry.filename in seen:
                raise ValueError("Unsafe or duplicate runtime ZIP entry: " + entry.filename)
            seen.add(entry.filename)
            if stat.S_ISLNK(entry.external_attr >> 16):
                raise ValueError("Runtime ZIP symlinks are unsupported.")
        required = {"bootstrap", "runtime/lambda.js", "jre/bin/java", "openaf/openaf.jar"}
        if not required.issubset(seen):
            raise ValueError("Incomplete OpenAF runtime ZIP.")
        target = output / "openaf-microvm-arm64.zip"
        # Reuse Java/opacks from the input, but use this package's current runtime
        # so older function ZIPs gain the snapshot-safe MicroVM transport.
        replacements = {"runtime/lambda.js": (SOURCE / "runtime/lambda.js").read_bytes(),
                        "runtime/bootstrap": (SOURCE / "runtime/bootstrap").read_bytes(),
                        "bootstrap": (SOURCE / "runtime/bootstrap").read_bytes()}
        runtime_hash = hashlib.sha256()
        for entry in sorted(original.infolist(), key=lambda item: item.filename):
            if entry.filename.startswith("runtime/") and not entry.is_dir():
                data = replacements.get(entry.filename)
                if data is None:
                    data = original.read(entry)
                runtime_hash.update(entry.filename[len("runtime/"):].encode())
                runtime_hash.update(b"\0" + hashlib.sha256(data).digest())
        manifest["runtimeSha256"] = runtime_hash.hexdigest()
        replacements["build-manifest.json"] = (json.dumps(manifest, indent=2) + "\n").encode()
        with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
            for entry in original.infolist():
                copied = zipfile.ZipInfo("payload/" + entry.filename, entry.date_time)
                copied.external_attr = entry.external_attr
                copied.compress_type = zipfile.ZIP_DEFLATED
                data = replacements.get(entry.filename)
                archive.writestr(copied, original.read(entry) if data is None else data)
            archive.write(SOURCE / "microvm/Dockerfile", "Dockerfile")
    result = {"target": "lambda-microvm-image-source", "architecture": "ARM_64",
              "runtimeZipSha256": hashlib.sha256(pathlib.Path(runtime_zip).read_bytes()).hexdigest(),
              "sha256": hashlib.sha256(target.read_bytes()).hexdigest(), "bytes": target.stat().st_size,
              "runtime": manifest, "ports": {"application": 8080, "hooks": 8081}}
    target.with_suffix(".manifest.json").write_text(json.dumps(result, indent=2) + "\n")
    print("MicroVM image source: " + str(target))
    return target


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runtime-zip", required=True, type=pathlib.Path)
    parser.add_argument("--output", type=pathlib.Path, default=pathlib.Path("output"))
    args = parser.parse_args()
    package(args.runtime_zip, args.output)


if __name__ == "__main__":
    main()
