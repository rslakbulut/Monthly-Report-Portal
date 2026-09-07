/**
 * RO -> Site -> sayfa anahtari kayit defteri.
 *
 * Sayfa adlari <SITE_KODU>_<AY> bicimindedir (ornek: FUEN_06 = Haziran).
 * Buradaki `key` ay eki ATILMIS ve normalize edilmis sayfa kodudur; boylece
 * _07 sayfalari eklendiginde bu dosyaya dokunmak gerekmez.
 *
 * Czechowice iki RO'da birden geciyor ama sayfalari ayri:
 *   PDE -> CZECHOWICE_06,  PTE -> THS_CZE_06  (THS_ oneki Thermal tarafi)
 * Bu yuzden anahtar site adi degil, sayfa kodudur.
 */

var RO_LABELS = {
  PAS: 'Power Asia',
  PDA: 'Power Drive America',
  PDC: 'Power Drive China',
  PDE: 'Power Drive Europe',
  PTA: 'Power Thermal America',
  PTC: 'Power Thermal China',
  PTE: 'Power Thermal Europe'
};

/** Dashboard'da RO kartlarinin gosterim sirasi. */
var RO_ORDER = ['PAS', 'PDA', 'PDC', 'PDE', 'PTA', 'PTC', 'PTE'];

var SITE_REGISTRY = [
  { ro: 'PAS', site: 'Bekasi 2',                  key: 'BEKASI' },
  { ro: 'PAS', site: 'Chennai 5',                 key: 'AVCPL' },
  { ro: 'PAS', site: 'Chon Buri 2',               key: 'CHONBURI' },
  { ro: 'PAS', site: 'Daegu 1 (VPH)',             key: 'DAEGUVPH' },
  { ro: 'PAS', site: 'Kumagaya-shi 1',            key: 'KUMAGAYA' },
  { ro: 'PAS', site: 'Pune 1',                    key: 'PUNE' },
  { ro: 'PAS', site: 'Rayong 1',                  key: 'RAYONG' },
  { ro: 'PAS', site: 'Vallam (India)',            key: 'VALLAMINDIA' },

  { ro: 'PDA', site: 'Campinas 1',                key: 'CAMPINAS' },
  { ro: 'PDA', site: 'Puebla 1',                  key: 'PUEBLA' },
  { ro: 'PDA', site: 'San Luis Potosi 2 (A19)',   key: 'SLP2A19' },
  { ro: 'PDA', site: 'San Luis Potosi 3 (T92)',   key: 'SLP3T92' },
  { ro: 'PDA', site: 'San Luis Potosi 4 (C86)',   key: 'SLP4C86' },

  { ro: 'PDC', site: 'Nanjing 1',                 key: 'NVCC' },
  { ro: 'PDC', site: 'Shanghai 1',                key: 'SHANGHAI' },
  { ro: 'PDC', site: 'Shenyang 2',                key: 'SHENYANG' },
  { ro: 'PDC', site: 'Shenzhen 1',                key: 'SHENZHEN' },

  { ro: 'PDE', site: 'Amiens 2',                  key: 'AMIENS' },
  { ro: 'PDE', site: 'Bursa 1',                   key: 'BURSA' },
  { ro: 'PDE', site: 'Presov 1',                  key: 'PRESOV' },
  { ro: 'PDE', site: 'Czechowice 1',              key: 'CZECHOWICE' },
  { ro: 'PDE', site: 'Fuenlabrada 1',             key: 'FUEN' },
  { ro: 'PDE', site: 'Mondovi 1',                 key: 'MONDOVI' },
  { ro: 'PDE', site: 'Podborany 1',               key: 'PODBORANY' },
  { ro: 'PDE', site: 'Veszprem 2',                key: 'VESZPREM' },

  { ro: 'PTA', site: 'Greensburg 1',              key: 'GREENSBURG' },
  { ro: 'PTA', site: 'Hamilton 1',                key: 'HAMILTON' },
  { ro: 'PTA', site: 'Hampton 1',                 key: 'HAMPTON' },
  { ro: 'PTA', site: 'Itatiba 2',                 key: 'ITATIBA' },
  { ro: 'PTA', site: 'San Luis Potosi 1 (M10)',   key: 'SLP1M10' },
  { ro: 'PTA', site: 'Toluca 1',                  key: 'TOLUCA' },

  { ro: 'PTC', site: 'Changchun-Jilin PRC 3',     key: 'CHANGCHUN' },
  { ro: 'PTC', site: 'Foshan 4',                  key: 'FOSHAN' },
  { ro: 'PTC', site: 'Oura 1',                    key: 'OURA' },
  { ro: 'PTC', site: 'Shashi 1',                  key: 'SHASHI01' },
  { ro: 'PTC', site: 'Shashi 2',                  key: 'SHASHI02' },
  { ro: 'PTC', site: 'Loudi',                     key: 'LOUDI' },

  { ro: 'PTE', site: 'Bad Rodach 1',              key: 'BADRODACH' },
  { ro: 'PTE', site: 'Bursa 3 THS',               key: 'THSBURSA' },
  { ro: 'PTE', site: 'Humpolec 1',                key: 'HUMPOLEC' },
  { ro: 'PTE', site: 'Laval 1',                   key: 'LAVAL' },
  { ro: 'PTE', site: 'Mioveni 1',                 key: 'MIOVENI' },
  { ro: 'PTE', site: 'Czechowice 1',              key: 'THSCZE' },
  { ro: 'PTE', site: 'Rakovnik 1',                key: 'RAKOVNIK' },
  { ro: 'PTE', site: 'Reims 1',                   key: 'REIMS' },
  { ro: 'PTE', site: 'Skawina 1',                 key: 'SKAWINA' },
  { ro: 'PTE', site: 'Tanger 1',                  key: 'TANGER' },
  { ro: 'PTE', site: 'Zaragoza 1',                key: 'ZARAGOZA' }
];

