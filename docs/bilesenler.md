# Ortak Bileşenler (Modal, Bildirim, Bildirim Merkezi, Yükleniyor, Filtre Barı)

`jenerik-desenler.md`'de kart/buton/durum-rozeti vardı; burada eksik kalan yaygın bileşenler
var. Kod parçaları kaynaktan **birebir** alınmıştır.

## Modal / Dialog

**Kaynak durumu farklı:** Bursa CV Projects'te **tek ortak modal bileşeni yok** — her sayfa
kendi overlay'ini yazıyor (`.kit-popup-overlay`/`.kit-popup`, `.sli-mail-overlay`/
`.sli-mail-box` gibi, page-specific). ValeoDashboard'da ise tek, jenerik, temiz bir modal var
(Feedback formu için) — yeni bir projede **buradan başla**:

```css
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(4,27,60,0.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.modal-card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  width: 420px;
  border: 0.5px solid var(--neutral-100);
  box-shadow: 0 8px 32px rgba(4,27,60,0.18);
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--neutral-100);
}
.modal-title { font-size: 14px; font-weight: 600; color: var(--neutral-900); }
.modal-close { background: none; border: none; font-size: 14px; color: var(--neutral-600); cursor: pointer; }
.modal-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
.modal-info { font-size: 12px; color: var(--neutral-600); margin: 0; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--neutral-100);
}
```
(Kaynak: ValeoDashboard `Index.html`. Değişkenler zaten resmi palet `tokens/colors.css` ile
uyumlu — bkz. `renkler.md`.)

**Erişilebilirlik kancası (Bursa CV Projects'ten, taşınabilir kural):** `a11yEnhance()`
sayfa DOM'unu tarar ve **id veya class'ında "modal" geçen her öğeye** otomatik
`role="dialog"` + `aria-modal="true"` ekler:

```js
var modals = root.querySelectorAll('[id*="modal"], [class*="modal"]');
for (var m = 0; m < modals.length; m++) {
  var md = modals[m];
  if (md.getAttribute('role')) continue;
  if (!/(^|[-_ ])modal/i.test(md.id + ' ' + md.className)) continue;
  md.setAttribute('role', 'dialog');
  md.setAttribute('aria-modal', 'true');
}
```

**Sonuç kural:** yeni bir overlay/dialog yazarken id veya class adına **"modal" kelimesini
koy** (`.modal-overlay`, `#feedback-modal` gibi) — bu otomatik ARIA kancasını tetikler. Bursa
CV Projects'teki `.kit-popup`/`.sli-mail-box` gibi adlar bu kancayı **kaçırıyor** (isimlerinde
"modal" yok); bu kaynaktaki bir tutarsızlık, yeni projede tekrarlama.

**Açıkken yeniden çizim — kökü yeniden kurma (2026-08-29, TaskTracker notu, KAYNAK PROVENANCE
FARKLI):** kaynağı `nphlvn/TaskTracker`, üçüncü bir referans (bkz. `renkler.md`). Bir modal
açıkken içeriği değişiyorsa (ör. kullanıcı formda bir seçim yapınca alt alanlar güncelleniyor),
`.modal-overlay`/`.modal-card` DOM köküncü **yeniden kurma** — yalnız içindeki içerik düğümünü
değiştir. Kök her seferinde yeniden oluşturulursa giriş animasyonu (bkz. altta) her küçük
değişiklikte tekrar oynar ve pencere "yanıp sönüyor" gibi görünür.

**Scrim opaklığı (2026-08-18 kararı):** `.modal-overlay` arka plan opaklığı `0.5`'ten `0.4`'e
düşürüldü. Kaynak: M3 tasarım referans materyaliyle (Gemini Notebook, "M3 UI Architecture")
karşılaştırma — o kaynak `%32` öneriyordu, mevcut ValeoDashboard değeri `%50`'ydi; ikisi
arasında bir orta nokta olarak `%40` seçildi. Köşe yarıçapı/tonal-elevation gibi diğer M3
önerileri bilinçli olarak **reddedildi** (bkz. altta "Dialog Alt-Türleri" notu) — yalnız bu
tek sayısal değer güncellendi.

### Dialog Alt-Türleri (2026-08-18 kararı)

