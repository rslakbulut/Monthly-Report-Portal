---
name: standartlar-uyumluluk
description: Bir projeyi Valeo Standartlar reposundaki (eng-furkany/Standartlar) tasarım/mühendislik standartlarıyla karşılaştırmak gerektiğinde bu skill'i kullan. İki tetikleyici senaryo var — (1) Kullanıcı yeni bir proje kuruyor veya var olan bir projeye standart uyguluyor ("bu projeye Standartlar'ı uygula", "yeni proje kur, standartlara uysun" gibi) → REHBER MODU: ilgili kategorileri sırayla uygula, ama projede zaten var olan koda dokunmadan önce sapmayı bildirip onay iste. (2) Kullanıcı mevcut bir projenin standarda ne kadar uyduğunu öğrenmek istiyor ("standartlara ne kadar uyuyoruz", "uyumluluk kontrolü/raporu yap", "standartlar-uyumluluk raporu oluştur", "compliance check" gibi) → DENETİM MODU: kodu tarar, `standartlar-uyumluluk-<proje-adı>.html` raporu üretir. Her iki modda da KURAL AYNI: yalnızca tespit + öneri + rapor — hiçbir kod dosyası bu skill tarafından kendiliğinden değiştirilmez, düzeltme için ayrıca açık onay istenir.
---

# Standartlar Uyumluluk

## Bu skill ne için var

`eng-furkany/Standartlar` reposu (bu repo) Valeo projeleri arasında ortak tasarım/mühendislik
standartlarını tutar. Bu skill, o standartları **başka bir projeye** taşırken Claude'un
elle `docs/baslarken.md`'yi okumasına gerek kalmadan otomatik tetiklenen kopyasıdır — aynı
`apps-script-push` skill'iyle aynı mantık. Kopyalandığı her projede iki iş yapar:

1. **Rehber Modu** — yeni kod yazarken/proje kurarken ilgili standardı doğrudan uygular.
2. **Denetim Modu** — var olan kodu tarayıp somut kanıtlarla bir uyumluluk raporu üretir.

**Değişmez kural (ikisi için de):** bu skill kod dosyalarını **kendiliğinden değiştirmez**.
Sapma bulduğunda söyler, önerir, raporlar — düzeltmeyi uygulamak için kullanıcıdan **ayrı ve
açık** bir onay ister. "Raporda bulundu" onay sayılmaz.

## Bağlam — ilerlemeden önce bil

- `checklist.json` (bu klasörde) 21 kategori ve ~78 kriter içerir, `eng-furkany/Standartlar`
  reposunun `docs/baslarken.md`'sinden türetilmiştir. Bu skill kopyalandığı projede
  Standartlar reposu **erişilebilir olmayabilir** — `checklist.json` kendi başına yeterli
  olacak şekilde tasarlandı (her kriterin yanında ne aranacağına dair bir `hint` var).
- Eğer Standartlar reposu bu oturumda gerçekten erişilebilirse (ör. `add_repo` ile eklendi ya
  da zaten bu repo üzerinde çalışılıyor), **`docs/baslarken.md` ve ilgili `docs/*.md` dosyaları
  her zaman `checklist.json`'dan daha eksiksiz kaynaktır** — varsa onları tercih et, özellikle
  Rehber Modu'nda (tam CSS token'ları, logo dosyaları, örnek kod parçaları yalnız o repoda var).
- `checklist.json`'daki bazı `hint` metinlerinde **KRİTİK** işareti var (yetkilendirme,
  kimlik-dosyası sızıntısı gibi). Denetim sırasında bu tür bir bulguya rastlarsan raporda ve
  sohbet özetinde öne çıkar — bunlar stil tercihinden farklı, gerçek risk taşıyabilir.

---

## Rehber Modu

Kullanıcı yeni bir proje kuruyor veya var olan bir projeye standart uygulanmasını istiyor.

