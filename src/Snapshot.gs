/**
 * Onceden hesaplanmis donem anlik goruntusu ("snapshot").
 *
 * NEDEN VAR
 * Eski akis her sayfa acilisinda 48 sayfayi bastan okuyordu:
 *   - 8 ardisik google.script.run turu (her turun sabit gecikmesi var),
 *   - getPeriodChunk her cagrida openById + getSheets + 50 sayfa adi okumayi
 *     TEKRAR yapiyordu (ayni pahali is 7 kez),
 *   - cache 15 dk oldugu icin pratikte her ziyaret soguk cache'e denk geliyordu.
 * Sonuc: acilis ekraninda 30-60 sn bekleme.
 *
 * NASIL CALISIYOR
 * Pahali is artik kullanici beklerken degil ONCEDEN yapiliyor (saatlik
 * tetikleyici ya da yoneticinin "Yenile" dugmesi). Site'lar ay ICINDE de
 * duzeltme yaptigi icin tazeleme aylik degil SAATLIK — bkz. refreshAllSnapshots.
 * Uretilen model iki parcaya ayrilip saklaniyor:
 *   overview — RO listesi + site listesi + KPI'lar icin gereken her sey.
 *              KUCUK; doGet tarafindan dogrudan HTML'e gomuluyor, yani mutlu
 *              yolda acilista SIFIR sunucu turu var.
 *   details  — yalniz site detayinda gereken agir kisim (indicators, hrRoles,
 *              topProjects, warnings). Ilk boyamadan SONRA arka planda cekilir.
 *
 * DEPOLAMA
 * Kalici kopya ScriptProperties'te (yeni OAuth yetkisi gerektirmez), hizli
 * kopya CacheService'te. Ikisi de saveSnapshot_/loadSnapshot_ arkasinda —
 * ileride boyut sikisirsa Drive'da bir JSON dosyasina gecmek bu iki
 * fonksiyonu degistirmekten ibaret.
 *
 * PAKETLEME
 * ScriptProperties'in toplam 500KB siniri var. Olculer ({count, turnover,
 * ytdCount, ...}) obje yerine SABIT SIRALI DIZI olarak yaziliyor; anahtar
 * adlari 48 site x ~200 olcu boyunca tekrarlanmasin diye. Istemci
 * unpackSite() ile eski sekle geri ceviriyor, boylece arayuz kodu degismiyor.
 */

var PROP_SNAP_PREFIX = 'RO_DASH_SNAP_';        // + <key>  -> overview (parcali)
var SNAP_PROP_CHUNK = 8000;                    // ScriptProperties deger basina 9KB siniri
var SNAP_CACHE_TTL = 21600;                    // 6 saat (CacheService ust siniri)
var SNAP_VERSION = 1;                          // sekil degisirse artir -> eski snapshot yok sayilir
var SNAP_KEEP_PERIODS = 2;                     // kalici kopyasi tutulan donem sayisi (bkz. pruneSnapshots_)

/* Olcu alanlarinin SABIT sirasi. Sira degisirse SNAP_VERSION artirilmali. */
var MEASURE_FIELDS = ['count', 'turnover', 'ytdCount', 'ytdTurnover',
                      'planYtdCount', 'planYtdTurnover'];

/** Sayiyi kisaltir: 0 -> 0, ondalik gereksiz basamaklari atilir. */
function round_(n) {
  if (!n) return 0;
  return Math.round(n * 100) / 100;
}

/** {count:1, turnover:2, ...} -> [1,2,...]  (bkz. PAKETLEME) */
function packMeasure_(m) {
  if (!m) return null;
  var out = [], any = false;
  for (var i = 0; i < MEASURE_FIELDS.length; i++) {
    var v = round_(m[MEASURE_FIELDS[i]]);
    out.push(v);
    if (v) any = true;
  }
  return any ? out : null;   // tamamen sifir olan olcu hic yazilmaz
}

/**
 * Bir site'in HAFIF yarisi: RO listesi, site listesi ve KPI'lar icin gereken
 * her sey. Agir alanlar (indicators/hrRoles/topProjects/warnings) burada YOK.
 */
