#!/usr/bin/env python3
"""Runs inside the architecture-specific AL2023 builder."""
import datetime
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tarfile
import zipfile

ROOT = pathlib.Path("/var/task")
OUTPUT = pathlib.Path("/output")
JAVA = ROOT / "jre/bin/java"
JAR = ROOT / "openaf/openaf.jar"
ENV = dict(os.environ, OAF_HOME=str(ROOT / "openaf"))
VM_OPTIONS = ["--enable-native-access=ALL-UNNAMED", "--add-opens=java.base/java.util=ALL-UNNAMED", "-XX:+UseCompactObjectHeaders"]


def digest(file):
    result = hashlib.sha256()
    with file.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def tree_digest(directory):
    result = hashlib.sha256()
    for file in sorted(directory.rglob("*")):
        if file.is_file():
            result.update(file.relative_to(directory).as_posix().encode())
            result.update(b"\0" + bytes.fromhex(digest(file)))
    return result.hexdigest()


def download(url, target):
    subprocess.run(["curl", "--fail", "--location", "--retry", "3", "--output", str(target), url], check=True)


def java(*arguments):
    subprocess.run([str(JAVA), "-Xshare:off", *VM_OPTIONS, "-jar", str(JAR), *arguments], cwd=JAR.parent, env=ENV, check=True)


