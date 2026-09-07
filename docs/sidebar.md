# Sidebar & Gezinme Standardı (Sidebar, Favoriler, Komut Paleti)

## Kaynak Durumu

- **Bursa CV Projects:** olgun, veri-güdümlü, 35+ sayfayı gruplu/flyout menüyle yöneten bir
  sistem. Bu dokümanın esas kaynağı.
- **ValeoDashboard:** statik, sabit 3 `<nav-item>`'lık bir `<aside>` — grup yok, flyout yok,
  aktif-durum mantığı yok, veri kaynaklı değil. Küçük/prototip uygulamalar için yeterli ama
  **jenerik bir standart olarak taşınabilir değil**; büyüyecek bir uygulama Bursa CV
  Projects'in desenini kullanmalı.

## Veri Modeli — Tek Kaynaktan Türeyen Menü

Sidebar, sayfa başına elle yazılan HTML değil, **tek bir veri yapısından** üretilir
(`JavaScript.html` → `SIDEBAR_MENU`). Grup/alt-sayfa ilişkisi ve aktif rota eşlemesi bu
diziden **otomatik türer** — ikinci bir liste tutulmaz:

```js
var SIDEBAR_MENU = [
  { id: 'MyTask',    label: 'Bugün',     short: 'Bugün',     icon: ICONS.mytask,    color: '#F579BA' },
  { id: 'Dashboard', label: 'Dashboard', short: 'Dashboard', icon: ICONS.dashboard, color: '#96A5B9' },
  { divider: true },
  { id: 'Projeler', label: 'Projeler', short: 'Projeler', icon: ICONS.project, color: '#62A6FA', children: [
    { id: 'BCSahara',      label: 'Project List' },
    { id: 'ProjectDetail', label: 'Proje Detayı' },
    { id: 'PhaseTracking', label: 'Faz Takibi' },
    { id: 'PlanSapmasi',   label: 'Plan Sapması' }
  ]},
  // ... diğer gruplar
];

// PAGE_TO_GROUP, SIDEBAR_MENU'den ÜRETİLİR — elle yazılmaz.
var PAGE_TO_GROUP = {};
var ALL_PAGE_KEYS = [];
SIDEBAR_MENU.forEach(function(item) {
  if (item.divider) return;
  if (item.children) {
    item.children.forEach(function(child) {
      PAGE_TO_GROUP[child.id] = item.id;
      ALL_PAGE_KEYS.push(child.id);
    });
  } else {
    ALL_PAGE_KEYS.push(item.id);
  }
});
```