M3 referans materyaliyle karşılaştırıldığında **görsel** öneriler (28px köşe yarıçapı, tonal
elevation) reddedildi — `.modal-card` yukarıdaki haliyle (`border-radius: var(--radius-lg)`,
klasik `box-shadow`) aynen kalıyor. Kabul edilen kısım yalnız **davranışsal taksonomi**: aynı
`.modal-card` temeli üzerine, kullanım senaryosuna göre 4 alt-desen:

- **Alert** — hata/kritik uyarı. İkon + başlık + açıklama metni + tek onay (veya Dismiss/
  Confirm) butonu. Metin kuralı: "Hata oluştu, üzgünüz" gibi özür yerine durumu doğrudan ve
  eyleme dönük anlat.
- **Simple** — buton içermez. Liste elemanına tıklamak seçimi anında uygular ve modal kendini
  kapatır (ör. hesap/dil seçimi gibi düşük-sürtünmeli seçim ekranları). Bilişsel yükü azaltmak
  için her liste satırının solunda seçimi görselleştiren bir ikon/avatar bulunur.
- **Confirmation** — geri dönüşü zor/veri kaybına yol açabilecek aksiyonlar için. Zorunlu
  **OK (birincil) + Cancel (ikincil)** çift buton; liste öğesine tıklamak modalı kapatmaz.
  Zorunlu bir seçim/onay kutusu varsa OK butonu başlangıçta **disabled** (bkz.
  `jenerik-desenler.md` → "State Katmanları — Hover / Disabled"), ilgili seçim yapılınca aktifleşir — böylece
  yanlışlıkla boş onay verme ihtimali ortadan kalkar.
- **Full-screen** (dar ekran/mobil) — Kapat (X) **sol üstte**, Kaydet **sağ üstte**. Formda
  değişiklik yapılmadıysa X doğrudan kapatır; değişiklik varsa "Değişiklikler silinsin mi?"
  uyarısı tetiklenir. Kaydet butonu form validasyonu tamamlanana kadar disabled kalır.

