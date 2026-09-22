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
var DIR_CACHE_REV = 2;   // directoryPerson_ donus SEKLI degisirse artir

/**
 * Giris yapmis kullanici: ad, unvan ve (bulunabiliyorsa) departman.
 *
 * NEDEN DIZIN ARAMASI GEREKIYOR
 * Web app executeAs:USER_DEPLOYING ile calisiyor, yani sunucu kodu HEP deploy
 * eden hesabin kimligiyle kosuyor. Bu yuzden People API'nin "people/me"
 * cagrisi ZIYARETCIYI degil deploy edeni dondurur. Ziyaretcinin adini almak
 * icin e-postasiyla DIZINDE aramak gerekiyor.
 *
 * YETKI VERILMEZSE KIRILMAZ
 * directory.readonly yoksa, Workspace yoneticisi kisi paylasimini kapatmissa
 * ya da kisi dizinde bulunamazsa ad yine e-postadan turetilir (eski davranis).
 * Boylece ozellik "varsa daha iyi", olmazsa hicbir sey bozulmuyor.
 *
 * RO NEREDEN GELIYOR: Google dizininde "PDE" diye bir alan yok — bu Valeo'nun
 * bu rapora ozel bir gruplamasi. Ama dizindeki KONUM alani ("BUR1 - BURSA 1A")
 * site'i soyluyor; siteFromLocation_ onu SITE_REGISTRY ile eslestirince RO da
 * kayittan geliyor. Kalici kaynak budur.
 *
 * (Ikincil yedek: site sayfalarindaki HUMAN RESOURCES listesinde ad eslesmesi.
 *  O bolum ileride isim degil yalniz calisan SAYISI tutacak, yani bu yedek
 *  zamanla kendiliginden devre disi kalacak — kod o gun kirilmiyor.)
 */
/**
 * E-postadan okunabilir ad. Dizin (People API) bir sonuc dondurmediginde
 * kullanilan yedek.
 *
 * !! Bu fonksiyon commit 97d5c3d'de currentUser_ dizin aramasiyla yeniden
 * yazilirken KAYBOLMUSTU, ama cagrisi kodda kaldi. Sonuc: dizinde bulunamayan
 * HER kullanici icin currentUser_() ReferenceError ile patliyordu --
 * submitFeedback ilk satirinda bu fonksiyonu cagirdigi icin o kullanicinin
 * geri bildirimi ne sayfaya yaziliyor ne e-posta gonderiliyordu; kullanici
 * yalnizca "Server error" goruyordu. Canlida gorulen sorun buydu.
 *
 * Bicim dizindekiyle ayni okunuyor: "ahmet.dundar@valeo.com" -> "Ahmet DUNDAR"
 * (ad buyuk harfle baslar, soyad tamamen buyuk). ".ext" gibi ekler atilir.
 */
function displayNameFromEmail_(email) {
  var local = String(email || '').split('@')[0];
  if (!local) return '';
  var parts = local.split(/[._\-]+/).filter(function (x) {
    return x && x.toLowerCase() !== 'ext' && !/^\d+$/.test(x);
  });
  if (!parts.length) return local;
  return parts.map(function (w, i) {
    return i === 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
                   : w.toUpperCase();
  }).join(' ');
}

function currentUser_() {
  var email = '';
  try { email = Session.getActiveUser().getEmail() || ''; } catch (e) { email = ''; }
  if (!email) return { email: '', name: '', title: '', source: 'none' };

  /* Dizin araması bir NEDENLE patlarsa (API kapali, kota, yetki) ekran
     acilmaya devam etmeli: yedek ada dusuluyor. */
  var dir = null;
  try { dir = directoryPerson_(email); } catch (e) { dir = null; }
  var guess = null;
  try { guess = dir ? siteFromLocation_(dir.locs) : null; } catch (e) { guess = null; }
  if (dir && dir.name) {
    return { email: email, name: dir.name, title: dir.title || '',
             department: dir.department || '', location: (dir.locs || []).join(' | '),
             siteGuess: guess, source: 'directory' };
  }
  return { email: email, name: displayNameFromEmail_(email), title: '',
           department: '', location: '', siteGuess: null, source: 'email' };
}

/**
 * Konum bilgisi tek bir alanda DEGIL.
 *
 * Canli teshiste organizations[].location "desk" dondu — bu konumun DEGERI
 * degil TIPI. Gercek deger (Google Chat kartindaki "BUR1 - BURSA 1A")
 * locations[].value icinde. Hangi alanin dolu oldugu hesaba gore degistigi
 * icin tahmin yurutmek yerine TUM adaylar toplanip sirayla deneniyor.
 */
function locationCandidates_(person) {
  var out = [];
  function add(v) {
    v = String(v || '').trim();
    if (v && out.indexOf(v) === -1) out.push(v);
  }
  (person.locations || []).forEach(function (l) {
    add(l.value); add(l.buildingId); add(l.deskCode);
  });
  (person.organizations || []).forEach(function (o) {
    add(o.location); add(o.department); add(o.officeLocation);
  });
  return out;
}

