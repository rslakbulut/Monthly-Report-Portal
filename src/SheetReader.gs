/**
 * Sayfa okuma yardimcilari: bolum capasi + iki boyutlu sutun/satir haritasi.
 *
 * Sabit hucre adresi KULLANILMAZ. Satir numaralari site'tan site'a ve bolumler
 * arasinda kayiyor (gizli satirlar; Bekasi 158->258, FUEN 160->264). Her sey
 * ETIKET aranarak bulunur.
 */

/** Hucre metnini eslestirme icin sadelestirir: buyuk harf, tek bosluk, aksansiz. */
function normText_(v) {
  if (v === null || v === undefined) return '';
  var s = String(v).replace(/İ/g, 'I').replace(/ı/g, 'i').toUpperCase();
  var from = 'ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŞĞ';
  var to   = 'AAAAAACEEEEIIIINOOOOOUUUUYSG';
  for (var i = 0; i < from.length; i++) s = s.split(from.charAt(i)).join(to.charAt(i));
  s = s.replace(/[\u2010-\u2015\u2212]/g, '-');   // – — ‑ vb. -> -
  return s.replace(/\s+/g, ' ').trim();
}

/** Formul hatasi mi? (#REF!, #DIV/0! gercek sayfalarda var) */
function isErrorCell_(v) {
  return typeof v === 'string' && v.charAt(0) === '#' && v.indexOf('!') !== -1;
}

/**
 * Sayisal deger okur.
 * @return {{ok:boolean, value:number, reason:string}}
 *   Bos hucre ve 0 AYRI seylerdir: bos -> {ok:false, reason:'bos'}.
 */
function readNumber_(v) {
  if (v === null || v === undefined || v === '') return { ok: false, reason: 'empty' };
  if (isErrorCell_(v)) return { ok: false, reason: 'formula error: ' + v };
  if (typeof v === 'number') return { ok: true, value: v };
  var s = String(v).trim()
    .replace(/[€$\s]/g, '')
    .replace(/%$/, '');
  if (s === '' || s === '-') return { ok: false, reason: 'empty' };
  // "1.234,56" (TR) ve "1,234.56" (EN) ikisini de anla
  if (/,\d{1,2}$/.test(s) && s.indexOf('.') !== -1) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  var n = parseFloat(s);
  if (isNaN(n)) return { ok: false, reason: 'not a number: ' + v };
  return { ok: true, value: n };
}

/**
 * Bir metni iceren ILK hucreyi bulur.
 * @param {Array<Array>} grid
 * @param {string} needle  normalize edilmis aranan metin (icerir kontrolu)
 * @param {number} fromRow aramaya baslanacak satir (0 tabanli)
 * @return {{row:number, col:number}|null}
 */
function findCell_(grid, needle, fromRow) {
  var target = normText_(needle);
  for (var r = fromRow || 0; r < grid.length; r++) {
    for (var c = 0; c < grid[r].length; c++) {
      var t = normText_(grid[r][c]);
      if (t && t.indexOf(target) !== -1) return { row: r, col: c };
    }
  }
  return null;
}

/**
 * Bir basliktan sonraki ILK dolu hucreyi arayarak grup sutunlarini haritalar.
 * Birlestirilmis (merged) hucrelerde deger yalniz ilk hucrede durur; bu yuzden
 * bir grup, kendi sutunundan bir SONRAKI dolu basliga kadar surer.
 *
 * @param {Array} headerRow  baslik satirinin dizisi
 * @param {number} fromCol   aramaya baslanacak sutun
 * @return {Array<{label:string, start:number, end:number}>}
 */
function mapHeaderGroups_(headerRow, fromCol) {
  var marks = [];
  for (var c = fromCol || 0; c < headerRow.length; c++) {
    var t = normText_(headerRow[c]);
    if (t) marks.push({ label: t, start: c });
  }
  for (var i = 0; i < marks.length; i++) {
    marks[i].end = (i + 1 < marks.length) ? marks[i + 1].start - 1 : headerRow.length - 1;
  }
  return marks;
}

/** Grup listesinde etiketi ARANAN metni iceren grubu dondurur. */
function pickGroup_(groups, needle) {
  var target = normText_(needle);
  for (var i = 0; i < groups.length; i++) {
    if (groups[i].label.indexOf(target) !== -1) return groups[i];
  }
  return null;
}

/**
 * Bir grup araliginda NEW / REMAN alt sutunlarini bulur.
 * @return {{NEW:number|null, REMAN:number|null}}
 */
function findNewRemanCols_(grid, subRow, group) {
  var out = { NEW: null, REMAN: null };
  if (!group || subRow < 0 || subRow >= grid.length) return out;
  var row = grid[subRow];
  for (var c = group.start; c <= group.end && c < row.length; c++) {
    var t = normText_(row[c]);
    if (t === 'NEW' && out.NEW === null) out.NEW = c;
    else if (t === 'REMAN' && out.REMAN === null) out.REMAN = c;
  }
  return out;
}

/**
 * Belirtilen satir araliginda, etiketi verilen listeden biriyle TAM eslesen
 * satiri bulur. Etiket sutunu sabit degil; satirin ilk birkac sutununa bakar.
 */
function findRowByLabel_(grid, fromRow, toRow, labels, maxCol) {
  var targets = {};
  for (var i = 0; i < labels.length; i++) targets[normText_(labels[i])] = true;
  var lastCol = maxCol || 6;
  for (var r = fromRow; r <= toRow && r < grid.length; r++) {
    for (var c = 0; c <= lastCol && c < grid[r].length; c++) {
      var t = normText_(grid[r][c]);
      if (t && targets[t]) return r;
    }
  }
  return -1;
}

/** Satirin tamamen bos olup olmadigi. */
function isEmptyRow_(row) {
  for (var c = 0; c < row.length; c++) {
    if (row[c] !== null && row[c] !== undefined && String(row[c]).trim() !== '') return false;
  }
  return true;
}
