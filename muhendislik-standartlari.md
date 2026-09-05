# Mühendislik Sağlamlık Standartları

**Kaynak provenance farklı.** Bu dosya `ValeoDashboard`/`Bursa-CV-Projects`'ten değil,
`eng-furkany/ExpertAI` denetim akışının **7 ayrı arkadaş projesinde** (7 ayrı geliştirici,
tek bir kod tabanı değil) ürettiği ilk-tur raporlarından süzüldü:

| Proje | Tarih | OVERALL |
|---|---|---|
| 4PK — Valeo Project Hub | 2026-08-29 | 70/100 |
| Task Tracker | 2026-08-26 | 71/100 |
| Balans Makinesi Veri Paneli | 2026-08-25 | 63/100 |
| Bursa CV Projects | 2026-08-23 | 77/100 |
| VALEO OMG Dashboard | 2026-08-25 | 65/100 |
| Valeo Lojistik Platformu | 2026-08-24 | 62/100 |
| CRD-LS-Automation | 2026-08-24 | 65/100 |

Bu yedi proje birbirinden habersiz yazıldı, ama aynı 9 hata sınıfı bağımsız olarak tekrar
etti. Buradaki her madde en az iki farklı projede, kanıtlı bir bulgu olarak çıkmıştır —
tek seferlik bir projeye özgü hata burada yok. **Bu bir bug listesi değil**, yeni kurulan
her Apps Script projesinde baştan uygulanacak, puan kaybını önleyen varsayılan kurallar
bütünü. Aynı yedi raporda tersi yönde bir sinyal de var: bazı projeler belirli bir kategoriyi
gerçekten iyi çözmüş — bu somut teknikler (kaynak koduyla değil, **deseniyle**) aşağıdaki
"İyi Örnekler" bölümünde, hangi maddeyi güçlendirdiklerine bağlı olarak ayrıca tutuluyor.

## Ne Zaman Uygulanır

- **Kuruluşta (varsayılan):** `baslarken.md` akışının bir parçası olarak, proje ilk
  yazılırken — bkz. `baslarken.md` madde 15.
- **SHIP'ten önce (kendi kendine denetim):** `playbook.md`'nin İnşa Modu 3. adımı (Dahili
  REVIEW), ExpertAI'ye gitmeden önce bu listeye karşı da kontrol eder — bir bulgu ExpertAI'de
  çıkmadan burada yakalanırsa tur kaybedilmez.

## 1. Sunucu Tarafı Yetkilendirme — İSTİSNASIZ

**Kural:** `google.script.run` ile istemciden çağrılabilen **her** fonksiyon, veri
okuyor/yazıyor/mail atıyorsa, gövdesinin ilk satırında bir yetki kontrolü
(`requireAdmin_()`, `_requireUser()`, rol/e-posta kıyası) bulunur. Menüde bir bağlantıyı
gizlemek veya bir sayfayı "kısıtlı" göstermek **yetki kontrolü sayılmaz** — tarayıcı
konsolundan doğrudan çağrılabilir.

**Kanıt:** Bu tek kural, 7 projenin **3'ünde** Security kategorisini doğrudan tavana
(`standards/00` §2, çözülmemiş P0 → max 40) çarptırdı: Balans Makinesi (35 — 7 fonksiyonda
sıfır kontrol, linke sahip herkes tüm veriyi silebiliyor), VALEO OMG Dashboard (28 — açık
metin admin şifresi `code.gs:91`'de + 12/58 uç kapısız), CRD-LS-Automation (35 — dağıtım
ayarına bağlı ama kodda tek kontrol yok). Yedi bağımsız geliştiricinin aynı adımı atlaması
tesadüf değil; bu, Apps Script'in *"linke sahip herkes deployer/owner yetkisiyle
çalıştırır"* varsayılan modelinin doğal sonucu.