/**
 * Dizindeki konum metnini site kaydiyla eslestirir.
 * Ornek: "BUR1 - BURSA 1A" -> normalize "BUR1BURSA1A", icinde "BURSA1" gecer
 * -> Bursa 1 / PDE.
 *
 * BELIRSIZSE NULL DONER. Ayni sehirde birden fazla site olabiliyor (Bursa 1 =
 * PDE, Bursa 3 THS = PTE); tek bir site'a indirgenemiyorsa tahmin yurutulmez —
 * yanlis RO gostermektense hic gostermemek dogru.
 */
function siteFromLocation_(loc) {
  /* Dizi de kabul edilir: adaylar sirayla denenir, ilk TEK eslesme kazanir. */
  if (loc && loc.length !== undefined && typeof loc !== 'string') {
    for (var k = 0; k < loc.length; k++) {
      var r = siteFromLocation_(loc[k]);
      if (r) return r;
    }
    return null;
  }
  var L = normText_(loc).replace(/[^A-Z0-9]/g, '');
  if (L.length < 3) return null;
  var hits = [];
  for (var i = 0; i < SITE_REGISTRY.length; i++) {
    var n = normText_(SITE_REGISTRY[i].site).replace(/[^A-Z0-9]/g, '');
    if (n && n.length >= 4 && L.indexOf(n) !== -1) hits.push(SITE_REGISTRY[i]);
  }
  /* key de doner: acilis ekrani haritasi SITE_GEO'yu bu anahtarla adresliyor
     (WorldMapData.html), site ADIYLA degil. */
  if (hits.length === 1) return { ro: hits[0].ro, site: hits[0].site, key: hits[0].key };
  if (hits.length > 1) return null;   // ayni sehirde birden fazla site -> tahmin yok

  /* Site adi tam gecmiyor ama SEHIR adi geciyor olabilir (bina kodunda rakam
     farkli yazilmis olabilir). Sehir = site adinin ILK RAKAMA kadarki kismi:
       "Bursa 1"                -> BURSA
       "Bursa 3 THS"            -> BURSA      (ikisi ayni sehir!)
       "San Luis Potosi 1 (M10)"-> SANLUISPOTOSI
     Ayni sehirde birden fazla site varsa (Bursa) eslesme BELIRSIZ sayilir ve
     null doner — yanlis RO gostermektense hic gostermemek dogru. */
  var byCity = {};
  for (var c = 0; c < SITE_REGISTRY.length; c++) {
    var city = cityOfSite_(SITE_REGISTRY[c].site);
    if (!city || city.length < 4) continue;
    (byCity[city] = byCity[city] || []).push(SITE_REGISTRY[c]);
  }
  var found = null;
  for (var cityName in byCity) {
    if (!byCity.hasOwnProperty(cityName)) continue;
    if (L.indexOf(cityName) === -1) continue;
    if (byCity[cityName].length !== 1) return null;   // ayni sehirde cok site
    if (found) return null;                            // iki farkli sehir esledi
    found = byCity[cityName][0];
  }
  return found ? { ro: found.ro, site: found.site, key: found.key } : null;
}

/** Site adinin ilk rakamdan ONCEKI kismi, normalize: "Bursa 3 THS" -> "BURSA" */
function cityOfSite_(name) {
  var s = String(name || '').replace(/\([^)]*\)/g, ' ');   // "(M10)" gibi ekler
  var cut = s.search(/\d/);
  if (cut > 0) s = s.slice(0, cut);
  return normText_(s).replace(/[^A-Z]/g, '');
}

/**
 * Kisiyi Google dizininde e-postasiyla arar.
 * Sonuc cache'lenir: dizin cagrisi yavas ve her sayfa acilisinda tekrarlanir.
 * @return {{name:string, title:string, department:string}|null}
 */
function directoryPerson_(email) {
  var cache = CacheService.getScriptCache();
  /* Anahtarda SURUM var: donus sekli degisince eski kayitlar kendiliginden
     gecersiz olur. Bu olmadan sekil degisikliginden sonra 6 saat boyunca eski
     (eksik alanli) kayit servis ediliyordu — canlida tam bu oldu, site/RO
     gelmedi. Ayni ders Snapshot.gs'te SNAP_VERSION ile zaten ogrenilmisti. */
  var key = 'dir' + DIR_CACHE_REV + '_' + Utilities.base64EncodeWebSafe(email).slice(0, 80);
  try {
    var hit = cache.get(key);
    if (hit) return hit === 'NONE' ? null : JSON.parse(hit);
  } catch (e) {}

  var out = null;
  try {
    /* People ileri servisi kurulu degilse burada ReferenceError olur — yakalanip
       e-postadan turetmeye dusuluyor. */
    var res = People.People.searchDirectoryPeople({
      query: email,
      readMask: 'names,emailAddresses,organizations,locations',
      sources: ['DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE'],
      pageSize: 10
    });
    var people = (res && res.people) || [];
    var want = email.toLowerCase();
    for (var i = 0; i < people.length && !out; i++) {
      var addrs = people[i].emailAddresses || [];
      for (var a = 0; a < addrs.length; a++) {
        if (String(addrs[a].value || '').toLowerCase() !== want) continue;
        var nm = (people[i].names || [])[0] || {};
        var org = (people[i].organizations || [])[0] || {};
        out = {
          name: nm.displayName || '',
          title: org.title || '',
          department: org.department || '',
          locs: locationCandidates_(people[i])
        };
        break;
      }
    }
  } catch (e) {
    out = null;   // yetki yok / servis kapali / dizin paylasimi kapali
  }

  try { cache.put(key, out ? JSON.stringify(out) : 'NONE', 21600); } catch (e) {}
  return out;
}

