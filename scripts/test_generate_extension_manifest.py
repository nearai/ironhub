#!/usr/bin/env python3
"""Regression tests for capabilities.json -> Reborn v3 translation."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import re
import unittest

try:
    import tomllib
except ModuleNotFoundError:  # Python 3.9/3.10 can still run the core checks.
    tomllib = None


ROOT = Path(__file__).resolve().parent.parent
GENERATOR_PATH = ROOT / "scripts" / "generate-extension-manifest.py"
SPEC = importlib.util.spec_from_file_location("extension_manifest_generator", GENERATOR_PATH)
GENERATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GENERATOR)

# Wazuh and WordPress use HTTP Basic, which the v3 injection contract cannot
# express. The production check carries the same documented exemptions.
EXEMPT_TOOLS = {"wazuh", "wordpress"}


def source_http(caps: dict) -> dict:
    """Read either supported source shape independently of the generator."""
    if "http" in caps:
        return caps["http"]
    return caps["capabilities"]["http"]


def expected_hosts(caps: dict) -> list[str]:
    return list(
        dict.fromkeys(
            entry["host"].strip() for entry in source_http(caps)["allowlist"]
        )
    )


class ExtensionManifestTranslationTests(unittest.TestCase):
    def generated_tool(self, tool_name: str) -> tuple[dict, str]:
        tool_dir = ROOT / "tools" / tool_name
        with (tool_dir / f"{tool_name}-tool.capabilities.json").open(
            encoding="utf-8"
        ) as handle:
            caps = json.load(handle)
        cargo_toml = (tool_dir / "Cargo.toml").read_text(encoding="utf-8")
        crate_name = re.search(r'^name\s*=\s*"([^"]+)"', cargo_toml, re.MULTILINE)
        version = re.search(r'^version\s*=\s*"([^"]+)"', cargo_toml, re.MULTILINE)
        self.assertIsNotNone(crate_name)
        self.assertIsNotNone(version)

        manifest = GENERATOR.generate_manifest(
            caps,
            tool_name,
            crate_name.group(1),
            version.group(1),
        )
        self.assertEqual(manifest.count("[[tools]]"), 1)
        return caps, manifest

    def test_every_supported_tool_preserves_http_authority(self) -> None:
        """Every source host and credential must survive into the v3 manifest."""
        for tool_dir in sorted((ROOT / "tools").iterdir()):
            if not tool_dir.is_dir() or tool_dir.name in EXEMPT_TOOLS:
                continue
            with self.subTest(tool=tool_dir.name):
                caps, manifest = self.generated_tool(tool_dir.name)
                expected_credentials = sorted(
                    (source_http(caps).get("credentials") or {}).keys()
                )

                self.assertEqual(
                    re.findall(r'host_pattern = "([^"]+)"', manifest),
                    expected_hosts(caps),
                )
                self.assertEqual(
                    re.findall(r'^handle = "([^"]+)"$', manifest, re.MULTILINE),
                    expected_credentials,
                )
                effects = re.search(r"^effects = (.+)$", manifest, re.MULTILINE)
                self.assertIsNotNone(effects)
                self.assertIn('"network"', effects.group(1))
                self.assertEqual(
                    '"use_secret"' in effects.group(1),
                    bool(expected_credentials),
                )
                self.assertEqual(
                    f"\n[auth.{tool_dir.name}]\n" in manifest,
                    bool(expected_credentials),
                )

    def test_nested_firecrawl_http_keeps_target_credential_and_auth(self) -> None:
        caps, manifest = self.generated_tool("firecrawl")

        self.assertNotIn("http", caps)
        self.assertIn(
            'network_targets = [ { scheme = "https", '
            'host_pattern = "api.firecrawl.dev" } ]',
            manifest,
        )
        self.assertIn('handle = "firecrawl_api_key"', manifest)
        self.assertIn(
            'audience = { scheme = "https", host = "api.firecrawl.dev" }',
            manifest,
        )
        self.assertIn('[auth.firecrawl]\nmethod = "api_key"', manifest)

    def test_credential_free_tool_still_gets_network_targets(self) -> None:
        _, manifest = self.generated_tool("evm-rpc")

        self.assertGreater(len(re.findall(r"host_pattern =", manifest)), 1)
        self.assertIn('effects = ["network"]', manifest)
        self.assertNotIn("[[tools.credentials]]", manifest)

    def test_ambiguous_http_shapes_fail_instead_of_picking_one(self) -> None:
        http = {"allowlist": [{"host": "api.example.com"}], "credentials": {}}
        caps = {"http": http, "capabilities": {"http": http}}

        with self.assertRaisesRegex(SystemExit, "declared in both"):
            GENERATOR.generate_manifest(caps, "example", "example_tool", "1.0.0")

    def test_multiple_credential_audiences_fail_instead_of_dropping_hosts(self) -> None:
        caps = {
            "http": {
                "allowlist": [
                    {"host": "api.example.com"},
                    {"host": "uploads.example.com"},
                ],
                "credentials": {
                    "example_key": {
                        "location": {"type": "bearer"},
                        "host_patterns": [
                            "api.example.com",
                            "uploads.example.com",
                        ],
                    }
                },
            }
        }

        with self.assertRaisesRegex(SystemExit, "v3 credential has one audience"):
            GENERATOR.generate_manifest(caps, "example", "example_tool", "1.0.0")

    def test_query_param_and_optional_credential_are_preserved(self) -> None:
        caps = {
            "http": {
                "allowlist": [{"host": "api.example.com"}],
                "credentials": {
                    "example_key": {
                        "location": {
                            "type": "query_param",
                            "name": "api_key",
                        },
                        "host_patterns": ["api.example.com"],
                        "optional": True,
                    }
                },
            }
        }

        manifest = GENERATOR.generate_manifest(
            caps, "example", "example_tool", "1.0.0"
        )

        self.assertIn(
            'injection = { type = "query_param", name = "api_key" }',
            manifest,
        )
        self.assertIn("required = false", manifest)

    def test_generated_manifests_are_valid_toml(self) -> None:
        if tomllib is None:
            self.skipTest("tomllib requires Python 3.11+")

        for tool_dir in sorted((ROOT / "tools").iterdir()):
            if not tool_dir.is_dir() or tool_dir.name in EXEMPT_TOOLS:
                continue
            with self.subTest(tool=tool_dir.name):
                _, manifest = self.generated_tool(tool_dir.name)
                parsed = tomllib.loads(manifest)
                self.assertEqual(parsed["schema_version"], "reborn.extension_manifest.v3")

    def test_exempt_tools_fail_for_the_documented_basic_auth_gap(self) -> None:
        for tool_name in EXEMPT_TOOLS:
            with self.subTest(tool=tool_name):
                with self.assertRaisesRegex(SystemExit, "no HTTP Basic variant"):
                    self.generated_tool(tool_name)


if __name__ == "__main__":
    unittest.main()
