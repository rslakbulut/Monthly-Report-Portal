# Apps Script Dashboard Hızlandırma Playbook'u

**Belirti:** Web app açılışta 20-60 saniye bekletiyor. Veri geldiğinde doğru geliyor,
sadece çok yavaş.

**Sonuç:** Açılış ~0.5 saniyeye iner. Gerçek ölçüm: 48 sayfalık bir Google Sheets'ten
beslenen bir dashboard'da 30-60 sn → **467 ms**, açılışta **sıfır** sunucu turu.

Bu doküman `Monthly-Report-Portal` projesinde uygulanan çözümün genelleştirilmiş
hâlidir. Kod örnekleri kopyalanabilir; `src/Snapshot.gs` gerçek uygulamasıdır.

---

## 1. Önce teşhis: zaman nereye gidiyor?

Tahmin etmeyin, sayın. Üç soru:

| Soru | Nasıl bakılır |
|---|---|
| Açılışta kaç `google.script.run` çağrısı var? | İstemci kodunda sayın |
| Her çağrı ne kadar sürüyor? | Apps Script → **Yürütmeler** ekranı |
| Aynı pahalı iş tekrarlanıyor mu? | `openById`, `getSheets`, `getDataRange` çağrılarını sayın |

Tipik bulgu — bizdeki gerçek durum:

```
getBootstrap()                        1 tur
getPeriodMeta()                       1 tur   ← openById + getSheets
getPeriodChunk() × 6                  6 tur   ← her biri openById + getSheets TEKRAR
                                     ─────
                                      8 ardışık tur
```

İki ayrı israf vardı:

1. **8 ardışık tur.** Her `google.script.run` turunun sabit bir gecikmesi var
   (HTTPS + Apps Script konteyner sevki). Veri hiç okunmasa bile saniyeler.
2. **Aynı işin 7 kez tekrarı.** Her parça çağrısı dosyayı baştan açıp 50 sayfanın
   adını yeniden okuyordu — sadece 8 sayfa okumak için.

Üstüne cache TTL'i 15 dakikaydı; pratikte her ziyaret soğuk cache'e denk geliyordu.

---

## 2. Temel ilke

> **Pahalı iş, kullanıcı beklerken değil, ÖNCEDEN yapılır.**

Dashboard'un hesapladığı sonuç, kaç kişi açarsa açsın **aynı**. O hâlde aynı hesabı
durmadan yeniden yapmanın anlamı yok.

Yemek benzetmesi: müşteri her geldiğinde yemeği baştan pişirmek yerine, önceden
pişirip kapalı kapta tutmak. Müşteri gelince tabağa koymak 30 saniye sürer.

---

## 3. Çözüm: 5 adım

### Adım 1 — Snapshot: sonucu bir kez hesapla, dosyaya yaz

Pahalı hesabı ayrı bir fonksiyona alın ve sonucu saklayın:

```js
function buildSnapshot_() {
  // ... 48 sayfayı oku, ayrıştır, topla ...
  return {
    v: SNAP_VERSION,              // şema sürümü (aşağıda açıklanıyor)
    builtAt: new Date().toISOString(),
    rows: sonuclar                // PİŞMİŞ sonuç — ham satırlar değil
  };
}
```

**Kritik:** Dosyaya ham veriyi değil, **ekranın ihtiyaç duyduğu sonucu** yazın.
Bizde 48 × 350 satırlık ham veri yerine site başına birkaç KB'lık özet var.

**Tekrarı burada kırın.** Eski kodda `openById` + `getSheets` 7 kez çalışıyordu;
snapshot üretiminde dosya **bir kez** açılır, sayfa listesi **bir kez** çıkarılır.

### Adım 2 — `doGet`'e göm: açılışta sıfır tur

En büyük kazanç burada. Snapshot'ı HTML'in içine gömün:

```js
function doGet() {
  var tpl = HtmlService.createTemplateFromFile('Index');
  tpl.preload = jsonForInline_(loadSnapshot_());
  return tpl.evaluate().setTitle('...');
}

/** JSON'u <script> içine gömülebilir hâle getirir. */
function jsonForInline_(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')      // "</script>" metin İÇİNDE geçerse blok kapanır
    .replace(/\u2028/g, '\\u2028')   // JS'te satir sonu sayilir
    .replace(/\u2029/g, '\\u2029');
}
```

