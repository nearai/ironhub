SKILL_FILE_PREFIX="files"
SKILL_FILE_SEPARATOR="~"

skill_file_asset_name() {
  local skill="$1"
  local rel="$2"

  if [ -z "$rel" ]; then
    echo "error: $skill has a skill file with an empty path" >&2
    return 1
  fi

  case "$rel" in
    /*)
      echo "error: $skill ships '$rel', which is an absolute path" >&2
      return 1
      ;;
    *..*)
      echo "error: $skill ships '$rel', which escapes the skill directory" >&2
      return 1
      ;;
    *"$SKILL_FILE_SEPARATOR"*)
      echo "error: $skill ships '$rel', which contains the reserved '$SKILL_FILE_SEPARATOR' separator" >&2
      return 1
      ;;
  esac

  if printf '%s' "$rel" | grep -qv '^[A-Za-z0-9._/-]\+$'; then
    echo "error: $skill ships '$rel', which is not a portable release-asset path" >&2
    return 1
  fi

  printf '%s.%s.%s' "$skill" "$SKILL_FILE_PREFIX" "$(printf '%s' "$rel" | tr '/' "$SKILL_FILE_SEPARATOR")"
}
