# Karar Geçmişi

Bu dosya, bu repoda verilmiş tüm **kalıcı kararların** tarihli, gerekçeli günlüğüdür — "ne"
sorusuna `CLAUDE.md` ve `docs/baslarken.md` cevap verir, "neden ve ne zaman" sorusuna burası.
2026-09-02'ye kadar `CLAUDE.md` içinde "Kalıcı Kararlar" başlığı altında tutuluyordu; her
oturumda otomatik yüklenen dosyayı yalın tutmak için buraya **birebir, sadeleştirilmeden**
taşındı (bkz. aşağıdaki 2026-09-02 maddesi). Yeni bir kalıcı karar verildiğinde eklenecek yer
artık `CLAUDE.md` değil, burasıdır.

## Kalıcı Kararlar

- **Kaynak depolara asla yazılmaz.** Bu repo yalnız *okuyarak* beslenir — `ValeoDashboard` ve
  `Bursa-CV-Projects` içine hiçbir commit/push yapılmaz. Güncelleme gerekiyorsa önce o depoda
  yapılır, sonra buraya elle taşınır.
- **Resmi renk paleti ValeoDashboard'dır (2026-08-13 kararı).** İki kaynak farklı hex
  kullanıyordu (`ValeoDashboard` `#041b3c`/`#76ff03` vs `Bursa-CV-Projects` `#1B2B4B`/`#78BE20`);
  artık `tokens/colors.css` (= ValeoDashboard paleti) kanonik dosyadır, yeni projeler buradan
  başlar. `Bursa-CV-Projects` paleti (`tokens/colors-bursa-cv-projects.css`) **marka rengi
  olarak resmi değil** — yalnız durum-rozeti ve tema-duyarlı-metin DESENİ için referans olarak
  tutulur (hex'leri değil, deseni kopyala). Detay ve gerekçe: `docs/renkler.md`.
- **Kopyalanan içerik aynen tutulur, sadeleştirilmez.** `tokens/*.css` dosyalarındaki WCAG
  ölçüm yorumları (ör. "#6B7280 açık zeminde 4.46 — AA eşiğinin altında") kaldırılmaz — hangi
  rengin neden seçildiğinin tek kaydı orası. Silinirse aynı hata ileride tekrar edilir.
- **Resmi logo `assets/Valeo_Logo.png`'dir (2026-09-01 kararı, 2026-08-21 kararının
  yerine geçer).** Aynı çizim (renk/font/işaret) iki dosyada da birebir aynı. Önceki kararda
  küçük/self-contained `Valeo_Logo_AIClubPortal.png` (600×285, 38KB) üretimde (AI Club Portal)
  doğrulanmış olduğu için resmi seçilmişti; kullanıcı talebiyle roller tersine çevrildi —
  ValeoDashboard kaynaklı büyük dosya (3840×1825, 148KB) artık **resmi/birincil**,
  `assets/Valeo_Logo_AIClubPortal.png` ise **yedek** (`onerror` ile düşülecek hedef, ayrıca
  e-posta CID gömme gibi küçük-dosya gereken yerlerde kullanılabilir). Detay: `docs/logo.md`.
  Aynı gün `assets/valeo-wordmark-fallback.svg` **silindi** — ayrı bir wordmark çizimi tutmak
  yerine artık gerçek logonun küçük PNG kopyası (`Valeo_Logo_AIClubPortal.png`) yedek olarak
  kullanılıyor; bu, görsel olarak orijinal logoyla birebir eşleştiği için önceki SVG
  wordmark'tan daha sadık bir yedek.
- **Bu repo canlı kod içermez** — CSS token dosyaları `<link>` ile değil, kopyala-yapıştır
  referansı olarak kullanılmak üzere tutulur. Bir GAS/HTML projesine entegre edilecekse ilgili
  projenin kendi `Stylesheet.html`/`Index.html`'ine elle taşınır.
- **`docs/baslarken.md` giriş noktasıdır.** Yeni bir proje kurulumu için bu repo gösterildiğinde
  önce o dosya okunur — hangi dokümanın hangi sırada uygulanacağını anlatır. Yeni bir
  doküman eklendiğinde `baslarken.md`'ye de bir satır eklenmezse o doküman keşfedilemez hale
  gelir (README/CLAUDE.md'de listelense bile, akış orada değil).
- **Grafik standardı YALNIZ Bursa CV Projects'ten** (`docs/grafikler.md`). ValeoDashboard'da
  Chart.js hiç initialize edilmemiş — yalnız boş `<canvas>` yer tutucusu var, bu bir tasarım
  kararı değil eksik bir taslak. Bursa CV'nin kendi grafik paletleri de (`PALETTE`,
  `PALETTE_RGBA`, `TYPE_PALETTE`, `PPCA_PALETTE`...) SAYFA BAŞINA ayrışmış — tek bir kanonik
  yok. `docs/grafikler.md` en eksiksiz olanı (`Dashboard.html`'in `PALETTE`'i, marka+durum
  renklerinin uzantısı) öneri olarak işaretliyor, "tek doğru" diye sunmuyor.
