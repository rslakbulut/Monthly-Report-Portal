/**
 * "LS OI <yil>" sayfasindan Budget YTD cirosu.
 * Fixture ekran goruntusunun birebir yapisi: birlestirilmis RO/site
 * hucreleri (deger yalniz sol ust hucrede), ay basliklari ve altlarinda
 * LS / OI alt basliklari.
 */
const fs = require('fs');
const SRC = ['SiteRegistry','DateUtil','SheetReader','Parser','LsOi']
  .map(f => fs.readFileSync(__dirname + '/../src/' + f + '.gs','utf8')).join('\n');
eval(SRC);

let pass = 0, fail = 0;
function eq(a, b, label){
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok){ pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label +
    '\n       beklenen: ' + JSON.stringify(b) + '\n       gelen   : ' + JSON.stringify(a)); }
}

function grid(){
  const g = [];
  const row = () => new Array(12).fill('');
  let r;
  /* 0: baslik satiri -- aylar */
  r = row(); r[0]='RO’s'; r[1]='2026'; r[4]='Jan.'; r[6]='Feb.'; r[8]='Mar.'; g.push(r);
  /* 1: alt basliklar */
  r = row(); r[4]='LS'; r[5]='OI'; r[6]='LS'; r[7]='OI'; r[8]='LS'; r[9]='OI'; g.push(r);
  /* 2-3: Cikarang (Bekasi 2) */
  r = row(); r[0]='Power Asia'; r[1]='Cikarang (Bekasi 2)'; r[3]='Budget';
  r[4]=0; r[5]=0; r[6]=0; r[7]=0; r[8]=0; r[9]=0; g.push(r);
  r = row(); r[3]='Real/Forecast'; r[4]=0; r[5]=0; r[6]=0; r[7]=0; g.push(r);
  /* 4-5: Chennai 5 -- degerler KUMULATIF (Feb = Jan+Feb) */
  r = row(); r[1]='Chennai 5'; r[3]='Budget';
  r[4]=3; r[5]=0.28; r[6]=6; r[7]=0.78; r[8]=9; r[9]=1.12; g.push(r);
  r = row(); r[3]='Real/Forecast'; r[4]=0; r[5]=0; r[6]=6; r[7]=0.10; g.push(r);
  /* 6-7: Daegu 1 (VPH) */
  r = row(); r[1]='Daegu 1 (VPH)'; r[3]='Budget';
  r[4]=1; r[5]=0.01; r[6]=2; r[7]=0.02; g.push(r);
  r = row(); r[3]='Real/Forecast'; r[4]=4; r[5]=0.04; r[6]=6; r[7]=0.06; g.push(r);
  /* 8-9: Vallam (India) */
  r = row(); r[1]='Vallam (India)'; r[3]='Budget'; r[4]=0; r[5]=0; r[6]=0; r[7]=0; g.push(r);
  r = row(); r[3]='Real/Forecast'; g.push(r);
  /* 10-11: AYNI ADLI iki site -- RO ayirir (Czechowice 1 hem PDE hem PTE'de) */
  r = row(); r[0]='Power Thermal Europe'; r[1]='Czechowice 1'; r[3]='Budget';
  r[4]=2; r[5]=0.50; r[6]=4; r[7]=1.25; g.push(r);
  r = row(); r[3]='Real/Forecast'; g.push(r);
  /* 12-13: kayitta OLMAYAN site -- uydurma eslesme olmamali */
  r = row(); r[1]='Atlantis 9'; r[3]='Budget'; r[4]=1; r[5]=9.99; g.push(r);
  r = row(); r[3]='Real/Forecast'; g.push(r);
  return g;
}

function fakeSS(g, name){
  const sheet = { getName: () => (name || 'LS OI 2026'),
                  getDataRange: () => ({ getValues: () => g }) };
  return { getSheets: () => [{ getName: () => 'BURSA_06' }, sheet] };
}