**Buton yerleşim kuralı (genel, tüm modal/dialog türleri için):** onaylayıcı/birincil aksiyon
(OK, Kaydet, Onayla) **her zaman sağda** (masaüstü) veya **üstte** (dar mobil, dikey yığılmış
düzen); iptal edici/ikincil aksiyon (İptal, Vazgeç) **her zaman solda**/**altta**. `.modal-footer`
zaten `justify-content:flex-end` ile butonları sağa yaslıyor — bu kural DOM sırasını netleştiriyor:
iptal/ikincil buton işaretlemede **önce**, onay/birincil buton **sonra** yazılır.

## Tooltip (2026-08-18 kararı, M3 referansı)

Hiçbir kaynak projede (ValeoDashboard, Bursa CV Projects) tooltip standardı yoktu —
tamamen yeni bir alan, çelişki riski taşımıyor. M3 referans materyali bunu **en düşük
kesinti seviyesi** olarak tanımlıyor (bkz. altta Toast = orta, Modal/Dialog = yüksek
kesinti):

```css
.tooltip {
  position: absolute; z-index: 500;
  background: var(--neutral-900); color: var(--surface);
  border-radius: 4px; padding: 4px 8px;
  font-size: 11px; white-space: nowrap;
  pointer-events: none;
}
```

Yatay padding PDF'in önerdiği tekdüze 4px'ten 8px'e çıkarıldı — metnin kenara yapışmaması
için pratik bir okunabilirlik düzeltmesi, kaynağın "ters yüzey rengi" (koyu zemin/açık
metin) ilkesi aynen korundu. Yalnız `title` özniteliğinin yetersiz kaldığı yerlerde
(ikon-only butonlar, kısaltılmış tablo hücreleri) kullan — her elemente varsayılan olarak
eklenmez.

## Bildirim / Toast — İKİ Farklı Amaç, İKİ Bileşen (Bursa CV Projects)

**1. Hızlı geri bildirim (`showToast`)** — kısa ömürlü, kendiliğinden kapanan pill:

```css
.toast {
  position: fixed; bottom: 24px; right: 24px;
  padding: 12px 20px; border-radius: 8px;
  font-size: 13px; font-weight: 500; color: #fff; z-index: 9999;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  animation: toast-in 0.5s ease; max-width: 340px; word-break: break-word;
}
.toast-info    { background: var(--valeo-blue); }
.toast-success { background: var(--valeo-green); }
.toast-error   { background: var(--status-error); }
.toast-warning { background: #D97706; }
```

**Giriş animasyonu süresi (2026-08-18 kararı, M3 referansı):** `0.2s`'den `0.5s`'e
güncellendi — M3 referans materyali toast'ı "Medium" kesinti seviyesinde (tooltip'ten
belirgin, dialogdan hafif) tanımlıyor; daha yavaş bir giriş bunu görsel olarak hissettiriyor.
```js
function showToast(msg, type) {
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + (type || 'info');
  // role=status: ekran okuyucu SESLİ okur; error'da alert/assertive (işi keser),
  // diğerlerinde status/polite (kibar duyuru, işi kesmez).
  toast.setAttribute('role', (type === 'error') ? 'alert' : 'status');
  toast.setAttribute('aria-live', (type === 'error') ? 'assertive' : 'polite');
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() {
    toast.style.opacity = '0';
    setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
  }, 2700);
}
```

**2. Eyleme çağıran bildirim (`appNotifyToast`)** — ikon + başlık + açıklama + "Aç" butonu
olan, elle kapatılan kart. "Gecikmiş görev" veya "yeni değişiklik" gibi kullanıcının
tıklayıp bir sayfaya gitmesini istediğin durumlarda kullan — basit `showToast` bunun için
yetersiz kalır:

```js
function appNotifyToast(o) {   // o: { icon, title, desc, page, btn, accent }
  var wrap = document.getElementById('app-toast-wrap') || (function() {
    var w = document.createElement('div'); w.id = 'app-toast-wrap'; document.body.appendChild(w); return w;
  })();
  var t = document.createElement('div');
  t.className = 'app-toast';
  t.setAttribute('role', 'status');
  if (o.accent) { t.style.borderLeftColor = o.accent; t.style.borderColor = o.accent; }
  // ikon + başlık + açıklama + kapat (×) + varsa "o.page"e giden eylem butonu
  wrap.appendChild(t);
}
```
```css
#app-toast-wrap { position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; }
.app-toast {
  background: #1e293b; border: 1px solid rgba(239,68,68,0.5); border-left: 4px solid #EF4444;
  border-radius: 12px; padding: 14px 18px; color: var(--dt-hdr-fg); max-width: 320px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}
```

Kaynak yorumu net: **"Köşe bildirimi — TEK bileşen. Kopyalama YASAK"** — My Task ve Yardım
sayfaları aynı `appNotifyToast()`'u çağırıyor, ikisi ayrı ayrı HTML üretmiyor.

## Undo Toast — Onay Penceresine Alternatif (2026-08-29, TaskTracker — KAYNAK PROVENANCE FARKLI)

**Uyarı:** kaynağı `nphlvn/TaskTracker`, üçüncü bir referans (bkz. `renkler.md`). Yukarıdaki
Modal/Dialog bölümündeki **Confirmation** alt-türü (OK/Cancel çift buton) yıkıcı işlemler için
şu ana kadar tek kanonik desendi. TaskTracker bilinçli olarak **tersini** seçiyor: yıkıcı bir
işlemden önce sormak yerine, işlemi hemen uygulayıp 5 saniyelik bir geri-alma penceresi sunuyor:

```js
var UNDO_MS=5000, _undoToast=null;
function toastUndo(msg, undoFn){
  // Aynı anda tek bir "Undo": ard arda iki iş değiştirildiğinde ekranda iki geri
  // alma düğmesi durursa hangisinin neyi geri alacağı belirsizleşir ve yanlışına
  // basılır. Yenisi gelince eskisi kapanır — "Undo" hep SON işlemi geri alır.
  if(_undoToast) _toastFade(_undoToast);
  var t=_toastNode(msg,'success');
  _undoToast=t;
  var b=el('button',{class:'toast-undo'});
  b.innerHTML='<span class="material-symbols-rounded" style="font-size:15px">undo</span>Undo';
  b.onclick=function(){ if(t._used) return; t._used=1; if(_undoToast===t) _undoToast=null; _toastFade(t); try{ undoFn(); }catch(e){ toast('Could not undo','error'); } };
  t.appendChild(b);
  setTimeout(function(){ if(_undoToast===t) _undoToast=null; _toastFade(t); }, UNDO_MS);
}
```

(Kaynak: TaskTracker `Index.html`.) Gerekçe: "Emin misiniz?" sorusu **herkesi** her seferinde
yavaşlatır (dikkatli kullanıcı da onaylamak zorunda kalır); Undo yalnızca **yanlış tıklayanı**
ilgilendirir. İki desenden hangisi seçilmeli: geri dönüşü **teknik olarak imkânsız veya çok
pahalı** işlemlerde (ör. kalıcı dosya silme, geri alınamaz bir dış API çağrısı) Confirmation
kalmalı; geri alması **ucuz** işlemlerde (bir satırı silme, durumu değiştirme — sunucu tarafı
zaten tersini yazabiliyorsa) Undo tercih edilebilir. Kural: **aynı anda yalnızca bir Undo**
bulunur — iki geri alma düğmesi ekranda dururken hangisinin neyi geri alacağı belirsizleşir,
bu yüzden yenisi gelince eskisi (henüz kullanılmamış olsa bile) kapanır.

## Kayıt Göstergesi (Savebar) — Optimistic UI'ın Karşılığı (2026-08-29, TaskTracker — KAYNAK PROVENANCE FARKLI)

**Uyarı:** kaynağı `nphlvn/TaskTracker`, üçüncü bir referans (bkz. `renkler.md`). Optimistic
UI (ekranı önce güncelle, sunucuya sonra yaz) hiçbir Standartlar dokümanında somut bir görsel
karşılığa bağlanmamıştı. TaskTracker'da bu karşılık, ekranın altında ortalanmış **tek bir hap**:

```css
#savebar{position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(12px);
  z-index:120;display:flex;align-items:center;gap:8px;background:var(--surface);
  border:1px solid var(--border);box-shadow:0 10px 30px rgba(4,27,60,.16);
  border-radius:999px;padding:8px 16px;font-size:13px;font-weight:600;color:var(--text);
  opacity:0;pointer-events:none;transition:opacity .22s ease,transform .22s ease}
#savebar.show{opacity:1;transform:translateX(-50%) translateY(0)}
```

```js
/* A single, subtle "Saving… → Saved / Not saved" pill that appears for every
   backend write (see SAVE_METHODS + gs()), so any change — right-panel edits,
   drag & drop, comments, deletes — visibly confirms it was saved. Reads never
   trigger it. Handles overlapping saves with an in-flight counter. */
