# Karanlık Mod (Dark Mode) Standardı

**Varsayılan (2026-08-29 kararı):** bu desen artık her yeni projede varsayılan olarak kurulur
— kullanıcı özellikle istemediğini belirtmedikçe atlanmaz. Detay ve gerekçe: `baslarken.md`
madde 9, `CLAUDE.md` Kalıcı Kararlar.

## Kaynak Durumu

- **Bursa CV Projects:** tam dark-mode mekanizması var — hem CSS token katmanı
  (`tokens/colors-bursa-cv-projects.css` içindeki `body.dark-mode` bloğu) hem de bu dosyadaki
  JS açma/kapama/kalıcılık mantığı. Bu standardın kaynağı.
- **ValeoDashboard:** dark-mode **yok**, tek temalı. Bu projeye taşınacaksa aşağıdaki desen
  baştan uygulanmalı.

## Tek Uygulama Noktası: `applyDarkMode(on)`

Açılışta da kullanıcı butona bastığında da **aynı fonksiyon** çağrılır — tema iki farklı yerde
iki farklı şekilde uygulanmaz:

```js
var AppState = { darkMode: false, /* ... */ };

function applyDarkMode(on) {
  AppState.darkMode = !!on;
  document.body.classList.toggle('dark-mode', AppState.darkMode);
  var btn = document.getElementById('dark-mode-btn');
  if (!btn) return;
  var lbl = AppState.darkMode ? 'Açık' : 'Koyu';
  btn.innerHTML = (AppState.darkMode ? '☀️' : '🌙') + ' <span class="hdr-btn-lbl">' + lbl + '</span>';
  btn.title = lbl + ' tema';
  btn.setAttribute('aria-label', lbl + ' tema');
}

function toggleDarkMode() {
  applyDarkMode(!AppState.darkMode);
  _savePref('darkMode', String(AppState.darkMode));  // bundan sonra OS tercihi değil bu kayıt geçerli
}
```

CSS tarafında bu tek `body.dark-mode` sınıfı her rengi değiştirir — bileşen CSS'i sabit
kalır, yalnız `:root` içindeki custom property'ler `body.dark-mode` altında yeniden
tanımlanır (bkz. `tokens/colors-bursa-cv-projects.css`).

## Açılış Çözünürlüğü: Kayıtlı Tercih > OS Tercihi

```js
function osPrefersDark() {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  } catch (e) { return false; }
}

// Açılışta:
google.script.run.withSuccessHandler(function(prefs) {
  var saved = prefs ? prefs.darkMode : null;   // 'true' | 'false' | yok
  applyDarkMode(saved === 'true' || saved === 'false' ? saved === 'true' : osPrefersDark());
}).getUserPrefs();
```

Kayıtlı bir kullanıcı tercihi varsa (daha önce butona basılmışsa) o kazanır; hiç kayıt yoksa
işletim sisteminin `prefers-color-scheme` tercihine uyulur.

## Kalıcılık: `localStorage` DEĞİL, Sunucu Tercihi

Bu, GAS projeleri için genel bir kısıttan geliyor: `localStorage`/`sessionStorage` GAS'ın
sandbox'lı iframe'inde güvenilir değil, bu yüzden Bursa CV Projects hiçbir yerde kullanmıyor.
Tercih `google.script.run` ile sunucuya (`saveUserPref`) yazılır; başarısızlık sessizce
yutulmaz — kullanıcıya "bu oturumda geçerli, kalıcı değil" toast'ı gösterilir:

```js
function _savePref(key, value) {
  google.script.run
    .withSuccessHandler(function(ok) {
      if (ok === false) showToast('Tercih kaydedilemedi (' + key + ') — bu oturumda geçerli, kalıcı değil.', 'error');
    })
    .withFailureHandler(function(err) {
      showToast('Tercih kaydedilemedi (' + key + '): ' + err.message + ' — bu oturumda geçerli, kalıcı değil.', 'error');
    })
    .saveUserPref(key, value);
}
```

**Sunucusuz (saf statik) bir projeye taşırken:** `_savePref` çağrısını `localStorage.setItem`
ile değiştirmek yeterli — mekanizmanın geri kalanı (`applyDarkMode`, `osPrefersDark`,
açılış-çözünürlük sırası) aynı kalır. Yalnız GAS projelerinde `localStorage` kullanma.

## Kontrol Listesi (Yeni Bir Projeye Taşırken)

1. `tokens/colors-bursa-cv-projects.css`'teki `:root` + `body.dark-mode` renk çiftlerini
   projenin **kendi** marka renkleriyle yeniden türet (hex'leri olduğu gibi kopyalama —
   kontrastı yeniden doğrula, bkz. `renkler.md`).
2. `applyDarkMode` / `toggleDarkMode` / `osPrefersDark` fonksiyonlarını aynen taşı.
3. Header'a `id="dark-mode-btn"` bir buton ekle, `onclick="toggleDarkMode()"`.
4. Açılışta kayıtlı tercihi oku (GAS'ta sunucudan, statik projede `localStorage`'dan),
   yoksa `osPrefersDark()`'a düş.