`Index.html` içinde, istemci kodundan **önce**:

```html
<script>var PRELOAD = <?!= preload ?>;</script>
```

İstemci tarafı:

```js
function boot() {
  var pre = (typeof PRELOAD !== 'undefined') ? PRELOAD : null;
  if (pre && !pre.error) { render(pre); return; }   // HIZLI YOL — sunucuya gidilmez
  loadFromServer();                                  // YEDEK YOL — eski akış
}
```

Yedek yolu **silmeyin**. Snapshot henüz üretilmemişse (yeni dönem, ilk kurulum)
eski akış devreye girer; bir şey bozulmaz, sadece o seferlik yavaş olur.

### Adım 3 — İki katman: hafif / ağır ayrımı

Her şeyi gömmeyin. Ekranı ilk çizmek için gerekeni gömün, gerisini sonra çekin:

| Katman | İçerik | Nerede |
|---|---|---|
| **overview** | Liste + KPI'lar — ilk ekran için gereken her şey | HTML'e gömülür |
| **details** | Tıklanınca açılan detay (alt tablolar, grafikler) | İlk boyamadan SONRA arka planda |

```js
function useSnapshot(snap) {
  DATA = snap;
  render();                        // ekran hazır
  prefetchDetails(snap.key);       // kullanıcı tıklamadan önce yüklenir
}
```

Kullanıcı detaya inene kadar ağır yarı çoktan gelmiş olur. Gelmediyse panelde
"yükleniyor" yazın — **"veri yok" demeyin**, yanıltıcı olur.

### Adım 4 — Tazelemeyi tetikleyiciye devret

```js
function installSnapshotTrigger() {
  var existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === 'refreshSnapshot') {
      ScriptApp.deleteTrigger(existing[i]);          // önce eskisini sil
    }
  }
  ScriptApp.newTrigger('refreshSnapshot').timeBased().everyHours(1).create();
}
```

**Sıklık nasıl seçilir?** Maliyet hesabı:

| Sıklık | Günlük tetikleyici süresi | Workspace kotası (6 sa/gün) |
|---|---|---|
| Günde 1 | ~1 dk | %0.03 |
| 4 saatte 1 | ~6 dk | %1.7 |
| **Saatte 1** | **~24 dk** | **%6.7** |

Sık çalıştırmanın pratikte maliyeti yok. Asıl soru "veri ne kadar bayat olabilir".
Bizim durumda saatlik seçildi, çünkü kaynak dosya ay içinde de düzeltiliyor.

Üç şeyi birlikte yapın:
- Saatlik (veya uygun sıklıkta) tetikleyici
- Yöneticide **"Yenile"** düğmesi (acil düzeltme için)
- Ekranda **"Veri şu saat itibarıyla (24 dk önce)"** damgası

Damga olmazsa kullanıcı verinin bayat olabileceğini bilmez — bu bir hata kaynağıdır.

**Ölçek notu:** Geçmiş dönemler donmuşsa onları saatte bir yeniden okumayın.
Bizde tetikleyici **yalnız en güncel dönemi** tazeliyor; geçmiş dönemler kayda
girdiğinde bir kez kurulup bir daha okunmuyor. Böylece 5 yıl sonra 60 dönem
biriktiğinde de saatlik maliyet bugünküyle aynı kalıyor.

### Adım 5 — Depo seçimi

| Depo | Sınır | Kalıcı | Ne zaman |
|---|---|---|---|
| `CacheService` | 100 KB/anahtar, 10 MB toplam, **max 6 saat** | ✗ | Hızlı kopya (önde) |
| `PropertiesService` | 9 KB/değer, **500 KB toplam** | ✓ | Küçük ve sabit sayıda veri |
| **Drive'da JSON** | Pratikte sınırsız | ✓ | Büyüyen veri — **önerilen** |

Karar kuralı: **veri zamanla büyüyor mu?**

- Hayır, hep tek bir özet → `PropertiesService` yeter, yeni yetki gerekmez
- Evet (ay/dönem birikiyor) → **Drive**

Bizde her ay yeni bir dönem ekleniyor (yılda 12, her yıl +12) ve hepsi görünür
olmalı. Dönem başına ~120 KB × 60 ay = 7 MB → `PropertiesService`'in 500 KB'ına
sığmaz. Drive'da 12 dönem/yıl × ~250 KB = ~3 MB/yıl, hiç sorun değil.

