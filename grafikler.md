# Grafik (Chart) Standardı

## Kaynak Durumu — Önemli

**ValeoDashboard'da gerçek bir grafik standardı yok.** `Index.html`'de yalnızca bir layout
iskeleti (`.chart-row`, 2fr/1fr grid) ve iki boş `<canvas>` var:

```html
<!-- Chart.js canvas buraya gelecek -->
<canvas id="salesChart" height="200"></canvas>
```

Chart.js hiç `new Chart(...)` ile başlatılmamış — renk, config, etkileşim, hiçbiri yok. Bu bir
tasarım kararı değil, tamamlanmamış bir taslak.

**Gerçek grafik uygulaması Bursa CV Projects'te** (`pages/Dashboard.html` başta olmak üzere
10 sayfa). Bu doküman oradan derlendi.

## Kütüphane

**Chart.js.** İkisi de aynı kütüphaneyi seçmiş (ValeoDashboard'ın yorum satırı da Chart.js
diyor) — yeni bir projede de Chart.js kullan, kütüphane seçimi konusunda uyumsuzluk yok.

## Sabit Yükseklikli Kap — Sonsuz Döngü Önlemi

```css
.chart-canvas-wrap { position: relative; width: 100%; height: 200px; }
.chart-canvas-wrap canvas { display: block; }
```
```js
options: { responsive: true, maintainAspectRatio: false }
```

Yükseklik CSS'ten gelir, `maintainAspectRatio:false` ile birlikte. Bu kombinasyon **zorunlu**:
yükseklik yoksa grafik genişlikten yükseklik türetir, kap da içeriğe göre boyutlanıyorsa bu
sonsuz büyüme/küçülme döngüsüne girer (bkz. kaynak `CLAUDE.md`). Dar ekranda tuvalin taşmasını
önlemek için ayrıca `#page-content canvas { max-width: 100% !important; }` — Chart.js tuvale
piksel genişlik yazıyor, kap daralınca bu taşabiliyordu.

## Kategorik Renk Paleti — TUTARSIZ, Tek Bir Öneri

**Dürüst bulgu:** tek bir ortak grafik paleti yok — dört farklı sayfada dört farklı dizi var
(`PALETTE` Dashboard'da, `PALETTE_RGBA` FinishedGoodBOM'da, `TYPE_PALETTE`
ProductComparison'da, `PPCA_PALETTE`/`DISC_PALETTE` ProductTree'de). Bu, kod tabanının başka
yerlerinde tekrar tekrar görülen "kopyalama → ayrışma" hatasının bir örneği — kaynak `CLAUDE.md`
bunu `KIT_COMP_COLS`/`KitCalc`/`projSP` için çözmüş ama grafik paletleri için henüz
konsolide edilmemiş.

En eksiksiz ve marka renkleriyle en tutarlı olanı (Dashboard.html'in `PALETTE`'i) — **yeni bir
projede buradan başla**:

```js
var PALETTE = ['#0057A8','#78BE20','#F59E0B','#8B5CF6','#EF4444','#1B2B4B',
               '#06B6D4','#EC4899','#84CC16','#F97316'];
```

İlk altı renk kasıtlı: marka + durum renkleriyle **aynı** (`--valeo-blue`, `--valeo-green`,
`--status-warning`, `--status-serial`, `--status-error`, `--valeo-navy` — bkz. `renkler.md`).
Yedinci renkten sonrası, 6'dan fazla kategori gerektiğinde eklenen ek kategorik tonlar. Resmi
palete (`tokens/colors.css`, ValeoDashboard) geçen bir projede bu diziyi kendi marka
renklerinle **yeniden türet** — hex'leri olduğu gibi taşıma (aynı kural durum rozetlerinde de
geçerli, bkz. `renkler.md`).

## Halka (Doughnut) Grafik Deseni

```js
new Chart(ctx, {
  type: 'doughnut',
  data: { labels: labels, datasets: [{
    data: values,
    backgroundColor: PALETTE.slice(0, labels.length),
    borderWidth: 2,
    borderColor: cardBg   // dilim aralığı kart zeminiyle aynı — "kesik" gibi görünür
  }] },
  options: {
    responsive: true, maintainAspectRatio: false,
    animation: false, animations: false,   // filtre değişince yerinde güncellenir, sıfırdan çizilmez
    elements: { arc: { hoverOffset: 0, hoverBorderWidth: 2 } },  // hover'da halka BÜYÜMEZ
    onClick: function(evt, el) { onChartClick(id, el, labels); },
    plugins: { legend: { display: false }, donutLabels: { unit: unit || '' } }
  }
});
```

Merkeze toplam + dilimlerin üstüne yüzde yazan özel bir plugin (`donutLabels`) kullanılıyor —
Chart.js'in yerleşik legend'ı yerine bu tercih edilmiş çünkü halka küçük kartlarda legend yer
kaplıyor:
- Merkez: toplam değer (büyük, kalın) + alt etiket ("toplam", "toplam OI" gibi birime göre).
  **Tema duyarlı:** `document.body.classList.contains('dark-mode')` kontrolüyle merkez metin
  rengi ve gölgesi değişir (koyu temada açık metin + koyu gölge, tersi açık temada).
- Dilim üstü: yalnız **%5'ten büyük** dilimlere etiket yazılır (küçük dilimde yer yok); **%10'dan
  büyüğe** hem isim hem yüzde, altındakine yalnız yüzde. Etiket rengi her zaman beyaz + koyu
  gölge (dilim rengi ne olursa olsun okunur kalması için — tek tek kontrast hesaplamak yerine
  gölgeyle çözülmüş).