1. Standartlar reposu erişilebilirse `docs/baslarken.md`'yi baştan sona uygula (asıl kaynak).
   Değilse `checklist.json`'daki kategori `desc` alanlarını rehber olarak kullan; logo/CSS gibi
   birebir dosya kopyası gereken kategorilerde (01 Renk, 02 Logo, 02b İkonlar) kullanıcıya
   `eng-furkany/Standartlar`'ı ekleyip `tokens/colors.css` + `assets/` içeriğini taşımasını
   öner — hex kodlarını ezbere yeniden üretme.
2. **Yeni yazılan kod** için: istenen özelliği doğrudan ilgili kategorinin desenine uygun
   yaz (bu, kullanıcının zaten istediği işin bir parçası — ayrı onay gerekmez).
3. **Var olan kod** için: dokunduğun alanda standarda aykırı bir şey görürsen (ör. native
   `<select>` filtre olarak kullanılmış, dark-mode mekanizması eksik) bunu kullanıcıya söyle ve
   düzeltmeyi öner — ama istenen işin kapsamı dışına çıkıp kendiliğinden refactor etme. Kapsam
   dışı bir sapmayı düzeltmek istiyorsan önce sor.
4. "Varsayılan" (mode: default) kategorileri sessizce atlama — kullanıcı özellikle
   "gece modu istemiyorum" gibi bir tersine çevirme talebinde bulunmadıkça uygulanmaları
   beklenir (bkz. Standartlar `CLAUDE.md`, 2026-08-29 kararı).

---

## Denetim Modu

Kullanıcı var olan bir projenin uyumluluğunu ölçmek istiyor.

### 1. Proje adını belirle

Kullanıcıdan gelmediyse repo adından türet (ör. `Power-CV`). Dosya adında kullanılacak
kebab-case sürümünü de hazırla (Türkçe karakterleri sadeleştir, boşlukları `-` yap): örn.
`Power-CV` → `power-cv`.

### 2. `checklist.json`'ı oku

Bu klasördeki `checklist.json`, 21 kategorinin tamamını (`id`, `code`, `title`, `doc`, `mode`,
`desc`, `signal`, `items[].text`, `items[].hint`) içerir. Bunu bulgu üretmenin **iskeleti**
olarak kullan — her kategori ve item birebir buradan gelir, metinleri değiştirme.

### 3. Her kategori için uygulanabilirliği belirle

- `mode: "default"` olan kategoriler varsayılan olarak **Aktif** kabul edilir (proje türü
  açıkça dışlamıyorsa — ör. bir Apps Script projesi değilse "14 Apps Script'e Push" zaten
  `optional`, bu karar zor değil).
- `mode: "optional"` olan kategoriler yalnızca `signal` alanındaki heuristiğe uyan somut bir
  bulgu varsa **Aktif** sayılır (grep/glob ile ara). Bulamazsan **Kapsam Dışı** işaretle ve
  `applicabilityNote`'a kısaca neden (ör. "Chart.js veya <canvas> kullanımı bulunamadı").
- Emin değilsen Aktif değil, Kapsam Dışı tarafına yatır ve notta belirsizliği yaz — yanlış
  pozitif (olmayan bir özelliği "karşılanmıyor" diye cezalandırmak) yanlış negatiften daha
  yanıltıcı.

### 4. Aktif kategorilerde her item'ı denetle

Her item için `hint` alanındaki ipucunu kullanarak (Grep/Glob/Read) kod tabanında kanıt ara:

- **met** — kriter gerçekten karşılanıyor. `evidence` alanına kısa kanıt yaz (`dosya:satır`
  veya işlev adı, ör. `"src/Stylesheet.html:34 — #041b3c kullanılıyor"`).
- **unmet** — aranan şey yok veya açıkça eksik. `evidence`'a nerede aradığını/neden eksik
  olduğunu yaz (ör. `"prefers-reduced-motion kuralı bulunamadı"`).
- **unclear** — kod taramasıyla kesin karar verilemiyor (ör. sunucu tarafı kontrol GAS
  dosyasında var ama yetki mantığı belirsiz). Tahmin etme, `unclear` kullan ve nedenini yaz.

`checklist.json`'daki hint'te **KRİTİK** notu olan bir item `unmet` çıkarsa, o item'a
`"critical": true` ekle (yalnız gerçekten ciddiyse — ör. sunucu tarafı yetkilendirme yok,
kimlik dosyası commit edilmiş; küçük bir stil eksikliği için kullanma).