- **Favoriler (`docs/sidebar.md` içinde) iki yüzeyli TEK sistem:** sağ kenardaki mini şerit
  (`#sm-rail`, en fazla 5, her zaman görünür) ve site haritası panelindeki (Ctrl+M) yıldız +
  liste — ikisi de aynı `_smFav` dizisini okur/yazar, ikinci bir favori listesi açma. Kalıcılık
  `saveUserPref('favPages', ...)` ile sunucuda (GAS'ta `localStorage` yasağıyla aynı desen).
- **Veri listeleme standardı (`docs/veri-listeleme.md`) — `ColFilter` + parçalı çizim.**
  `google.script.run` sonucu HER ZAMAN denetlenir (`{error}`/`false` sessiz hata olabilir).
  Büyük tablolarda `setTableHtmlChunked`/`scheduleRender` **sanallaştırma DEĞİL** — tüm satır
  DOM'a girer, yalnız ne zaman girdiği zamanlanır; bu yüzden indirme/yazdırma önce
  `chunkFlush()` çağırmak ZORUNDA, yoksa eksik satır kazınır. Bu, main'de ÖLÇÜLMÜŞ ve stabil
  bir performans deseni (3,7×–9,3× kazanç kaydedildi) — kaynak `docs/grafikler.md`'deki
  "tutarsız/dağınık" bulgusundan FARKLI, burada tek katman var.
- **Detay popup'ı (`docs/detay-popup.md`, `InfoModal`) — main'e ALINDI (2026-08-23
  doğrulaması).** Eklendiğinde yalnız `claude/code-review-test-5319gj` branch'indeydi (main'de
  YOK, "kaynağı doğrula" uyarısıyla eklenmişti); 2026-08-23'te Bursa CV Projects'in `main`
  branch'inde (`src/JavaScript.html`, 6 çağrı yeri) olduğu doğrulandı ve dosyadaki provenance
  uyarısı kaldırıldı. Tek mekanik fark: sunum Dialog'dan Side Sheet'e döndürülmüş — detay için
  `docs/detay-popup.md`.
- **Sidebar ve dark-mode standartları var.** `docs/sidebar.md` ve `docs/koyu-mod.md` Bursa CV
  Projects'in gerçek JS mekanizmalarını (veri-güdümlü menü, `applyDarkMode`/`osPrefersDark`
  vb.) belgeler — ValeoDashboard'da ikisi de yok, o yüzden tek kaynak Bursa CV.
  **`docs/dil-yerellestirme.md`: iki KAYNAK projede (ValeoDashboard, Bursa CV) gerçek bir
  Türkçe/İngilizce dil değiştirme mekanizması hâlâ yok** (ikisi de sabit `lang="tr"`); var
  olan yalnız Türkçe locale biçimlendirme ve karakter-duyarsız arama. **2026-08-21'de bu
  dosyaya, kaynak proje OLMAYAN ama gerçek/çalışan bir TR/EN sistemi kurmuş AI Club Portal'ın
  deseni PROVENANCE UYARISIYLA eklendi** (`T`/`t()` sözlük deseni + 3 bilinen eksik — bkz. aynı
  dosyanın "Gerçek Bir Örnek" bölümü). Bir dahaki sefere bu soru gelirse önce bu dosyaya bak,
  tekrar kaynak taramaya gerek yok.

- **Modal/dialog için tek kanonik desen ValeoDashboard'ınki, "modal" adlandırma kuralıyla
  birlikte** (`docs/bilesenler.md`). Bursa CV Projects'te ortak modal bileşeni yok — sayfa
  başına ayrı overlay var; bu bilinçli örnek alınacak bir desen değil, bir eksiklik.
  Bursa CV'nin `a11yEnhance()`'i id/class'ında "modal" geçen öğelere otomatik ARIA ekliyor —
  yeni bir overlay yazılırken bu adlandırma korunmalı, yoksa erişilebilirlik kancası çalışmaz.
- **Yetki (`docs/yetki-gorunumu.md`) ve yazdırma (`docs/yazdirma.md`) tek kaynaklı, ValeoDashboard'da
  karşılığı yok.** Yetki görünümünde gerçek kontrol HER ZAMAN sunucuda — `data-w`/`body.no-*`
  CSS'i yalnız görünürlük, güvenlik değil; bunu tersine okumak ciddi bir yanlış anlama olur.
  Ayrıca `docs/sidebar.md` (komut paleti, Ctrl+K), `docs/bilesenler.md` (bildirim merkezi,
  toast'tan ayrı) ve `docs/veri-listeleme.md` (aktif filtre chip'i, yapışkan toplam satırı,
  sayı hizalama, export menüsü) genişletildi — bunlar mevcut dokümanların İÇİNDE, ayrı dosya
  değil; yeni bir küçük UI parçası eklerken önce ilgili dokümanın var olup olmadığına bak.
