# Kullanıcı Çipi — Ad / Rol / RO-Site

Kaynak: `Monthly-Report-Portal`, RO Monthly Report panosu (`src/Index.html`,
`src/Script.html`, `src/Stylesheet.html`, `src/Feedback.gs`).

Üst barın sağ ucunda, giriş yapmış kullanıcıyı üç satırda gösteren çip:

```
┌────┐  Resul AKBULUT        ← ad soyad (soyad BÜYÜK)
│ RA │  Project Manager P1   ← dizinden gelen unvan
└────┘  PDE-Bursa            ← RO kodu + site adı
```

**Neden var:** çok siteli bir panoda "ben kimim, hangi organizasyonun verisine
bakıyorum" sorusu her açılışta sorulur. E-posta adresi bu soruyu cevaplamaz;
unvan ve RO-site cevaplar. Aynı ekranı 48 site kullanıyorsa, kullanıcının
kendi bağlamını görmesi yanlış RO'ya bakıp yanlış yorum yapmayı engeller.

---

## 1. Değişmez Kurallar

1. **Kimlik sunucudan gelir, istemciden değil.** Ad/unvan/konum
   `Session.getActiveUser()` + dizin araması ile SUNUCUDA çözülür. İstemci
   yalnız çizer. Bir kullanıcının kendi unvanını tarayıcıdan değiştirebilmesi
   kimlik gösterimini anlamsız kılardı.
2. **Dizin araması ASLA zorunlu bağımlılık değildir.** API kapalı, kota dolmuş
   veya dizin paylaşımı kapalıysa ekran yine açılır; ad e-postadan türetilir.
   Kimlik çipi bir kolaylıktır, panonun çalışma şartı değil.
3. **Bulunamayan satır HİÇ çizilmez.** Unvan yoksa o satır yok; "—" veya
   "Unknown" yazılmaz. Boş yer tutucu, eksik veriyi varmış gibi gösterir.
4. **E-posta çipte yazılmaz**, `title` (tooltip) olarak durur. Uzun adresler
   üst barın hizasını bozar, üstelik kimseye bir şey anlatmaz.
5. **Soyadı büyütürken `toUpperCase()` kullanılır, `toLocaleUpperCase()` değil.**
   Türkçe `i → İ` kuralı soyadları bozar (`Yilmaz → YİLMAZ`).

---

## 2. Sunucu: kimliği çöz

Manifest (`appsscript.json`) — People ileri servisi + dizin kapsamı:

```json
{
  "dependencies": {
    "enabledAdvancedServices": [
      { "userSymbol": "People", "serviceId": "peopleapi", "version": "v1" }
    ]
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/directory.readonly",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
}
```

```js
/**
 * Giris yapan kullanici. Dizin aramasi patlarsa (API kapali, kota, yetki)
 * ekran acilmaya devam etmeli: yedek ada dusuluyor.
 */
function currentUser_() {
  var email = '';
  try { email = Session.getActiveUser().getEmail() || ''; } catch (e) { email = ''; }
  if (!email) return { email: '', name: '', title: '', source: 'none' };

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
```

Dizin araması (önbellekli):

```js
var DIR_CACHE_REV = 2;   /* directoryPerson_ donus SEKLI degisirse arttir */

function directoryPerson_(email) {
  var cache = CacheService.getScriptCache();
  /* Anahtarda SURUM var: donus sekli degisince eski kayitlar kendiliginden
     gecersiz olur. Bu olmadan sekil degisikliginden sonra saatlerce eski
     (eksik alanli) kayit servis ediliyor. */
  var key = 'dir' + DIR_CACHE_REV + '_' + Utilities.base64EncodeWebSafe(email).slice(0, 80);
  try {
    var hit = cache.get(key);
    if (hit) return hit === 'NONE' ? null : JSON.parse(hit);
  } catch (e) {}

  var out = null;
  try {
    /* People ileri servisi kurulu degilse burada ReferenceError olur —
       yakalanip e-postadan turetmeye dusuluyor. */
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
        var nm  = (people[i].names || [])[0] || {};
        var org = (people[i].organizations || [])[0] || {};
        out = { name: nm.displayName || '', title: org.title || '',
                department: org.department || '',
                locs: locationCandidates_(people[i]) };
        break;
      }
    }
  } catch (e) { out = null; }   /* yetki yok / servis kapali / dizin kapali */

  try { cache.put(key, out ? JSON.stringify(out) : 'NONE', 21600); } catch (e) {}
  return out;
}
```

