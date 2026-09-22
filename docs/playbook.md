# Playbook — AI Ajanla İnşa ve Analiz Disiplini

**Kaynak provenance farklı (2026-08-24 kararı).** Bu dosya ValeoDashboard/Bursa-CV-Projects'ten
değil, kullanıcının paylaştığı üçüncü parti bir Udemy kursu dokümanından (*AI-Native Software
Engineering: Yapay Zeka ile Mühendislik — Prompt Playbook*) süzülmüştür. Kaynak doküman belirli
bir stack'e (.NET modüler monolith + React) kilitli, uzun (1900+ satır) ve birebir prompt
metinleri içeriyordu — buraya **stack-bağımsız desen** taşındı, kurs örnekleri veya hazır prompt
script'leri değil (aynı "deseni kopyala, hex'i/kodu kopyalama" ilkesi, bu kez metne uygulanmış —
bkz. `CLAUDE.md`). Bu bir tasarım standardı değil, `mvp-akisi.md`'nin **süreç** boyutunun
uzantısı — `dokuman-standartlari.md`nin "hangi doküman" sorusuna cevap vermesi gibi, bu dosya
"BUILD ve ANALİZ sırasında AI ajanla nasıl çalışılır" sorusuna cevap verir.

## Ne Zaman Devreye Girer

- **İnşa modu:** `mvp-akisi.md` 4. adımdaki (Plan Onayı) SPEC/PRD onaylandıktan sonra, BUILD
  başlamadan önce — aşağıdaki "İnşa Modu" bölümü.
- **Analiz modu:** `mvp-akisi.md` 7-8. adımdaki ExpertAI denetimi sırasında/sonrasında — ama
  yalnız oraya özel değil, kullanıcı "şu var olan uygulamayı/kodu analiz et" dediği **her**
  durumda (ExpertAI akışının dışında, üçüncü bir repo/proje için de) aşağıdaki "Analiz Modu"
  uygulanır.

## Ortak Omurga

İki mod da aynı iskeletin iki yönü: karar noktaları (kalın olanlar) hep **insanda** kalır.

- **İnşa:** INTENT → CLARIFY → SPEC → PLAN → **[ONAY]** → BUILD → REVIEW → **[TRİYAJ]** → TEST → VERIFY → **[SHIP]**
- **Analiz:** SCOPE → DISCOVERY → FINDINGS → **[TRİYAJ]** → REPORT → **[KARAR]**

İki satır arasında adım adım bire bir eşleşme YOK (İnşa'da üretim var, Analiz'de yok) — ortak
olan yalnız iskelet: niyet/kapsamı netleştir → bağımsız çalış → doğrulanabilir çıktı üret →
**[köşeli parantezli noktalarda]** insan kararına dur. Promptlar değişir, model değişir — bu
omurga sabit kalır.

## Oturum Ayrımı — Üreten Kendini Denetleyemez

Tek kişilik bir ekipte bile iki ayrı **oturum** (aynı araçta iki pencere/terminal yeterli) rolü
karışmamalı:

| Oturum | Rol | Yapar | Yapamaz |
|---|---|---|---|
| **DEV** | Üretici | SPEC → PLAN → BUILD → düzeltme | Kendi işini denetleyemez |
| **QA** | Denetçi | REVIEW/analiz, kanıtlı bulgu üretir | Kod yazamaz; DEV'in sohbet geçmişini görmez — yalnız dosyalardan (diff/kod/spec) okur |

Bu ayrım İnşa modunda kod review'ı için, Analiz modunda ise **doğrudan** geçerli: bir uygulamayı
analiz eden Claude, o uygulamanın "DEV"i değildir — proje sahibinin anlatımına değil, dosyalara
bakar; QA disiplini analiz modunun varsayılanıdır.

## AI Yanılgı Kataloğu — Her İki Modda da Geçerli

Bu tablo playbook'un en genel-geçer parçası; hem BUILD/REVIEW'da hem de bağımsız bir uygulama
analizinde aynı hatalar tekrar eder:

| Yanılgı | Nasıl görünür | Panzehir |
|---|---|---|
| Uydurma (halüsinasyon) | Akıcı ama yanlış özet; olmayan koda/API'ye referans | Satır/dosya kanıtı iste; kanıtsız iddia = varsayım |
| Eksik bağlam sessizliği | Bilmediğini söylemez, varsayıp ilerler | "Varsayma, sor" — belirsizlikte durup netleştir |
| Bulgu enflasyonu (fake review) | İş yaptığını göstermek için önemsiz/uydurma bulgu | İnsan triyajı: gerçek / gürültü / araştırılacak |
| Totolojik doğrulama (fake güvence) | "Kontrol ettim, sorun yok" — hiçbir şeyi gerçekten sınamadan | Somut kanıt üret (çalıştırılmış test, ölçüm, ekran görüntüsü) |
| Overengineering | Basit işe gereksiz soyutlama/katman yığını | Kapsam dışını yazılı tut; blast radius'u onay kapısında sorgula |
| Fake refactoring | "İyileştirdim" der; davranış sessizce değişmiş | Diff + davranış kanıtı birlikte istenir |
| Testi/uyarıyı susturma | Kırmızıyı geçirmek için assert gevşetme/silme/skip | Test değişikliği yalnız insan onayıyla, gerekçeli |
| Confirmation bias | Kendi kararını savunur, kendi bulgusuna yumuşak davranır | Temiz QA oturumu — üreten akıl kendini denetlemez |
| İyimser raporlama | Kanıtsız "bitti/sorun yok" | Kanıt yoksa iddia da yok — açıkça "doğrulamadım" de |
| Sahte güvenlik sonucu | Ya korkutucu-boş bulgu ya da gerçek açığı atlayan "temiz" raporu | Güvenliği ayrı, bağımsız bir mercekle sorgula |

## İnşa Modu — Uygulama

**Terim uyarısı:** `mvp-akisi.md` 4. adımın başlığı "Plan Onayı" ama onayladığı şey SPEC/PRD'dir
— **ne** yapılacağı (bkz. `dokuman-standartlari.md`). Aşağıdaki 1. adımdaki **PLAN** ayrı ve
daha teknik bir katman — **nasıl** yapılacağı (hangi dosya, hangi sıra) — ve kendi ayrı onayını
ister; mvp-akisi'nin 4. adımıyla aynı onay sayılıp atlanmaz. (Yukarıdaki Ortak Omurga'da tek
**[ONAY]** görünmesi bu ikiliği göstermez — orası basitleştirilmiş bir iskelet; SPEC'in onayı
zaten `mvp-akisi.md` 4. adımda, playbook devreye girmeden önce gerçekleşir.)

`mvp-akisi.md` 4. adımın SPEC/PRD'si onaylandıktan sonra:

1. **PLAN** — kod yazmadan önce: değişecek dosyalar, adım sırası, riskler + kendi önerin ve
   gerekçenle birlikte, her kabul kriterinin hangi testle kanıtlanacağı. Bu adım **insan
   onayı** gerektirir — plan onaysız BUILD'e geçilmez.
2. **BUILD** — onaylı planı uygula; plan dışına çıkarsan (kapsam sapması) bunu ayrıca işaretle
   ve onay iste, sessizce genişletme.
3. **Dahili REVIEW (temiz QA oturumu)** — BUILD bitince yeni/temiz bir oturumda, DEV'in
   anlatımına değil diff'e ve SPEC'e bakarak denetle: doğruluk, güvenlik, sınır durumları,
   performans, test kapsamı, bakım kolaylığı. Bulgu yoksa "temiz" de — bulgu uydurma
   (yanılgı kataloğu: bulgu enflasyonu). Bu geçişte `muhendislik-standartlari.md`'deki 9
   maddeye de bak — ExpertAI'de bağımsız olarak tekrarlanan kalıplar; orada yakalanan bir
   şey ExpertAI turunda bulunup geri gönderilmekten daha ucuza kapanır.
