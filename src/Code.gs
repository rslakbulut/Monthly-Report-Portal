/**
 * Web app giris noktasi ve istemci ucu.
 *
 * Bagimsiz (standalone) bir Apps Script projesidir: aylik rapor her ay YENI bir
 * spreadsheet olarak olusturuldugu icin dashboard hicbir dosyaya bagli degildir.
 * Donem -> dosya eslemesi PeriodRegistry.gs'te, Gmail taramasiyla doldurulur.
 *
 * Aylik rapor dosyalari YALNIZ OKUNUR.
 */

var CACHE_TTL_SECONDS = 900;   // 15 dk
var CACHE_CHUNK_SIZE = 90000;  // CacheService tek deger basina 100KB siniriyor; guvenli pay birakildi

/**
 * CacheService'in 100KB/anahtar sinirini asmak icin buyuk objeleri parcalayip
 * yazar/okur. 48 site'in tum parse edilmis verisi kolayca 100KB'i asiyor;
 * eskiden tek parca yazilmaya calisilip sessizce basarisiz oluyordu (cache
 * hicbir zaman tutmuyordu, her acilista 48 sayfa yeniden taraniyordu).
 */
function cachePut_(cache, key, obj, ttlSeconds) {
  var json = JSON.stringify(obj);
  var chunks = [];
  for (var i = 0; i < json.length; i += CACHE_CHUNK_SIZE) {
    chunks.push(json.slice(i, i + CACHE_CHUNK_SIZE));
  }
  var toPut = {};
  toPut[key + '_meta'] = JSON.stringify({ n: chunks.length });
  for (var c = 0; c < chunks.length; c++) toPut[key + '_c' + c] = chunks[c];
  cache.putAll(toPut, ttlSeconds);
}

function cacheGet_(cache, key) {
  var metaRaw = cache.get(key + '_meta');
  if (!metaRaw) return null;
  var n = JSON.parse(metaRaw).n;
  var keys = [];
  for (var c = 0; c < n; c++) keys.push(key + '_c' + c);
  var all = cache.getAll(keys);
  var parts = [];
  for (var c = 0; c < n; c++) {
    var part = all[key + '_c' + c];
    if (part == null) return null;   // parca suresi dolmus/eksik -> cache miss say
    parts.push(part);
  }
  return JSON.parse(parts.join(''));
}

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Valeo RO Monthly Report')
    // HtmlService <head> icindeki meta viewport'u siler; sunucu tarafinda verilmeli.
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Index.html icinden CSS/JS parcalarini gomer. */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** RO basina kayitli site sayisi — "Sites reported" paydasi RO secilince
    48 degil o RO'nun kendi site sayisi olsun diye. */
function roSiteCounts_() {
  var out = {};
  SITE_REGISTRY.forEach(function (r) { out[r.ro] = (out[r.ro] || 0) + 1; });
  return out;
}

/** Ekranin acilista ihtiyac duydugu hafif bilgi: donem listesi + RO etiketleri. */
function getBootstrap() {
  try {
    return {
      periods: listPeriods_().map(function (p) {
        return { key: periodKey_(p.year, p.month), year: p.year, month: p.month,
                 label: MONTH_LABELS[p.month] + ' ' + p.year, name: p.name };
      }),
      roLabels: RO_LABELS,
      roOrder: RO_ORDER,
      siteCount: SITE_REGISTRY.length,
      roCounts: roSiteCounts_(),
      gmailQuery: getGmailQuery_(),
      isAdmin: isAuthorizedAdmin_()
    };
  } catch (e) {
    return { error: 'Could not load start-up data: ' + e.message };
  }
}

/**
 * Bir donemin sayfa listesini cikarir (SAYFA ICERIGI OKUNMAZ — hizli).
 *
 * Neden ayri: tum 48 sayfayi tek cagrida okumak Apps Script'in istek suresini
 * asip HTTP 502'ye dusuyordu ve istemci tarafinda ilerleme cubugu tek bir
 * degerde donuyordu. Artik istemci once bu ucuz cagriyla ne kadar is oldugunu
 * ogreniyor, sonra sayfalari parca parca (getPeriodChunk) cekiyor.
 *
 * @param {string} key "2026-06"
 */
