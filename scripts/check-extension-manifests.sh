#!/usr/bin/env bash
#
# Generate an extension manifest for every tool and fail if any tool cannot
# produce one.
#
# Usage:
#   scripts/check-extension-manifests.sh
#
# The release pipeline publishes a generated manifest per tool. Running the same
# generation on every pull request means a capabilities.json that cannot be
# expressed as an extension manifest — an unsupported credential location, a
# credential with no host_patterns — fails here, next to the change that caused
# it, rather than at release time or in a user's session.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
out_dir="$(mktemp -d)"
trap 'rm -rf "$out_dir"' EXIT

# Run semantic regression coverage before checking that every real tool can be
# generated. A syntactically valid manifest is still unusable if translation
# dropped its network targets or credentials.
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover \
  -s "$ROOT/scripts" \
  -p 'test_*.py'

# Tools that cannot publish a manifest yet, with the reason. A tool is listed
# here only when the gap is in the host contract rather than in the tool, and
# listing it does not make the tool installable. Remove an entry when the
# underlying gap closes.
exempt=""

failed=0
checked=0
skipped=0
for dir in "$ROOT"/tools/*/; do
  name="$(basename "$dir")"

  if printf '%s\n' $exempt | grep -qx "$name"; then
    echo "exempt: $name (see scripts/check-extension-manifests.sh for why)"
    skipped=$((skipped + 1))
    continue
  fi
  caps_file="${dir}${name}-tool.capabilities.json"
  cargo_toml="${dir}Cargo.toml"
  native_manifest="${dir}manifest.toml"

  if [ ! -f "$cargo_toml" ]; then
    echo "error: $name has no Cargo.toml" >&2
    failed=$((failed + 1))
    continue
  fi

  checked=$((checked + 1))
  if [ -f "$native_manifest" ]; then
    native_out_dir="${out_dir}/${name}-schemas"
    if python3 "$ROOT/scripts/validate-native-extension-manifest.py" \
        "$native_manifest" "$cargo_toml" "$name" \
        && python3 "$ROOT/scripts/package_tool_schemas.py" \
          "$dir" "$native_manifest" "$native_out_dir" \
          "https://invalid.example/releases" >/dev/null; then
      echo "ok: $name (native manifest)"
    else
      failed=$((failed + 1))
    fi
    continue
  fi

  if [ ! -f "$caps_file" ]; then
    echo "error: $name has neither manifest.toml nor capabilities.json" >&2
    failed=$((failed + 1))
    continue
  fi

  crate_name="$(grep -E '^name[[:space:]]*=' "$cargo_toml" | head -1 | sed -E 's/^name[[:space:]]*=[[:space:]]*"(.+)"[[:space:]]*$/\1/')"
  version="$(grep -E '^version[[:space:]]*=' "$cargo_toml" | head -1 | sed -E 's/^version[[:space:]]*=[[:space:]]*"(.+)"[[:space:]]*$/\1/')"

  if "$ROOT/scripts/generate-extension-manifest.py" \
      "$caps_file" "$name" "$crate_name" "$version" > "${out_dir}/${name}.toml"; then
    echo "ok: $name"
  else
    failed=$((failed + 1))
  fi
done

echo
echo "checked ${checked} tools (${skipped} exempt), ${failed} could not produce a manifest"
[ "$failed" -eq 0 ]
