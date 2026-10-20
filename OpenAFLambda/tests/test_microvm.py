"""MicroVM image packaging and service lifecycle regression tests."""
import importlib.util
import json
import pathlib
import tempfile
import unittest
from unittest import mock
import zipfile

SOURCE = pathlib.Path(__file__).resolve().parents[1]


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, SOURCE / path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


packager = module("microvm_package", "scripts/microvm.py")
live = module("live_microvm", "tests/live_microvm.py")


class PackageTests(unittest.TestCase):
    def test_package_preserves_executable_and_rejects_wrong_architecture(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = pathlib.Path(temporary)
            runtime = root / "runtime.zip"
            for architecture in ("arm64", "x86_64"):
                with zipfile.ZipFile(runtime, "w") as archive:
                    archive.writestr("build-manifest.json", json.dumps({"architecture": architecture}))
                    for name in ("bootstrap", "runtime/lambda.js", "jre/bin/java", "openaf/openaf.jar"):
                        info = zipfile.ZipInfo(name)
                        info.external_attr = 0o100755 << 16
                        archive.writestr(info, b"fixture")
                if architecture == "arm64":
                    target = packager.package(runtime, root / "out")
                    with zipfile.ZipFile(target) as archive:
                        self.assertIn("Dockerfile", archive.namelist())
                        self.assertNotIn("payload/microvm/server.py", archive.namelist())
                        self.assertNotIn("python", archive.read("Dockerfile").decode().lower())
                        self.assertIn(b"runMicrovm", archive.read("payload/runtime/lambda.js"))
                        self.assertIn(b"OAF_LAMBDA_TRANSPORT", archive.read("payload/bootstrap"))
                        self.assertEqual((archive.getinfo("payload/jre/bin/java").external_attr >> 16) & 0o777, 0o755)
                else:
                    with self.assertRaisesRegex(ValueError, "arm64"):
                        packager.package(runtime, root / "out")

    def test_archive_traversal_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = pathlib.Path(temporary)
            runtime = root / "runtime.zip"
            with zipfile.ZipFile(runtime, "w") as archive:
                archive.writestr("build-manifest.json", '{"architecture":"arm64"}')
                archive.writestr("../escape", "unsafe")
            with self.assertRaisesRegex(ValueError, "Unsafe"):
                packager.package(runtime, root / "out")


class CleanupTests(unittest.TestCase):
    def test_termination_wait_accepts_transitional_state(self):
        with tempfile.TemporaryDirectory() as temporary:
            run = live.Run({"region": "eu-west-1"}, temporary)
            states = iter(("TERMINATING", "TERMINATED"))
            run.aws = lambda *args, **kwargs: {"state": next(states)}
            with mock.patch.object(live.time, "sleep"):
                result = run.wait("get-microvm", "microvm_identifier", "fixture", ("TERMINATED",))
            self.assertEqual(result["state"], "TERMINATED")

    def test_legacy_image_names_are_resolved_to_arns_and_versions_deleted(self):
        with tempfile.TemporaryDirectory() as temporary:
            run = live.Run({"profile": "fixture", "region": "eu-west-1", "bucket": "fixture", "prefix": "tests"}, temporary)
            run.journal.update(images=["fixture-image"], objects=["tests/image.zip"], account="ACCOUNT")
            calls = []
            def aws(service, operation, **parameters):
                calls.append((operation, parameters))
                if operation == "get-microvm-image":
                    return {"state": "DELETED"}
                if operation == "list-object-versions":
                    return {"Versions": [{"Key": "tests/image.zip", "VersionId": "version"}]} if len([c for c in calls if c[0] == operation]) == 1 else {}
                return {}
            run.aws = aws
            run.cleanup()
            image = next(parameters["image_identifier"] for operation, parameters in calls if operation == "delete-microvm-image")
            self.assertEqual(image, "arn:aws:lambda:eu-west-1:ACCOUNT:microvm-image:fixture-image")
            self.assertTrue(any(operation == "delete-object" and parameters["version_id"] == "version" for operation, parameters in calls))
            self.assertTrue(run.journal["cleanupPassed"])


if __name__ == "__main__":
    unittest.main()