- **2026-08-18: M3 referans materyaliyle (Gemini Notebook, 3 PDF) karşılaştırma sonucu bir
  dizi karar verildi — KAYNAK PROVENANCE FARKLI.** Bu PDF'ler ValeoDashboard/Bursa-CV-Projects
  DEĞİL, jenerik bir M3 spesifikasyon anlatımı; her madde tek tek "kabul/ret/değiştirerek
  kabul" olarak görüşüldü, körü körüne kopyalanmadı. Üst-karar: **köşe yarıçapı/tonal-elevation
  gibi M3'ün GÖRSEL önerileri reddedildi** — mevcut düz/köşeli dil (6/8/12px radius, klasik
  box-shadow) korundu; yalnız sayısal/davranışsal boşluklar dolduruldu. Kabul edilenler:
  Container/On-Container renk rolleri (`docs/renkler.md`), 8px tabanlı spacing ölçeği
  (`docs/jenerik-desenler.md`), buton state katmanları + Outlined/Text vurgu varyantları
  (`docs/jenerik-desenler.md` — 4 renk-varyantı DEĞİŞMEDİ, üstüne eklendi), dialog 4-tür
  taksonomisi + scrim %40 (`docs/bilesenler.md`), tooltip + wavy progress (`docs/bilesenler.md`),
  kart Outlined varyantı + chip 5-tip taksonomisi (`docs/jenerik-desenler.md` /
  `docs/veri-listeleme.md`), tablo satır/header yüksekliği (`docs/veri-listeleme.md`). **Sidebar
  mimarisi M3'ün adaptif 3-katman modeline geçti** (`docs/sidebar.md` — mobilde yeni bir
  bottom-nav eklendi, masaüstü/tablet rail+flyout aynen kaldı, yalnız M3 terimleriyle
  yeniden çerçevelendi). İki yeni doküman: `docs/form-kontrolleri.md` (tamamen yeni alan) ve
  `docs/workspace-addon.md` (KAPSAM GENİŞLEMESİ — bu depo artık bağımsız web app'lerin yanında
  Google Workspace add-on'larını da kapsıyor; `sidebar.md`'nin uygulama-içi navigasyon
  sidebar'ıyla KARIŞTIRILMAMALI, tamamen ayrı bir konak/kullanım amacı).

- **2026-08-21: KAPSAM GENİŞLEMESİ — bu repo artık yalnız renk/logo/bileşen değil, "işe nasıl
  başlanır" süreci de tutuyor (`docs/mvp-akisi.md`).** Nihai hedef: hiç bilmeyen biri tek bir
  Claude Code session'ında bu repoyu göstererek kendi MVP'sini tarif etsin, standartlar
  otomatik uygulansın, sonra `eng-furkany/ExpertAI`'deki audit'lerle test edilip düzeltilsin.
  Bu, `docs/baslarken.md`'nin YERİNE değil ÖNÜNE geçer — `baslarken.md` hâlâ "hangi standart
  dosyasını ne zaman uygularım" sorusuna cevap veriyor, `mvp-akisi.md` ondan önceki "önce ne
  konuşulur" sorusuna. Repo hâlâ **canlı kod içermez** kararı geçerli — akış MVP'nin kendi
  reposunda inşa edilmesini anlatır. Standart-dışı bir istek ısrarla gelirse Claude bunu tek
  başına karara bağlamaz: kullanıcıyı `muhammed-furkan.yesilmen.ext@valeo.com`'a yönlendirir,
  kalıcı hale getirme kararı yine bu dosyaya elle işlenen normal Kalıcı Karar süreciyle olur.
- **`docs/apps-script-push.md` (2026-08-21) — KAYNAK PROVENANCE FARKLI, tasarım deseni
  değil.** ValeoDashboard/Bursa-CV-Projects'ten değil, kullanıcının kendi hazırladığı bir
  oturum-mekaniği notundan geldi: Claude Code web'in bulut konteynerinden `clasp` ile Apps
  Script'e push etmenin güvenli sırası (OAuth, onay, kimlik-dosyası kuralları). `mvp-akisi.md`
  içindeki Apps Script hedefli MVP'ler için devreye giriyor; hedef Apps Script değilse hiç
  açılmaz. **(2026-09-02 notu: bu dosya artık yok — bkz. altta 2026-09-02 maddesi; skill
  `SKILL.md` tek kaynak oldu.)**
- **`docs/dokuman-standartlari.md` (2026-08-21) — KAYNAK PROVENANCE FARKLI, müdür notu.**
  ValeoDashboard/Bursa-CV-Projects'ten değil, kullanıcının müdürünün "standart dosyamızda
  bunlar da olsun" dediği notlardan geldi: SPEC (şemsiye terim), PRD (her MVP'de zorunlu),
  TSD (yalnız gerçek backend varsa), FSD (yalnız çok-ekranlı/çok-rollü MVP'de), Layout MD
  (ekran başına, markdown yerleşim tarifi) — `mvp-akisi.md`'nin 4. adımının (Plan Onayı)
  yazılı çıktısını tanımlıyor. Aynı notta geçen **Sinoptik**, doküman türü değil bir UI
  deseni olduğu için `jenerik-desenler.md`'ye eklendi (dashboard özet ekranı: KPI şeridi +
  durum rozeti + 1-2 grafik + kısayollar, salt-okunur).
- **Resmi ikon kütüphanesi Lucide'dır (2026-08-21 kararı), `docs/ikonlar.md`.** Daha önce
  hiçbir Standartlar dokümanı bir ikon setini isimlendirmiyordu — `sidebar.md`'deki
  `ICONS.mytask` gibi referanslar kaynağı belgesiz, Bursa CV Projects'e özel elle çizilmiş
  SVG'lere işaret ediyordu. Artık `ICONS` Lucide'dan seçilen ikonlarla doldurulur; boyut
  (20px, ikon-only'de 16px) ve renk (`currentColor`) kuralı `ikonlar.md`'de. **Ayrıca "Durum
  Rozeti" ile `veri-listeleme.md`'deki "Status chip" AYNI bileşen olduğu netleştirildi** —
  ikisi ayrı implementasyon değil, hangi bağlamda hangi ismin kullanılacağı o dosyadaki
  isimlendirme kuralında yazılı.
- **2026-08-21: `eng-furkany/AI_Club_Portal` iki dar konuda (dil, logo) referans olarak
  eklendi — KAYNAK PROVENANCE FARKLI, üçüncü bir "kaynak proje" DEĞİL.** Bu repo hâlâ yalnız
  `ValeoDashboard`+`Bursa-CV-Projects`'ten beslenir (yukarıdaki "Kaynak depolara asla
  yazılmaz" kuralı bu ikisi için geçerli, AI Club Portal'a yazma kısıtı yok — o bir kaynak
  değil, standartları tüketen bir proje, bkz. `baslarken.md`). AI Club Portal'ın Standartlar
  reposuyla karşılaştırmalı analizinde şu ikisi seçilip taşındı: (1) `docs/logo.md` — küçük/
  self-contained logo dosyası + e-posta CID gömme deseni yeni resmi kaynak oldu (yukarıdaki
  logo maddesi), (2) `docs/dil-yerellestirme.md` — gerçek çalışan bir TR/EN sözlük deseni,
  bilinen 3 eksiğiyle birlikte örnek olarak eklendi (yukarıdaki dil maddesi). Renk paleti
  KASITLI OLARAK taşınmadı — AI Club Portal kendi ayrı bir palet (`#82E600`/`#4E6B7C`)
  kullanıyor, bu resmi ValeoDashboard paletinin (`tokens/colors.css`) yerini almadı/almayacak;
  tam tersine AI Club Portal'ın kendisi bu ziyarette resmi palete geçirildi (bkz. o projenin
  kendi commit geçmişi). Erişilebilirlik/FilterDrop/dark-mode-fallback/yazdırma gibi diğer
  bulgular AI Club Portal'a birebir Standartlar'daki mevcut dokümanlardan uygulandı, bu repoya
  yeni bir doküman/karar eklemedi.