def main():
    architecture = {"amd64": "x86_64", "arm64": "arm64"}[os.environ["TARGETARCH"]]
    jre_arch = "x64" if architecture == "x86_64" else "aarch64"
    version = os.environ.get("JAVA_VERSION", "25")
    distribution = os.environ.get("OPENAF_DIST", "stable")
    provider = os.environ.get("JRE_PROVIDER", "temurin")
    ROOT.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (ROOT / "jre").mkdir()
    JAR.parent.mkdir()
    jre_url = "https://api.adoptium.net/v3/binary/latest/" + version + "/ga/linux/" + jre_arch + "/jre/hotspot/normal/eclipse"
    if provider == "corretto":
        jre_url = "https://corretto.aws/downloads/latest/amazon-corretto-" + version + "-" + ("x64" if architecture == "x86_64" else "aarch64") + "-linux-jdk.tar.gz"
    download(jre_url, pathlib.Path("/tmp/jre.tgz"))
    jre_hash = digest(pathlib.Path("/tmp/jre.tgz"))
    # tar preserves the JRE's relative links; strip its single top-level directory.
    with tarfile.open("/tmp/jre.tgz") as archive:
        for member in archive.getmembers():
            parts = pathlib.PurePosixPath(member.name).parts
            if ".." in parts or member.name.startswith("/"):
                raise ValueError("Invalid JRE archive path")
    subprocess.run(["tar", "xzf", "/tmp/jre.tgz", "--strip-components=1", "-C", str(ROOT / "jre")], check=True)
    if provider == "corretto":
        # Corretto publishes a JDK: use its matching jlink to produce a runtime without developer files.
        linked = ROOT / "linked-jre"
        subprocess.run([str(ROOT / "jre/bin/jlink"), "--module-path", str(ROOT / "jre/jmods"), "--add-modules", "ALL-MODULE-PATH", "--strip-debug",
                        "--no-man-pages", "--no-header-files", "--compress=zip-6", "--output", str(linked)], check=True)
        shutil.rmtree(ROOT / "jre")
        linked.rename(ROOT / "jre")
    shutil.rmtree(ROOT / "jre/man", ignore_errors=True)
    cds = os.environ.get("CDS_MODE", "off")
    local_jar = pathlib.Path("/inputs/openaf.jar")
    openaf_url = "https://openaf.io/" + ("" if distribution == "stable" else distribution + "/") + "openaf.jar.repacked"
    if local_jar.exists():
        shutil.copy2(local_jar, JAR)
    else:
        download(openaf_url, JAR)
    inputs = {"jre": {"source": jre_url, "sha256": jre_hash},
              "openaf": {"source": "local" if local_jar.exists() else openaf_url, "sha256": digest(JAR)}, "opacks": []}
    local_opacks = sorted(pathlib.Path("/inputs/opacks").iterdir())
    # Read local package names so a source override does not first install its published counterpart.
    local_names = set()
    for package in local_opacks:
        inspect = pathlib.Path("/tmp/inspect-opack.js")
        pathlib.Path("/tmp/opack-name").unlink(missing_ok=True)
        inspect.write_text("var p = " + json.dumps(str(package)) + ";\n" +
            'if (io.fileInfo(p).isDirectory) {\n'
            '  var m = io.fileExists(p + "/.package.yaml") ? io.readFileYAML(p + "/.package.yaml") : io.readFileJSON(p + "/.package.json");\n'
            '} else {\n'
            '  plugin("ZIP"); var z = new ZIP(io.readFileBytes(p)); var entries = z.list();\n'
            '  var m = isDef(entries[".package.yaml"]) ? af.fromYAML(af.fromBytes2String(z.getFile(".package.yaml"))) : jsonParse(af.fromBytes2String(z.getFile(".package.json"))); z.close();\n'
            '}\n'
            'io.writeFileString("/tmp/opack-name", m.name);\n')
        java("-f", str(inspect))
        local_names.add(pathlib.Path("/tmp/opack-name").read_text().strip().lower())
        inputs["opacks"].append({"source": package.name, "sha256": tree_digest(package) if package.is_dir() else digest(package)})
    packages = [p for p in os.environ.get("OPACKS", "AWS,oJob-common").split(",") if p]
    # AWS is part of the runtime contract even when OPACKS is overridden.
    if not any(p.lower() == "aws" for p in packages):
        packages.insert(0, "AWS")
    for package in packages:
        if package.lower() not in local_names:
            java("--opack", "-e", "install " + package)
    for package in local_opacks:
        java("--opack", "-e", "install " + str(package) + " -force")
    probe = pathlib.Path("/tmp/manifest.js")
    probe.write_text('loadLib("aws_s3.js");\n'
        'if (!isFunction(AWS.prototype.S3_GetPresignedURL)) throw "AWS opack lacks S3 presigning support; supply a current local AWS opack.";\n'
        'io.writeFileJSON("/tmp/versions.json", { openaf: getVersion(), distribution: getDistribution(), java: String(java.lang.System.getProperty("java.version")), opacks: Object.keys(getOPackLocalDB()).map(k => ({ name: getOPackLocalDB()[k].name, version: getOPackLocalDB()[k].version })) });\n')
    java("-f", str(probe))
    if not pathlib.Path("/tmp/versions.json").exists():
        raise RuntimeError("OpenAF manifest probe failed")
    versions = json.loads(pathlib.Path("/tmp/versions.json").read_text())
    installed = {entry["name"].lower() for entry in versions["opacks"]}
    missing = (set(p.lower() for p in packages) | local_names) - installed
    if missing:
        raise RuntimeError("Opacks failed to install: " + ", ".join(sorted(missing)))
    if cds == "auto":
        # No generated launcher exists: OpenAF trains with this exact process's VM options.
        # Use the install/repack archive generator directly: repacking a local custom JAR
        # can otherwise download an official original and replace the selected input.
        java("-c", "require(getOpenAFJar() + '::js/repackCDS.js').create()")
        shared = JAR.parent / ".shared.oaf"
        if not shared.is_file():
            raise RuntimeError("OpenAF did not generate .shared.oaf")
        checked = subprocess.run([str(JAVA), *VM_OPTIONS, "-Xshare:on", "-XX:SharedArchiveFile=" + str(shared),
                                  "-XX:+PrintSharedArchiveAndExit", "-jar", str(JAR)],
                                 cwd=JAR.parent, env=ENV, capture_output=True, text=True)
        pathlib.Path("/tmp/cds-validation.log").write_text(checked.stdout + checked.stderr)
        if checked.returncode or "archive is valid" not in checked.stdout + checked.stderr:
            raise RuntimeError("OpenAF archive does not match Lambda JVM flags: " + checked.stdout[-1000:] + checked.stderr[-1000:])
    # Only OpenAF's validated archive is used; remove Temurin's unused default variants.
    for archive in (ROOT / "jre").rglob("*.jsa"):
        archive.unlink()
    (JAR.parent / "openaf.jar.orig").unlink(missing_ok=True)
    manifest = {"architecture": architecture, "runtime": "provided.al2023", "cds": cds, "jreProvider": provider, "builtAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "inputs": inputs, "versions": versions, "installedJarSha256": digest(JAR)}
    if cds == "auto":
        manifest["cdsArchive"] = {"sha256": digest(shared), "bytes": shared.stat().st_size, "validated": True}
    (ROOT / "build-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


def package():
    manifest = json.loads((ROOT / "build-manifest.json").read_text())
    architecture = manifest["architecture"]
    shutil.copytree("/builder/runtime", ROOT / "runtime")
    (ROOT / "runtime/xshare").write_text(manifest["cds"] + "\n")
    shutil.copy2(ROOT / "runtime/bootstrap", ROOT / "bootstrap")
    (ROOT / "bootstrap").chmod(0o755)
    shutil.copytree("/inputs/function", ROOT / "function", symlinks=True)
    manifest.update(runtimeSha256=tree_digest(ROOT / "runtime"), workloadSha256=tree_digest(ROOT / "function"))
    (ROOT / "build-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    archive_path = OUTPUT / ("openaf-lambda-" + architecture + ".zip")
    total = 0
    with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for file in sorted(ROOT.rglob("*")):
            if file.is_symlink() and not (file.is_file() and
                    str(file.resolve()).startswith(str(ROOT / "jre") + "/")):
                raise ValueError("Deployment package contains unsupported symlink: " + str(file))
            if file.is_file():
                total += file.stat().st_size
                archive.write(file, file.relative_to(ROOT))
    if total > 250 * 1024 * 1024:
        archive_path.unlink()
        raise ValueError("Uncompressed deployment exceeds Lambda's 250 MiB limit: " + str(total))
    manifest.update(uncompressedBytes=total, compressedBytes=archive_path.stat().st_size, sha256=digest(archive_path))
    (OUTPUT / ("openaf-lambda-" + architecture + ".manifest.json")).write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    if "--package" in sys.argv:
        package()
    else:
        main()