/**
 * Metni eslestirme anahtarina cevirir: buyuk harf, aksan/bosluk/noktalama yok.
 * "Daegu VPH" -> "DAEGUVPH", "Vallam_India" -> "VALLAMINDIA"
 */
function normalizeKey_(text) {
  if (text === null || text === undefined) return '';
  var s = String(text)
    .replace(/İ/g, 'I').replace(/ı/g, 'i')   // Turkce I/i
    .toUpperCase();
  // Yaygin aksanli harfleri sadelestir (Apps Script'te normalize() guvenilmez).
  var from = 'ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŞĞØŁ';
  var to   = 'AAAAAACEEEEIIIINOOOOOUUUUYSGOL';
  for (var i = 0; i < from.length; i++) {
    s = s.split(from.charAt(i)).join(to.charAt(i));
  }
  return s.replace(/[^A-Z0-9]/g, '');
}

/**
 * Sayfa adini {key, month} olarak ayristirir.
 * "FUEN_06" -> {key:'FUEN', month:6}   "SHASHI 01_06" -> {key:'SHASHI01', month:6}
 * Ay eki yoksa month = null (sayfa yine de eslestirilebilir).
 */
function parseSheetName_(sheetName) {
  var raw = String(sheetName || '').trim();
  var month = null;
  var base = raw;
  var m = raw.match(/^(.*)[_\s-](\d{1,2})\s*$/);
  if (m) {
    var num = parseInt(m[2], 10);
    if (num >= 1 && num <= 12) {
      base = m[1];
      month = num;
    }
  }
  return { key: normalizeKey_(base), month: month, raw: raw };
}

/** key -> registry satiri (ilk eslesme). */
function registryByKey_() {
  var map = {};
  for (var i = 0; i < SITE_REGISTRY.length; i++) {
    map[SITE_REGISTRY[i].key] = SITE_REGISTRY[i];
  }
  return map;
}