- **2026-08-21: bu repoya ilk Claude Code SKILL'i eklendi — `.claude/skills/apps-script-push/`
  — KAPSAM GENİŞLEMESİ.** Önceki tüm içerik (tokens/docs) insanın okuyup elle uyguladığı
  referanstı; bu ilk kez Claude'un kendiliğinden tetikleyip çalıştırdığı bir mekanizma. Aynı
  kopyala-yapıştır disiplinine tabi — repo canlı bağlanmaz kararı bozulmadı, yalnız kopyalanan
  birim artık bir CSS/markdown dosyası değil bütün bir skill klasörü olabiliyor. Kaynağı
  `docs/apps-script-push.md` — ikisi senkron tutulmalı, biri değişirse diğeri de güncellenir.
  **(2026-09-02 notu: bu senkron zorunluluğu ortadan kalktı — `docs/apps-script-push.md`
  silindi, `SKILL.md` tek kaynak oldu, bkz. altta 2026-09-02 maddesi.)**
  **Hook ve permission-allowlist de eklendi (aynı gün) — `.claude/settings.json` +
  `.claude/hooks/guard-clasprc-*.sh`.** İki PreToolUse hook'u: (1) `Bash` matcher'ı,
  `.clasprc.json` içeriğini okuyan komutları (yalnız `ls`/`stat`/`test -f` varlık kontrolüne
  izin verilir) ve `.clasprc.json` çalışma dizinindeyken çalıştırılan `git add`/`commit`'i
  engeller; (2) `Read|Grep` matcher'ı, bu dosyayı o araçlarla açma/arama girişimini engeller.
  Kural artık düz metin talimat değil, mekanik olarak zorlanıyor — pipe-test edilip
  doğrulandı (10 senaryo: izinli/engellenen komutlar, git add ile/olmadan). Permission
  allowlist'i clasp komut setini (`npm i -g @google/clasp`, `clasp login/status/push` vb.)
  önceden onaylıyor, sürtünmeyi azaltır.

