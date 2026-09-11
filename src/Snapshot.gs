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
 * Kalici kopya DRIVE'da, donem basina iki JSON dosyasi:
 *   snapshot-<key>.json  (overview)   details-<key>.json  (agir yari)
 * Hizli kopya CacheService'te. Dosyalar uygulamanin kendi olusturdugu bir
 * klasorde durur; drive.file yetkisi yalniz bu dosyalari gorur, kullanicinin
 * Drive'inin geri kalanina erisemez.
 *
 * Neden ScriptProperties degil: her ay yeni bir spreadsheet ekleniyor (yilda
 * 12, her yil +12) ve TUM donemler dashboard'da gorunur olmali. Overview
 * donem basina ~120KB; ScriptProperties'in TOPLAM 500KB kotasi ancak ~3 donem
 * alirdi. Drive'da sinir yok: 12 donem/yil x ~250KB = ~3MB/yil.
 *
 * ScriptProperties'te yalniz iki kucuk sey kalir: dosya indeksi (key -> fileId)
 * ve TREND ozeti (donem basina ~1KB; 60 ay = ~60KB). Trend ozeti sayesinde
 * yillar arasi grafik tek okumayla, dosyalara hic gitmeden cizilebiliyor.
 *
 * PAKETLEME
 * ScriptProperties'in toplam 500KB siniri var. Olculer ({count, turnover,
 * ytdCount, ...}) obje yerine SABIT SIRALI DIZI olarak yaziliyor; anahtar
 * adlari 48 site x ~200 olcu boyunca tekrarlanmasin diye. Istemci
 * unpackSite() ile eski sekle geri ceviriyor, boylece arayuz kodu degismiyor.
 */

var PROP_SNAP_PREFIX = 'RO_DASH_SNAP_';        // ESKI (ScriptProperties) depo — yalniz temizlik icin
var PROP_SNAP_INDEX  = 'RO_DASH_SNAP_INDEX';   // {key: {o:fileId, d:fileId}}
var PROP_SNAP_FOLDER = 'RO_DASH_SNAP_FOLDER';  // Drive klasor id'si
var PROP_TREND       = 'RO_DASH_TREND';        // {key: {builtAt, ro:{...}}}  — tum donemler
var PROP_LAST_STORE_ERR = 'RO_DASH_LAST_STORE_ERR';   // son kalici yazma hatasi (teshis)
var SNAP_FOLDER_NAME = 'RO Dashboard Snapshots';
var SNAP_CACHE_TTL = 21600;                    // 6 saat (CacheService ust siniri)
var SNAP_VERSION = 1;                          // sekil degisirse artir -> eski snapshot yok sayilir

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

/* ---------- depolama: Drive dosyalari + cache ---------- */

/* Neden DriveApp DEGIL, Drive REST API:
   DriveApp'in createFolder/createFile cagrilari TAM 'drive' yetkisi istiyor
   ("Specified permissions are not sufficient to call DriveApp.createFolder.
   Required permissions: .../auth/drive") — yani kullanicinin Drive'inin
   TAMAMINA erisim. Dar olan 'drive.file' yetkisi ise REST API ile calisiyor ve
   yalniz uygulamanin KENDI olusturdugu dosyalari gorur. Kullaniciya verilen
   soz bu: panonun kendi snapshot dosyalari disinda hicbir seye erisilmiyor.
   UrlFetchApp icin gereken script.external_request yetkisi zaten vardi. */
function driveApi_(url, options) {
  var opt = options || {};
  opt.muteHttpExceptions = true;
  opt.headers = opt.headers || {};
  opt.headers.Authorization = 'Bearer ' + ScriptApp.getOAuthToken();
  var res = UrlFetchApp.fetch(url, opt);
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Drive API ' + code + ': ' + res.getContentText().slice(0, 300));
  }
  return res;
}

var DRIVE_V3 = 'https://www.googleapis.com/drive/v3/files';
var DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

function driveGetMeta_(id) {
  var res = driveApi_(DRIVE_V3 + '/' + encodeURIComponent(id) +
                      '?fields=id,name,trashed,webViewLink', { method: 'get' });
  return JSON.parse(res.getContentText());
}

