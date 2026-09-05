# Yazdırma (Print) Standardı

Kaynak: Bursa CV Projects, `src/Stylesheet.html` (`@media print`). ValeoDashboard'da yazdırma
stili yok — tek kaynaklı bir standart.

## Prensip: Chrome Gizlenir, İçerik Sayfa Sınırına Göre Düzenlenir

```css
@media print {
  /* Uygulama iskeleti (gezinme, filtre, buton) yazdırılmaz — yalnız içerik */
  #sidebar, #app-header, .filter-bar, .comp-input-bar, .alloc-tab-bar,
  .export-bar, #feedback-btn, #feedback-modal, .kit-popup-overlay,
  .inline-form-panel, .page-header .btn, .comp-accordion-btn,
  .active-filters { display: none !important; }
  #main-content { margin-left: 0 !important; padding: 8px !important; }
  #sm-rail, #sm-overlay { display: none !important; }   /* favori şeridi/site haritası da yazdırmada yok */

  /* Ekranda kaydırılan alanlar kağıtta TAŞMALI (kesilmemeli) */
  .table-wrapper { max-height: none !important; overflow: visible !important; }

  body { background: #fff !important; }
  .card { box-shadow: none !important; border: 1px solid #ddd !important; }

  /* Tablo sayfa sınırında DÜZGÜN kırılsın */
  table { page-break-inside: auto; font-size: 10px; }
  tr    { page-break-inside: avoid; page-break-after: auto; }
  thead { display: table-header-group; }   /* başlık satırı HER sayfada tekrarlanır */

  /* Renkli başlık zemini varsayılan olarak yazıcıya gitmez — zorla */
  thead th {
    background: #0057A8 !important; color: #fff !important;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
}
```

## Kurallar

- **Gezinme/etkileşim öğeleri tamamen gizlenir** — sidebar, header, filtre barı, export
  dropdown'ı, feedback düğmesi, mini favori şeridi/site haritası paneli. Kağıtta yalnız
  içerik kalır, `#main-content` sidebar'ın bıraktığı boşluğu (`margin-left`) doldurur.
- **Kaydırılabilir kaplar taşmaya açılır** (`overflow: visible`) — ekranda `max-height` ile
  sınırlı bir tablo kağıtta kesilirse veri kaybolmuş gibi görünür; yazdırmada sınır kalkar,
  içerik gerektiği kadar sayfa kaplar.
- **Tablo satırları sayfa arasında bölünmez** (`tr { page-break-inside: avoid }`) — bir satırın
  yarısı bir sayfada, yarısı ötekinde kalmaz. Başlık satırı her sayfanın tepesinde tekrarlanır
  (`thead { display: table-header-group }`) — çok sayfalı bir tabloda 5. sayfada hangi sütunun
  ne olduğunu anlamak için 1. sayfaya dönmek gerekmez.
- **Renkli zeminler varsayılan olarak YAZDIRILMAZ** — tarayıcılar mürekkep tasarrufu için arka
  plan rengini/gölgeyi otomatik siler. Başlık şeridi gibi anlam taşıyan bir renk kaybolmasın
  diye `-webkit-print-color-adjust: exact` / `print-color-adjust: exact` ile zorlanır; salt
  dekoratif gölgeler (`.card`'ın `box-shadow`'u) tam tersi — kağıtta gereksiz, kaldırılır.
- **Koyu tema yazdırmaya YANSIMAZ** — kaynak projede `body.dark-mode` sınıfı yazdırma
  belgesine taşınmıyor, kağıt her zaman açık temayla basılıyor (kağıt tek temalı bir belge;
  bkz. `koyu-mod.md`'deki "sunum/print aynı mantık" notu).

## Kapsam Dışı: Karmaşık Sayfa Düzenleri (Grid, Kart Görünümü)

Bu standart **düz tabloyu** yazdırmaya hazırlar. Izgara/kart gibi ekran-odaklı düzenlerin
(ör. yıllık plan ızgarası) yazdırması ayrı bir mekanizma gerektirir — kaynak projede
sayfaların kaydettiği bir PDF hook'u üzerinden çözülüyor (`veri-listeleme.md`'deki "İndirme"
bölümüne bkz.), bu dosyanın kapsamı yalnız `@media print` ile çözülebilen düz tablo/kart
sayfalarıdır.
