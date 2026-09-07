# Google Workspace Add-on Sidebar (Farklı Kavram — Karıştırma)

**KAYNAK PROVENANCE UYARISI:** Bu doküman ne ValeoDashboard'dan ne Bursa CV Projects'ten
gelmiyor — ikisi de **bağımsız web uygulamaları**, Google Docs/Sheets'in kendi arayüzüne
gömülen bir Apps Script add-on değiller. İçerik M3 referans materyalinden (Gemini Notebook,
karar-girdisi PDF'ler) 2026-08-18'de, kapsam genişletme kararıyla eklendi. Bu depoda bir
proje gerçekten bir Workspace add-on (container-bound script, `HtmlService.createHtmlOutput`
ile Docs/Sheets/Slides menüsünden açılan sidebar) inşa ediyorsa buraya bak; bağımsız bir web
app kuruyorsan bu dosyayı **atla**, `sidebar.md`'yi kullan.

## `sidebar.md` ile Karıştırılmamalı

`sidebar.md`'deki sidebar, bir web uygulamasının KENDİ sayfası içindeki kalıcı navigasyon
şeridi (favoriler, komut paleti, flyout menü). Buradaki "Custom Sidebar" ise **Google
Docs/Sheets'in kendi penceresinin** sağında açılan, o belgeyle etkileşen bir Apps Script
paneli — tamamen farklı bir konak (host) ve farklı bir kullanım amacı. İkisi aynı projede
bir arada bulunmaz (bir add-on kendi başına bir "sayfa" gezinmesi yapmaz, tek panel).

## Non-blocking UI İlkesi

Dialog'un aksine, sidebar açıkken kullanıcı arka plandaki belge/sayfa ile eşzamanlı
çalışabilir — belge içinden seçilen bir metni/aralığı anında işleyen asistan araçlar,
çeviri eklentileri, veri-ekleme makroları için bu özellik esastır. Sidebar bir modal gibi
kullanıcıyı kilitlememeli.

## Sabit Header/Footer + Scroll İçerik

```css
.addon-sidebar { display: flex; flex-direction: column; height: 100vh; }
.addon-sidebar-header { flex: none; padding: 12px 16px; border-bottom: 1px solid var(--border); }
.addon-sidebar-body   { flex: 1; overflow-y: auto; padding: 12px 16px; }
.addon-sidebar-footer { flex: none; padding: 12px 16px; border-top: 1px solid var(--border); }
```

Üst bilgi (header) ve aksiyon butonları (footer) ekranda sabit kalır, yalnız ortadaki içerik
scroll edilir — "Uygula"/"Ekle" gibi ana aksiyon her zaman erişilebilir konumda olmalı.
Bölümler arası ayırıcı `1px solid var(--border)` (mevcut token, yeni renk icat edilmedi).
Bu düzen, `veri-listeleme.md`'deki "yapışkan toplam satırı" (sticky total row) ile aynı genel
ilkeyi (kritik bilgi/aksiyon scroll'dan bağımsız sabit kalır) farklı bir yüzeyde uyguluyor.

## Google Picker Senkronizasyonu

Google Picker (dosya seçici) bir iframe içinde pop-up olarak açılır. Sidebar, Picker açıkken
kendini beklemede/spinner durumuna almalı ve kullanıcının başka bir eylem yapmasını
engellemeli — Picker kapanana kadar sidebar durumu tutarsızlaşabilir:

```js
var thePickerIsOpen = false;

function openPicker() {
  thePickerIsOpen = true;
  setSidebarBusy(true);   // spinner göster, aksiyon butonlarını disabled yap
  // ... google.picker.PickerBuilder() çağrısı ...
}

function onPickerCallback(data) {
  thePickerIsOpen = false;
  setSidebarBusy(false);
  if (data.action === google.picker.Action.PICKED) {
    // seçilen dosya verisini sidebar'a uygula
  }
}
```

`setSidebarBusy` mekanizması `jenerik-desenler.md`'deki "State Katmanları — Hover/Disabled"
bölümündeki disabled desenini (konteyner %12, metin/ikon %38 opaklık) yeniden kullanır —
ikinci bir devre dışı bırakma stili icat edilmedi.

## App Shell / HtmlService `<iframe>` Sınırı

Apps Script'in `HtmlService`'i sidebar/dialog içeriğini bir `<iframe>` içinde render eder —
bu, `%100` genişlik/yükseklik varsayımı yapan CSS'in beklenmedik şekilde kırpılmasına yol
açabilir. **Somut bir breakpoint değeri bu depoda henüz yok** — kaynak M3 materyali yalnız
"RESPONSIVE BREAKPOINTS" başlığı taşıyordu, sayı vermiyordu; bu yüzden burada yalnız bir
YAKLAŞIM belgeleniyor, kesin bir sayı değil:

- İçerik kapsayıcısı `<body>`/kök element üzerinde `width:100%; box-sizing:border-box`
  kullanılmalı, sabit piksel genişlik yazılmamalı.
- `iframe` sınırının kırptığı `overflow` durumlarını erken fark etmek için gerçek bir Apps
  Script sidebar'ında (yalnız tarayıcı önizlemesinde değil) test edilmeli.

Bu bölüm, ileride daha somut bir kaynaktan (gerçek breakpoint ölçümleri, çalışan bir add-on
projesi) beslenene kadar bir **yer tutucu/yaklaşım notu** olarak kalıyor — CLAUDE.md'nin
"canlı kod içermez" ilkesiyle tutarlı, kopyala-yapıştır referansı henüz üretilmedi.