console.log('\n1) Ay sutunlari: her ayin OI sutunu bulunuyor');
{
  const m = lsoiMonthColumns_(grid());
  eq(m.oiCol[1], 5, 'Ocak OI sutunu');
  eq(m.oiCol[2], 7, 'Subat OI sutunu');
  eq(m.oiCol[3], 9, 'Mart OI sutunu');
  eq(lsoiMonthNo_('Jan.'), 1, '"Jan." -> 1');
  eq(lsoiMonthNo_('August'), 8, '"August" -> 8');
  eq(lsoiMonthNo_('LS'), 0, '"LS" ay degil');
}

console.log('\n2) Budget satiri, rapor ayinin sutunu (aylar TOPLANMAZ)');
{
  const r = readLsOiBudget_(fakeSS(grid()), 2);
  /* Kumulatif yazildigi icin Subat hucresi zaten Ocak+Subat'tir. */
  eq(r.values.AVCPL.total, 0.78, 'Chennai 5 Subat = 0.78 (0.28+0.78 DEGIL)');
  eq(r.values.DAEGUVPH.total, 0.02, 'Daegu 1 (VPH)');
  eq(r.values.BEKASI.total, 0, 'Cikarang (Bekasi 2) -> Bekasi 2, sifir da bir degerdir');
  eq(r.values.VALLAMINDIA.total, 0, 'Vallam (India)');
}

console.log('\n3) Ay degisince sutun degisir');
{
  const r = readLsOiBudget_(fakeSS(grid()), 3);
  eq(r.values.AVCPL.total, 1.12, 'Mart sutunu okundu');
  const r1 = readLsOiBudget_(fakeSS(grid()), 1);
  eq(r1.values.AVCPL.total, 0.28, 'Ocak sutunu okundu');
}

console.log('\n4) Real/Forecast satiri KULLANILMIYOR');
{
  const r = readLsOiBudget_(fakeSS(grid()), 2);
  /* Daegu'nun Real satiri 0.06; Budget 0.02 okunmali. */
  eq(r.values.DAEGUVPH.total, 0.02, 'Real satirinin degeri Budget yerine gecmiyor');
}

console.log('\n5) Ayni adli site: RO ayirir');
{
  const r = readLsOiBudget_(fakeSS(grid()), 2);
  eq(r.values.THSCZE.total, 1.25, 'Power Thermal Europe -> THSCZE');
  eq(r.values.CZECHOWICE, undefined, 'PDE tarafina yazilmadi');
}

console.log('\n6) Eslesmeyen satir UYDURULMUYOR, uyari veriyor');
{
  const r = readLsOiBudget_(fakeSS(grid()), 2);
  eq(r.unmatched.length, 1, 'bir satir eslesmedi');
  eq(r.unmatched[0].indexOf('Atlantis 9') > -1, true, 'eslesmeyen satirin adi raporlaniyor');
  eq(r.warnings.length > 0, true, 'uyari uretiliyor');
}

console.log('\n7) Sayfa yoksa sessizce yok sayilir (eski davranis surer)');
{
  const ss = { getSheets: () => [{ getName: () => 'BURSA_06' }] };
  eq(readLsOiBudget_(ss, 2), null, 'null doner');
}

/* ---------------------------------------------------------------
   NEW / REMAN: sayfanin B sutunu "New/Reman". Her sitenin altinda once NEW
   (birlesik) sonra REMAN (birlesik) satir cifti var. Kullanici bildirimi:
   Campinas NEW 0.92 + REMAN 0.10 yapiyor, ekranda yalniz 0.10 goruluyordu
   -- REMAN satiri NEW'in UZERINE yaziliyordu ve "NEW"/"REMAN" yazisi site
   adi saniliyordu.
   --------------------------------------------------------------- */
