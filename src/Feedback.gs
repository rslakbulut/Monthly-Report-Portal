/**
 * Kullanici kimligi + geri bildirim toplama.
 *
 * Geri bildirimler AYRI bir spreadsheet'e aksiyon satiri olarak dusuyor.
 * DIKKAT: bu, panonun YAZDIGI tek yer. Aylik rapor dosyalari hala salt-okunur
 * (bkz. Code.gs basligi); burasi bilincli bir istisna ve baska hicbir dosyaya
 * dokunmuyor.
 *
 * Sutunlar BASLIK ADIYLA eslesiyor, sabit harf/indeksle degil — projenin geri
 * kalaninda oldugu gibi (bkz. SheetReader.gs). Boylece hedef sayfada sutun
 * eklenip cikarilirsa kod kirilmiyor.
 */

var FEEDBACK_SHEET_ID = '1dT55ZmEYScXA-BLpWDimuBtTzGZi13Qn0mAdbc2iWyM';
var FEEDBACK_FOLDER_NAME = 'RO Dashboard Feedback';
var FEEDBACK_TYPES = ['Bug', 'Improvement'];
var FEEDBACK_PRIORITIES = ['Low', 'Medium', 'Urgent'];
var FEEDBACK_MAX_MESSAGE = 4000;        // karakter
var FEEDBACK_MAX_IMAGE = 6 * 1024 * 1024;   // 6 MB (base64 cozulmus hali)

/**
 * Giris yapmis kullanici.
 *
 * Ad-soyad icin Apps Script'te dogrudan bir API yok (People/Admin SDK ayri
 * yetki ister). Valeo e-postalari ad.soyad@valeo.com duzeninde oldugu icin
 * gorunen ad e-postadan turetiliyor; e-posta yine de yaninda gosteriliyor ki
 * turetme yanlissa kullanici fark etsin.
 */
function currentUser_() {
  var email = '';
  try { email = Session.getActiveUser().getEmail() || ''; } catch (e) { email = ''; }
  return { email: email, name: displayNameFromEmail_(email) };
}

function displayNameFromEmail_(email) {
  var local = String(email || '').split('@')[0];
  if (!local) return '';
  var parts = local.split(/[._-]+/);
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if (!p) continue;
    /* Sondaki ".ext" gibi ekler ad degil — gosterimden cikarilir. */
    if (/^(ext|external|contractor)$/i.test(p)) continue;
    out.push(p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
  }
  return out.join(' ');
}

/* Geri bildirimler bu dosyadaki BU SEKMEYE yaziliyor (kullanici talimati).
   Baska sekmelere dokunulmuyor. */
var FEEDBACK_TAB_NAME = 'RO Monthly Report';
var FEEDBACK_HEADERS = ['Email', 'Feedback_Type', 'Priority', 'Message', 'CreatedAt',
                        'Screenshot', 'Comments', 'Status', 'Standardization Y/N'];

/**
 * Hedef sekmeyi bulur. Adi normalize edilerek aranir (bosluk/buyuk-kucuk harf
 * farki onemsiz). Sekme yoksa standart basliklarla OLUSTURULUR — ilk geri
 * bildirim sessizce kaybolmasin diye.
 */
function feedbackSheet_() {
  var ss = SpreadsheetApp.openById(FEEDBACK_SHEET_ID);
  var want = normText_(FEEDBACK_TAB_NAME).replace(/[^A-Z0-9]/g, '');
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (normText_(sheets[i].getName()).replace(/[^A-Z0-9]/g, '') === want) {
      return { sheet: sheets[i], head: normHeaderRow_(sheets[i]) };
    }
  }
  var created = ss.insertSheet(FEEDBACK_TAB_NAME);
  created.getRange(1, 1, 1, FEEDBACK_HEADERS.length).setValues([FEEDBACK_HEADERS]);
  created.setFrozenRows(1);
  return { sheet: created, head: normHeaderRow_(created), createdTab: true };
}

