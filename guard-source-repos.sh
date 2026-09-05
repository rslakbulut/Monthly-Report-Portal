#!/usr/bin/env bash
# CLAUDE.md kurali: kaynak depolara (ValeoDashboard, Bursa-CV-Projects) asla yazilmaz - bu
# repo onlari yalniz OKUYARAK beslenir. PreToolUse hook, matcher: Edit|Write|Bash.
set -euo pipefail
input="$(cat)"
tool="$(echo "$input" | jq -r '.tool_name // empty')"

deny() {
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"Kaynak depolara (ValeoDashboard, Bursa-CV-Projects) asla yazilmaz (CLAUDE.md Degismez Kurallar) - $1\"}}"
  exit 0
}

case "$tool" in
  Edit|Write)
    path="$(echo "$input" | jq -r '.tool_input.file_path // empty')"
    if echo "$path" | grep -qiE 'ValeoDashboard|Bursa-CV-Projects'; then
      deny "hedef yol kaynak depo icinde gorunuyor: $path"
    fi
    ;;
  Bash)
    cmd="$(echo "$input" | jq -r '.tool_input.command // empty')"
    # "git" ve "add|commit|push" komut icinde herhangi bir yerde birlikte geciyorsa yeterli -
    # "git -C <dir> push", "cd <dir> && git push" gibi bilesik/parametreli formlari da
    # yakalamak icin git'ten hemen sonra gelme sarti aranmiyor.
    if echo "$cmd" | grep -qE '\bgit\b' \
       && echo "$cmd" | grep -qE '\b(add|commit|push)\b' \
       && echo "$cmd" | grep -qiE 'ValeoDashboard|Bursa-CV-Projects'; then
      deny "komut kaynak depo adini bir git yazma islemiyle birlikte iceriyor"
    fi
    ;;
esac

exit 0
