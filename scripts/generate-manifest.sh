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

set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: $0 <staging_dir> <release_tag> <repo>" >&2
  exit 64
fi

STAGING="$1"
TAG="$2"
REPO="$3"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

base_url="https://github.com/${REPO}/releases/download/${TAG}"
generated_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

tools_json="["
first=1
for dir in "$ROOT"/tools/*/; do
  name="$(basename "$dir")"
  caps_file="${dir}${name}-tool.capabilities.json"
  cargo_toml="${dir}Cargo.toml"
  wasm_path="${STAGING}/${name}.wasm"
  caps_staged="${STAGING}/${name}.capabilities.json"

  if [ ! -f "$wasm_path" ] || [ ! -f "$caps_staged" ]; then
    echo "warning: missing artifacts for tool $name, skipping" >&2
    continue
  fi

  crate_name="$(grep -E '^name\s*=' "$cargo_toml" | head -1 | sed -E 's/^name\s*=\s*"(.+)"\s*$/\1/')"
  version="$(grep -E '^version\s*=' "$cargo_toml" | head -1 | sed -E 's/^version\s*=\s*"(.+)"\s*$/\1/')"
  description="$(jq -r '.description // ""' "$caps_file")"

  wasm_size="$(stat -c '%s' "$wasm_path")"
  wasm_sha="$(sha256sum "$wasm_path" | awk '{print $1}')"
  caps_size="$(stat -c '%s' "$caps_staged")"
  caps_sha="$(sha256sum "$caps_staged" | awk '{print $1}')"

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
    '{
      name: $name,
      crate_name: $crate,
      version: $version,
      description: $desc,
      wasm: { url: $wasm_url, size_bytes: $wasm_size, sha256: $wasm_sha },
      capabilities: { url: $caps_url, size_bytes: $caps_size, sha256: $caps_sha }
    }')
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
      '{
        name: $name,
        trunk: $trunk,
        version: $version,
        description: $desc,
        skill_md: { url: $skill_url, size_bytes: $skill_size, sha256: $skill_sha }
      }')
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