/** Baslik satirini okuyup "NORMALIZEBASLIK -> sutun indeksi" haritasi kurar. */
function normHeaderRow_(sheet) {
  var lastCol = Math.max(1, sheet.getLastColumn());
  var row = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  for (var c = 0; c < row.length; c++) {
    var key = normText_(row[c]).replace(/[^A-Z0-9]/g, '');
    if (key && map[key] === undefined) map[key] = c;
  }
  return { row: row, map: map, lastCol: lastCol };
}

/** Haritada verilen adlardan ILK bulunani dondurur. */
function pickCol_(map, names) {
  for (var i = 0; i < names.length; i++) {
    if (map[names[i]] !== undefined) return map[names[i]];
  }
  return -1;
}

/** Ekran goruntusunu Drive'a yazar, paylasilabilir baglantisini dondurur. */
function saveFeedbackImage_(dataUrl, name) {
  var m = /^data:([^;]+);base64,(.+)$/.exec(String(dataUrl || ''));
  if (!m) return null;
  var mime = m[1];
  if (mime.indexOf('image/') !== 0) throw new Error('Only image files are accepted.');
  var bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > FEEDBACK_MAX_IMAGE) {
    throw new Error('Screenshot is too large (max ' +
                    Math.round(FEEDBACK_MAX_IMAGE / 1024 / 1024) + ' MB).');
  }
  var ext = (mime.split('/')[1] || 'png').split('+')[0];
  var safe = String(name || 'screenshot').replace(/[^\w.\- ]+/g, '_').slice(0, 60);
  if (!/\.\w+$/.test(safe)) safe += '.' + ext;

  var folderId = feedbackFolderId_();
  /* Snapshot.gs'teki driveCreateFile_ METIN govde bekliyor; goruntu ikili
     oldugu icin multipart govde bayt dizisi olarak kuruluyor. */
  var boundary = '----roFb' + Date.now();
  var meta = { name: safe, mimeType: mime, parents: [folderId] };
  var head = Utilities.newBlob(
    '--' + boundary + '\r\n' +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(meta) + '\r\n' +
    '--' + boundary + '\r\n' +
    'Content-Type: ' + mime + '\r\n\r\n').getBytes();
  var tail = Utilities.newBlob('\r\n--' + boundary + '--').getBytes();

  var res = driveApi_('https://www.googleapis.com/upload/drive/v3/files' +
                      '?uploadType=multipart&fields=id,webViewLink', {
    method: 'post',
    contentType: 'multipart/related; boundary=' + boundary,
    payload: Utilities.newBlob(head.concat(bytes).concat(tail))
  });
  var file = JSON.parse(res.getContentText());
  return file.webViewLink || ('https://drive.google.com/file/d/' + file.id + '/view');
}

function feedbackFolderId_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('RO_DASH_FB_FOLDER');
  if (id) {
    try {
      var meta = driveGetMeta_(id);
      if (meta && !meta.trashed) return id;
    } catch (e) { if (driveApiCode_(e) !== 404) throw e; }
  }
  var created = driveCreateFolder_(FEEDBACK_FOLDER_NAME);
  props.setProperty('RO_DASH_FB_FOLDER', created.id);
  return created.id;
}

/**
 * Geri bildirimi kaydeder.
 * @param {{type:string, priority:string, message:string,
 *          image:string=, imageName:string=}} payload
 */
