# Yeni Bir Projeye Başlarken

Bu dosya, yeni bir Valeo dashboard/web projesine bu repodaki standartları taşırken izlenecek
**sıra**. Claude'a bu repoyu gösterip "standartları buradan çek" dediğinde önce bu dosyayı
okumasını iste — geri kalan dokümanlara buradan yönlenir.

**Sıfırdan, hiçbir şey inşa edilmemiş bir MVP kuruyorsan** (ne kuracağını Claude'a daha yeni
anlatacaksan) bu dosyadan önce `mvp-akisi.md`'yi oku — kapsamın nasıl konuşulacağını, hangi
soruların sorulup hangilerinin sorulmayacağını ve inşadan sonra `ExpertAI` ile nasıl test
edileceğini anlatır. Bu dosya (`baslarken.md`) o akışın 3. adımında (standartları uygula)
devreye girer, "hangi dosyayı ne zaman uygularım" sorusuna cevap verir. `mvp-akisi.md`'nin
4. adımındaki (Plan Onayı) yazılı çıktının doküman türleri (PRD/TSD/FSD/Layout MD) için
`dokuman-standartlari.md`'ye bakılır. İnşa (BUILD/REVIEW) ve analiz (var olan bir uygulamayı
denetleme) sırasında AI ajanla çalışma disiplini — oturum ayrımı, kurtarma promptları, yanılgı
kataloğu — için `playbook.md`'ye bakılır; bu, hangi Standartlar dosyasının uygulanacağından
ayrı bir soru, o yüzden bu listenin dışında tutuldu.

**Bu dosyanın Claude'un doğrudan tetiklediği bir kopyası var:**
`.claude/skills/standartlar-uyumluluk/` (2026-09-01) — kullanıcı "bu projeye Standartlar'ı
uygula" dediğinde bu dosyayı elle okumaya gerek kalmadan Rehber Modu'nu tetikler; "standartlara
ne kadar uyuyoruz" gibi bir soru geldiğinde ise Denetim Modu var olan kodu tarayıp
`standartlar-uyumluluk-<proje-adı>.html` raporu üretir (kod dosyalarına dokunmadan — yalnız
tespit + öneri + rapor, düzeltme ayrı onay ister). Detay ve skorlama metodolojisi:
`.claude/skills/standartlar-uyumluluk/SKILL.md`. Skill'in kriter listesi (`checklist.json`) bu
dosyadan türetildi — buraya yeni bir adım/kategori eklendiğinde `checklist.json`'a da
yansıtılmazsa denetim modu o standardı göremez (bkz. `.claude/hooks/notify-baslarken-sync.sh`).

**Sıfırdan bir MVP kuruyorsan veya var olan bir uygulamayı analiz ettirmek istiyorsan** aynı
şekilde `.claude/skills/mvp-akisi/` bunu otomatik tetikler — elle `mvp-akisi.md`/`playbook.md`
okumaya gerek kalmadan.

## 0. Kapsam Dışı Olanlar (kopyalama)

Bu repo **tasarım** standardı tutar, **uygulama mimarisi** değil. Aşağıdakiler
`Bursa-CV-Projects`'e özgü, Google Apps Script kısıtlarından doğar ve başka bir yığında
(React, plain HTML, vs.) anlamsızdır — kopyalama:
- `localStorage` yasağı / `AppState` kullanımı, `.gs`'de `var` zorunluluğu, GAS serialization
  kuralları, `google.script.run` success/failure kalıbı.
- Sheet kolon haritaları, `SIDEBAR_MENU`'nün **içeriği** (Bursa CV'nin kendi sayfa listesi).

Bunların **desenleri** (tek uygulama noktası, veri-güdümlü menü, vb.) taşınabilir; kaynak
kod satır satır değil.

## 1. Renk Paleti

`tokens/colors.css`'i projene kopyala — bu resmi palet (ValeoDashboard kaynaklı, bkz.
`renkler.md`). Marka rengi olarak yalnız bunu kullan. Durum rozeti (başarılı/uyarı/hata)
üretirken Bursa CV'nin **desenini** (soluk zemin + doygun yazı, bkz. `bilesenler.md` ve
`renkler.md`) uygula ama hex'lerini **olduğu gibi taşıma** — kendi renklerinle kontrastı
yeniden doğrula.