**Katmanlı kullanın:** kalıcı kopya Drive'da, hızlı kopya cache'te.

```js
function loadSnapshot_(key) {
  var hit = cacheGet_(key);                  // 1) cache
  if (hit && hit.v === SNAP_VERSION) return hit;
  var raw = driveRead_(key);                 // 2) Drive
  if (!raw) return null;
  var obj = JSON.parse(raw);
  if (obj.v !== SNAP_VERSION) return null;   // eski şema → yok say
  cachePut_(key, obj);                       // cache'i tazele
  return obj;
}
```

---

## 4. Tuzaklar — canlıda yaşadıklarımız

Bu bölüm dokümanın en değerli kısmı. Hepsi gerçek, hepsi zaman kaybettirdi.

### 4.1 `DriveApp` dar yetkiyle çalışmaz

```
Specified permissions are not sufficient to call DriveApp.createFolder.
Required permissions: https://www.googleapis.com/auth/drive
```

`DriveApp` **tam** `drive` yetkisi ister — kullanıcının Drive'ının tamamına erişim.
Dar olan `drive.file` ("yalnız bu uygulamanın oluşturduğu dosyalar") sadece
**Drive REST API** ile çalışır.

Çözüm: `DriveApp` yerine `UrlFetchApp` + `ScriptApp.getOAuthToken()`:

```js
function driveApi_(url, options) {
  var opt = options || {};
  opt.muteHttpExceptions = true;                    // hatayı GÖRMEK için şart
  opt.headers = opt.headers || {};
  opt.headers.Authorization = 'Bearer ' + ScriptApp.getOAuthToken();
  var res = UrlFetchApp.fetch(url, opt);
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Drive API ' + code + ': ' + res.getContentText().slice(0, 300));
  }
  return res;
}
```

`appsscript.json`:

```json
"oauthScopes": [
  "https://www.googleapis.com/auth/script.external_request",
  "https://www.googleapis.com/auth/drive.file"
]
```

Dosya yazma (multipart — önce metadata, sonra gövde):

```js
function driveCreateFile_(name, content, parentId) {
  var boundary = '----x' + Date.now();
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
  var res = driveApi_('https://www.googleapis.com/upload/drive/v3/files' +
                      '?uploadType=multipart&fields=id',
    { method: 'post', contentType: 'multipart/related; boundary=' + boundary,
      payload: body });
  return JSON.parse(res.getContentText()).id;
}
```

### 4.2 Drive API Cloud projesinde kapalı olabilir

```
Google Drive API has not been used in project NNNNN before or it is disabled.
```

REST'e doğrudan gidince, Apps Script'in arkasındaki Cloud projesinde o API'nin
**etkin** olması gerekir. Varsayılan projede etkin değildir.

Çözüm — Cloud Console'a girmeden, `appsscript.json`'a ileri servisi ekleyin:

```json
"dependencies": {
  "enabledAdvancedServices": [
    { "userSymbol": "Drive", "serviceId": "drive", "version": "v3" }
  ]
}
```

Apps Script bunu görünce API'yi ilgili Cloud projesinde kendiliğinden açar.
`oauthScopes` açıkça tanımlıysa bu ekleme **tam `drive` yetkisi getirmez** —
dar yetki korunur.

### 4.3 Manifest'e yetki eklemek yeniden sormayı tetiklemeyebilir

Apps Script izin ekranını yalnız **tanıdığı servisler** (`DriveApp`, `GmailApp`…)
için çıkarır. `UrlFetchApp` ile Drive'a gidiyorsanız, `drive.file` manifest'te
yazsa bile kullanıcıya sorulmaz ve token o yetkiyi **taşımaz**. Sonuç: 403.

Kesin kanıt — token'ın gerçekte taşıdığı yetkileri okuyun:

```js
var res = UrlFetchApp.fetch(
  'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' +
  encodeURIComponent(ScriptApp.getOAuthToken()), { muteHttpExceptions: true });
console.log(JSON.parse(res.getContentText()).scope);
```

Eksikse çözüm: **myaccount.google.com/permissions** → uygulamanın erişimini
**kaldır** → herhangi bir fonksiyonu tekrar çalıştır → izin ekranı çıkar.

### 4.4 Ön ek eşleşmesiyle anahtar silmeyin