function driveCreateFolder_(name) {
  var res = driveApi_(DRIVE_V3 + '?fields=id,name,webViewLink', {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({ name: name, mimeType: 'application/vnd.google-apps.folder' })
  });
  return JSON.parse(res.getContentText());
}

/** Icerikli dosya olusturur (multipart: once metadata, sonra govde). */
function driveCreateFile_(name, content, parentId) {
  var boundary = '----roDash' + Date.now();
  var meta = { name: name, mimeType: 'application/json' };
  if (parentId) meta.parents = [parentId];
  var body =
    '--' + boundary + '\r\n' +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(meta) + '\r\n' +
    '--' + boundary + '\r\n' +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    content + '\r\n' +
    '--' + boundary + '--';
  var res = driveApi_(DRIVE_UPLOAD + '?uploadType=multipart&fields=id', {
    method: 'post', contentType: 'multipart/related; boundary=' + boundary, payload: body
  });
  return JSON.parse(res.getContentText()).id;
}

function driveUpdateFile_(id, content) {
  driveApi_(DRIVE_UPLOAD + '/' + encodeURIComponent(id) + '?uploadType=media', {
    method: 'patch', contentType: 'application/json; charset=UTF-8', payload: content
  });
}

function driveReadFile_(id) {
  var res = driveApi_(DRIVE_V3 + '/' + encodeURIComponent(id) + '?alt=media', { method: 'get' });
  return res.getContentText('UTF-8');
}

/** 'Drive API 403: ...' mesajindan HTTP kodunu cikarir. */
function driveApiCode_(e) {
  var m = /Drive API (\d+)/.exec(String((e && e.message) || e));
  return m ? parseInt(m[1], 10) : 0;
}

/** Snapshot dosyalarinin durdugu klasorun id'si; yoksa olusturulur. */
function snapFolderId_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PROP_SNAP_FOLDER);
  if (id) {
    try {
      var meta = driveGetMeta_(id);
      if (meta && !meta.trashed) return id;
    } catch (e) {
      /* YALNIZ 404'te yenisi olusturulur: dosya gercekten yok demektir.
         Diger hatalari (403, 5xx, ag) yutup yeni klasor acmak, her
         calistirmada Drive'a bir klasor daha birakiyordu ve ASIL hatayi
         goruntuden kaldiriyordu — canlida tam bu oldu. */
      if (driveApiCode_(e) !== 404) throw e;
    }
  }
  var created = driveCreateFolder_(SNAP_FOLDER_NAME);
  props.setProperty(PROP_SNAP_FOLDER, created.id);
  return created.id;
}

function snapIndex_() {
  var raw = PropertiesService.getScriptProperties().getProperty(PROP_SNAP_INDEX);
  if (!raw) return {};
  try { return JSON.parse(raw) || {}; } catch (e) { return {}; }
}

function saveSnapIndex_(idx) {
  PropertiesService.getScriptProperties().setProperty(PROP_SNAP_INDEX, JSON.stringify(idx));
}

/**
 * Bir donemin bir yuvasini (slot: 'o' = overview, 'd' = details) Drive'a yazar.
 * Dosya varsa icerigi degistirilir, yoksa olusturulur. Dosya elle silinmisse
 * getFileById hata verir; o durumda yenisi olusturulup indeks tazelenir.
 */
function driveWrite_(key, slot, json) {
  var idx = snapIndex_();
  var entry = idx[key] || (idx[key] = {});
  if (entry[slot]) {
    try { driveUpdateFile_(entry[slot], json); return entry[slot]; }
    catch (e) { entry[slot] = null; }   // dosya silinmis -> yenisi olusturulur
  }
  var name = (slot === 'o' ? 'snapshot-' : 'details-') + key + '.json';
  entry[slot] = driveCreateFile_(name, json, snapFolderId_());
  saveSnapIndex_(idx);
  return entry[slot];
}

function driveRead_(key, slot) {
  var entry = snapIndex_()[key];
  if (!entry || !entry[slot]) return null;
  try { return driveReadFile_(entry[slot]); }
  catch (e) { return null; }   // dosya silinmis -> cagiran yeniden kurar
}