var _saveN=0, _saveErr=false, _saveHideT=null;
function saveStart(){ if(_saveN===0) _saveErr=false; _saveN++; clearTimeout(_saveHideT); _paintSave('saving'); }
function saveEnd(ok){ if(!ok) _saveErr=true; _saveN=Math.max(0,_saveN-1); if(_saveN>0) return;
  _paintSave(_saveErr?'error':'saved');
  _saveHideT=setTimeout(function(){ _saveBar().classList.remove('show'); }, _saveErr?2800:1500); }
```

(Kaynak: TaskTracker `Index.html`.) Üç durum: **Saving…** (dönen ikon) → **Saved** (yeşil
tik) → hata varsa **"Not saved — try again"** (kırmızı). Kurallar:
- **Yalnız yazma işlemlerinde görünür**, okuma/listeleme çağrılarında hiç tetiklenmez —
  kullanıcı her sayfa geçişinde değil, yalnız bir şeyi değiştirdiğinde bir onay görür.
  `veri-listeleme.md`'deki `google.script.run` sonuç-denetim kuralı burada da geçerli: bu
  gösterge yalnız "sunucuya gitti" demiyor, `saveEnd(ok)`'un `ok` argümanı **gerçek sonuca**
  bakıyor, iyimser bir varsayım değil.
- **Eşzamanlı yazmalar bir sayaçla (`_saveN`) tek göstergede toplanır** — beş alan art arda
  hızlıca değiştirilirse beş ayrı hap değil, tek bir "Saving…" görünür, hepsi bitince tek
  "Saved" ile kapanır.
- Bu, `bildirim merkezi`/toast'tan **farklı bir bileşen**: toast bir olayı duyurur (kalıcı
  liste), savebar yalnız "az önce yaptığın değişiklik gerçekten kaydedildi mi" sorusuna cevap
  verir ve her zaman aynı yerde (ekran altı, ortalanmış) çıkar — konumu değişmez, yeni bir
  bildirim yığılmaz.

## Segment Kontrolü (2026-08-29, TaskTracker — KAYNAK PROVENANCE FARKLI)

**Uyarı:** kaynağı `nphlvn/TaskTracker`, üçüncü bir referans (bkz. `renkler.md`). `FilterDrop`
çoklu-seçim için, chip'ler etiketleme için var — ama **birbirini dışlayan, küçük sayıda**
seçenek arasında geçiş yapan bir "segmented control" hiçbir Standartlar dokümanında yoktu
(görünüm seçimi: Kanban/List/Timeline; kapsam seçimi: Mine/Team gibi).

```js
function segBtn(active){
  return active
    ? 'px-3 py-1.5 rounded-md fs-sm font-semibold bg-[var(--surface)] text-[var(--seg-active)] shadow-sm flex items-center gap-1.5 whitespace-nowrap'
    : 'px-3 py-1.5 rounded-md fs-sm font-medium text-[var(--muted)] hover:text-[var(--heading)] flex items-center gap-1.5 whitespace-nowrap cursor-pointer';
}
```

```html
<!-- Kapsayıcı: gömülü bir kutu (bkz. --sunken token, koyu-mod.md) -->
<div class="inline-flex items-center gap-1 p-1 rounded-lg bg-[var(--sunken)] border border-[var(--border)]">
  <!-- her düğme segBtn(active) sınıfını taşır -->
