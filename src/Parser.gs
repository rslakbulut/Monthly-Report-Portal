/**
 * Site sayfasi ayristirici.
 *
 * KAYNAK DAGILIMI (kullanici talimati):
 *   - Bolum 3 ORDER INTAKE -> yalniz "Budget Year 2026" CIROSU (M€)
 *   - Bolum 4 PROJECT LAUNCH -> yalniz "Budget Year 2026" ve "Budget YTD" ADEDI
 *   - Diger her sey (gerceklesen adet/ciro) VS / OES / REMAN detay tablolarindan
 *
 * Ozet bloklardaki Launch Done / Real Launches / Delay sutunlari OKUNMAZ;
 * yalniz capraz dogrulama icin ayrica okunur (crossCheck).
 */

var PROJECT_TYPES = ['P1', 'P10', 'TTM'];

/** Detay bloklari: baslik deseni -> musteri / urun durumu. */
var DETAIL_BLOCKS = [
  { match: 'TTM LAUNCH',                    customer: null, status: 'NEW',   forcedType: 'TTM' },
  { match: 'VS CURRENT PORTFOLIO - NEW',    customer: 'VS',  status: 'NEW' },
  { match: 'VS CURRENT PORTFOLIO - REMAN',  customer: 'VS',  status: 'REMAN' },
  { match: 'OES CURRENT PORTFOLIO - NEW',   customer: 'OES', status: 'NEW' },
  { match: 'OES CURRENT PORTFOLIO - REMAN', customer: 'OES', status: 'REMAN' }
];

/** Bir blogun bittigini haber veren satir desenleri (kapsam disi bloklar dahil). */
var BLOCK_STOP_PATTERNS = [
  'CURRENT PORTFOLIO', 'FEASIBILITY UNDER STUDY', 'LAUNCH FORECAST',
  'TTM LAUNCH', 'ORDER INTAKE', 'PROJECT LAUNCH', 'INDICATORS', 'HUMAN RESOURCES',
  'CURRENT YEAR PROJECTS'
];

function emptyMeasure_() {
  return { count: 0, turnover: 0, ytdCount: 0, ytdTurnover: 0, planYtdCount: 0, planYtdTurnover: 0 };
}

function addMeasure_(target, src) {
  target.count += src.count; target.turnover += src.turnover;
  target.ytdCount += src.ytdCount; target.ytdTurnover += src.ytdTurnover;
  target.planYtdCount += src.planYtdCount; target.planYtdTurnover += src.planYtdTurnover;
}

/* ------------------------------------------------------------------ */
/* Bolum 3 — ORDER INTAKE: yalniz Budget Year cirosu (M€)              */
/* ------------------------------------------------------------------ */

