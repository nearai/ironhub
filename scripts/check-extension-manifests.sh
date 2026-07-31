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
# listing it does not make the tool installable — IronClaw refuses an HTTP Basic
# credential today whether or not a manifest is published. Remove an entry when
# the underlying gap closes.
#
#   wazuh     — authenticates with HTTP Basic. v3 credential injection models
#               header / query-param / path-placeholder / JSON-pointer targets
#               and has no Basic variant, because Basic needs username +
#               base64(user:pass) composition that the host cannot express.
#   wordpress — supports alternative WordPress Basic and WooCommerce query-param
#               credentials on one tool. Query-param injection is expressible,
#               but the Basic alternative is not; dropping it would publish a
#               partially working manifest.
exempt="wazuh wordpress"

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

  if [ ! -f "$caps_file" ] || [ ! -f "$cargo_toml" ]; then
    echo "error: $name has no capabilities.json or Cargo.toml" >&2
    failed=$((failed + 1))
    continue
  fi

  crate_name="$(grep -E '^name[[:space:]]*=' "$cargo_toml" | head -1 | sed -E 's/^name[[:space:]]*=[[:space:]]*"(.+)"[[:space:]]*$/\1/')"
  version="$(grep -E '^version[[:space:]]*=' "$cargo_toml" | head -1 | sed -E 's/^version[[:space:]]*=[[:space:]]*"(.+)"[[:space:]]*$/\1/')"

  checked=$((checked + 1))
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
