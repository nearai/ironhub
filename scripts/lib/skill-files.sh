SKILL_FILE_PREFIX="files"

skill_file_asset_name() {
  local skill="$1"
  local rel="$2"
  local path_digest

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
  esac

  if printf '%s' "$rel" | grep -qv '^[A-Za-z0-9._/-]\+$'; then
    echo "error: $skill ships '$rel', which is not a portable release-asset path" >&2
    return 1
  fi

  # GitHub normalizes unsupported release-asset characters, so keep the
  # filename provider-safe while the manifest retains the logical path.
  path_digest="$(printf '%s' "$rel" | sha256sum | awk '{print $1}')"
  printf '%s.%s.%s' "$skill" "$SKILL_FILE_PREFIX" "$path_digest"
}
