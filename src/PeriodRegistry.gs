/**
 * Donem (yil/ay) kayit defteri + Gmail'den otomatik yeni spreadsheet yakalama.
 *
 * Aylik rapor her ay YENI bir spreadsheet olarak kopyalaniyor ve kullaniciya
 * mail ile geliyor. Bu yuzden dashboard bagimsiz (standalone) bir script'tir;
 * hangi donemin hangi dosyada oldugunu burada tutar.
 *
 * Kayit ScriptProperties'te JSON olarak durur:
 *   { "2026-06": {id, name, addedAt, source} , ... }
 *
 * GUVENLIK: aylik rapor dosyalari yalniz OKUNUR. Bu dosyada hicbir yazma
 * (setValue/appendRow) cagrisi yoktur.
 */

var PROP_PERIODS = 'RO_DASH_PERIODS';
var PROP_GMAIL_QUERY = 'RO_DASH_GMAIL_QUERY';
var PROP_ADMIN_EMAILS = 'RO_DASH_ADMIN_EMAILS';

/**
 * Ayarlar panelindeki eylemleri (Gmail taramasi, donem ekleme/silme,
 * gunluk tetikleyici kurma) kimin cagirabilecegini belirler. Onceden hicbir
 * kontrol yoktu: appsscript.json'daki webapp.access:'DOMAIN' + executeAs:
 * 'USER_DEPLOYING' kombinasyonu yuzunden erisimi olan HERKES deploy eden
 * hesabin kimligiyle bu eylemleri tetikleyebiliyordu (bkz.
 * standartlar-uyumluluk-monthly-report-portal.html, "Muhendislik Saglamligi"
 * kritik bulgusu).
 *
 * Liste bos ise (ilk kurulum), tek yetkili deploy eden hesabin kendisidir —
 * yani varsayilan "yalniz ben", "herkes" degil. Ek admin eklemek icin GAS
 * editorunde Project Settings > Script Properties'e RO_DASH_ADMIN_EMAILS
 * anahtariyla JSON dizi ("["a@valeo.com","b@valeo.com"]") eklenir.
 */
function adminEmails_() {
  var raw = PropertiesService.getScriptProperties().getProperty(PROP_ADMIN_EMAILS);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (e) { return []; }
}
function isAuthorizedAdmin_() {
  var caller = Session.getActiveUser().getEmail();
  if (!caller) return false;   // kimlik cozulemedi (DOMAIN disi/anonim) -> reddet
  var list = adminEmails_();
  if (!list.length) return caller === Session.getEffectiveUser().getEmail();
  return list.indexOf(caller) !== -1;
}
/** Yetkisizse {error} dondurur (cagiran bunu dogrudan geri iletir), yetkiliyse null. */
function requireAdmin_() {
  if (isAuthorizedAdmin_()) return null;
  return { error: 'Not authorized. Ask the dashboard owner to add you as an admin.' };
}

/** Varsayilan Gmail aramasi. Ayarlar ekranindan degistirilebilir. */
var DEFAULT_GMAIL_QUERY =
  '"POWER New&Reman Project Monthly Report" newer_than:400d';

function getGmailQuery_() {
  return PropertiesService.getScriptProperties().getProperty(PROP_GMAIL_QUERY) ||
         DEFAULT_GMAIL_QUERY;
}

function setGmailQuery(query) {
  /* Metin donduren bir fonksiyon oldugu icin deny NESNESI donduremiyor;
     yetkisiz dogrudan cagri hata olarak geri gidiyor. */
  if (!isAuthorizedAdmin_()) throw new Error('Not authorized.');
  PropertiesService.getScriptProperties()
    .setProperty(PROP_GMAIL_QUERY, String(query || '').trim() || DEFAULT_GMAIL_QUERY);
  return getGmailQuery_();
}

function readPeriods_() {
  var raw = PropertiesService.getScriptProperties().getProperty(PROP_PERIODS);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (e) { return {}; }
}

