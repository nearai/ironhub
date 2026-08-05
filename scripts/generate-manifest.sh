#!/usr/bin/env bash
#
# Generate tools.json manifest for a release.
#
# Usage:
#   scripts/generate-manifest.sh <staging_dir> <release_tag> <repo>
#
# Walks tools/* and skills/* in the repo, reads each entry's metadata,
# pairs it with the artifact already present in <staging_dir>, computes
# SHA-256, and writes <staging_dir>/tools.json.
#
# Expected staging_dir layout:
#   <staging>/<tool-name>.wasm
#   <staging>/<tool-name>.capabilities.json
#   <staging>/<skill-name>.SKILL.md
#
# Also written here, not expected as input:
#   <staging>/<tool-name>.manifest.toml    (generated from capabilities.json)
#   <staging>/<tool-name>.schema.<path-sha256>.json
#                                          (copied from manifest schema refs)

set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: $0 <staging_dir> <release_tag> <repo>" >&2
  exit 64
fi

STAGING="$1"
TAG="$2"
REPO="$3"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# shellcheck source=lib/skill-files.sh
. "$ROOT/scripts/lib/skill-files.sh"

base_url="https://github.com/${REPO}/releases/download/${TAG}"
generated_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

tools_json="["
first=1
for dir in "$ROOT"/tools/*/; do
  name="$(basename "$dir")"
  caps_file="${dir}${name}-tool.capabilities.json"
  cargo_toml="${dir}Cargo.toml"
  native_manifest="${dir}manifest.toml"
  wasm_path="${STAGING}/${name}.wasm"
  caps_staged="${STAGING}/${name}.capabilities.json"

  if [ ! -f "$wasm_path" ] || [ ! -f "$caps_staged" ]; then
    echo "warning: missing artifacts for tool $name, skipping" >&2
    continue
  fi

  crate_name="$(grep -E '^name[[:space:]]*=' "$cargo_toml" | head -1 | sed -E 's/^name[[:space:]]*=[[:space:]]*"(.+)"[[:space:]]*$/\1/')"
  version="$(grep -E '^version[[:space:]]*=' "$cargo_toml" | head -1 | sed -E 's/^version[[:space:]]*=[[:space:]]*"(.+)"[[:space:]]*$/\1/')"
  if [ -f "$native_manifest" ]; then
    description="$(python3 -c 'import sys, tomllib; print(tomllib.load(open(sys.argv[1], "rb")).get("description", ""))' "$native_manifest")"
  else
    description="$(jq -r '.description // ""' "$caps_file")"
  fi

  wasm_size="$(stat -c '%s' "$wasm_path")"
  wasm_sha="$(sha256sum "$wasm_path" | awk '{print $1}')"
  caps_size="$(stat -c '%s' "$caps_staged")"
  caps_sha="$(sha256sum "$caps_staged" | awk '{print $1}')"

  # Publish the extension manifest IronClaw installs from, rather than leaving
  # it to be reconstructed on the client from capabilities.json.
  #
  # A tool whose capabilities.json cannot be expressed as a manifest publishes
  # no manifest and keeps its other artifacts, so one unmappable tool does not
  # cost the catalog every other tool's manifest. The hard gate on that lives in
  # CI (scripts/check-extension-manifests.sh), where the author of the change
  # sees it; a release is the wrong place to discover it and the wrong place to
  # fail the whole catalog over it.
  manifest_staged="${STAGING}/${name}.manifest.toml"
  if [ -f "$native_manifest" ]; then
    cp "$native_manifest" "$manifest_staged"
    manifest_ok=1
  elif "$ROOT/scripts/generate-extension-manifest.py" \
      "$caps_file" "$name" "$crate_name" "$version" > "$manifest_staged"; then
    manifest_ok=1
  else
    manifest_ok=0
  fi
  if [ "$manifest_ok" -eq 1 ]; then
    manifest_json="$(jq -n \
      --arg url "${base_url}/${name}.manifest.toml" \
      --argjson size "$(stat -c '%s' "$manifest_staged")" \
      --arg sha "$(sha256sum "$manifest_staged" | awk '{print $1}')" \
      '{ url: $url, size_bytes: $size, sha256: $sha }')"
    schemas_json="$(python3 "$ROOT/scripts/package_tool_schemas.py" \
      "$dir" "$manifest_staged" "$STAGING" "$base_url")"
  else
    echo "warning: $name publishes no extension manifest (see error above)" >&2
    rm -f "$manifest_staged"
    manifest_json="null"
    schemas_json="null"
  fi

  if [ $first -eq 0 ]; then
    tools_json+=","
  fi
  first=0

  tools_json+=$(jq -n \
    --arg name "$name" \
    --arg crate "$crate_name" \
    --arg version "$version" \
    --arg desc "$description" \
    --arg wasm_url "${base_url}/${name}.wasm" \
    --argjson wasm_size "$wasm_size" \
    --arg wasm_sha "$wasm_sha" \
    --arg caps_url "${base_url}/${name}.capabilities.json" \
    --argjson caps_size "$caps_size" \
    --arg caps_sha "$caps_sha" \
    --argjson manifest "$manifest_json" \
    --argjson schemas "$schemas_json" \
    '{
      name: $name,
      crate_name: $crate,
      version: $version,
      description: $desc,
      wasm: { url: $wasm_url, size_bytes: $wasm_size, sha256: $wasm_sha },
      capabilities: { url: $caps_url, size_bytes: $caps_size, sha256: $caps_sha }
    }
    + (if $manifest == null then {} else { manifest: $manifest, schemas: $schemas } end)')
done
tools_json+="]"

skills_json="["
first=1
if [ -d "$ROOT/skills" ]; then
  for dir in "$ROOT"/skills/*/; do
    name="$(basename "$dir")"
    skill_md="${dir}SKILL.md"
    skill_staged="${STAGING}/${name}.SKILL.md"

    if [ ! -f "$skill_md" ] || [ ! -f "$skill_staged" ]; then
      continue
    fi

    version="$(awk '/^version:/ { print $2; exit }' "$skill_md" | tr -d '"' || echo "")"
    description="$(awk '/^description:/ { sub(/^description: */, ""); print; exit }' "$skill_md" | sed -E 's/^"//; s/"$//')"
    trunk="$(awk '/^trunk:/ { print $2; exit }' "$skill_md" || echo "")"

    skill_size="$(stat -c '%s' "$skill_staged")"
    skill_sha="$(sha256sum "$skill_staged" | awk '{print $1}')"

    files_json="[]"
    while IFS= read -r -d '' file; do
      rel="${file#"$dir"}"
      asset="$(skill_file_asset_name "$name" "$rel")"
      file_staged="${STAGING}/${asset}"

      if [ ! -f "$file_staged" ]; then
        echo "error: $name ships '$rel' but ${asset} was never staged" >&2
        exit 1
      fi

      files_json="$(jq -n \
        --argjson acc "$files_json" \
        --arg path "$rel" \
        --arg url "${base_url}/${asset}" \
        --argjson size "$(stat -c '%s' "$file_staged")" \
        --arg sha "$(sha256sum "$file_staged" | awk '{print $1}')" \
        '$acc + [{ path: $path, url: $url, size_bytes: $size, sha256: $sha }]')"
    done < <(find "$dir" -type f ! -name SKILL.md -print0 | sort -z)

    if [ $first -eq 0 ]; then
      skills_json+=","
    fi
    first=0

    skills_json+=$(jq -n \
      --arg name "$name" \
      --arg trunk "$trunk" \
      --arg version "$version" \
      --arg desc "$description" \
      --arg skill_url "${base_url}/${name}.SKILL.md" \
      --argjson skill_size "$skill_size" \
      --arg skill_sha "$skill_sha" \
      --argjson files "$files_json" \
      '{
        name: $name,
        trunk: $trunk,
        version: $version,
        description: $desc,
        skill_md: { url: $skill_url, size_bytes: $skill_size, sha256: $skill_sha }
      }
      + (if ($files | length) == 0 then {} else { files: $files } end)')
  done
fi
skills_json+="]"

jq -n \
  --arg version "1" \
  --arg generated_at "$generated_at" \
  --arg release_tag "$TAG" \
  --arg repo "$REPO" \
  --argjson tools "$tools_json" \
  --argjson skills "$skills_json" \
  '{
    version: $version,
    generated_at: $generated_at,
    release_tag: $release_tag,
    repo: $repo,
    tools: $tools,
    skills: $skills
  }' > "$STAGING/tools.json"

echo "wrote $STAGING/tools.json"
