---
name: mvp-akisi
description: Bir kullanıcı sıfırdan bir MVP/dashboard/portal/uygulama kurmak istediğinde ("yeni bir proje kurmak istiyorum", "bana bir dashboard/panel lazım", "sıfırdan başlıyorum" gibi) YA DA var olan bir uygulamayı/kod tabanını analiz ettirmek istediğinde ("şu uygulamayı incele", "bu kodu denetle", "mevcut projeyi analiz et" gibi — yalnız MVP akışına özel değil, herhangi bir "şunu analiz et" isteğinde) bu skill'i kullan. İki modu var: İNŞA MODU — kapsamı netleştiren sorular sorar, standart-dışı isteklerde uyarır, BUILD'den önce yazılı bir SPEC/PRD (+ gerekiyorsa TSD/FSD/Layout MD) onayı ister, üretim sırasında oturum-ayrımı disiplinini uygular. ANALİZ MODU — bağımsız bir QA oturumu gibi davranır (üreten kendini denetleyemez), kanıtsız bulgu/kanıtsız "sorun yok" üretmez, bulguları kanıtlı ve triyaj edilebilir biçimde raporlar. Standart UYGULAMA/DENETİM işini (renk/logo/bileşen/vb.) bu skill değil `standartlar-uyumluluk` skill'i yapar — ikisi art arda tetiklenir, birbirini dışlamaz.
---

# MVP Akışı — Sıfırdan Kurulum ve Analiz

## Bu skill ne için var

`docs/mvp-akisi.md`, `docs/playbook.md` ve `docs/dokuman-standartlari.md` — bu üç doküman
"hangi Standartlar dosyası uygulanır" sorusundan önce gelen "önce ne konuşulur, hangi sırayla
ilerlenir, AI ajanla nasıl çalışılır" sorularına cevap veriyordu, ama elle "önce şu dosyayı
oku" denmedikçe devreye girmiyordu. Bu skill, `apps-script-push` ve `standartlar-uyumluluk`
skill'leriyle aynı mantıkla, o üç dokümanı **otomatik tetikleyen** ince bir yönlendiricidir.
İçeriklerini kopyalamaz/tekrar etmez — onlar zaten var ve birbirine bağlı (381 satır); bu
dosya yalnız "ne zaman hangisine bakılır" haritasını taşır ve tetiklendiğinde ilgili dosyayı
**baştan sona okuyup uygular**.

## İnşa Modu — sıfırdan bir MVP kuruluyor

Tetiklendiğinde şu sırayla ilerle:

1. `docs/mvp-akisi.md`'yi baştan sona oku ve uygula — kullanıcının anlattığı kapsam (1. adım),
   boşluk-doldurma soruları (2. adım, **yalnız tablodaki 5 soru**, dışına çıkma), otomatik
   uygulanan standartlar (3. adım — bunlar sorulmaz, doğrudan çekilir).
2. Plan Onayı (4. adım): `docs/dokuman-standartlari.md`'ye göre PRD (her zaman zorunlu) +
   ölçeğe göre TSD/FSD/Layout MD üret, kullanıcı onaylamadan BUILD'e geçme.
3. Onay sonrası `docs/playbook.md`'nin "İnşa Modu" bölümündeki PLAN→onay→BUILD→dahili
   REVIEW→triyaj→TEST/VERIFY→SHIP döngüsünü ve AP kurtarma rampalarını uygula.
4. Standart-dışı bir istek gelirse `mvp-akisi.md` 5. adımdaki akışı izle (uygula ama kalıcı
   sayma, ısrar edilirse `muhammed-furkan.yesilmen.ext@valeo.com`'a yönlendir).
5. Renk/logo/ikon/sidebar/bileşen gibi somut standart uygulama işi bu skill'in kapsamı DEĞİL —
   3. adımdaki "otomatik uygulanan standartlar" ve BUILD sırasında karşılaşılan her standart
   sorusu `standartlar-uyumluluk` skill'inin Rehber Modu'na devredilir (bu skille birlikte,
   art arda tetiklenirler).
6. MVP tamamlanınca (Apps Script hedefliyse push tamamlanınca) `mvp-akisi.md` 7-8. adımdaki
   `eng-furkany/ExpertAI` denetim akışına yönlendir.

## Analiz Modu — var olan bir uygulama/kod analiz ediliyor

Bu mod yalnız ExpertAI adımına özel değil — "şu uygulamayı/kodu analiz et" diyen **her**
istekte tetiklenir.

1. `docs/playbook.md`'nin "Analiz Modu" bölümündeki SCOPE→DISCOVERY→FINDINGS→Triyaj→REPORT→
   KARAR adımlarını uygula: analiz eden Claude o uygulamanın "DEV"i değil, QA'sıdır —
   kullanıcının anlatımına değil dosyalara bakar.
2. Aynı dosyadaki "AI Yanılgı Kataloğu"nu özellikle gözet: kanıtsız iddia, bulgu enflasyonu,
   totolojik doğrulama ("kontrol ettim, sorun yok" ama gerçekten sınamadan), iyimser
   raporlama — hiçbiri kabul edilmez.
3. Standartlar reposuna uyumluluk da analizin bir parçasıysa bu adımı `standartlar-uyumluluk`
   skill'inin Denetim Modu'na devret (kod taraması + `standartlar-uyumluluk-<proje-adı>.html`
   raporu) — iki skill aynı isteğe birlikte cevap verebilir.

## Kaynak

Bu skill `docs/mvp-akisi.md`, `docs/playbook.md`, `docs/dokuman-standartlari.md`'yi silmez —
üçü de tam hâliyle `docs/`'ta kalır, bu dosya yalnız onları otomatik tetikler. İçeriklerinden
biri değişirse bu dosyanın güncellenmesi gerekmez (içerik burada kopyalanmadı), yalnız yeni bir
adım/mod eklenirse (`mvp-akisi.md`'ye yeni bir numaralı adım gibi) yukarıdaki akış listesine de
bir satır eklenmesi gerekir — yoksa bu skill o adımı atlar.