## 2. Logo

`assets/Valeo_Logo.png`'i (resmi/birincil logo, 3840×1825 — buradan başla) +
`assets/Valeo_Logo_AIClubPortal.png`'i (yedek, küçük/self-contained, 600×285) projene
kopyala. Kullanım kuralları için `logo.md` — özetle: max 32px yükseklik, koyu zeminde beyaza
çevir, yanına metin yazma, yüklenemezse yedek PNG'ye düş (2026-09-01: eski SVG wordmark
yedeği kaldırıldı); e-posta içine gömülecekse `data:` URI değil CID eki kullan (aynı
dosyadaki "E-posta İçinde Kullanım").

## 2b. İkonlar

`ikonlar.md`'yi oku — resmi ikon kütüphanesi **Lucide**. Sidebar/chip/buton/bildirim gibi
ikon gerektiren her yerde (bkz. `sidebar.md`, `veri-listeleme.md`, `bilesenler.md`) Lucide'dan
seçilen bir SVG inline yapıştırılır, `currentColor` ile boyanır — kaynak projelerin (özellikle
Bursa CV Projects) elle çizilmiş özel ikonları birebir taşınmaz.

## 3. Layout İskeleti

- **Font ailesi + köşe yarıçapı ölçeği:** `jenerik-desenler.md`.
- **Sidebar:** çok sayfalı bir uygulama kuruyorsan `sidebar.md`'deki veri-güdümlü
  `SIDEBAR_MENU` desenini uygula (kendi sayfa listenle) — sayfa başına elle HTML yazma. Az
  sayfalı basit bir araçsa ValeoDashboard'ın statik sidebar'ı yeterli olabilir (bkz.
  `sidebar.md`'deki karşılaştırma notu). Favoriler isteniyorsa aynı dosyadaki "Favoriler" bölümü
  — mini şerit + panel, tek `_smFav` kaynağı. Sayfa+ref+eylem arayan bir hızlı arama
  (Ctrl+K) isteniyorsa aynı dosyadaki "Komut Paleti" bölümü.
- **Mobil alt navigasyon (varsayılan — 2026-08-29 kararı):** `sidebar.md`'deki "Adaptif
  Navigasyon Katmanları" bölümündeki bottom-nav deseni **her zaman** kurulur — masaüstü
  sidebar'ı statik veya veri-güdümlü `SIDEBAR_MENU` olsun fark etmez, ≤768px'te sidebar'ın
  yerini bottom-nav almalı. Atlamak için kullanıcının özellikle "mobilde de sidebar kalsın"
  gibi bir tersine çevirme talebi olması gerekir — sessizce atlanmaz. Gerekçe: `CLAUDE.md`
  Kalıcı Kararlar (2026-08-29).
- **Header:** sabit yükseklikte, koyu marka renginde (bkz. `tokens/colors.css`
  `--valeo-blue`), breadcrumb varsa sidebar menüsünden türet — ikinci bir menü tanımı açma.

## 4. Veri Tabloları

Listeleme/filtreleme gerektiren bir sayfa kuruyorsan `veri-listeleme.md`'yi oku: veri çekme
sözleşmesi (`google.script.run` success/failure + sonuç denetimi — ATLAMA, sessiz hata
üretir), `ColFilter` (tek ortak filtre/sıralama katmanı), ve **satırın 1.000'i geçebileceği**
tablolarda parçalı çizim deseni (`setTableHtmlChunked`/`scheduleRender` — ölçülmüş, stabil).
Mobilde kart görünümü ve indirme kancası da aynı dosyada.

## 4b. Kanban Panosu (varsa)

Az sayıda sabit aşamadan oluşan, sürükle-bırakla ilerleyen bir iş listesi kuruyorsan
`kanban.md`'yi oku — sürükle-bırağın `dragover` engeli (bu atlanırsa "kanban kaymıyor" hatası
çıkar), dört katmanlı görev kartı düzeni, klavye erişilebilirliği ve sütun grubu (swimlane)
için Segment Kontrolü kullanımı. Aşamalar yalnızca filtrelenip sıralanacaksa (aşamalı ilerleme
yoksa) kanban yerine `veri-listeleme.md`'deki düz tablo yeterlidir.

