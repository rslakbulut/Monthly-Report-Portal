# Dil ve Yerelleştirme — Gerçek Durum

**Varsayılan (2026-08-29 kararı):** aşağıdaki "Gerçek Bir Örnek: AI Club Portal" bölümündeki
`T`/`t()` deseni (3 bilinen eksiği kapatılmış haliyle) artık her yeni projede varsayılan
olarak kurulur — kullanıcı özellikle "yalnız Türkçe yeterli" demedikçe atlanmaz. Detay ve
gerekçe: `baslarken.md` madde 12, `CLAUDE.md` Kalıcı Kararlar. Bu, aşağıdaki "Ne YOK" tespitini
değiştirmiyor — kaynak projelerde hâlâ böyle bir mekanizma yok, yalnız yeni projeye taşırken
uygulanması artık isteğe bağlı değil.

**Önemli:** Bu dosya, **kaynak** projelerde (`ValeoDashboard`, `Bursa-CV-Projects`) var olanı
belgeler — uydurulmadı, çünkü bu repo yalnız kaynak projelerden gerçekten kopyalanabilecek
şeyleri tutuyor. **2026-08-21 güncellemesi:** aşağıya, kaynak projelerden biri OLMAYAN ama bu
standartları tüketen gerçek bir projede (AI Club Portal) görülen, çalışan bir TR/EN
mekanizması da eklendi — bkz. "Gerçek Bir Örnek" bölümü. İki kaynak projede hâlâ böyle bir
mekanizma **yok**; aşağıdaki "Ne YOK" bölümü hâlâ geçerli, yalnız kapsamı netleştirildi.

## Ne YOK: Türkçe/İngilizce Dil Değiştirme (İKİ KAYNAK PROJEDE)

Ne `ValeoDashboard` ne `Bursa-CV-Projects` bir dil seçici, çeviri sözlüğü (i18n dictionary)
veya `lang` özniteliğini çalışma anında değiştiren bir kod içeriyor. İkisi de:

- `<html lang="tr">` **sabit** — hiç değişmiyor.
- Tüm arayüz metni, hata mesajları, sayfa etiketleri **doğrudan Türkçe** yazılmış (çeviri
  anahtarından değil, string literal olarak).

Yani "TR/EN dil desteği" bu iki projede **taşınabilecek bir standart değil** — çünkü
kaynakta karşılığı yok. Eğer bir sonraki adım gerçek çok dilli destekse, bu **sıfırdan
tasarlanacak yeni bir iş** — bkz. aşağıdaki "Buradan Devam Edilirse" bölümü.

## Ne VAR: Türkçe Yerelleştirme Desenleri (taşınabilir)

