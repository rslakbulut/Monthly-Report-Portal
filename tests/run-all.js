/**
 * TUM testleri calistirir; biri bile duserse cikis kodu 1.
 * Kural (CLAUDE.md): her degisiklikten sonra ve HER deploy'dan once bu
 * calistirilir. Tek tek hatirlamaya dayanmasin diye tek komut:
 *     node tests/run-all.js
 * Yeni bir *-test.js dosyasi eklendiginde buraya yazmaya gerek yok;
 * klasordeki tum *-test.js dosyalari otomatik bulunur.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const files = fs.readdirSync(__dirname).filter(f => /-test\.js$/.test(f)).sort();
let failed = [];
files.forEach(f => {
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const summary = (out.match(/(PASS|FAIL) — [^\n]*/g) || ['(ozet yok)']).pop();
  const good = r.status === 0;
  console.log((good ? '  ok   ' : '  FAIL ') + f.padEnd(28) + summary);
  if (!good){ failed.push(f); console.log(out.split('\n').filter(l => /FAIL|->|Error/.test(l)).slice(0, 12).map(l => '         ' + l).join('\n')); }
});
console.log('\n' + (failed.length ? 'FAIL — ' + failed.length + ' dosya dustu: ' + failed.join(', ')
                                  : 'PASS — ' + files.length + ' test dosyasinin hepsi gecti'));
process.exit(failed.length ? 1 : 0);
