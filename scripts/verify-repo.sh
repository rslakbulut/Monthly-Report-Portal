#!/usr/bin/env bash
# 2026-09-22 eklendi (ExpertAI denetimi — bkz. eng-furkany/ExpertAI
# reports/monthly-report-portal/2026-09-22-denetim-raporu.html). Bu repo, "kopyala-yapıştır"
# olarak taşınan bir referans deposu olduğu için, kendi göreli linklerinin/klasör yapısının
# bozulmadığını hiçbir mekanizma doğrulamıyordu — repo bir kez GitHub'a düz dosya listesi
# olarak yüklenip fark edilmeden aylarca öyle kaldı. Bu script o sınıf hatayı erken yakalamak
# için: (1) settings.json'daki hook yollarının var olduğunu, (2) 3 skill klasörünün doğru
# yerde olduğunu, (3) dokümanlardaki repo-göreli yol referanslarının gerçekten çözüldüğünü,
# (4) tokens/colors.css ile tokens/colors-valeo-dashboard.css'in aynı renk değerlerini
# taşıdığını, (5) docs/baslarken.md'deki adım sayısı ile checklist.json kategori sayısının
# birbirinden fazla sapmadığını kontrol eder. Hiçbiri kod değiştirmez, yalnız rapor eder.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
warn() { echo "UYARI: $1"; }
err()  { echo "HATA:  $1"; fail=1; }

echo "== 1) .claude/settings.json hook yolları =="
if [ -f .claude/settings.json ]; then
  while IFS= read -r cmd; do
    path="$(echo "$cmd" | sed -nE 's/^bash[[:space:]]+([^[:space:]]+\.sh).*/\1/p')"
    [ -z "$path" ] && continue
    if [ ! -f "$path" ]; then
      err "settings.json'da tanımlı hook diskte yok: $path"
    fi
  done < <(jq -r '[.hooks.PreToolUse[]?.hooks[]?.command, .hooks.SessionStart[]?.hooks[]?.command] | .[] // empty' .claude/settings.json 2>/dev/null)
else
  err ".claude/settings.json yok"
fi

echo "== 2) Skill klasörleri =="
for name in apps-script-push mvp-akisi standartlar-uyumluluk; do
  f=".claude/skills/$name/SKILL.md"
  if [ ! -f "$f" ]; then
    err "beklenen skill dosyası yok: $f"
  fi
done

echo "== 3) Göreli yol referansları (docs/*.md, README.md, CLAUDE.md, tokens/*.css) =="
# docs/, tokens/, assets/, .claude/... öneki taşıyan backtick-içi yol referanslarını çıkar,
# repo köküne göre çözülüp çözülmediğine bak. Basit ama gerçek bir kontrol — kapsamlı bir
# markdown-link parser değil.
missing_refs=0
while IFS= read -r line; do
  file="$(echo "$line" | cut -d: -f1)"
  ref="$(echo "$line" | cut -d: -f3- | tr -d '`')"
  [ -z "$ref" ] && continue
  [ -f "$ref" ] || { warn "$file içinde çözülmeyen referans: $ref"; missing_refs=$((missing_refs+1)); }
done < <(grep -rEno '`(docs|tokens|assets|\.claude)/[A-Za-z0-9_./-]+\.(md|css|png|json|html|sh)`' \
           README.md CLAUDE.md docs/*.md tokens/*.css 2>/dev/null)
if [ "$missing_refs" -gt 0 ]; then
  warn "$missing_refs göreli referans çözülemedi (yukarıda listelendi) — bazıları meşru olarak kapsam dışı bir dosyaya işaret ediyor olabilir (ör. henüz main'de olmayan bir kaynak), elle gözden geçir."
fi

echo "== 4) tokens/colors.css vs tokens/colors-valeo-dashboard.css değer eşitliği =="
extract_root_block() { sed -n '/^:root {/,/^}/p' "$1"; }
a="$(extract_root_block tokens/colors.css)"
b="$(extract_root_block tokens/colors-valeo-dashboard.css)"
if [ "$a" != "$b" ]; then
  err "tokens/colors.css ile tokens/colors-valeo-dashboard.css'in :root değişken blokları farklı — biri güncellenip diğeri unutulmuş olabilir."
  diff <(echo "$a") <(echo "$b") || true
fi

echo "== 5) docs/baslarken.md adım sayısı vs checklist.json kategori sayısı =="
if [ -f docs/baslarken.md ] && [ -f .claude/skills/standartlar-uyumluluk/checklist.json ]; then
  steps="$(grep -cE '^## [0-9]+' docs/baslarken.md)"
  cats="$(jq '.categories | length' .claude/skills/standartlar-uyumluluk/checklist.json)"
  diffcount=$((steps - cats))
  [ "$diffcount" -lt 0 ] && diffcount=$((-diffcount))
  if [ "$diffcount" -gt 2 ]; then
    warn "docs/baslarken.md $steps adım içeriyor, checklist.json $cats kategori — fark $diffcount, baslarken.md güncellenmiş olabilir, checklist.json'ı gözden geçir (bkz. .claude/hooks/notify-baslarken-sync.sh)."
  else
    echo "OK — baslarken.md $steps adım, checklist.json $cats kategori (fark $diffcount, kabul edilebilir aralıkta: alt-adımlar/varsa-maddeler 1:1 eşleşmeyebilir)."
  fi
else
  warn "docs/baslarken.md veya checklist.json bulunamadı, 5. kontrol atlandı."
fi

echo
if [ "$fail" -ne 0 ]; then
  echo "verify-repo.sh: en az bir HATA var, yukarıya bak."
  exit 1
fi
echo "verify-repo.sh: HATA yok (UYARI'lar elle gözden geçirilmeli)."
exit 0
