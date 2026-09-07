# Renk Standartları

## Resmi Palet — ValeoDashboard (`tokens/colors.css`)

**Karar (2026-08-13):** Yeni Valeo projeleri için resmi renk paleti **ValeoDashboard**
kaynaklıdır. `tokens/colors.css` bu paletin kanonik kopyasıdır — yeni bir projeye renk
taşırken buradan başla.

| Rol | Değer |
|---|---|
| Blue (ana renk, başlıklar) | `#041b3c` |
| Green (aksiyon, vurgu) | `#76ff03` |
| Mid blue (ikincil vurgu) | `#0072ce` |
| Dark blue (buton/hover) | `#003d9b` |
| Surface | `#ffffff` |
| Surface dim | `#f1f5f9` |

Köşe yarıçapı ölçeği de bu kaynaktan resmidir: `--radius-sm:6px` · `--radius-md:8px` ·
`--radius-lg:12px`.

**Bilinen eksik:** bu palette WCAG kontrast ölçümü belgeli değil ve dark-mode varyantı yok
(proje tek temalı). Yeni bir sayfa/bileşen bu renklerle koyu zemin üzerine metin
yerleştirecekse kontrastı elle doğrula — aşağıdaki Bursa CV paletindeki gibi hazır,
doğrulanmış bir `-text` varyantı yok.

## İkincil / Referans — Bursa CV Projects (`tokens/colors-bursa-cv-projects.css`)

Bu palet artık **resmi değil** — yeni projelerde marka rengi olarak kullanılmaz. Yine de
saklanıyor çünkü içerdiği iki desen genel geçer ve resmi paletle birlikte kullanılabilir:

- **Durum rozeti deseni:** dolu renk + beyaz yazı yerine soluk-zemin + doygun-yazı çifti
  (`--st-ok-bg`/`--st-ok-fg` gibi). Bu projede dolu-renk deseni 6 rozetin 5'inde WCAG AA
  eşiğinin altında kalmıştı (yeşil 2.29:1, amber 2.15:1).