4. **İnsan triyajı + düzeltme** — bulgular gerçek/gürültü/araştırılacak diye ayrıştırılır (karar
   yalnız kullanıcıda); gerçek bulgular bu turda düzeltilir — sorun çıkarsa ilgili AP koduna bak.
5. **TEST/VERIFY** — kabul kriterleri kanıtla (test sonucu, gerekiyorsa ekran görüntüsü)
   doğrulanır; "çalışıyor gibi" yeterli değil.
6. **SHIP** — kullanıcı bu feature/artışı kabul eder. **Bu, tek bir feature'ın kabulüdür — MVP'nin
   bütün olarak "bitti" sayılması değil.** Birden çok feature bu 6 adımı kendi turunda geçer;
   MVP'deki tüm feature'lar SHIP edildiğinde sıra `mvp-akisi.md` 7. adıma (ExpertAI denetimi)
   gelir. Yani audit, kronolojik olarak tüm SHIP'lerden SONRA çalışır — ama MVP'nin **nihai**
   olarak "bitti" sayılması SHIP'e değil, audit'in (7-8. adım) temiz sonucuna bağlıdır.

**Bu dahili REVIEW, `mvp-akisi.md` 7. adımdaki ExpertAI denetiminin YERİNE geçmez** — iki ayrı
katman: burası hızlı/dahili, feature-bazlı bir kalite kapısı; ExpertAI kapsamlı, MVP-bütünü dış
bir audit. Tam sıra: (her feature için) PLAN→onay → BUILD → dahili QA review → triyaj+düzeltme →
TEST/VERIFY → SHIP → (tüm feature'lar bitince) `mvp-akisi.md` 7. adım (ExpertAI'ye yönlendirme)
→ 8. adım (audit bulgularının düzeltilmesi ve yeniden denetim).

### Sorun Çıkarsa — Kurtarma Rampaları

Planlı gitmeyen anlar için kısa kod adları; her biri "önce teşhis, sonra tek düzeltme" ilkesine
bağlı, hiçbiri semptomu susturmaya (test zayıflatma/skip, hatayı yutma) izin vermez:

| Kod | Durum | Temel kural |
|---|---|---|
| AP-01 | Derleme/çalışma zamanı hatası | Önce kök nedeni teşhis et, sonra tek düzeltme |
| AP-02 | Test kırmızı | Önce karar ver: kod mu, test mi, spec mi yanlış — assert zayıflatma/silme/skip yasak |
| AP-03 | Kararsız (flaky) test | Deterministikleştir; kanıt: art arda birkaç kez yeşil |
| AP-04 | Düzeltme yeni regresyon yarattı | Önce geri al, yeşile dön; dar düzeltme + kalıcı regresyon testi |
| AP-05 | "Araştırılacak" bulgu | Düzeltme değil minimal tekrar-üretim (repro); repro yoksa gerekçeli kapanış |
| AP-06 | Düzeltme turu sınırı aşıldı | Dur — kök neden spec'te mi planda mı, yalnız analiz, kod yok |
| AP-07 | Plan dışına çıkıldı | Sapma listesi çıkar; onaysız değişiklik geri alınır |
| AP-08 | İş ortasında gereksinim değişti | Önce SPEC güncellenir → delta plan → onay |
| AP-09 | Bağlam bulanıklaştı | Durum dosyası yaz, temiz yeni oturuma devret; kanıtsız "tamamlandı" yazılmaz |
| AP-10 | Belirsizlik / docs-kod çelişkisi | Varsayma; seçenekleri bedelleriyle getir, karar kullanıcıda |
| AP-11 | Güvenli geri alma gerekiyor | Geri al (revert); geçmiş silme/force push yasak |
| AP-12 | Performans hedefi tutmadı | Önce ölç, tek optimizasyon dene, aynı yöntemle yeniden ölç |

## Analiz Modu — Uygulama

