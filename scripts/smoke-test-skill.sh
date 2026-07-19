#!/usr/bin/env bash
set -euo pipefail

# Smoke test a single skill directory under ironhub/skills/.
#
# Usage:
#   scripts/smoke-test-skill.sh skills/workflows/<skill-name>/
#
# Checks:
#   1. SKILL.md exists and frontmatter parses as valid YAML
#   2. All required top-level fields present
#   3. Name matches Reborn validation pattern
#   4. Activation limits respect Reborn caps (20 kw, 5 patterns, 10 tags)
#   5. Keywords meet the 3-char minimum
#   6. All patterns compile as regex
#   7. Hard rules section present in body
#   8. If a companion asset is referenced, it exists
#   9. Activation fixtures (optional, via .smoke-fixtures.json in skill dir)
#
# Returns non-zero on any failure. Designed to be wired into a pre-commit
# hook eventually.

if [ "$#" -ne 1 ]; then
    echo "usage: $0 <skill-dir>" >&2
    exit 64
fi

SKILL_DIR="$1"
if [ ! -d "$SKILL_DIR" ]; then
    echo "error: not a directory: $SKILL_DIR" >&2
    exit 66
fi
if [ ! -f "$SKILL_DIR/SKILL.md" ]; then
    echo "error: no SKILL.md in $SKILL_DIR" >&2
    exit 66
fi

python3 - "$SKILL_DIR" <<'PY'
import json, pathlib, re, sys, yaml

skill_dir = pathlib.Path(sys.argv[1])
skill_md = skill_dir / "SKILL.md"
content = skill_md.read_text()

if not content.startswith("---\n"):
    print(f"FAIL  {skill_md}: no opening frontmatter delimiter")
    sys.exit(1)
end = content.find("\n---\n", 4)
if end == -1:
    print(f"FAIL  {skill_md}: no closing frontmatter delimiter")
    sys.exit(1)
fm_text = content[4:end]
body = content[end+5:]

try:
    fm = yaml.safe_load(fm_text)
except yaml.YAMLError as e:
    print(f"FAIL  {skill_md}: YAML parse error: {e}")
    print("       check for unquoted colons mid-description, ': ' triggers mapping interpretation")
    sys.exit(1)

failures = 0

def check(cond, ok_msg, fail_msg):
    global failures
    if cond:
        print(f"ok    {ok_msg}")
    else:
        print(f"FAIL  {fail_msg}")
        failures += 1

# Required top-level fields
for f in ["name", "version", "description", "activation", "requires"]:
    check(f in fm, f"field present: {f}", f"missing field: {f}")

# Name pattern
name = fm.get("name", "")
check(
    bool(re.match(r"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$", name)),
    f"name '{name}' matches Reborn pattern",
    f"name '{name}' does not match Reborn pattern",
)

# Activation limits
act = fm.get("activation", {}) or {}
for field, cap in {"keywords": 20, "exclude_keywords": 20, "patterns": 5, "tags": 10}.items():
    val = act.get(field, []) or []
    if not isinstance(val, list):
        check(False, "", f"activation.{field} is not a list")
        continue
    check(len(val) <= cap, f"activation.{field}: {len(val)}/{cap}", f"activation.{field} exceeds cap {cap}: {len(val)}")

# Keyword min length
short = [k for k in (act.get("keywords") or []) if len(k) < 3]
check(not short, "all keywords >= 3 chars", f"keywords under 3 chars (Reborn drops them): {short}")

# Patterns compile
patterns = act.get("patterns", []) or []
pattern_fails = []
for p in patterns:
    try:
        re.compile(p)
    except re.error as e:
        pattern_fails.append((p, str(e)))
check(not pattern_fails, f"{len(patterns)} pattern(s) compile", f"pattern compile errors: {pattern_fails}")

# Hard rules section
check("## Hard rules" in body, "Hard rules section present", "missing '## Hard rules' section in body")

# Companion asset
asset_match = re.search(r"`assets/([^`]+)`", body)
if asset_match:
    asset_path = skill_dir / "assets" / asset_match.group(1)
    check(asset_path.exists(), f"companion asset exists: assets/{asset_match.group(1)}", f"companion asset referenced but missing: {asset_path}")

# Activation fixtures (optional)
fixtures_file = skill_dir / ".smoke-fixtures.json"
if fixtures_file.exists():
    try:
        fixtures = json.loads(fixtures_file.read_text())
    except json.JSONDecodeError as e:
        check(False, "", f"fixtures JSON parse error: {e}")
        fixtures = {}

    if not isinstance(fixtures, dict):
        check(False, "", "fixtures JSON root must be an object")
        fixtures = {}

    for fixture_kind in ("positive", "negative"):
        fixture_values = fixtures.get(fixture_kind, [])
        if not isinstance(fixture_values, list):
            check(False, "", f"fixtures.{fixture_kind} must be a list")
            fixtures[fixture_kind] = []
            continue

        invalid_values = [value for value in fixture_values if not isinstance(value, str) or not value.strip()]
        check(
            not invalid_values,
            f"fixtures.{fixture_kind} contains only non-empty strings",
            f"fixtures.{fixture_kind} contains invalid entries: {invalid_values}",
        )
        fixtures[fixture_kind] = [
            value for value in fixture_values if isinstance(value, str) and value.strip()
        ]

    def matches(text):
        tl = text.lower()
        for ex in (act.get("exclude_keywords") or []):
            if ex.lower() in tl:
                return False, f"excluded by '{ex}'"
        for kw in (act.get("keywords") or []):
            if kw.lower() in tl:
                return True, f"keyword '{kw}'"
        for p in (act.get("patterns") or []):
            if re.search(p, text):
                return True, f"pattern"
        return False, "no match"

    for p in fixtures.get("positive", []):
        ok, why = matches(p)
        check(ok, f"positive activates: {p[:60]}  ({why})", f"positive did not activate: {p}  ({why})")
    for n in fixtures.get("negative", []):
        ok, why = matches(n)
        check(not ok, f"negative does not activate: {n[:60]}  ({why})", f"negative incorrectly activated: {n}  ({why})")
else:
    print(f"info  no activation fixtures found at {fixtures_file} (optional)")

print("")
if failures:
    print(f"SMOKE TEST FAIL  {failures} failure(s)")
    sys.exit(1)
print("SMOKE TEST PASS")
PY