### 5. Bulgu JSON'unu oluştur

Aşağıdaki şemaya uy — `categories` dizisi `checklist.json`'daki sırayla, her kategori/`item`
`id`/`code`/`title`/`doc`/`mode`/`desc` alanlarını checklist.json'dan **aynen** kopyalar, sen
yalnız `applicable`, `applicabilityNote`, `categoryNote` (kategori) ve `status`/`evidence`/
`critical` (item) alanlarını eklersin:

```json
{
  "project": "Power-CV",
  "auditedAt": "2026-09-01",
  "sourceNote": "eng-furkany/Standartlar checklist.json ile senkron (2026-09-01)",
  "categories": [
    {
      "id": "renk", "code": "01", "title": "Renk Paleti", "doc": "docs/renkler.md, tokens/colors.css",
      "mode": "default", "desc": "…checklist.json'daki desc…",
      "applicable": true, "applicabilityNote": "", "categoryNote": "",
      "items": [
        {"text": "…checklist.json'daki text…", "status": "met", "evidence": "src/Stylesheet.html:12 — #041b3c bulundu"},
        {"text": "…", "status": "unmet", "evidence": "Bursa CV hex'leri (#1B2B4B) marka rengi olarak kullanılıyor", "critical": false}
      ]
    }
  ],
  "recommendations": [
    {"categoryId": "darkmode", "summary": "Koyu mod mekanizması hiç yok", "action": "applyDarkMode + osPrefersDark deseni kurulmalı (docs/koyu-mod.md)", "critical": false},
    {"categoryId": "yetki", "summary": "Sunucu tarafında yetki kontrolü yok", "action": "Her google.script.run hedefinde rol doğrulaması eklenmeli", "critical": true}
  ]
}
```

`recommendations`: en çarpıcı 3-8 bulguyu seç (en düşük skorlu kategoriler + tüm `critical`
bulgular öncelikli). Her biri tek bir kategoriye (`categoryId`) bağlanır.

### 6. Raporu üret

`report-template.html`'i oku, içindeki tek satırlık `__STANDARTLAR_FINDINGS_JSON__`
placeholder'ını 5. adımda oluşturduğun JSON ile değiştir (başka hiçbir yeri değiştirme —
CSS/JS zaten hazır), sonucu **hedef projenin kök dizinine**
`standartlar-uyumluluk-<proje-adı-kebab-case>.html` adıyla yaz. Aynı isimde bir dosya
varsa üzerine yaz (bu bir anlık durum raporu, versiyon geçmişi tutmuyor — kullanıcı isterse
git'te zaten görünür).

### 7. Sohbette özetle

Genel skor, en düşük skorlu 3-5 kategori, ve varsa kritik bulgular (özellikle güvenlik/
yetkilendirme) — kısa. Raporun tamamını sohbete yapıştırma, dosya zaten üretildi.

### 8. Asla yapma

- Bulunan bir sapmayı düzeltmek için kod dosyası **Edit/Write etme** — kullanıcı raporu
  gördükten sonra açıkça "bunu düzelt" demeden.
- Skoru iyi göstermek için belirsiz durumları `met` yazma — `unclear` kullanmaktan çekinme.
- `checklist.json`'daki `text` alanlarını parafraze etme — birebir kopyala, yalnız bulgu
  alanlarını ekle (rapor farklı projeler arası karşılaştırılabilir kalsın).

---

## Kaynak

Bu dosya tek kaynaktır — önceki ayrı insan-okur kopyası `docs/standartlar-uyumluluk.md`
2026-09-02'de kaldırıldı (bkz. `docs/karar-gecmisi.md`). Kriter listesinin (`checklist.json`)
kaynağı hâlâ `docs/baslarken.md`'dir — ikisi senkron tutulmalı: `baslarken.md`'ye yeni bir
madde/kategori eklenip `checklist.json`'a yansıtılmazsa denetim o standardı hiç göremez
(`.claude/hooks/notify-baslarken-sync.sh` bunu hatırlatır, ama zorunluluğun kendisi mekanik
değil, elle kontrol gerektirir).