## Çubuk (Bar) Grafik Deseni

```js
scales: {
  x: { ticks: { font: { size: 9 } }, grid: { color: 'rgba(148,163,184,0.12)' } },
  y: { ticks: { font: { size: 9 } }, grid: { display: false } }
}
```

Yatay sıralı liste grafiklerinde `indexAxis: 'y'` kullanılıyor (ör. "en çok launched proje"
sıralaması). Değerler, Chart.js'in kendi veri etiketleri yerine özel bir plugin
(`barValueLabels`) ile çubuğun üstüne/içine yazılıyor — **tema duyarlı** renk (`dark` kontrolü)
ve **taşma kontrolü** var: etiket çubuğun içine sığmıyorsa otomatik dışına, rengi değiştirerek
taşar:

```js
if (g.measureText(txt).width + 6 > (bar.x - bar.base)) {
  g.textAlign = 'left'; tx = bar.x + 4; g.fillStyle = dark ? '#93c5fd' : '#1d4ed8';
}
```

## Veri Yok Durumu

Filtreye uyan veri yoksa grafik boş/bozuk çizilmez — tuval gizlenir, yerine metin konur:

```js
canvas.style.display = 'none';
if (!parent.querySelector('.chart-no-data')) {
  var msg = document.createElement('div');
  msg.className = 'chart-no-data';
  msg.style.cssText = 'text-align:center;padding:40px 10px;color:var(--dt-text-2);font-size:12px';
  msg.textContent = 'Filtre koşuluna uyan veri yok';
  parent.appendChild(msg);
}
```
Veri geri geldiğinde `.chart-no-data` kaldırılır, canvas tekrar gösterilir.

## Grafik = Filtre Kontrolü (Yalnız Dekorasyon Değil)

Grafiklerin `onClick` handler'ı var — bir dilime/çubuğa tıklamak sayfanın filtresini o
değere göre günceller (`onChartClick`). Bu, grafiği salt bilgi göstergesinden **etkileşimli
bir filtre arayüzüne** çeviriyor. Yeni bir dashboard'da kategori dağılımı gösteren bir grafik
varsa aynı sayfada bir filtre de varsa, tıklanabilir yapmayı düşün — kullanıcı ayrıca bir
dropdown'a gitmek zorunda kalmıyor.

## Yüklenemeyen Veri ≠ Boş Veri (2026-08-29, TaskTracker — KAYNAK PROVENANCE FARKLI)

**Uyarı:** kaynağı `nphlvn/TaskTracker` (SVG ile elle çizilmiş grafikler, Chart.js değil) —
üçüncü bir referans, bkz. `renkler.md`. Yukarıdaki "Veri Yok Durumu" tek bir durumu çözüyor:
**filtreye uyan veri yok**. TaskTracker bunu, kaynağı farklı ikinci bir durumdan ayırıyor:
**veri sunucudan hiç gelemedi** (ağ hatası, yetki sorunu, zaman aşımı). İkisi aynı ekranda
aynı görünürse kullanıcı "gerçekten sıfır mı, yoksa bir şey mi bozuldu" ayrımını yapamaz:

- **Filtreye uyan veri yok:** grafikler.md'deki mevcut `.chart-no-data` deseni doğru — "Filtre
  koşuluna uyan veri yok" mesajı, veri gerçekten (doğrulanmış biçimde) sıfır.
- **Veri yüklenemedi:** KPI/grafik kartı **sıfır göstermez** ("bu sayılar şu an alınamıyor —
  sıfır değiller" gibi açık bir mesaj + bir **"Tekrar dene"** düğmesi gösterir. Sıfır göstermek
  burada "her şey yolunda, hiçbir şey olmamış" diye okunur — bu, hatayı gizlemekten kötü bir
  yanlış-güven durumu.

Kural: **az örnekli bir oran da gösterilmez** — 3 kayıttan üretilen "%100 başarı" istatistiksel
olarak anlamsız ama kesin görünüyor. Yeterli örnek yoksa yüzde yerine `—` yazılır, veri hiç
uydurulmaz. Her iki kural da grafikler.md'deki mevcut "Veri Yok Durumu" deseninin **YERİNE**
geçmiyor, onu iki alt-duruma ayırıyor — yeni bir dashboard/KPI kartı yazan projede üçü de
(filtre-boş / yükleme-hatası / az-örnek) ayrı ayrı ele alınmalı.

## Bilinen Boşluk (Yeni Projede Düzeltilebilir)

Merkezi bir `Chart.defaults` veya paylaşılan bir "Charts" modülü **yok** — her sayfa kendi
plugin'ini, paletini, seçeneklerini tekrar tanımlıyor (donut label plugin'i bile
`fg-chart-donut` için özel olarak devre dışı bırakılan bir istisna içeriyor). Sıfırdan bir
proje kuruyorsan bu tekrarları önlemek için ortak bir `Charts` yardımcı modülü (paylaşılan
`PALETTE`, `donutLabels`/`barValueLabels` plugin'leri, `maintainAspectRatio` varsayılanı) iyi
bir başlangıç noktası olur — kaynak kod tabanında `KitCalc`/`L2Plan` için yapılan
konsolidasyonun aynısı burada henüz yapılmamış.
