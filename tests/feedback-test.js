/**
 * Geri bildirim boru hattini CANLIDAKI sayfa duzenine karsi test eder.
 * Apps Script global'leri taklit edilir; hicbir gercek dosyaya dokunulmaz.
 *
 * Duzen (ekran goruntusunden):
 *   A FeedbackID | B Email | C Feedback_Type | D Priority | E Message
 *   F CreatedAt  | G Comments | H Status | I Standardization Y/N
 */
const fs = require('fs');
const path = require('path');
const SRC = ['SiteRegistry','DateUtil','SheetReader','Parser','SiteParser',
             'PeriodRegistry','Feedback']
  .map(f => fs.readFileSync(path.join(__dirname,'..','src',f + '.gs'),'utf8')).join('\n');

let pass = 0, fail = 0;
function eq(actual, expected, label){
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok){ pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label +
    '\n       beklenen: ' + JSON.stringify(expected) +
    '\n       gelen   : ' + JSON.stringify(actual)); }
}

const HEAD = ['FeedbackID','Email','Feedback_Type','Priority','Message',
              'CreatedAt','Comments','Status','Standardization Y/N'];

function makeEnv(opts){
  opts = opts || {};
  const rows = [HEAD.slice()];
  const mails = [];
  const images = [];
  const notes = [];
  let colW = 120, rowH = 21;
  const sheet = {
    getName: () => 'RO Monthly Report',
    getParent: () => ({ getName: () => 'RO Dashboard Feedback' }),
    getLastColumn: () => rows[0].length,
    getLastRow: () => rows.length,
    getRange: (r,c,nr,nc) => ({
      getValues: () => [rows[r-1].slice(c-1, c-1+(nc||1))],
      setValues: (v) => { v[0].forEach((x,i) => { rows[r-1][c-1+i] = x; }); },
      setNote: (t) => { notes.push({ r, c, t }); } }),
    setFrozenRows: () => {},
    appendRow: (r) => { if (opts.writeFails) throw new Error('No permission'); rows.push(r); },
    /* Hucre icine gomulen ekran goruntusu icin gereken en az yuzey. */
    insertImage: (blob, col, row) => {
      const img = { blob, col, row, w: null, h: null,
        getInherentWidth: () => 800, getInherentHeight: () => 450,
        setWidth(x){ this.w = x; return this; },
        setHeight(x){ this.h = x; return this; } };
      images.push(img);
      return img;
    },
    getColumnWidth: () => colW,
    setColumnWidth: (c,w) => { colW = w; },
    getRowHeight: () => rowH,
    setRowHeight: (r,h) => { rowH = h; }
  };
  global.SpreadsheetApp = { openById: () => ({ getSheets: () => [sheet],
    insertSheet: () => { throw new Error('sekme VAR, olusturulmamali'); } }) };
  global.LockService = { getScriptLock: () => ({ waitLock(){}, releaseLock(){} }) };
  global.Session = { getActiveUser: () => ({ getEmail: () => 'ahmet.dundar@valeo.com' }),
                     getEffectiveUser: () => ({ getEmail: () => 'owner@valeo.com' }),
                     getScriptTimeZone: () => 'Europe/Istanbul' };
  const props = {};
  global.PropertiesService = { getScriptProperties: () => ({
    getProperty: (k) => (k in props ? props[k] : null),
    setProperty: (k,v) => { props[k] = v; } }) };
  global.CacheService = { getScriptCache: () => ({ get(){return null;}, put(){}, remove(){} }) };
  global.UrlFetchApp = { fetch: () => { throw new Error('dizin yok'); } };
  global.ScriptApp = { getOAuthToken: () => 'x' };
  global.MailApp = { sendEmail: (o) => mails.push(o) };
  global.Utilities = { formatDate: () => '2026-09-22 10:00',
    base64EncodeWebSafe: (x) => Buffer.from(String(x)).toString('base64').replace(/[+/=]/g,''),
    base64Decode: (x) => Array.from(Buffer.from(String(x), 'base64')),
    newBlob: (data, mime, name) => ({
      getBytes: () => (Array.isArray(data) ? data
                                           : Array.from(Buffer.from(String(data), 'utf8'))),
      getName: () => name || null,
      getContentType: () => mime || null }),
    getUuid: () => '3c969170-aaaa-bbbb-cccc-ddddeeeeffff' };
  /* Drive katmani Snapshot.gs'te; bu test onu yuklemiyor, yerine sahtesi. */
  global.driveGetMeta_ = () => ({ id: 'FOLDER', trashed: false });
  global.driveCreateFolder_ = () => ({ id: 'FOLDER' });
  global.driveApiCode_ = () => 0;
  global.driveApi_ = () => ({
    getContentText: () => JSON.stringify({ id: 'FILE1',
      webViewLink: 'https://drive.google.com/file/d/FILE1/view' }) });
  eval(SRC);
  return { rows, mails, images, notes, api: { submitFeedback, displayNameFromEmail_,
                                              newFeedbackId_ } };
}

