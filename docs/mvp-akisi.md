# MVP Akışı — Sıfırdan Ürün Kurulumu

Bu dosya, hiç bilmeyen birinin **tek bir Claude Code session'ında** bu repoyu (Standartlar)
göstererek kendi sayfasını/dashboard'unu/uygulamasını Claude'a anlatması, ilk MVP'nin bu
repodaki standartlarla inşa edilmesi ve ardından `eng-furkany/ExpertAI`'deki denetim
prompt'larıyla test edilip düzeltilmesi için izlenecek sırayı tanımlar. `docs/baslarken.md`
"hangi standart dosyasını nasıl uygularım" sorusuna cevap veriyor — bu dosya ondan önce gelen
"önce ne konuşulur, hangi sırayla ilerlenir" sorusuna cevap veriyor. BUILD (4. adım sonrası) ve
denetim (7-8. adım) sırasında AI ajanla **nasıl** çalışılacağı — oturum ayrımı, kurtarma
promptları, yanılgı kataloğu — `playbook.md`'de; bu dosya yalnız MVP akışına değil, var olan
herhangi bir uygulamayı analiz ettirme isteğine de uygulanır.

Bu repo hâlâ **canlı kod içermez** (bkz. `CLAUDE.md`) — aşağıdaki akış MVP'nin kendi
reposunda/projesinde inşa edilmesini anlatır, Standartlar'a kod yazılmaz.

## 1. Kullanıcının Anlattığı (Kapsam)

Kullanıcı kendi cümleleriyle üç şeyi anlatır:
- **Ne kuruyor** — dashboard, web sayfası (portal) veya basit bir uygulama.
- **Kimler erişecek** — herkese açık mı, tek kullanıcı mı, rol bazlı mı.
- **Neler içermeli** — istediği özellik/ekranların kabaca listesi.

## 2. Claude'un Sorması Gerekenler (Boşluk Doldurma)

Yukarıdaki üç madde dışında kalan, ama sonraki adımları etkileyen boşluklar için Claude
kullanıcıya sorar — **bunların dışına çıkmaz**, yoksa sorgulama kendi başına bir engele döner:

| Soru | Neden gerekli |
|---|---|
| Sınırda kalan durumlarda ("hem tablo hem form var") — asıl amaç dashboard mı, portal mı, basit uygulama mı? | Aşağıdaki standartların hangi ağırlıkla uygulanacağını belirler |
| PC mi mobil mi öncelikli, yoksa ikisi eşit mi? | `sidebar.md`'deki masaüstü rail+flyout / mobil bottom-nav seçimini belirler |
| Veri nereden geliyor — Google Sheets/Apps Script mi, başka bir backend mi, yoksa statik/mock veri mi? | `workspace-addon.md` mı yoksa bağımsız web-app dokümanları mı uygulanacağını belirler; cevap Apps Script ise 6. adımdaki push akışı devreye girer |
| "Kimler erişecek" cevabının altı — tek rol mü, admin/editör/görüntüleyici gibi çoklu rol mü? | `yetki-gorunumu.md`'deki `data-w`/`body.no-*` desenini uygulayıp uygulamayacağını belirler |
| Kabaca kaç kullanıcı / kaç satır veri bekleniyor? | `veri-listeleme.md`'deki `ColFilter`/parçalı çizim gibi ağır desenlerin gerekip gerekmediğini belirler — küçük ölçekte aşırı mühendislik yapılmaz |

## 3. Otomatik Uygulanan Standartlar (Sorulmaz)

Aşağıdakiler kullanıcıya **hiç sorulmadan**, doğrudan bu repodan çekilir — `baslarken.md`'nin
1-14 arası adımları burada tekrar edilmez, sırasıyla oradan uygulanır: renk paleti
(`tokens/colors.css`), logo kullanımı (`logo.md`), ikon kütüphanesi (`ikonlar.md` — Lucide),
buton/kart/dialog/chip/tablo/tooltip/toast/rozet stilleri (`bilesenler.md`,
`jenerik-desenler.md`, `veri-listeleme.md`), spacing ölçeği ve tipografi
(`jenerik-desenler.md`), form kontrolleri (`form-kontrolleri.md`), erişilebilirlik kalıpları
(`jenerik-desenler.md`, `bilesenler.md`). Sidebar/nav deseni adım 2'deki cihaz cevabına göre
otomatik seçilir, ayrıca sorulmaz.

## 4. Plan Onayı — BUILD'den Önce Durak

Sorular cevaplandıktan sonra Claude, ne inşa edeceğinin özetini kullanıcıya sunar ve inşaya
kullanıcı onayladıktan sonra başlar. Bu adım atlanmaz — kullanıcı bu işi hiç bilmiyor olabilir,
yanlış bir varsayımı inşadan SONRA fark etmek, baştan sormaktan çok daha pahalıdır.

