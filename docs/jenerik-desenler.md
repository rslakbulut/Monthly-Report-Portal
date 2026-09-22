# Jenerik UI Desenleri

İki kaynak projede (ValeoDashboard, Bursa CV Projects) tekrarlanan veya en azından birinde
olgun biçimde çözülmüş, başka projelere taşınabilir kalıplar. Kod parçaları ilgili kaynaktan
**birebir** alınmıştır; kaynak repo değiştirilmemiştir.

## Font Ailesi

İkisi de sistem fontu yığını + Segoe UI tercihiyle başlıyor:

```css
/* Bursa CV Projects */
font-family: 'Segoe UI', system-ui, sans-serif;

/* ValeoDashboard */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

## Akışkan Tipografi Ölçeği (2026-08-29, TaskTracker — KAYNAK PROVENANCE FARKLI)

**Uyarı:** kaynağı `nphlvn/TaskTracker` — `ValeoDashboard`/`Bursa-CV-Projects` bu deseni
içermiyor; ikisi de sabit `px` punto kullanıyor. TaskTracker bir kaynak proje değil (yazma
kısıtı yok), bkz. `renkler.md`'deki "Üçüncü Bir Referans" notu.

Sabit punto yerine, ekran genişliğine göre `clamp()` ile küçülüp büyüyen, adlandırılmış bir
tip ölçeği — bir telefon ve geniş bir monitör aynı `--fs-base` değişkenini okur, ama iki
farklı piksel değeri render eder:

```css
--fs-xs:   clamp(10.5px, .68rem + .12vw, 12px);
--fs-sm:   clamp(12px,   .75rem + .15vw, 13.5px);
--fs-base: clamp(13px,   .82rem + .18vw, 15px);
--fs-lg:   clamp(15px,   .9rem  + .35vw, 18px);
--fs-h2:   clamp(15px,   .95rem + .5vw,  19px);
--fs-h1:   clamp(20px,   1.1rem + 1vw,   28px);
```

(Kaynak: TaskTracker `Index.html`.) Kullanım: rozet/meta satırı `--fs-xs`, varsayılan arayüz
metni `--fs-sm`, gövde `--fs-base`, kart başlığı `--fs-lg`, bölüm başlığı `--fs-h2`, sayfa
başlığı `--fs-h1`. Medya sorgusu (`@media`) ile ayrı breakpoint'lerde ayrı punto tanımlamak
yerine tek bir `clamp()` ifadesi tüm ara genişlikleri kapsıyor — ne çok küçük ekranda kırpılan
metin, ne geniş ekranda cılız kalan yazı.

## Köşe Yarıçapı Ölçeği

Yalnız ValeoDashboard açık bir ölçek tanımlıyor; Bursa CV Projects'te sabit px değerleri
(4/6/8/10/14/20px) dağınık kullanılıyor, ayrı bir ölçek yok. Yeni bir proje için
ValeoDashboard'daki ölçek daha sürdürülebilir bir başlangıç noktası:

```css
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
```

## Spacing Ölçeği (2026-08-18 kararı, M3 referansı)

Daha önce hiçbir Standartlar dokümanında adlandırılmış bir boşluk (spacing) skalası yoktu —
padding/gap değerleri (6/8/10/12/14/16/20px) proje proje elle yazılıyordu. M3 referans
materyaliyle karşılaştırma sonucu 8px tabanlı, adlandırılmış bir ölçek eklendi — **geriye
dönük hiçbir mevcut değer değiştirilmedi**, bu yalnızca gelecekteki dokümanlar/bileşenler
için ortak bir sözlük:

```css
--space-xs:  4px;
--space-sm:  8px;
--space-md:  12px;
--space-lg:  16px;
--space-xl:  20px;
--space-2xl: 24px;
```

Mevcut kod içinde geçen sabit değerlerin çoğu (`.card { padding:16px }` = `--space-lg`,
`.modal-footer { gap:8px }` = `--space-sm`, `.filter-bar { padding:12px 16px }` =
`--space-md`/`--space-lg`) bu ölçekle **zaten örtüşüyor** — yeni bir sayı icat edilmedi,
var olan tekrarlara isim verildi.

## Z-Index Katman Tablosu (2026-08-29, TaskTracker — KAYNAK PROVENANCE FARKLI)

**Uyarı:** kaynağı `nphlvn/TaskTracker`, üçüncü bir referans (bkz. `renkler.md`). Standartlar'ın
mevcut dokümanlarında (`sidebar.md`'deki flyout/bottom-nav, `bilesenler.md`'deki modal/toast)
z-index değerleri **dosya dosya dağınık** — hangi katmanın hangisinin üstünde durduğuna dair
merkezi bir referans yok. TaskTracker bunu tek bir sayı skalasında topluyor:

| z | Katman |
|---|---|
| 10 | Header |
| 20–30 | Yapışkan tablo başlıkları, açılır listeler |
| 45 | Karartma (scrim) |
| 50 / 55 | Kenar çubuğu / genişleyen ikon rayı |
| 60 | Görev paneli (drawer), sütun süzgeci paneli |
| 70 | Modal |
| 74 / 75 | Yardım spot ışığı / Yardım paneli |
| 80 | Bildirimler (toast), tanıtım kartı |
| 120 | Kayıt göstergesi (savebar) |

(Kaynak: TaskTracker `design.md`.) Kural: **yardım paneli modalın üstündedir** — bu kasıtlı,
çünkü açık bir pencerenin kılavuzu o pencere açıkken okunabilmeli (bkz. `docs/yardim-paneli.md`).
Yeni bir projede z-index'leri dosya dosya rastgele büyük sayılarla (999, 9999, 10000...)
seçmek yerine, bu tabloyu kendi katmanlarına uyarlayarak **tek bir yerde** (CSS'in başında
veya bir token dosyasında) tutmak, iki bileşenin "kim üstte" çakışmasını önler.

## Birincil Vurgu Rengi — Ekranda Yalnızca Bir Kez (2026-08-29, TaskTracker — KAYNAK PROVENANCE FARKLI)

**Uyarı:** kaynağı `nphlvn/TaskTracker`, üçüncü bir referans (bkz. `renkler.md`). Kural açık
biçimde hiçbir Standartlar dokümanında yazılı değildi, yalnız zımnen uygulanıyordu:

> Marka vurgu rengi (`--valeo-green`/lime, resmi palette "Secondary/Accent" — bkz.
> `renkler.md`) **bir ekranda yalnızca bir kez**, sayfanın tek birincil eylemi için kullanılır
> (ör. "New Task"). İkinci bir vurgu-renkli düğme, kullanıcının hangi eylemin asıl öncelikli
> olduğunu belirsizleştirir — iki "birincil" aynı anda birincil değildir.

Bu, `docs/bilesenler.md`'deki Outlined/Text vurgu-seviyesi varyantlarıyla birlikte okunmalı:
bir ekranda ikinci önemli bir eylem gerekiyorsa vurgu rengi tekrar kullanılmaz, **Outlined**
veya **Text** varyantı (nötr renk, daha düşük vurgu) tercih edilir.

## Avatar (2026-08-29, TaskTracker — KAYNAK PROVENANCE FARKLI)

**Uyarı:** kaynağı `nphlvn/TaskTracker`, üçüncü bir referans (bkz. `renkler.md`). Hiçbir
Standartlar dokümanında bir avatar bileşeni tanımlı değildi.

Tam yuvarlak, addan türetilmiş kararlı renk (bkz. `renkler.md` → "İsimden Türeyen Kararlı
Renk"), iki harflik baş harf, beyaz kalın metin:

```js
function initialsOf(name){
  var parts=String(name||'').trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return '?';
  if(parts.length===1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0]+parts[parts.length-1][0]).toUpperCase();
}
```

(Kaynak: TaskTracker `Index.html`.) Üç sabit boy: **24px** (kart içi) · **32px** (satır) ·
**36px** (başlık ve tablo) — serbest ara değerler kullanılmaz, her bağlamın kendi sabit boyu
vardır. İsim yoksa (`parts.length===0`) `'?'` gösterilir — boş baş harf yerine görünür bir
"bilinmiyor" işareti.

## Kart / KPI Kartı

```css
.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.kpi-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px 20px;
  position: relative;
  overflow: hidden;
}
.kpi-label { font-size: 12px; color: var(--valeo-gray-mid); margin-bottom: 6px; }
.kpi-value { font-size: 26px; font-weight: 700; line-height: 1; }
```
(Kaynak: Bursa CV Projects, `src/Stylesheet.html`.)

**Outlined varyant (2026-08-18 kararı, M3 referansı):** düşük vurgulu/ikincil içerik için,
gölge yerine yalnız çerçeve:

```css
.card-outlined {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  box-shadow: none;
}
```

`.card` (yukarıdaki, M3 terimiyle "Elevated") ile aynı ölçüler — yalnız derinlik ifadesi
değişiyor. M3'ün önerdiği üçüncü varyant **Filled** (dolgu renkli yüzey) eklenmedi — somut bir
kullanım ihtiyacı görülmedi, spekülatif kaldı.

## Sayfa Başlığı

```css
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text); }
.page-subtitle { font-size: 12px; color: var(--valeo-gray-mid); margin-top: 2px; }
```
(Kaynak: Bursa CV Projects.) **Kural** (a11yEnhance'in dayattığı, WCAG 1.3.1): sayfa başına
tam **1** `<h1 class="page-title">` — birden fazla `<h1>` veya hiç `<h1>` olmaz. Alt bölümler
`<h2>`, `<h3>`'e atlama yasak (başlık hiyerarşisi sırayla ilerler, bir seviye atlanmaz).

## Buton Varyantları

```css
.btn { position: relative; padding: 7px 14px; border: none; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; transition: box-shadow 0.15s; }
.btn-primary   { background: var(--valeo-blue);  color: #fff; }
.btn-success   { background: var(--valeo-green); color: #fff; }
.btn-secondary { background: var(--border);      color: var(--text); }
.btn-danger    { background: var(--status-error);color: #fff; }
```
(Kaynak: Bursa CV Projects. ValeoDashboard'da butonlar marka rengi + koyu metin kullanıyor —
`.btn-primary { background: var(--valeo-green); color: var(--valeo-blue); }` — CTA'larda
kontrast için siyah/lacivert yazı tercih edilmiş, beyaz değil.)

Boyut kasıtlı olarak kompakt bırakıldı (2026-08-18 kararı): M3 referans materyali 40px
yükseklik + WCAG 2.2 48×48px dokunma hedefi öneriyor, ama bu depo masaüstü-ağırlıklı yoğun
dashboard ekranlarını hedefliyor — kompakt boyut bilinçli bir tercih olarak korundu,
değiştirilmedi.

### State Katmanları — Hover / Disabled (2026-08-18 kararı, M3 referansı)

Eski `.btn:hover { opacity:.85 }` kuralı **kaldırıldı** — bütün buton (zemin + yazı birlikte)
solduruyordu. Yerine M3'ün "tonal overlay" tekniği geldi: yalnız ince bir karartma katmanı
zeminin üstüne biner, temel renk/metin kontrastı bozulmaz. `position:relative` gerektirmeyen
`inset box-shadow` hilesiyle, `border-radius`'a da otomatik uyar:

```css
.btn:hover { box-shadow: inset 0 0 0 999px rgba(0,0,0,.08); }  /* hover: %8 karartma */
.btn:disabled {
  cursor: not-allowed;
  pointer-events: none;
  box-shadow: inset 0 0 0 999px rgba(0,0,0,.12);  /* disabled konteyner: %12 karartma */
}
.btn:disabled .btn-label { opacity: .38; }  /* disabled metin/ikon: %38 opaklık */
```

`disabled` durumunda metin/ikonun konteynerden **ayrı** bir opaklık alması gerekiyor (%38 vs
%12) — bu yüzden buton metni `<button class="btn btn-primary"><span class="btn-label">Kaydet</span></button>`
gibi bir `.btn-label` ile sarılmalı; salt `<button>Kaydet</button>` kullanılırsa yalnız
konteyner karartması uygulanabilir, metin ayrı soluklaştırılamaz.

### Vurgu Seviyesi Varyantları — Outlined / Text (2026-08-18 kararı, M3 referansı)

Yukarıdaki 4 varyant (primary/success/secondary/danger) **anlam/renk** eksenine göre ayrılıyor
— hangi biri kullanılacaksa aksiyonun *anlamı* belirliyor. M3 referansı ayrıca **vurgu
derecesi** eksenini öneriyor; bu depoda karşılığı olmayan iki düşük-vurgu seviyesi yeni birer
sınıf olarak eklendi (renk varyantlarının YERİNE değil, ONLARIN yanına — mevcut 4'ü değişmedi):

```css
.btn-outlined { background: transparent; border: 1px solid var(--border); color: var(--text); }
.btn-outlined:hover { box-shadow: inset 0 0 0 999px rgba(0,0,0,.08); }
.btn-text { background: transparent; border: none; color: var(--valeo-blue); padding-left: 8px; padding-right: 8px; }
.btn-text:hover { box-shadow: inset 0 0 0 999px rgba(0,0,0,.08); }
```

Kullanım: **Outlined** — önemli ama vurgusu az olması gereken aksiyonlar (İptal, Geri).
**Text** — düşük öncelikli, konteyner istemeyen aksiyonlar (Daha Fazla Bilgi, Atla). İkisi de
renk-varyantlarıyla (`.btn-danger` gibi) BİRLEŞTİRİLMEDİ — tek başına, nötr sınıflar; renkle
çarpım (ör. "outlined + danger") bu kararın kapsamı dışında bırakıldı.

### Buton Yerleşim Kuralı

Bkz. `bilesenler.md` → Modal/Dialog bölümündeki "Buton yerleşim kuralı" — onaylayıcı/birincil
aksiyon her zaman sağda (masaüstü)/üstte (dar mobil), iptal edici/ikincil her zaman
solda/altta. Bu kural yalnız modal footer'a değil, genel olarak yan yana duran tüm buton
gruplarına uygulanır.

## Durum Rozetleri

Bkz. `renkler.md` — dolu renk + beyaz yazı yerine soluk zemin + doygun yazı çifti kullan.
**Aynı bileşen `veri-listeleme.md`'nin Çip Taksonomisi'nde "Status chip" adıyla da geçer** —
ikisi tek bir bileşen, iki ayrı isim; hangi bağlamda hangisinin kullanılacağı o dosyadaki
isimlendirme kuralında net. İsteğe bağlı olarak başında bir durum ikonu kullanılabilir
(`docs/ikonlar.md` → Lucide `check-circle`/`alert-triangle`/`x-circle`) — bu, önceden var olan
bir zorunluluk değil, ikon kütüphanesi eklendikten sonraki bir seçenek.

## Sinoptik Görünüm (Dashboard Özet Ekranı) — KAYNAK PROVENANCE FARKLI

Bir dashboard'un ilk açıldığında gösterdiği, detaya inmeden **tüm sistemin durumunu tek
bakışta** özetleyen üst-seviye ekran (endüstriyel/SCADA bağlamında "sinoptik şema" — genel
durum haritası; ValeoDashboard/Bursa-CV-Projects kaynaklı bir terim değil). Yeni bir bileşen
icat etmez — yukarıdaki bileşenlerin belirli bir aradalığını tanımlar:

- **KPI şeridi** — yukarıdaki `.kpi-card` deseni, 3-6 arası kart, her biri tek bir sayı + kısa
  etiket (`.kpi-label`/`.kpi-value`).
- **Durum özeti** — az sayıda Durum Rozeti (yukarıdaki bölüm/`renkler.md`) ile kritik
  uyarı/hata sayısı.
- **1-2 anahtar grafik** — `grafikler.md`'deki `PALETTE`'i kullanan, tıklanabilir
  grafik-filtre (detay tabloya drill-down).
- **Kısayollar** — en sık kullanılan 3-5 eyleme/ekrana giden linkler.

**Kural:** Sinoptik ekran salt-okunur bir özettir, form/düzenleme barındırmaz — düzenleme her
zaman ilgili detay ekranına gider. `mvp-akisi.md` akışında ürün tipi **Dashboard** ise, Plan
Onayı adımında bu ekranın Layout MD'si (bkz. `dokuman-standartlari.md`) varsayılan ana ekran
olarak önerilir.

## Erişilebilirlik Kalıpları (Bursa CV Projects'ten, genel geçerli)

Bu desenler proje-bağımsız, doğrudan taşınabilir:

- **Odak göstergesi** (`:focus-visible`, WCAG 2.4.7) — fare tıklamasında halka çıkmaz, yalnız
  klavye gezinmesinde görünür:
  ```css
  :focus-visible { outline: 2px solid var(--valeo-green); outline-offset: 2px; border-radius: 3px; }
  ```
  Koyu zeminler (header, sidebar) üzerinde yeşil yerine beyaz kullanılır — marka rengi orada
  yeterli kontrast vermeyebilir.
- **Hareket tercihi** (WCAG 2.3.3) — `prefers-reduced-motion: reduce` durumunda tüm
  animasyon/geçiş süresi neredeyse sıfırlanır.
- **İçeriğe atla** (`.skip-link`, WCAG 2.4.1) — çok sayıda gezinme öğesi olan sayfalarda
  klavye kullanıcısının Tab ile baştan gezmesini önler.
- **`.sr-only`** — yalnız ekran okuyucuya görünen metin. `display:none` KULLANILMAZ (o,
  erişilebilirlik ağacından da siler); bunun yerine 1px'e sıkıştırıp `clip` ile gizlenir.

Bu dördü kaynak projelerden (Bursa CV) gelen, olgun kalıplar. **Kaynak projelerde
karşılığı olmayan ama ExpertAI denetimlerinde tekrar tekrar çıkan üç eksik** (birincil
eylemlerin klavyeyle ulaşılamaması, `label for` bağlanmaması, durum mesajlarında
`aria-live` olmaması) için `muhendislik-standartlari.md` madde 5-6'ya bak — bunlar
provenance'ı farklı olduğu için ayrı dosyada.

## Dark Mode (Karanlık Mod)

Kısa özet: Bursa CV Projects'te sınıf tabanlı (`body.dark-mode`) tam mekanizma var —
açma/kapama fonksiyonu, OS tercihi algılama, sunucu tarafında kalıcılık. ValeoDashboard'da
dark-mode yok, tek temalı. **Tam mekanizma (JS fonksiyonları + açılış sırası + taşıma
kontrol listesi) için ayrı doküman:** `docs/koyu-mod.md`.

## Sidebar / Header Layout

Kısa özet: sabit genişlikte koyu (marka rengi) sidebar solda, sabit yükseklikte header üstte,
ana içerik `margin-left`/`margin-top` ile kalanı kaplar. Bursa CV Projects'te sidebar her
zaman dar ikon modunda durur (eski genişleyen/daralan davranış kaldırıldı) — grup tıklanınca
yandan flyout açılır. ValeoDashboard'daki sidebar statik ve veri kaynaklı değil, jenerik
standart olarak taşınabilir değil. **Veri modeli, flyout mekanizması ve tam CSS için ayrı
doküman:** `docs/sidebar.md`.

## Dil / Yerelleştirme

Ne ValeoDashboard ne Bursa CV Projects gerçek bir TR/EN dil değiştirme mekanizması içeriyor —
ikisi de sabit Türkçe. Var olan yalnız Türkçe locale biçimlendirme ve Türkçe
karakter-duyarsız arama normalizasyonu; detay ve dürüst durum tespiti için ayrı doküman:
`docs/dil-yerellestirme.md`.

## Yetki (Rol) — Salt-Okuma Görünümü

Kısa özet: `data-w="kapsam"` işaretli kontroller, kullanıcının o kapsamda yazma hakkı yoksa
`body.no-kapsam` sınıfıyla soluklaştırılıp kilitlenir + ekran altında sabit bir uyarı şeridi
çıkar. Gerçek yetki kontrolü her zaman sunucuda — bu yalnız görünürlük. Tam mekanizma için
ayrı doküman: `docs/yetki-gorunumu.md`.

## Yazdırma (Print)

Kısa özet: `@media print` ile gezinme/filtre/buton gizlenir, tablo sayfa sınırında düzgün
kırılır (başlık satırı her sayfada tekrarlanır), renkli başlık zemini `print-color-adjust`
ile zorlanır. Tam kural seti için ayrı doküman: `docs/yazdirma.md`.