İki kaynakta da (yalnız Bursa CV Projects'te belgeli/kasıtlı) tekrarlanan, gerçekten
taşınabilir iki desen var:

### 1. Türkçe locale ile sayı/tarih biçimlendirme

```js
d.toLocaleDateString('tr-TR');
n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
```

Türkçe'de yüzde işareti sayıdan **önce** gelir (`%12`), para birimi sayıdan **sonra**
(`18,2 €`) — bu, `Intl`/`toLocaleString`'in `tr-TR` locale'iyle otomatik doğru çıkar; elle
string birleştirirken bu sırayı bozmamak gerekir.

### 2. Türkçe karakter-duyarsız arama normalizasyonu

Komut paleti (Ctrl+K) ve benzeri arama kutularında kullanıcı Türkçe karakter yazmadan da
("urun agaci") sonucu bulabilsin diye kullanılan normalize fonksiyonu:

```js
/* Değiştirme LOWERCASE'DEN ÖNCE yapılır: JS'te 'İ'.toLowerCase() birleşik
   noktalı 'i̇' üretiyor ve sonradan eşleşmiyor. */
function _cpNorm(s) {
  return String(s == null ? '' : s)
    .replace(/[ıİ]/g, 'i').replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c')
    .toLowerCase();
}
function _cpMatch(hay, q) {
  return _cpNorm(hay).indexOf(_cpNorm(q)) >= 0;
}
```

Bu **çeviri değil** — aynı Türkçe metnin farklı klavye/karakter girişleriyle eşleşmesini
sağlıyor. Yine de herhangi bir arama/filtre kutusu için genel geçer, taşınabilir bir desen.

## Türkçe Ad Biçimlendirme (2026-08-29, TaskTracker — KAYNAK PROVENANCE FARKLI)

**Uyarı:** kaynağı `nphlvn/TaskTracker` — üçüncü bir referans, bkz. `renkler.md`. Yukarıdaki
"2. Türkçe karakter-duyarsız arama normalizasyonu" bölümündeki İ/I gotcha'sının somut, kişi
adı biçimlendirmede kullanılan bir uygulaması: ad(lar) Baş-Harf-Büyük, soyad TAMAMEN BÜYÜK
(`"inci sahin"` → `"İnci ŞAHİN"`):

```js
function trUpper(s){ return String(s||'').replace(/i/g,'İ').replace(/ı/g,'I').toUpperCase(); }
/* Title-case one word: first letter Turkish-aware upper, rest plain lower.
   (Plain lower on the tail avoids I→ı corruption when the source is all-caps.)
   The leftover combining dot is stripped for the same reason normName folds the
   Turkish letters up front: lowercasing "İ" yields "i"+U+0307, so an all-caps
   cell "İNCİ ŞAHİN" rendered as "İnci̇ ŞAHİN" — a second dot over the name. */
function titleWord(w){
  w=String(w||''); if(!w) return w;
  var f=w.charAt(0); f=(f==='i')?'İ':(f==='ı')?'I':f.toUpperCase();
  return f+w.slice(1).toLowerCase().replace(/̇/g,'');
}
function formatNameRaw(s){
  s=String(s==null?'':s).trim(); if(!s) return s;
  var parts=s.split(/\s+/);
  if(parts.length===1) return titleWord(parts[0]);
  var sur=parts.pop();
  return parts.map(titleWord).join(' ')+' '+trUpper(sur);
}
```

(Kaynak: TaskTracker `Index.html`, sunucu tarafında (`kod.gs`) birebir aynası tutuluyor —
"iki kopya senkron kalmalı" notuyla.) İki gotcha bir arada: (1) `trUpper` küçük `i`/`ı`'yı
büyütmeden önce elle `İ`/`I`'ya çeviriyor, çünkü JS'in yerleşik `.toUpperCase()`'i Türkçe
locale bilmiyor — `"sahin".toUpperCase()` `"SAHIN"` verir, `"ŞAHİN"` değil. (2) `titleWord`
tam tersi yönde aynı sorunu çözüyor: `"İ".toLowerCase()` birleşik noktalı bir karakter
(`i` + U+0307) üretiyor, bu yüzden tüm-büyük bir hücre (`"İNCİ ŞAHİN"`) küçültülüp yeniden
büyütülünce isimde ikinci bir nokta beliriyor — `.replace(/̇/g,'')` bu artık noktayı temizliyor.
Bu, herhangi bir Türkçe ad/soyad görüntüleme kuralı yazan projede aynen tekrar edebilecek,
ince ama tekrar eden bir hata kaynağı.

## Gerçek Bir Örnek: AI Club Portal (KAYNAK PROVENANCE FARKLI)

**Uyarı:** `AI Club Portal` (`eng-furkany/AI_Club_Portal`) bu reponun kaynağı **değil** —
`ValeoDashboard`/`Bursa-CV-Projects` gibi buradan standart çekilen değil, standartları
**tüketen** bir proje (bkz. `baslarken.md`). Yani aşağıdaki desen "kanonik kaynaktan
kopyalandı" değil, "bağımsız biri sıfırdan gerçek bir TR/EN sistemi kurmuş, gözlemlendi ve
buraya not düşüldü" statüsünde — istenirse örnek/başlangıç noktası olarak kullanılabilir,
ama ValeoDashboard/Bursa CV paletleri gibi "resmi" bir statüsü yok.

Görülen mekanizma (2026-08-21 itibarıyla):

```js
// ====== TRANSLATIONS ======
var T = {
  en: { portalTitle: 'Valeo AI Club Portal', /* ~200 anahtar */ },
  tr: { portalTitle: 'Valeo Yapay Zeka Kulübü Portalı', /* ~200 anahtar, aynı anahtarlar */ }
};

function t(key) {
  return (T[STATE.language] && T[STATE.language][key]) || key;
}

function setLanguage(lang) {
  STATE.language = lang;
  savePrefs();   // debounce'lu, google.script.run ile sunucuya — localStorage DEĞİL
  render();
}
```

Değerlendirme — nesi sağlam, nesi eksik:

- **Sağlam:** tek sözlük nesnesi (`T`), tek okuma fonksiyonu (`t()`), anahtar bulunamazsa
  anahtarın kendisine düşen güvenli varsayılan. Kalıcılık `koyu-mod.md`'deki `_savePref`
  deseniyle aynı ilkeyi izliyor — GAS'ta `localStorage` yasağına uyularak sunucuya yazılıyor.
- **Eksik #1 — `<html lang>` güncellenmiyor:** dil `setLanguage()` ile değişse de
  `document.documentElement.lang` hiçbir yerde set edilmiyor, `Index.html`'de sabit
  `<html lang="en">` kalıyor. Bu, aşağıdaki "Buradan Devam Edilirse" notunda zaten
  öngörülmüştü — gerçek bir örnekte de aynı boşluk çıktı, rastlantı değil: ekran okuyucu
  duyurusu dil değişse bile eski dile göre kalır (WCAG 3.1.1).
  ```js
  // setLanguage() içine eklenmesi gereken satır:
  document.documentElement.lang = lang;
  ```
- **Eksik #2 — kapsam tam değil:** `T`/`t()` yalnız sabit UI etiketlerini (menü, buton,
  başlık) kapsıyor; dinamik olarak üretilen bazı metinler (ör. Dashboard'daki "Toplam Yıllık
  Tasarruf" KPI etiketi) `t()`'den geçmeden doğrudan Türkçe string literal olarak yazılmış —
  dil `en` iken de Türkçe kalıyor. Yeni bir metin eklerken her zaman `t('anahtar')` üzerinden
  geçtiğinden emin ol, aksi halde bu tutarsızlık büyür.
- **Eksik #3 — locale format dil ile değişmiyor:** yukarıdaki "Ne VAR" bölümündeki
  `toLocaleString('tr-TR', ...)` deseni burada `toLocaleString()` argümansız çağrılıyor
  (tarayıcı varsayılanına düşüyor) — `STATE.language`'a göre `'tr-TR'`/`'en-US'` seçilmiyor.

**Sonuç:** gerçek çok dilli destek isteyen yeni bir proje için `T`/`t()` + sözlük deseni iyi
bir başlangıç noktası, ama yukarıdaki 3 eksik olmadan kopyalanmamalı — özellikle `<html lang>`
satırı tek satırlık, atlanmaması gereken bir düzeltme.

## Buradan Devam Edilirse: Gerçek TR/EN Desteği İçin Notlar

Bu bir standart **değil**, ama iki kaynağın mimarisine bakarak gerçek çok dilli destek
eklenecekse dikkat edilmesi gereken noktalar:

- Bursa CV Projects'te zaten **ayrı bir "gösterim katmanı çevirisi" deseni var** —
  `StatusLex` (durum kodu → görüntülenen etiket, bkz. kaynak `CLAUDE.md`). Aynı mekanizma
  (ham değere dokunma, yalnız görüntülenen metni sözlükten çevir) dil değişimi için de
  model alınabilir: ham veri/anahtar hep Türkçe kalır, yalnız ekrana yazılan metin
  `Lex[lang][key]` gibi bir sözlükten okunur.
  Ancak bu **yeni bir tasarım kararı** — kaynakta örneği yok, `StatusLex` yalnız durum
  kodları için var, sayfa geneli için genellenmemiş.
- `<html lang="tr">` dil değişince güncellenmeli (erişilebilirlik: ekran okuyucular buna
  bakar).
- Sayı/tarih formatlaması (`toLocaleString('tr-TR', ...)`) dil değişince `'en-US'` gibi
  başka bir locale'e geçmeli — şu an sabit yazılmış, parametrik değil.
