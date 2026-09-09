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

  var month = p.month;
  if (!month) month = dominantSheetMonth_(ss);
  if (!month) return { ok: false, reason: 'No month in file name or sheet names: ' + name };

  var key = periodKey_(p.year, month);
  var periods = readPeriods_();
  var isNew = !periods[key];
  periods[key] = {
    id: id, name: name, year: p.year, month: month,
    addedAt: new Date().toISOString(), source: source || 'manual'
  };
  writePeriods_(periods);
  return { ok: true, key: key, name: name, isNew: isNew };
}

/** Sayfa adlarindaki _MM eklerinin en sik goruleni (dosya adinda ay yoksa). */
function dominantSheetMonth_(ss) {
  var counts = {}, sheets = ss.getSheets(), best = null, bestN = 0;
  for (var i = 0; i < sheets.length; i++) {
    var parsed = parseSheetName_(sheets[i].getName());
    if (!parsed.month) continue;
    counts[parsed.month] = (counts[parsed.month] || 0) + 1;
    if (counts[parsed.month] > bestN) { bestN = counts[parsed.month]; best = parsed.month; }
  }
  return best;
}

/**
 * Kullanicinin yapistirdigi link ile elle donem ekleme (UI'dan cagrilir).
 * Gmail taramasi bir ayi kacirirsa emniyet supabi budur.
 */
function addPeriodByUrl(url) {
  var id = extractSpreadsheetId_(url) || String(url || '').trim();
  if (!/^[a-zA-Z0-9_-]{20,}$/.test(id)) {
    return { error: 'Not a valid Google Sheets link or file ID.' };
  }
  var r = registerSpreadsheetId_(id, 'manual');
  if (!r.ok) return { error: r.reason };
  return { ok: true, message: r.name + ' -> ' + r.key + (r.isNew ? ' (added)' : ' (updated)') };
}

/**
 * Gmail'i tarayip yeni ay spreadsheet'lerini kayda ekler.
 * Gunluk zamanlayici bunu cagirir; Ayarlar ekranindaki "Simdi tara" da ayni
 * fonksiyonu calistirir.
 */
function scanGmailForPeriods() {
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

/** Bir donemi kayittan siler (yanlis dosya eklenirse). */
function removePeriod(key) {
  var periods = readPeriods_();
  if (!periods[key]) return { error: 'Not in registry: ' + key };
  delete periods[key];
  writePeriods_(periods);
  return { ok: true };
}