function getPeriodMeta(key) {
  try {
    var periods = readPeriods_();
    var period = periods[key];
    if (!period) return { error: 'Period is not registered: ' + key };

    var ss;
    try { ss = SpreadsheetApp.openById(period.id); }
    catch (e) { return { error: 'Period file could not be opened (access may be missing): ' + period.name }; }

    var byKey = registryByKey_();
    var sheets = ss.getSheets();
    var known = [], unknownSheets = [], seenKeys = {};

    for (var i = 0; i < sheets.length; i++) {
      var name = sheets[i].getName();
      var parsedName = parseSheetName_(name);
      if (!byKey[parsedName.key]) { unknownSheets.push(name); continue; }
      known.push({ name: name, key: parsedName.key, month: parsedName.month || 0, index: i });
      seenKeys[parsedName.key] = true;
    }

    var missing = [];
    for (var s = 0; s < SITE_REGISTRY.length; s++) {
      if (!seenKeys[SITE_REGISTRY[s].key]) {
        missing.push({ ro: SITE_REGISTRY[s].ro, site: SITE_REGISTRY[s].site, status: 'no-data' });
      }
    }

    return {
      period: { key: key, year: period.year, month: period.month,
                label: MONTH_LABELS[period.month] + ' ' + period.year, name: period.name },
      sheets: known,
      total: known.length,
      missingSites: missing,
      unknownSheets: unknownSheets
    };
  } catch (e) {
    return { error: 'Could not read period: ' + e.message };
  }
}

/**
 * Sayfa listesinin [from, to) araligini ayristirir. Her parca ayri
 * cache'lenir; bir parca birkac saniye surdugu icin zaman asimi riski yok.
 */
function getPeriodChunk(key, from, to, forceRefresh) {
  try {
    var cache = CacheService.getScriptCache();
    var cacheKey = 'chunk_' + key + '_' + from + '_' + to;
    if (!forceRefresh) {
      var hit = cacheGet_(cache, cacheKey);
      if (hit) { hit.fromCache = true; return hit; }
    }

    var periods = readPeriods_();
    var period = periods[key];
    if (!period) return { error: 'Period is not registered: ' + key };

    var ss;
    try { ss = SpreadsheetApp.openById(period.id); }
    catch (e) { return { error: 'Period file could not be opened: ' + period.name }; }

    var byKey = registryByKey_();
    var sheets = ss.getSheets();
    var known = [];
    for (var i = 0; i < sheets.length; i++) {
      var parsedName = parseSheetName_(sheets[i].getName());
      if (!byKey[parsedName.key]) continue;
      known.push({ sheet: sheets[i], key: parsedName.key, month: parsedName.month });
    }

    var sites = [];
    var end = Math.min(to, known.length);
    for (var j = from; j < end; j++) {
      var it = known[j];
      var site = parseSiteSheet_(it.sheet, byKey[it.key], it.month, period.year);
      site.key = it.key;   // istemci ayni site'in birden cok ayini bu anahtarla eler
      sites.push(site);
    }

    var payload = { sites: sites, from: from, to: end };
    try { cachePut_(cache, cacheKey, payload, CACHE_TTL_SECONDS); }
    catch (e) { /* cache yazilamadi; cache'siz devam */ }
    return payload;
  } catch (e) {
    return { error: 'Could not read sheets ' + from + '-' + to + ': ' + e.message };
  }
}

/* --- Ayarlar ekrani ucu -------------------------------------------
   Her fonksiyon requireAdmin_() ile baslar (bkz. PeriodRegistry.gs) — bu
   kontrol olmadan appsscript.json'daki webapp.access:'DOMAIN' + executeAs:
   'USER_DEPLOYING' kombinasyonu, erisimi olan HERKESIN deploy eden hesabin
   kimligiyle Gmail taratmasina/tetikleyici kurmasina/kayit defterine
   spreadsheet eklemesine izin veriyordu. */

function uiScanGmail() {
  var deny = requireAdmin_(); if (deny) return deny;
  return scanGmailForPeriods();
}
function uiAddPeriod(url) {
  var deny = requireAdmin_(); if (deny) return deny;
  return addPeriodByUrl(url);
}
function uiRemovePeriod(key) {
  var deny = requireAdmin_(); if (deny) return deny;
  return removePeriod(key);
}
function uiSetGmailQuery(q) {
  var deny = requireAdmin_(); if (deny) return deny;
  return { ok: true, query: setGmailQuery(q) };
}
function uiInstallTrigger() {
  var deny = requireAdmin_(); if (deny) return deny;
  return { ok: true, message: installDailyScanTrigger() };
}
