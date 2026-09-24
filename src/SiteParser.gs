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
  if (headerRow < 0) { warnings.push('Section 1: TARGET column not found'); return out; }

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
      target: gTarget ? cell_(grid, row, gTarget.start, warnings, 'S1 ' + pair[0] + ' target') : null,
      trail: trail
    };
  });
  return out;
}

/* ROL SOZLUGU — bir hucrenin KISI ADI mi ROL ETIKETI mi oldugunu ayirir.
   Tabloda roller sutun basligindadir, ama govdenin ortasinda da bir rol
   etiketi belirebiliyor (ornek: "DESIGNER" yazip altina iki isim). O yuzden
   her hucre bu sozlukle sinaniyor. Liste genis tutuldu: yeni bir rol
   eklendiginde kisi sanilip SAYILMASI, sayilmamasindan daha kotu. */
var HR_ROLE_WORDS = [
  'MANAGER', 'PTM', 'LEADER', 'ENGINEER', 'RESPONSIBLE', 'COORDINATOR',
  'DESIGNER', 'DESIGN', 'SUPERVISOR', 'DIRECTOR', 'SPECIALIST', 'TECHNICIAN',
  'BUYER', 'PLANNER', 'ANALYST', 'CHAMPION', 'OWNER', 'TEAM', 'ROLE',
  'PROJECT', 'QUALITY', 'PURCHASING', 'SUPPLY', 'PROCESS', 'LOGISTIC',
  'INDUSTRIAL', 'METHOD', 'CONTROLLER', 'PILOT', 'EXPERT'
];

/* Kisi olmayan doldurma degerleri. */
var HR_EMPTY_WORDS = ['N/A', 'NA', 'TBD', 'TBC', '-', '--', 'X', 'XX', 'NONE',
                      'VACANT', 'OPEN', 'YOK', '?'];

function hrIsRoleText_(t) {
  var n = normText_(t);
  if (!n) return false;
  for (var i = 0; i < HR_ROLE_WORDS.length; i++) {
    if (n.indexOf(HR_ROLE_WORDS[i]) !== -1) return true;
  }
  return false;
}

function hrIsPersonText_(t) {
  var n = normText_(t);
  if (!n || n.length < 2) return false;
  if (HR_EMPTY_WORDS.indexOf(n) !== -1) return false;
  if (/^[\d.,%\/\\:\s-]+$/.test(n)) return false;      // sayi, tarih, tire
  if (hrIsRoleText_(n)) return false;                  // rol etiketi
  return /[A-Z]/.test(n);
}

/**
 * Bolum 2 "HUMAN RESOURCES" — proje ekibi kadrosu.
 *
 * ONCEKI HALI YANLISTI: tabloyu "rol | kisi" SATIRLARI sanip her satirin ilk
 * iki dolu hucresine bakiyordu. Gercek tablo bir MATRIS:
 *
 *   TEAM | Project Manager | R&D PTM | Process PTM | Quality PTM | ...
 *     1  | J.GEOFREY       | ...     | ...         | ...         |
 *        | DESIGNER        |         |             |             |   <- govdede rol
 *        | PRASHANTH       |         |             |             |
 *     2  | M.KARTHIKEYAN   | ...     |             |             |
 *
 * Yani roller SUTUN basligi, isimler altlarindaki hucreler ve birden cok
 * TEAM satiri var. Eski kod 3. sutundan sonrasini hic gormuyordu.
 *
 * Yeni kural, hucre bazli ve sutun sayisindan bagimsiz:
 *   - Baslik satiri bulunur (TEAM + rol adlari).
 *   - Govdedeki HER hucre tek tek sinanir: rol etiketiyse o sutunun GECERLI
 *     ROLU olur (ornekteki "DESIGNER"), kisi adiysa o sutunun gecerli roluyle
 *     kaydedilir.
 *   - Headcount = BENZERSIZ kisi sayisi (kullanici karari): ayni isim iki
 *     rolde/iki takimda gecse de bir kez sayilir.
 */