</div>
```

(Kaynak: TaskTracker `Index.html`.) Görsel ilke: kapsayıcı gömülü bir kutu (`--sunken` zemin),
aktif öğe **yükselir** — `bg-[var(--surface)]` + `shadow-sm` + vurgu renginde metin
(`--seg-active`, temaya göre değişen bir token — açık temada lacivert, koyu temada lime).
Seçili olmayanlar şeffaf, nötr renkte. Native `<select>` veya radio-button grubu yerine bu
desen tercih edilmeli: seçenek sayısı 2-4 arasında ve hepsi **her zaman görünür** olmalıysa
(kullanıcı bir açılır menüye tıklamadan tüm seçenekleri görmeli).

## Boş Ekran Şablonu (2026-08-29, TaskTracker — KAYNAK PROVENANCE FARKLI)

**Uyarı:** kaynağı `nphlvn/TaskTracker`, üçüncü bir referans (bkz. `renkler.md`). Hiçbir
Standartlar dokümanında bir "empty state" şablonu yoktu.

```js
/* Boş bir liste tek başına çıkmaz sokak: ne olduğunu söyler ve buradan çıkışın
   ne olduğunu bir düğmeyle gösterir. Tek şablon, çünkü boş ekranlar birbirinden
   ayrı yazıldığında her biri farklı bir dille konuşmaya başlıyor. */
