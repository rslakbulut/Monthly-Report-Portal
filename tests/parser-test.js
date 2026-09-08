// Apps Script global'leri olmadan saf ayristirma mantigini test eder.
const fs=require('fs');
const src=['SiteRegistry','DateUtil','SheetReader','Parser','SiteParser']
  .map(f=>fs.readFileSync(__dirname+'/../src/'+f+'.gs','utf8')).join('\n');
eval(src);

let pass=0, fail=0;
function eq(actual, expected, label){
  const ok = JSON.stringify(actual)===JSON.stringify(expected);
  if(ok){pass++; console.log('  ok   '+label);}
  else {fail++; console.log('  FAIL '+label+'\n       beklenen: '+JSON.stringify(expected)+'\n       gelen   : '+JSON.stringify(actual));}
}
function row(n){ return new Array(n).fill(''); }
function set(r, pairs){ for(const k in pairs) r[k]=pairs[k]; return r; }

/* ---------- 1) Tarih cozumleme ---------- */
console.log('\n1) DateUtil — ISO hafta Persembe kurali, ay adi, AY/YIL');
eq(parsePeriodCell_('W23',2026).month, 6,  'W23 -> Haziran');
eq(parsePeriodCell_('W35',2026).month, 8,  'W35 -> Agustos');
eq(parsePeriodCell_('W14',2026).month, 4,  'W14 -> Nisan (ay sinirinda Persembe kurali)');
eq(parsePeriodCell_('W4',2026).month,  1,  'W4  -> Ocak');
eq(parsePeriodCell_('W27',2026).month, 7,  'W27 -> Temmuz');
eq(parsePeriodCell_('April',2026).month, 4, '"April" -> Nisan');
eq(parsePeriodCell_('JUL',2026).month, 7,  '"JUL" -> Temmuz');
eq(parsePeriodCell_('01/2026',2026), {ok:true,year:2026,month:1,raw:'01/2026'}, '01/2026 -> 2026-01');
eq(parsePeriodCell_('W41/23',2026).ok, false, 'W41/23 -> belirsiz (sessizce sayilmaz)');
eq(parsePeriodCell_('2026',2026).ok, false, '"2026" -> yalniz yil, ay yok');
eq(parsePeriodCell_('',2026).ok, false, 'bos hucre');
eq(parsePeriodFromTitle_('POWER New&Reman Project Monthly Report - June 2026'),
   {year:2026,month:6}, 'dosya adindan donem');

