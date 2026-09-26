/**
 * "LS OI <yil>" sayfasi — Budget YTD CIROSUNUN resmi kaynagi.
 *
 * Bu deger onceden detay tablolarindan (Plan tarihi <= rapor ayi olan
 * projelerin cirosu) HESAPLANIYORDU; kullanici bildirimi: dogru yer bu
 * sayfa. Sayfanin yapisi:
 *
 *   RO's | 2026                          | Jan.      | Feb.      | ...
 *        |                               | LS | OI   | LS | OI   |
 *   Power| Cikarang (Bekasi 2) | Budget  |  0 | 0.00 |  0 | 0.00 |
 *   Asia |                     | Real/For|  0 | 0.00 |  0 | 0.00 |
 *        | Chennai 5           | Budget  |  3 | 0.28 |  6 | 0.78 |
 *        |                     | Real/For|  0 | 0.00 |  6 | 0.10 |
 *
 * KURALLAR (kullanici teyidi):
 *  - Degerler ZATEN KUMULATIF yazilmis: Subat hucresi Ocak+Subat'tir. Bu
 *    yuzden aylar TOPLANMAZ, rapor ayinin hucresi dogrudan okunur.
 *  - Yalniz "Budget" satiri okunur; "Real/Forecast" satiri kullanilmaz
 *    (gerceklesen ciro detay tablolarindan gelmeye devam ediyor).
 *  - "LS" sutunu (proje adedi) simdilik okunmuyor.
 *  - Hicbir hucre adresi sabit degil: RO adi -> site adi -> Budget satiri ->
 *    rapor ayinin OI sutunu zincirleme ARANIR.
 *  - Site adi eslesmezse UYDURULMAZ: o site uyari listesine yazilir.
 */

var LSOI_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                   'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "Jan." / "January" / "OCAK" degil -- sayfa Ingilizce; ay numarasi veya 0. */
function lsoiMonthNo_(v) {
  var t = normText_(v).replace(/[^A-Z]/g, '');
  if (t.length < 3) return 0;
  var p = t.slice(0, 3);
  for (var i = 0; i < LSOI_MONTHS.length; i++) if (LSOI_MONTHS[i] === p) return i + 1;
  return 0;
}

function lsoiNorm_(v) { return normText_(v).replace(/[^A-Z0-9]/g, ''); }

/** Sayfayi adindan bulur: "LS OI 2026", "LS OI", "LSOI2026" ... */
function findLsOiSheet_(ss) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (lsoiNorm_(sheets[i].getName()).indexOf('LSOI') === 0) return sheets[i];
  }
  return null;
}

/**
 * RO etiketini ("Power Asia") RO koduna cevirir.
 * Sayfadaki yazim kucuk farklar tasiyabilir; normalize karsilastirma.
 */
function lsoiRoCode_(v) {
  var t = lsoiNorm_(v);
  if (!t) return '';
  for (var code in RO_LABELS) {
    if (!RO_LABELS.hasOwnProperty(code)) continue;
    if (lsoiNorm_(RO_LABELS[code]) === t) return code;
  }
  return '';
}

/**
 * Site adini O RO'nun kayitli site'lariyla eslestirir.
 * Iki yonlu ICERME: "Cikarang (Bekasi 2)" -> "Bekasi 2" bulunur.
 * RO ile sinirlamak SART: "Czechowice 1" hem PDE hem PTE'de var.
 * Birden fazla aday varsa eslesme YOK sayilir (tahmin uretilmez).
 */
function lsoiMatchSite_(ro, name) {
  var n = lsoiNorm_(name);
  if (n.length < 3) return null;
  var hits = [];
  for (var i = 0; i < SITE_REGISTRY.length; i++) {
    var reg = SITE_REGISTRY[i];
    if (reg.ro !== ro) continue;
    var r = lsoiNorm_(reg.site);
    if (!r) continue;
    if (n === r || n.indexOf(r) !== -1 || r.indexOf(n) !== -1) hits.push(reg);
  }
  if (hits.length === 1) return hits[0];
  return null;
}

/**
 * Ay basliklarini ve altlarindaki LS/OI sutunlarini haritalar.
 * @return {{ oiCol:Object<number,number>, monthRow:number }}
 */
function lsoiMonthColumns_(grid) {
  var best = null;
  for (var r = 0; r < Math.min(grid.length, 12); r++) {
    var found = {}, n = 0;
    for (var c = 0; c < grid[r].length; c++) {
      var m = lsoiMonthNo_(grid[r][c]);
      if (m && !found[m]) { found[m] = c; n++; }
    }
    if (n >= 2 && (!best || n > best.n)) best = { row: r, cols: found, n: n };
  }
  if (!best) return null;

  /* Alt baslik satiri: ay satirinin hemen altinda LS / OI yazar. Her ay icin
     o ayin sutunundan basalayarak SAGA dogru ilk "OI" aranir; bir sonraki
     ayin sutununu gecmez. */
  var sub = best.row + 1;
  if (sub >= grid.length) return null;
  var months = [];
  for (var k in best.cols) if (best.cols.hasOwnProperty(k)) months.push(parseInt(k, 10));
  months.sort(function (a, b) { return best.cols[a] - best.cols[b]; });

  var oiCol = {};
  for (var i = 0; i < months.length; i++) {
    var start = best.cols[months[i]];
    var end = (i + 1 < months.length) ? best.cols[months[i + 1]] : grid[sub].length;
    for (var c2 = start; c2 < end && c2 < grid[sub].length; c2++) {
      if (lsoiNorm_(grid[sub][c2]) === 'OI') { oiCol[months[i]] = c2; break; }
    }
  }
  return { oiCol: oiCol, monthRow: best.row, subRow: sub };
}

