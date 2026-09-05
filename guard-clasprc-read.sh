#!/usr/bin/env bash
# apps-script-push skill guvenlik kurali: ~/.clasprc.json Read/Grep aracıyla acilamaz/aranamaz
# - icerigi asla ekrana yazdirilmaz. PreToolUse hook, matcher: Read|Grep.
# Bkz. .claude/skills/apps-script-push/SKILL.md.
set -euo pipefail
input="$(cat)"
path="$(echo "$input" | jq -r '.tool_input.file_path // .tool_input.path // empty')"
[ -z "$path" ] && exit 0
if echo "$path" | grep -qi 'clasprc\.json'; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"~/.clasprc.json bu aracla acilamaz/aranamaz - icerigi asla ekrana yazdirilmaz (apps-script-push guvenlik kurali). Varligini kontrol etmek icin Bash ile ls -la kullan."}}'
  exit 0
fi
exit 0