Kullanıcı var olan bir uygulamayı/kod tabanını **analiz ettirmek** istediğinde (ExpertAI denetim
adımında ya da bağımsız bir "şunu incele" isteğinde) aynı QA disiplini uygulanır:

1. **SCOPE** — ne analiz ediliyor, hangi ölçüte göre (Standartlar uyumu mu, kod kalitesi mi,
   güvenlik mi, performans mı)? Belirsizse önce bunu netleştir.
2. **DISCOVERY** — bağımsız oku: kod, config, diff, README — proje sahibinin sözlü özetine
   güvenme, kaynağı dosyalarda doğrula.
3. **FINDINGS** — her bulgu somut referansla (dosya + satır) gelir; önerilen aksiyonla birlikte.
   Bulgu yoksa "temiz" de. "İş yaptığını göstermek için" bulgu uydurma (bulgu enflasyonu
   yanılgısı) ve kanıtsız "sorun yok" deme (iyimser raporlama yanılgısı) — ikisi de yasak.
4. **Triyaj** — bulgular gerçek / gürültü / araştırılacak diye ayrıştırılır; karar kullanıcıda.
5. **REPORT** — öncelik sırasına göre, kanıtlı; `eng-furkany/ExpertAI` akışındaysa sonucun nereye
   yazılacağı o reponun kendi kuralına tabi (bkz. `mvp-akisi.md` 7. adım).
6. **KARAR** — rapor kullanıcıya sunulur; hangi bulgunun ne zaman/nasıl düzeltileceğine yalnız
   kullanıcı karar verir. ExpertAI akışındaysa bu karar `mvp-akisi.md` 8. adımdaki (düzeltme +
   yeniden denetim) döngüyü başlatır.

Bu mod `mvp-akisi.md`'deki ExpertAI adımına **ek bir katman değil**, o adımın kendi disiplinini
netleştiren bir çerçeve — ve ExpertAI dışındaki her "uygulama analizi" isteğinde de aynı şekilde
kullanılır: analiz eden Claude her zaman QA oturumu gibi davranır, üretici gibi değil.

### Gerçek Bir Örnek: TaskTracker'ın `DENETIM.md`'si (2026-08-29) — KAYNAK PROVENANCE FARKLI