/**
 * Sayfayi okur ve site anahtarina gore Budget YTD cirosunu (M€) dondurur.
 * @param {Spreadsheet} ss
 * @param {number} month rapor ayi (1-12)
 * @return {{values:Object, warnings:Array, unmatched:Array, month:number}|null}
 */
function readLsOiBudget_(ss, month) {
  var sheet = findLsOiSheet_(ss);
  if (!sheet) return null;

  var grid;
  try { grid = sheet.getDataRange().getValues(); }
  catch (e) { return { values: {}, warnings: ['LS OI sheet could not be read: ' + e.message],
                       unmatched: [], month: month }; }

  var map = lsoiMonthColumns_(grid);
  if (!map) {
    return { values: {}, warnings: ['LS OI: month header row not found'], unmatched: [],
             month: month };
  }
  var col = map.oiCol[month];
  if (col === undefined) {
    return { values: {}, warnings: ['LS OI: no "OI" column for month ' + month],
             unmatched: [], month: month };
  }

  /* Birlestirilmis hucrelerde deger yalniz SOL UST hucrede durur; RO, site
     ve NEW/REMAN etiketleri bu yuzden blogun ILK satirinda gorunur ve asagi
     dogru TASINIR.
     Sayfanin B sutunu "New/Reman": her sitenin altinda once NEW (birlesik),
     sonra REMAN (birlesik) satir cifti var. Iki hata buradan cikiyordu:
       - "NEW"/"REMAN" yazisi site adi saniliyordu (o sutunun varligindan
         haberimiz yoktu),
       - ayni sitenin ikinci Budget satiri ilkinin UZERINE yaziliyordu:
         NEW + REMAN yapan bir sitede ekranda yalniz REMAN kaliyordu
         (Campinas: NEW 0.92 + REMAN 0.10 yerine 0.10 -- kullanici bildirimi).
     Artik her Budget satiri (site, NEW|REMAN) cifti olarak kaydediliyor ve
     site toplami ikisinin TOPLAMI. REMAN yapmayan sitede REMAN satiri 0 ya da
     hic yok -- toplam degismiyor; bu yuzden site sayfasina bakip "REMAN var
     mi" diye kosul kurmak gerekmiyor, sonuc ayni ve daha saglam. */
  var out = {}, warnings = [], unmatched = [], ro = '', siteName = '', status = '';
  for (var r = map.subRow + 1; r < grid.length; r++) {
    var row = grid[r];
    /* Satirin etiketi: "Budget" / "Real/Forecast". OI sutununun SOLUNDA arar. */
    var label = '', labelCol = -1;
    for (var c = 0; c < col && c < row.length; c++) {
      var t = lsoiNorm_(row[c]);
      if (t === 'BUDGET' || t.indexOf('REALFORECAST') === 0 || t === 'REAL') {
        label = t; labelCol = c; break;
      }
    }
    /* Etiketi olmayan satir veri satiri degildir (baslik, bosluk, toplam). */
    if (labelCol < 0) continue;
    /* Etiket sutununun solundaki dolu hucreler, TANINDIKLARI sirayla:
         RO adi        -> ro
         NEW / REMAN   -> urun durumu (site adi DEGIL)
         geri kalan    -> site adi                                     */
    for (var c2 = 0; c2 < labelCol; c2++) {
      var v = String(row[c2] == null ? '' : row[c2]).trim();
      if (!v) continue;
      var code = lsoiRoCode_(v);
      if (code) { ro = code; continue; }
      var tv = lsoiNorm_(v);
      if (tv === 'NEW' || tv === 'REMAN') { status = tv; continue; }
      if (tv === 'NEWREMAN') continue;                 // sutun basligi
      siteName = v;
    }
    if (label !== 'BUDGET' || !ro || !siteName) continue;

    var reg = lsoiMatchSite_(ro, siteName);
    if (!reg) {
      if (unmatched.indexOf(ro + ' · ' + siteName) === -1) unmatched.push(ro + ' · ' + siteName);
      continue;
    }
    /* NEW/REMAN sutunu olmayan (eski) duzende her satir NEW sayilir. */
    var st = status || 'NEW';
    var n = readNumber_(row[col]);
    if (!n.ok) {
      if (n.reason !== 'empty') warnings.push('LS OI ' + reg.site + ' ' + st + ': ' + n.reason);
      continue;
    }
    var rec = out[reg.key] ||
              (out[reg.key] = { NEW: null, REMAN: null, total: 0, cells: {} });
    if (rec[st] !== null) {
      /* Ayni (site, durum) ikinci kez: duzen beklenenden farkli demek.
         Toplamaya ya da ustune yazmaya karar vermek yerine ILKINI tutup
         uyariyoruz -- sessizce yanlis sayi uretmek en kotusu. */
      warnings.push('LS OI ' + reg.site + ': second "' + st + ' / Budget" row at ' +
                    a1_(r, col) + ' ignored (first one at ' + rec.cells[st] + ')');
      continue;
    }
    rec[st] = n.value;
    rec.cells[st] = a1_(r, col);
    rec.total = (rec.NEW || 0) + (rec.REMAN || 0);
  }

  if (unmatched.length) {
    warnings.push('LS OI: ' + unmatched.length + ' row(s) could not be matched to a site');
  }
  return { values: out, warnings: warnings, unmatched: unmatched, month: month,
           sheet: sheet.getName(), column: col + 1 };
}