/* ---------- trend: donem basina minik RO ozeti ----------
   "Her yil +12 spreadsheet ve hepsinin datasi gorunur olmali" (kullanici).
   60 ayin TAM verisini ayni anda tutmak gereksiz; yillar arasi grafik icin
   donem basina RO bazinda birkac sayi yetiyor (~1KB). Bu ozet
   ScriptProperties'te duruyor, yani trend grafigi TEK okumayla ciziliyor. */

/** {NEW:x, REMAN:y} -> x+y  (null/eksik degerler 0 sayilir) */
function sumStatus_(o) {
  if (!o) return 0;
  return (typeof o.NEW === 'number' ? o.NEW : 0) +
         (typeof o.REMAN === 'number' ? o.REMAN : 0);
}

/** Paketlenmis overview'dan RO bazinda trend satirlari uretir. */
function trendRollup_(sites) {
  var byRo = {};
  for (var i = 0; i < sites.length; i++) {
    var p = sites[i];
    var r = byRo[p.ro] || (byRo[p.ro] = { sites: 0, hc: 0, bc: 0, by: 0, bt: 0,
                                          rc: 0, rt: 0, pt: 0 });
    r.sites++;
    r.hc += p.hc || 0;
    r.bc += sumStatus_(p.bc && p.bc.TOTAL);      // Budget Year adet
    r.by += sumStatus_(p.by && p.by.TOTAL);      // Budget YTD adet
    r.bt += sumStatus_(p.bt && p.bt.TOTAL);      // Budget Year ciro (M€)
    for (var b = 0; b < (p.bl || []).length; b++) {
      var t = p.bl[b].t;
      if (!t) continue;
      r.rc += t[2] || 0;                          // ytdCount      -> Real Launches
      r.rt += (t[3] || 0) / 1000;                 // ytdTurnover k€ -> M€
      r.pt += (t[5] || 0) / 1000;                 // planYtdTurnover
    }
  }
  for (var ro in byRo) {
    if (!byRo.hasOwnProperty(ro)) continue;
    byRo[ro].bt = round_(byRo[ro].bt);
    byRo[ro].rt = round_(byRo[ro].rt);
    byRo[ro].pt = round_(byRo[ro].pt);
  }
  return byRo;
}

function readTrend_() {
  var raw = PropertiesService.getScriptProperties().getProperty(PROP_TREND);
  if (!raw) return {};
  try { return JSON.parse(raw) || {}; } catch (e) { return {}; }
}

function writeTrendFor_(key, snap) {
  var all = readTrend_();
  all[key] = {
    builtAt: snap.builtAt,
    month: snap.period.month, year: snap.period.year,
    label: snap.period.label,
    ro: trendRollup_(snap.sites)
  };
  PropertiesService.getScriptProperties().setProperty(PROP_TREND, JSON.stringify(all));
}

/**
 * Snapshot'i saklar: iki Drive dosyasi + cache kopyalari + trend ozeti.
 * Drive yazimi basarisiz olursa cache kopyasi yine de duruyor; tetikleyici
 * bir sonraki turda tekrar dener ve hata Ayarlar panelinde gorunur.
 */
