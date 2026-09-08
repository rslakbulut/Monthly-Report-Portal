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
      gmailQuery: getGmailQuery_()
    };
  } catch (e) {
    return { error: 'Could not load start-up data: ' + e.message };
  }
}

/**
 * Secili donemin tum site'larini okur.
 * @param {string} key  "2026-06"
 * @param {boolean} forceRefresh  cache'i atla
 */
function getDashboardData(key, forceRefresh) {
  try {
    var cache = CacheService.getScriptCache();
    var cacheKey = 'dash_' + key;
    if (!forceRefresh) {
      var hit = cacheGet_(cache, cacheKey);
      if (hit) {
        hit.fromCache = true;
        return hit;
      }
    }

    var periods = readPeriods_();
    var period = periods[key];
    if (!period) return { error: 'Period is not registered: ' + key };

    var ss;
    try { ss = SpreadsheetApp.openById(period.id); }
    catch (e) { return { error: 'Period file could not be opened (access may be missing): ' + period.name }; }

    var byKey = registryByKey_();
    var sheets = ss.getSheets();
    var sites = [], unknownSheets = [], seen = {};

    for (var i = 0; i < sheets.length; i++) {
      var parsedName = parseSheetName_(sheets[i].getName());
      var reg = byKey[parsedName.key];
      if (!reg) { unknownSheets.push(sheets[i].getName()); continue; }
      // Ayni site icin birden cok sayfa varsa en guncel ayi tut
      var prev = seen[parsedName.key];
      if (prev && (prev.month || 0) >= (parsedName.month || 0)) continue;
      var site = parseSiteSheet_(sheets[i], reg, parsedName.month, period.year);
      seen[parsedName.key] = site;
    }
    for (var k in seen) { if (seen.hasOwnProperty(k)) sites.push(seen[k]); }

    // Kayitta olup sayfasi olmayan site'lar
    var missing = [];
    for (var s = 0; s < SITE_REGISTRY.length; s++) {
      if (!seen[SITE_REGISTRY[s].key]) {
        missing.push({ ro: SITE_REGISTRY[s].ro, site: SITE_REGISTRY[s].site, status: 'no-data' });
      }
    }

    // Raporlama ayinin gerisinde kalan site'lari isaretle
    var maxMonth = 0;
    sites.forEach(function (s) { if (s.month > maxMonth) maxMonth = s.month; });
    sites.forEach(function (s) {
      if (s.month && s.month < maxMonth && s.status === 'ok') s.status = 'behind-schedule';
    });

    var payload = {
      period: { key: key, year: period.year, month: period.month,
                label: MONTH_LABELS[period.month] + ' ' + period.year, name: period.name },
      reportMonth: maxMonth,
      sites: sites,
      missingSites: missing,
      unknownSheets: unknownSheets,
      generatedAt: new Date().toISOString()
    };

    try { cachePut_(cache, cacheKey, payload, CACHE_TTL_SECONDS); }
    catch (e) { /* cache yazilamadi (kota vb.); cache'siz devam */ }

    return payload;
  } catch (e) {
    return { error: 'Could not read data: ' + e.message };
  }
}

/* --- Ayarlar ekrani ucu ------------------------------------------- */

function uiScanGmail()          { return scanGmailForPeriods(); }
function uiAddPeriod(url)       { return addPeriodByUrl(url); }
function uiRemovePeriod(key)    { return removePeriod(key); }
function uiSetGmailQuery(q)     { return { ok: true, query: setGmailQuery(q) }; }
function uiInstallTrigger()     { return { ok: true, message: installDailyScanTrigger() }; }
