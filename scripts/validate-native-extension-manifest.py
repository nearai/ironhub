#!/usr/bin/env python3
"""Validate native Reborn manifest metadata before release packaging."""

from __future__ import annotations

import argparse
from pathlib import Path, PurePosixPath
import re
import sys
import tomllib


SUPPORTED_SCHEMAS = {
    "reborn.extension_manifest.v2",
    "reborn.extension_manifest.v3",
}


def cargo_value(cargo_toml: str, field: str) -> str:
    match = re.search(
        rf'^{re.escape(field)}\s*=\s*"([^"]+)"\s*$', cargo_toml, re.MULTILINE
    )
    if match is None:
        raise ValueError(f"Cargo.toml has no package {field}")
    return match.group(1)


def validate_asset_path(value: object, field: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{field} must be a string")
    path = PurePosixPath(value)
    if (
        path.is_absolute()
        or not path.parts
        or any(part in ("", ".", "..") for part in path.parts)
        or "\\" in value
    ):
        raise ValueError(f"{field} is not a safe package-relative path: {value!r}")
    return value


def validate(manifest_path: Path, cargo_path: Path, expected_name: str) -> None:
    with manifest_path.open("rb") as handle:
        manifest = tomllib.load(handle)
    cargo_toml = cargo_path.read_text(encoding="utf-8")

    schema_version = manifest.get("schema_version")
    if schema_version not in SUPPORTED_SCHEMAS:
        raise ValueError(f"unsupported schema_version {schema_version!r}")
    if manifest.get("id") != expected_name:
        raise ValueError(
            f"manifest id {manifest.get('id')!r} does not match directory {expected_name!r}"
        )

    cargo_version = cargo_value(cargo_toml, "version")
    if manifest.get("version") != cargo_version:
        raise ValueError(
            f"manifest version {manifest.get('version')!r} does not match Cargo version "
            f"{cargo_version!r}"
        )

    runtime = manifest.get("runtime")
    if not isinstance(runtime, dict) or runtime.get("kind") != "wasm":
        raise ValueError("native IronHub tools must declare [runtime] kind = 'wasm'")
    module = validate_asset_path(runtime.get("module"), "runtime.module")
    crate_name = cargo_value(cargo_toml, "name").replace("-", "_")
    if PurePosixPath(module).name != f"{crate_name}.wasm":
        raise ValueError(
            f"runtime.module {module!r} does not match Cargo crate {crate_name!r}"
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path)
    parser.add_argument("cargo_toml", type=Path)
    parser.add_argument("tool_name")
    args = parser.parse_args()
    try:
        validate(args.manifest, args.cargo_toml, args.tool_name)
    except (OSError, ValueError, tomllib.TOMLDecodeError) as error:
        print(f"{args.tool_name}: invalid native manifest: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
