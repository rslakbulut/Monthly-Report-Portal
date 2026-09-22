/**
 * PARSER DENETIMI — "bu sayi nereden geliyor?"
 *
 * Panodaki bir sayinin yanlis oldugunu soylemek kolay, NEREDE yanlis
 * oldugunu soylemek zor. Bu dosya tek bir site sayfasini panonun kullandigi
 * AYNI parser ile okur ve alti ozet degeri, her birinin okundugu HUCRE
 * ADRESI ve ham icerigiyle birlikte dondurur; gerceklesen degerler icin de
 * toplami olusturan proje satirlarinin tamamini listeler.
 *
 * Ayri bir "denetim parser'i" YAZILMADI: oyle bir sey panoyu degil kendini
 * dogrular. Iz, gercek parser'in icindeki cell_ ve detay satir dongusunden
 * toplaniyor (Parser.gs: AUDIT_TRACE / AUDIT_ROWS).
 *
 * Sayfalar yalniz OKUNUR.
 */

var AUDIT_MAX_ROWS = 400;

/** Filtresiz TOTAL degeri: NEW + REMAN (panodaki pickStatus_ ile ayni). */
function auditPair_(obj) {
  if (!obj) return null;
  var a = (typeof obj.NEW === 'number') ? obj.NEW : 0;
  var b = (typeof obj.REMAN === 'number') ? obj.REMAN : 0;
  if (obj.NEW == null && obj.REMAN == null) return null;
  return a + b;
}

/** Iz kayitlarindan baglam adiyla eslesenleri toplar. */
function auditCells_(trace, prefix) {
  var out = [];
  for (var i = 0; i < trace.length; i++) {
    if (String(trace[i].ctx || '').indexOf(prefix) === 0) out.push(trace[i]);
  }
  return out;
}

/**
 * Tek bir site sayfasini denetler.
 * @param {string} periodKey  "2026-06"
 * @param {string} siteKey    SITE_REGISTRY anahtari ("BURSA", "FUEN"...)
 */
