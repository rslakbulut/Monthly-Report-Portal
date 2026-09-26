/**
 * TUTARLILIK BEKCISI — "tek metrik, tek kaynak".
 *
 * Kural (CLAUDE.md, 2026-09-26): bir metrigin kaynagi degistiginde onu
 * tuketen HER yuzey ayni turda guncellenir. Bu kural iki kez ihlal edildi:
 *   - v94 oncesi: kartlar yeni kaynagi (Bolum 3/4, LS OI) kullanirken
 *     yonetim grafigi execMoneyCell/execCountCell icinde hala detay
 *     tablolarindan hesapliyordu (kart 16.4 M€ / grafik 10.9 M€).
 *   - v97 oncesi: site tam sayfasi (renderSiteLevel) ve sunucudaki trend
 *     ozeti ayni hatayi tasiyordu.
 *
 * Ortak desen: bir yuzey GERCEKLESEN degeri kendi basina detay
 * tablolarindan okuyor. Bu test her fonksiyonu tarar; asagidaki izinli
 * listede OLMAYAN bir fonksiyon detay kaynakli gerceklesen alanlara
 * dokunuyorsa test DUSER ve hangi fonksiyonun oldugunu soyler.
 *
 * Yeni bir yuzey eklerken dogru yol: izinli tek-kaynak fonksiyonlarindan
 * birini cagirmak (siteMetrics / sumMetrics / execMoneyCell /
 * execCountCell / execRealMoney / execRealCount / execPlanMoney).
 * Bu listeye yeni isim eklemek ancak o fonksiyon GERCEKTEN yeni bir tek
 * kaynaksa (ya da yedek yolun kendisiyse) mesrudur.
 */
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(cond, label, detail){
  if (cond){ pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '\n       ' + detail : '')); }
}

/* Detay tablolarindan gelen GERCEKLESEN / plan olculeri ve onlari okuyan
   yardimcilar. Budget YTD ADEDI ("budgetYTDCount") bunlardan degil. */