Bu özet artık isimlendirilmiş, yazılı bir **SPEC**'tir — hangi doküman türlerinden oluştuğu ve
hangi MVP ölçeğinde hangisinin zorunlu olduğu `dokuman-standartlari.md`'de tanımlı: her MVP'de
bir **PRD** (amaç, hedef kullanıcı, kapsam, başarı kriteri) ve ekran başına bir **Layout MD**
(hangi bölgede hangi Standartlar bileşeni kullanılacağı, ürün tipi Dashboard ise varsayılan
ana ekran `jenerik-desenler.md`'deki "Sinoptik Görünüm" desenidir); gerçek backend varsa
**TSD**, çok ekranlı/çok rollü ise **FSD** de eklenir.

Onay sonrası BUILD'in nasıl yürütüleceği — plan onaysız koda geçilmez, BUILD'i temiz bir
oturumda denetleyen dahili bir REVIEW adımı var, sorun çıkarsa hangi kurtarma promptu devreye
girer — `playbook.md`'nin "İnşa Modu" bölümünde. Bu dahili review, 7. adımdaki ExpertAI
denetiminin yerine geçmez, ondan önceki hızlı bir kalite kapısıdır.

## 5. Standart Dışı İstekler

Kullanıcı bu repodaki bir "Kalıcı Karar"dan (ör. resmi renk paleti, modal deseni) sapan bir
şey isterse:

1. Claude önce **"bu standart dışı bir istek"** olduğunu açıkça söyler.
2. Yine de MVP hızını engellememek için isteği uygular — reddetmez.
3. Varsayılan olarak bu sapma kalıcı değildir: 7. adımdaki audith turunda (`prompts/05-universal-
   enterprise-app-master-audit.md` design-system/M3 uyumluluğunu zaten kontrol eder) bulgu
   olarak çıkar ve 8. adımdaki düzeltme turunda standarda geri çekilir.
4. Kullanıcı, Claude'un uyarısına rağmen **ısrar ederse** (sapmanın kalıcı kalmasını
   istiyorsa), Claude kod tarafında hiçbir şeyi kalıcı standart hâline getirmez — bunun
   yerine kullanıcıya, konuyu **muhammed-furkan.yesilmen.ext@valeo.com** adresine mail atmasını
   söyler. Mailde şunlar olmalı: proje adı/tipi, hangi Standartlar kararından sapıldığı, tam
   olarak ne istendiği, gerekçe. Admin bunu değerlendirip normal Kalıcı Karar sürecine
   (`CLAUDE.md`'ye elle işlenen karar) sokar ya da reddeder — Claude bu kararı MVP session'ında
   tek başına veremez.

## 6. Apps Script'e Push (yalnız hedef Apps Script/Workspace ise)

2. adımdaki "veri zemini" cevabı Google Sheets/Apps Script ise ve kullanıcı kodun local
build'de kalmayıp gerçek Apps Script projesine gönderilmesini istiyorsa,
`.claude/skills/apps-script-push/` tetiklenir — Claude Code'un bulut konteynerinden `clasp` ile
kimlik doğrulayıp push etmenin
güvenli sırası (kurulum, OAuth, onay, push, kimlik-dosyası güvenlik kuralları). Hedef Apps
Script değilse bu adım tamamen atlanır. Audith'in **canlı** projeyi denetleyebilmesi için
7. adımdan önce en az bir kez tamamlanmış olması gerekir.

## 7. Audith'e Yönlendirme

MVP tamamlanınca (ve Apps Script hedefliyse 6. adım tamamlanınca) Claude kullanıcıyı
`eng-furkany/ExpertAI`'ye yönlendirir. Hedef bir "Project Follow-Up Planning" değilse (ki bu
akıştan doğan MVP'ler hiçbir zaman değildir), `ExpertAI/prompts/README.md`'nin kuralı uyarınca
**her zaman ve koşulsuz** `prompts/05-universal-enterprise-app-master-audit.md` ile başlanır —
ilk tur olması bunu değiştirmez. Sonuç `ExpertAI/repos/<repo-adı>.md`'ye aynı reponun kendi
kayıt kuralıyla işlenir.

ExpertAI'nin ürettiği bulguları okurken ve triyaj ederken `playbook.md`'nin "Analiz Modu"
disiplini uygulanır (kanıtsız bulguya güvenme, iyimser "sorun yok" raporuna güvenme — bkz. o
dosyadaki yanılgı kataloğu). Aynı disiplin, bu MVP akışının dışında kalan herhangi bir "şu
uygulamayı/kodu analiz et" isteğinde de geçerlidir.

## 8. Düzeltme ve Yeniden Denetim

Audit bulguları uygulandıktan sonra — Apps Script hedefliyse düzeltmeler
`.claude/skills/apps-script-push/` akışıyla tekrar push edilir, istisnası yok — Claude aynı audit'i (05'in kendi 12. fazı — Final
Re-Audit) tekrar çalıştırır ve puan değişimini raporlar. "Düzelttim" ile "gerçekten düzeldi"
arasındaki fark yalnız bu tekrar turuyla görülür — tek seferlik bir düzeltmeyle akış bitmiş
sayılmaz.
