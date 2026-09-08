/**
 * Site sayfasini uctan uca okuyup dashboard veri modelini uretir.
 */

/** Bolum 1 — INDICATORS: EMI / DAP / RED LAUNCHES, hedef + son 6 ay. */
function parseIndicators_(grid, warnings) {
  var out = {};
  var anchor = findCell_(grid, 'INDICATORS', 0);
  if (!anchor) return out;

  var headerRow = -1;
  for (var r = anchor.row; r < Math.min(anchor.row + 5, grid.length); r++) {
    if (findIn_(grid[r], 'TARGET') >= 0) { headerRow = r; break; }   // "TARGET 2026" / "TARGET 2024"
  }
  if (headerRow < 0) { warnings.push('Bolum 1: TARGET sutunu bulunamadi'); return out; }

  var groups = mapHeaderGroups_(grid[headerRow], 0);
  var gTarget = pickGroup_(groups, 'TARGET');
  var trailCols = [];
  for (var i = 0; i < groups.length; i++) {
    var lab = groups[i].label.replace(/\s+/g, '');
    if (/^M-\d$/.test(lab) || lab === 'M') trailCols.push({ label: lab, col: groups[i].start });
  }
  trailCols.sort(function (a, b) { return a.col - b.col; });

  [['EMI', 'EMI'], ['DAP', 'DAP'], ['RED LAUNCHES', 'RED']].forEach(function (pair) {
    var row = findRowByLabel_(grid, headerRow + 1, headerRow + 8, [pair[0]], 8);
    if (row < 0) return;
    var trail = trailCols.map(function (tc) {
      var n = readNumber_(grid[row][tc.col]);
      return { label: tc.label, value: n.ok ? n.value : null };
    });
    out[pair[1]] = {
      target: gTarget ? cell_(grid, row, gTarget.start, warnings, 'B1 ' + pair[0] + ' target') : null,
      trail: trail
    };
  });
  return out;
}

/**
 * Tek bir site sayfasini okur.
 * @param {Sheet} sheet
 * @param {{year:number, month:number, index:number}} reportPeriod
 */
function parseSiteSheet_(sheet, reg, sheetMonth, reportYear) {
  var warnings = [];
  var grid;
  try {
    grid = sheet.getDataRange().getValues();
  } catch (e) {
    return { ro: reg.ro, site: reg.site, sheet: sheet.getName(), status: 'okunamadi',
             warnings: ['Sayfa okunamadi: ' + e.message] };
  }

  var month = sheetMonth || reportPeriod_(grid, reportYear);
  var period = { year: reportYear, month: month, index: periodIndex_(reportYear, month) };

  var orderIntake = parseOrderIntakeBudget_(grid, warnings);
  var launch      = parseProjectLaunchBudget_(grid, warnings);
  var indicators  = parseIndicators_(grid, warnings);

  // Detay bloklari — ONCEDEN TOPLANMAZ. Istemci NEW/REMAN x musteri x tip
  // filtrelerini caprazlayabilsin diye her blok ayri saklanir.
  var detail = { blocks: [], total: emptyMeasure_() };

  DETAIL_BLOCKS.forEach(function (spec) {
    var hit = findCell_(grid, spec.match, 0);
    if (!hit) return;
    var block = parseDetailBlock_(grid, hit.row, spec, reportYear, period, warnings);
    if (block.rows === 0) return;

    var byType = { P1: emptyMeasure_(), P10: emptyMeasure_(), TTM: emptyMeasure_() };
    if (spec.forcedType) {
      addMeasure_(byType[spec.forcedType], block.total);
    } else {
      for (var t in block.byType) {
        if (!byType[t]) byType[t] = emptyMeasure_();
        addMeasure_(byType[t], block.byType[t]);
      }
    }
    detail.blocks.push({
      key: spec.match,
      customer: spec.customer || null,   // TTM blogunda musteri bilgisi yok
      status: spec.status,
      byType: byType,
      total: block.total,
      typeColFound: block.typeColFound
    });
    addMeasure_(detail.total, block.total);
  });

  // Capraz dogrulama: detaydan sayilan YTD adet, Bolum 4'un Real Launches'i ile
  // tutuyor mu? Tutmuyorsa sessizce birini secmiyoruz, isaretliyoruz.
  var mismatch = [];
  var ytdByType = { P1: 0, P10: 0, TTM: 0 };
  detail.blocks.forEach(function (b) {
    if (b.status !== 'NEW') return;
    for (var t in ytdByType) {
      if (b.byType[t]) ytdByType[t] += b.byType[t].ytdCount;
    }
  });
  PROJECT_TYPES.forEach(function (t) {
    var sheetVal = launch.crossCheck[t] ? launch.crossCheck[t].NEW : null;
    if (sheetVal === null || sheetVal === undefined) return;
    if (Math.round(sheetVal) !== Math.round(ytdByType[t])) {
      mismatch.push(t + ': sayfa ' + sheetVal + ' / detay ' + ytdByType[t]);
    }
  });

  var hasAnyData = detail.total.count > 0 ||
                   (launch.budgetYear.TOTAL && launch.budgetYear.TOTAL.NEW);
  var status = 'ok';
  if (!hasAnyData) status = 'veri-yok';
  else if (mismatch.length) status = 'veri-tutarsiz';

  return {
    ro: reg.ro, site: reg.site, sheet: sheet.getName(),
    month: month, year: reportYear, status: status,
    budgetTurnover: orderIntake,     // M€  (Bolum 3, yalniz Budget Year)
    budgetCount: launch.budgetYear,  // adet (Bolum 4)
    budgetYTDCount: launch.budgetYTD,
    detail: detail,                  // gerceklesen: adet + k€
    indicators: indicators,
    mismatch: mismatch,
    warnings: warnings
  };
}

/** Sayfa adinda ay yoksa blok basliklarindan yil/ay tahmini (son care). */
function reportPeriod_(grid, reportYear) {
  var hit = findCell_(grid, 'CURRENT PORTFOLIO', 0);
  if (hit) {
    var p = parsePeriodFromTitle_(String(grid[hit.row][hit.col]));
    if (p.month) return p.month;
  }
  return 12;   // ay bilinmiyorsa yil sonu kabul et: hicbir projeyi YTD disi birakmaz
}