function parseHumanResources_(grid, warnings) {
  var res = { count: 0, roles: [] };
  var hit = findCell_(grid, 'HUMAN RESOURCES', 0);
  if (!hit) { warnings.push('Section 2 (HUMAN RESOURCES) not found'); return res; }

  /* Baslik satiri: capanin altinda, en az iki rol basligi tasiyan ilk satir. */
  var headRow = -1, roleOf = {};
  for (var r = hit.row + 1; r < Math.min(hit.row + 8, grid.length); r++) {
    var cols = {}, n = 0;
    for (var c = 0; c < grid[r].length; c++) {
      var txt = cellText_(grid[r][c]);
      if (!txt || !hrIsRoleText_(txt)) continue;
      if (normText_(txt) === 'TEAM') continue;          // takim numarasi sutunu
      cols[c] = txt; n++;
    }
    if (n >= 2) { headRow = r; roleOf = cols; break; }
  }
  if (headRow < 0) {
    warnings.push('Section 2: role header row not found — headcount 0');
    return res;
  }

  var seen = {}, blanks = 0;
  for (var r2 = headRow + 1; r2 < grid.length && r2 < headRow + 60; r2++) {
    var rowText = normText_(grid[r2].join(' '));
    var stop = false;
    for (var p = 0; p < BLOCK_STOP_PATTERNS.length; p++) {
      if (rowText.indexOf(BLOCK_STOP_PATTERNS[p]) !== -1) { stop = true; break; }
    }
    if (stop) break;
    if (isEmptyRow_(grid[r2])) {
      /* Tablo icinde bos satir olabiliyor; ust uste UC bos satir tablonun
         bittigini soyler. Tek bos satirda durmak isimleri kaciriyordu. */
      if (++blanks >= 3) break;
      continue;
    }
    blanks = 0;

    for (var c2 in roleOf) {
      if (!roleOf.hasOwnProperty(c2)) continue;
      var col = parseInt(c2, 10);
      var v = cellText_(grid[r2][col]);
      if (!v) continue;
      if (hrIsRoleText_(v)) { roleOf[c2] = v; continue; }   // govdedeki rol etiketi
      if (!hrIsPersonText_(v)) continue;
      res.roles.push({ role: roleOf[c2], person: v });
      var key = normText_(v);
      if (!seen[key]) { seen[key] = true; res.count++; }
    }
  }
  return res;
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
    return { ro: reg.ro, site: reg.site, sheet: sheet.getName(), status: 'unreadable',
             warnings: ['Sheet could not be read: ' + e.message] };
  }

  var month = sheetMonth || reportPeriod_(grid, reportYear);
  var period = { year: reportYear, month: month, index: periodIndex_(reportYear, month) };

  var orderIntake = parseOrderIntakeBudget_(grid, warnings);
  var launch      = parseProjectLaunchBudget_(grid, warnings);
  var indicators  = parseIndicators_(grid, warnings);
  var hr          = parseHumanResources_(grid, warnings);

  // Detay bloklari — ONCEDEN TOPLANMAZ. Istemci NEW/REMAN x musteri x tip
  // filtrelerini caprazlayabilsin diye her blok ayri saklanir.
  var detail = { blocks: [], total: emptyMeasure_() };
  var topProjects = [];   // TOPS: en buyuk cirolu projeler (kullanici talebi)

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
    (block.projects || []).forEach(function (pr) {
      pr.customer = spec.customer || null;
      pr.status = spec.status;
      topProjects.push(pr);
    });
    addMeasure_(detail.total, block.total);
  });
  topProjects.sort(function (a, b) { return b.turnover - a.turnover; });
  if (topProjects.length > TOP_PROJECTS_PER_BLOCK) {
    topProjects = topProjects.slice(0, TOP_PROJECTS_PER_BLOCK);
  }

  // Capraz dogrulama. Yon DEGISTI: ekranda artik Bolum 4'un Real Launches
  // sutunu gosteriliyor (kullanici karari), detaydan sayilan adet ikincil.
  // Ikisi tutmuyorsa yine sessiz kalmiyoruz -- site "veri tutarsiz" oluyor.
  var mismatch = [];
  var ytdByType = { P1: 0, P10: 0, TTM: 0 };
  detail.blocks.forEach(function (b) {
    if (b.status !== 'NEW') return;
    for (var t in ytdByType) {
      if (b.byType[t]) ytdByType[t] += b.byType[t].ytdCount;
    }
  });
  PROJECT_TYPES.forEach(function (t) {
    var sheetVal = launch.realLaunches[t] ? launch.realLaunches[t].NEW : null;
    if (sheetVal === null || sheetVal === undefined) return;
    if (Math.round(sheetVal) !== Math.round(ytdByType[t])) {
      mismatch.push(t + ': sheet ' + sheetVal + ' / detail ' + ytdByType[t]);
    }
  });

  var hasAnyData = detail.total.count > 0 ||
                   (launch.budgetYear.TOTAL && launch.budgetYear.TOTAL.NEW) ||
                   (launch.realLaunches.TOTAL && launch.realLaunches.TOTAL.NEW);
  var status = 'ok';
  if (!hasAnyData) status = 'no-data';
  else if (mismatch.length) status = 'inconsistent';

  return {
    ro: reg.ro, site: reg.site, sheet: sheet.getName(),
    month: month, year: reportYear, status: status,
    budgetTurnover: orderIntake.budgetYear,   // M€  (Bolum 3 Budget Year)
    launchDoneTurnover: orderIntake.launchDone, // M€  (Bolum 3 Launch Done)
    budgetCount: launch.budgetYear,           // adet (Bolum 4 Budget Year)
    budgetYTDCount: launch.budgetYTD,         // adet (Bolum 4 Budget YTD)
    realCount: launch.realLaunches,           // adet (Bolum 4 Real Launches)
    detail: detail,                  // gerceklesen: adet + k€
    indicators: indicators,
    headcount: hr.count,             // Bolum 2'deki benzersiz kisi sayisi
    hrRoles: hr.roles,
    topProjects: topProjects,        // [{model, segment, type, customer, status, ...}]
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