Her öğe: `id` (rota anahtarı) · `label` (tam etiket, flyout/breadcrumb'ta) · `short` (dar
ikon modunda görünen kısa etiket) · `icon` (inline SVG, `currentColor` ile boyanır — kaynağı
`docs/ikonlar.md`: `ICONS` nesnesi Lucide'dan seçilen ikonlarla doldurulur, Bursa CV
Projects'in özel SVG'leri birebir taşınmaz) · `color` (o grubun aktif/hover vurgu rengi,
`--item-color` CSS değişkenine yazılır) · `children[]` (varsa grup, yoksa yaprak sayfa) ·
`divider: true` (görsel ayırıcı, id'siz).

**Yeni bir sayfa eklerken:** `SIDEBAR_MENU`'ye bir satır eklenir; `PAGE_TO_GROUP` ve
`ALL_PAGE_KEYS` kendiliğinden güncellenir. Grup id'si ile sayfa id'si **çakışamaz** (bkz.
kaynak `CLAUDE.md`) — bu yüzden bazı gruplar `SalesGrp` gibi sayfa id'sinden ayrışan adlar
taşıyor.

## Sabit İkon Modu + Flyout (Genişleyen Sidebar DEĞİL)

Sidebar her zaman dar/ikon modunda durur (`--sidebar-closed: 64px`); genişleyip daralan
eski davranış kaldırıldı (`toggleSidebarMobile()` artık boş fonksiyon — geriye dönük
çağrılar kırılmasın diye duruyor, işlevi yok). Bunun yerine bir **grup başlığına tıklanınca
yandan 200px'lik bir flyout listesi açılır** ve ana içerik masaüstünde bu kadar sağa itilir:

```js
function toggleGroup(groupId) {
  var flyout = document.getElementById('flyout-' + groupId);
  var isOpen = flyout.classList.contains('visible');
  closeAllFlyouts();
  if (!isOpen) {
    flyout.classList.add('visible');
    if (window.innerWidth > 768) {
      document.getElementById('main-content').style.marginLeft = 'calc(var(--sidebar-closed) + 200px)';
      document.getElementById('main-content').style.width = 'calc(100% - var(--sidebar-closed) - 200px)';
    }
  }
}
```

Kurallar:
- **Aynı anda tek flyout açık** — `closeAllFlyouts()` her açılıştan önce diğerlerini kapatır.
- **Dışarı tıklayınca kapanır** — `initSidebar()` döküman genelinde `#sidebar` ve
  `#sidebar-flyouts` dışını dinler.
- **Dar ekranda (≤768px) flyout açılmaz** — 220px'lik liste + sidebar, 390px'lik bir ekranın
  %73'ünü kaplayıp tabloyu örtüyordu; `keepGroupOpen()` bu eşiği kontrol eder.
- İçerik alanı flyout tarafından **örtülmez, itilir** (`margin-left`/`width` hesabı) —
  masaüstünde bu güvenli, mobilde hiç uygulanmaz.

## Adaptif Navigasyon Katmanları (2026-08-18 kararı, M3 referansı)

M3 referans materyaliyle (Gemini Notebook, karar-girdisi PDF'ler) karşılaştırma sonucu bu
depo M3'ün 3-katmanlı adaptif navigasyon modeline **tam geçti** — ama pratikte bu, yukarıdaki
sistemi baştan yazmak değil, onu M3'ün 3 breakpoint katmanına **resmi olarak eşlemek** ve
bugüne kadar hiç tanımlanmamış olan **dar-ekran katmanını doldurmak** anlamına geliyor:

| M3 katmanı | Bu depoda karşılığı | Durum |
|---|---|---|
| Navigation Rail (tablet, 600-839dp) / Navigation Drawer (masaüstü, ≥840dp) | Mevcut sabit `#sidebar` (64px, `--sidebar-closed`) + grup tıklanınca açılan 200px flyout | **Zaten karşılığı var** — genişlik M3'ün önerdiği 72-96dp aralığının biraz altında ama işlevsel olarak eşdeğer, **değiştirilmedi** (görsel kimlik kararına bkz. `bilesenler.md`: sayısal M3 önerileri yalnız gerçek bir boşluğu dolduruyorsa kabul edilir, salt "M3 öyle diyor" diye piksel değiştirilmiyor). |
| Bottom Navigation Bar (mobil, <768px — mevcut `keepGroupOpen()` eşiği) | **Yoktu** — kod yalnız "dar ekranda flyout açılmaz" diyordu, yerine geçen bir mekanizma tanımlanmamıştı. | **Yeni eklendi** (aşağıda) — bu gerçek bir boşluğu dolduruyor, kozmetik bir değişiklik değil. |

### Mobil Alt Navigasyon Çubuğu (yeni)

**Varsayılan (2026-08-29 kararı):** bu blok yeni bir projeye taşınırken **her zaman** kurulur
— masaüstü sidebar'ı statik veya `SIDEBAR_MENU` veri-güdümlü olsun fark etmez. Atlamak için
kullanıcının özellikle "mobilde de sidebar kalsın" gibi bir tersine çevirme talebi olması
gerekir; sessizce atlanmaz. Detay: `baslarken.md` madde 3, `CLAUDE.md` Kalıcı Kararlar.

`≤768px`'te (`toggleGroup()`'un flyout'u zaten kapattığı eşik) sidebar tamamen gizlenir,
yerine ekran altında sabit bir çubuk açılır. En fazla **5 üst-düzey hedef** gösterir — bu
sınır rastgele değil, favoriler mini-şeridiyle (`_SM_RAIL_MAX = 5`, bkz. yukarısı) aynı sayı;
altıncı slot her zaman site haritasını açan 🗺 düğmesidir (aynı `toggleSiteMap()` — ikinci bir
"daha fazla" mekanizması icat edilmedi):

```css
@media (max-width: 768px) {
  #sidebar, #sm-rail { display: none; }   /* dar ekranda ikisi de yerini bottom-nav'a bırakır */
  #bottom-nav {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 200;
    display: flex; height: 56px;
    background: var(--valeo-navy); border-top: 1px solid rgba(255,255,255,0.08);
  }
  .bn-item {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 2px; color: rgba(255,255,255,0.6); font-size: 9px; font-weight: 600;
  }
  .bn-item.active { color: var(--item-color, var(--valeo-green)); }
  .bn-item svg { width: 20px; height: 20px; fill: currentColor; }
}
@media (min-width: 769px) { #bottom-nav { display: none; } }  /* masaüstü/tablette hiç render edilmez */
```

```js
function renderBottomNav() {
  var topLevel = SIDEBAR_MENU.filter(function(i) { return !i.divider; }).slice(0, 5);
  var html = topLevel.map(function(item) {
    var on = item.id === AppState.currentPage || PAGE_TO_GROUP[AppState.currentPage] === item.id;
    return '<div class="bn-item' + (on ? ' active' : '') + '" data-page="' + item.id + '" style="--item-color:' + item.color + '">'
      + item.icon + '<span>' + item.short + '</span></div>';
  }).join('');
  html += '<div class="bn-item" onclick="toggleSiteMap()">🗺<span>Tümü</span></div>';
  document.getElementById('bottom-nav').innerHTML = html;
}
```

Kaynak veri **aynı** `SIDEBAR_MENU` — ikinci bir menü tanımı yok (bu dokümanın baştaki
ilkesiyle tutarlı). Gruplu sayfalar bottom-nav'da açılmaz (flyout mobilde zaten kapalı); bir
gruba dokunmak doğrudan o grubun ilk alt-sayfasına gider ya da (grup boşsa) site haritasını
açar — tıpkı flyout'un masaüstünde yaptığı gibi ikinci bir tıklama seviyesi eklenmez.

## Aktif Sayfa & Breadcrumb — Aynı Kaynaktan

```js
function updateSidebarActive(pageKey) {
  document.querySelectorAll('.sidebar-item, .sidebar-flyout-item, .sidebar-group-header')
    .forEach(function(el) { el.classList.remove('active'); });
  document.querySelectorAll('[data-page="' + pageKey + '"]')
    .forEach(function(el) { el.classList.add('active'); });
  var groupId = PAGE_TO_GROUP[pageKey];
  if (groupId && groupId !== pageKey) {
    var grpHdr = document.querySelector('[data-group="' + groupId + '"]');
    if (grpHdr) grpHdr.classList.add('active');
  }
}
```

Breadcrumb (`updateBreadcrumb`) da `SIDEBAR_MENU` + `PAGE_TO_GROUP`'tan üretilir — **ikinci
bir menü tanımı yok**. Bir sayfa bu diziden bulunamıyorsa (`PAGE_LABEL_EXTRA`'da özel eşleme
yoksa) breadcrumb ham `pageKey`'i yazar; yeni sayfa eklerken etiketin doğru göründüğünü
kontrol et.

## CSS İskeleti

```css
#sidebar {
  position: fixed; top: var(--header-height); left: 0;
  width: var(--sidebar-closed); height: calc(100vh - var(--header-height));
  background: var(--valeo-navy);
  display: flex; flex-direction: column;
}
.sidebar-item {
  position: relative;   /* rozet çapası — position:fixed olan #sidebar'a değil buna tutunsun */
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 8px 2px 6px; color: rgba(255,255,255,0.6); cursor: pointer;
}
.sidebar-item.active {
  background: rgba(255,255,255,0.07);
  color: var(--item-color, var(--valeo-green));
  box-shadow: inset 3px 0 0 var(--item-color, var(--valeo-green));
}
.sidebar-icon svg { width: 20px; height: 20px; fill: currentColor; color: var(--item-color, rgba(255,255,255,0.55)); }
.sidebar-label { font-size: 9px; font-weight: 600; text-align: center; max-width: 60px; opacity: 0.75; }

.sidebar-flyout {
  display: none; position: fixed; left: var(--sidebar-closed); top: var(--header-height); bottom: 0;
  width: 200px; background: #162035; z-index: 199; overflow-y: auto;
}
.sidebar-flyout.visible { display: block; }
.sidebar-flyout-item { display: block; padding: 9px 16px; color: rgba(255,255,255,0.75); cursor: pointer; }
.sidebar-flyout-item.active { color: var(--valeo-green); font-weight: 600; }
```

`--item-color` her grup/sayfa için `SIDEBAR_MENU`'deki `color` alanından satır-içi stil ile
set edilir — ikon, aktif kenarlık ve flyout vurgusu hepsi aynı değişkeni okur, üç ayrı yerde
renk eşleşmesi bakımı gerekmez.

## Site Haritası (Ctrl+M) — İkinci Menü Değil

Sağdan açılan "site haritası" paneli de içeriğini `SIDEBAR_MENU`'den türetir; ayrı bir sayfa
listesi tutulmaz. Kenardan çekme jesti kasıtlı olarak yok — GAS'ın iframe'i içinde tarayıcının
geri-git jestiyle çakışıyordu.

## Favoriler — İki Parçalı Sistem

Favoriler tek bir yerde değil, **iki tamamlayıcı yüzeyde** yaşar: site haritası panelindeki
yıldız + panelin üstünde sıralanan liste, ve ekranın sağ kenarında **her zaman görünen** bir
mini şerit. İkisi de aynı `_smFav` dizisini okur/yazar — ikinci bir favori listesi yok.

### Mini Favori Şeridi (`#sm-rail`) — Her Zaman Görünür

Ekranın sağ kenarında, sabitlenen sayfalara **tek tıkla** geçiş için dar dikey bir şerit
(kenardan çekme jestinin YERİNE geçti — GAS'ın iframe'i içinde tarayıcının geri-git jestine
takılıyordu):

```css
#sm-rail {
  position: fixed; top: var(--header-height); right: 0; bottom: 0;
  width: var(--rail-w); z-index: 60;
  background: var(--card-bg); border-left: 1px solid var(--border);
  display: flex; flex-direction: column; align-items: center;
  padding: 8px 0 10px; gap: 4px;
}
.sm-rail-item {
  width: 30px; min-height: 26px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-family: monospace; font-weight: 700;
  color: var(--valeo-gray-mid); cursor: pointer;
  border: 1px solid transparent; background: transparent;
}
.sm-rail-item:hover { background: rgba(0,87,168,0.10); color: var(--valeo-blue); }
.sm-rail-item.on { background: rgba(120,190,32,0.20); color: var(--text); border-color: rgba(120,190,32,0.55); }
```

```js
var _SM_RAIL_MAX = 5;   // fazlası panelden erişilir, şerit kalabalıklaşmaz

function _smRenderRail() {
  var rail = document.getElementById('sm-rail');
  var byId = {}; _smPages().forEach(function(p) { byId[p.id] = p; });
  var favs = _smFav.map(function(id) { return byId[id]; }).filter(Boolean).slice(0, _SM_RAIL_MAX);
  var html = favs.map(function(p) {
    var on = p.id === AppState.currentPage;
    return '<button class="sm-rail-item' + (on?' on':'') + '" data-smgo="' + p.id + '"'
      + ' title="' + p.label + '"' + (on ? ' aria-current="page"' : '') + '>'
      + (p.numLabel || p.label.slice(0,3)) + '</button>';
  }).join('');
  // favori yoksa ipucu; en altta her zaman "site haritasını aç" düğmesi
  rail.innerHTML = html + '<button id="sm-rail-open" onclick="toggleSiteMap()">🗺</button>';
}
```

Favori yoksa şerit boş kalmaz — panelden yıldızla sabitleme ipucu gösterilir (`.sm-rail-hint`).
Şerit **mobilde 0 genişliğe** düşer (`--rail-w` token'ı, bkz. `tokens/colors-bursa-cv-projects.css`
komşusu layout değişkenleri) — dar ekranda yer açmak için tercih edildi, panel yine erişilebilir.

### Site Haritası Paneli — Sabitlenenler + Son Ziyaret + Tam Liste

```css
#sm-overlay { position: fixed; inset: 0; z-index: 9997; background: rgba(10,16,30,0.40); display: flex; justify-content: flex-end; }
#sm-panel {
  width: min(348px, 90vw); background: var(--card-bg); border-left: 1px solid var(--border);
  box-shadow: -14px 0 40px rgba(0,0,0,0.26); display: flex; flex-direction: column;
  animation: smIn 0.18s ease-out;
}
@keyframes smIn { from { transform: translateX(100%); } to { transform: none; } }
#sm-searchwrap { padding: 10px 12px 6px; }
#sm-search { width: 100%; box-sizing: border-box; padding: 8px 12px; font-size: 13px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; }
#sm-list { flex: 1; overflow-y: auto; padding: 4px 8px 10px; }
.sm-sec { font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: var(--valeo-gray-mid); font-weight: 700; padding: 11px 8px 4px; }
.sm-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 7px; cursor: pointer; font-size: 12.5px; }
.sm-row:hover { background: rgba(0,87,168,0.09); }
.sm-row.on { background: rgba(120,190,32,0.18); font-weight: 600; }
.sm-star {
  flex: none; font-size: 12px; padding: 2px 4px; border: 0; background: transparent; cursor: pointer;
  color: var(--valeo-gray-mid); opacity: 0; border-radius: 4px;
}
.sm-row:hover .sm-star, .sm-star.on { opacity: 1; }
.sm-star.on { color: var(--valeo-warning, #F59E0B); }
```

Panel içeriği üç bölüm (arama kutusu boşken yalnız ilk ikisi görünür):
1. **Sabitlenenler** — `_smFav` sırasıyla.
2. **Son Ziyaret Edilenler** — `_smRecent` (en fazla `_SM_MAX_RECENT`), favorilerde olanlar
   tekrar listelenmez.
3. **Tüm Sayfalar** — `SIDEBAR_MENU`'den grup grup, her satırda bir ★/☆ yıldız butonu.

```js
function _smToggleFav(pageId) {
  var i = _smFav.indexOf(pageId);
  if (i >= 0) _smFav.splice(i, 1); else _smFav.push(pageId);
  _smRender(); _smRenderRail();          // her iki yüzey de anında güncellenir
  google.script.run
    .withSuccessHandler(function(ok) { if (ok === false) showToast('Favori kaydedilemedi — bu oturumda geçerli.', 'error'); })
    .withFailureHandler(function() { showToast('Favori kaydedilemedi — bu oturumda geçerli.', 'error'); })
    .saveUserPref('favPages', _smFav.join(','));
}
```

**Kalıcılık:** `saveUserPref('favPages', ...)` ile **sunucuya** yazılır (GAS kısıtı —
`localStorage` yok, bkz. `koyu-mod.md`'deki aynı desen). Yazma başarısız olursa favori o
oturumda çalışmaya devam eder ama kalıcı olmaz — kullanıcıya toast ile bildirilir, sessizce
yutulmaz. Bu, kullanıcı başka bir bilgisayarda açtığında da favorilerin durması demek (hesaba
bağlı, cihaza değil).

**Tıklama delegasyonu tek dinleyicide:** panel içindeki yıldız ve satır tıklamaları TEK
`document` seviyesi `click` dinleyicisinde ayrıştırılır (`[data-smfav]` vs `[data-smgo]`) —
her satıra ayrı `onclick` yazılmaz, panel her açılışta yeniden oluşturulsa da dinleyici tek.

**Kısayol:** Ctrl+M panel açar/kapatır; komut paletiyle (Ctrl+K) **karışmaz** — palet açıkken
kendi Escape'ini yönetir, site haritası ona müdahale etmez.

## Komut Paleti (Ctrl+K) — Sayfa + Ref + Eylem Tek Aramada

Site haritası "gözat", komut paleti "ara" içindir — ikisi ayrı ihtiyaç, ayrı bileşen.
Ortalanmış, VS Code/Spotlight tarzı bir arama kutusu; **üç farklı sonuç türünü** aynı listede
gruplayarak gösterir:

```css
#cp-overlay {
  position: fixed; inset: 0; z-index: 9998;
  background: rgba(10,16,30,0.45);
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 12vh;
}
#cp-box {
  width: min(520px, calc(100vw - 32px));
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.30);
  display: flex; flex-direction: column; max-height: 66vh; overflow: hidden;
}
#cp-inwrap { display: flex; align-items: center; gap: 8px; padding: 11px 13px; border-bottom: 1px solid var(--border); }
#cp-caret { color: var(--valeo-green); font-weight: 700; }
#cp-input { flex: 1; border: 0; outline: none; background: transparent; font-size: 14px; color: var(--text); }
#cp-list { overflow-y: auto; padding: 4px 0; }
.cp-sec { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--valeo-gray-mid); padding: 8px 13px 3px; }
.cp-row { display: flex; align-items: center; gap: 9px; padding: 6px 13px; cursor: pointer; font-size: 13px; }
.cp-row.on { background: rgba(120,190,32,0.14); }
.cp-empty { padding: 18px 13px; color: var(--valeo-gray-mid); font-size: 13px; }
#cp-foot { display: flex; gap: 14px; padding: 7px 13px; border-top: 1px solid var(--border); font-size: 10px; color: var(--valeo-gray-mid); }
```

**Üç grup, sabit öncelik sırası** (`_cpBuild(q)`): **Referans** (boş sorguda hiç gösterilmez,
yazıldıkça en fazla 6 eşleşme) → **Sayfa** (etiket + sayfa id + grup adı + eski numarasında
arar, boş sorguda en fazla 8, dolu sorguda 6) → **Eylem** (`_CP_ACTIONS` dizisi, etiket veya
anahtar kelimede arar). Her grup kendi `.cp-sec` başlığıyla ayrılır.

```js
function _cpBuild(q) {
  q = String(q || '').trim().toLowerCase();
  var items = [];
  if (q) {
    var refs = (_cpRefs || []).filter(function(r) { return _cpMatch(r, q); }).slice(0, 6);
    refs.forEach(function(r) { items.push({ kind: 'ref', id: r, label: r, grp: 'Referans' }); });
  }
  var pages = _cpPages().filter(function(p) {
    return !q || _cpMatch(p.label, q) || _cpMatch(p.id, q) || _cpMatch(p.parent, q)
        || _cpMatch(PAGE_NUM_ALIAS[p.id] || '', q);
  }).slice(0, q ? 6 : 8);
  pages.forEach(function(p) { p.grp = 'Sayfa'; items.push(p); });
  _CP_ACTIONS.filter(function(a) {
    return !q || _cpMatch(a.label, q) || (a.kw && _cpMatch(a.kw, q));
  }).slice(0, q ? 4 : 5).forEach(function(a) { a.grp = 'Eylem'; items.push(a); });
  return items;
}
```

Eşleştirme Türkçe karakter-duyarsız (`_cpMatch`/`_cpNorm`) — detay ve kod için
`dil-yerellestirme.md`. **Eski sayfa numaraları** (menüden 08.2026'da kalkan "3.1" gibi
önekler) `PAGE_NUM_ALIAS` içinde YALNIZ arama için yaşamaya devam ediyor — kullanıcının
hafızasında kalan eski numarayla arayan onu bulabiliyor, ama menüde artık görünmüyor.

**Klavye kontratı:**
```js
function _cpKey(ev) {
  if (ev.key === 'ArrowDown')      { ev.preventDefault(); _cpHover(Math.min(_cpSel + 1, _cpItems.length - 1)); }
  else if (ev.key === 'ArrowUp')   { ev.preventDefault(); _cpHover(Math.max(_cpSel - 1, 0)); }
  else if (ev.key === 'Enter')     { ev.preventDefault(); _cpActivate(_cpSel); }
  else if (ev.key === 'Escape')    { ev.preventDefault(); closeCommandPalette(); }
  else if (ev.key === 'Tab')       { ev.preventDefault(); }   // odak paletten çıkmasın
}
```
Kapanışta odak **açılıştan önceki öğeye** geri verilir (`_cpPrevFocus`, WCAG 2.4.3) — palet
kapandığında kullanıcı sayfanın neresinde olduğunu kaybetmez.

**Yeni bir eylem eklemek** tek satırlık bir `_CP_ACTIONS` girdisi; yeni bir sayfa eklemek
`SIDEBAR_MENU`'ye satır eklemekle otomatik arama kapsamına girer (ikinci bir liste yok — aynı
ilke sidebar ve site haritasıyla paylaşılıyor).