## 5. Detay Popup'ı (varsa)

Tabloda bir ref/hücreye tıklanınca hızlı-bakış göstermek istiyorsan `detay-popup.md`'deki
`InfoModal` singleton desenini kullan — **kaynağı henüz main'de değil**, dosyanın başındaki
uyarıyı önce oku. Düzenleme/form için değil, yalnız okuma amaçlı hızlı bakış için.

## 5b. Sağ Panel — Düzenlenebilir Detay (varsa)

Bir kaydı listeden çıkmadan görüntüleyip **düzenlemek**, kayıtlar arasında gezinmek
istiyorsan `detay-panel.md`'yi oku — "özellik satırı" + yerinde düzenleme deseni, önceki/
sonraki kayıt okları. `InfoModal`'la (yukarısı, madde 5) karıştırma: o salt-okunur, bu
düzenlemeye izin veriyor — ikisi ayrı ihtiyaç, aynı projede ikisi birden bulunabilir.

## 6. Bileşenler

`bilesenler.md`'den kopyala: modal (ValeoDashboard'ın `.modal-overlay` deseni + "modal"
adlandırma kuralı), toast (hızlı geri bildirim için `showToast`, eyleme çağıran bildirim
için `appNotifyToast` deseni), kalıcı bir **bildirim merkezi** gerekiyorsa (toast'tan farklı,
@mention gibi sonradan bakılabilir olaylar için) aynı dosyadaki "Bildirim Merkezi" bölümü,
loading spinner, filtre barı (`FilterDrop` — **native `<select>` kullanma**).

## 6b. Form Kontrolleri (varsa checkbox/radio/switch/text field ihtiyacı)

`FilterDrop`'un dışında bir checkbox/radio/switch/metin alanı kuruyorsan `form-kontrolleri.md`
— boyut, köşe yarıçapı ve 48×48px görünmez dokunma hedefi kuralları.

## 6c. Yardım Paneli + İlk Kullanım Turu (varsa)

Kullanıcı kitlesi teknik terime aşina değilse veya uygulama günlük dönülen bir sistemse
`yardim-paneli.md`'yi oku — karartmayan yardım çekmecesi (arama + hazır soru çipleri +
akordeon), "bunu bana göster" spot-ışığı mekanizması, zorunlu kapsam denetimi (`helpAudit()`
boş dönmeli) ve aynı spot-ışığını paylaşan karartmayan köşe kartı biçimindeki ilk-kullanım
turu. Basit, az sayfalı bir araçta ikisi de gereksiz olabilir.

## 6d. Etkileşim Kuralları (genel, doğrudan uygulanabilir)

`etkilesim-kurallari.md`'deki dört desen proje-bağımsız, doğrudan kopyalanabilir: tek satırlık
hızlı ekleme (akıllı varsayım + belirsizlikte tam forma düşme), ölçüt destekli arama kutusu
(`status:late` gibi, yerelleştirilmiş eş anlamlılarla), yeni kaydın aktif süzgeç dışında
kaldığını bildiren mesaj, ve birden fazla katman açıkken kademeli `Escape` önceliği. Hareket
(motion) süre/eğri kataloğu da aynı dosyada.

## 7. Grafikler (varsa)

Projede grafik/chart olacaksa `grafikler.md`'yi oku — **kaynak ValeoDashboard değil**, o
yalnız boş `<canvas>` yer tutucusu bırakmış. Chart.js kullan; renk paleti için
`Dashboard.html`'in `PALETTE`'ini (marka+durum renklerinin uzantısı) başlangıç noktası al ve
kendi resmi paletinle (`tokens/colors.css`) yeniden türet. `.chart-canvas-wrap` sabit
yükseklik + `maintainAspectRatio:false` kalıbını atlama — yoksa sonsuz büyüme/küçülme
döngüsüne girer.

## 8. Erişilebilirlik (proje-bağımsız, doğrudan kopyala)

`jenerik-desenler.md`'deki dört kalıp (`:focus-visible`, `prefers-reduced-motion`,
`.skip-link`, `.sr-only`) ile `bilesenler.md`'deki modal ARIA kancası — bunlar Valeo'ya özgü
değil, her projede aynen geçerli.