function writePeriods_(obj) {
  PropertiesService.getScriptProperties().setProperty(PROP_PERIODS, JSON.stringify(obj));
}

function periodKey_(year, month) {
  return year + '-' + (month < 10 ? '0' + month : '' + month);
}

/** Bir Google Sheets URL'sinden dosya ID'sini cikarir. */
function extractSpreadsheetId_(url) {
  var m = String(url || '').match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/);
  return m ? m[1] : null;
}

/**
 * Bir spreadsheet ID'sini donem kaydina ekler.
 * Donem, dosya ADINDAN cozulur ("... - June 2026"); ay adi yoksa sayfa
 * adlarindaki _MM ekinin en sik goruleni kullanilir.
 * @return {{ok:boolean, key:string, name:string, reason:string}}
 */
function registerSpreadsheetId_(id, source) {
  var ss;
  try {
    ss = SpreadsheetApp.openById(id);
  } catch (e) {
    return { ok: false, reason: 'File could not be opened: ' + id + ' — ' + (e && e.message ? e.message : e) };
  }
  var name = ss.getName();
  var p = parsePeriodFromTitle_(name);
  if (!p.year) return { ok: false, reason: 'No year in file name: ' + name };

  var info = sheetMonthInfo_(ss);
  var month = p.month || info.month;
  if (!month) return { ok: false, reason: 'No month in file name or sheet names: ' + name };
  /* Dosya adindaki ay ile sayfa eklerindeki ay ayni degilse sayfalarinki
     esas alinmaz (dosya adi kaynak), ama KAPSANAN aylar yine sayfalardan
     gelir -- birlesik rapor bilgisi orada. */
  var months = (info.months && info.months.length) ? info.months : [month];
  if (months.indexOf(month) === -1) months = [month];

  var key = periodKey_(p.year, month);
  var periods = readPeriods_();
  var isNew = !periods[key];
  periods[key] = {
    id: id, name: name, year: p.year, month: month, months: months,
    addedAt: new Date().toISOString(), source: source || 'manual'
  };
  writePeriods_(periods);
  return { ok: true, key: key, name: name, isNew: isNew };
}

/**
 * Sayfa adlarindaki ay eklerinin en sik goruleni (dosya adinda ay yoksa)
 * ve o ayi tasiyan sayfalarin KAPSADIGI aylar.
 *
 * Kapsanan aylar gerekiyor cunku iki ay tek raporda toplanabiliyor
 * ("BEKASI_07+08"); donem etiketi "August" degil "July & August" olmali.
 * Yalniz raporlama ayini tasiyan sayfalar sayilir -- geride kalmis tek tuk
 * bir site ("_05") etikete girip "May & July & August" uretmesin.
 */
function sheetMonthInfo_(ss) {
  var counts = {}, sheets = ss.getSheets(), best = null, bestN = 0, parsedAll = [];
  for (var i = 0; i < sheets.length; i++) {
    var parsed = parseSheetName_(sheets[i].getName());
    parsedAll.push(parsed);
    if (!parsed.month) continue;
    counts[parsed.month] = (counts[parsed.month] || 0) + 1;
    if (counts[parsed.month] > bestN) { bestN = counts[parsed.month]; best = parsed.month; }
  }
  var cover = {};
  for (var j = 0; j < parsedAll.length; j++) {
    if (parsedAll[j].month !== best) continue;
    var ms = parsedAll[j].months || [];
    for (var k = 0; k < ms.length; k++) cover[ms[k]] = true;
  }
  return { month: best, months: monthListOf_(cover) };
}
function monthListOf_(map) {
  var out = [];
  for (var m in map) if (map.hasOwnProperty(m)) out.push(parseInt(m, 10));
  out.sort(function (a, b) { return a - b; });
  return out;
}
/** Geriye donuk uyum: yalniz ayi isteyen cagiranlar icin. */
function dominantSheetMonth_(ss) {
  return sheetMonthInfo_(ss).month;
}