function saveSnapshot_(key, snap) {
  var details = snap.details;
  delete snap.details;

  var overviewJson = JSON.stringify(snap);
  var detailsJson = JSON.stringify(details);

  var cache = CacheService.getScriptCache();
  try { cachePut_(cache, 'snapo_' + key, snap, SNAP_CACHE_TTL); } catch (e) {}
  try { cachePut_(cache, 'snapd_' + key, details, SNAP_CACHE_TTL); } catch (e) {}

  /* Trend ozeti ScriptProperties'te — Drive'dan bagimsiz. Drive yazimi
     basarisiz olsa bile trend guncellenmeli, yoksa yillar arasi grafik
     bos kalirdi. */
  try { writeTrendFor_(key, snap); } catch (e) {}

  var stored = true, storeError = null;
  try {
    driveWrite_(key, 'o', overviewJson);
    driveWrite_(key, 'd', detailsJson);
    cleanupLegacyProps_();          // eski ScriptProperties deposundan kalanlar
    PropertiesService.getScriptProperties().deleteProperty(PROP_LAST_STORE_ERR);
  } catch (e) {
    stored = false; storeError = e.message;
    /* Hatayi sakla: donus degerini kimse gormuyor (tetikleyiciden cagriliyor),
       boylece checkSetup son hatayi gosterebiliyor. */
    try {
      PropertiesService.getScriptProperties().setProperty(PROP_LAST_STORE_ERR,
        new Date().toISOString() + '  ' + String(storeError).slice(0, 400));
    } catch (e2) {}
  }

  snap.details = details;           // cagirana butun objeyi geri ver
  return { bytes: overviewJson.length + detailsJson.length,
           overviewBytes: overviewJson.length,
           durable: stored, storeError: storeError };
}

/** overview: once cache, sonra Drive. Ikisi de yoksa null. */
function loadOverview_(key) {
  var hit = null;
  try { hit = cacheGet_(CacheService.getScriptCache(), 'snapo_' + key); } catch (e) {}
  if (hit && hit.v === SNAP_VERSION) return hit;

  var raw = driveRead_(key, 'o');
  if (!raw) return null;
  var obj;
  try { obj = JSON.parse(raw); } catch (e) { return null; }
  if (!obj || obj.v !== SNAP_VERSION) return null;
  /* Drive'dan geldi -> cache'i tazele ki sonraki okuma daha da hizli olsun. */
  try { cachePut_(CacheService.getScriptCache(), 'snapo_' + key, obj, SNAP_CACHE_TTL); } catch (e) {}
  return obj;
}

function loadDetails_(key) {
  var hit = null;
  try { hit = cacheGet_(CacheService.getScriptCache(), 'snapd_' + key); } catch (e) {}
  if (hit) return hit;

  var raw = driveRead_(key, 'd');
  if (!raw) return null;
  var obj;
  try { obj = JSON.parse(raw); } catch (e) { return null; }
  try { cachePut_(CacheService.getScriptCache(), 'snapd_' + key, obj, SNAP_CACHE_TTL); } catch (e) {}
  return obj;
}

/**
 * Snapshot'lar ScriptProperties'te tutulurken kalan anahtarlari siler.
 * Kalici depo Drive'a tasindi; bu anahtarlar 500KB'lik kotayi bosuna
 * doldurup indeks/trend yazimini engelleyebilir.
 */
function cleanupLegacyProps_() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var n = 0;
  for (var k in all) {
    if (all.hasOwnProperty(k) && k.indexOf(PROP_SNAP_PREFIX) === 0) {
      props.deleteProperty(k); n++;
    }
  }
  return n;
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
 * Tetikleyici ucu: YALNIZ en guncel donemi tazeler.
 *
 * Gecmis aylar donmus — o dosyalar bir daha degismiyor, dolayisiyla saatte bir
 * yeniden okumak bosa kota harcar. Bu politika sayesinde 5 yil sonra 60 donem
 * birikse de saatlik maliyet bugunkuyle AYNI kalir (~1 dk).
 *
 * Gecmis donemler kayda girdiginde bir kez kurulur (Ayarlar ekrani ya da
 * ensureSnapshots); sonra yalniz yonetici acikca isterse yeniden kurulur.
 */
function refreshAllSnapshots() {
  var periods = listPeriods_();
  if (!periods.length) return { refreshed: [], failed: [] };
  var key = periodKey_(periods[0].year, periods[0].month);
  try {
    var res = refreshPeriodSnapshot_(key);
    if (res.error) return { refreshed: [], failed: [key + ': ' + res.error] };
    return { refreshed: [key], failed: [] };
  } catch (e) {
    return { refreshed: [], failed: [key + ': ' + e.message] };
  }
}

/**
 * Snapshot'i olmayan TUM donemleri kurar (en yeniden eskiye).
 *
 * Gecmis bir aya ilk kez bakilacagi zaman kullaniciyi 40-60 sn bekletmemek
 * icin. Tek calistirmada Apps Script'in 6 dk sinirina takilmamak adina en
 * fazla `limit` donem isler; kalanlar bir sonraki cagrida kurulur ve sonuc
 * kac donemin bekledigini soyler.
 */