Bu bizi en çok uğraştıran hataydı ve tamamen kendi kendimize açtığımız bir yaraydı:

```js
var PROP_SNAP_PREFIX = 'RO_DASH_SNAP_';        // eski depo öneki
var PROP_SNAP_INDEX  = 'RO_DASH_SNAP_INDEX';   // ← aynı önekle başlıyor!
var PROP_SNAP_FOLDER = 'RO_DASH_SNAP_FOLDER';  // ← bu da!

// "eski kalıntıları temizle" derken CANLI anahtarları da siliyordu:
if (k.indexOf(PROP_SNAP_PREFIX) === 0) props.deleteProperty(k);
```

Dosyalar Drive'a yazılıyor, hemen ardından **adresleri siliniyordu**. Belirtiler
yanıltıcıydı: yazma testi 5/5 geçiyor, saklanan hata yok, ama "0 snapshot" ve her
çalıştırmada yeni klasör.

Kural: **silme desenini daraltın**, ön ek yetmez.

```js
var LEGACY_KEY = /^RO_DASH_SNAP_\d{4}-\d{2}_/;   // dönem anahtarı şart
if (LEGACY_KEY.test(k)) props.deleteProperty(k);
```

### 4.5 Hatayı yutmayın — özellikle "yoksa yenisini yarat" akışlarında

```js
// KÖTÜ: her hata "dosya yok" sayılır, her çalıştırmada yeni klasör açılır
try { return getFolder(id); } catch (e) { }
return createFolder();

// İYİ: yalnız 404'te yenisini yarat, gerisini yukarı fırlat
try { return getFolder(id); }
catch (e) { if (httpCode(e) !== 404) throw e; }
return findByName() || createFolder();
```

Ayrıca **oluşturmadan önce adıyla arayın** — id kaybolsa bile kopya üretmezsiniz.

### 4.6 "Execution completed" ≠ başarılı

Fonksiyonunuz hatayı `throw` etmek yerine `return { error: ... }` olarak
döndürüyorsa, editörde **her zaman** "Yürütme tamamlandı" yazar. Tetikleyiciden
çağrıldığında dönüş değerini kimse görmez — hata sessizce kaybolur.

İki çözüm birlikte:

```js
// 1) Son hatayı kalıcı sakla
catch (e) {
  PropertiesService.getScriptProperties()
    .setProperty('LAST_STORE_ERR', new Date().toISOString() + '  ' + e.message);
}
// 2) Başarıda temizle
PropertiesService.getScriptProperties().deleteProperty('LAST_STORE_ERR');
```

Ve bir teşhis fonksiyonu yazın (aşağıda).

### 4.7 Diğer sınırlar

- **`CacheService` 100 KB/anahtar.** Aşarsanız sessizce başarısız olur — cache hiç
  tutmaz, siz de fark etmezsiniz. Büyük objeyi parçalayın (`_meta` + `_c0.._cN`).
- **Apps Script yürütme limiti 6 dakika.** Toplu kurulum işlerini parçalayın:
  "tek seferde en fazla 3 dönem, kalanı bir sonraki çağrıda" gibi.
- **Şema sürümü tutun.** `SNAP_VERSION` alanı, siz veri şeklini değiştirdiğinizde
  eski snapshot'ların sessizce yanlış okunmasını önler.

---

## 5. Teşhis fonksiyonu — bunu mutlaka yazın

Tahminle uğraşmak yerine tek çalıştırmada her adımı yazan bir fonksiyon, bizde
saatlerce zaman kazandırdı. Kalıp:

```js
function checkSetup() {
  function log(s) { console.log(s); }
  log('=== kurulum kontrolu ===');

  // 1) Kimlik
  log('Hesap: ' + Session.getActiveUser().getEmail());

  // 2) Token'ın GERÇEKTEN taşıdığı yetkiler  (bkz. 4.3)
  var t = UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v1/tokeninfo' +
    '?access_token=' + encodeURIComponent(ScriptApp.getOAuthToken()),
    { muteHttpExceptions: true });
  log('Yetkiler: ' + JSON.parse(t.getContentText()).scope);

  // 3) Depoya gerçekten yazılabiliyor mu  ← asıl test
  try { log('Klasor: OK — ' + snapFolderId_()); }
  catch (e) { log('Klasor: HATA — ' + e.message); }

  // 4) Kaç snapshot var + son yazma hatası  (bkz. 4.6)
  log('Snapshot: ' + countSnapshots_());
  var err = PropertiesService.getScriptProperties().getProperty('LAST_STORE_ERR');
  if (err) log('Son yazma HATASI: ' + err);

  // 5) Tetikleyiciler kurulu mu
  log('Tetikleyiciler: ' + ScriptApp.getProjectTriggers()
      .map(function (x) { return x.getHandlerFunction(); }).join(', '));

  log('=== bitti ===');
}
```