const FORBIDDEN = [
  { re: /realizedOf\s*\(/,              name: 'realizedOf(' },
  { re: /execRealSum\s*\(/,             name: 'execRealSum(' },
  { re: /['"]ytdTurnover['"]/,          name: "'ytdTurnover'" },
  { re: /['"]planYtdTurnover['"]/,      name: "'planYtdTurnover'" },
  { re: /['"]ytdCount['"]/,             name: "'ytdCount'" },
  { re: /\.ytdTurnover\b/,              name: '.ytdTurnover' },
  { re: /\.planYtdTurnover\b/,          name: '.planYtdTurnover' },
  { re: /\br\.ytdCount\b|\ba\.ytdCount\b|\bt\.ytdCount\b|\bm\.ytdCount\b/, name: 'x.ytdCount' }
];

/* Izinli: tek-kaynak fonksiyonlari ve YEDEK yolun kendisi. */
const ALLOWED = {
  'src/Script.html': [
    'realizedOf',        // yedek yol: detaydan toplama
    'planTurnoverMOf',   // tek kaynak: Budget YTD cirosu (LS OI, yoksa detay)
    'siteMetrics',       // tek kaynak: kart / RO satiri / cekmece / site listesi
    'execRealSum',       // yedek yol: detaydan toplama (yonetim ekrani)
    'execRealMoney',     // tek kaynak: gerceklesen ciro (Bolum 3, yoksa detay)
    'execRealCount',     // tek kaynak: gerceklesen adet (Bolum 4, yoksa detay)
    'execPlanMoney',     // tek kaynak: Budget YTD cirosu (LS OI, yoksa detay)
    'audRender',         // Parser audit: detay degerini BILEREK ikincil gosterir
    'audText'            // Parser audit metin dokumu
  ],
  'src/Snapshot.gs': [
    'packMeasure_',      // paketleme: alan adlari
    'trendRollup_'       // tek kaynak kurali + yedek yol (sayfa yoksa detay)
  ],
  'src/Audit.gs': ['auditSite']
};

/* Dosyayi fonksiyonlara boler: govde, "function AD(" bildiriminden EŞLESEN
   kapanis suslu parantezine kadar. (Ilk surum govdeyi "bir sonraki function
   bildirimine kadar" sayiyordu; aradaki UST DUZEY kod -- ornek
   MEASURE_FIELDS listesi -- onceki fonksiyona yaziliyordu.)
   Dize icindeki suslu parantezler sayilmaz. Fonksiyon DISINDA kalan ust
   duzey kod ayrica dondurulur ki orasi da taranabilsin. */
function isRegexStart(src, i){
  let j = i - 1;
  while (j >= 0 && /\s/.test(src[j])) j--;
  if (j < 0) return true;
  if ('(,=:[!&|?{};+-*%<>~^'.indexOf(src[j]) !== -1) return true;
  const word = src.slice(Math.max(0, j - 6), j + 1);
  return /(?:^|[^A-Za-z0-9_$])(return|typeof|case|in|of)$/.test(word);
}
function skipRegex(src, i){
  let inClass = false;
  for (let k = i + 1; k < src.length; k++){
    const c = src[k];
    if (c === '\\'){ k++; continue; }
    if (inClass){ if (c === ']') inClass = false; continue; }
    if (c === '[') { inClass = true; continue; }
    if (c === '/') return k;
    if (c === '\n') return i;              // regex degilmis: tek karakter ilerle
  }
  return i;
}

function functionsOf(src){
  const out = [];
  const re = /^\s*function\s+([A-Za-z0-9_$]+)\s*\(/gm;
  let m, covered = [];
  while ((m = re.exec(src))){
    const start = m.index;
    let i = src.indexOf('{', re.lastIndex);
    if (i < 0) break;
    let depth = 0, q = null;
    for (; i < src.length; i++){
      const ch = src[i];
      if (q){
        if (ch === '\\'){ i++; continue; }
        if (ch === q) q = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`'){ q = ch; continue; }
      /* Regex literali: icindeki tirnak/suslu parantez sayimi bozmasin
         (ornek: esc() icindeki /[&<>"]/g). Bolme isaretinden ayirmak icin
         bir onceki anlamli karaktere bakilir. */
      if (ch === '/' && isRegexStart(src, i)){ i = skipRegex(src, i); continue; }
      if (ch === '{') depth++;
      else if (ch === '}'){ depth--; if (depth === 0) break; }
    }
    out.push({ name: m[1], body: src.slice(start, i + 1) });
    covered.push([start, i + 1]);
    re.lastIndex = i + 1;              // ic ice fonksiyonlar dis fonksiyona ait
  }
  let residue = '', at = 0;
  covered.forEach(c => { residue += src.slice(at, c[0]); at = c[1]; });
  residue += src.slice(at);
  return { fns: out, residue: residue };
}

/* Yorumlar taranmaz: gerekceyi anlatan metin alan adini gecirebilir. */
function stripComments(s){
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
}

for (const file of Object.keys(ALLOWED)){
  console.log('\n' + file);
  const src = stripComments(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'));
  const parsed = functionsOf(src), fns = parsed.fns;
  let offenders = [];
  /* Fonksiyon disi ust duzey kod: yalniz paket alan adi listesi izinli. */
  const residue = parsed.residue.replace(/var\s+MEASURE_FIELDS\s*=\s*\[[^\]]*\];/, '');
  FORBIDDEN.forEach(f => { if (f.re.test(residue)) offenders.push('(ust duzey kod)  ->  ' + f.name); });
  fns.forEach(fn => {
    if (ALLOWED[file].indexOf(fn.name) !== -1) return;
    FORBIDDEN.forEach(f => {
      if (f.re.test(fn.body)) offenders.push(fn.name + '  ->  ' + f.name);
    });
  });
  ok(offenders.length === 0,
     'hicbir yuzey gerceklesen degeri detay tablolarindan KENDI BASINA okumuyor',
     offenders.length ? 'ihlal:\n         ' + offenders.join('\n         ') +
       '\n       Bu yuzeyi tek-kaynak fonksiyonlarindan birine baglayin (bkz. dosya basi).' : '');
  /* Izinli listedeki her isim GERCEKTEN var olmali: bir fonksiyon silinip
     adi listede kalirsa liste sessizce anlamini yitirir. */
  const names = fns.map(f => f.name);
  const stale = ALLOWED[file].filter(n => names.indexOf(n) === -1);
  ok(stale.length === 0, 'izinli listede olu isim yok',
     stale.length ? 'olu: ' + stale.join(', ') : '');
}

console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + ' gecti, ' + fail + ' kaldi');
process.exit(fail ? 1 : 0);