/**
 * Kullanicinin yapistirdigi link ile elle donem ekleme (UI'dan cagrilir).
 * Gmail taramasi bir ayi kacirirsa emniyet supabi budur.
 */
function addPeriodByUrl(url) {
  /* Yetki kontrolu ui* sarmalayicisinda DEGIL burada da: google.script.run
     projedeki HER ust duzey fonksiyonu cagirabiliyor, yani sarmalayiciyi
     atlayip dogrudan bu isimle cagirmak mumkundu. Ayarlar paneli artik
     herkese gorunur oldugu icin bu kapinin kapali olmasi sart. */
  var deny = requireAdmin_(); if (deny) return deny;
  var id = extractSpreadsheetId_(url) || String(url || '').trim();
  if (!/^[a-zA-Z0-9_-]{20,}$/.test(id)) {
    return { error: 'Not a valid Google Sheets link or file ID.' };
  }
  var r = registerSpreadsheetId_(id, 'manual');
  if (!r.ok) return { error: r.reason };
  /* key de doner: Ayarlar ekrani hemen ardindan bu donemin snapshot'ini
     kuruyor, boylece donemi ilk acan kullanici beklemiyor. */
  return { ok: true, key: r.key,
           message: r.name + ' -> ' + r.key + (r.isNew ? ' (added)' : ' (updated)') };
}

/**
 * Gmail'i tarayip yeni ay spreadsheet'lerini kayda ekler.
 * Gunluk zamanlayici bunu cagirir; Ayarlar ekranindaki "Simdi tara" da ayni
 * fonksiyonu calistirir.
 */
function scanGmailForPeriods() {
  /* Bu fonksiyon HEM Ayarlar dugmesinden HEM gunluk zamanlayicidan calisiyor.
     Zamanlayici calismasinda etkilesimli bir cagiran yoktur; o durumu
     engellememek icin kontrol "etkilesimli bir cagiran VARSA yonetici olmali"
     seklinde. Boylece tetikleyici bozulmadan dogrudan cagri kapaniyor. */
  var caller = '';
  try { caller = Session.getActiveUser().getEmail() || ''; } catch (e) { caller = ''; }
  if (caller && !isAuthorizedAdmin_()) {
    return { error: 'Not authorized. Ask the dashboard owner to add you as an admin.' };
  }
  var query = getGmailQuery_();
  var found = [], errors = [], seen = {};
  var threads;
  try {
    threads = GmailApp.search(query, 0, 50);
  } catch (e) {
    return { error: 'Gmail search failed: ' + e.message, query: query };
  }

  for (var t = 0; t < threads.length; t++) {
    var msgs = threads[t].getMessages();
    for (var m = 0; m < msgs.length; m++) {
      var body = '';
      try { body = msgs[m].getBody(); } catch (e) { continue; }
      var ids = body.match(/\/spreadsheets\/d\/[a-zA-Z0-9_-]{20,}/g) || [];
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i].split('/').pop();
        if (seen[id]) continue;
        seen[id] = true;
        var r = registerSpreadsheetId_(id, 'gmail');
        if (r.ok) { found.push({ key: r.key, name: r.name, isNew: r.isNew }); }
        else { errors.push(r.reason); }
      }
    }
  }
  return { query: query, found: found, errors: errors, threadCount: threads.length };
}

/** Gunluk Gmail taramasi tetikleyicisini kurar (bir kez calistirilir). */
function installDailyScanTrigger() {
  if (!isAuthorizedAdmin_()) throw new Error('Not authorized.');
  var existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === 'scanGmailForPeriods') {
      ScriptApp.deleteTrigger(existing[i]);
    }
  }
  ScriptApp.newTrigger('scanGmailForPeriods').timeBased().everyDays(1).atHour(6).create();
  return 'Daily scan trigger installed (06:00).';
}