**Dizin araması `query` ile yapılır, `people/<id>` ile değil**: uygulamanın
elinde kullanıcının dizin kimliği yoktur, yalnız e-posta adresi vardır. Dönen
listede e-posta **birebir** eşleşen kişi seçilir — arama benzer adları da
döndürür, ilkini almak yanlış kişiyi gösterir.

### Konum tek bir alanda DEĞİL

Canlı teşhiste `organizations[].location` `"desk"` döndü — bu konumun *değeri*
değil *tipi*. Gerçek değer (`"BUR1 - BURSA 1A"`) `locations[].value` içinde.
Hangi alanın dolu olduğu hesaba göre değiştiği için tahmin yürütmek yerine
**tüm adaylar toplanıp sırayla denenir**:

```js
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
```

### Konum → RO/Site eşlemesi

Aday metinler normalize edilip (büyük harf, boşluk/noktalama atılmış) proje
kendi site kaydında aranır:

```js
/* "BUR1 - BURSA 1A" -> "BUR1BURSA1A"; icinde "BURSA1" gecer -> Bursa 1 */
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
  if (hits.length === 1) {
    return { ro: hits[0].ro, site: hits[0].site, key: hits[0].key };
  }
  if (hits.length > 1) return null;   /* ayni sehirde birden fazla site -> TAHMIN YOK */
  return null;
}
```

**İki kural burada gizli:**

- **Birden fazla eşleşme = eşleşme yok.** Aynı şehirde iki tesis varsa
  (`Bursa 1`, `Bursa 2`) dizin metni ikisine de uyabilir. Böyle bir durumda
  çipte yanlış site yazmaktansa **hiç yazmamak** doğrudur — kullanıcı yanlış
  bağlamda olduğunu fark edemez, eksik bağlamda olduğunu fark eder.
- **En az 4 karakterlik ad eşleşmesi.** Kısa kodlar (`AVC`, `THS`) bina/masa
  kodlarının içinde rastlantısal olarak geçer.

> **Uyarlama noktası:** `SITE_REGISTRY` yerine kendi projenizin
> organizasyon tablosunu koyun (departman listesi, fabrika listesi, takım
> listesi — kavram aynı). Eşleşme **içerme** ile yapılır çünkü dizindeki
> metin site adının yanında bina/kat kodu da taşır.

Kimlik `doGet` ön-yükleme (boot) paketine tek alan olarak eklenir:

```js
return { /* … */ isAdmin: isAuthorizedAdmin_(), user: currentUser_() };
```

---

## 3. İstemci: çizim

```html
<div class="userchip" id="userChip" hidden>
  <!-- Uc satir: ad / rol / RO-site. Rol ve RO-site yan yanayken ikinci
       satir addan cok uzun kaliyor ve hiza bozuk gorunuyordu. -->
  <span class="uc-avatar" id="ucAvatar" aria-hidden="true"></span>
  <span class="uc-text"><b id="ucName"></b><i id="ucSub"></i><i id="ucSite"></i></span>
</div>
```

```js
function formatUserName(name){
  var parts=String(name||'').trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return '';
  return parts.map(function(p,i){
    /* toUpperCase (toLocale... degil): Turkce i->I kurali soyadi bozmasin */
    return i===0?p:p.toUpperCase();
  }).join(' ');
}

function userInitials(name,email){
  var parts=String(name||'').trim().split(/\s+/).filter(Boolean);
  if(parts.length>=2) return (parts[0][0]+parts[parts.length-1][0]).toUpperCase();
  if(parts.length===1) return parts[0].slice(0,2).toUpperCase();
  return String(email||'?').slice(0,2).toUpperCase();
}

/* Bulunamayan satir HIC gosterilmez — bos yer tutucu eksik veriyi
   varmis gibi gosterir. */
function setChipLine(id,html){
  var el=$(id); if(!el) return;
  el.innerHTML=html||''; el.hidden=!html;
}

function renderUserChip(){
  if(!BOOT||!BOOT.user||!BOOT.user.email){ $('userChip').hidden=true; return; }
  var u=BOOT.user, site=findUserSite();
  $('ucName').textContent=formatUserName(u.name)||u.email;
  setChipLine('ucSub',  u.title ? esc(u.title) : '');
  setChipLine('ucSite', site ? esc(site.ro+'-'+siteShortName(site.site)) : '');
  $('userChip').title=u.email;          /* e-posta yer kaplamasin */
  $('ucAvatar').textContent=userInitials(u.name,u.email);
  $('userChip').hidden=false;
}
```