function ensureSnapshots(limit) {
  var max = limit || 3;
  var periods = listPeriods_();
  var idx = snapIndex_();
  var built = [], pending = 0;
  for (var i = 0; i < periods.length; i++) {
    var key = periodKey_(periods[i].year, periods[i].month);
    var entry = idx[key];
    if (entry && entry.o) continue;              // zaten var
    if (built.length >= max) { pending++; continue; }
    try {
      var res = refreshPeriodSnapshot_(key);
      if (!res.error) { built.push(key); idx = snapIndex_(); }
    } catch (e) { /* bu donem atlanir, sonraki cagrida tekrar denenir */ }
  }
  return { built: built, pending: pending };
}

function uiEnsureSnapshots() {
  var deny = requireAdmin_(); if (deny) return deny;
  var r = ensureSnapshots(3);
  return { ok: true, built: r.built, pending: r.pending,
           message: r.built.length + ' period(s) built' +
                    (r.pending ? ', ' + r.pending + ' still pending — run again.' : '.') };
}

/**
 * Yillar arasi trend: TUM donemlerin RO bazinda minik ozeti.
 *
 * Snapshot dosyalarina hic gidilmez — ozet ScriptProperties'te durdugu icin
 * tek okumayla doner. 60 ay ~60KB.
 */