console.log('\n1) E-postadan ad — dizin bulunamadiginda kullanilan YEDEK');
{
  const { api } = makeEnv();
  /* Bu fonksiyon commit 97d5c3d'de kaybolmus ama cagrisi kalmisti: dizinde
     bulunamayan her kullanicida currentUser_ ReferenceError veriyordu ve o
     kullanicinin geri bildirimi ne sayfaya dusuyor ne e-posta gidiyordu. */
  eq(api.displayNameFromEmail_('ahmet.dundar@valeo.com'), 'Ahmet DUNDAR', 'ad.soyad');
  eq(api.displayNameFromEmail_('nihal.pehlivan@valeo.com'), 'Nihal PEHLIVAN', 'ikinci ornek');
  eq(api.displayNameFromEmail_('muhammed-furkan.yesilmen.ext@valeo.com'),
     'Muhammed FURKAN YESILMEN', '.ext eki atiliyor, tire ayirici');
  eq(api.displayNameFromEmail_('resul'), 'Resul', 'alan adi olmadan');
  eq(api.displayNameFromEmail_(''), '', 'bos e-posta');
}

console.log('\n2) Satir DOGRU SUTUNLARA yaziliyor (A = FeedbackID)');
{
  const { rows, mails, api } = makeEnv();
  const res = api.submitFeedback({ type:'Improvement', priority:'Medium',
                                   message:'Search alani olmali' });
  eq(res.ok, true, 'kayit basarili');
  const r = rows[rows.length - 1];
  eq(/^[0-9A-F]{8}$/.test(r[0]), true, 'A: FeedbackID 8 haneli buyuk onaltilik');
  eq(r[1], 'ahmet.dundar@valeo.com', 'B: Email');
  eq(r[2], 'Improvement', 'C: Feedback_Type');
  eq(r[3], 'Medium', 'D: Priority');
  eq(r[4], 'Search alani olmali', 'E: Message');
  eq(r[5] instanceof Date, true, 'F: CreatedAt tarih');
  eq([r[6], r[7], r[8]], ['','',''], 'G/H/I elle doldurulan sutunlar bos birakiliyor');
  eq(mails.length, 1, 'bildirim e-postasi gonderildi');
  eq(mails[0].to, 'owner@valeo.com', 'alici: admin yoksa deploy eden hesap');
  eq(mails[0].subject.indexOf('Improvement') > -1 &&
     mails[0].subject.indexOf(r[0]) > -1, true, 'konu: tur + FeedbackID');
  eq(mails[0].body.indexOf('Ahmet DUNDAR') > -1, true, 'govde: gonderen adi');
}

console.log('\n3) Sayfaya yazilamazsa geri bildirim KAYBOLMUYOR');
{
  const { mails, api } = makeEnv({ writeFails: true });
  const res = api.submitFeedback({ type:'Bug', priority:'Urgent', message:'Ekran bos' });
  eq(!!res.error, true, 'kullaniciya hata donuyor');
  eq(mails.length, 1, 'icerik yine de e-postayla gidiyor');
  eq(mails[0].subject.indexOf('NOT SAVED') > -1, true, 'konu satiri kaydedilmedigini soyluyor');
  eq(mails[0].body.indexOf('Ekran bos') > -1, true, 'mesaj govdede duruyor');
}

console.log('\n4) Ekran goruntusu: HUCRENIN ICINDE ve E-POSTANIN ICINDE');
{
  /* 1x1 saydam PNG -- gercek bir goruntu, gercek bir data URL. */
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ' +
              'AAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const { rows, mails, images, notes, api } = makeEnv();
  const res = api.submitFeedback({ type:'Bug', priority:'Urgent',
                                   message:'Grafik <b> ile bozuluyor',
                                   image: PNG, imageName: 'ekran.png' });
  eq(res.ok, true, 'kayit basarili');

  /* Sayfa tarafi: goruntu satirin Screenshot hucresine gomuluyor. */
  eq(images.length, 1, 'goruntu sayfaya eklendi');
  /* Canli sayfada Screenshot sutunu YOKTU: kod onu basligin sonuna aciyor. */
  eq(rows[0][HEAD.length], 'Screenshot', 'eksik Screenshot sutunu acildi');
  eq(rows[rows.length-1][HEAD.length].indexOf('drive.google.com') > -1, true,
     'Drive linki o sutuna yazildi');
  eq([images[0].col, images[0].row], [HEAD.length + 1, rows.length],
     'goruntu Screenshot sutununa ve yeni satira demirlendi');
  eq(images[0].w > 0 && images[0].h > 0, true, 'hucreye sigacak sekilde olculendirildi');
  eq(images[0].h, Math.round(450 * (images[0].w / 800)), 'en-boy orani korundu');
  eq(notes.length === 1 && notes[0].t.indexOf('drive.google.com') > -1, true,
     'Drive linki hucre notunda duruyor');

  /* E-posta tarafi: ayni goruntu gomulu resim olarak. */
  eq(mails.length, 1, 'bildirim gonderildi');
  eq(!!(mails[0].inlineImages && mails[0].inlineImages.shot), true,
     'goruntu e-postaya gomuldu');
  eq(mails[0].htmlBody.indexOf('cid:shot') > -1, true, 'HTML govde resmi gosteriyor');
  eq(mails[0].htmlBody.indexOf('&lt;b&gt;') > -1, true,
     'kullanici metni HTML govdede kaciriliyor');
  eq(mails[0].body.indexOf('Grafik <b> ile bozuluyor') > -1, true,
     'duz metin govde aynen korunuyor');
}

console.log('\n5) Goruntusuz geri bildirimde gomulu resim YOK');
{
  const { mails, images, api } = makeEnv();
  api.submitFeedback({ type:'Improvement', priority:'Low', message:'Kucuk oneri' });
  eq(images.length, 0, 'sayfaya goruntu eklenmiyor');
  eq(mails[0].inlineImages, undefined, 'e-postada gomulu resim alani yok');
}

console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + ' gecti, ' + fail + ' kaldi');
process.exit(fail ? 1 : 0);
