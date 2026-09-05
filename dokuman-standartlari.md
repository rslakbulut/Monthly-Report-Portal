# Doküman Standartları — SPEC, PRD, TSD, FSD, Layout MD

Bu dosya, `mvp-akisi.md`'nin 4. adımındaki (Plan Onayı) yazılı çıktının hangi doküman
türlerinden oluşacağını tanımlar. Kaynağı ValeoDashboard/Bursa-CV-Projects **değil** —
KAYNAK PROVENANCE FARKLI, bkz. `CLAUDE.md`. Ölçek küçükse (tek ekranlı basit bir araç, statik
veri) yalnız PRD + 1 Layout MD yeterlidir; ölçek büyüdükçe (çok ekranlı dashboard/portal,
roller, gerçek backend) TSD ve FSD de eklenir — aşağıdaki özet tabloda net.

## SPEC — Şemsiye Terim

"Spec" tek başına bir doküman türü değil, aşağıdaki dördünün ortak adı: bir şeyin ne yapması
gerektiğinin yazılı, uygulanabilir tanımı. `mvp-akisi.md`'nin 1-2. adımlarında (kapsam +
boşluk doldurma) toplanan bilgi, 4. adımda bir SPEC'e (aşağıdaki türlerden biri veya birkaçı)
dönüşür — BUILD ancak bu SPEC kullanıcı tarafından onaylandıktan sonra başlar.

## PRD — Product Requirements Document (her MVP'de zorunlu)

Ne inşa ediliyor, kim için, hangi problemi çözüyor, başarı nasıl ölçülüyor — teknik detay
YOK. `mvp-akisi.md`'nin 1-2. adımlarında toplanan bilgi doğrudan buraya döner: Claude'un
4. adımda kullanıcıya sunduğu özet fiilen bir PRD'dir, artık bu isimle anılır ve şu asgari
başlıkları içerir:

- **Amaç** — ne kuruluyor, hangi problemi çözüyor
- **Hedef Kullanıcı** — kimler erişecek (`mvp-akisi.md` 1. adım)
- **Kapsam** — neler var / bu turda neler yok
- **Başarı Kriteri** — nasıl anlaşılacak ki iş görüyor

## TSD — Technical Specification/Solution Document (yalnız gerçek backend varsa)

PRD'nin teknik karşılığı: mimari, veri modeli, API'ler, hangi teknolojinin neden seçildiği.
Yalnız `mvp-akisi.md` 2. adımdaki "veri zemini" cevabı Google Sheets/Apps Script veya başka
bir gerçek backend ise gereklidir — tamamen statik/mock veriyle çalışan basit bir araçta TSD
atlanır, PRD yeterlidir.

## FSD — Functional Specification Document (yalnız çok-ekranlı/çok-rollü MVP'lerde)

Ekran/buton/akış seviyesinde davranış detayı — "şu tıklanınca şu olur, şu alan boşsa şu hata
çıkar." Tek ekranlı basit bir araçta gereksiz (PRD zaten yeterince açık); `mvp-akisi.md`
2. adımdaki ürün tipi Dashboard/Portal ise veya yetki granülerliği çoklu rolse gereklidir.

## Layout MD — Ekran Yerleşim Dokümanı (birden çok ekran varsa, ekran başına bir tane)

Bir ekranın yerleşimini **markdown/metin olarak** tarif eden doküman — görsel bir mockup
değil, "hangi bölge nerede, hangi Standartlar bileşeni kullanılıyor" listesi. Her MVP ekranı
için 4. adımda üretilir, PRD ile birlikte kullanıcı onayına sunulur. Şablon:

```md
## [Ekran Adı]

- Header: [sabit yükseklik, `tokens/colors.css --valeo-blue`, bkz. `baslarken.md` #3]
- Sol: [Sidebar — rail+flyout ya da bottom-nav, bkz. `sidebar.md`]
- Ana alan:
  - [Bölge 1] — [ne gösteriyor: tablo mı (`veri-listeleme.md`), grafik mi (`grafikler.md`),
    sinoptik özet mi (`jenerik-desenler.md`)]
  - [Bölge 2] — ...
- Eylemler: [buton/modal — `bilesenler.md`]
```

Amacı görsel değil **kararı yazılı hale getirmek** — hangi ekranda hangi Standartlar
dokümanının uygulanacağı, onay anında net görünür; inşadan sonra "neden böyle yapıldı"
tartışmasını önler.

## Ne Zaman Hangisi — Özet Tablo

| MVP ölçeği | PRD | TSD | FSD | Layout MD |
|---|---|---|---|---|
| Tek ekranlı basit araç, statik veri | Zorunlu | Atlanır | Atlanır | 1 adet |
| Çok ekranlı portal/basit uygulama | Zorunlu | Backend varsa | Zorunlu | Ekran başına 1 |
| Dashboard (çoklu rol ve/veya backend) | Zorunlu | Zorunlu | Zorunlu | Ekran başına 1 |