/** Kayitli donemler, en yeniden eskiye. */
function listPeriods_() {
  var periods = readPeriods_(), out = [];
  for (var k in periods) {
    if (periods.hasOwnProperty(k)) out.push(periods[k]);
  }
  out.sort(function (a, b) { return periodIndex_(b.year, b.month) - periodIndex_(a.year, a.month); });
  return out;
}

/**
 * Bir donemi kayittan siler (yanlis dosya eklenirse).
 * Snapshot izleri de temizlenir; aksi halde donem listeden kalkiyor ama
 * Drive'da yetim snapshot dosyasi ve trend ozetinde sahte bir ay kaliyordu.
 * Kaynak spreadsheet'e DOKUNULMAZ -- yalniz dashboard'un kendi kaydi silinir.
 */
function removePeriod(key) {
  var deny = requireAdmin_(); if (deny) return deny;   /* dogrudan cagriya karsi */
  var periods = readPeriods_();
  if (!periods[key]) return { error: 'Not in registry: ' + key };
  var name = periods[key].name;
  delete periods[key];
  writePeriods_(periods);
  try { dropSnapshot_(key); } catch (e) { /* kayit yine de dusmeli */ }
  return { ok: true, key: key, name: name,
           message: key + ' removed' + (name ? ' (' + name + ')' : '') };
}

/**
 * Snapshot kurulurken bulunan kapsanan aylari kayda yazar (kendini onarma).
 * Boylece "Refresh data" demek, eski kayitlarin etiketini de duzeltiyor --
 * donemi silip yeniden eklemek gerekmiyor.
 */
function setPeriodMonths_(key, months) {
  if (!months || !months.length) return;
  var periods = readPeriods_();
  if (!periods[key]) return;
  var old = (periods[key].months || []).join(',');
  if (old === months.join(',')) return;
  periods[key].months = months;
  writePeriods_(periods);
}

/**
 * Ayarlar ekranindaki donem listesi: hangi donem hangi dosyadan geliyor,
 * kac site tanindi, ne zaman kuruldu. Yanlis dosya eklendiginde bunu
 * gormek icin gerekiyor -- panelde yalniz "ekle" vardi, "hangileri ekli"
 * ve "sil" yoktu.
 */
/* Ayarlar ekrani HERKESE acik, degistirme yalniz yoneticide (kullanici
   karari). Bu yuzden liste okumasi artik yonetici sarti aramiyor; yonetici
   olmayana dosya KIMLIGI verilmiyor (gormeye yetkisi olmayabilecegi bir
   dosyanin adresini dagitmanin anlami yok) ve donus readOnly ile isaretleniyor
   ki istemci Sil dugmelerini hic cizmesin. Gercek engel yine sunucuda:
   removePeriod / uiAddPeriod / uiScanGmail requireAdmin_ ile korunuyor. */
function listPeriodsDetailed() {
  var admin = isAuthorizedAdmin_();
  var trend = {};
  try { trend = readTrend_(); } catch (e) {}
  var out = listPeriods_().map(function (p) {
    var key = periodKey_(p.year, p.month);
    var row = { key: key, name: p.name, id: p.id, source: p.source || 'manual',
                label: MONTH_LABELS[p.month] + ' ' + p.year,
                sites: null, builtAt: null };
    /* Site sayisi trend ozetinden: ScriptProperties'te tek okuma, Drive'a
       gitmeye gerek yok (snapshot dosyasi ~300KB). */
    try {
      var t = trend[key];
      if (t) {
        row.builtAt = t.builtAt;
        var n = 0;
        for (var ro in (t.ro || {})) if (t.ro.hasOwnProperty(ro)) n += t.ro[ro].sites || 0;
        row.sites = n;
      }
    } catch (e) {}
    if (!admin) delete row.id;
    return row;
  });
  return { ok: true, periods: out, readOnly: !admin };
}
