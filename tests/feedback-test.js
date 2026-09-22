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
  const sheet = {
    getName: () => 'RO Monthly Report',
    getParent: () => ({ getName: () => 'RO Dashboard Feedback' }),
    getLastColumn: () => HEAD.length,
    getLastRow: () => rows.length,
    getRange: (r,c,nr,nc) => ({ getValues: () => [rows[r-1].slice(c-1, c-1+nc)],
                                setValues: () => {} }),
    setFrozenRows: () => {},
    appendRow: (r) => { if (opts.writeFails) throw new Error('No permission'); rows.push(r); }
  };
  global.SpreadsheetApp = { openById: () => ({ getSheets: () => [sheet],
    insertSheet: () => { throw new Error('sekme VAR, olusturulmamali'); } }) };
  global.LockService = { getScriptLock: () => ({ waitLock(){}, releaseLock(){} }) };
  global.Session = { getActiveUser: () => ({ getEmail: () => 'ahmet.dundar@valeo.com' }),
                     getEffectiveUser: () => ({ getEmail: () => 'owner@valeo.com' }),
                     getScriptTimeZone: () => 'Europe/Istanbul' };
  global.PropertiesService = { getScriptProperties: () => ({ getProperty: () => null }) };
  global.CacheService = { getScriptCache: () => ({ get(){return null;}, put(){}, remove(){} }) };
  global.UrlFetchApp = { fetch: () => { throw new Error('dizin yok'); } };
  global.ScriptApp = { getOAuthToken: () => 'x' };
  global.MailApp = { sendEmail: (o) => mails.push(o) };
  global.Utilities = { formatDate: () => '2026-09-22 10:00',
    base64EncodeWebSafe: (x) => Buffer.from(String(x)).toString('base64').replace(/[+/=]/g,''),
    getUuid: () => '3c969170-aaaa-bbbb-cccc-ddddeeeeffff' };
  eval(SRC);
  return { rows, mails, api: { submitFeedback, displayNameFromEmail_, newFeedbackId_ } };
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

console.log('\n' + (fail ? 'FAIL' : 'PASS') + ' — ' + pass + ' gecti, ' + fail + ' kaldi');
process.exit(fail ? 1 : 0);