/** TESHIS: dizin aramasi calisiyor mu, ne donuyor. */
function checkDirectory() {
  function log(s) { console.log(s); }
  log('=== Dizin aramasi kontrolu ===');
  var email = '';
  try { email = Session.getActiveUser().getEmail() || '(bos)'; } catch (e) { email = 'HATA'; }
  log('Aranan e-posta : ' + email);
  log('People servisi : ' + ((typeof People !== 'undefined' && People) ? 'KURULU' : 'YOK'));
  try {
    var res = People.People.searchDirectoryPeople({
      query: email,
      readMask: 'names,emailAddresses,organizations,locations',
      sources: ['DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE'],
      pageSize: 5
    });
    var n = ((res && res.people) || []).length;
    log('Dizin sonucu   : ' + n + ' kisi');
    ((res && res.people) || []).forEach(function (p) {
      var nm = (p.names || [])[0] || {}, org = (p.organizations || [])[0] || {};
      log('  - ' + (nm.displayName || '(ad yok)') +
          '  | unvan: ' + (org.title || '-') +
          '  | departman: ' + (org.department || '-'));
      /* Hangi alanin dolu oldugunu gormek icin HAM veri yaziliyor. */
      log('    ham locations   : ' + JSON.stringify(p.locations || []));
      log('    ham organizations: ' + JSON.stringify(p.organizations || []));
      var cands = locationCandidates_(p);
      log('    aday konumlar   : ' + (cands.length ? cands.join(' | ') : '(yok)'));
      var g = siteFromLocation_(cands);
      log('    konumdan site   : ' + (g ? (g.ro + ' - ' + g.site) : '(eslesmedi/belirsiz)'));
    });
    if (!n) {
      log('!! Kisi dizinde bulunamadi. Workspace yoneticisi "kisi paylasimi"ni');
      log('   kapatmis olabilir; bu durumda ad e-postadan turetilmeye devam eder.');
    }
  } catch (e) {
    log('HATA: ' + e.message);
    log('!! Muhtemel sebepler: directory.readonly yetkisi verilmemis, People');
    log('   ileri servisi kurulu degil, ya da dizin paylasimi kapali.');
    log('   Hicbiri olmasa da pano calisir — ad e-postadan turetilir.');
  }
  /* Cache'teki kayit da yazilir: canli sonuc ile teshis sonucu farkliysa
     sebebi neredeyse her zaman eski cache kaydidir. */
  try {
    var ck = 'dir' + DIR_CACHE_REV + '_' + Utilities.base64EncodeWebSafe(email).slice(0, 80);
    log('Cache (rev ' + DIR_CACHE_REV + ') : ' + (CacheService.getScriptCache().get(ck) || '(bos)'));
  } catch (e) {}
  var u = currentUser_();
  log('Sonuc: ' + u.name + (u.title ? '  (' + u.title + ')' : '') +
      (u.siteGuess ? '  ' + u.siteGuess.ro + ' - ' + u.siteGuess.site : '  (site yok)') +
      '  [kaynak: ' + u.source + ']');
  log('=== bitti ===');
}

/* Geri bildirimler bu dosyadaki BU SEKMEYE yaziliyor (kullanici talimati).
   Baska sekmelere dokunulmuyor. */
var FEEDBACK_TAB_NAME = 'RO Monthly Report';
/* Sekme YOKSA bu basliklarla olusturulur. Canlidaki sekmenin duzeniyle ayni
   (Screenshot sutunu dahil) + FeedbackID. Var olan bir sekmenin duzenine
   DOKUNULMAZ: sutunlar adlarindan bulunur, olmayan sutun atlanir. */
var FEEDBACK_HEADERS = ['FeedbackID', 'Email', 'Feedback_Type', 'Priority', 'Message',
                        'CreatedAt', 'Screenshot', 'Comments', 'Status',
                        'Standardization Y/N'];

/* Sayfadaki mevcut kayitlarla ayni bicim: 8 haneli BUYUK harf onaltilik
   (ornek: CC0B73C0). Satiri e-postadan takip edebilmek icin gerekiyor --
   kod bu sutunu hic doldurmuyordu, yeni satirlarda A sutunu bos kaliyordu. */
function newFeedbackId_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
}

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