function getTrend() {
  try {
    var all = readTrend_();
    var out = [];
    for (var k in all) {
      if (!all.hasOwnProperty(k)) continue;
      out.push({ key: k, year: all[k].year, month: all[k].month,
                 label: all[k].label, builtAt: all[k].builtAt, ro: all[k].ro });
    }
    out.sort(function (a, b) { return (a.year - b.year) || (a.month - b.month); });
    return { periods: out };
  } catch (e) {
    return { error: 'Could not read trend: ' + e.message };
  }
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

/**
 * TESHIS: kurulumun gercekten calisip calismadigini yazar.
 *
 * Neden gerekli: bu dosyadaki fonksiyonlar hata firlatmiyor, hatayi bir sonuc
 * nesnesi olarak donduruyor. Bu yuzden editorde "Yurutme tamamlandi" yazmasi
 * isin BASARILI oldugu anlamina gelmiyor — sonuc gorunmedigi icin fark
 * edilmiyor. checkSetup her adimi Yurutme gunlugune yazar.
 *
 * Apps Script editorunde calistirin, sonra "Yurutme gunlugu"nu okuyun.
 */
function checkSetup() {
  function log(s) { console.log(s); }
  log('=== RO Dashboard — kurulum kontrolu ===');

  // 1) Kimlik
  var active = '', effective = '';
  try { active = Session.getActiveUser().getEmail() || '(bos)'; } catch (e) { active = 'HATA: ' + e.message; }
  try { effective = Session.getEffectiveUser().getEmail() || '(bos)'; } catch (e) { effective = 'HATA: ' + e.message; }
  log('1) Calistiran hesap : ' + active);
  log('   Etkin hesap      : ' + effective);
  log('   Yonetici mi      : ' + (isAuthorizedAdmin_() ? 'EVET' : 'HAYIR'));

  // 2) Kayitli donemler
  var periods = listPeriods_();
  log('2) Kayitli donem sayisi: ' + periods.length);
  if (!periods.length) {
    log('   !! Hic donem kayitli degil. Ayarlar ekranindan Gmail taramasi calistirin');
    log('      ya da spreadsheet linkini elle ekleyin. Snapshot kurulamaz.');
    return;
  }
  for (var i = 0; i < periods.length; i++) {
    log('   - ' + periodKey_(periods[i].year, periods[i].month) + '  ' + periods[i].name);
  }

  // 2b) Token'a GERCEKTEN verilen yetkiler
  /* "Yetki sormadi" ile "yetki var" ayni sey degil. Apps Script izin ekranini
     yalniz tanidigi servisler (DriveApp gibi) icin cikariyor; biz Drive'a
     dogrudan REST ile gittigimiz icin ekran cikmayabiliyor. Tek kesin kanit
     token'in tasidigi scope listesi. */
  try {
    var tRes = UrlFetchApp.fetch(
      'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' +
      encodeURIComponent(ScriptApp.getOAuthToken()), { muteHttpExceptions: true });
    var info = JSON.parse(tRes.getContentText());
    var scopes = String(info.scope || '').split(' ');
    var hasDriveFile = false, hasDriveFull = false;
    for (var sc = 0; sc < scopes.length; sc++) {
      if (scopes[sc].indexOf('/auth/drive.file') !== -1) hasDriveFile = true;
      if (scopes[sc].replace(/\/$/, '').slice(-11) === '/auth/drive') hasDriveFull = true;
    }
    log('2b) Verilen Drive yetkisi:');
    log('    drive.file (dar, istenen) : ' + (hasDriveFile ? 'VAR' : 'YOK'));
    log('    drive (tam)               : ' + (hasDriveFull ? 'VAR' : 'yok'));
    if (!hasDriveFile && !hasDriveFull) {
      log('    !! Token Drive yetkisi tasimıyor. Cozum: myaccount.google.com/permissions');
      log('       adresinden bu uygulamanin erisimini KALDIRIN, sonra bu fonksiyonu');
      log('       tekrar calistirin — izin ekrani o zaman cikar.');
    }
    log('    (tum yetkiler: ' + scopes.join(' | ') + ')');
  } catch (e) {
    log('2b) Yetki listesi okunamadi: ' + e.message);
  }

  // 2c) Drive ileri servisi kurulu mu (API'yi Cloud projesinde acan sey bu)
  log('2c) Drive ileri servisi : ' +
      ((typeof Drive !== 'undefined' && Drive) ? 'KURULU' : 'YOK — appsscript.json push edilmemis olabilir'));

  // 3) Drive yetkisi + klasor  (asil "yetki calisti mi" testi burasi)
  var folderOk = false;
  try {
    var fid = snapFolderId_();
    var meta = driveGetMeta_(fid);
    folderOk = true;
    log('3) Drive klasoru : OK — "' + meta.name + '"');
    log('   Klasor linki  : ' + (meta.webViewLink || ('https://drive.google.com/drive/folders/' + fid)));
  } catch (e) {
    var msg = String(e.message || e);
    log('3) Drive klasoru : HATA — ' + msg);
    /* Uc farkli neden, uc farkli cozum — ayirt edilmezse yanlis yere bakiliyor. */
    if (msg.indexOf('has not been used in project') !== -1 || msg.indexOf('is disabled') !== -1) {
      log('   !! Drive API Cloud projesinde acik degil (yetki sorunu DEGIL).');
      log('      Cozum: appsscript.json Drive ileri servisini iceriyor; kodu tekrar');
      log('      push edip bu fonksiyonu yeniden calistirin. Duzelmezse hata');
      log('      metnindeki console.developers.google.com linkinden Drive API"sini acin');
      log('      ve 1-2 dakika bekleyin.');
    } else if (msg.indexOf('insufficient authentication scopes') !== -1 ||
               msg.indexOf('Insufficient Permission') !== -1) {
      log('   !! Token drive.file yetkisi tasimiyor (bkz. 2b).');
      log('      Cozum: myaccount.google.com/permissions -> erisimi kaldir -> tekrar calistir.');
    } else {
      log('   !! Beklenmeyen Drive hatasi. Yukaridaki metni paylasin.');
    }
  }

  // 4) Snapshot dosyalari
  var idx = snapIndex_();
  var haveOverview = 0, haveDetails = 0;
  for (var k in idx) {
    if (!idx.hasOwnProperty(k)) continue;
    if (idx[k].o) haveOverview++;
    if (idx[k].d) haveDetails++;
  }
  log('4) Snapshot dosyasi olan donem: ' + haveOverview + ' / ' + periods.length +
      '  (detay: ' + haveDetails + ')');
  var lastErr = PropertiesService.getScriptProperties().getProperty(PROP_LAST_STORE_ERR);
  if (lastErr) log('   Son kalici yazma HATASI: ' + lastErr);
  if (!haveOverview && folderOk && !lastErr) {
    log('   !! Hic snapshot yok. refreshAllSnapshots calistirin (guncel ay icin)');
    log('      veya ensureSnapshots (tum donemler icin).');
  }

  // 5) En guncel donem gercekten okunabiliyor mu
  var newest = periodKey_(periods[0].year, periods[0].month);
  var ov = null;
  try { ov = loadOverview_(newest); } catch (e) { log('5) HATA: ' + e.message); }
  if (ov) {
    log('5) Guncel donem (' + newest + ') : OK');
    log('   Kurulma zamani : ' + ov.builtAt);
    log('   Site sayisi    : ' + (ov.sites || []).length);
    log('   Sayfasi olmayan: ' + (ov.missingSites || []).length);
  } else {
    log('5) Guncel donem (' + newest + ') : SNAPSHOT YOK');
    log('   Dashboard su an eski yavas yoldan yukleniyor demektir.');
  }

  // 6) Tetikleyiciler
  var trig = ScriptApp.getProjectTriggers();
  var names = [];
  for (var t = 0; t < trig.length; t++) names.push(trig[t].getHandlerFunction());
  log('6) Kurulu tetikleyiciler: ' + (names.length ? names.join(', ') : '(yok)'));
  if (names.indexOf('refreshAllSnapshots') === -1) {
    log('   !! Saatlik tazeleme kurulu degil. installSnapshotTrigger calistirin.');
  }

  // 7) Trend ozeti
  var trend = readTrend_();
  var tKeys = [];
  for (var tk in trend) { if (trend.hasOwnProperty(tk)) tKeys.push(tk); }
  log('7) Trend ozeti olan donem: ' + tKeys.length + (tKeys.length ? ' (' + tKeys.join(', ') + ')' : ''));

  log('=== bitti ===');
}

/**
 * TESHIS: Drive yazma/okuma yolunu KUCUK bir dosyayla izole eder.
 *
 * refreshAllSnapshots ~120KB'lik bir dosya yaziyor; basarisiz oldugunda
 * sorunun yetki mi, boyut mu, multipart bicimi mi oldugu anlasilmiyordu.
 * Bu fonksiyon adim adim dener ve her adimin sonucunu yazar.
 */
function testDriveWrite() {
  function log(s) { console.log(s); }
  log('=== Drive yazma testi ===');

  var fid;
  try {
    fid = snapFolderId_();
    log('1) Klasor : OK  (' + fid + ')');
  } catch (e) {
    log('1) Klasor : HATA — ' + e.message);
    return;
  }

  var smallId = null;
  try {
    smallId = driveCreateFile_('ro-dash-test.json',
      JSON.stringify({ hello: 'world', at: new Date().toISOString() }), fid);
    log('2) Kucuk dosya yazma : OK  (' + smallId + ')');
  } catch (e) {
    log('2) Kucuk dosya yazma : HATA — ' + e.message);
    return;   // buyuk testin anlami kalmaz
  }

  try {
    var back = driveReadFile_(smallId);
    log('3) Geri okuma : OK  -> ' + back.slice(0, 100));
  } catch (e) {
    log('3) Geri okuma : HATA — ' + e.message);
  }

  try {
    driveUpdateFile_(smallId, JSON.stringify({ hello: 'updated' }));
    log('4) Guncelleme : OK');
  } catch (e) {
    log('4) Guncelleme : HATA — ' + e.message);
  }

  /* Asil senaryoya yakin boyut: snapshot overview ~120KB. */
  try {
    var big = JSON.stringify({ pad: new Array(60000).join('x') });
    var bigId = driveCreateFile_('ro-dash-test-big.json', big, fid);
    log('5) Buyuk dosya (' + big.length + ' bayt) : OK  (' + bigId + ')');
  } catch (e) {
    log('5) Buyuk dosya : HATA — ' + e.message);
  }

  log('=== bitti ===  (test dosyalari klasorde kaldi, silebilirsiniz)');
}