function nrGrid(siteRepeated){
  const g = [];
  const row = () => new Array(12).fill('');
  let r;
  /* 0-1: B'nin ilk iki satiri birlesik "New/Reman" basligi */
  r = row(); r[0]='RO’s'; r[1]='New/Reman'; r[2]='2026'; r[5]='Jul.'; r[7]='Aug.'; g.push(r);
  r = row(); r[5]='LS'; r[6]='OI'; r[7]='LS'; r[8]='OI'; g.push(r);
  /* Campinas: NEW cifti */
  r = row(); r[0]='Power Drive America'; r[1]='NEW'; r[2]='Campinas 1'; r[4]='Budget';
  r[5]=10; r[6]=0.80; r[7]=12; r[8]=0.92; g.push(r);
  r = row(); r[4]='Real/Forecast'; r[5]=9; r[6]=0.70; r[7]=11; r[8]=0.85; g.push(r);
  /* Campinas: REMAN cifti -- site adi birlesik hucrede (bos) ya da tekrarli */
  r = row(); r[1]='REMAN'; if (siteRepeated) r[2]='Campinas 1'; r[4]='Budget';
  r[5]=1; r[6]=0.08; r[7]=1; r[8]=0.10; g.push(r);
  r = row(); r[4]='Real/Forecast'; r[5]=1; r[6]=0.05; r[7]=1; r[8]=0.07; g.push(r);
  /* Puebla: yalniz NEW yapiyor, REMAN satiri sifir */
  r = row(); r[1]='NEW'; r[2]='Puebla 1'; r[4]='Budget'; r[7]=4; r[8]=0.40; g.push(r);
  r = row(); r[4]='Real/Forecast'; g.push(r);
  r = row(); r[1]='REMAN'; if (siteRepeated) r[2]='Puebla 1'; r[4]='Budget'; r[7]=0; r[8]=0; g.push(r);
  r = row(); r[4]='Real/Forecast'; g.push(r);
  return g;
}

[false, true].forEach(function (repeated) {
  console.log('\n8) NEW + REMAN toplaniyor (site adi ' +
              (repeated ? 'her satirda TEKRARLI' : 'BIRLESIK hucrede') + ')');
  const r = readLsOiBudget_(fakeSS(nrGrid(repeated)), 8);
  eq(r.values.CAMPINAS.NEW, 0.92, 'Campinas NEW / Budget');
  eq(r.values.CAMPINAS.REMAN, 0.10, 'Campinas REMAN / Budget');
  eq(Math.round(r.values.CAMPINAS.total * 100) / 100, 1.02,
     'Campinas toplam = 0.92 + 0.10 (REMAN, NEW\'in ustune YAZILMIYOR)');
  eq(r.values.PUEBLA.total, 0.40, 'Puebla: yalniz NEW, REMAN 0 -> toplam degismiyor');
  eq(r.unmatched.length, 0, '"NEW"/"REMAN" yazisi site adi SANILMIYOR');
  /* Adresler: A1 bicimi, sutun ve satir dogru. Fixture'da Aug OI = sutun 8
     (I), Campinas NEW satiri 3, REMAN satiri 5. */
  eq(r.values.CAMPINAS.cells.NEW, 'I3', 'NEW hucresinin adresi');
  eq(r.values.CAMPINAS.cells.REMAN, 'I5', 'REMAN hucresinin adresi');
});

console.log('\n9) Real/Forecast satiri hic karismiyor (NEW+REMAN duzeninde de)');
{
  const r = readLsOiBudget_(fakeSS(nrGrid(false)), 8);
  /* Real satirlari 0.85 + 0.07; Budget 0.92 + 0.10 okunmali. */
  eq(Math.round(r.values.CAMPINAS.total * 100) / 100, 1.02, 'yalniz Budget satirlari');
}

console.log('\n10) Ayni (site, durum) iki kez: ilki tutulur, UYARI verilir');
{
  const g = nrGrid(true);
  const dup = new Array(12).fill(''); dup[1]='NEW'; dup[2]='Campinas 1'; dup[4]='Budget'; dup[8]=5.55;
  g.push(dup);
  const r = readLsOiBudget_(fakeSS(g), 8);
  eq(r.values.CAMPINAS.NEW, 0.92, 'ikinci NEW satiri ustune yazmadi');
  eq(r.warnings.some(w => w.indexOf('second "NEW') > -1), true, 'uyari uretildi');
}

console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + ' gecti, ' + fail + ' kaldi');
process.exit(fail ? 1 : 0);