/**
 * Aranan sutun yoksa baslik satirinin SONUNA ekler ve indeksini dondurur.
 *
 * Neden: canli sayfada "Screenshot" (ve bazi kopyalarda "FeedbackID") sutunu
 * yoktu; kod da olmayan sutuna yazamayip degeri sessizce dusuruyordu -- geri
 * bildirim "geldi ama sayfada yok" gorunuyordu. Sutunu elle actirmak yerine
 * bir kez kendisi aciyor. Var olan sutunlara DOKUNMAZ, yalnizca sona ekler.
 */
function ensureColumn_(sheet, head, names, title) {
  var idx = pickCol_(head.map, names);
  if (idx >= 0) return idx;
  var col = Math.max(1, head.lastCol) + 1;
  sheet.getRange(1, col, 1, 1).setValues([[title]]);
  head.lastCol = col;
  head.map[normText_(title).replace(/[^A-Z0-9]/g, '')] = col - 1;
  return col - 1;
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
  /* Blob da doniyor: ayni goruntu hem SAYFAYA hucre icine hem de E-POSTAYA
     gomulu olarak konuyor. Drive'a yazilan kopya "asil" olarak kaliyor. */
  return {
    link: file.webViewLink || ('https://drive.google.com/file/d/' + file.id + '/view'),
    blob: Utilities.newBlob(bytes, mime, safe),
    name: safe
  };
}

/**
 * Ekran goruntusunu satirin Screenshot hucresine yerlestirir.
 *
 * Neden "hucre icine resim" degil de hucreye SABITLENMIS resim: hucre-ici
 * resim (CellImage) kaynagin HERKESE ACIK bir URL olmasini istiyor; ic
 * ekran goruntulerini link-herkese-acik yapmak dogru olmaz. Blob ile
 * eklenen resim hicbir paylasim gerektirmiyor ve gorsel olarak ayni yere
 * oturuyor: sutun genisligine gore olceklenip satir yuksekligi ona gore
 * ayarlaniyor. Drive baglantisi da hucrenin notunda duruyor.
 */