/* ---------- 2) FUEN benzeri sayfa ---------- */
console.log('\n2) FUEN_06 altin ornegi — ozet bloklar');
const W=20, g=[];
const push=(o)=>g.push(set(row(W),o));
push({}); 
push({1:'Valeo',4:'PSD Aftermarket Projects Monthly Report',14:'SITE',15:'FUEN'});
push({4:'June 2026',14:'DATE',15:'06/29/2026'});
push({});
push({1:'1.  INDICATORS'});
push({1:'CRITERIA',4:'TARGET 2026',7:'M-1',8:'M-2',9:'M-3',10:'M-4',11:'M-5',12:'M',13:'COMMENTS'});
push({1:'EMI',4:102,7:129.69,8:122.15,9:123.59,10:108.49,11:119.56});
push({1:'DAP',4:'-%',7:0,8:0,9:0,10:0,11:0,12:0});
push({1:'RED LAUNCHES',4:0,7:0,8:0,9:0,10:0,11:0,12:0});
push({});
push({1:'2.  HUMAN RESOURCES.'});
push({1:'TEAM',3:'Project Manager'});
push({});
push({});
push({});
push({});
push({1:'3. ORDER INTAKE - Budget & Real'});
push({1:'ORDER INTAKE',5:'Budget Year 2026',7:'Launch Done (L.S sent)',9:'Current Portfolio (C.A signed)',11:'Potential O.I (C.A not signed)',13:'COMMENTS'});
push({5:'NEW',6:'REMAN',7:'NEW',8:'REMAN',9:'NEW',10:'REMAN',11:'NEW',12:'REMAN'});
push({3:'TOTAL',5:1.8,6:0.0,7:1.14,8:0.0,9:1.7,10:0.0,11:1.6,12:0.0});
push({3:'VS',   5:1.8,6:0.0,7:1.14,8:0.0,9:1.7,10:0.0,11:1.6,12:0.0});
push({3:'OES',  5:0.0,6:0.0,7:0.0, 8:0.0,9:0.0,10:0.0,11:0.0,12:0.0});
push({});
push({1:'4. PROJECT LAUNCH - Budget & Real'});
push({1:'PROJECT LAUNCH',5:'Budget Year 2026',7:'Budget YTD [CUMUL Number]',9:'Real Launches [ CUMUL Number]',11:'Launch Delay Number',13:'COMMENTS'});
push({5:'NEW',6:'REMAN',7:'NEW',8:'REMAN',9:'NEW',10:'REMAN',11:'NEW',12:'REMAN'});
push({3:'TOTAL',   5:36,6:0,7:19,8:0,9:31,10:0,11:12,12:0});
push({3:'P1',      5:19,6:0,7:10,8:0,9:16,10:0,11:6, 12:0});
push({3:'PCO /P10',5:17,6:0,7:9, 8:0,9:15,10:0,11:6, 12:0});
push({3:'TTM',     5:2, 6:0,7:2, 8:0,9:2, 10:0,11:0, 12:0});
push({3:'VS',      5:36,6:0,7:19,8:0,9:31,10:0,11:12,12:0});
push({3:'OES',     5:0, 6:0,7:0, 8:0,9:0, 10:0,11:0, 12:0});
push({3:'BY SEGMENT',5:'OES',6:'Eur'});
push({4:'PC Trad Kit',6:7});
push({});

const warn=[];
const oi = parseOrderIntakeBudget_(g, warn);
eq(oi.TOTAL.NEW, 1.8, 'B3 Budget Year TOTAL NEW = 1.8 M€');
eq(oi.VS.NEW,    1.8, 'B3 Budget Year VS NEW = 1.8 M€');
eq(oi.OES.NEW,   0.0, 'B3 Budget Year OES NEW = 0.0');
eq(oi.TOTAL.REMAN, 0.0, 'B3 REMAN sutunu ayri okundu');

const pl = parseProjectLaunchBudget_(g, warn);
eq(pl.budgetYear.TOTAL.NEW, 36, 'B4 Budget Year TOTAL = 36');
eq(pl.budgetYTD.TOTAL.NEW,  19, 'B4 Budget YTD TOTAL = 19');
eq(pl.budgetYear.P1.NEW,    19, 'B4 Budget Year P1 = 19');
eq(pl.budgetYear.P10.NEW,   17, 'B4 "PCO /P10" satiri P10 olarak okundu = 17');
eq(pl.budgetYTD.P10.NEW,     9, 'B4 Budget YTD P10 = 9');
eq(pl.crossCheck.TOTAL.NEW, 31, 'B4 Real Launches (yalniz capraz dogrulama) = 31');

const ind = parseIndicators_(g, warn);
eq(ind.EMI.target, 102, 'B1 EMI hedefi = 102');
eq(ind.EMI.trail.map(t=>t.value), [129.69,122.15,123.59,108.49,119.56,null], 'B1 EMI M-1..M trendi');
eq(ind.RED.target, 0, 'B1 RED LAUNCHES hedefi = 0');

/* ---------- 3) TTM detay blogu: YTD filtresi ---------- */
console.log('\n3) TTM blogu — "Real ayi <= raporlama ayi" kurali');
push({1:'5. TTM Launch - 2026'});
push({0:'Milestone',1:'Project Ref. in WishList',2:'Ref',3:'Model',4:'Type',5:'Segment',6:'Difficulty',7:'PRODUCT',
      8:'Launch Sheet Date Plan / Real',10:'SOP IS Approval date',11:'Sales Price in €',12:'Quantity of',13:'Turnover (k€)',14:'GM (%)'});
