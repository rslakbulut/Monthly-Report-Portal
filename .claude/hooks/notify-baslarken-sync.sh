#!/usr/bin/env bash
# docs/baslarken.md degisince .claude/skills/standartlar-uyumluluk/checklist.json'in
# (ve gerekirse SKILL.md'nin) etkilenip etkilenmedigini hatirlatir. BLOKLAMAZ - yalniz
# bilgilendirme. PreToolUse hook, matcher: Edit|Write.
# 2026-09-22: yalniz sabit metin degil, gercek bir sayi karsilastirmasi da yapar - "## N."
# adim sayisi ile checklist.json'daki kategori sayisi zaten farkliysa mesaja ekler, boylece
# hatirlatma somut bir sinyal tasir (bkz. scripts/verify-repo.sh adim 5 - ayni kontrolun CI
# tarafi, bu ise oturum-ici, duzenleme anindaki tarafi).
set -euo pipefail
input="$(cat)"
path="$(echo "$input" | jq -r '.tool_input.file_path // empty')"

if [[ "$path" == *"docs/baslarken.md" ]]; then
  detail=""
  checklist=".claude/skills/standartlar-uyumluluk/checklist.json"
  if [ -f "docs/baslarken.md" ] && [ -f "$checklist" ] && command -v jq >/dev/null 2>&1; then
    steps="$(grep -cE '^## [0-9]+' docs/baslarken.md 2>/dev/null || echo '?')"
    cats="$(jq '.categories | length' "$checklist" 2>/dev/null || echo '?')"
    detail=" (su an: baslarken.md ~$steps adim, checklist.json $cats kategori - degisikligin sonrasinda bu iki sayiyi tekrar karsilastir)"
  fi
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"allow\",\"permissionDecisionReason\":\"Hatirlatma: docs/baslarken.md degisiyor - yeni/degisen bir adim varsa .claude/skills/standartlar-uyumluluk/checklist.json (ve gerekirse SKILL.md) da guncellenmeli, yoksa Denetim Modu o standardi hic goremez.${detail}\"}}"
  exit 0
fi

exit 0
