#!/usr/bin/env python3
"""Build OpenAF Lambda function ZIPs or MicroVM image sources with Docker Buildx."""
import argparse
import pathlib
import re
import shutil
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--arch", choices=("both", "x86_64", "arm64"), default="both")
    parser.add_argument("--target", choices=("function", "microvm"), default="function")
    parser.add_argument("--java", default="25", help="Java major version (25 or later)")
    parser.add_argument("--jre-provider", choices=("temurin", "corretto"), default="temurin")
    parser.add_argument("--dist", default="stable", help="OpenAF stable, nightly or edge distribution")
    parser.add_argument("--cds", choices=("auto", "off"), default="auto", help="Generate OpenAF's shared archive for auto, or omit it for off")
    parser.add_argument("--opacks", default="AWS,oJob-common", help="Comma-separated additional/default published opacks")
    parser.add_argument("--openaf-jar", type=pathlib.Path, help="Local repacked OpenAF JAR")
    parser.add_argument("--opack", action="append", type=pathlib.Path, default=[], help="Local .opack or source directory; repeatable")
    parser.add_argument("--workload", type=pathlib.Path, help="Directory to embed as function/")
    parser.add_argument("--output", type=pathlib.Path, default=pathlib.Path("output"))
    args = parser.parse_args()
    if args.target == "microvm":
        if args.arch == "x86_64":
            parser.error("Lambda MicroVM images currently support arm64 only")
        args.arch = "arm64"
    if not re.fullmatch(r"[0-9]+", args.java) or int(args.java) < 25 or not re.fullmatch(r"[A-Za-z0-9_-]+", args.dist):
        parser.error("Invalid Java version or distribution")
    if args.opacks and not re.fullmatch(r"[A-Za-z0-9_.-]+(?:,[A-Za-z0-9_.-]+)*", args.opacks):
        parser.error("Invalid opack list")
    source = pathlib.Path(__file__).resolve().parents[1]
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    # Keep local inputs isolated; never edit the sibling source checkouts.
    with tempfile.TemporaryDirectory(prefix="openaf-lambda-build-") as temporary:
        context = pathlib.Path(temporary)
        shutil.copy2(source / "Dockerfile", context / "Dockerfile")
        shutil.copytree(source / "scripts", context / "scripts", ignore=shutil.ignore_patterns("__pycache__"))
        shutil.copytree(source / "runtime", context / "runtime")
        inputs = context / "inputs"
        (inputs / "opacks").mkdir(parents=True)
        if args.openaf_jar:
            shutil.copy2(args.openaf_jar, inputs / "openaf.jar")
        names = set()
        for local in args.opack:
            local = local.resolve()
            if not re.fullmatch(r"[A-Za-z0-9_.-]+", local.name) or local.name in names:
                parser.error("Local opack basenames must be unique and contain only letters, digits, dots, underscores or hyphens")
            names.add(local.name)
            target = inputs / "opacks" / local.name
            if local.is_dir():
                shutil.copytree(local, target, ignore=shutil.ignore_patterns(".git", "__pycache__"))
            else:
                shutil.copy2(local, target)
        if args.workload:
            shutil.copytree(args.workload, inputs / "function", symlinks=True)
        else:
            shutil.copytree(source / "examples" / "ojob", inputs / "function")
        architectures = ("x86_64", "arm64") if args.arch == "both" else (args.arch,)
        for architecture in architectures:
            docker_arch = "amd64" if architecture == "x86_64" else "arm64"
            subprocess.run([
                "docker", "buildx", "build", "--platform", "linux/" + docker_arch,
                "--target", "artifacts", "--output", "type=local,dest=" + str(output),
                "--build-arg", "JAVA_VERSION=" + args.java,
                "--build-arg", "JRE_PROVIDER=" + args.jre_provider,
                "--build-arg", "OPENAF_DIST=" + args.dist,
                "--build-arg", "OPACKS=" + args.opacks,
                "--build-arg", "CDS_MODE=" + args.cds,
                str(context)
            ], check=True)
    if args.target == "microvm":
        from microvm import package
        package(output / "openaf-lambda-arm64.zip", output)
    print("Lambda artifacts: " + str(output))


if __name__ == "__main__":
    main()