function submitFeedback(payload) {
  var p = payload || {};
  var type = String(p.type || '').trim();
  var priority = String(p.priority || '').trim();
  var message = String(p.message || '').trim();

  if (FEEDBACK_TYPES.indexOf(type) === -1) return { error: 'Please choose a type.' };
  if (FEEDBACK_PRIORITIES.indexOf(priority) === -1) return { error: 'Please choose a priority.' };
  if (!message) return { error: 'Please write a message.' };
  if (message.length > FEEDBACK_MAX_MESSAGE) {
    return { error: 'Message is too long (max ' + FEEDBACK_MAX_MESSAGE + ' characters).' };
  }

  var user = currentUser_();
  var link = null;
  if (p.image) {
    try { link = saveFeedbackImage_(p.image, p.imageName); }
    catch (e) { return { error: 'Screenshot could not be saved: ' + e.message }; }
  }

  /* Ayni anda iki kisi gonderirse ayni satira yazilmasin. */
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); }
  catch (e) { return { error: 'The sheet is busy, please try again.' }; }

  try {
    var target = feedbackSheet_();
    var sheet = target.sheet, map = target.head.map;

    var cEmail = pickCol_(map, ['EMAIL', 'USER', 'KULLANICI']);
    var cType  = pickCol_(map, ['FEEDBACKTYPE', 'TYPE', 'TUR']);
    var cPrio  = pickCol_(map, ['PRIORITY', 'ONCELIK']);
    var cMsg   = pickCol_(map, ['MESSAGE', 'MESAJ', 'FEEDBACK']);
    var cDate  = pickCol_(map, ['CREATEDAT', 'DATE', 'TARIH']);
    var cShot  = pickCol_(map, ['SCREENSHOT', 'IMAGE', 'EKRANGORUNTUSU', 'GORSEL']);

    if (cMsg === -1) {
      return { error: 'The feedback sheet has no "Message" column — nothing was written.' };
    }

    var width = Math.max(target.head.lastCol, cShot + 1, cDate + 1, cMsg + 1);
    var row = new Array(width);
    for (var i = 0; i < width; i++) row[i] = '';

    if (cEmail >= 0) row[cEmail] = user.email;
    if (cType >= 0)  row[cType] = type;
    if (cPrio >= 0)  row[cPrio] = priority;
    if (cDate >= 0)  row[cDate] = new Date();
    /* Ekran goruntusu icin sutun yoksa baglanti mesajin sonuna eklenir —
       sessizce kaybolmasin. */
    if (link && cShot >= 0) row[cShot] = link;
    row[cMsg] = message + ((link && cShot < 0) ? '\n\nScreenshot: ' + link : '');

    sheet.appendRow(row);
    return {
      ok: true,
      row: sheet.getLastRow(),
      link: link,
      warning: target.createdTab
        ? 'The "' + FEEDBACK_TAB_NAME + '" tab did not exist and was created.'
        : null
    };
  } catch (e) {
    return { error: 'Could not save: ' + e.message };
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

/** TESHIS: geri bildirim sayfasina erisim ve sutun eslesmesi. */
function checkFeedbackSheet() {
  function log(s) { console.log(s); }
  log('=== Geri bildirim sayfasi kontrolu ===');
  var user = currentUser_();
  log('Kullanici : ' + user.name + '  <' + user.email + '>');
  try {
    var t = feedbackSheet_();
    log('Dosya     : ' + t.sheet.getParent().getName());
    log('Sekme     : ' + t.sheet.getName() + (t.createdTab ? '  (yeni olusturuldu)' : ''));
    log('Basliklar : ' + t.head.row.join(' | '));
    var m = t.head.map;
    log('Eslesme   : Email=' + pickCol_(m, ['EMAIL', 'USER', 'KULLANICI']) +
        '  Type=' + pickCol_(m, ['FEEDBACKTYPE', 'TYPE', 'TUR']) +
        '  Priority=' + pickCol_(m, ['PRIORITY', 'ONCELIK']) +
        '  Message=' + pickCol_(m, ['MESSAGE', 'MESAJ', 'FEEDBACK']) +
        '  CreatedAt=' + pickCol_(m, ['CREATEDAT', 'DATE', 'TARIH']) +
        '  Screenshot=' + pickCol_(m, ['SCREENSHOT', 'IMAGE', 'EKRANGORUNTUSU', 'GORSEL']));
    log('(-1 = o sutun yok; Screenshot yoksa baglanti Message sonuna eklenir)');
  } catch (e) {
    log('HATA: ' + e.message);
    log('!! Deploy eden hesabin bu dosyaya DUZENLEME erisimi olmali.');
  }
  log('=== bitti ===');
}
