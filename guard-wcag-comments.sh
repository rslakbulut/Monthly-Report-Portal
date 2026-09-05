#!/usr/bin/env bash
# CLAUDE.md kurali: tokens/colors-bursa-cv-projects.css icindeki WCAG olcum yorumlari
# silinmez - hangi rengin neden secildiginin tek kaydi orasi. PreToolUse hook,
# matcher: Edit|Write. Yalniz bu tek dosyayi hedefleyen cagrilarda calisir.
set -euo pipefail
input="$(cat)"
tool="$(echo "$input" | jq -r '.tool_name // empty')"
path="$(echo "$input" | jq -r '.tool_input.file_path // empty')"

[[ "$path" == *"tokens/colors-bursa-cv-projects.css" ]] || exit 0

deny() {
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"tokens/colors-bursa-cv-projects.css icindeki WCAG olcum yorumlari silinmez (CLAUDE.md Degismez Kurallar) - hangi rengin neden secildiginin tek kaydi orasi."}}'
  exit 0
}

case "$tool" in
  Edit)
    old="$(echo "$input" | jq -r '.tool_input.old_string // empty')"
    new="$(echo "$input" | jq -r '.tool_input.new_string // empty')"
    if echo "$old" | grep -qi 'WCAG' && ! echo "$new" | grep -qi 'WCAG'; then
      deny
    fi
    ;;
  Write)
    content="$(echo "$input" | jq -r '.tool_input.content // empty')"
    if [ -f "$path" ] && grep -qi 'WCAG' "$path" && ! echo "$content" | grep -qi 'WCAG'; then
      deny
    fi
    ;;
esac

exit 0