function packOverviewSite_(site) {
  var blocks = [];
  var srcBlocks = (site.detail && site.detail.blocks) || [];
  for (var i = 0; i < srcBlocks.length; i++) {
    var b = srcBlocks[i];
    var total = packMeasure_(b.total);
    var byType = {};
    var anyType = false;
    for (var t in b.byType) {
      if (!b.byType.hasOwnProperty(t)) continue;
      var packed = packMeasure_(b.byType[t]);
      if (packed) { byType[t] = packed; anyType = true; }
    }
    if (!total && !anyType) continue;          // bos blok tasinmaz
    blocks.push({ c: b.customer, s: b.status, t: total, y: anyType ? byType : null });
  }
  return {
    ro: site.ro, site: site.site, key: site.key, sheet: site.sheet,
    month: site.month, status: site.status,
    hc: site.headcount || 0,
    bc: site.budgetCount, by: site.budgetYTDCount, bt: site.budgetTurnover,
    bl: blocks,
    mm: (site.mismatch && site.mismatch.length) ? site.mismatch.length : 0
  };
}

/** Bir site'in AGIR yarisi — yalniz site detayinda gerekir. */
function packDetailSite_(site) {
  return {
    key: site.key,
    indicators: site.indicators || {},
    hrRoles: site.hrRoles || [],
    topProjects: site.topProjects || [],
    warnings: site.warnings || [],
    mismatch: site.mismatch || []
  };
}

/**
 * Bir donemin TAMAMINI tek seferde okur ve snapshot uretir.
 *
 * Eski getPeriodChunk'tan farki: dosya bir KEZ acilir, sayfa listesi bir KEZ
 * cikarilir. Eskiden bu is her parca icin (7 kez) tekrarlaniyordu.
 */
function buildSnapshot_(key) {
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
    var parsed = parseSheetName_(sheets[i].getName());
    if (!byKey[parsed.key]) { unknownSheets.push(sheets[i].getName()); continue; }
    known.push({ sheet: sheets[i], key: parsed.key, month: parsed.month });
    seenKeys[parsed.key] = true;
  }

  var missing = [];
  for (var s = 0; s < SITE_REGISTRY.length; s++) {
    if (!seenKeys[SITE_REGISTRY[s].key]) {
      missing.push({ ro: SITE_REGISTRY[s].ro, site: SITE_REGISTRY[s].site, status: 'no-data' });
    }
  }

  /* Ayni site'in birden cok ayi varsa en guncelini tut — eskiden istemcide
     yapiliyordu; snapshot butunu burada olustugu icin dogru yeri burasi. */
  var best = {};
  for (var j = 0; j < known.length; j++) {
    var it = known[j];
    var prev = best[it.key];
    if (!prev || (it.month || 0) > (prev.month || 0)) best[it.key] = it;
  }

  var overview = [], details = [], maxMonth = 0;
  for (var k in best) {
    if (!best.hasOwnProperty(k)) continue;
    var item = best[k];
    var site = parseSiteSheet_(item.sheet, byKey[item.key], item.month, period.year);
    site.key = item.key;
    if (site.month > maxMonth) maxMonth = site.month;
    overview.push(packOverviewSite_(site));
    details.push(packDetailSite_(site));
  }

  /* Raporlama ayinin gerisinde kalan site'lar isaretlenir. */
  for (var o = 0; o < overview.length; o++) {
    if (overview[o].month && overview[o].month < maxMonth && overview[o].status === 'ok') {
      overview[o].status = 'behind-schedule';
    }
  }

  return {
    v: SNAP_VERSION,
    builtAt: new Date().toISOString(),
    period: { key: key, year: period.year, month: period.month,
              label: MONTH_LABELS[period.month] + ' ' + period.year, name: period.name },
    reportMonth: maxMonth,
    sites: overview,
    details: details,
    missingSites: missing,
    unknownSheets: unknownSheets
  };
}

/* ---------- depolama ---------- */

function propsPut_(base, json) {
  var props = PropertiesService.getScriptProperties();
  var chunks = [];
  for (var i = 0; i < json.length; i += SNAP_PROP_CHUNK) {
    chunks.push(json.slice(i, i + SNAP_PROP_CHUNK));
  }
  /* Once eski parcalari sil — yeni snapshot kisaysa artik parcalar kalirdi. */
  propsDelete_(base);
  var toSet = {};
  toSet[base + '_n'] = String(chunks.length);
  for (var c = 0; c < chunks.length; c++) toSet[base + '_' + c] = chunks[c];
  props.setProperties(toSet, false);
}