push({2:832857,3:'Stellantis K0 2.2 2PK',4:'TTM',5:'K2P',6:'A0',7:'K2P',8:'W23',9:'W23',11:71.12,12:323,13:22.97});
push({2:836403,3:'Stellantis K0 2.2 Single DMF',4:'TTM',5:'Single DMF',6:'A0',7:'Single DMF',8:'W23',9:'W23',11:123.40,12:880,13:108.59});
push({2:827655,3:'Ford Traxon AMT Euro 6',4:'TTM',5:'K2P',6:'A0',7:'K2P',8:'W35',9:'W35'});
push({13:'total',14:0});

const period={year:2026,month:6,index:periodIndex_(2026,6)};
const ttmHit = findCell_(g,'TTM LAUNCH',0);
const ttm = parseDetailBlock_(g, ttmHit.row, DETAIL_BLOCKS[0], 2026, period, warn);
eq(ttm.rows, 3, 'TTM blogunda 3 proje satiri okundu');
eq(ttm.total.count, 3, 'portfoy adedi = 3');
eq(ttm.total.ytdCount, 2, 'YTD adet = 2 (W35=Agustos sayilmadi) — B4 TTM Real=2 ile TUTUYOR');
eq(Math.round(ttm.total.ytdTurnover*100)/100, 131.56, 'YTD ciro = 22.97 + 108.59 k€');

/* ---------- 4) VS Current Portfolio NEW: tip kirilimi + Plan hucresi ---------- */
console.log('\n4) VS Current Portfolio - NEW — tip kirilimi, Plan/Real ayrimi');
push({});
push({1:'* 2026 VS Current Portfolio - NEW'});
push({0:'Milestone',1:'Project Ref. in WishList',2:'Ref',3:'Model',4:'Type',5:'Segment',6:'Difficulty Rate',7:'PRODUCT',
      8:'Launch Sheet Date Plan / Real',10:'SOP IS Approval date',11:'Sales Price in €',12:'Quantity of pieces per year',13:'Turnover (k€)'});
push({1:'Fuen 1',4:'P1', 8:'01/2026',9:'01/2026',11:230.62,12:68, 13:15.68});
push({1:'Fuen 1',4:'P10',8:'02/2026',9:'03/2026',11:112.21,12:525,13:58.91});
push({1:'Fuen 1',4:'PCO',8:'05/2026',9:'W27',   11:61.21, 12:290,13:17.75});  // W27 = Temmuz > Haziran
push({1:'Fuen 1',4:'P1', 8:'08/2026',9:'',      11:99.00, 12:100,13:9.90});   // henuz launch olmadi
push({13:'total',14:0});

const vsHit = findCell_(g,'VS CURRENT PORTFOLIO - NEW',0);
const vs = parseDetailBlock_(g, vsHit.row, DETAIL_BLOCKS[1], 2026, period, warn);
eq(vs.typeColFound, true, 'Type sutunu deger-tabanli dogrulandi');
eq(vs.rows, 4, '4 proje satiri');
eq(vs.byType.P1.count, 2, 'P1 portfoy = 2');
eq(vs.byType.P10.count, 2, 'P10 portfoy = 2 (PCO -> P10 birlestirildi)');
eq(vs.byType.P1.ytdCount, 1, 'P1 YTD = 1 (Ocak launch; Agustos ve bos olan sayilmadi)');
eq(vs.byType.P10.ytdCount, 1, 'P10 YTD = 1 (Mart sayildi, Temmuz sayilmadi)');
eq(Math.round(vs.total.ytdTurnover*100)/100, 74.59, 'YTD ciro = 15.68 + 58.91 k€');
eq(vs.total.planYtdCount, 3, 'Plan tarafi ayri sayildi (01,02,05 <= Haziran)');
eq(Math.round(vs.total.planYtdTurnover*100)/100, 92.34, 'Ciro YTD PLANI = 15.68+58.91+17.75 k€');

