# Logo Standartları

## Varlıklar

- **`assets/Valeo_Logo.png` — resmi/birincil logo (2026-09-01 kararı), PNG, 3840×1825,
  saydam zemin, 148KB.** Kaynak: `eng-furkany/ValeoDashboard` deposundaki `Valeo_Logo.svg.png`
  dosyasının aynısı. **Yeni bir projeye logo taşırken buradan başla.**
- **`assets/Valeo_Logo_AIClubPortal.png` — yedek (fallback) logo, PNG, 600×285, saydam
  zemin, 38KB.** Kaynak: `eng-furkany/AI_Club_Portal` deposu, `Assets.js` içindeki
  `VALEO_LOGO_DATA_URI` sabitinden çıkarıldı. Görsel olarak yukarıdaki dosyayla **aynı
  logo/aynı çizim** (renk, font, işaret aynı) — tek fark çözünürlük ve dosya boyutu. Ana logo
  bir nedenle yüklenemediğinde (`onerror`) buna düşülür; küçük/self-contained olduğu için
  ayrıca e-posta CID gömme gibi dosya boyutunun önemli olduğu yerlerde de kullanılabilir
  (bkz. altta "E-posta İçinde Kullanım"). AI Club Portal bu dosyayı canlı bir üretim
  uygulamasında (web arayüzü + e-posta eki) başarıyla kullanıyor.

  **Not (2026-09-01):** Bu iki dosyanın rolü daha önce tersti — `Valeo_Logo_AIClubPortal.png`
  küçük/üretimde-doğrulanmış olduğu için resmi, `Valeo_Logo.png` yalnız büyük baskı için
  referans olarak işaretliydi (2026-08-21 kararı). Kullanıcı talebiyle roller tersine
  çevrildi: ValeoDashboard kaynaklı büyük dosya artık birincil, AI Club Portal kaynaklı küçük
  dosya yedek. Ayrıca aynı gün `assets/valeo-wordmark-fallback.svg` (bağımlılıksız inline SVG
  wordmark, kaynağı Bursa CV Projects'in boot-ekranı yedeği) **silindi** — artık ayrı bir
  wordmark çizimi tutmak yerine gerçek logonun küçük PNG kopyası yedek görevini görüyor; bu,
  orijinal logoyla piksel piksel eşleştiği için SVG wordmark'tan daha sadık bir yedek.

## Kullanım Kuralları (iki kaynak projeden ortak çıkarılmıştır)

- **Beyaz/açık zemin üzerinde:** orijinal logo (`assets/Valeo_Logo.png`) olduğu gibi
  kullanılır.
- **Koyu zemin üzerinde (header, sidebar):** logonun beyaz versiyonu kullanılır; ayrı bir
  dosya yoksa CSS'te `filter: brightness(0) invert(1)` ile tersine çevrilir
  (ValeoDashboard'ın sidebar logosu bu deseni kullanıyor).
- **Boyut:** Sidebar/header gibi dar alanlarda yükseklik **max 32px**, `object-fit: contain`.
  Bursa CV Projects header'ında 22px kullanılıyor — bağlama göre 22–32px aralığı makul.
- Logo yanına **ek metin yazılmaz** — logo tek başına marka adını taşır.
- Logo **asla kırpılmaz, deforme edilmez, rengi değiştirilmez** (yalnızca koyu zemin için
  beyaza çevirme istisnadır).
- Yüklenemediğinde sessizce kaybolmak yerine bir **yedek** göster — Bursa CV Projects'teki
  `onerror` deseninden alınmıştır, hedefi artık SVG değil `Valeo_Logo_AIClubPortal.png`:
  ```html
  <img src="Valeo_Logo.png" alt="Valeo"
       onerror="this.onerror=null; this.src='Valeo_Logo_AIClubPortal.png';">
  ```

## E-posta İçinde Kullanım (AI Club Portal'dan gerçek desen — KAYNAK PROVENANCE FARKLI)

AI Club Portal kaynak proje değil (bkz. `dil-yerellestirme.md`'deki aynı uyarı), ama e-posta
gönderiminde logoyu **`data:` URI olarak DEĞİL, CID (Content-ID) ekli blob olarak** gömen
doğru ve genel-geçer bir teknik kullanıyor — çoğu mail istemcisi (Gmail dahil) güvenlik
nedeniyle gömülü `data:` URI görsellerini engellediği için `<img src="data:...">` e-postada
**görünmez**. Herhangi bir GAS projesinde `MailApp`/`GmailApp` ile logolu HTML e-posta
gönderiliyorsa bu desen doğrudan taşınabilir (küçük dosya boyutu nedeniyle e-posta ekinde
`Valeo_Logo_AIClubPortal.png`'in kendisi kullanılır):

```js
function getLogoBlob_() {
  var base64 = VALEO_LOGO_DATA_URI.split(',')[1];
  return Utilities.newBlob(Utilities.base64Decode(base64), 'image/png', 'valeo-logo.png');
}

MailApp.sendEmail(to, subject, plainText, {
  htmlBody: '...<img src="cid:valeologo" alt="Valeo" style="height:42px;">...',
  inlineImages: { valeologo: getLogoBlob_() }
});
```

## Kaynak Notu

**2026-08-23'te düzeltildi — bu paragraf eskimişti.** Bursa CV Projects artık Wikimedia'ya
dış bağlantı vermiyor: logo `src/Index.html` içine **gömülü bir `data:image/webp` URI**
olarak taşındı, Wikimedia adresi yalnız kaldırılma gerekçesini anlatan bir yorumda geçiyor.
Repo kendi `CLAUDE.md`'sinde gerekçeyi dört maddede sayıyor (ağ kesilince kırık görünüyor,
her açılışta üçüncü tarafa istek gidiyor, marka düzenlenebilir bir kaynaktan geliyor) ve
bugün **çalışma anında sıfır dış istek** ilkesini uyguluyor — bu ilke bir tarayıcı testiyle
(`tests/browser.test.js`, "dış kaynak bağımlılığı YOK") sürekli doğrulanıyor. Yedek deseni
(`onerror` → ikinci dosya) ise **yerinde duruyor**, yukarıdaki kullanım kuralı geçerli — yalnız
2026-09-01'de hedef dosya SVG wordmark'tan `Valeo_Logo_AIClubPortal.png`'e değişti (bkz.
"Varlıklar" bölümündeki not). `assets/Valeo_Logo.png` dosyası, aynı logonun ValeoDashboard
deposunda barındırılan **yerel** kopyasıdır — dış bağımlılık olmadan kullanılabilir.
`assets/Valeo_Logo_AIClubPortal.png` ise aynı logonun AI Club Portal'da üretimde doğrulanmış,
küçültülmüş kopyasıdır (kaynağı 2026-08-21 kararı, rolü 2026-09-01'de yedeğe çevrildi — bkz.
`CLAUDE.md`).