function auditSite(periodKey, siteKey) {
  var deny = requireAdmin_(); if (deny) return deny;

  var periods = readPeriods_();
  var period = periods[periodKey];
  if (!period) return { error: 'Period is not registered: ' + periodKey };

  var ss;
  try { ss = SpreadsheetApp.openById(period.id); }
  catch (e) { return { error: 'Period file could not be opened: ' + period.name }; }

  var byKey = registryByKey_();
  var reg = byKey[siteKey];
  if (!reg) return { error: 'Unknown site key: ' + siteKey };

  /* Ayni site'in birden cok ayi olabilir; pano en guncel ayi gosterir,
     denetim de ayni sayfaya bakmali. */
  var sheets = ss.getSheets(), found = null;
  for (var i = 0; i < sheets.length; i++) {
    var parsed = parseSheetName_(sheets[i].getName());
    if (parsed.key !== siteKey) continue;
    if (!found || (parsed.month || 0) > (found.month || 0)) {
      found = { sheet: sheets[i], month: parsed.month };
    }
  }
  if (!found) {
    return { error: 'No sheet for ' + reg.site + ' in ' + period.name };
  }

  var site, trace = [], rows = [];
  AUDIT_TRACE = trace;
  AUDIT_ROWS = rows;
  try {
    /* Yil kayitta duruyor (dosya adindan cozulup saklanmisti); burada tekrar
       cozmek ikinci bir dogruluk kaynagi yaratirdi. */
    site = parseSiteSheet_(found.sheet, reg, found.month, period.year);
  } finally {
    /* Iz TOPLAYICILARI her durumda kapatilir: acik kalirsa normal snapshot
       kurulumu da iz biriktirir ve bellegi sisirir. */
    AUDIT_TRACE = null;
    AUDIT_ROWS = null;
  }

  /* --- ozet degerler: panonun filtresiz (TOTAL, NEW+REMAN) gordugu sayilar --- */
  var oi     = site.budgetTurnover || {};
  var bYear  = (site.budgetCount || {});
  var bYtd   = (site.budgetYTDCount || {});
  var blocks = (site.detail && site.detail.blocks) || [];

  var realCount = 0, realTurnover = 0, planTurnover = 0, planCount = 0,
      portCount = 0, portTurnover = 0;
  var blockTotals = blocks.map(function (b) {
    var t = b.total || {};
    realCount    += t.ytdCount || 0;
    realTurnover += t.ytdTurnover || 0;
    planCount    += t.planYtdCount || 0;
    planTurnover += t.planYtdTurnover || 0;
    portCount    += t.count || 0;
    portTurnover += t.turnover || 0;
    return { block: b.customer ? (b.customer + ' ' + b.status) : (b.status || 'TTM'),
             rows: b.rows || 0, count: t.count || 0, turnover: t.turnover || 0,
             ytdCount: t.ytdCount || 0, ytdTurnover: t.ytdTurnover || 0,
             planYtdCount: t.planYtdCount || 0, planYtdTurnover: t.planYtdTurnover || 0 };
  });

  var summary = [
    { key: 'budgetYearOI', label: 'Budget Year — O.I', unit: 'M€',
      value: auditPair_(oi.TOTAL),
      source: 'Section 3 ORDER INTAKE · row TOTAL · column Budget Year (NEW + REMAN)',
      cells: auditCells_(trace, 'S3 TOTAL') },
    { key: 'budgetYearQty', label: 'Budget Year — projects', unit: 'projects',
      value: auditPair_(bYear.TOTAL),
      source: 'Section 4 PROJECT LAUNCH · row TOTAL · column Budget Year (NEW + REMAN)',
      cells: auditCells_(trace, 'S4 TOTAL budget') },
    { key: 'budgetYtdQty', label: 'Budget YTD — projects', unit: 'projects',
      value: auditPair_(bYtd.TOTAL),
      source: 'Section 4 PROJECT LAUNCH · row TOTAL · column Budget YTD (NEW + REMAN)',
      cells: auditCells_(trace, 'S4 TOTAL ytd') },
    { key: 'budgetYtdOI', label: 'Budget YTD — O.I', unit: 'M€',
      value: planTurnover / 1000,
      source: 'Detail blocks · projects whose PLAN date <= reporting month · Turnover (k€) / 1000',
      cells: [] },
    { key: 'realQty', label: 'Real (launched YTD) — projects', unit: 'projects',
      value: realCount,
      source: 'Detail blocks · projects whose REAL date <= reporting month',
      cells: [] },
    { key: 'realOI', label: 'Real (launched YTD) — O.I', unit: 'M€',
      value: realTurnover / 1000,
      source: 'Detail blocks · same projects · Turnover (k€) / 1000',
      cells: [] }
  ];

  /* --- capraz dogrulama: sayfanin KENDI "Real Launches" sutunu ---
     Deger parser'in donus nesnesinde tasinmiyor (yalniz mismatch uretiminde
     kullaniliyor), bu yuzden dogrudan IZDEN okunuyor: okunan hucrelerin
     kendisi zaten elimizde. */
  var realCells = auditCells_(trace, 'S4 TOTAL real');
  var sheetReal = null;
  for (var rc = 0; rc < realCells.length; rc++) {
    if (typeof realCells[rc].value === 'number') {
      sheetReal = (sheetReal || 0) + realCells[rc].value;
    }
  }
  var cross = { sheetReal: sheetReal, parsedReal: realCount, cells: realCells };

  var cut = rows.length > AUDIT_MAX_ROWS;
  return {
    ok: true,
    site: { ro: site.ro, site: site.site, key: siteKey, sheet: site.sheet,
            month: site.month, year: site.year, status: site.status,
            period: period.name },
    summary: summary,
    portfolio: { count: portCount, turnoverM: portTurnover / 1000,
                 planCount: planCount },
    blocks: blockTotals,
    rows: cut ? rows.slice(0, AUDIT_MAX_ROWS) : rows,
    rowsTotal: rows.length,
    rowsCut: cut,
    warnings: site.warnings || [],
    mismatch: site.mismatch || []
  };
}

/** Denetim ekranindaki site seciciyi doldurur: bu donemde SAYFASI OLAN site'lar. */
function auditSiteList(periodKey) {
  var deny = requireAdmin_(); if (deny) return deny;
  var periods = readPeriods_();
  var period = periods[periodKey];
  if (!period) return { error: 'Period is not registered: ' + periodKey };
  var ss;
  try { ss = SpreadsheetApp.openById(period.id); }
  catch (e) { return { error: 'Period file could not be opened: ' + period.name }; }

  var byKey = registryByKey_(), seen = {}, out = [];
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var parsed = parseSheetName_(sheets[i].getName());
    var reg = byKey[parsed.key];
    if (!reg || seen[parsed.key]) continue;
    seen[parsed.key] = true;
    out.push({ key: parsed.key, ro: reg.ro, site: reg.site, sheet: sheets[i].getName() });
  }
  out.sort(function (a, b) {
    return a.ro === b.ro ? (a.site < b.site ? -1 : 1) : (a.ro < b.ro ? -1 : 1);
  });
  return { ok: true, period: period.name, sites: out };
}