## 9. Dark Mode (varsayılan — 2026-08-29 kararı)

`koyu-mod.md`'deki kontrol listesini **varsayılan olarak uygula** — kullanıcı özellikle
"gece modu istemiyorum" gibi bir tersine çevirme talebinde bulunmadıkça atlanmaz. (Önceki
karar "isteniyorsa uygula, istenmiyorsa atla"ydı; bu "opsiyonel" okuması `eng-furkany/test1`
reposundaki bir mockup'ta sessizce atlanmaya yol açtı — bkz. `CLAUDE.md` Kalıcı Kararlar
2026-08-29.) ValeoDashboard'ın kendisinde dark-mode olmaması artık bir gerekçe değil — kaynak
projenin eksikliği yeni projede de eksik kalması gerektiği anlamına gelmiyor.

## 10. Yetki Görünümü (varsa rol/izin ayrımı)

Kullanıcı rolüne göre bazı kontroller kısıtlanacaksa `yetki-gorunumu.md`'deki `data-w` +
`body.no-*` desenini uygula. **Gerçek yetki kontrolünü sunucuda yap** — bu yalnız görünürlük,
güvenlik katmanı değil.

## 11. Yazdırma (varsa PDF/print ihtiyacı)

Kullanıcı bir sayfayı yazdıracak veya PDF alacaksa `yazdirma.md`'deki `@media print`
kurallarını uygula: gezinme/filtre gizlenir, tablo sayfa sınırında düzgün kırılır, renkli
başlık zemini zorlanır.

## 12. Dil (varsayılan TR/EN — 2026-08-29 kararı)

**Artık varsayılan: `dil-yerellestirme.md`'deki "Gerçek Bir Örnek: AI Club Portal" bölümündeki
`T`/`t()` sözlük deseni kurulur** (belgelenen 3 eksiği kapatılmış haliyle — `<html lang>`
gerçekten güncellenir, sabit kategoriler/durumlar da StatusLex mantığıyla çeviri kapsamına
girer, sayı/tarih biçimi dile göre değişir). Kullanıcı özellikle "yalnız Türkçe yeterli, dil
değiştirici istemiyorum" demedikçe atlanmaz — sessizce atlanmaz. (Önceki karar "Türkçe tek dil
yeterliyse bir şey yapmana gerek yok"tu; bu "opsiyonel" okuması `eng-furkany/test1`
reposundaki bir mockup'ta sessizce atlanmaya yol açtı — bkz. `CLAUDE.md` Kalıcı Kararlar
2026-08-29.) Sayı/tarih biçimlendirmesi ve arama kutusu için Türkçe karakter normalizasyonu
zaten opsiyonel değildi, her durumda uygulanır. **İki kaynak projede (ValeoDashboard, Bursa CV
Projects) gerçek bir TR/EN dil değiştirici yok** — AI Club Portal deseni hâlâ kaynak proje
değil (kopyalama-taşıma listesinin dışında), yalnız örnek/başlangıç noktası statüsünde, ama
artık uygulanması varsayılan.

## 13. Google Workspace Add-on (yalnız gerçek bir add-on kuruyorsan)

Kurduğun proje bağımsız bir web app DEĞİL de Google Docs/Sheets'in kendi arayüzüne açılan bir
Apps Script add-on ise (container-bound script, `HtmlService` ile Docs/Sheets menüsünden
açılan sidebar) `workspace-addon.md`'yi oku — bu, `sidebar.md`'deki uygulama-içi navigasyon
sidebar'ından tamamen farklı bir kavram, ikisini karıştırma. Bağımsız bir web app kuruyorsan
bu adımı **atla**.

## 14. Apps Script'e Push (Claude Code web'den, yalnız Apps Script hedefliyorsan)

Kod bir Google Apps Script projesine aitse ve Claude Code web session'ından **canlı projeye
push** etmen gerekiyorsa (yalnız local geliştirme değil) `.claude/skills/apps-script-push/`
bunu otomatik tetikler — `clasp` kurulumu, OAuth, onay ve push sırası, kimlik-dosyası güvenlik
kuralları. Bu bir tasarım standardı değil, oturum mekaniği; kod GitHub'a gidip kullanıcı kendi
bilgisayarından push edecekse bu adıma gerek yok.