- **Tema-duyarlı aksan metni deseni:** marka tonunun açık zeminde koyultulup koyu zeminde
  kendi tonuna dönmesi (`--valeo-*-text` takımı, `body.dark-mode` override'ı).

**Önemli:** buradaki `--st-*-bg`/`--st-*-fg` hex çiftleri Bursa CV'nin **kendi** renkleri
(`#78BE20`, `#0057A8` vb.) için ölçülüp doğrulanmıştır. Resmi ValeoDashboard renkleriyle
(`#76ff03`, `#041b3c`) durum rozeti üretirken bu desenin **mantığını** (soluk zemin + doygun
yazı) kopyala, hex değerlerini **olduğu gibi** taşıma — kontrastı yeni renklerle yeniden
doğrulaman gerekir.

## Renk Rolleri — Container / On-Container Çiftleri (2026-08-18 kararı)

M3 tasarım referans materyaliyle (Gemini Notebook, karar-girdisi PDF'ler) karşılaştırma
sonucu eklendi. Kaynak M3, her rengi **Container (zemin)** + **On-Container (üzerindeki
metin/ikon)** çifti olarak tanımlıyor; bu depoda daha önce böyle bir katman yoktu, yalnız
düz hex listesi vardı. Aşağıdaki eşleme **yeni bir türetim** — ValeoDashboard/Bursa-CV
kaynak kodundan birebir kopyalanmadı, resmi paletteki (`tokens/colors.css`) mevcut
token'lardan yalnızca **var olan** değerler kullanılarak kuruldu (yeni hex icat edilmedi):

| Rol | Container | On-Container | Kaynak token |
|---|---|---|---|
| Primary | `--valeo-blue` `#041b3c` | `--surface` `#ffffff` | doğrudan resmi palet |
| Primary Container (soluk) | `--blue-50` `#ddeef9` | `--valeo-blue` `#041b3c` | mavi ton skalası |
| Secondary / Accent | `--valeo-green` `#76ff03` | `--valeo-blue` `#041b3c` | ValeoDashboard'ın kendi CTA kuralı (koyu metin, beyaz değil — bkz. `jenerik-desenler.md` Buton Varyantları) |
| Error | `--danger` `#ef4444` | `--surface` `#ffffff` | resmi palet "Durum" grubu |

**Bilinçli boşluk:** Secondary/Accent (`--valeo-green`) için soluk bir "container" tonu
(M3'teki gibi açık yeşil zemin) resmi palette **yok** — icat etmek yerine bu satır
eklenmedi; bir sonraki adımda ValeoDashboard kaynağında böyle bir ton görülürse buraya
eklenir. Aynı şekilde WCAG kontrastı bu yeni çiftler için de **belgeli değil** (resmi
paletin genel eksikliği, yukarıda not edilmişti) — yeni kullanımda elle doğrula.

## Üçüncü Bir Referans: TaskTracker (2026-08-29) — KAYNAK PROVENANCE FARKLI

**Uyarı:** `nphlvn/TaskTracker` bu reponun kaynağı **değil** — `ValeoDashboard`/
`Bursa-CV-Projects` gibi buradan standart çekilen bir depo değil, standartları tüketen (ve bu
konuda kendiliğinden zaten resmi paletle hizalı: `#041b3c`/`#76ff03`/`#0072ce`/`#003d9b` —
bkz. kaynak `CLAUDE.md` §6) bağımsız bir üretim uygulaması. AI Club Portal'la aynı statüde:
"Kaynak depolara asla yazılmaz" kısıtı bu projeye uygulanmaz (o bir kaynak değil), ama bu
resmi paletin yerini de almaz — yalnız iki dar konuda **desen** taşındı, hiç hex taşınmadı.

### İsimden Türeyen Kararlı Renk (Avatar / Proje Noktası)

Veritabanında kişi veya proje için bir renk alanı yok; renk **isimden** kararlı bir hash ile
türetiliyor, böylece aynı isim her ekranda hep aynı rengi alıyor (bir kişinin avatarı bir
sayfada mavi, başka sayfada mor görünmüyor):

```js
var AVATAR_PALETTE=['#0072ce','#003d9b','#0052cc','#7c3aed','#0891b2','#ea580c','#0d9488','#c026d3','#2563eb','#db2777','#65a30d','#9333ea'];
function avatarColor(name){
  var h=0, s=normName(name)||'x';
  for(var i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))>>>0; }
  return AVATAR_PALETTE[h%AVATAR_PALETTE.length];
}
```

(Kaynak: TaskTracker `Index.html`.) Proje noktası için de aynı desen, ayrı bir 12 renklik
palet ve çarpan (`*33`) ile tekrarlanıyor (`projectColor()`) — iki farklı varlık türünün
(kişi/proje) aynı hash'ten aynı rengi almasını önlemek için. Hash'e giren isim, Türkçe
karakter/büyük-küçük harf farkına duyarsız (`normName()`, bkz. `dil-yerellestirme.md`) —
yoksa "Ahmet" ve "AHMET" iki farklı renk alırdı. Renk atanmadıysa (proje adı boşsa) sabit bir
nötr renk (`#94a3b8`) döner, hash fonksiyonuna girmez.

Bu desen, kaynak/veritabanı şemasında renk alanı **olmayan** her "kişi/varlık listesi"
bileşeninde (yorum yazarı, sorumlu, etiket) taşınabilir — `renkler.md`'nin resmi paletindeki
`--valeo-blue`/`--valeo-green` gibi marka renkleriyle karışmaması için ayrı, geniş bir palet
kullanılmalı (yukarıdaki 12 renk marka renklerini içermiyor, bilerek).

### Öncelik Paleti — FranklinCovey/Eisenhower Zaman Matrisi (K1-K4)

Görev önceliklendirme için hazır bir 4'lü taksonomi + renk + sıralama-ağırlığı üçlüsü:

```js
var PRIO_META={
  K1:{name:'Crisis Management', color:'#ef4444',bg:'rgba(239,68,68,0.12)', rank:4},
  K2:{name:'Success Zone',      color:'#0072ce',bg:'rgba(0,114,206,0.12)', rank:3},
  K3:{name:'Deceptive Urgency', color:'#d97706',bg:'rgba(217,119,6,0.14)', rank:2},
  K4:{name:'Waste',             color:'#64748b',bg:'rgba(100,116,139,0.14)',rank:1}
};
```

(Kaynak: TaskTracker `Index.html`.) Renk deseni durum rozetleriyle aynı ilkeyi izliyor (soluk
zemin + doygun renk, bkz. yukarıdaki "İkincil / Referans" bölümü); `rank` alanı sıralama için
ayrı tutuluyor ki renk/etiket değişse bile "en kritik en üstte" mantığı bozulmasın. Hiçbir
Standartlar dokümanında bir önceliklendirme/aciliyet renk taksonomisi yoktu — bu, görev/iş
listesi olan her yeni projede kullanılabilecek hazır bir başlangıç noktası (K1-K4 isimleri
Eisenhower matrisinin standart çeyrekleri; proje kendi terimini kullanmak isterse yalnız
`name` alanı değişir, renk/rank yapısı aynı kalır).

### Inline Style/SVG'ye Giren Renklerin Tema Değişiminde Tazelenmesi

`koyu-mod.md`'nin "tek token katmanı" ilkesi (`body`/`html` sınıfı değişince her şey otomatik
uyumlanır) **bir istisna** bırakıyor: bir renk zaten çizilmiş bir SVG `fill`'ine veya inline
`style` string'ine **kopyalanmışsa**, o kopya `var(--token)` değil ham hex/rgb taşır — tema
değiştiğinde CSS bunu kendiliğinden güncellemez, çünkü `var()` zaten yazılmış bir string'in
içinde değildir. TaskTracker bu durumu durum renkleri için açıkça çözüyor:

```js
/* Yukarıdaki hex'ler yalnız açık temanın başlangıç değeri. Gerçek renk her tema
   değişiminde CSS token'ından (--st-*) okunur, çünkü bu değerler string olarak
   inline style'a ve SVG'ye giriyor — oralarda var() çalışmaz. applyTheme her
   temada bunu tazeler, renderShell da hemen ardından her şeyi yeniden çizer. */
function syncStatusColors(){
  var cs=getComputedStyle(document.documentElement);
  STATUS_ORDER.forEach(function(k){
    var v=cs.getPropertyValue('--st-'+k);
    if(v&&v.trim()) STATUS[k].color=v.trim();
  });
  /* Ekrandaki satırlar rengin bir KOPYASINI taşıyor (normTask sırasında alınır),
     bu yüzden haritayı tazelemek tek başına yetmez: tema değişince kopyalar da
     yenilenmezse pano koyu temada açık temanın turuncusuyla çizilirdi. */
  try{
    if(typeof S!=='undefined'&&S){
      [S.tasks,S.sliAll].forEach(function(list){
        (list||[]).forEach(function(t){ if(t&&t.statusK&&STATUS[t.statusK]) t.color=STATUS[t.statusK].color; });
      });
    }
  }catch(e){}
}
```

(Kaynak: TaskTracker `Index.html`.) Kural: bir renk **JS tarafında bir değişkene/nesneye
kopyalanıyorsa** (durum haritası, önceki bir render'dan gelen satır önbelleği vb.), tema
değiştirme fonksiyonu (`applyTheme`/`toggleDarkMode`, bkz. `koyu-mod.md`) bu kopyaları da
CSS'ten yeniden okuyup tazelemeli — yalnız `body`/`html` sınıfını değiştirmek, CSS'te
tanımlı olmayan (SVG/inline-string) kopyalar için yeterli değil. Bu, dark-mode uygulayan her
projede (özellikle elle SVG çizen grafik/rozet bileşenlerinde) tekrar eden bir hata kaynağı.

## Karar Geçmişi

- 2026-08-13: İki palet ilk kopyalandığında (bkz. commit geçmişi) aralarında seçim
  yapılmamıştı. Aynı gün, ValeoDashboard paleti resmi ilan edildi; Bursa CV paleti referans
  statüsüne düşürüldü. Gerekçe koddan okunamaz — bu bir marka/tasarım kararıdır, teknik
  üstünlükten değil.
- 2026-08-18: M3 referans materyaliyle karşılaştırma sonucu Container/On-Container rol
  çiftleri eklendi (yukarıda) — köşe yarıçapı/tonal-elevation gibi M3'ün görsel önerileri
  ise bilinçli olarak reddedildi, mevcut düz/köşeli dil korundu (bkz. `bilesenler.md`
  Dialog Alt-Türleri notu).
- **2026-08-23: Bursa CV Projects'in kendi renk migrasyonu — TAM taşınmadı, kısmen kaldı.**
  Aynı gün (13.08.2026) Bursa CV Projects kendi CSS token'larını (`--valeo-navy`/
  `--valeo-blue`/`--valeo-green`, `Stylesheet.html`) resmi ValeoDashboard hex'lerine
  bağlamış (`#041b3c`/`#003d9b`/`#76ff03`) — bu repodaki "resmi palet" kararıyla aynı gün,
  muhtemelen ondan bağımsız/paralel. Ama CSS'in ulaşamadığı yerlerde (mail HTML gövdesi —
  `DataLayer.gs`, Slides API — `MonthlyDeck.gs`, Chart.js `PALETTE`/inline SVG'ler, ~70 yer)
  **eski Bursa CV hex'leri (`#1B2B4B`/`#0057A8`/`#78BE20`) bilerek bırakıldı** — proje
  sahibi bu kalıntıları da yeni hex'e çevirmeyi 2026-08-23'te İSTEMEDİ: dış paydaşlara giden
  mail/sunum görünümünü değiştirmenin bedeli, iki paletin CSS-token seviyesinde birleşmiş
  olmasının getirdiği faydadan daha yüksek görüldü. Sonuç: **bir üretim projesi resmi
  paletle "tam" değil "kısmi" hizalanabilir** ve bu geçerli bir son durumdur — yeni bir
  projeye taşırken bunu örnek al: CSS token'ları resmi palete bağlamak zorunlu, ama halihazırda
  var olan, dış paydaşa giden statik çıktılardaki (mail/sunum/rapor) marka rengini geriye
  dönük değiştirmek ayrı, isteğe bağlı bir karar.
- **2026-08-29: TaskTracker'dan üç dar desen eklendi** (yukarıda) — isimden türeyen kararlı
  renk (avatar/proje), K1-K4 öncelik paleti, inline style/SVG renk tazeleme kuralı. Hiçbiri
  resmi paleti değiştirmiyor; TaskTracker zaten ValeoDashboard hex'leriyle üretimde.