**Uyarı:** `nphlvn/TaskTracker` bu reponun kaynağı değil (bkz. `docs/renkler.md` → "Üçüncü
Bir Referans"), yalnız gözlemlenen bir örnek. `dil-yerellestirme.md`'ye AI Club Portal'ın
"Gerçek Bir Örnek" olarak eklendiği aynı statüde: yukarıdaki soyut SCOPE→DISCOVERY→FINDINGS→
Triyaj→REPORT→KARAR iskeletinin, bağımsız bir üretim projesinde fiilen çalışmış hâli.

TaskTracker'ın kendi `DENETIM.md`'si, 233 bulguluk bir denetimi şu somut mekanizmalarla
yönetiyor — Analiz Modu'nun soyut adımlarına karşılık gelen, kopyalanabilir bir uygulama:

- **Önem seviyesi taksonomisi (FINDINGS'in çıktı biçimi):** her bulguya Kritik/Yüksek/Orta/
  Düşük (K/Y/O/D) etiketi + sabit bir kimlik (`Y1`, `Y2`...) veriliyor; kimlikler bulgu
  kapansa bile **asla yeniden kullanılmıyor** — bir raporun "Y20 düzeltildi" demesi, altı ay
  sonra farklı bir bulguya aynı numarayı vermekten daha güvenilir bir referans sağlıyor.
- **Yanlış alarm ayıklama adımı (Triyaj'ın bir alt-adımı):** düzeltmeye geçmeden önce tüm
  Yüksek-önem bulgular kodun **bugünkü** haliyle tek tek yeniden karşılaştırılıyor — bir
  turda gerçek görünen bir bulgu, başka bir turda zaten önlenmiş olabiliyor (bkz. DENETIM.md
  §0.1'deki Y21 örneği: iddia doğruydu ama ilgili özellik ekrana hiç basılmıyormuş, yani
  kullanıcıyı etkilemiyor — bulgu değil ölü kod). Bu adım, playbook'un "bulgu enflasyonu"
  yanılgısına karşı somut bir panzehir: rapor tarihi geçmiş bulguları güncel kod üzerinden
  doğrulamadan öne sürmüyor.
- **Güvenli / Dikkat-isteyen ayrımı (Triyaj'ın ikinci ekseni):** bir bulgu gerçek olsa bile,
  düzeltmesinin riskini ayrıca sınıflandırıyor — "yalnızca hata yolu, normal kullanımda hiçbir
  şey değişmiyor" (Güvenli) vs. "Sheets'e yazan/silen veya kullanıcının gördüğü rakamı
  değiştiren" (Dikkat isteyen). Güvenli bulgular 3-5'erli gruplanıp hızlı geçiliyor;
  Dikkat-isteyen olanlar **asla gruplanmadan**, tek tek, her birinde "şu an ne oluyor →
  düzeltince ne olacak" mini-planıyla ve İNSAN ONAYIYLA işleniyor. Bu, tek bir "triyaj" adımını
  iki bağımsız eksene (gerçek mi? / düzeltmesi riskli mi?) ayırarak playbook'un genel
  Triyaj adımına bir uygulama şablonu sunuyor.
- **Kök-sebep gruplama:** birbirinden bağımsız görünen birkaç bulgunun aynı kök nedene
  bağlandığı tespit edilince (ör. "yılsız hafta etiketi" tek başına düzeltilince birden çok
  bulgu birlikte kapanıyor) bunlar birlikte ele alınıyor — playbook'un `CLAUDE.md` §9'daki
  "Kök sebep, yama değil" ilkesinin denetim bağlamındaki somut hâli.
- **Zorunlu doküman senkronu (REPORT'un bir parçası):** bir düzeltme kullanıcının gördüğü bir
  şeyi değiştiriyorsa, aynı düzeltme turunda ilgili kullanıcı dokümantasyonu (TaskTracker'da
  `docs/yardim-paneli.md`'deki `HELP`/`HELP_NEWS` listeleri) güncelleniyor; değiştirmiyorsa
  (yalnız içeride duran bir kilit/önbellek) dokümana hiçbir şey yazılmıyor. Ölçüt net: "kod
  değişti mi" değil, "kullanıcının gördüğü bir şey değişti mi".
- **"Test geçmezse" kuralı:** proje sahibi bir düzeltmeyi "olmadı/bozuldu" diye işaretlerse,
  bir sonraki tura geçilmiyor — playbook'un AP-04 kurtarma rampasının (düzeltme yeni regresyon
  yarattı → önce geri al, yeşile dön) denetim bağlamındaki karşılığı.

Bu örnek, playbook'un Analiz Modu'nu kullanan bir sonraki Claude'a şunu gösteriyor: soyut
"FINDINGS her bulgu somut referansla gelir" ilkesi, pratikte kalıcı-kimlikli + önem-seviyeli +
risk-sınıflı bir bulgu defteri **biçiminde** somutlaştırılabilir; bu biçim kopyalanabilir bir
şablon, ama zorunlu değil — küçük bir denetimde bu kadar ağır bir taksonomi gereksiz olabilir.

## Kaynak

`AI-Native Software Engineering: Yapay Zeka ile Mühendislik` (Udemy kursu) — kullanıcının
paylaştığı playbook dokümanından, stack-bağımsız desen (oturum ayrımı, yanılgı kataloğu,
kurtarma rampaları, ortak omurga) süzülerek buraya taşındı. Kursun 13 fazlık uygulama akışı,
rol kartı sistemi ve stack'e özel promptları (.NET/React) bilerek taşınmadı — bu repo canlı kod
içermez ve tek bir teknoloji yığınına bağlı kalmamalı.
