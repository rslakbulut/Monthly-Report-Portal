/**
 * Tarih cozumleme.
 *
 * Launch Sheet Date hucreleri site'tan site'a UC farkli bicimde yazilmis:
 *   - ISO hafta      : "W23", "W4", "W41/23" (sonuncusu belirsiz)
 *   - Ay adi         : "April", "JUL", "Jan"
 *   - AY/YIL         : "01/2026", "1.2026"
 * Hepsi (yil, ay) ikilisine cevrilir; cozulemeyen deger sessizce 0 sayilmaz,
 * {ok:false} doner ve teknik nota yazilir.
 */

var MONTH_NAMES = {
  JAN: 1, JANUARY: 1, OCA: 1, OCAK: 1,
  FEB: 2, FEBRUARY: 2, SUB: 2, SUBAT: 2,
  MAR: 3, MARCH: 3, MART: 3,
  APR: 4, APRIL: 4, NIS: 4, NISAN: 4,
  MAY: 5, MAYIS: 5,
  JUN: 6, JUNE: 6, HAZ: 6, HAZIRAN: 6,
  JUL: 7, JULY: 7, TEM: 7, TEMMUZ: 7,
  AUG: 8, AUGUST: 8, AGU: 8, AGUSTOS: 8,
  SEP: 9, SEPT: 9, SEPTEMBER: 9, EYL: 9, EYLUL: 9,
  OCT: 10, OCTOBER: 10, EKI: 10, EKIM: 10,
  NOV: 11, NOVEMBER: 11, KAS: 11, KASIM: 11,
  DEC: 12, DECEMBER: 12, ARA: 12, ARALIK: 12
};

var MONTH_LABELS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * ISO hafta -> ay. Haftanin PERSEMBE'si hangi aya dusuyorsa o ay kabul edilir
 * (ISO 8601 kurali). Ay sinirina oturan haftalarda keyfilik birakmaz:
 * 2026 W14 = 30 Mart - 5 Nisan, Persembe 2 Nisan -> NISAN.
 */
function isoWeekToMonth_(year, week) {
  if (!(week >= 1 && week <= 53)) return null;
  var jan4 = new Date(Date.UTC(year, 0, 4));
  var dow = jan4.getUTCDay() || 7;                 // 1=Pzt ... 7=Paz
  var mondayW1 = jan4.getTime() - (dow - 1) * 86400000;
  var thursday = new Date(mondayW1 + ((week - 1) * 7 + 3) * 86400000);
  return { year: thursday.getUTCFullYear(), month: thursday.getUTCMonth() + 1 };
}

/**
 * Bir hucreyi (yil, ay) olarak cozer.
 * @param {*} cell        Hucre degeri (metin, sayi veya Date)
 * @param {number} defaultYear  Hafta/ay-adi bicimlerinde kullanilacak yil
 * @return {{ok:boolean, year:number, month:number, reason:string, raw:string}}
 */
function parsePeriodCell_(cell, defaultYear) {
  var raw = (cell === null || cell === undefined) ? '' : String(cell).trim();
  if (raw === '') return { ok: false, reason: 'empty', raw: raw };

  if (Object.prototype.toString.call(cell) === '[object Date]' && !isNaN(cell)) {
    return { ok: true, year: cell.getFullYear(), month: cell.getMonth() + 1, raw: raw };
  }

  var s = raw.toUpperCase().replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G')
             .replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C');

  // AY/YIL  ->  01/2026, 1.2026, 01-2026
  var mm = s.match(/^(\d{1,2})\s*[\/.\-]\s*(\d{4})$/);
  if (mm) {
    var mo = parseInt(mm[1], 10);
    if (mo >= 1 && mo <= 12) return { ok: true, year: parseInt(mm[2], 10), month: mo, raw: raw };
    return { ok: false, reason: 'invalid month', raw: raw };
  }

  // ISO hafta -> W23, W 4.  "W41/23" gibi ikili gosterim BELIRSIZ sayilir.
  if (/^W\s*\d{1,2}$/.test(s)) {
    var wk = parseInt(s.replace(/[^0-9]/g, ''), 10);
    var r = isoWeekToMonth_(defaultYear, wk);
    if (r) return { ok: true, year: r.year, month: r.month, raw: raw };
    return { ok: false, reason: 'invalid week', raw: raw };
  }
  if (/^W/.test(s)) return { ok: false, reason: 'ambiguous week format', raw: raw };

  // Ay adi -> April, JUL, Jan
  var word = s.replace(/[^A-Z]/g, '');
  if (word && MONTH_NAMES[word]) {
    return { ok: true, year: defaultYear, month: MONTH_NAMES[word], raw: raw };
  }

  // Yalniz yil ("2026") -> ay bilgisi yok, YTD'ye katilamaz.
  if (/^\d{4}$/.test(s)) return { ok: false, reason: 'year only, no month', raw: raw };

  return { ok: false, reason: 'unparsed', raw: raw };
}

/** (yil, ay) ikilisini siralanabilir tam sayiya cevirir: 2026-06 -> 202606 */
function periodIndex_(year, month) { return year * 100 + month; }

/**
 * Spreadsheet adindan raporlama donemini cikarir.
 * "POWER New&Reman Project Monthly Report - June 2026" -> {year:2026, month:6}
 * Ay adi bulunamazsa yalniz yil doner (ay sayfa adindaki _06 ekinden gelir).
 */
function parsePeriodFromTitle_(title) {
  var s = String(title || '').toUpperCase();
  var year = null, month = null, bestLen = 0;
  var ym = s.match(/(20\d{2})/g);
  if (ym && ym.length) year = parseInt(ym[ym.length - 1], 10);
  for (var name in MONTH_NAMES) {
    // En UZUN eslesme kazanir: "JUNE" varken "JUN" ile yetinme.
    if (name.length >= 3 && name.length > bestLen && s.indexOf(name) !== -1) {
      month = MONTH_NAMES[name];
      bestLen = name.length;
    }
  }
  return { year: year, month: month };
}