**Uygulama:** Her `.gs`/`Code.js` dosyasının başına, veri yazan/mail atan/silen her
fonksiyon için tek satırlık bir muhafız fonksiyonu (`_requireUser()` benzeri) çağrısı
zorunlu kılınır — proje kurulurken ilk fonksiyon yazılmadan önce bu muhafız yazılır, sonradan
eklenmez. Açık metin şifre/anahtar **asla** kaynak dosyaya yazılmaz — `ScriptProperties`
kullanılır (bkz. `.claude/skills/apps-script-push/SKILL.md`'deki kimlik-dosyası kuralı, aynı ilke).

## 2. Ekrana Yazmadan Önce Sağlama (Sanity Check)

**Kural:** Bir hesaplamanın sonucu (kapasite, mesafe, maliyet, "kaydedildi" mesajı) ekrana
yazılmadan önce, o sonucun kendi iç tutarlılığı doğrulanır. "Başarılı" ya da bir sayı
gösteren her yol, gerçekten o işlemi yapmış olduğunu kanıtlamalı — göstermek ile yapmış
olmak aynı şey değil.

**Kanıt:** Valeo Lojistik Platformu'nda **dört ayrı P0**, dördü de bu kuralın yokluğundan:
paketleme doluluğu %200 gösterebiliyor, istiflenemez yükün üstüne yük yığılabiliyor, araç
önerisi kendi paketleyicisini hiç çalıştırmadan veriliyor, deniz mesafesi kuş-uçuşu
hesaplandığı için navlun tutarı gerçek rotadan %42 düşük çıkıyor. VALEO OMG Dashboard'da
Obsolete sayfasının "Kaydet" butonu `google.script.run` hiç çağırmadan yalnız DOM'a yazıyor
ve kullanıcıya başarı mesajı gösteriyor (P0) — ilk filtre değişiminde not sessizce kayboluyor.
4PK'da eşleşmeyen bir müşteri talebi hiç göstergesiz, loglanmadan toplamdan düşüyor.

**Uygulama:** Yazma işlemi yapan her fonksiyon, sunucudan dönen cevabı kontrol etmeden
"başarılı" mesajı göstermez (bkz. `veri-listeleme.md`'deki `google.script.run` sonucu HER
ZAMAN denetlenir kuralı — aynı ilkenin yazma tarafı). Bir toplamın/oranın bileşenleri
(örn. doluluk = kullanılan / toplam kapasite) kod içinde en az bir sınır-durum yorumuyla
belgelenir (`// tek tip x adet kutuyu tek başına doldurursa da toplam kapasiteyi aşamaz`
gibi) — bu, testin yerini tutmaz ama denetimde "bu hiç düşünülmemiş" ile "düşünülmüş ama
atlanmış" ayrımını görünür kılar.

## 3. Minimum Otomasyon — En Az Bir Zamanlanmış Tetikleyici

**Kural:** Uygulama gecikme/risk/eşik gibi bir durumu **hesaplıyorsa**, o durum en az bir
`ScriptApp.newTrigger(...).timeBased()` ile periyodik olarak kontrol edilir ve ilgili
kişiye bildirilir. Hesaplanan ama hiç gösterilmeyen/bildirilmeyen bir alan (örn. "Late"
statüsü, "N gün gecikme"), yalnız birinin sayfayı elle açmasını bekleyen ölü bir hesaplamadır.

**Kanıt:** VALEO OMG Dashboard'da `ScriptApp.newTrigger` kod tabanında **hiç geçmiyor** —
14 mail akışının tamamı birinin butona basmasını bekliyor; LATE türetimi hesaplanıyor ama
kimseye söylenmiyor. Balans Makinesi'nde de sıfır tetikleyici. 4PK'da tek otomasyon
geri-bildirim maili; zamanlanmış hiçbir iş yok (Automation 48, olgunluk seviyesi 1-2/5).
Bursa CV Projects'te (en yüksek puanlı proje, 77) bile en sık dokunulan iş adımı hâlâ tamamen
elle — otomasyon en zayıf kategorilerinden biri (65) orada da.

**Uygulama:** `_setupApp()`/`installTriggers()` benzeri tek bir kurulum fonksiyonu, projenin
ilk sürümünde yazılır ve en az bir zamanlanmış tetikleyici kurar (günlük özet, haftalık
rapor, ya da eşik-aşımı kontrolü — projenin doğasına göre). Bu fonksiyon çalıştırılmadıkça
proje "kurulum tamamlanmadı" sayılır.

## 4. Yarım Özellik Arayüzde Görünmez

**Kural:** Bir buton/menü öğesi, karşılığı olan bir sunucu fonksiyonu **yoksa** ya da
kalıcı olarak "yakında" ise, arayüzde tıklanabilir durmaz — ya menüden çıkarılır ya da açıkça
devre dışı (disabled + sebep) gösterilir.

**Kanıt:** CRD-LS-Automation'da kenar çubuğundaki 9 öğeden **8'i** tek bir "Coming soon"
paneline gidiyor. Valeo Lojistik Platformu'nda Excel dışa aktarma butonu
(`exportExcel`→`raporUretExcel()`) çağırdığı sunucu fonksiyonu **hiç yazılmamış olduğu
halde** arayüzde duruyor — kullanıcı tıklayınca sessizce başarısız oluyor. Task Tracker'da
dokuz ayrı özellik kapısı (Chat kartları, tek-dokunuş düğmeleri, Google Tasks köprüsü…)
hiçbir yerde "bu kapalı" yazmadan sessizce bir alt basamağa düşüyor.

**Uygulama:** Menü tanımı (`SIDEBAR_MENU` veya eşdeğeri) veri-güdümlüyse, her öğede bir
`implemented: true/false` alanı tutulur; `false` olan öğe ya listeden filtrelenir ya da
görsel olarak soluk + `disabled` render edilir. Bir buton bir sunucu fonksiyonunu
çağırıyorsa, o fonksiyon **aynı commit'te** yazılmadan buton commit edilmez.

## 5. Klavye ile Ulaşılamayan Birincil Eylem Olmaz

**Kural:** Bir kaydı açma, sıralama, filtre gibi **birincil** etkileşimler gerçek
`<button>`/`<a>` üzerinden yapılır — `<div onclick>`/`<td onclick>` ile değil. Bir görevin
tamamlanması (kayıt detayını açmak, dışa aktarmak gibi) klavye kullanıcısı için **tek bir**
tıklanabilir öğeye bağımlıysa, o öğe odaklanabilir olmak zorunda.

**Kanıt:** Task Tracker'da bir görevin detayını klavyeyle açmanın **hiçbir yolu yok** —
uygulamanın merkezi eylemi (Accessibility 30, WCAG'nin en alt bandı). CRD-LS-Automation'da
aynı desen: satır açma `<td onclick>`, export'a ulaşmanın tek yolu o satırı açmak
(Accessibility 32, aynı bant — "klavye ile temel bir görev tamamlanamıyor").

**Uygulama:** Tıklanabilir yapılan her `<div>`/`<td>`, ya gerçek bir `<button>`'a
dönüştürülür ya da en azından `tabindex="0"` + `role="button"` + `Enter`/`Space`
dinleyicisi alır. Yeni bir liste/tablo bileşeni yazılırken satır açma önce klavyeyle
denenir, fareyle değil.

## 6. Form Etiketleri, Durum Mesajları, Kontrast

Bu üçü `jenerik-desenler.md`'deki mevcut erişilebilirlik kalıplarının (`:focus-visible`,
`prefers-reduced-motion`, `.skip-link`, `.sr-only`) **eksik kalan tarafı** — kaynak
projelerde yoktu, ExpertAI'de tekrar tekrar çıktı:

- **`<label for>` gerçekten bağlanır.** Yalnız görsel yakınlık yeterli değil; `for`/`id`
  eşleşmezse ekran okuyucu etiketi alanla ilişkilendiremez. (Balans Makinesi'nde *bütün*
  düzenleme formlarında bu ilişki yok; CRD-LS'te Login kutusunda aynı hata.)
- **Toast/durum mesajları `aria-live="polite"` taşır.** "Kaydedildi"/"Silindi"/"Hata: …"
  düz bir `<div>`/`<span>`'e yazılıyorsa ekran okuyucu kullanıcısı hiç haberdar olmaz.
  (Balans Makinesi, CRD-LS, Task Tracker'ın Chat tarafında tekrar eden bulgu.)
  Bir istisna: sık güncellenen KPI/sayaç alanlarına `aria-live` **eklenmez** — her
  değişimde okunması gürültü üretir; yalnız kullanıcı eylemine bağlı, seyrek durum
  mesajlarında kullanılır.
- **İkincil metin AA eşiğinin (4.5:1) altına düşmez.** `text-slate-400`/`#94a3b8` gibi
  soluk gri tonlar beyaz zeminde sıklıkla 2-3:1'de kalıyor — 4PK, Balans, CRD-LS'te
  bağımsız olarak aynı hata. Yeni bir ikincil metin rengi seçilirken kontrast **yazılırken**
  hesaplanır, sonradan denetimde değil (bkz. `tokens/*.css`'teki WCAG yorum kuralı — aynı
  disiplin).

## 7. Minimum Zekâ Katmanı (AI Gerekmez)

**Kural:** Bir liste/tablo uygulaması en azından şunlardan birini taşır: (a) eşik-tabanlı
"dikkat" rozeti (tek müşteriye aşırı bağımlılık, sıfır/anormal değer, gecikme), (b) basit
bir Pareto/ABC kırılımı (hangi %20 kalan %80'i oluşturuyor), (c) tarihsel karşılaştırma
("bu segment için ortalama X"). Bunların hiçbiri AI/Python gerektirmez — Apps Script/JS
içinde birkaç fonksiyonla yazılır.

**Kanıt:** Bu, yedi projenin **en tekrarlanan** bulgusu — Advanced Analytics puanları
şaşırtıcı derecede dar bir aralıkta kümelendi: 58, 62, 62, 62, 67, 68 (yedinci proje CRD-LS
67). Yedi bağımsız kod tabanının hepsinde analiz `SUM`/`GROUP BY` seviyesinde kalmış; hiçbir
istatistik/eşik/kümeleme katmanı yok. Raporların ortak notu: *"bu kod bozuk değil, katman
hiç yazılmamış."*

**Uygulama:** Bir dashboard/liste projesi kurulurken, veri modeli netleştiğinde en az bir
"dikkat rozeti" kuralı (örn. `if (deger === 0 || gecikmeGunu > esik) rozetGoster()`) ilk
sürüme dahil edilir — sonraki bir iterasyona ertelenmez, çünkü bu maddenin puan etkisi
büyük, uygulama maliyeti küçük.

## 8. Kullanım Verisi Toplanır VE Özetlenir

**Kural:** Bir oturum/kullanım logu tutuluyorsa, bu veri en az haftalık bir özet olarak
(kaç kullanıcı, kaç oturum, hangi sayfa) bir yerde gösterilir. Yalnız *toplamak* Product
Fit puanını MEASURED'a taşımaz — okunmayan log, tutulmamış logdan bir adım ileride.

**Kanıt:** VALEO OMG Dashboard'da PULSE adında ayrı bir kullanım-analitiği alt sistemi
yazılmış ama Product Fit sorusu için hiç analiz edilmemiş. Bursa CV Projects'te
`createSession` her oturumu logluyor, aynı veri PMF sorusu için hiç kullanılmamış. Valeo
Lojistik Platformu'nda `User_Activity` sekmesi veri topluyor ama raporlanmıyor. **Yedi
projenin de** Product Fit puanı ASSUMPTION ağırlıklı — hiçbirinde gerçek bir Sean Ellis
anketi yapılmamış.

**Uygulama:** Kullanım logu tutan her proje, aynı sürümde basit bir "kaç kişi/ne sıklıkla"
özet görünümü de taşır (yönetici sayfası, tek bir sorgu). Ayrıca projenin geri bildirim
kanalı üzerinden 5-8 kullanıcıya tek soruluk Sean Ellis anketi ("bu araç olmasaydı ne
hissederdin?") atmak, kod değişikliği gerektirmeyen en ucuz puan artışı — bu her raporda
tekrarlanan bir "80+'e çıkmak için" maddesi.

## 9. Minimum Test İskeleti

**Kural:** Kritik hesaplama fonksiyonları (bir kural motoru, bir kapasite/maliyet
hesabı) en az birkaç "golden value" testiyle korunur — girdi sabit, beklenen çıktı sabit,
regresyon bunu kırınca fark edilir.

**Kanıt:** 4PK, Task Tracker (21.500 satır, 0 test), Balans Makinesi — üçünde sıfır
otomatik test. Buna karşılık VALEO OMG Dashboard'da 13 test dosyası var ve **hepsi geçti**
(244+ assertion) — bu, o projenin Algorithm/Data Quality kategorilerinde 81 almasının
doğrudan sebeplerinden biri. Bursa CV Projects'in kendi Team/Priority motoru "tarihte
birden çok kez sessizce bozulup kullanıcı bulgusuyla düzeltilmiş" — golden-value test
olsaydı bu döngü kırılırdı.

**Uygulama:** Bir kural/hesaplama motoru yazıldığında, bilinen 3-5 girdi/çıktı çifti
(özellikle geçmişte bir kez yanlış çıkmış olanlar) test dosyasına eklenir. Bu, tam bir CI
hattı kurmaktan önce gelir — küçük ve hemen yapılabilir bir adım.

## İyi Örnekler — Aynı Denetimlerde Öne Çıkan Yaklaşımlar

Yukarıdaki 9 madde puan **kaybettiren** kalıplardı. Aşağıdakiler tam tersi: aynı 7 raporda
bir projenin bir kategoriyi çözerken kullandığı ve başka bir projeye **doğrudan taşınabilir**
somut teknik. Her biri hangi maddeyi güçlendirdiğine bağlanmış. **Not:** Bursa CV Projects bu
reponun zaten resmi kaynaklarından biri (bkz. dosya başı) — oradaki örnekler doğrudan
kaynaktan sayılır. Balans Makinesi ve VALEO OMG Dashboard kaynak depo DEĞİL, yalnız dar bir
teknik için referans (aynı `AI Club Portal` için kurulmuş "üçüncü kaynak değil" ayrımı) —
kod satır satır taşınmaz, yalnız **deseni** kopyala.

- **Madde 1 (Yetkilendirme) — kimlik bilgisi asla paylaşılan statik anahtar değil.**
  Bursa CV Projects tüm Google servisleriyle (Sheets/Drive/Gmail/Calendar/Tasks/Chat)
  `executeAs: USER_ACCESSING` + native OAuth2/OIDC kullanıyor; hiçbir yerde paylaşılan
  parola/statik anahtar yok, webhook kimlikleri koda değil `ScriptProperties`'e yazılı. Yedi
  projenin en güvenli kimlik modeli bu — OMG'nin `code.gs:91`'deki açık metin şifresinin tam
  tersi bir referans noktası.

- **Madde 1/2 (Sağlama) — merkezi kaçış fonksiyonu + "kırp ve söyle".** Balans Makinesi'nde
  `esc()` istemci tarafında **97 ayrı yerde** tutarlı kullanılmış (tek bir sanitizasyon
  fonksiyonu, dağınık elle kaçış değil) ve `safeUrl()` `javascript:` şemasını engelliyor —
  XSS'e karşı madde 1'in doğal tamamlayıcısı. Aynı projede sınır dışı bir değer sessizce
  kırpılmıyor: hem kırpılıyor hem de kullanıcıya **hangi alanın neden kırpıldığı**
  söyleniyor (`kirpmaNotu`), ve "aşırı düzeltme" ayrı, açık bir NOK (uygun değil) durumu
  olarak yakalanıyor — madde 2'nin "yanlış ama kendinden emin sonuç verme" riskine karşı en
  iyi gözlemlenen karşı-örnek budur.

- **Madde 2 (Sağlama) — hata izolasyonu, tek kaynak tüm sayfayı çökertmez.** Balans
  Makinesi'nde birden çok kaynak sheet okunuyor; biri hata verirse yalnız o bölüm boş kalıyor,
  diğerleri çalışmaya devam ediyor. Yeni bir proje çoklu veri kaynağı okuyorsa her okuma kendi
  `try/catch`'inde izole edilir — tek bir bozuk sekme tüm dashboard'u düşürmemeli.

- **Madde 3/1 (Otomasyon + eşzamanlılık) — kilit + tekrar-kontrol.** Balans Makinesi'nde ilk
  açılışta iki kullanıcı aynı anda tetiklerse çift dosya oluşumu, `LockService` + kilit
  alındıktan SONRA "zaten var mı" tekrar kontrolüyle (double-checked locking) engelleniyor.
  Herhangi bir "ilk kullanımda bir kez oluştur" mantığı bu deseni kullanmalı — yalnız kilit
  almak yetmez, kilit içeride tekrar kontrol gerekir.

- **Madde 5/6 (Erişilebilirlik) — regresyon kapısı + isimlendirmeye dayalı otomatik ARIA.**
  Bursa CV Projects'te axe-core + Chromium ile **29 sayfa × 2 tema** CI'da taranıyor; kural
  "sıfır ihlal" değil **"artmama tavanı"** (bugünkü sayı kabul, yenisi eklenemez) — küçük bir
  ekipte gerçekçi ve uygulanabilir bir orta yol. Aynı projede merkezi bir `a11yEnhance()`
  fonksiyonu, id/class'ında "modal" geçen her öğeye otomatik ARIA + klavye + Escape ekliyor —
  yeni bir overlay yazan geliştiricinin tek tek ARIA eklemesi gerekmiyor, **adlandırma
  kuralına uyması** yetiyor. Yeni bir projede tekrarlayan bileşen (modal, dropdown, tab) için
  bu "isimlendir → otomatik zenginleştir" deseni elle tekrar ARIA yazmaktan daha az hataya
  açık.

- **Madde 7 (Zekâ katmanı) — ucuz bir prescriptive (4. seviye) örneği.** Balans Makinesi'nde
  hedefi tam tutturan düzeltme derinliği/açısı hesaplanıp tek bir "Uygula" düğmesiyle
  sunuluyor — kullanıcı sayıyı okuyup elle girmiyor, sistem doğrudan uyguluyor. Bu, AI
  gerektirmeden Data Intelligence'ın en üst seviyesine (prescriptive) çıkan somut bir örnek;
  madde 7'deki "en az bir dikkat rozeti" tavsiyesinin bir üst basamağı.

- **Madde 9 (Test) — Apps Script kodu Node.js mock harness ile test edilebilir.** GAS'ın
  kendi ortamında gerçek bir yerel test koşucusu yok; bu genelde "test yazılamaz" gerekçesine
  dönüşüyor. VALEO OMG Dashboard bunu bir mock harness ile çözmüş: `SpreadsheetApp`/
  `PropertiesService` gibi GAS servisleri Node.js'te sahte (mock) nesnelerle taklit edilip
  `.gs` dosyasındaki saf mantık `node tests/*.js` ile çalıştırılıyor (13 dosya, 244+
  assertion, bu denetimde de çalıştırılıp doğrulandı). "Apps Script'te test altyapısı kurulamaz"
  varsayımını çürüten somut bir teknik — madde 9'u uygularken önce bu yaklaşım denenir.

- **Madde 3 (Otomasyon) + Performans — toplu yazma ve önbellek nesil sayacı.** Bursa CV
  Projects'te çoklu satır güncellemesi döngü içinde `setValue` yerine **tek bir `setValues()`**
  çağrısıyla yapılıyor (API çağrı sayısı seçim büyüklüğünden bağımsızlaşıyor) ve script cache
  bir **nesil sayacı** ile geçersiz kılınıyor + aynı anda gelen özdeş istekler tekilleştiriliyor
  (in-flight dedup). İkisi de `veri-listeleme.md`'deki okuma-tarafı parçalı çizim deseninin
  yazma/önbellekleme tarafındaki doğal tamamlayıcısı — büyük tablo yazan/önbellekleyen her
  proje bu ikisini baştan kurar.

## Bu Liste Nasıl Büyür

Yeni bir ExpertAI turu, burada olmayan **iki ayrı projede tekrarlanan** bir bulgu
üretirse, buraya yeni bir madde olarak eklenir (kanıt: proje adı + tarih + puan). Tek
projede kalan bulgular buraya taşınmaz — o projenin kendi raporunda kalır; burası yalnız
tekrarlanan, standartla önlenebilir kalıplar için.