function propsGet_(base) {
  var all = PropertiesService.getScriptProperties().getProperties();
  var n = parseInt(all[base + '_n'], 10);
  if (!n) return null;
  var parts = [];
  for (var c = 0; c < n; c++) {
    var p = all[base + '_' + c];
    if (p == null) return null;
    parts.push(p);
  }
  return parts.join('');
}

function propsDelete_(base) {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  for (var k in all) {
    if (all.hasOwnProperty(k) && k.indexOf(base + '_') === 0) props.deleteProperty(k);
  }
}

/**
 * Snapshot'i saklar. overview kalici (ScriptProperties) + hizli (cache);
 * details yalniz cache'te — agir, kalici olmasi sart degil, cache bosalirsa
 * tek sayfa okumasiyla yeniden uretilebiliyor.
 */
function saveSnapshot_(key, snap) {
  var details = snap.details;
  delete snap.details;

  var overviewJson = JSON.stringify(snap);
  var cache = CacheService.getScriptCache();
  try { cachePut_(cache, 'snapo_' + key, snap, SNAP_CACHE_TTL); } catch (e) {}
  try { cachePut_(cache, 'snapd_' + key, details, SNAP_CACHE_TTL); } catch (e) {}

  var stored = true, storeError = null;
  try {
    pruneSnapshots_();                 // once yer ac, sonra yaz
    propsPut_(PROP_SNAP_PREFIX + key, overviewJson);
  } catch (e) {
    /* Kalici kopya yazilamadi (ornegin 500KB kotasi doldu). Olumcul degil:
       cache kopyasi duruyor ve tetikleyici bir sonraki turda tekrar dener.
       Gercek boyut Ayarlar panelinde gorunuyor — tahmin yerine olcum. */
    stored = false; storeError = e.message;
  }

  snap.details = details;   // cagirana butun objeyi geri ver
  return { bytes: overviewJson.length, durable: stored, storeError: storeError };
}

/** overview: once cache, sonra ScriptProperties. Ikisi de yoksa null. */
function loadOverview_(key) {
  var hit = null;
  try { hit = cacheGet_(CacheService.getScriptCache(), 'snapo_' + key); } catch (e) {}
  if (hit && hit.v === SNAP_VERSION) return hit;

  var raw = propsGet_(PROP_SNAP_PREFIX + key);
  if (!raw) return null;
  var obj;
  try { obj = JSON.parse(raw); } catch (e) { return null; }
  if (!obj || obj.v !== SNAP_VERSION) return null;
  /* Kalicidan geldi -> cache'i tazele ki sonraki okuma daha hizli olsun. */
  try { cachePut_(CacheService.getScriptCache(), 'snapo_' + key, obj, SNAP_CACHE_TTL); } catch (e) {}
  return obj;
}

function loadDetails_(key) {
  try { return cacheGet_(CacheService.getScriptCache(), 'snapd_' + key); } catch (e) { return null; }
}

/* ---------- istemci / tetikleyici uclari ---------- */

/**
 * Site detayi icin agir yari (TOPS, ekip, gostergeler).
 *
 * Cache TTL'i 6 saat, tetikleyici saatlik — yani normalde hep sicak. Bos
 * cikarsa donem yeniden kurulur; bu cagri ilk boyamadan SONRA arka planda
 * yapildigi icin kullanici beklemez, uzun surerse de ekran bozulmaz.
 */
function getPeriodDetails(key) {
  try {
    var d = loadDetails_(key);
    if (d) return { details: d };
    var built = refreshPeriodSnapshot_(key);
    if (built.error) return built;
    return { details: built.snap.details, rebuilt: true };
  } catch (e) {
    return { error: 'Could not read site details: ' + e.message };
  }
}

/**
 * Donem degistirildiginde cagrilir. Hazir snapshot varsa dondurur; yoksa
 * istemci eski parcali okuma yoluna dussun diye needsBuild isaretler —
 * 48 sayfayi tek istekte okumak HTTP 502'ye dusuyordu, o yola geri donmuyoruz.
 */