## 15. Mühendislik Sağlamlığı (varsayılan — ExpertAI denetimlerinden, 2026-08-29 kararı)

`muhendislik-standartlari.md`'deki 9 maddeyi baştan uygula — bunlar 7 ayrı arkadaş
projesinin ExpertAI ilk-tur denetimlerinde **bağımsız olarak tekrarlanan** puan kaybı
kaynakları: sunucu tarafı yetkilendirme (her `google.script.run` fonksiyonunda), ekrana
yazmadan önce sağlama (bir "başarılı" mesajı gerçekten o işi yaptığını kanıtlamalı), en az
bir zamanlanmış tetikleyici, yarım/stub özelliklerin arayüzden gizlenmesi, birincil
eylemlerin klavyeyle ulaşılabilir olması, form/durum erişilebilirliği, minimum bir
eşik-tabanlı "dikkat" katmanı, kullanım verisinin toplanıp özetlenmesi, kritik
hesaplamalar için birkaç golden-value testi. Bunlar madde 8'deki dört erişilebilirlik
kalıbının YERİNE değil, onların üstüne — proje-bağımsız ve sonradan eklenmesi pahalı
oldukları için baştan kurulur.

## 16. Bitirmeden Kontrol Et (2026-08-31 kararı)

Bu liste neyin uygulanacağını anlatıyor — ama "uyguladım" demek ile **gerçekten** uygulamış
olmak arasındaki farkı hiçbir şey doğrulamıyordu. Bir projeye/vitrine bu repo uygulandığında
şu tekrar etti: Claude listeyi baştan okumak yerine hafızadan/kısmen uyguladı, iş bitti
sanıldı, sonradan mantıklı bir gerekçeyle sorulunca ("sidebar niye yok", "arama çubuğu nerde",
"grafiklerin de olduğu bir mockveri ile şekillendir tekrar") her seferinde **doğru cevap zaten
yukarıdaki maddelerin birindeydi** — repoda eksik değildi, kontrol edilmemişti. Bu, TaskTracker
`CLAUDE.md` §9'daki `_valeo.helpAudit()` zorunlu kapsam denetiminin ve `playbook.md`'deki
"iyimser raporlama" yanılgısının (kanıtsız "bitti" demek) buradaki karşılığı.

**Kural:** bu repoyu bir projeye/vitrine uygularken iş bitti denmeden önce yukarıdaki
0-15 arası her madde tek tek gözden geçirilir — "hafızadan eminim" **yeterli değil**, madde
tekrar açılıp karşılaştırılır:

- [ ] Madde uygulandı **mı**, yoksa "(varsa)"/"(yalnız X ise)" koşulu bu proje için baştan
      **geçerli değil miydi**? (İkisi de kabul edilebilir sonuç — üçüncüsü, hiç bakılmamış
      olmak, kabul edilebilir değil.)
- [ ] Bir madde birden fazla alt-bileşen listeliyorsa (ör. 6. madde: modal + toast + bildirim
      merkezi + loading + FilterDrop) **hepsi** mi kontrol edildi, yoksa akla ilk gelen bir-ikisi
      mi yapılıp madde "yapıldı" işaretlendi?
- [ ] Kullanıcı "bunu neden yapmadın" diye sorarsa cevap "çünkü repo bunu istemiyor" mu
      olacak, yoksa "haklısınız, madde N'de zaten vardı, gözden kaçırdım" mı? İkincisiyse
      liste henüz gözden geçirilmemiş demektir — teslim etmeden önce geçirilir.

Bu adım tasarım standardı eklemiyor, var olan listenin **uygulanmasını** zorunlu kılıyor.
Yeni bir doküman/karar eklendiğinde bu maddeye satır eklemeye gerek yok — kapsam otomatik
büyür, çünkü kontrol "0-15 arası her madde" diyor, tek tek saymıyor.

## Claude'a Söylerken

Kısa bir istek yeterli: *"Standartlar reposundaki `docs/baslarken.md`'yi oku ve bu projeye
sırayla uygula."* Claude, buradan `tokens/colors.css`, `assets/`, ve ilgili `docs/*.md`
dosyalarına kendi gidecek — her birini burada özetlemene gerek yok.