function attachShotToRow_(sheet, rowNo, colIndex, blob, link) {
  var col = colIndex + 1;                       // 0-tabanli -> 1-tabanli
  var img = sheet.insertImage(blob, col, rowNo);
  var W = Math.max(160, Math.min(320, sheet.getColumnWidth(col) - 8));
  var iw = 0, ih = 0;
  try { iw = img.getInherentWidth(); ih = img.getInherentHeight(); } catch (e) {}
  var h = (iw > 0 && ih > 0) ? Math.round(ih * (W / iw)) : 120;
  h = Math.max(40, Math.min(400, h));
  img.setWidth(W).setHeight(h);
  if (sheet.getColumnWidth(col) < W + 10) sheet.setColumnWidth(col, W + 10);
  if (sheet.getRowHeight(rowNo) < h + 10) sheet.setRowHeight(rowNo, h + 10);
  if (link) {
    try { sheet.getRange(rowNo, col).setNote('Screenshot: ' + link); } catch (e) {}
  }
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
/* ---------- geri bildirim e-posta bildirimi ----------
 * Bu HIC YOKTU: geri bildirim yalniz spreadsheet'e yaziliyordu, kimseye
 * haber gitmiyordu. Sayfayi acip bakmayan bir sahip geri bildirimi hic
 * gormuyordu.
 *
 * Alici: RO_DASH_ADMIN_EMAILS ayarlanmissa o liste, yoksa web app'i deploy
 * eden hesap (yani "varsayilan olarak yalniz ben" -- yetki mantigiyla ayni).
 * Posta gonderimi SAVE'i asla bozmaz: try/catch icinde ve sonucu ayri bir
 * alanda donuyor, kullaniciya "kaydedildi ama e-posta gitmedi" diyebilelim.
 */
function feedbackRecipients_() {
  /* adminEmails_ baska bir dosyada (PeriodRegistry.gs). Ayni hata sinifini
     tekrarlamamak icin savunmali: bir bagimlilik kaybolursa bildirim
     susmali, geri bildirim KAYDI bozulmamali. */
  var list = [];
  try { list = adminEmails_() || []; } catch (e) { list = []; }
  if (list.length) return list;
  var me = '';
  try { me = Session.getEffectiveUser().getEmail() || ''; } catch (e) {}
  return me ? [me] : [];
}

/* Kullanici metni HTML govdesine girdigi icin kacisi ZORUNLU: aksi halde
   geri bildirim metnindeki bir '<' posta govdesini bozar. */
function htmlEscape_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function notifyFeedback_(info) {
  var to = feedbackRecipients_();
  if (!to.length) return { sent: false, reason: 'no recipient' };
  var who = (info.user && info.user.name ? info.user.name + ' <' + info.user.email + '>'
                                         : (info.user && info.user.email) || 'unknown');
  var ok = !info.error;
  var subject = (ok ? '[RO Dashboard] ' : '[RO Dashboard — NOT SAVED] ') +
                info.type + ' · ' + info.priority + ' — ' + who +
                (info.id ? '  (' + info.id + ')' : '');
  var lines = [
    (info.id ? 'ID        : ' + info.id : ''),
    'Type      : ' + info.type,
    'Priority  : ' + info.priority,
    'From      : ' + who,
    'When      : ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(),
                                          'yyyy-MM-dd HH:mm'),
    '',
    info.message,
    ''
  ];
  if (info.link) lines.push('Screenshot: ' + info.link);
  if (ok) {
    lines.push('Sheet     : row ' + info.row + ' — ' +
               'https://docs.google.com/spreadsheets/d/' + FEEDBACK_SHEET_ID + '/edit');
  } else {
    lines.push('!! The sheet write FAILED, so this message exists only in this e-mail:');
    lines.push('   ' + info.error);
  }
  var body = lines.join('\n');
  /* Ekran goruntusu POSTANIN ICINDE gorunsun: duz metin govdesi ek olarak
     kalir (metin okuyan istemciler icin), HTML govdesi ayni metni + gomulu
     resmi tasir. Resim cid: ile gomulur -- Drive linki tiklanmadan gorunur,
     ustelik alicinin Drive erisimi olmasa da. */
  var html = '<div style="font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;' +
             'white-space:pre-wrap">' + htmlEscape_(body) + '</div>';
  var opts = { to: to.join(','), subject: subject, body: body };
  if (info.blob) {
    html += '<div style="margin-top:14px">' +
            '<img src="cid:shot" style="max-width:640px;border:1px solid #ccc;' +
            'border-radius:6px" alt="screenshot"></div>';
    opts.inlineImages = { shot: info.blob };
  }
  opts.htmlBody = html;
  try {
    MailApp.sendEmail(opts);
    return { sent: true, to: to };
  } catch (e) {
    /* Gomulu resim bazi durumlarda (cok buyuk ek, kota) postayi tumden
       dusurebilir. Bildirimin KENDISI resimden daha onemli: resimsiz,
       duz metin olarak bir kez daha dene. */
    if (info.blob) {
      try {
        MailApp.sendEmail({ to: to.join(','), subject: subject, body: body });
        return { sent: true, to: to, withoutImage: true };
      } catch (e2) { return { sent: false, reason: e2.message }; }
    }
    return { sent: false, reason: e.message };
  }
}

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
  var link = null, shotBlob = null;
  if (p.image) {
    try {
      var saved = saveFeedbackImage_(p.image, p.imageName);
      if (saved) { link = saved.link; shotBlob = saved.blob; }
    }
    catch (e) { return { error: 'Screenshot could not be saved: ' + e.message }; }
  }

  /* Ayni anda iki kisi gonderirse ayni satira yazilmasin. */
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); }
  catch (e) { return { error: 'The sheet is busy, please try again.' }; }

  try {
    var target = feedbackSheet_();
    var sheet = target.sheet, map = target.head.map;

    var cId    = ensureColumn_(sheet, target.head, ['FEEDBACKID', 'ID'], 'FeedbackID');
    var cEmail = pickCol_(map, ['EMAIL', 'USER', 'KULLANICI']);
    var cType  = pickCol_(map, ['FEEDBACKTYPE', 'TYPE', 'TUR']);
    var cPrio  = pickCol_(map, ['PRIORITY', 'ONCELIK']);
    var cMsg   = pickCol_(map, ['MESSAGE', 'MESAJ', 'FEEDBACK']);
    var cDate  = pickCol_(map, ['CREATEDAT', 'DATE', 'TARIH']);
    var shotNames = ['SCREENSHOT', 'IMAGE', 'EKRANGORUNTUSU', 'GORSEL'];
    /* Sutun yalnizca GERCEKTEN ekran goruntusu geldiyse acilir: goruntusuz
       kullanan bir sayfaya bos bir sutun eklemek dogru olmaz. */
    var cShot  = (link || shotBlob) ? ensureColumn_(sheet, target.head, shotNames, 'Screenshot')
                                    : pickCol_(map, shotNames);

    if (cMsg === -1) {
      return { error: 'The feedback sheet has no "Message" column — nothing was written.' };
    }

    var width = Math.max(target.head.lastCol, cShot + 1, cDate + 1, cMsg + 1, cId + 1);
    var row = new Array(width);
    for (var i = 0; i < width; i++) row[i] = '';

    var fid = newFeedbackId_();
    if (cId >= 0)    row[cId] = fid;
    if (cEmail >= 0) row[cEmail] = user.email;
    if (cType >= 0)  row[cType] = type;
    if (cPrio >= 0)  row[cPrio] = priority;
    if (cDate >= 0)  row[cDate] = new Date();
    /* Ekran goruntusu icin sutun yoksa baglanti mesajin sonuna eklenir —
       sessizce kaybolmasin. */
    if (link && cShot >= 0) row[cShot] = link;
    row[cMsg] = message + ((link && cShot < 0) ? '\n\nScreenshot: ' + link : '');

    sheet.appendRow(row);
    var rowNo = sheet.getLastRow();
    /* Goruntuyu hucreye yerlestirmek KAYDI bozmamali: basarisiz olursa
       Drive baglantisi zaten satirda duruyor. */
    if (shotBlob && cShot >= 0) {
      try { attachShotToRow_(sheet, rowNo, cShot, shotBlob, link); } catch (e) {}
    }
    dropFeedbackBadge_();          /* zil rozeti hemen artsin */
    var mail = notifyFeedback_({ type: type, priority: priority, message: message,
                                 user: user, link: link, row: rowNo, id: fid,
                                 blob: shotBlob });
    return {
      ok: true,
      row: rowNo,
      id: fid,
      link: link,
      mailed: mail.sent,
      warning: target.createdTab
        ? 'The "' + FEEDBACK_TAB_NAME + '" tab did not exist and was created.'
        : (mail.sent ? null : 'Saved, but the notification e-mail could not be sent: ' +
                              mail.reason)
    };
  } catch (e) {
    /* Sayfaya yazilamadiysa geri bildirim KAYBOLMASIN: icerik e-postayla
       yine de gider ve konu satirinda "NOT SAVED" yazar. */
    var rescue = notifyFeedback_({ type: type, priority: priority, message: message,
                                   user: user, link: link, error: e.message,
                                   blob: shotBlob });
    return { error: 'Could not save: ' + e.message +
                    (rescue.sent ? ' — the content was e-mailed to the dashboard owner instead.'
                                 : '') };
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

/**
 * Ayarlar ekranindaki "Test e-mail" dugmesi.
 * Bildirim postasi gitmiyorsa SEBEBI soyler. Onceden hata try/catch'te
 * yutuluyor, kullaniciya yalnizca "kaydedildi" deniyordu -- postanin neden
 * gitmedigi hicbir yerde gorunmuyordu. En sik sebep: script.send_mail
 * kapsami eklendikten sonra betigin YENIDEN YETKILENDIRILMEMIS olmasi.
 */
function uiTestMail() {
  var deny = requireAdmin_(); if (deny) return deny;
  var to = feedbackRecipients_();
  if (!to.length) {
    return { ok: true, message: 'No recipient. Set RO_DASH_ADMIN_EMAILS in Script Properties.' };
  }
  var left = null;
  try { left = MailApp.getRemainingDailyQuota(); } catch (e) { left = null; }
  try {
    MailApp.sendEmail({
      to: to.join(','),
      subject: '[RO Dashboard] Test e-mail',
      body: 'This is a test from the RO Monthly Report dashboard.\n' +
            'If you received it, feedback notifications work.\n\n' +
            'Sent at ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(),
                                              'yyyy-MM-dd HH:mm')
    });
    return { ok: true, message: 'Test e-mail SENT to ' + to.join(', ') +
                                (left == null ? '' : '  (daily quota left: ' + left + ')') };
  } catch (e) {
    return { ok: true, message: 'Test e-mail FAILED: ' + e.message +
      '\n\nMost likely the script has not been re-authorized after the' +
      ' "send e-mail" permission was added.' +
      '\n\nFix (once, by the account that deployed the web app):' +
      '\n  1. Go to https://script.google.com and open this project' +
      ' (it is a STANDALONE script, not attached to a spreadsheet).' +
      '\n  2. Pick any function in the toolbar and press Run.' +
      '\n  3. Approve the permission dialog — it must list "Send email as you".' +
      '\n  4. Come back here and press Test e-mail again.' };
  }
}