function getPeriodSnapshot(key) {
  try {
    var o = loadOverview_(key);
    if (o) return { snapshot: o };
    return { needsBuild: true };
  } catch (e) {
    return { error: 'Could not load period: ' + e.message };
  }
}

/** Donemi yeniden okuyup snapshot'i tazeler. */
function refreshPeriodSnapshot_(key) {
  var snap = buildSnapshot_(key);
  if (snap.error) return snap;
  var info = saveSnapshot_(key, snap);
  return { snap: snap, info: info };
}

/** Yonetici "Yenile" dugmesi. */
function uiRefreshPeriod(key) {
  var deny = requireAdmin_(); if (deny) return deny;
  var t0 = Date.now();
  var res = refreshPeriodSnapshot_(key);
  if (res.error) return res;
  return {
    ok: true,
    builtAt: res.snap.builtAt,
    siteCount: res.snap.sites.length,
    seconds: Math.round((Date.now() - t0) / 100) / 10,
    durable: res.info.durable,
    kb: Math.round(res.info.bytes / 1024),
    message: 'Snapshot rebuilt: ' + res.snap.sites.length + ' sites in ' +
             (Math.round((Date.now() - t0) / 100) / 10) + ' s, ' +
             Math.round(res.info.bytes / 1024) + ' KB stored' +
             (res.info.durable ? ' (durable).' :
              ' — durable copy FAILED: ' + res.info.storeError)
  };
}

/**
 * En guncel SNAP_KEEP_PERIODS donem disindaki kalici snapshot'lari siler.
 *
 * ScriptProperties'in TOPLAM 500KB kotasi var; her ay yeni bir donem eklendikce
 * eski snapshot'lar birikirse bu kota dolar ve yeni donem hic yazilamaz.
 * Eski donemler zaten degismiyor — gerektiginde yeniden kurulabilirler.
 */
function pruneSnapshots_() {
  var periods = listPeriods_();          // en yeniden eskiye
  var keep = {};
  for (var i = 0; i < periods.length && i < SNAP_KEEP_PERIODS; i++) {
    keep[PROP_SNAP_PREFIX + periodKey_(periods[i].year, periods[i].month)] = true;
  }
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var removed = [];
  for (var k in all) {
    if (!all.hasOwnProperty(k)) continue;
    if (k.indexOf(PROP_SNAP_PREFIX) !== 0) continue;
    /* "RO_DASH_SNAP_2026-06_3" -> taban "RO_DASH_SNAP_2026-06" */
    var base = k.slice(0, k.lastIndexOf('_'));
    if (keep[base]) continue;
    props.deleteProperty(k);
    if (removed.indexOf(base) === -1) removed.push(base);
  }
  return removed;
}

/**
 * Tetikleyici ucu: en guncel donemlerin snapshot'ini tazeler.
 *
 * Aylik rapor ayda bir "yenilenmiyor" — site'lar ay ICINDE de duzeltme
 * yapiyor (kullanici geri bildirimi). Bu yuzden tazeleme saatlik; maliyeti
 * gunde ~20-25 dk tetikleyici suresi, Workspace'in 6 sa/gun kotasinin
 * kucuk bir dilimi. Tazeleme arka planda oldugu icin kimse beklemiyor:
 * yenilenene kadar kullanici bir onceki snapshot'i goruyor.
 */
function refreshAllSnapshots() {
  var periods = listPeriods_();
  var done = [], failed = [];
  for (var i = 0; i < periods.length && done.length < SNAP_KEEP_PERIODS; i++) {
    var key = periodKey_(periods[i].year, periods[i].month);
    try {
      var res = refreshPeriodSnapshot_(key);
      if (res.error) failed.push(key + ': ' + res.error);
      else done.push(key);
    } catch (e) {
      failed.push(key + ': ' + e.message);
    }
  }
  var pruned = pruneSnapshots_();
  return { refreshed: done, failed: failed, pruned: pruned };
}

/** Snapshot tazeleme tetikleyicisini kurar (saatte bir). */
function installSnapshotTrigger() {
  var existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === 'refreshAllSnapshots') {
      ScriptApp.deleteTrigger(existing[i]);
    }
  }
  ScriptApp.newTrigger('refreshAllSnapshots').timeBased().everyHours(1).create();
  return 'Snapshot refresh trigger installed (hourly).';
}
