#!/usr/bin/env python3
"""Stage manifest-referenced tool assets and emit signed-catalog metadata."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import sys


MAX_SCHEMA_ARTIFACTS = 32
MAX_SCHEMA_BYTES = 1024 * 1024
MAX_PROMPT_ARTIFACTS = 64
MAX_PROMPT_BYTES = 1024 * 1024
TOOL_NAME = re.compile(r"^[a-z0-9][a-z0-9-]*$")


class SchemaPackagingError(ValueError):
    """The manifest and committed tool assets are inconsistent."""


def manifest_schema_refs(manifest_path: Path) -> set[str]:
    try:
        manifest = manifest_path.read_text(encoding="utf-8")
    except OSError as error:
        raise SchemaPackagingError(f"cannot read generated manifest: {error}") from error

    refs = set(
        re.findall(
            r'^(?:input|output)_schema_ref\s*=\s*"([^"]+)"\s*$',
            manifest,
            re.MULTILINE,
        )
    )
    if not refs:
        raise SchemaPackagingError("generated manifest declares no tool schema refs")
    return refs


def manifest_prompt_refs(manifest_path: Path) -> set[str]:
    try:
        manifest = manifest_path.read_text(encoding="utf-8")
    except OSError as error:
        raise SchemaPackagingError(f"cannot read generated manifest: {error}") from error

    return set(
        re.findall(
            r'^prompt_doc_ref\s*=\s*"([^"]+)"\s*$',
            manifest,
            re.MULTILINE,
        )
    )


def validate_schema_path(path: str) -> PurePosixPath:
    parsed = PurePosixPath(path)
    if (
        parsed.is_absolute()
        or not parsed.parts
        or any(part in ("", ".", "..") for part in parsed.parts)
    ):
        raise SchemaPackagingError(f"invalid manifest schema path: {path!r}")
    if parsed.suffix != ".json" or parsed.parts[0] != "schemas":
        raise SchemaPackagingError(
            f"schema path must be a JSON file below schemas/: {path!r}"
        )
    return parsed


def committed_schema_paths(tool_dir: Path) -> set[str]:
    schema_root = tool_dir / "schemas"
    if not schema_root.is_dir():
        return set()
    paths: set[str] = set()
    for schema_path in schema_root.rglob("*.json"):
        if schema_path.is_symlink():
            raise SchemaPackagingError(
                f"schema assets must not be symlinks: {schema_path}"
            )
        paths.add(schema_path.relative_to(tool_dir).as_posix())
    return paths


def validate_prompt_path(path: str) -> PurePosixPath:
    parsed = PurePosixPath(path)
    if (
        parsed.is_absolute()
        or not parsed.parts
        or any(part in ("", ".", "..") for part in parsed.parts)
    ):
        raise SchemaPackagingError(f"invalid manifest prompt path: {path!r}")
    if parsed.suffix != ".md" or parsed.parts[0] != "prompts":
        raise SchemaPackagingError(
            f"prompt path must be a Markdown file below prompts/: {path!r}"
        )
    return parsed


def committed_prompt_paths(tool_dir: Path) -> set[str]:
    prompt_root = tool_dir / "prompts"
    if not prompt_root.is_dir():
        return set()
    paths: set[str] = set()
    for prompt_path in prompt_root.rglob("*.md"):
        if prompt_path.is_symlink():
            raise SchemaPackagingError(
                f"prompt assets must not be symlinks: {prompt_path}"
            )
        paths.add(prompt_path.relative_to(tool_dir).as_posix())
    return paths


def package_tool_schemas(
    tool_dir: Path,
    manifest_path: Path,
    staging_dir: Path,
    base_url: str,
) -> dict[str, dict[str, object]]:
    name = tool_dir.name
    if not TOOL_NAME.fullmatch(name):
        raise SchemaPackagingError(f"invalid tool directory name: {name!r}")
    referenced = manifest_schema_refs(manifest_path)
    committed = committed_schema_paths(tool_dir)
    if referenced != committed:
        missing = sorted(referenced - committed)
        unreferenced = sorted(committed - referenced)
        raise SchemaPackagingError(
            f"{name}: schema assets do not match generated manifest "
            f"(missing={missing}, unreferenced={unreferenced})"
        )
    if len(referenced) > MAX_SCHEMA_ARTIFACTS:
        raise SchemaPackagingError(
            f"{name}: more than {MAX_SCHEMA_ARTIFACTS} schema artifacts"
        )

    staging_dir.mkdir(parents=True, exist_ok=True)
    catalog: dict[str, dict[str, object]] = {}
    for relative in sorted(referenced):
        schema_path = tool_dir / validate_schema_path(relative)
        content = schema_path.read_bytes()
        if len(content) > MAX_SCHEMA_BYTES:
            raise SchemaPackagingError(
                f"{name}: schema {relative!r} exceeds {MAX_SCHEMA_BYTES} bytes"
            )
        try:
            document = json.loads(content)
        except json.JSONDecodeError as error:
            raise SchemaPackagingError(
                f"{name}: schema {relative!r} is invalid JSON: {error}"
            ) from error
        if not isinstance(document, dict):
            raise SchemaPackagingError(
                f"{name}: schema {relative!r} must be a JSON object"
            )

        path_digest = hashlib.sha256(relative.encode()).hexdigest()
        asset_name = f"{name}.schema.{path_digest}.json"
        shutil.copyfile(schema_path, staging_dir / asset_name)
        catalog[relative] = {
            "url": f"{base_url}/{asset_name}",
            "size_bytes": len(content),
            "sha256": hashlib.sha256(content).hexdigest(),
        }
    return catalog


def package_tool_prompts(
    tool_dir: Path,
    manifest_path: Path,
    staging_dir: Path,
    base_url: str,
) -> dict[str, dict[str, object]]:
    name = tool_dir.name
    if not TOOL_NAME.fullmatch(name):
        raise SchemaPackagingError(f"invalid tool directory name: {name!r}")
    referenced = manifest_prompt_refs(manifest_path)
    if not referenced:
        return {}
    committed = committed_prompt_paths(tool_dir)
    if referenced != committed:
        missing = sorted(referenced - committed)
        unreferenced = sorted(committed - referenced)
        raise SchemaPackagingError(
            f"{name}: prompt assets do not match generated manifest "
            f"(missing={missing}, unreferenced={unreferenced})"
        )
    if len(referenced) > MAX_PROMPT_ARTIFACTS:
        raise SchemaPackagingError(
            f"{name}: more than {MAX_PROMPT_ARTIFACTS} prompt artifacts"
        )

    staging_dir.mkdir(parents=True, exist_ok=True)
    catalog: dict[str, dict[str, object]] = {}
    for relative in sorted(referenced):
        prompt_path = tool_dir / validate_prompt_path(relative)
        content = prompt_path.read_bytes()
        if len(content) > MAX_PROMPT_BYTES:
            raise SchemaPackagingError(
                f"{name}: prompt {relative!r} exceeds {MAX_PROMPT_BYTES} bytes"
            )

        path_digest = hashlib.sha256(relative.encode()).hexdigest()
        asset_name = f"{name}.prompt.{path_digest}.md"
        shutil.copyfile(prompt_path, staging_dir / asset_name)
        catalog[relative] = {
            "url": f"{base_url}/{asset_name}",
            "size_bytes": len(content),
            "sha256": hashlib.sha256(content).hexdigest(),
        }
    return catalog


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("tool_dir", type=Path)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("staging_dir", type=Path)
    parser.add_argument("base_url")
    args = parser.parse_args()
    try:
        schemas = package_tool_schemas(
            args.tool_dir, args.manifest, args.staging_dir, args.base_url.rstrip("/")
        )
        prompts = package_tool_prompts(
            args.tool_dir, args.manifest, args.staging_dir, args.base_url.rstrip("/")
        )
    except (OSError, SchemaPackagingError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    json.dump({"prompts": prompts, "schemas": schemas}, sys.stdout, sort_keys=True)
    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