function parseOrderIntakeBudget_(grid, warnings) {
  var out = { TOTAL: {}, VS: {}, OES: {} };
  var anchor = findCell_(grid, 'ORDER INTAKE', 0);
  if (!anchor) { warnings.push('Bolum 3 (ORDER INTAKE) bulunamadi'); return out; }

  // Baslik satiri capanin hemen altinda; grup adlari orada.
  var headerRow = -1;
  for (var r = anchor.row; r < Math.min(anchor.row + 6, grid.length); r++) {
    if (findIn_(grid[r], 'BUDGET YEAR') >= 0) { headerRow = r; break; }
  }
  if (headerRow < 0) { warnings.push('Bolum 3 basligi (Budget Year) bulunamadi'); return out; }

  var groups = mapHeaderGroups_(grid[headerRow], 0);
  var g = pickGroup_(groups, 'BUDGET YEAR');
  if (!g) { warnings.push('Bolum 3: Budget Year sutun grubu yok'); return out; }

  var cols = findNewRemanCols_(grid, headerRow + 1, g);
  if (cols.NEW === null && cols.REMAN === null) {
    warnings.push('Bolum 3: NEW/REMAN alt sutunlari bulunamadi');
    return out;
  }

  ['TOTAL', 'VS', 'OES'].forEach(function (label) {
    var row = findRowByLabel_(grid, headerRow + 1, headerRow + 12, [label], 8);
    if (row < 0) { warnings.push('Bolum 3: "' + label + '" satiri yok'); return; }
    out[label] = {
      NEW:   cols.NEW   === null ? null : cell_(grid, row, cols.NEW, warnings, 'B3 ' + label + ' NEW'),
      REMAN: cols.REMAN === null ? null : cell_(grid, row, cols.REMAN, warnings, 'B3 ' + label + ' REMAN')
    };
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Bolum 4 — PROJECT LAUNCH: Budget Year + Budget YTD adedi            */
/* ------------------------------------------------------------------ */

function parseProjectLaunchBudget_(grid, warnings) {
  var out = { budgetYear: {}, budgetYTD: {}, crossCheck: {} };
  var anchor = findCell_(grid, 'PROJECT LAUNCH', 0);
  if (!anchor) { warnings.push('Bolum 4 (PROJECT LAUNCH) bulunamadi'); return out; }

  var headerRow = -1;
  for (var r = anchor.row; r < Math.min(anchor.row + 6, grid.length); r++) {
    if (findIn_(grid[r], 'BUDGET YTD') >= 0) { headerRow = r; break; }
  }
  if (headerRow < 0) { warnings.push('Bolum 4 basligi (Budget YTD) bulunamadi'); return out; }

  var groups = mapHeaderGroups_(grid[headerRow], 0);
  var gBudget = pickGroup_(groups, 'BUDGET YEAR');
  var gYTD    = pickGroup_(groups, 'BUDGET YTD');
  var gReal   = pickGroup_(groups, 'REAL LAUNCHES');   // yalniz capraz dogrulama
  var cBudget = findNewRemanCols_(grid, headerRow + 1, gBudget);
  var cYTD    = findNewRemanCols_(grid, headerRow + 1, gYTD);
  var cReal   = findNewRemanCols_(grid, headerRow + 1, gReal);

  var labels = [
    { key: 'TOTAL', names: ['TOTAL'] },
    { key: 'P1',    names: ['P1'] },
    { key: 'P10',   names: ['PCO /P10', 'PCO/P10', 'PCO / P10', 'P10', 'PCO'] },
    { key: 'TTM',   names: ['TTM'] },
    { key: 'VS',    names: ['VS'] },
    { key: 'OES',   names: ['OES'] }
  ];

  labels.forEach(function (L) {
    var row = findRowByLabel_(grid, headerRow + 1, headerRow + 14, L.names, 8);
    if (row < 0) { warnings.push('Bolum 4: "' + L.key + '" satiri yok'); return; }
    out.budgetYear[L.key] = pair_(grid, row, cBudget, warnings, 'B4 ' + L.key + ' budget');
    out.budgetYTD[L.key]  = pair_(grid, row, cYTD,    warnings, 'B4 ' + L.key + ' ytd');
    out.crossCheck[L.key] = pair_(grid, row, cReal,   warnings, 'B4 ' + L.key + ' real');
  });
  return out;
}

function pair_(grid, row, cols, warnings, ctx) {
  return {
    NEW:   cols.NEW   === null ? null : cell_(grid, row, cols.NEW, warnings, ctx + ' NEW'),
    REMAN: cols.REMAN === null ? null : cell_(grid, row, cols.REMAN, warnings, ctx + ' REMAN')
  };
}

/** Hucreyi sayi olarak okur; bos/hatali ise null doner ve uyari yazar. */
function cell_(grid, row, col, warnings, ctx) {
  if (row < 0 || row >= grid.length || col < 0 || col >= grid[row].length) return null;
  var n = readNumber_(grid[row][col]);
  if (n.ok) return n.value;
  if (n.reason !== 'bos') warnings.push(ctx + ': ' + n.reason);
  return null;
}

function findIn_(row, needle) {
  var t = normText_(needle);
  for (var c = 0; c < row.length; c++) {
    if (normText_(row[c]).indexOf(t) !== -1) return c;
  }
  return -1;
}

/* ------------------------------------------------------------------ */
/* Bolum 5/6 — detay proje bloklari                                     */
/* ------------------------------------------------------------------ */

/**
 * Bir detay blogunu okur ve proje tipine gore olcum uretir.
 * @return {{byType:Object, total:Object, rows:number, typeColFound:boolean}}
 */
function parseDetailBlock_(grid, startRow, spec, year, reportMonth, warnings) {
  var res = { byType: {}, total: emptyMeasure_(), rows: 0, typeColFound: false };

  // Tablo basligi: capanin altinda "Milestone" veya "Project Ref" iceren satir
  var headerRow = -1;
  for (var r = startRow; r < Math.min(startRow + 8, grid.length); r++) {
    if (findIn_(grid[r], 'MILESTONE') >= 0 || findIn_(grid[r], 'PROJECT REF') >= 0) {
      headerRow = r; break;
    }
  }
  if (headerRow < 0) { warnings.push(spec.match + ': tablo basligi bulunamadi'); return res; }

  var groups = mapHeaderGroups_(grid[headerRow], 0);
  var gType = pickGroup_(groups, 'TYPE');
  var gDate = pickGroup_(groups, 'LAUNCH SHEET');
  var gTurn = pickGroup_(groups, 'TURNOVER');
  if (!gDate) warnings.push(spec.match + ': Launch Sheet Date sutunu yok');
  if (!gTurn) warnings.push(spec.match + ': Turnover sutunu yok');

  // Tarih alani 1 veya 2 hucre: iki ise sol=Plan, sag=Real; tek ise o=Real.
  var planCol = null, realCol = null;
  if (gDate) {
    if (gDate.end > gDate.start) { planCol = gDate.start; realCol = gDate.start + 1; }
    else { realCol = gDate.start; }
  }
  var turnCol = gTurn ? gTurn.start : null;

  // Veri satirlarinin sinirini bul
  var endRow = grid.length - 1;
  for (var rr = headerRow + 1; rr < grid.length; rr++) {
    var rowText = normText_(grid[rr].join(' '));
    if (rowText.indexOf('TOTAL') !== -1 && rowText.replace(/[^A-Z]/g, '').length < 30) { endRow = rr - 1; break; }
    var hitStop = false;
    for (var p = 0; p < BLOCK_STOP_PATTERNS.length; p++) {
      if (rowText.indexOf(BLOCK_STOP_PATTERNS[p]) !== -1) { hitStop = true; break; }
    }
    if (hitStop) { endRow = rr - 1; break; }
  }

  // Tip sutunu: once TYPE basligi, tutmuyorsa degerleri P1/P10/PCO olan sutunu ara
  var typeCol = gType ? gType.start : null;
  if (!columnHasTypes_(grid, headerRow + 1, endRow, typeCol)) {
    typeCol = findTypeColumn_(grid, headerRow + 1, endRow);
  }
  res.typeColFound = (typeCol !== null);
  if (!res.typeColFound && !spec.forcedType) {
    warnings.push(spec.match + ': proje tipi (P1/P10/PCO) sutunu bulunamadi, tip kirilimi 0 sayildi');
  }

  for (var r2 = headerRow + 1; r2 <= endRow && r2 < grid.length; r2++) {
    var row = grid[r2];
    if (isEmptyRow_(row)) continue;

    var turnover = 0;
    if (turnCol !== null) {
      var tn = readNumber_(row[turnCol]);
      if (tn.ok) turnover = tn.value;                    // k€
    }
    var real = realCol !== null ? parsePeriodCell_(row[realCol], year) : { ok: false };
    var plan = planCol !== null ? parsePeriodCell_(row[planCol], year) : { ok: false };

    // Ne tarih ne ciro varsa bu satir veri degil (bos sablon satiri)
    if (!real.ok && !plan.ok && turnover === 0) continue;
    res.rows++;

    var type = spec.forcedType;
    if (!type && typeCol !== null) type = normalizeType_(row[typeCol]);
    if (!type) type = null;

    var m = emptyMeasure_();
    m.count = 1;
    m.turnover = turnover;
    if (real.ok && periodIndex_(real.year, real.month) <= reportMonth.index) {
      m.ytdCount = 1; m.ytdTurnover = turnover;
    }
    if (plan.ok && periodIndex_(plan.year, plan.month) <= reportMonth.index) {
      m.planYtdCount = 1; m.planYtdTurnover = turnover;
    }
    if (realCol !== null && !real.ok && real.reason && real.reason.indexOf('cozulemedi') === 0) {
      warnings.push(spec.match + ': tarih cozulemedi -> "' + real.raw + '"');
    }

    addMeasure_(res.total, m);
    if (type) {
      if (!res.byType[type]) res.byType[type] = emptyMeasure_();
      addMeasure_(res.byType[type], m);
    }
  }
  return res;
}

/** "PCO" -> "P10"; P1/P10 aynen; digerleri null. */
function normalizeType_(v) {
  var t = normText_(v).replace(/[^A-Z0-9]/g, '');
  if (t === 'P1') return 'P1';
  if (t === 'P10' || t === 'PCO' || t === 'PCOP10') return 'P10';
  if (t === 'TTM') return 'TTM';
  return null;
}

function columnHasTypes_(grid, fromRow, toRow, col) {
  if (col === null || col === undefined) return false;
  var hits = 0;
  for (var r = fromRow; r <= toRow && r < grid.length; r++) {
    if (col < grid[r].length && normalizeType_(grid[r][col])) hits++;
    if (hits >= 2) return true;
  }
  return false;
}

/** Degerleri P1/P10/PCO olan sutunu arar (baslik yanlissa devreye girer). */
function findTypeColumn_(grid, fromRow, toRow) {
  var width = 0;
  for (var r = fromRow; r <= toRow && r < grid.length; r++) width = Math.max(width, grid[r].length);
  for (var c = 0; c < width; c++) {
    if (columnHasTypes_(grid, fromRow, toRow, c)) return c;
  }
  return null;
}
