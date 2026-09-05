# Detay Popup'ı — Veriye Tıklayınca Hızlı Bakış

## Kaynak Durumu — main'e ALINDI (2026-08-23 doğrulaması)

Bu dosya eklendiğinde özellik yalnız `claude/code-review-test-5319gj` branch'indeydi ve
buraya "kaynağı doğrula" uyarısıyla girmişti. **2026-08-23'te doğrulandı: `InfoModal` artık
Bursa CV Projects'in `main` branch'inde** (`src/JavaScript.html`, 6 çağrı yeri) ve reponun
kendi `CLAUDE.md`'sinde güncel mimarinin parçası olarak belgeli. Uyarı bu yüzden kaldırıldı.

**Bir mekanik fark var, taşırken bilinmeli:** `InfoModal`'ın ADI ve API'si
(`open`/`setBody`/`close`/`isOpen`) korunmuş ama **sunumu Dialog'dan Side Sheet'e döndürülmüş**
(sağdan açılan tam yükseklikli panel, scrim + Escape ile kapanma). Gerekçe işlevsel:
ortadaki dialog tabloyu kapatıyordu, kullanıcı hangi satıra baktığını göremiyor ve iki ref'i
karşılaştırmak için paneli tekrar tekrar açıp kapatıyordu. Yeni bir bağlamsal panel
kurulurken Dialog yerine bu desen tercih edilmeli.

## Ne Değişti (Özet)

Eskiden Project List'te bir **VS ref**'e veya **PLM ref**'e tıklamak tam sayfa navigasyonu
yapıyordu (Proje Detayı / PLM List sayfasına gitmek gibi). Artık tıklama, ekranın ortasında
**~%70 genişlikte bir popup** açıyor — X ile veya popup dışına tıklayınca kapanıyor. Kullanıcı
"şuna bir bakayım" dediğinde tam sayfaya gitmesine gerek kalmıyor; tam sayfa gerekiyorsa
popup'ın içindeki "→ Aç" düğmesiyle geçilebiliyor.

## `InfoModal` — Tek Paylaşılan Popup Kabuğu

Üç farklı tıklama (VS ref, PLM ref, Potential GM) **üç ayrı modal DEĞİL**, aynı paylaşılan
`InfoModal` singleton'ını açıyor — sayfa gövdesine (`document.body`) **bir kez** eklenir,
sonraki her `open()` çağrısı yalnız içeriği değiştirir:

```js
var InfoModal = (function() {
  var _el = null, _bodyEl = null;
  function _ensure() {
    if (_el) return _el;
    var d = document.createElement('div');
    d.id = 'app-info-modal';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-modal', 'true');
    d.style.cssText = 'display:none;position:fixed;inset:0;z-index:10000;'
      + 'background:rgba(0,0,0,0.6);align-items:center;justify-content:center;padding:24px';
    d.innerHTML =
      '<div style="background:var(--card-bg);color:var(--text);border-radius:12px;'
      + 'width:min(70vw,1100px);max-width:92vw;max-height:86vh;overflow:auto;'
      + 'box-shadow:0 20px 60px rgba(0,0,0,0.45);position:relative">'
      +   '<button id="app-info-modal-close" aria-label="Kapat" title="Kapat (Esc)" ...>×</button>'
      +   '<div id="app-info-modal-body" style="padding:22px 24px 24px;clear:both"></div>'
      + '</div>';
    document.body.appendChild(d);
    d.addEventListener('click', function(ev) { if (ev.target === d) InfoModal.close(); });
    document.getElementById('app-info-modal-close').addEventListener('click', InfoModal.close);
    document.addEventListener('keydown', function(ev) {
      if (ev.key === 'Escape' && d.style.display !== 'none') InfoModal.close();
    });
    _el = d; _bodyEl = document.getElementById('app-info-modal-body');
    return d;
  }
  return {
    open: function(html) { _ensure(); _bodyEl.innerHTML = html; _el.style.display = 'flex';
      document.getElementById('app-info-modal-close').focus(); },
    close: function() { if (_el) { _el.style.display = 'none'; _bodyEl.innerHTML = ''; } },
    setBody: function(html) { if (_bodyEl) _bodyEl.innerHTML = html; },
    isOpen: function() { return !!(_el && _el.style.display !== 'none'); }
  };
})();
```

