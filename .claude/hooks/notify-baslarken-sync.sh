#!/usr/bin/env bash
# docs/baslarken.md degisince .claude/skills/standartlar-uyumluluk/checklist.json'in
# (ve gerekirse SKILL.md'nin) etkilenip etkilenmedigini hatirlatir. BLOKLAMAZ - yalniz
# bilgilendirme. PreToolUse hook, matcher: Edit|Write.
set -euo pipefail
input="$(cat)"
path="$(echo "$input" | jq -r '.tool_input.file_path // empty')"

if [[ "$path" == *"docs/baslarken.md" ]]; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","permissionDecisionReason":"Hatirlatma: docs/baslarken.md degisiyor - yeni/degisen bir adim varsa .claude/skills/standartlar-uyumluluk/checklist.json (ve gerekirse SKILL.md) da guncellenmeli, yoksa Denetim Modu o standardi hic goremez."}}'
  exit 0
fi

exit 0