/* ---------- 5) REMAN blogu: Type sutunu yanlis doldurulmus ---------- */
console.log('\n5) VS Current Portfolio - REMAN — Type sutununda A0/A1/A2 var');
push({});
push({1:'* 2026 VS Current Portfolio - REMAN'});
push({0:'Milestone',1:'Project Ref. in WishList',2:'Ref',3:'Model',4:'Type',5:'Segment',6:'Difficulty Rate',7:'PRODUCT',
      8:'Launch Sheet Date Plan / Real',10:'SOP IS Approval date',11:'Sales Price in €',12:'Quantity of pieces per year',13:'Turnover (k€)'});
push({0:'P0',1:'P0%202500413',2:'H656760R',4:'A1',5:'VS', 8:'01/2026',9:'01/2026',11:30.00,12:355,13:10.70});
push({0:'P0',1:'PCO202500774',2:'Z208131R',4:'A0',5:'DIAM',8:'01/2026',9:'01/2026',11:60.10,12:127,13:7.60});
push({0:'P0',1:'202500723',   2:'H726585R',4:'A0',5:'VS', 8:'02/2026',9:'02/2026',11:115.60,12:94,13:10.90});
push({13:'total',14:0});

const rmHit = findCell_(g,'VS CURRENT PORTFOLIO - REMAN',0);
const rm = parseDetailBlock_(g, rmHit.row, DETAIL_BLOCKS[2], 2026, period, warn);
eq(rm.rows, 3, 'REMAN 3 satir okundu');
eq(rm.typeColFound, false, 'tip sutunu bulunamadi (A0/A1/A2 gecerli tip degil)');
eq(Object.keys(rm.byType).length, 0, 'tip kirilimi 0 — uydurma yapilmadi');
eq(rm.total.count, 3, 'REMAN portfoy adedi yine de sayildi = 3');
eq(rm.total.ytdCount, 3, 'REMAN YTD adedi = 3 (01,01,02 <= Haziran)');
eq(Math.round(rm.total.ytdTurnover*100)/100, 29.2, 'REMAN YTD ciro = 10.70+7.60+10.90 k€');

/* ---------- 6) Sayfa adi cozumleme ---------- */
console.log('\n6) Sayfa adi -> site anahtari');
eq(parseSheetName_('FUEN_06'),        {key:'FUEN',month:6,raw:'FUEN_06'},           'FUEN_06');
eq(parseSheetName_('SHASHI 01_06'),   {key:'SHASHI01',month:6,raw:'SHASHI 01_06'},  'SHASHI 01_06');
eq(parseSheetName_('VALLAM_India_06'),{key:'VALLAMINDIA',month:6,raw:'VALLAM_India_06'},'VALLAM_India_06');
eq(parseSheetName_('SLP3_T92_05').month, 5, 'SLP3_T92_05 -> ay 5 (geride kalmis site)');
eq(parseSheetName_('THS_CZE_06').key, 'THSCZE', 'THS_CZE_06 -> PTE Czechowice');
const byKey=registryByKey_();
eq(!!byKey['THSCZE'] && byKey['THSCZE'].ro, 'PTE', 'THSCZE kayitta PTE altinda');
eq(!!byKey['CZECHOWICE'] && byKey['CZECHOWICE'].ro, 'PDE', 'CZECHOWICE kayitta PDE altinda');
eq(!!byKey['JINGZHOU'], false, 'JINGZHOU kapsam disi');
eq(!!byKey['SVESSHANGHAI'], false, 'SVES (Shanghai) kapsam disi');
eq(SITE_REGISTRY.length, 48, 'kayit defterinde 48 site');

/* ---------- 7) Hatali hucreler ---------- */
console.log('\n7) Dayaniklilik');
eq(readNumber_('#REF!').ok, false, '#REF! sayi olarak okunmaz');
eq(readNumber_('#DIV/0!').ok, false, '#DIV/0! sayi olarak okunmaz');
eq(readNumber_('').reason, 'bos', 'bos hucre != 0');
eq(readNumber_(0).value, 0, 'gercek 0 okunur');
eq(readNumber_('€ 1.234,56').value, 1234.56, 'TR bicimli para');
eq(readNumber_('1,234.56').value, 1234.56, 'EN bicimli para');

console.log('\n'+(fail?'FAIL':'PASS')+' — '+pass+' gecti, '+fail+' kaldi');
process.exit(fail?1:0);
