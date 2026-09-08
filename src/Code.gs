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

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Valeo RO Aylık Rapor')
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
                 label: MONTH_LABELS_TR[p.month] + ' ' + p.year, name: p.name };
      }),
      roLabels: RO_LABELS,
      roOrder: RO_ORDER,
      siteCount: SITE_REGISTRY.length,
      gmailQuery: getGmailQuery_()
    };
  } catch (e) {
    return { error: 'Acilis verisi alinamadi: ' + e.message };
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
      var hit = cache.get(cacheKey);
      if (hit) {
        var parsed = JSON.parse(hit);
        parsed.fromCache = true;
        return parsed;
      }
    }

    var periods = readPeriods_();
    var period = periods[key];
    if (!period) return { error: 'Donem kayitli degil: ' + key };

    var ss;
    try { ss = SpreadsheetApp.openById(period.id); }
    catch (e) { return { error: 'Donem dosyasi acilamadi (erisim yok olabilir): ' + period.name }; }

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
        missing.push({ ro: SITE_REGISTRY[s].ro, site: SITE_REGISTRY[s].site, status: 'veri-yok' });
      }
    }

    // Raporlama ayinin gerisinde kalan site'lari isaretle
    var maxMonth = 0;
    sites.forEach(function (s) { if (s.month > maxMonth) maxMonth = s.month; });
    sites.forEach(function (s) {
      if (s.month && s.month < maxMonth && s.status === 'ok') s.status = 'raporlama-geride';
    });

    var payload = {
      period: { key: key, year: period.year, month: period.month,
                label: MONTH_LABELS_TR[period.month] + ' ' + period.year, name: period.name },
      reportMonth: maxMonth,
      sites: sites,
      missingSites: missing,
      unknownSheets: unknownSheets,
      generatedAt: new Date().toISOString()
    };

    try { cache.put(cacheKey, JSON.stringify(payload), CACHE_TTL_SECONDS); }
    catch (e) { /* 100KB siniri asilabilir; cache'siz devam */ }

    return payload;
  } catch (e) {
    return { error: 'Veri okunamadi: ' + e.message };
  }
}

/* --- Ayarlar ekrani ucu ------------------------------------------- */

function uiScanGmail()          { return scanGmailForPeriods(); }
function uiAddPeriod(url)       { return addPeriodByUrl(url); }
function uiRemovePeriod(key)    { return removePeriod(key); }
function uiSetGmailQuery(q)     { return { ok: true, query: setGmailQuery(q) }; }
function uiInstallTrigger()     { return { ok: true, message: installDailyScanTrigger() }; }