- **2026-08-23: Bursa CV Projects, `baslarken.md`'nin 14 adımına karşı denetlendi — sonuç
  büyük ölçüde uyumlu, iki bilinçli sapma kaydedildi.** Denetim bir standart taşıma değil, var
  olan bir üretim projesinin gözden geçirilmesiydi. Tek gerçek boşluk (Bursa CV'nin kendi
  `CLAUDE.md`'sindeki eski `#1B2B4B`/`#0057A8`/`#78BE20` palet satırının güncel olmaması) o
  depoda düzeltildi. İki kalıcı sapma, kullanıcı onayıyla **koddan geri alınmadı**, burada
  belgelendi: (1) renk — `docs/renkler.md`'deki "Bursa CV Projects'in kendi renk migrasyonu"
  maddesi, (2) ikon kütüphanesi — `docs/ikonlar.md`'deki "Bilinen Sapma: Bursa CV Projects →
  Material Symbols" bölümü. İkisi de "yanlış" değil, kendi bağlamında savunulabilir kararlar;
  bu repo onları zorla standarda çekmek yerine gerekçeleriyle kaydetti.

- **2026-08-24: KAPSAM GENİŞLEMESİ — `docs/playbook.md` eklendi, KAYNAK PROVENANCE FARKLI.**
  ValeoDashboard/Bursa-CV-Projects'ten değil, kullanıcının paylaştığı üçüncü parti bir Udemy
  kursu dokümanından (*AI-Native Software Engineering — Prompt Playbook*, 1900+ satır,
  .NET/React'a kilitli) süzüldü — stack-bağımsız desen (oturum ayrımı: üretici kendini
  denetleyemez, AP kurtarma rampaları, AI yanılgı kataloğu) taşındı, kursun 13 fazlık uygulama
  akışı ve hazır prompt script'leri taşınmadı. Bu bir görsel/UI standardı değil — repodaki ilk
  **süreç** dokümanı (`docs/mvp-akisi.md`, `docs/dokuman-standartlari.md`'nin bir ucundan
  devamı): "hangi Standartlar dosyası uygulanır" değil "AI ajanla nasıl inşa/analiz edilir"
  sorusuna cevap veriyor. **İki kullanım modu bilinçli olarak birlikte tutuldu:** İnşa Modu
  (`mvp-akisi.md` 4. adım sonrası BUILD/REVIEW döngüsü) ve Analiz Modu (7-8. adımdaki ExpertAI
  denetimi VE bu akışın dışındaki her "var olan uygulamayı analiz et" isteği) — ikisi de aynı
  omurgayı (niyet → doğrulanabilir tanım → bağımsız denetim → kanıt → insan kararı) ve aynı
  yanılgı kataloğunu paylaşıyor, o yüzden tek dosyada. `baslarken.md`, `mvp-akisi.md` ve
  `README.md` bu dosyaya işaret edecek şekilde güncellendi (discoverability kuralı, bkz. altta).

- **2026-08-29: Koyu mod, TR/EN dil desteği ve mobil alt navigasyon "opsiyonel"den
  "VARSAYILAN"a çevrildi — kullanıcı özellikle kaldırılmasını istemedikçe uygulanır.** Üçü de
  daha önce belgeliydi (`koyu-mod.md`, `dil-yerellestirme.md`, `sidebar.md`'nin bottom-nav
  bölümü) ama `baslarken.md` bunları "isteniyorsa uygula" / "Türkçe yeterliyse gerek yok"
  diye koşullu sunuyordu. `eng-furkany/test1` reposundaki Proje Panosu mockup'ında (bkz.
  `mvp-akisi.md` akışının bir uygulaması) bu üçü ilk turda hiç kurulmadı — ikisi (koyu mod,
  dil) bilerek "kullanıcı istemedi" diye atlandı, biri (bottom-nav) `sidebar.md`'nin ilgili
  bölümü hiç açılmadığı için atlandı. Kullanıcı sonradan fark edip sorguladı. **Standart metni
  belirsiz değildi** — üçü de tam desenleriyle belgeliydi, `sidebar.md` bottom-nav'ı zaten
  "gerçek bir boşluğu dolduran, kozmetik olmayan" bir karar diye işaretlemişti; sorun
  standardın "isteniyorsa" ifadesinin sessizce atlanmaya davetiye çıkarmasıydı. **Karar:**
  bundan sonra üçü de her yeni projede baştan kurulur; kullanıcı "gece modu istemiyorum" /
  "yalnız Türkçe kalsın" / "mobilde de sidebar kalsın" gibi özel bir tersine çevirme talebinde
  bulunursa atlanır — varsayılan yön değişti, mekanizmaların kendisi (`applyDarkMode`, `T`/
  `t()`, bottom-nav CSS/HTML'i) değişmedi. `baslarken.md` madde 9 ve 12 güncellendi, madde 3'e
  bottom-nav satırı eklendi; `koyu-mod.md`, `dil-yerellestirme.md`, `sidebar.md`'nin ilgili
  bölümlerinin başına birer çapraz-referans notu eklendi.

- **2026-08-29: KAPSAM GENİŞLEMESİ — `docs/muhendislik-standartlari.md` eklendi, KAYNAK
  PROVENANCE FARKLI.** ValeoDashboard/Bursa-CV-Projects'ten değil, `eng-furkany/ExpertAI`
  denetim akışının **7 ayrı arkadaş projesinde** (4PK, Task Tracker, Balans Makinesi, Bursa
  CV Projects, VALEO OMG Dashboard, Valeo Lojistik Platformu, CRD-LS-Automation — 7 farklı
  geliştirici, tek kod tabanı değil) bağımsız olarak tekrarlanan denetim bulgularından
  süzüldü. Bu, repodaki ilk **mühendislik sağlamlığı** dokümanı — önceki tüm içerik (tokens/
  görsel desenler) veya süreç (`playbook.md`/`mvp-akisi.md`) idi, bu ise kod-davranışı
  kuralı: sunucu tarafı yetkilendirme istisnasız (3 projede Security'yi tavana çarptırdı —
  Balans 35, OMG 28, CRD-LS 35), ekrana yazmadan önce sağlama/sanity-check (Lojistik'te 4 P0,
  OMG'de "Kaydet hiçbir şey kaydetmiyor" P0), en az bir zamanlanmış tetikleyici, yarım/stub
  özelliklerin arayüzden gizlenmesi, birincil eylemlerin klavyeyle ulaşılabilir olması
  (Task Tracker A11y 30, CRD-LS A11y 32 — ikisi de WCAG'nin en alt bandı), form/durum
  erişilebilirliği, minimum bir eşik-tabanlı analiz katmanı (Advanced Analytics 7 projenin
  hepsinde 58-68 aralığında kümelendi — en tutarlı bulgu), kullanım verisinin toplanıp
  özetlenmesi, kritik hesaplamalar için birkaç golden-value testi. **Yalnız iki ayrı projede
  bağımsız tekrarlanan bulgular buraya girdi** — tek projede kalan bulgular kendi ExpertAI
  raporunda kalır, bu listeye taşınmaz (dosyanın kendi "Bu Liste Nasıl Büyür" bölümü). Nasıl
  uygulanır: `baslarken.md` madde 15 (kuruluşta varsayılan) ve `playbook.md`'nin Dahili
  REVIEW adımı (SHIP'ten önce kendi kendine kontrol) her ikisi de bu dosyaya işaret edecek
  şekilde güncellendi; `jenerik-desenler.md`'nin erişilebilirlik bölümüne de, kaynak
  projelerde karşılığı olmayan üç eksik (klavye, `label for`, `aria-live`) için çapraz
  referans eklendi; `README.md` içindekiler listesi de güncellendi (discoverability kuralı).
  **Aynı gün eklenen "İyi Örnekler" bölümü:** dosya yalnız puan kaybettiren kalıpları değil,
  aynı 7 raporda bir projenin bir kategoriyi iyi çözdüğü somut teknikleri de tutuyor — Bursa
  CV Projects (zaten resmi kaynak) OAuth2/native kimlik, axe-core CI "artmama tavanı" +
  isimlendirmeye dayalı `a11yEnhance()`, toplu `setValues()` + önbellek nesil sayacı; Balans
  Makinesi (KAYNAK PROVENANCE FARKLI, AI Club Portal'daki gibi dar-konu referans, üçüncü
  kaynak depo DEĞİL) merkezi `esc()`/`safeUrl()`, kilit+tekrar-kontrol, "kırp ve söyle",
  prescriptive "Uygula" düğmesi; VALEO OMG Dashboard (aynı dar-konu referans statüsü) GAS
  kodunu Node.js mock harness'le test etme tekniği.

- **2026-08-29: `nphlvn/TaskTracker` üçüncü bir referans olarak eklendi — KAYNAK PROVENANCE
  FARKLI, üçüncü bir "kaynak proje" DEĞİL.** Aynı statüde `eng-furkany/AI_Club_Portal`
  (2026-08-21 maddesi) gibi: bu repo hâlâ yalnız `ValeoDashboard`+`Bursa-CV-Projects`'ten
  beslenir, "Kaynak depolara asla yazılmaz" kısıtı TaskTracker'a uygulanmaz (o bir kaynak
  değil, standartları tüketen — ve zaten resmi ValeoDashboard hex'leriyle üretimde olan —
  bağımsız bir uygulama). Kullanıcının isteğiyle ("TaskTracker'da bulunan ama Standartlar'da
  bulunmayan işe yarar/standardize elemanları ekle") yapılan karşılaştırmalı analizde şunlar
  taşındı, hiçbiri resmi paleti/mevcut bir kararı değiştirmedi — yalnız eklendi:
  - `docs/renkler.md`: isimden türeyen kararlı renk (avatar/proje noktası), K1-K4 öncelik
    paleti (FranklinCovey/Eisenhower), inline style/SVG'ye giren renklerin tema değişiminde
    tazelenmesi gerektiği kuralı.
  - `docs/jenerik-desenler.md`: akışkan (`clamp()`) tipografi ölçeği, z-index katman tablosu,
    "birincil vurgu rengi ekranda yalnızca bir kez" kuralı, Avatar bileşeni.
  - `docs/bilesenler.md`: Kayıt Göstergesi (savebar — optimistic UI'ın görsel karşılığı),
    Undo Toast (onay penceresine **alternatif**, ne zaman hangisi seçilmeli notuyla), Segment
    Kontrolü, Boş Ekran şablonu, modalın açıkken yeniden çizilirken kök DOM'u değiştirmemesi
    notu.
  - `docs/veri-listeleme.md`: yapışkan ilk sütun + `overflow` kapsayıcısından taşan filtre
    panelleri için `position:fixed` çözümü.
  - `docs/grafikler.md`: "yüklenemeyen veri ≠ boş veri" ayrımı (sıfır göstermek yerine "Tekrar
    dene" düğmesi) + az örnekli oranı gizleme kuralı — mevcut "Veri Yok Durumu" deseninin
    yerine değil, onun iki alt-durumu olarak.
  - `docs/dil-yerellestirme.md`: Türkçe ad biçimlendirme (ad Baş-Harf-Büyük, soyad TAMAMEN
    BÜYÜK) + İ/I gotcha'sının bu bağlamdaki somut uygulaması.
  - `docs/playbook.md`: TaskTracker'ın kendi `DENETIM.md`'si, Analiz Modu'na "Gerçek Bir
    Örnek" olarak eklendi (233 bulguluk bir denetimin önem-seviyesi/risk-sınıfı/kök-sebep
    taksonomisi) — `dil-yerellestirme.md`'ye AI Club Portal'ın eklendiği yöntemin aynısı.
  - **Dört yeni doküman** (hiçbirinin karşılığı yoktu): `docs/kanban.md` (pano + görev kartı),
    `docs/detay-panel.md` (sağ panel — düzenlenebilir detay + kayıt gezinmesi, `detay-popup.md`
    → `InfoModal`'dan FARKLI: o salt-okunur, bu düzenlemeye izin veriyor), `docs/yardim-paneli.md`
    (karartmayan yardım çekmecesi + spot-ışığı + ilk-kullanım turu), `docs/etkilesim-kurallari.md`
    (hızlı ekleme, ölçüt destekli arama, kademeli Escape, hareket kataloğu).
  `baslarken.md` ve `README.md` discoverability kuralına göre güncellendi (madde 4b/5b/6c/6d
  + içindekiler listesi) — bir dahaki sefere TaskTracker karşılaştırması istenirse önce bu
  maddeye ve yukarıdaki dosyalara bakılmalı, tekrar kaynak taramaya gerek yok.

- **2026-08-31: `baslarken.md`'ye 16. madde — "Bitirmeden Kontrol Et" — eklendi. Yeni bir
  desen/karar DEĞİL, mevcut listenin uygulanmasını zorunlu kılan bir kapı.** Bir vitrin
  projesinde (TaskTracker karşılaştırmasının kendisini göstermek için kurulan mock uygulama)
  sidebar, logo, arama çubuğu, geri bildirim düğmesi, komut paleti, favoriler, tooltip ve
  dashboard grafiklerinin çoğu **hiçbiri repoda eksik olmadığı halde** ilk turda atlandı —
  Claude listeyi baştan geçirmek yerine hafızadan/kısmi uyguladı. Kullanıcı sorduğunda cevap
  her seferinde "madde zaten vardı, kontrol edilmemişti" oldu, hiçbir yeni doküman gerekmedi.
  Bu, TaskTracker `CLAUDE.md` §9'daki `_valeo.helpAudit()` zorunlu denetim kapısıyla ve
  `playbook.md`'nin "iyimser raporlama" yanılgısıyla (kanıtsız "bitti" demek) aynı kökten bir
  boşluk. **Sonuç kural:** bu repoyu bir projeye/vitrine uygularken "bitti" demeden önce
  `baslarken.md`'nin 0-15 arası maddeleri tek tek — hafızadan değil, dosyayı yeniden açarak —
  gözden geçirilir; bir madde koşullu ("varsa") olduğu için atlandıysa bu kabul edilebilir,
  hiç bakılmadan atlanmışsa değil.

- **2026-09-01: KAPSAM GENİŞLEMESİ — repoya ikinci Claude Code SKILL'i eklendi,
  `.claude/skills/standartlar-uyumluluk/` (+ kaynağı `docs/standartlar-uyumluluk.md`).**
  `apps-script-push`'la aynı desen (kopyala-yapıştır, `docs/*.md` ↔ `SKILL.md` senkron
  kuralı) ama farklı bir ihtiyaca cevap veriyor: `baslarken.md`'yi elle uygulamak yerine
  otomatik tetikleyen **Rehber Modu** ve var olan bir projenin kodunu tarayıp kanıta dayalı
  bir uyumluluk raporu üreten **Denetim Modu**. Denetim Modu'nun kriter listesi
  (`checklist.json`, 21 kategori/~78 kriter) `baslarken.md`'nin 1-15 arası adımlarından
  birebir türetildi — yeni bir `baslarken.md` maddesi eklenip `checklist.json`'a
  yansıtılmazsa denetim o standardı hiç göremez, bu yüzden üçü (bu dosya değil, `baslarken.md`
  + `docs/standartlar-uyumluluk.md` + `checklist.json`) senkron tutulmalı. **Kalıcı karar:
  bu skill hiçbir kod dosyasını kendiliğinden değiştirmez** — yalnız tespit + öneri + rapor
  (`standartlar-uyumluluk-<proje-adı>.html`); bulunan bir sapmayı düzeltmek her zaman ayrı ve
  açık bir kullanıcı onayı ister, raporun kendisi onay sayılmaz. Bu, kullanıcının açık
  talebiyle netleşti (önceki tur: "projeye etki edecek" ifadesi otomatik-düzeltme mi yoksa
  tespit-öneri mi diye soruldu, cevap ikincisiydi) ve repronun genel ExpertAI/`playbook.md`
  felsefesiyle ("kanıt sun, insan karar versin") tutarlı. Aynı gün, kod taraması gerektirmeyen
  ayrı bir araç da üretildi — kullanıcının kendi projelerini elle puanlayabileceği interaktif
  bir HTML skor kartı (Artifact olarak yayınlandı, bu repoya dosya olarak **eklenmedi** — ikisi
  farklı ihtiyaç: biri öz-değerlendirme, diğeri (bu skill) koda dayalı otomatik denetim). Bu
  madde, hemen üstteki 2026-08-31 "Bitirmeden Kontrol Et" kapısına da tabi: `standartlar-
  uyumluluk` skill'i eklenirken `baslarken.md`'nin 0-15 arası maddeleri tek tek gözden
  geçirilerek `checklist.json`'a aktarıldı, hafızadan yeniden üretilmedi.
  `baslarken.md`, `README.md` discoverability kuralına göre güncellendi. **(2026-09-02 notu:
  senkron zorunluluğu `docs/standartlar-uyumluluk.md` ayağı için ortadan kalktı — o dosya
  silindi, `SKILL.md` tek kaynak oldu; `baslarken.md` ↔ `checklist.json` ↔ `SKILL.md` ilişkisi
  aynen sürüyor, bkz. altta.)**

- **2026-09-02: KAPSAM GENİŞLEMESİ + MİMARİ SADELEŞTİRME — rule/skill/hook'a dönüşebilen her
  şey dönüştürüldü, `CLAUDE.md` yalınlaştırıldı.** Kullanıcı isteğiyle: (1) `CLAUDE.md`
  (320 satır, tarihli karar günlüğü) ~45 satıra indirildi — tüm "Kalıcı Kararlar" içeriği
  **birebir, sadeleştirilmeden** bu dosyaya (`docs/karar-gecmisi.md`) taşındı; `CLAUDE.md`'de
  yalnız değişmez kurallar ve giriş-noktası pointer'ları kaldı. (2) İki doc/skill çifti
  birleştirildi: `docs/apps-script-push.md` ve `docs/standartlar-uyumluluk.md` silindi,
  `.claude/skills/apps-script-push/SKILL.md` ve `.claude/skills/standartlar-uyumluluk/SKILL.md`
  artık tek kaynak — ikisi de zaten insan-okur haldeydi, ayrı bir "insan kopyası" gereksiz
  duplikasyondu ve CLAUDE.md'de üç ayrı yerde elle "senkron tutulmalı" hatırlatması
  gerektiriyordu. `baslarken.md` **silinmedi** — o bir prosedür kopyası değil, tüm `docs/`'a
  giden index, farklı bir rol (`standartlar-uyumluluk` skill'i onu sarmalıyor, içeriğini
  kopyalamıyor). (3) Üçüncü Claude Code SKILL'i eklendi: `.claude/skills/mvp-akisi/` —
  `docs/mvp-akisi.md` + `docs/playbook.md` + `docs/dokuman-standartlari.md` üçlüsünü otomatik
  tetikleyen ince bir yönlendirici (İnşa Modu + Analiz Modu), tıpkı `standartlar-uyumluluk`
  skill'inin `baslarken.md`'yi sarmaladığı gibi — bu üç doküman içerik olarak taşınmadı/
  kopyalanmadı, yalnız otomatik tetiklenir hâle geldi. (4) İki gerçek "kalıcı kural" artık
  mekanik olarak da zorlanıyor — `.claude/hooks/guard-source-repos.sh` (kaynak depolara
  yazma engeli, `.clasprc.json` guard'ıyla aynı desen) ve
  `.claude/hooks/guard-wcag-comments.sh` (`tokens/colors-bursa-cv-projects.css`'teki WCAG
  yorumlarının silinmesini engeller). Ayrıca `.claude/hooks/notify-baslarken-sync.sh` eklendi
  — `docs/baslarken.md` değişince `checklist.json`/`standartlar-uyumluluk` SKILL.md'nin
  etkilenip etkilenmediğini hatırlatan, bloklamayan bir uyarı. Üçü de `.claude/settings.json`
  `hooks.PreToolUse`'a eklendi ve mevcut `guard-clasprc-*.sh` disipliniyle pipe-test edildi.
  `docs/*.md`'nin geri kalanı (renkler, sidebar, bileşenler, tablolar, grafikler, vb. ~18
  dosya) bilinçli olarak dokunulmadı — bunlar kopyala-yapıştır içerik kütüphanesi, prosedür
  değil, skill'e çevrilmeleri yanlış soyutlama olurdu.

## Yeni İçerik Eklerken

Yeni bir kaynak proje eklenecekse: `tokens/colors-<proje-adı>.css` (aynen kopya, kaynak yorum
başlığıyla) + `docs/renkler.md`'ye karşılaştırma satırı. Rutin küçük düzenlemelerde bu dosya
GÜNCELLENMEZ — yalnız yeni kaynak eklenmesi, palet sayısının değişmesi gibi kalıcı yapısal
kararlarda güncellenir.
