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
EXEMPT_TOOLS: set[str] = set()


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


def source_secret_names(caps: dict) -> list[str]:
    if "secrets" in caps:
        return caps["secrets"].get("allowed_names") or []
    return (caps.get("capabilities", {}).get("secrets") or {}).get(
        "allowed_names"
    ) or []


def expected_injection(credential: dict) -> dict:
    location = credential["location"]
    if location["type"] == "bearer":
        return {
            "type": "header",
            "name": "authorization",
            "prefix": "Bearer ",
        }
    if location["type"] == "header":
        return {
            "type": "header",
            "name": location.get("name", "authorization").strip().lower(),
        }
    if location["type"] == "basic":
        return {
            "type": "basic",
            "username": location["username"].strip(),
        }
    return {
        "type": "query_param",
        "name": location["name"].strip(),
    }


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
                for declared_effect in caps["effects"]:
                    self.assertIn(f'"{declared_effect}"', effects.group(1))
                self.assertEqual(
                    f"\n[auth.{tool_dir.name}]\n" in manifest,
                    bool(expected_credentials),
                )

    def test_every_published_manifest_has_exact_schema_assets(self) -> None:
        """Every manifest schema ref must resolve to one committed artifact."""
        for tool_dir in sorted((ROOT / "tools").iterdir()):
            if not tool_dir.is_dir() or tool_dir.name in EXEMPT_TOOLS:
                continue
            with self.subTest(tool=tool_dir.name):
                _, manifest = self.generated_tool(tool_dir.name)
                referenced = set(
                    re.findall(
                        r'^(?:input|output)_schema_ref = "([^"]+)"$',
                        manifest,
                        re.MULTILINE,
                    )
                )
                published = {
                    path.relative_to(tool_dir).as_posix()
                    for path in (tool_dir / "schemas").rglob("*.json")
                }
                self.assertEqual(
                    published,
                    referenced,
                    "signed catalog schemas must exactly match manifest refs",
                )

    def test_catalog_sources_are_internally_consistent(self) -> None:
        """Source metadata must agree before any manifest is generated."""
        for tool_dir in sorted((ROOT / "tools").iterdir()):
            capabilities_path = tool_dir / f"{tool_dir.name}-tool.capabilities.json"
            cargo_path = tool_dir / "Cargo.toml"
            if not tool_dir.is_dir() or not capabilities_path.exists():
                continue
            with self.subTest(tool=tool_dir.name):
                with capabilities_path.open(encoding="utf-8") as handle:
                    caps = json.load(handle)
                cargo_toml = cargo_path.read_text(encoding="utf-8")
                version = re.search(
                    r'^version\s*=\s*"([^"]+)"', cargo_toml, re.MULTILINE
                )
                self.assertIsNotNone(version)
                self.assertEqual(caps["version"], version.group(1))

                effects = caps.get("effects")
                self.assertIsInstance(effects, list)
                self.assertEqual(len(effects), len(set(effects)))
                self.assertTrue(set(effects).issubset(GENERATOR.PUBLISHED_EFFECTS))

                credentials = source_http(caps).get("credentials") or {}
                handles = sorted(credentials)
                self.assertEqual(sorted(source_secret_names(caps)), handles)
                for handle, credential in credentials.items():
                    self.assertEqual(credential.get("secret_name"), handle)

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
        caps = {
            "version": "1.0.0",
            "effects": [],
            "http": http,
            "capabilities": {"http": http},
        }

        with self.assertRaisesRegex(SystemExit, "declared in both"):
            GENERATOR.generate_manifest(caps, "example", "example_tool", "1.0.0")

    def test_multiple_credential_audiences_fail_instead_of_dropping_hosts(self) -> None:
        caps = {
            "version": "1.0.0",
            "effects": [],
            "http": {
                "allowlist": [
                    {"host": "api.example.com"},
                    {"host": "uploads.example.com"},
                ],
                "credentials": {
                    "example_key": {
                        "secret_name": "example_key",
                        "location": {"type": "bearer"},
                        "host_patterns": [
                            "api.example.com",
                            "uploads.example.com",
                        ],
                    }
                },
            },
            "secrets": {"allowed_names": ["example_key"]},
        }

        with self.assertRaisesRegex(SystemExit, "v3 credential has one audience"):
            GENERATOR.generate_manifest(caps, "example", "example_tool", "1.0.0")

    def test_query_param_and_optional_credential_are_preserved(self) -> None:
        caps = {
            "version": "1.0.0",
            "effects": [],
            "http": {
                "allowlist": [{"host": "api.example.com"}],
                "credentials": {
                    "example_key": {
                        "secret_name": "example_key",
                        "location": {
                            "type": "query_param",
                            "name": "api_key",
                        },
                        "host_patterns": ["api.example.com"],
                        "optional": True,
                    }
                },
            },
            "secrets": {"allowed_names": ["example_key"]},
        }

        manifest = GENERATOR.generate_manifest(
            caps, "example", "example_tool", "1.0.0"
        )

        self.assertIn(
            'injection = { type = "query_param", name = "api_key" }',
            manifest,
        )
        self.assertIn("required = false", manifest)

    def test_missing_or_unknown_effects_fail_closed(self) -> None:
        base = {
            "version": "1.0.0",
            "http": {
                "allowlist": [{"host": "api.example.com"}],
                "credentials": {},
            },
        }
        with self.assertRaisesRegex(SystemExit, "explicit list"):
            GENERATOR.generate_manifest(base, "example", "example_tool", "1.0.0")

        base["effects"] = ["network"]
        with self.assertRaisesRegex(SystemExit, "unsupported effect"):
            GENERATOR.generate_manifest(base, "example", "example_tool", "1.0.0")

    def test_source_version_and_secret_handles_must_match(self) -> None:
        caps = {
            "version": "0.9.0",
            "effects": [],
            "http": {
                "allowlist": [{"host": "api.example.com"}],
                "credentials": {},
            },
        }
        with self.assertRaisesRegex(SystemExit, "does not match Cargo version"):
            GENERATOR.generate_manifest(caps, "example", "example_tool", "1.0.0")

        caps["version"] = "1.0.0"
        caps["http"]["credentials"] = {
            "example_key": {
                "secret_name": "different_key",
                "location": {"type": "bearer"},
                "host_patterns": ["api.example.com"],
            }
        }
        caps["secrets"] = {"allowed_names": ["example_key"]}
        with self.assertRaisesRegex(SystemExit, "must match its secret_name"):
            GENERATOR.generate_manifest(caps, "example", "example_tool", "1.0.0")

        caps["http"]["credentials"]["example_key"]["secret_name"] = "example_key"
        caps["secrets"]["allowed_names"] = []
        with self.assertRaisesRegex(SystemExit, "must exactly match"):
            GENERATOR.generate_manifest(caps, "example", "example_tool", "1.0.0")

    def test_oauth_scopes_are_attached_to_credential_requirements(self) -> None:
        for tool_name in ("gitlab", "microsoft-365", "xero"):
            with self.subTest(tool=tool_name):
                caps, manifest = self.generated_tool(tool_name)
                expected_scopes = caps["auth"]["oauth"]["scopes"]
                scope_line = re.search(
                    r"^scopes = \[ (.*) \]$", manifest, re.MULTILINE
                )
                self.assertIsNotNone(scope_line)
                self.assertEqual(
                    re.findall(r'"([^"]+)"', scope_line.group(1)),
                    expected_scopes,
                )

    def test_nova_uses_host_bounded_credential_injection(self) -> None:
        caps, manifest = self.generated_tool("nova-submit")
        credential = source_http(caps)["credentials"]["nova_api_key"]

        self.assertEqual(
            credential["path_patterns"], ["/api/auth/session-token"]
        )
        self.assertIn('handle = "nova_api_key"', manifest)
        self.assertIn(
            'injection = { type = "header", name = "x-api-key" }',
            manifest,
        )
        self.assertIn(
            'effects = ["network", "use_secret", "external_write"]',
            manifest,
        )

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
                with (
                    tool_dir / f"{tool_dir.name}-tool.capabilities.json"
                ).open(encoding="utf-8") as handle:
                    caps = json.load(handle)
                tool = parsed["tools"][0]
                credentials = source_http(caps).get("credentials") or {}
                expected_effects = ["network"]
                if credentials:
                    expected_effects.append("use_secret")
                expected_effects.extend(caps["effects"])
                self.assertEqual(tool["effects"], expected_effects)
                self.assertEqual(
                    sorted(c["handle"] for c in tool.get("credentials", [])),
                    sorted(credentials),
                )
                generated_credentials = {
                    credential["handle"]: credential
                    for credential in tool.get("credentials", [])
                }
                for handle, source_credential in credentials.items():
                    generated = generated_credentials[handle]
                    self.assertEqual(
                        generated["audience"],
                        {
                            "scheme": "https",
                            "host": source_credential["host_patterns"][0],
                        },
                    )
                    self.assertEqual(
                        generated["injection"],
                        expected_injection(source_credential),
                    )
                    self.assertEqual(
                        generated["required"],
                        not source_credential.get("optional", False),
                    )
                scopes = (caps.get("auth") or {}).get("oauth", {}).get("scopes")
                if scopes is not None:
                    for credential in tool.get("credentials", []):
                        self.assertEqual(credential["scopes"], scopes)

    def test_basic_credentials_publish_the_username_and_never_the_secret(self) -> None:
        expected = {
            "wazuh": {"admin", "wazuh-wui"},
            "wordpress": {"YOUR_WP_USERNAME"},
        }
        for tool_name, usernames in expected.items():
            with self.subTest(tool=tool_name):
                _, manifest = self.generated_tool(tool_name)
                published = set(
                    re.findall(
                        r'injection = \{ type = "basic", username = "([^"]+)" \}',
                        manifest,
                    )
                )
                self.assertEqual(published, usernames)

    def test_a_basic_username_containing_the_delimiter_is_rejected(self) -> None:
        with self.assertRaisesRegex(SystemExit, "RFC 7617 reserves"):
            GENERATOR.credential_injection(
                "fixture",
                {"type": "basic", "username": "user:extra"},
                "fixture_password",
            )

    def test_a_basic_location_without_a_username_is_rejected(self) -> None:
        with self.assertRaisesRegex(SystemExit, "without a username"):
            GENERATOR.credential_injection(
                "fixture", {"type": "basic", "username": "  "}, "fixture_password"
            )


if __name__ == "__main__":
    unittest.main()