`renderUserChip()` **boot verisi geldikten sonra** bir kez çağrılır; site
bilgisi dönem verisine bağlıysa (aşağıdaki yedek yol) dönem yüklendikten sonra
bir kez daha çağrılabilir — fonksiyon yeniden çizime dayanıklıdır.

### Site bulmanın iki yolu — sıra bilinçli

```js
function findUserSite(){
  var g=BOOT&&BOOT.user&&BOOT.user.siteGuess;
  if(g) return {ro:g.ro,site:g.site};   /* 1) Google dizini: KALICI kaynak */
  return findUserSiteInHR();            /* 2) veri icindeki isim eslesmesi */
}
```

İkinci yol (veri sayfalarındaki kişi listesinde ad eşleştirmek) **geçici bir
yedektir**: o liste ileride isim değil yalnız sayı tutacak. O gün geldiğinde
kod kırılmaz, yalnız bu dal boş döner ve çip iki satıra iner. Kalıcı olmayan
bir kaynağa birincil olarak bağlanmamak bilinçli bir karardır.

---

## 4. Stil

```css
.userchip{display:flex; align-items:center; gap:11px; padding-left:6px}
/* Satir yuksekligi 1.22 — uc satir 62px'lik bara sigsin diye. */
.uc-text{display:flex; flex-direction:column; align-items:flex-start;
         line-height:1.22; min-width:0}
.uc-text b{font-size:13.5px; font-weight:700; color:#fff; white-space:nowrap}
.uc-text i{font-size:11.5px; font-style:normal; color:rgba(255,255,255,.62);
           white-space:nowrap}
.uc-text i#ucSite{color:rgba(255,255,255,.5); font-weight:600; letter-spacing:.02em}
.uc-avatar{
  width:36px; height:36px; border-radius:50%; flex:none;
  display:flex; align-items:center; justify-content:center;
  font-size:13px; font-weight:800; letter-spacing:.02em; color:#fff;
  background:linear-gradient(140deg,#e8497f,#c92a68);
  box-shadow:0 2px 8px -2px rgba(0,0,0,.45);
}
/* Dar ekranda yalniz avatar kalir: uc satir metin ust bari tasirir. */
@media (max-width:768px){ .userchip .uc-text{display:none} }
```

**Neden üç ayrı satır:** rol ve RO-site tek satırda yan yana yazıldığında o
satır addan çok daha uzun kalıyor ve üstteki ad hizasız görünüyordu (kullanıcı
geri bildirimi). Alt alta üç satır, sol kenardan hizalı okunur.

**Avatar rengi:** kurumsal mavi ile karışmaması için ayrı bir vurgu tonu
kullanılır. Marka mavisi eylem/aktif öğe için ayrılmıştır; avatar tıklanabilir
bir şey değildir (bkz. `docs/renkler.md`).

**Erişilebilirlik:** baş harfler dekoratiftir (`aria-hidden="true"`) — ekran
okuyucu "RA" harflerini değil, yanındaki gerçek adı okur.

---

## 5. Sık Yapılan Hata

| Hata | Sonuç | Doğrusu |
|---|---|---|
| Dizin aramasını `try/catch`siz çağırmak | People servisi kurulu değilse **tüm pano** açılmaz (ReferenceError) | Her dizin çağrısı yakalanır, yedek ada düşülür |
| Önbellek anahtarına sürüm koymamak | Dönüş şekli değişince saatlerce eski/eksik kayıt servis edilir | Anahtarda `DIR_CACHE_REV` |
| Arama sonucunun ilkini almak | Benzer adlı başka kişi gösterilir | E-posta birebir eşleşmesi aranır |
| Eksik satıra `—` yazmak | Eksik veri, var olan veri gibi görünür | Satır hiç çizilmez |
| `toLocaleUpperCase()` | Türkçe `i → İ`, soyadlar bozulur | `toUpperCase()` |
| Konumu tek alandan okumak | Hesapların bir kısmında site boş çıkar | Tüm aday alanlar toplanır, sırayla denenir |

---

## 6. Kontrol Listesi

- [ ] `appsscript.json` içinde People ileri servisi + `directory.readonly`
- [ ] `currentUser_()` boot paketine `user` alanı olarak ekli
- [ ] Dizin araması önbellekli, anahtarda sürüm var
- [ ] Dizin yokken ad e-postadan türüyor, pano açılıyor
- [ ] Unvan/RO-site yoksa o satır çizilmiyor
- [ ] E-posta yalnız `title` içinde
- [ ] `≤768px`'te yalnız avatar kalıyor
- [ ] Soyadı `toUpperCase()` ile büyüyor
