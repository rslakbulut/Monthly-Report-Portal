#!/usr/bin/env bash
# apps-script-push skill guvenlik kurali: ~/.clasprc.json (Google OAuth kimlik dosyasi)
# icerigi asla okunmaz/yazdirilmaz, ve asla git'e commit edilmez. Yalniz varlik kontrolu
# (ls/stat/test) serbest. PreToolUse hook, matcher: Bash. Bkz. .claude/skills/apps-script-push/SKILL.md.
set -euo pipefail
input="$(cat)"
cmd="$(echo "$input" | jq -r '.tool_input.command // empty')"
[ -z "$cmd" ] && exit 0

# 1) Icerik okuma girisimi: clasprc.json geciyor ama komutun TAMAMI ls/stat/test degil
if echo "$cmd" | grep -qi 'clasprc\.json'; then
  if ! echo "$cmd" | grep -qE '^[[:space:]]*(ls([[:space:]]+-[a-zA-Z]+)?|stat|test[[:space:]]+-f|\[[[:space:]]+-f)[[:space:]]+[^|;&`]*clasprc\.json[^|;&`]*\]?[[:space:]]*$'; then
    echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"~/.clasprc.json icerigi asla okunmaz/yazdirilmaz (apps-script-push guvenlik kurali). Yalnizca varligi ls -la ile kontrol edilebilir."}}'
    exit 0
  fi
fi

# 2) git add/commit sirasinda .clasprc.json calisma dizininde/staged mi
if echo "$cmd" | grep -qE '^[[:space:]]*git[[:space:]]+(add|commit)\b'; then
  if git status --porcelain 2>/dev/null | grep -q 'clasprc\.json'; then
    echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":".clasprc.json calisma dizininde gorunuyor - bu dosya asla commit edilmez (Google OAuth kimlik dosyasi). .gitignore dosyasina ekleyip tekrar dene."}}'
    exit 0
  fi
fi

exit 0
