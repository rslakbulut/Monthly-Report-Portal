/**
 * dashValuesOf_ -- panonun gosterdigi degerlerin SUNUCU karsiligi.
 * Trend ozeti ve Parser audit'in "Dashboard" sutunu bunu kullanir; kural
 * istemcideki siteMetrics / execMoneyCell ile ayni olmali:
 *   once sayfanin kendi tablosu (Bolum 3/4, LS OI), yoksa o site icin detay.
 */
const fs = require('fs');
const SRC = ['SiteRegistry','DateUtil','SheetReader','Parser','Snapshot']
  .map(f => fs.readFileSync(__dirname + '/../src/' + f + '.gs','utf8')).join('\n');
eval(SRC);

let pass = 0, fail = 0;
function eq(a, b, label){
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok){ pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + '\n       beklenen: ' + JSON.stringify(b) +
                             '\n       gelen   : ' + JSON.stringify(a)); }
}
const r2 = x => Math.round(x * 100) / 100;

/* Paketli olcu dizisi: [count, turnover, ytdCount, ytdTurnover, planYtdCount, planYtdTurnover] (k€) */
const detail = [{ t: [10, 3000, 6, 1800, 7, 2100] }, { t: [4, 1000, 2, 400, 3, 500] }];

console.log('\n1) Sayfa degerleri varsa ONLAR kullanilir (NEW + REMAN)');
{
  const v = dashValuesOf_({
    bt: { TOTAL: { NEW: 2.0, REMAN: 0.8 } }, bc: { TOTAL: { NEW: 40, REMAN: 7 } },
    by: { TOTAL: { NEW: 30, REMAN: 4 } },    ld: { TOTAL: { NEW: 3.0, REMAN: 0.5 } },
    rc: { TOTAL: { NEW: 40, REMAN: 2 } },    bq: { NEW: 0.92, REMAN: 0.10 },
    bl: detail
  });
  eq(r2(v.budgetYearOI), 2.8, 'Budget Year O.I = 2.0 + 0.8');
  eq(v.budgetYearQty, 47, 'Budget Year adet');
  eq(v.budgetYtdQty, 34, 'Budget YTD adet');
  eq(r2(v.budgetYtdOI), 1.02, 'Budget YTD O.I = LS OI 0.92 + 0.10');
  eq(v.realQty, 42, 'Real Launches = Bolum 4, 40 + 2 (detaydaki 8 DEGIL)');
  eq(r2(v.realOI), 3.5, 'Launch Done = Bolum 3, 3.0 + 0.5 (detaydaki 2.2 DEGIL)');
  eq(v.detailQty, 8, 'detay (ikincil) ayrica tasiniyor');
}

console.log('\n2) Sayfa degeri YOKSA o site icin detaya dusulur');
{
  const v = dashValuesOf_({ bl: detail });
  eq(v.realQty, 8, 'Real = detay ytdCount 6 + 2');
  eq(r2(v.realOI), 2.2, 'Launch Done = detay (1800 + 400) k€');
  eq(r2(v.budgetYtdOI), 2.6, 'Budget YTD O.I = detay plan (2100 + 500) k€');
}

console.log('\n3) "0" bir degerdir, "yok" degil');
{
  const v = dashValuesOf_({ rc: { TOTAL: { NEW: 0, REMAN: 0 } }, ld: { TOTAL: { NEW: 0, REMAN: null } },
                            bl: detail });
  eq(v.realQty, 0, 'sayfada 0 yazan site 0 gosterir, detaya DUSMEZ');
  eq(v.realOI, 0, 'NEW 0 + REMAN bos = 0');
}

console.log('\n4) Trend ozeti ayni kurali kullaniyor');
{
  const t = trendRollup_([
    { ro: 'PDA', ld: { TOTAL: { NEW: 1.55, REMAN: 0 } }, rc: { TOTAL: { NEW: 5 } }, bl: detail },
    { ro: 'PDA', ld: { TOTAL: { NEW: 2.35, REMAN: 0 } }, rc: { TOTAL: { NEW: 7 } }, bl: detail }
  ]);
  eq(t.PDA.rt, 3.9, 'RO cirosu ham degerlerin toplami (1.55 + 2.35), yuvarlanmislarin degil');
  eq(t.PDA.rc, 12, 'RO adedi Bolum 4 degerlerinden');
}

console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + ' gecti, ' + fail + ' kaldi');
process.exit(fail ? 1 : 0);