/**
 * Ayarlar ekranindaki "Feedback check" dugmesi.
 * Ayni teshisi Apps Script editorune girmeden, panelin log kutusunda verir:
 * hedef dosya/sekme, sutun eslesmesi, kayitli satir sayisi, son kayit ve
 * bildirim e-postasinin kime gidecegi. Sorun burada gorunur hale gelir.
 */
function uiCheckFeedback() {
  var deny = requireAdmin_(); if (deny) return deny;
  var out = [];
  var to = feedbackRecipients_();
  out.push('Notification e-mail -> ' + (to.length ? to.join(', ') : '(NO RECIPIENT — set RO_DASH_ADMIN_EMAILS)'));
  try {
    var t = feedbackSheet_();
    var m = t.head.map;
    var cMsg = pickCol_(m, ['MESSAGE', 'MESAJ', 'FEEDBACK']);
    out.push('File  : ' + t.sheet.getParent().getName());
    out.push('Tab   : ' + t.sheet.getName() + (t.createdTab ? '  (JUST CREATED — the old tab was not found!)' : ''));
    out.push('Header: ' + t.head.row.join(' | '));
    out.push('Column: Email=' + pickCol_(m, ['EMAIL', 'USER', 'KULLANICI']) +
             '  Type=' + pickCol_(m, ['FEEDBACKTYPE', 'TYPE', 'TUR']) +
             '  Priority=' + pickCol_(m, ['PRIORITY', 'ONCELIK']) +
             '  Message=' + cMsg +
             '  CreatedAt=' + pickCol_(m, ['CREATEDAT', 'DATE', 'TARIH']) +
             '  Screenshot=' + pickCol_(m, ['SCREENSHOT', 'IMAGE', 'EKRANGORUNTUSU', 'GORSEL']));
    if (cMsg === -1) out.push('!! No Message column -> every submission is REJECTED.');
    var last = t.sheet.getLastRow();
    out.push('Rows  : ' + last + ' (header included)');
    if (last > 1 && cMsg >= 0) {
      var vals = t.sheet.getRange(last, 1, 1, t.head.lastCol).getValues()[0];
      var cDate = pickCol_(m, ['CREATEDAT', 'DATE', 'TARIH']);
      out.push('Last  : ' + (cDate >= 0 ? String(vals[cDate]) + ' — ' : '') +
               String(vals[cMsg]).slice(0, 120));
    } else if (last <= 1) {
      out.push('Last  : (no feedback recorded yet)');
    }
    return { ok: true, message: out.join('\n') };
  } catch (e) {
    out.push('ERROR : ' + e.message);
    out.push('!! The deploying account needs EDIT access to that spreadsheet.');
    return { ok: true, message: out.join('\n') };
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

/* ===================== GERI BILDIRIM GELEN KUTUSU =====================
 * Geri bildirimleri okumak icin tek yol spreadsheet'i acmak, ekran
 * goruntusunu gormek icin de Drive baglantisini ayri bir sekmede acmakti.
 * Bu blok ayni veriyi panonun ICINDE, ekran goruntusu satirin yanindayken
 * gosteriyor: sahibi "bunu devreye alayim mi" kararini tek ekranda verebilsin.
 *
 * Yalniz OKUR; tek yazdigi sey yonetici karari (Status sutunu).
 */

/** Drive baglantisindan dosya kimligini cikarir. */
function driveIdFromLink_(link) {
  var s = String(link || '');
  var m = /\/d\/([A-Za-z0-9_\-]+)/.exec(s) || /[?&]id=([A-Za-z0-9_\-]+)/.exec(s);
  return m ? m[1] : '';
}

/**
 * Tum geri bildirimleri dondurur (en yenisi ustte).
 * Ekran goruntusunun kendisi burada TASINMAZ -- yalnizca kimligi. Goruntu
 * ayri ayri, gorundugu anda istenir (feedbackShot); 6 MB'lik goruntuleri
 * tek yanitta tasimak listeyi kilitlerdi.
 */
function listFeedback() {
  var deny = requireAdmin_(); if (deny) return deny;
  var t, m;
  try { t = feedbackSheet_(); m = t.head.map; }
  catch (e) { return { error: 'Feedback sheet could not be opened: ' + e.message }; }

  var cId   = pickCol_(m, ['FEEDBACKID', 'ID']);
  var cMail = pickCol_(m, ['EMAIL', 'USER', 'KULLANICI']);
  var cType = pickCol_(m, ['FEEDBACKTYPE', 'TYPE', 'TUR']);
  var cPrio = pickCol_(m, ['PRIORITY', 'ONCELIK']);
  var cMsg  = pickCol_(m, ['MESSAGE', 'MESAJ', 'FEEDBACK']);
  var cDate = pickCol_(m, ['CREATEDAT', 'DATE', 'TARIH']);
  var cShot = pickCol_(m, ['SCREENSHOT', 'IMAGE', 'EKRANGORUNTUSU', 'GORSEL']);
  var cStat = pickCol_(m, ['STATUS', 'DURUM']);
  var cCom  = pickCol_(m, ['COMMENTS', 'COMMENT', 'YORUM']);
  if (cMsg === -1) return { error: 'The feedback sheet has no "Message" column.' };

  var last = t.sheet.getLastRow();
  if (last < 2) return { ok: true, items: [], statusCol: cStat >= 0 };
  var vals = t.sheet.getRange(2, 1, last - 1, Math.max(1, t.head.lastCol)).getValues();
  var tz = Session.getScriptTimeZone();
  var items = [];
  for (var i = 0; i < vals.length; i++) {
    var v = vals[i];
    var msg = String(v[cMsg] == null ? '' : v[cMsg]).trim();
    if (!msg) continue;                       /* bos satir: atla */
    var d = (cDate >= 0) ? v[cDate] : '';
    items.push({
      row: i + 2,
      id: cId >= 0 ? String(v[cId] || '') : '',
      email: cMail >= 0 ? String(v[cMail] || '') : '',
      name: cMail >= 0 ? displayNameFromEmail_(String(v[cMail] || '')) : '',
      type: cType >= 0 ? String(v[cType] || '') : '',
      priority: cPrio >= 0 ? String(v[cPrio] || '') : '',
      message: msg,
      date: (d instanceof Date) ? Utilities.formatDate(d, tz, 'yyyy-MM-dd HH:mm') : String(d || ''),
      shotId: cShot >= 0 ? driveIdFromLink_(v[cShot]) : '',
      shotLink: cShot >= 0 ? String(v[cShot] || '') : '',
      status: cStat >= 0 ? String(v[cStat] || '') : '',
      comments: cCom >= 0 ? String(v[cCom] || '') : ''
    });
  }
  items.reverse();                            /* en yenisi ustte */
  return { ok: true, items: items, statusCol: cStat >= 0 };
}

/**
 * Bir ekran goruntusunu data URL olarak dondurur.
 * Drive baglantisi tarayicida dogrudan <img> icinde calismaz (oturum/izin);
 * goruntuyu betigin kendi yetkisiyle okuyup gomuyoruz. Betik yalnizca KENDI
 * olusturdugu dosyalari gorebiliyor (drive.file), yani kapsam geri bildirim
 * ekran goruntuleriyle sinirli.
 */
function feedbackShot(fileId) {
  var deny = requireAdmin_(); if (deny) return deny;
  var id = String(fileId || '').replace(/[^A-Za-z0-9_\-]/g, '');
  if (!id) return { error: 'No screenshot.' };
  try {
    var meta = driveGetMeta_(id);
    var res = driveApi_(DRIVE_V3 + '/' + encodeURIComponent(id) + '?alt=media',
                        { method: 'get' });
    var blob = res.getBlob();
    var mime = blob.getContentType() || 'image/png';
    return { ok: true, name: (meta && meta.name) || 'screenshot',
             dataUrl: 'data:' + mime + ';base64,' + Utilities.base64Encode(blob.getBytes()) };
  } catch (e) {
    return { error: 'Screenshot could not be read: ' + e.message };
  }
}

var FEEDBACK_STATUSES = ['', 'Reviewing', 'Planned', 'Done', 'Rejected'];

/** Yonetici kararini Status sutununa yazar. Baska hicbir sutuna dokunmaz. */
function setFeedbackStatus(row, status) {
  var deny = requireAdmin_(); if (deny) return deny;
  var st = String(status || '');
  if (FEEDBACK_STATUSES.indexOf(st) === -1) return { error: 'Unknown status.' };
  var r = parseInt(row, 10);
  if (!(r > 1)) return { error: 'Bad row.' };
  try {
    var t = feedbackSheet_();
    var cStat = pickCol_(t.head.map, ['STATUS', 'DURUM']);
    if (cStat < 0) {
      cStat = ensureColumn_(t.sheet, t.head, ['STATUS', 'DURUM'], 'Status');
    }
    if (r > t.sheet.getLastRow()) return { error: 'That row no longer exists.' };
    t.sheet.getRange(r, cStat + 1).setValue(st);
    dropFeedbackBadge_();
    return { ok: true, row: r, status: st };
  } catch (e) {
    return { error: 'Could not write: ' + e.message };
  }
}

/**
 * Ust cubuktaki zil rozeti: KARARI VERILMEMIS geri bildirim sayisi.
 * Sayfayi her acilista okumamak icin kisa sureli onbellek; karar yazilinca
 * onbellek dusuruluyor, rozet aninda guncelleniyor.
 */
var FEEDBACK_BADGE_CACHE = 'ro_fb_badge_v1';

function feedbackBadge() {
  if (!isAuthorizedAdmin_()) return { ok: true, count: 0, admin: false };
  var cache = CacheService.getScriptCache();
  var hit = cache.get(FEEDBACK_BADGE_CACHE);
  if (hit != null) return { ok: true, count: parseInt(hit, 10) || 0, admin: true };
  var n = 0;
  try {
    var t = feedbackSheet_();
    var cMsg = pickCol_(t.head.map, ['MESSAGE', 'MESAJ', 'FEEDBACK']);
    var cStat = pickCol_(t.head.map, ['STATUS', 'DURUM']);
    var last = t.sheet.getLastRow();
    if (last > 1 && cMsg >= 0) {
      var vals = t.sheet.getRange(2, 1, last - 1, Math.max(1, t.head.lastCol)).getValues();
      for (var i = 0; i < vals.length; i++) {
        if (!String(vals[i][cMsg] || '').trim()) continue;
        if (cStat < 0 || !String(vals[i][cStat] || '').trim()) n++;
      }
    }
  } catch (e) { return { ok: true, count: 0, admin: true, error: e.message }; }
  cache.put(FEEDBACK_BADGE_CACHE, String(n), 120);
  return { ok: true, count: n, admin: true };
}

function dropFeedbackBadge_() {
  try { CacheService.getScriptCache().remove(FEEDBACK_BADGE_CACHE); } catch (e) {}
}

/**
 * Secilen satirlari tek seferde "Planned" yapar (gelistirme kuyruguna alir).
 * Tek tek setFeedbackStatus cagirmak yerine tek tur: her cagri sayfayi
 * yeniden aciyordu.
 */
function queueFeedback(rows) {
  var deny = requireAdmin_(); if (deny) return deny;
  var list = (rows || []).map(function (r) { return parseInt(r, 10); })
                         .filter(function (r) { return r > 1; });
  if (!list.length) return { error: 'Nothing selected.' };
  try {
    var t = feedbackSheet_();
    var cStat = pickCol_(t.head.map, ['STATUS', 'DURUM']);
    if (cStat < 0) cStat = ensureColumn_(t.sheet, t.head, ['STATUS', 'DURUM'], 'Status');
    var last = t.sheet.getLastRow();
    var done = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] > last) continue;
      t.sheet.getRange(list[i], cStat + 1).setValue('Planned');
      done.push(list[i]);
    }
    dropFeedbackBadge_();
    return { ok: true, rows: done, status: 'Planned' };
  } catch (e) {
    return { error: 'Could not write: ' + e.message };
  }
}