**`bilesenler.md`'deki genel `.modal-overlay` deseninden farkı:** o CSS sınıfıyla, sayfa
içinde (`#page-content`) yaşayan bir modal; bu ise **satır-içi stil** kullanan, **body
seviyesinde kalıcı** bir singleton. Fark kasıtlı: sayfa-içi modaller (`#bc-launch-modal` gibi)
`a11yEnhance`/global Escape dinleyicisinin yakaladığı `#page-content` içinde yaşıyor ve sayfa
gezinmesinde silinmesi sorun değil. `InfoModal` ise **hangi sayfadan açılırsa açılsın aynı
kabuğu** kullanmak istediği ve sayfa geçişinde kaybolmaması gerektiği için body'de yaşıyor —
bu yüzden kendi Escape/backdrop/odak yönetimini kendisi taşıyor, global mekanizmaya güvenmiyor.
Yeni bir "tıkla → hızlı bilgi göster" ihtiyacı olan projede bu ikinci desen (tek singleton,
`open(html)`/`close()`) tercih edilmeli — sayfa sayısı arttıkça "kaçıncı modal" sorusu ortadan
kalkıyor.

## İçerik Deseni: "Künye + Neden + Aksiyon" — VS Ref Örneği

Popup içeriği rastgele değil, tekrar eden bir şablona oturuyor. VS ref popup'ından (proje
özeti):

1. **Başlık şeridi:** ref + kısa etiket + durum rozeti (bkz. `renkler.md`'deki soluk-zemin
   rozet deseni), yan yana.
2. **Künye ızgarası** — sabit boy etiket/değer çiftleri, otomatik sığan grid:
   ```css
   display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px 16px;
   ```
   ```js
   function _pdMiniHtml(k, v) {
     return '<div><div style="font-size:9px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;'
          + 'color:var(--valeo-gray-mid)">' + k + '</div>'
          + '<div style="font-size:13px;font-weight:600;color:var(--text);margin-top:2px">' + (v || '—') + '</div></div>';
   }
   ```
   (OE, Segment, Team, Sorumlu, Target Launch, Statü, Hacim, OI gibi alanlar bu kalıpla
   basılıyor — yeni bir alan eklemek tek satırlık bir `_pdMiniHtml(k, v)` çağrısı.)
3. **"Neden böyle?" gerekçe listesi** — bir puan/durumun **nedenini** anlatan madde listesi,
   her madde kendi önem rengiyle (kırmızı/amber/yeşil metin, dolu rozet değil — bkz.
   `renkler.md`). Sinyal yoksa boş liste değil, açık bir "engel yok" cümlesi gösterilir.
4. **Durum kartları ızgarası** — burada APQP kapıları (4 sabit kart), ama desen genel: sabit
   sayıda kategori, her biri kendi rengiyle durumunu gösteriyor.
5. **Aksiyon satırı** — popup'ı kapatıp tam sayfaya **derin bağlantıyla** geçen düğmeler:
   ```js
   onclick="InfoModal.close();navigateTo('ProjectDetail',{projectRef:'...'})"
   ```
   Popup asla "tek doğru yer" değil — her zaman tam sayfaya kaçış kapısı bırakır.

## İkinci Örnek: PLM Ref → "Nerede Kullanılıyor"

Aynı `InfoModal` kabuğu, farklı bir backend'den (`getWhereUsed`) gelen veriyle dolduruluyor:
kaç kitte kullanıldığı, toplam hacim/OI, SOCO termini (yaklaşan/geçmiş renk kodlamalı — geçmiş
kırmızı, 90 günden yakın amber, uzak nötr). Aynı şablon: künye/özet ızgarası + detay listesi +
"PLM List'te aç →" aksiyonu. **İkinci bir Kit BOM okuması açılmıyor** — kit ref listesi
çağıranın zaten yüklü verisinden taranıyor (bkz. `veri-listeleme.md`'deki "ikinci okuma
açma" ilkesi, `Health.load()`'ın tek yükleme noktası olması).

## Ne Zaman Bu Deseni Kullan

Bir tabloda bir hücreye/ref'e tıklandığında kullanıcının **"buna hızlıca bakayım, gerekirse
tam sayfaya geçerim"** dediği her yerde. Düzenleme/form işlemleri için değil (o zaman
`bilesenler.md`'deki genel modal deseni veya sayfa içi form daha uygun) — `InfoModal` salt
**okuma amaçlı hızlı bakış** için tasarlanmış, içine yazma eylemi koymak (kaydet/sil gibi)
şablonun amacını aşar.
