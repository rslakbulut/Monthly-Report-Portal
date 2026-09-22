#!/usr/bin/env bash
# 2026-09-22 eklendi (ExpertAI denetimi, Reliability bulgusu: hook'lar sessizce
# calismayabiliyor, bunu fark ettirecek hicbir mekanizma yoktu). SessionStart hook'u:
# .claude/settings.json'daki her "bash .claude/hooks/...sh" komutunun gercekten var ve
# calistirilabilir oldugunu dogrular. BLOKLAMAZ (SessionStart bir islemi engelleyemez) ama
# eksik varsa acik, sessiz-olmayan bir uyari basar - amac "sessiz basarisizlik"i "gurultulu
# basarisizlik"a cevirmek.
set -uo pipefail

settings=".claude/settings.json"
if [ ! -f "$settings" ]; then
  echo "UYARI (selfcheck.sh): $settings bulunamadi - hic bir PreToolUse guard hook'u yuklenmiyor olabilir." >&2
  exit 0
fi

missing=0
while IFS= read -r cmd; do
  # "bash .claude/hooks/<script>.sh" seklindeki komutlardan yol kismini ayikla
  path="$(echo "$cmd" | sed -nE 's/^bash[[:space:]]+([^[:space:]]+\.sh).*/\1/p')"
  [ -z "$path" ] && continue
  if [ ! -f "$path" ]; then
    echo "UYARI (selfcheck.sh): hook dosyasi yok: $path (settings.json'da tanimli ama diskte bulunamadi)" >&2
    missing=$((missing+1))
  elif [ ! -r "$path" ]; then
    echo "UYARI (selfcheck.sh): hook dosyasi okunamiyor: $path" >&2
    missing=$((missing+1))
  fi
done < <(jq -r '.hooks.PreToolUse[]?.hooks[]?.command // empty' "$settings" 2>/dev/null)

if [ "$missing" -gt 0 ]; then
  echo "selfcheck.sh: $missing hook dosyasi eksik/erisilemez - guard'lar CALISMIYOR olabilir. Detay icin scripts/verify-repo.sh calistir." >&2
  exit 0
fi

exit 0
