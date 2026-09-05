# Standartlar

Valeo projeleri arasında ortak kullanılan tasarım standartlarının (renkler, logo, jenerik
UI desenleri) tek toplandığı repo. İçerik `ValeoDashboard` ve `Bursa-CV-Projects`
depolarından **değiştirilmeden** kopyalanmış/derlenmiştir — kaynak depolar bu işlem sırasında
hiç düzenlenmemiştir.

## Yeni Bir Projeye Başlıyorsan

**Sıfırdan bir MVP kuruyorsan önce `docs/mvp-akisi.md`'yi oku** — kapsamın nasıl konuşulacağı,
hangi soruların sorulacağı ve inşadan sonra `ExpertAI` ile nasıl test edileceği. Var olan bir
projeye standart taşıyorsan (veya MVP akışının 3. adımındaysan) **`docs/baslarken.md`'yi oku**
— bu repodaki her şeyi hangi sırayla uygulayacağını anlatan giriş noktası. Claude'a bu repoyu
gösterirken de doğrudan ilgili dosyayı işaret et.

## İçindekiler

- `assets/` — logo varlıkları (`Valeo_Logo.png` resmi/birincil, `Valeo_Logo_AIClubPortal.png`
  yedek — SVG yedek wordmark 2026-09-01'de kaldırıldı)
- `.claude/skills/` — Claude Code skill'leri, aynı kopyala-yapıştır mantığıyla: yeni bir
  projeye taşınırken klasör bütünüyle kendi `.claude/skills/`'ine kopyalanır. Üçü de artık
  **tek kaynak** — ayrı bir `docs/*.md` insan-okur kopyası tutmuyorlar (2026-09-02'de
  `apps-script-push.md` ve `standartlar-uyumluluk.md` bu yüzden kaldırıldı)
  - `apps-script-push/` — Apps Script/GAS projesine `clasp` ile push etmeyi otomatik
    tetikler, elle okutmaya gerek bırakmaz
  - `standartlar-uyumluluk/` — yeni/var olan projede standardı uygular (Rehber Modu, kaynağı
    `docs/baslarken.md`) veya var olan kodu tarayıp `standartlar-uyumluluk-<proje-adı>.html`
    raporu üretir (Denetim Modu) — ikisi de yalnız tespit+öneri, kod değişikliği ayrı onay
    ister. `checklist.json` (kriter listesi, `baslarken.md`'den türetilir) +
    `report-template.html` (rapor şablonu) içerir
  - `mvp-akisi/` (2026-09-02) — sıfırdan bir MVP kurulurken (`docs/mvp-akisi.md`,
    `docs/dokuman-standartlari.md`) veya var olan bir uygulama analiz edilirken
    (`docs/playbook.md`'nin Analiz Modu) otomatik tetiklenir; bu üç dokümanı silmez, ince bir
    yönlendirici olarak sarmalar
- `.claude/hooks/` + `.claude/settings.json` — PreToolUse hook'ları + permission allowlist:
  `apps-script-push` skill'inin güvenlik kuralları (kimlik dosyası içeriği okunamaz, commit
  edilemez), kaynak depolara (`ValeoDashboard`/`Bursa-CV-Projects`) yazma engeli, ve
  `tokens/colors-bursa-cv-projects.css`'teki WCAG yorumlarının silinmesini engelleyen guard —
  hepsi CLAUDE.md'deki "Değişmez Kurallar"ın mekanik karşılığı. İlgili skill'le birlikte
  kopyalanmalı, ayrı bırakılırsa koruma atlanır
- `tokens/` — `colors.css` (resmi palet) + her kaynak projenin renk CSS değişkenleri, aynen
  kopyalanmış
- `docs/` — kullanım kuralları ve iki kaynağın karşılaştırması
  - `docs/mvp-akisi.md` — **sıfırdan MVP** giriş noktası: kapsam konuşması, boşluk-doldurma
    soruları, standart-dışı istek akışı, `ExpertAI` denetimine yönlendirme
  - `docs/baslarken.md` — var olan bir projeye standart taşırken giriş noktası, adım adım
    kurulum sırası
  - `docs/renkler.md`
  - `docs/logo.md`
  - `docs/ikonlar.md` — resmi ikon kütüphanesi **Lucide**: boyut/renk kuralı, ne zaman hangi
    ikon, `sidebar.md`'deki `ICONS` nesnesinin kaynağı (2026-08-21 kararı)
  - `docs/sidebar.md` — veri-güdümlü menü, flyout mekanizması, aktif durum, breadcrumb,
    **favoriler** (mini şerit + site haritası paneli, iki yüzey tek kaynak), **komut paleti**
    (Ctrl+K — sayfa+ref+eylem tek aramada)
  - `docs/koyu-mod.md` — dark mode JS mekanizması (açma/kapama, OS tercihi, kalıcılık)
  - `docs/bilesenler.md` — modal, toast/bildirim, **bildirim merkezi** (@mention paneli),
    loading spinner, filtre barı (`FilterDrop`)
  - `docs/veri-listeleme.md` — veri okuma sözleşmesi (`google.script.run`), `ColFilter`
    (filtre/sıralama + aktif filtre chip'leri), büyük tabloda parçalı çizim (ölçülmüş perf
    verisiyle), mobil kart dönüşümü, yapışkan toplam satırı, sayı hizalama, indirme + export
    menüsü
  - `docs/detay-popup.md` — veriye tıklayınca açılan hızlı-bakış popup'ı (`InfoModal`) —
    **kaynağı henüz main'de değil**, dosyanın başındaki uyarıyı oku
  - `docs/detay-panel.md` — sağ panel (drawer): satır-içi düzenleme + önceki/sonraki kayıt
    gezinmesi — `InfoModal`'dan farklı, düzenlemeye izin veren bir kayıt görünümü
    (2026-08-29, TaskTracker referansı)
  - `docs/kanban.md` — kanban panosu + görev kartı: sürükle-bırak, dört katmanlı kart düzeni,
    klavye erişilebilirliği, swimlane (2026-08-29, TaskTracker referansı)
  - `docs/yardim-paneli.md` — karartmayan uygulama-içi yardım çekmecesi, "bunu bana göster"
    spot-ışığı, zorunlu kapsam denetimi, ve aynı mekanizmayı paylaşan ilk-kullanım turu
    (2026-08-29, TaskTracker referansı)
  - `docs/etkilesim-kurallari.md` — proje-bağımsız etkileşim kuralları: hızlı ekleme, ölçüt
    destekli arama, kademeli Escape önceliği, hareket kataloğu (2026-08-29, TaskTracker
    referansı)
  - `docs/grafikler.md` — Chart.js kalıpları: renk paleti, halka/çubuk grafik desenleri, veri-yok
    durumu, tıklanabilir grafik-filtre. ValeoDashboard'da gerçek bir grafik standardı YOK
    (boş canvas yer tutucusu) — tek kaynak Bursa CV Projects.
  - `docs/yetki-gorunumu.md` — salt-okuma/yetki UI deseni (`data-w` + `body.no-*`) — gerçek
    yetki kontrolü sunucuda, bu yalnız görünürlük
  - `docs/yazdirma.md` — `@media print` standardı: chrome gizleme, tablo sayfa kırılımı,
    zorlanmış başlık rengi
  - `docs/dil-yerellestirme.md` — dürüst durum: TR/EN dil değişimi YOK, var olan yalnız
    Türkçe locale biçimlendirme ve arama normalizasyonu
  - `docs/jenerik-desenler.md` — font, köşe yarıçapı, spacing ölçeği, kart/buton, sayfa başlığı,
    erişilebilirlik, **Sinoptik Görünüm** (dashboard özet ekranı — KPI şeridi + durum + anahtar
    grafik + kısayollar) (kısa özetler; yukarıdaki konularda ayrı dokümana yönlendirir)
  - `docs/form-kontrolleri.md` — checkbox/radio/switch/text field/textarea boyutları ve 48×48px
    dokunma hedefi kuralı (2026-08-18, M3 referans materyaliyle karşılaştırma sonucu eklendi)
  - `docs/workspace-addon.md` — Google Docs/Sheets içine açılan Apps Script add-on sidebar'ı
    (uygulama-içi `sidebar.md`'den FARKLI bir kavram) — sabit header/footer, Picker senkronizasyonu
  - `docs/dokuman-standartlari.md` — SPEC/PRD/TSD/FSD/Layout MD tanımları ve hangi MVP
    ölçeğinde hangisinin zorunlu olduğu — `mvp-akisi.md`'nin Plan Onayı (4.) adımının yazılı
    çıktısı
  - `docs/playbook.md` — tasarım standardı değil, **süreç** standardı: AI ajanla inşa
    (BUILD/REVIEW) ve analiz (var olan bir uygulamayı denetleme) sırasında izlenecek disiplin
    — oturum ayrımı (üretici/denetçi), kurtarma promptları (AP), yanılgı kataloğu. Kaynağı
    üçüncü parti bir kurs dokümanı, `mvp-akisi.md`'nin 4. ve 7-8. adımlarını destekler
  - `docs/muhendislik-standartlari.md` — tasarım standardı değil, **ExpertAI denetim
    bulgusu** standardı: 7 ayrı arkadaş projesinin ilk-tur audit'lerinde bağımsız olarak
    tekrarlanan 9 puan-kaybı kalıbı (yetkilendirme, sağlama/sanity-check, otomasyon, yarım
    özellik gizleme, klavye erişilebilirliği, form/durum a11y, minimum analiz katmanı,
    kullanım ölçümü, test iskeleti) — her yeni projede baştan uygulanır (2026-08-29 kararı)
  - `docs/karar-gecmisi.md` — her kalıcı kararın tarihli, gerekçeli günlüğü (2026-09-02'ye
    kadar `CLAUDE.md` içindeydi; dosyayı yalın tutmak için buraya taşındı)

## Resmi Renk Paleti: ValeoDashboard

İki kaynak farklı hex değerleriyle "Valeo rengi" tanımlıyordu; **2026-08-13'te ValeoDashboard
paleti resmi ilan edildi** (`tokens/colors.css`). `Bursa-CV-Projects` paleti marka rengi olarak
kullanılmıyor, yalnız durum-rozeti/tema-duyarlı-metin deseni için referans — detay için
`docs/renkler.md`.

## Kaynaklar

- `eng-furkany/ValeoDashboard` — `ValeoDashboard/Index.html`, `ValeoDashboard/CLAUDE.md`,
  `ValeoDashboard/Valeo_Logo.svg.png`
- `CKapitan/Bursa-CV-Projects` — `src/Stylesheet.html`, `src/Index.html`