Buna bir de **izole yazma testi** ekleyin — küçük dosya → geri okuma → güncelleme →
büyük dosya. Sorunun yetki mi, boyut mu, biçim mi olduğunu doğrudan söyler.

İpuçlarını hataya göre ayırın; "her durumda yetki eksik" demek yanlış yere
yönlendirir:

```js
if (msg.indexOf('has not been used in project') !== -1)  /* API kapalı */ ;
else if (msg.indexOf('insufficient authentication') !== -1) /* yetki yok */ ;
else /* beklenmeyen */ ;
```

---

## 6. Doğrulama

Hızlandığını **ölçün**, "hızlı hissettiriyor" demeyin:

```js
// İstemcide, PRELOAD kullanıldığında:
var t0 = performance.now();
boot();
console.log('veri ekranda: ' + Math.round(performance.now() - t0) + 'ms');
```

Ayrıca sayın: açılışta kaç `google.script.run` çağrısı yapıldı? Hedef **0**.

---

## 7. Kontrol listesi

**Teşhis**
- [ ] Açılıştaki `google.script.run` tur sayısı sayıldı
- [ ] Tekrarlanan pahalı çağrılar (`openById`, `getSheets`) tespit edildi

**Uygulama**
- [ ] Pahalı hesap `buildSnapshot_()` içine alındı; kaynak **bir kez** açılıyor
- [ ] Snapshot `doGet` ile HTML'e gömülüyor (`jsonForInline_` kaçışlarıyla)
- [ ] Eski/yedek yükleme yolu **duruyor**
- [ ] overview / details ayrımı yapıldı
- [ ] Tetikleyici kuruldu; geçmiş/donmuş veri yeniden okunmuyor
- [ ] Yöneticide "Yenile" düğmesi var
- [ ] Ekranda "veri şu saat itibarıyla" damgası var
- [ ] Depo büyüme durumuna göre seçildi (Properties / Drive)
- [ ] `SNAP_VERSION` şema sürümü var

**Sağlamlık**
- [ ] Silme desenleri dar (ön ek eşleşmesi yok)
- [ ] Hatalar yutulmuyor; yalnız 404'te yeniden oluşturuluyor
- [ ] Son yazma hatası kalıcı saklanıyor
- [ ] `checkSetup()` ve izole yazma testi yazıldı
- [ ] Cache 100 KB üstü için parçalanıyor

**Doğrulama**
- [ ] Açılış süresi ölçüldü
- [ ] Açılıştaki sunucu turu sayısı 0

---

## 8. Bu çözümün getirmediği şeyler

Dürüst olmak gerekirse:

- **Veri artık canlı değil.** En fazla bir tetikleyici aralığı kadar bayat olabilir.
  Damga + Yenile düğmesi bunu yönetilebilir kılar, ama ortadan kaldırmaz.
  Saniye saniye canlı veri gerekiyorsa bu yaklaşım uygun değildir.
- **Bir bileşen daha var.** Snapshot üretimi, depolama ve onarım — bakımı olan
  yeni bir katman. Teşhis fonksiyonu bu yüzden isteğe bağlı değil.
- **İlk kurulum birkaç adım.** Yetki, API etkinleştirme, tetikleyici, ilk snapshot.
  Bir kerelik, ama dokümante edilmeli.

Veri kaybı riski **yoktur**: snapshot türetilmiş bir sonuçtur, kaynağa hiçbir şey
yazılmaz. Dosya silinse bile kaynaktan yeniden hesaplanır.

---

## Kaynak

Gerçek uygulama: `Monthly-Report-Portal` → `src/Snapshot.gs`, `src/Code.gs`
(`doGet` + `jsonForInline_`), `src/Script.html` (`boot`, `useSnapshot`,
`unpackSite`, `prefetchDetails`).
