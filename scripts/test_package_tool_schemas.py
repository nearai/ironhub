from __future__ import annotations

import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from package_tool_schemas import (
    SchemaPackagingError,
    package_tool_prompts,
    package_tool_schemas,
)


class PackageToolSchemasTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.tool = self.root / "evm-rpc"
        self.staging = self.root / "staging"
        self.input_ref = "schemas/evm-rpc/invoke.input.v1.json"
        self.output_ref = "schemas/evm-rpc/raw_output.v1.json"
        self.prompt_ref = "prompts/evm-rpc/invoke.md"
        for relative, content in (
            (self.input_ref, b'{"type":"object","required":["action"]}\n'),
            (self.output_ref, b'{"description":"raw output"}\n'),
        ):
            target = self.tool / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
        prompt = self.tool / self.prompt_ref
        prompt.parent.mkdir(parents=True, exist_ok=True)
        prompt.write_text("# Invoke\n", encoding="utf-8")
        self.manifest = self.root / "manifest.toml"
        self.manifest.write_text(
            "[[tools]]\n"
            f'input_schema_ref = "{self.input_ref}"\n'
            f'output_schema_ref = "{self.output_ref}"\n'
            f'prompt_doc_ref = "{self.prompt_ref}"\n',
            encoding="utf-8",
        )

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_stages_path_addressed_assets_and_emits_catalog_metadata(self) -> None:
        catalog = package_tool_schemas(
            self.tool,
            self.manifest,
            self.staging,
            "https://example.test/release",
        )

        self.assertEqual(set(catalog), {self.input_ref, self.output_ref})
        for relative, artifact in catalog.items():
            path_digest = hashlib.sha256(relative.encode()).hexdigest()
            asset_name = f"evm-rpc.schema.{path_digest}.json"
            staged = self.staging / asset_name
            self.assertEqual(staged.read_bytes(), (self.tool / relative).read_bytes())
            self.assertEqual(
                artifact,
                {
                    "url": f"https://example.test/release/{asset_name}",
                    "size_bytes": staged.stat().st_size,
                    "sha256": hashlib.sha256(staged.read_bytes()).hexdigest(),
                },
            )

    def test_stages_path_addressed_prompts_and_emits_catalog_metadata(self) -> None:
        catalog = package_tool_prompts(
            self.tool,
            self.manifest,
            self.staging,
            "https://example.test/release",
        )

        self.assertEqual(set(catalog), {self.prompt_ref})
        path_digest = hashlib.sha256(self.prompt_ref.encode()).hexdigest()
        asset_name = f"evm-rpc.prompt.{path_digest}.md"
        staged = self.staging / asset_name
        self.assertEqual(staged.read_bytes(), (self.tool / self.prompt_ref).read_bytes())
        self.assertEqual(
            catalog[self.prompt_ref],
            {
                "url": f"https://example.test/release/{asset_name}",
                "size_bytes": staged.stat().st_size,
                "sha256": hashlib.sha256(staged.read_bytes()).hexdigest(),
            },
        )

    def test_rejects_missing_or_unreferenced_schema_assets(self) -> None:
        (self.tool / self.output_ref).unlink()
        extra = self.tool / "schemas/evm-rpc/extra.json"
        extra.write_text(json.dumps({"type": "object"}), encoding="utf-8")

        with self.assertRaisesRegex(
            SchemaPackagingError, "missing=.*raw_output.*unreferenced=.*extra"
        ):
            package_tool_schemas(
                self.tool,
                self.manifest,
                self.staging,
                "https://example.test/release",
            )

    def test_rejects_missing_or_unreferenced_prompt_assets(self) -> None:
        (self.tool / self.prompt_ref).unlink()
        extra = self.tool / "prompts/evm-rpc/extra.md"
        extra.write_text("# Extra\n", encoding="utf-8")

        with self.assertRaisesRegex(
            SchemaPackagingError, "missing=.*invoke.*unreferenced=.*extra"
        ):
            package_tool_prompts(
                self.tool,
                self.manifest,
                self.staging,
                "https://example.test/release",
            )


if __name__ == "__main__":
    unittest.main()
