#!/usr/bin/env bash
set -euo pipefail

# Walk every SKILL.md in ironhub/skills and verify each backtick-quoted
# `<extension>.<capability>` reference resolves against the first-party
# Reborn extension manifests. Catches drift between skill prose and the
# actual capabilities a deployment has wired up.
#
# Pending extensions (declared but not yet shipped) are warnings, not errors.
# Tokens whose prefix is neither a known nor a pending extension are skipped
# silently — they're prose like `near.org` or `lib.rs`, not capability calls.
#
# Set REBORN_ROOT if your local reborn-integration checkout lives elsewhere.

REBORN_ROOT="${REBORN_ROOT:-$HOME/VScode/ironclaw-reborn}"
EXTENSIONS_DIR="$REBORN_ROOT/crates/ironclaw_first_party_extensions/assets"
SKILLS_DIR="$(cd "$(dirname "$0")/.." && pwd)/skills"

PENDING_EXTENSIONS=(slack attio)

if [[ ! -d "$EXTENSIONS_DIR" ]]; then
    echo "error: reborn extensions dir not found at $EXTENSIONS_DIR"
    echo "       set REBORN_ROOT to the path of your local reborn-integration checkout."
    exit 2
fi

# Build a map of extension id -> manifest path by reading the id field from
# each manifest.toml. The directory name and the id can differ (notion-mcp
# directory ships an extension whose id is "notion").
declare -A EXTENSION_MANIFEST
while IFS= read -r manifest; do
    ext_id=$(awk -F\" '/^id = "/ { print $2; exit }' "$manifest")
    [[ -n "$ext_id" ]] && EXTENSION_MANIFEST["$ext_id"]="$manifest"
done < <(find "$EXTENSIONS_DIR" -mindepth 2 -maxdepth 2 -name manifest.toml | sort)

is_pending() {
    local ext="$1"
    for p in "${PENDING_EXTENSIONS[@]}"; do
        [[ "$ext" == "$p" ]] && return 0
    done
    return 1
}

# Pull backtick-quoted <prefix>.<suffix> tokens from the prose body
# (everything after the second --- delimiter, so the YAML frontmatter is
# skipped). Whether the prefix is a real extension is checked later.
extract_refs() {
    awk '
        /^---$/ { delim_count++; next }
        delim_count >= 2 {
            line = $0
            while (match(line, /`[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*`/)) {
                token = substr(line, RSTART + 1, RLENGTH - 2)
                print FILENAME ":" NR ":" token
                line = substr(line, RSTART + RLENGTH)
            }
        }
    ' "$1"
}

errors=0
warnings=0
checked=0

while IFS= read -r skill; do
    while IFS= read -r entry; do
        [[ -z "$entry" ]] && continue
        file="${entry%%:*}"
        rest="${entry#*:}"
        line_no="${rest%%:*}"
        token="${rest#*:}"
        ext="${token%%.*}"
        cap="${token#*.}"
        location="$file:$line_no"

        manifest="${EXTENSION_MANIFEST[$ext]:-}"

        if [[ -n "$manifest" ]]; then
            checked=$((checked + 1))
            if ! grep -qE "^id = \"$ext\.$cap\"" "$manifest"; then
                echo "fail: $location  $token  (capability '$cap' not declared in extension '$ext')"
                errors=$((errors + 1))
            fi
            continue
        fi

        if is_pending "$ext"; then
            checked=$((checked + 1))
            echo "warn: $location  $token  (extension '$ext' is pending)"
            warnings=$((warnings + 1))
        fi
    done < <(extract_refs "$skill")
done < <(find "$SKILLS_DIR" -name SKILL.md -type f | sort)

skill_count=$(find "$SKILLS_DIR" -name SKILL.md -type f | wc -l)

echo ""
echo "checked $checked capability reference(s) across $skill_count skill(s)"

if (( errors > 0 )); then
    echo "FAIL  $errors error(s), $warnings warning(s)"
    exit 1
fi

if (( warnings > 0 )); then
    echo "PASS (with warnings)  $warnings pending-extension reference(s)"
    exit 0
fi

echo "PASS  all capability references resolve"