function emptyState(icon, title, sub, btnsHtml){
  return '<div class="py-14 px-6 text-center">'
    +'<span class="material-symbols-rounded" style="font-size:34px;color:var(--faint)">'+icon+'</span>'
    +'<h3 class="font-display fs-base font-bold text-[var(--heading)] mt-2">'+esc(title)+'</h3>'
    +(sub?'<p class="fs-sm text-[var(--muted)] mt-1">'+esc(sub)+'</p>':'')
    +(btnsHtml?'<div class="flex items-center justify-center gap-2 mt-4 flex-wrap">'+btnsHtml+'</div>':'')
    +'</div>';
}
```

(Kaynak: TaskTracker `Index.html`.) Sabit yapı: ikon (34px, soluk renk) · başlık · alt açıklama
· çıkış düğmeleri. **Açıklama metni boşluğun sebebine göre değişir** — bir süzgeç yüzünden mi
boş görünüyor, yoksa gerçekten hiç veri mi yok; bu iki durum aynı ikonu/başlığı paylaşsa bile
farklı bir alt metin ve farklı bir çıkış düğmesi ("Süzgeci temizle" vs "Yeni ekle") alır.
Çıkış düğmesinin adı, ekranın üstündeki araç çubuğunda aynı işi yapan düğmeyle **aynı**
olmalı (ör. ikisi de "Reset" diyorsa aynı görünümü/kapsamı sıfırlar) — farklı bir isim
("Reset filters" gibi) gerçekte yaptığından azını vaat etmiş olur.

## Bildirim Merkezi (@mention) — Toast'tan Farklı, Kalıcı Bir Panel

Toast (yukarıda) geçici ve kendiliğinden kapanır; bildirim merkezi ise **kalıcı bir listedir**
— birinin bir yorumda `@isim` ile seni etiketlemesi gibi, sonradan da bakılabilecek olaylar
için. Header'da rozet-üstünde-sayaç düğmesi, tıklanınca açılan dropdown panel:

```css
#notif-btn { position: relative; }
.notif-badge {
  position: absolute; top: -3px; right: -3px; min-width: 16px; height: 16px;
  padding: 0 4px; border-radius: 999px; font-size: 9px; font-weight: 800;
  line-height: 16px; text-align: center;
  background: var(--st-err-bg); color: var(--st-err-fg);
  border: 1px solid var(--status-error);
}
#notif-panel {
  display: none; position: fixed; top: calc(var(--header-height) + 6px); right: 12px;
  width: min(380px, calc(100vw - 24px)); max-height: 70vh; overflow-y: auto;
  z-index: 9995; background: var(--card-bg); color: var(--text);
  border: 1px solid var(--border); border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.25);
}
.notif-hd { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--card-bg); }
.notif-item { padding: 9px 14px; border-bottom: 1px solid var(--border); cursor: pointer; }
.notif-item:hover { background: rgba(0,87,168,0.06); }
.notif-item.unread { border-left: 3px solid var(--valeo-blue); }
.notif-meta { font-size: 11px; color: var(--valeo-gray-mid); display: flex; gap: 6px; flex-wrap: wrap; }
.notif-key { font-weight: 700; color: var(--valeo-blue-text); }
.notif-when { margin-left: auto; }
.notif-text { font-size: 12.5px; margin-top: 3px; word-break: break-word; }
@media print { #notif-panel, .notif-badge { display: none !important; } }
```

Davranış sözleşmesi:
- **Açılış = okundu, ama sırayla:** panel önce mevcut listeyle çizilir (`render()`), rozet
  hemen **sonra** sıfırlanır — kullanıcı listeyi görmeden rozet kaybolmasın diye sıra önemli.
  ```js
  function open() {
    /* ... */
    load(function() {
      render();
      if (_unread) {
        google.script.run
          .withSuccessHandler(function(res) { if (!res || res.error || !res.ok) return; _unread = 0; badge(); })
          .withFailureHandler(function() {})
          .markNotificationsRead();
      }
    });
  }
  ```
- **Okundu-işaretleme sonucu da denetlenir** — sunucu kilit alamazsa/yazma patlarsa HTTP
  hatası vermeden `{error}` döner; denetlenmezse rozet sıfırlanır ama satırlar sunucuda
  okunmamış kalır, kullanıcı bildirimi bir daha görmez (bkz. `veri-listeleme.md`'deki
  `google.script.run` sonuç-denetim kuralı — aynı ilke burada tekrar ediyor).
- **Satır tıklaması ilgili sayfaya derin bağlantıyla götürür** (`navigateTo(page, {vsRef})`) —
  bildirim salt bilgi değil, aksiyona geçiş noktası.
- Yazdırmada rozet ve panel gizlenir (`@media print`) — bkz. `yazdirma.md`.

## Yükleniyor Göstergesi

```css
.loading-overlay {
  display: flex; align-items: center; justify-content: center;
  padding: 40px; color: var(--valeo-gray-mid); gap: 8px;
}
.spinner {
  width: 20px; height: 20px;
  border: 2px solid var(--border); border-top-color: var(--valeo-blue);
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```
`prefers-reduced-motion: reduce` global kuralı (bkz. `jenerik-desenler.md`) bu animasyonu da
otomatik durdurur — ayrıca bir istisna yazmaya gerek yok.

**Tam-sayfa/büyük-alan yüklemeleri için ikinci desen (2026-08-18 kararı, M3 referansı):**
20×20px dairesel spinner **küçük/inline alanlar için tek standart kalıyor** — değiştirilmedi.
Belirsiz süreli, büyük-alan işlemler (sayfa ilk yüklemesi, büyük bir tablo/rapor hazırlanması)
için ayrıca yatay, dalgalı (wavy) bir ilerleme çubuğu eklendi:

```css
.progress-linear {
  width: 100%; height: 4px; border-radius: 2px;
  background: var(--border); overflow: hidden; position: relative;
}
.progress-linear::before {
  content: ''; position: absolute; inset: 0;
  background: var(--valeo-blue);
  animation: progress-wavy 1.4s ease-in-out infinite;
}
@keyframes progress-wavy {
  0%   { transform: translateX(-100%) scaleX(0.4); }
  50%  { transform: translateX(0%)    scaleX(0.6); }
  100% { transform: translateX(100%)  scaleX(0.4); }
}
```

Ne zaman hangisi: sayfa/tablo başlığının yanında küçük bir bekleme göstergesi gerekiyorsa
`.spinner`; sayfanın/panelin üst kenarında tam-genişlik bir "hâlâ çalışıyor" ipucu gerekiyorsa
`.progress-linear`. Aynı anda ikisi birden gösterilmez — biri diğerinin yerini tutar,
tekrarlı bilgi vermez. `prefers-reduced-motion: reduce` bu animasyonu da durdurur.

## Filtre Barı — `<select>` Değil, `FilterDrop`

Bursa CV Projects'te filtre barlarında **native `<select>` kullanılmaz** (GAS'ın kısıtı
değil, bilinçli bir UI kararı — çoklu seçim ve arama gerekiyor). Yerine spreadsheet tarzı
çoklu-seçim açılır listesi `FilterDrop` kullanılır:

```css
.fdr-wrap { position: relative; display: inline-block; }
.fdr-btn {
  display: flex; align-items: center; gap: 6px; cursor: pointer;
  padding: 5px 10px; min-height: 32px;
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px;
  font-size: 12px; font-weight: 500; color: var(--text);
}
.fdr-btn.fdr-active { border-color: var(--valeo-blue); background: rgba(0,87,168,0.07); color: var(--valeo-blue-text); }
.fdr-drop {
  display: none; position: absolute; top: calc(100% + 4px); left: 0; z-index: 450;
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px;
  min-width: 180px; max-width: 260px; box-shadow: 0 8px 28px rgba(0,0,0,0.18);
}
.fdr-drop.fdr-open { display: block; }
.fdr-search { width: 100%; box-sizing: border-box; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 4px 8px; font-size: 11px; }
.fdr-list { max-height: 200px; overflow-y: auto; }
.fdr-item { display: flex; align-items: center; gap: 7px; padding: 5px 10px; font-size: 12px; cursor: pointer; }
.fdr-item input { margin: 0; cursor: pointer; }
```

Sözleşme (davranış, `JavaScript.html`'deki tam uygulamaya bkz.):
- Buton (`.fdr-btn`) tıklanınca arama kutulu bir çoklu-seçim listesi (`.fdr-drop`) açılır.
- Liste başında `fltAllRow()`'un ürettiği bir **"Tümü"** satırı olur — hiçbiri veya hepsi
  seçiliyse filtre uygulanmamış sayılır.
- Değer okurken `input[value]` kullanılır, `input[type=checkbox]` değil (Tümü kutusu da
  `checkbox` tipinde, karışır).
- Metne `onclick` **yazılmaz** — `<label>` zaten kutucuğu çevirir; ikisi üst üste binerse
  tıklama etkisiz kalır.

Filtre barının kendisi (kapsayıcı, etiket) için düz konteyner sınıfları:

```css
.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 12px 16px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; }
.filter-group { display: flex; flex-direction: column; gap: 3px; }
.filter-label { font-size: 11px; color: var(--valeo-gray-mid); font-weight: 500; }
```
