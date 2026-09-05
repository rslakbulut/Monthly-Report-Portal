# Veri Okuma & Listeleme Standardı

Bir sayfanın veriyi sunucudan **nasıl çektiği**, tabloya **nasıl bastığı** ve büyük veri
setlerinde **nasıl performanslı kaldığı** — bu doküman Bursa CV Projects'ten (tek kaynak,
ValeoDashboard'da bu katman yok — orada backend zaten `doGet` üzerinden statik bir sayfa
döndürüyor, ayrı bir veri çekme katmanı kurulmamış).

## 1. Veri Çekme Sözleşmesi — `google.script.run`

```js
google.script.run
  .withSuccessHandler(function(result) {
    if (!result || result.error) { showToast('Hata: ' + (result && result.error), 'error'); return; }
    // ... veriyi kullan
  })
  .withFailureHandler(function(err) { showToast('Hata: ' + err.message, 'error'); })
  .getFooData(filters);
```

**İKİSİ DE ZORUNLU** — yalnız `withFailureHandler` yazıp `withSuccessHandler` içinde sonucu
denetlememek yaygın bir hata kaynağı: backend HTTP hatası olmadan `{error: '...'}` (bazı
fonksiyonlarda `false`) döndürebiliyor. Denetlenmezse başarısız bir **yazma** işlemi ekranda
başarılı görünür — kullanıcı kaydettiğini sanır, sunucuda hiçbir şey değişmemiştir.

## 2. Tablo Filtre/Sıralama — `ColFilter` (Her Veri Tablosunun Ortak Katmanı)

Sayfa başına elle filtre/sıralama mantığı yazılmaz — `ColFilter` sınıfı bunu tek yerde çözer,
19+ sayfa aynı örneği kullanıyor:

```js
var _cf = new ColFilter(function() { return _rows; }, function() { paint(); });
```

- İlk argüman (`rowsFn`) ham veriyi döndürür, ikinci (`redrawFn`) filtre/sıralama değişince
  çağrılır.
- `.th(ci, label, width, extraCls, sortCi)` — bir sütun başlığı HTML'i üretir (filtre
  dropdown'ı + sıralama oku dahil); `sortCi` verilirse **görünen** sütun başka, **sıralanan**
  değer başka bir sütundan gelir (ör. "Nov'26" gösterip gizli ISO tarihe göre sırala).
- `.apply(rows)` — aktif filtreleri ve sıralamayı uygulayıp süzülmüş diziyi döndürür; sayısal
  değerleri otomatik algılar (`parseFloat` başarılıysa sayısal karşılaştırma, değilse metin).
- `.labelBy(col, fn)` — sütunun **gösterilen** değerini çevirir, filtreleme anahtarı ham
  kalır (bkz. kaynak `CLAUDE.md`'deki `StatusLex` deseni — ham değere hiçbir yerde
  dokunulmaz, yalnız ekrana yazılan metin çevrilir).
- `.chips()` / `.hasActive()` — aktif filtre özetini (silinebilir chip'ler) ve "filtre var mı"
  durumunu döndürür.
- `.state()` / `.setState(st)` — filtre+sıralama durumunu dışa/içe aktarır; sayfa geçişinde
  hatırlamak isteyen sayfa (`PageState.register`) bunu kullanır (bkz. kaynak `CLAUDE.md`).

Filtre listeleri **tek biçim**: en üstte "Tümü" satırı, altında `value` taşıyan `<label>`ler.
Etiket metnine `onclick` yazılmaz — `<label>` zaten kutucuğu çevirir, ikisi üst üste binerse
tıklama etkisiz kalır.

**Aktif filtre chip'leri** — `ColFilter.chips()`'in görsel karşılığı, hangi filtrelerin şu an
uygulandığını özetleyen silinebilir etiketler:

```css
.active-filters { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.filter-chip {
  background: rgba(0,87,168,0.1); border: 1px solid rgba(0,87,168,0.3);
  border-radius: 20px; padding: 3px 10px; font-size: 11px; color: var(--valeo-blue);
  display: flex; align-items: center; gap: 4px;
}
.filter-chip-remove { cursor: pointer; font-weight: 700; }
```

### Çip Taksonomisi (2026-08-18 kararı, M3 referansı)

M3 referans materyaliyle (Gemini Notebook, karar-girdisi PDF'ler) karşılaştırıldığında bu
depoda zaten 2 chip kullanımı vardı ama resmi bir taksonomiye oturmamıştı — yukarıdaki
`.filter-chip` ve `renkler.md`'deki durum-rozeti deseni. M3'ün 5 tipi resmi taksonomi olarak
benimsendi, mevcut ikisi **değiştirilmedi**, yalnız isimlendirmeye bağlandı; üçü yeni eklendi:

- **Filter chip** — yukarıdaki `.filter-chip` (aynen kalır). Uygulanan filtreyi gösterir/kaldırır.
- **Status chip** — `renkler.md`'deki durum-rozeti deseni (aynen kalır). Bilgi amaçlı, tıklanamaz.
- **Assist chip** (yeni) — bağlama özel kısayol/öneri aksiyonu.
- **Input chip** (yeni) — kullanıcının seçtiği/girdiği bir değeri temsil eder, silme ikonu taşır
  (`docs/ikonlar.md` → Lucide `x`).
- **Suggestion chip** (yeni) — sistemin önerdiği, tıklanınca kabul edilen hızlı seçenek.

**İsimlendirme kuralı (2026-08-21 kararı) — "Status chip" ile "Durum Rozeti" AYNI bileşendir,
iki ayrı implementasyon değil.** İkinci bir bileşen tanımlamaya kalkma — `renkler.md`'deki
soluk-zemin + doygun-yazı deseninin M3 taksonomisindeki karşılığı bu. Hangi ismin
kullanılacağı bağlama göre değişir: genel dokümanlarda ve UI metninde **"Durum Rozeti"**
(bkz. `jenerik-desenler.md`), yalnız bu tablodaki gibi M3'ün 5 chip tipiyle karşılaştırma
yapılan bağlamda **"Status chip."**

```css
.chip-assist {
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px;
  padding: 4px 10px; font-size: 11px; color: var(--text);
  display: inline-flex; align-items: center; gap: 4px; cursor: pointer;
}
.chip-input {
  background: var(--surface-dim); border-radius: 20px;
  padding: 3px 6px 3px 10px; font-size: 11px; color: var(--text);
  display: inline-flex; align-items: center; gap: 4px;
}
.chip-input-remove { cursor: pointer; font-weight: 700; }
.chip-suggestion {
  background: transparent; border: 1px solid var(--border); border-radius: 8px;
  padding: 3px 10px; font-size: 11px; color: var(--valeo-blue); cursor: pointer;
}
```

## 3. Büyük Tabloları Boyamadan Kilitleme Sorunu — Parçalı Çizim

**Ölçülmüş problem** (gerçek tarayıcıda, 5.000+ satırlık bir tabloda): tek `innerHTML` ile
basılan tablo, tarayıcı satırların TAMAMINI yerleştirene kadar tek piksel boyamıyor —
500 satır 2,5 sn · 2.000 satır 9,0 sn · 5.000 satır 21,1 sn · 20.000 satır 86 sn, bu süre
boyunca sekme donuk kalıyor.

**Çözüm — `setTableHtmlChunked` (ortak katman, sayfaya özel değil):** ilk ekranı dolduracak
kadar satır senkron basılır, kalanı zamanlayıcı turlarında eklenir:

```js
var CHUNK_FIRST = 150;   // ilk ekranı fazlasıyla doldurur, senkron basılır
var CHUNK_SIZE  = 500;   // sonraki her tur bu kadar satır ekler

function setTableHtmlChunked(container, html, done) {
  // html'i <tbody> öncesi/sonrası ve satırlara (`</tr>` sınırı) ayırır.
  // Eşik altındaki tablo (CHUNK_FIRST + CHUNK_SIZE'dan az satır) TEK seferde basılır —
  // küçük veride davranış birebir eskisi, parçalamak boşuna karmaşıklık.
  // Kalan satırlar setTimeout(…, 0) turlarında tbody'ye insertAdjacentHTML('beforeend', …) ile eklenir.
}
```

**Bu SANALLAŞTIRMA DEĞİL** — bilerek: indirme (`scrapeTable`) ve yazdırma DOM'u kazıyor,
görünmeyen satırı hiç basmamak eksik bir Excel/PDF demek olurdu. Tüm satırlar sonunda DOM'a
girer, yalnız **ne zaman** girdiği zamanlanır. Bunun bedeli iki kural:
1. Yeniden çizimde bekleyen iş **iptal edilir** (`chunkCancel()`) — kap zaten silinecek.
2. DOM'u okuyan her yol (indirme, yazdırma) önce `chunkFlush()` çağırıp kalan satırları ANINDA
   tamamlar — yoksa 5.000 satırlık tablodan 150 satırlık bir Excel çıkar.

**İkinci ölçülmüş problem — açılışta gereksiz tekrar çizim:** bir sayfa veriyi kademeli
alıyorsa (önce satırlar, sonra sağlık skoru, sonra sorumlu defteri — "açılışı dört okumaya
bağlama" bilinçli bir tasarım) her veri geldiğinde tablo **baştan** çiziliyordu — 5.000
satırda üç çizim, her biri ~2,2 sn. Çözüm `scheduleRender`: zenginleştirme çizimlerini 250 ms
penceresinde birleştirir; **ilk çizim bu kuyruktan geçmez** (kullanıcı satırları beklemeden
görmeli), yalnız "veri sonradan geldi, tazele" çizimleri birleşir.

```js
function scheduleRender(fn, ms) {
  // fn zaten kuyruktaysa tekrar eklenmez (referans karşılaştırması) —
  // çağıran `scheduleRender(renderTable)` demeli, `scheduleRender(function(){renderTable();})` DEMEMELİ.
}
```

**Ölçülen kazanç** (aynı oturumda A/B, ilk satırın görünme süresi): N=2.000 → 11.000ms'den
2.987ms'e (3,7×); N=5.000 → 35.092ms'den 3.776ms'e (9,3×). Küçük veri setlerinde (bugünkü
ölçekte ~300 satır) fark ölçüm gürültüsü içinde — yani küçük tabloda ekstra karmaşıklığın
bedeli yok, büyük tabloda kazanç büyük.

## 4. Mobilde Tablo → Kart Dönüşümü — `mobileCards()`

Sayfa başına ayrı mobil görünüm kodu yazılmaz. Tablolar çalışma anında çiziliyor, bu yüzden
`mobileCards()` DOM'a bakıp sütun başına bir CSS kuralı üretir:

```css
/* Üretilen kural örneği */
td:nth-child(3)::before { content: "Sütun Adı"; }
```

ve tabloya `.m-cards` sınıfı ekler. **Hücre başına `setAttribute` yazılmaz** — 1.000 satırda
ölçüm 870ms'ti, kural üretimi (tabloyu tek seferde tarayıp bir `<style>` bloğu yazmak) 2ms.
DOM değişmediği için satır `onclick`'i, `ColFilter` ve indirme (`scrapeTable`) aynen çalışmaya
devam eder — kart görünümü salt CSS'tir, veri katmanına dokunmaz.

Sınır **görünen** sütuna bakar (gizli sütunlar karta girmez); **15'ten geniş ızgaralar
atlanır** — çok sütunlu bir tablo kart olarak anlamsızlaşır. Sayfa `data-nocards` ile bu
dönüşümü tamamen kapatabilir.

## 4b. Yapışkan İlk Sütun + Taşan Filtre Paneli (2026-08-29, TaskTracker — KAYNAK PROVENANCE FARKLI)

**Uyarı:** kaynağı `nphlvn/TaskTracker`, üçüncü bir referans (bkz. `renkler.md`). Yukarıdaki
`ColFilter` yalnız Bursa CV Projects'ten; bu iki detay ayrıca TaskTracker'da görüldü.

**Yapışkan ilk sütun** — geniş bir tabloda yalnız başlık satırı değil, kimlik/isim taşıyan
ilk sütun da yatay kaydırmada sabit kalır (`sticky left-0`), böylece kullanıcı sağa
kaydırdığında "bu satır kime ait" bilgisini kaybetmez:

```html
<th class="sticky left-0 z-30 bg-[var(--sunken)] ...">Responsible</th>
...
<td class="sticky left-0 z-10 bg-[var(--surface)] ...">...</td>
```

(Kaynak: TaskTracker `Index.html`.) Dikkat: hücrenin **kendi zemin rengi** açıkça verilmeli
(`bg-[var(--sunken)]`/`bg-[var(--surface)]`) — aksi halde sticky hücre şeffaf kalır ve altından
kayan diğer sütunlar görünür.

**Sütun filtre panelinin `position:fixed` olması** — `veri-listeleme.md`'nin `ColFilter`'ı bir
sütun başlığının altında açılan bir filtre dropdown'ı üretiyor; kapsayıcı tablo sarmalayıcısı
(`.tbl-wrap`) taşmayı kestiği (`overflow:auto`) için panel `position:absolute` olsaydı
kırpılırdı. TaskTracker aynı sorunu `position:fixed` ile çözüyor — panel DOM hiyerarşisinden
bağımsız, ekran koordinatına göre konumlanıyor, `.tbl-wrap`'in `overflow` kuralından etkilenmiyor.
Bu, herhangi bir `overflow:auto`/`overflow:hidden` kapsayıcının içinden açılan dropdown/tooltip
için genel bir çözüm — yalnız tablo filtrelerine özgü değil.

## 5. Tablo Görsel Detayları

**Satır/header yüksekliği (2026-08-18 kararı, M3 referansı):** daha önce hiçbir dokümanda
piksel olarak tanımlı değildi, yalnız davranışsal kurallar vardı. M3 referans materyaliyle
karşılaştırma sonucu eklendi — mevcut davranışsal kurallarla (parçalı çizim, yapışkan footer)
çelişmiyor, yalnızca somut bir boşluğu dolduruyor:

```css
.dt thead th { height: 56px; }
.dt tbody td { height: 52px; }
```

**Yapışkan genel toplam satırı** — uzun bir tabloda toplamı görmek için sona kaydırmaya gerek
yok; `thead` gibi `tfoot` de yapışık kalır:

```css
tfoot td, tfoot th {
  position: sticky; bottom: 0; z-index: 3;
  background: var(--card-bg); box-shadow: 0 -1px 0 var(--border);
}
/* Koyu veri tablosu yüzeyinde (bkz. tokens/colors-bursa-cv-projects.css --dt-*) farklı zemin */
.dark-data-tbl tfoot td, .dark-data-tbl tfoot th {
  background: var(--dt-sub); box-shadow: 0 -1px 0 rgba(255,255,255,0.10);
}
```

**Sayı hizalama** — rakamlar eşit genişlikte dizilir (binlik basamaklar alt alta gelir),
kimlik/referans kolonları (VS ref, PLM, SAP) kasıtlı hariç tutulur çünkü rakamdan oluşsa da
**miktar değildir**:

```css
td, th { font-variant-numeric: tabular-nums; }
th.cf-num, td.cf-num { text-align: right; }
```

`.cf-num` sınıfı elle yazılmaz — `autoNumAlign()` sayfa içeriğini tarayıp hangi sütunun sayısal
olduğuna **veriyle** karar verir (başlık adına bakmaz): hücre değeri `%12` veya `18,2 €` gibi
Türkçe biçimliyse sayısaldır (yüzde işareti önce, para birimi sonra); `3400700641` gibi
ayraçsız uzun bir rakam dizisiyse **kimlik** sayılır, sağa yaslanmaz. Başlık metni de
ipucu olarak kullanılır — "ref", "no", "sap", "kod", "id", "takım", "isim" gibi kelimeler
geçen kolonlar sayısal görünse bile atlanır.

## 6. İndirme (Excel/Sheets) — Görünen Tabloyu Kazır

`scrapeTable(table)` DOM'daki tabloyu tarar; `[data-export-table]` işaretli tablo kaynak
kabul edilir. Başlık metni ayıklanırken filtre dropdown'ı/arama kutusu/butonlar DOM'dan
çıkarılır (yoksa "Sütun Adı ▾ Tümü Filtre1 Filtre2..." gibi bir başlık çıkar). Çağrılmadan
önce **iki** aşamalı çizim mekanizması boşaltılır (`chunkFlush()` + varsa sayfaya özel akış
kancası) — bölüm 3'teki kural budur, atlanırsa indirilen dosya eksik satır içerir.

**İndirme menüsü** — "İndir" düğmesinin altında format seçenekleri (Excel/Sheets/PDF gibi):

```css
.export-dd { position: relative; display: inline-block; }
.export-dd-menu {
  display: none; position: absolute; right: 0; top: calc(100% + 4px);
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.12); min-width: 190px; z-index: 400; overflow: hidden;
}
.export-dd-menu.open { display: block; }
.export-dd-item { padding: 9px 16px; cursor: pointer; font-size: 13px; color: var(--text); }
.export-dd-item:hover { background: rgba(0,87,168,0.08); color: var(--valeo-blue); }
```

Izgara/kart düzenleri (grid, ay takvimi gibi ekran-odaklı sayfa düzenleri) yalnız **PDF**'e,
sayfanın kaydettiği bir hook üzerinden basılır — Excel/Sheets her zaman `[data-export-table]`
işaretli düz tabloyu kazır, sayfa hangi görünüm modunda olursa olsun. Yazdırma belgesi için
ayrı doküman: `yazdirma.md`.
