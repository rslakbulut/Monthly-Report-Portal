# Sağ Panel (Drawer) — Satır İçi Düzenleme + Kayıt Gezinmesi (2026-08-29) — KAYNAK PROVENANCE FARKLI

## Kaynak Durumu

**Uyarı:** kaynağı `nphlvn/TaskTracker` — üçüncü bir referans, `ValeoDashboard`/
`Bursa-CV-Projects`'ten değil (bkz. `docs/renkler.md` → "Üçüncü Bir Referans"). Yazma kısıtı
bu projeye uygulanmaz, ama resmi bir "kaynak proje" de değil.

**`docs/detay-popup.md`'deki `InfoModal` ile karıştırma — iki ayrı ihtiyaç:** `InfoModal`
ortada açılan, **salt okunur** bir hızlı-bakış penceresidir ("buna bakayım, gerekirse tam
sayfaya geçerim"). Buradaki desen ise **sağdan açılan, düzenlemeye izin veren** bir panel —
bir kaydı listeden çıkmadan görüntülemek VE değiştirmek için. Biri diğerinin yerine geçmez;
bir projede ikisi birden bulunabilir, hangi ihtiyaç için hangisi kullanılacağı görevin
"yalnız bakış mı, düzenleme mi" sorusuna bağlıdır.

## Kabuk

```css
/* Sağdan giren tam yükseklikte panel */
.drawer { max-width: min(520px, 94vw); }
.drawer-scrim { background: rgba(4,27,60,.35); backdrop-filter: blur(1px); }
```
```css
@keyframes sheetIn { from{transform:translateX(24px);opacity:.4} to{transform:translateX(0);opacity:1} }
```

(Kaynak: TaskTracker `Index.html`.) Panel `position:fixed`, tam yükseklik, sağdan
`sheetIn` animasyonuyla girer (220ms, bkz. `jenerik-desenler.md`'deki hareket ilkeleri);
arkasında karartma + hafif blur — modalın aksine panel içeriği ekranın tamamını değil yalnızca
sağ şeridi kaplar, kullanıcı listenin geri kalanını (soluklaşmış da olsa) görmeye devam eder.

## "Özellik Satırı" Deseni — Değere Tıklamak Yerinde Düzenlemeyi Açar

İçerik sabit bir yapıda: ikon (18px) · etiket (sabit genişlik, hizalı sütun) · değer. Değere
tıklamak **ayrı bir düzenleme ekranına gitmez** — satır kendi içinde bir form alanına
dönüşür:

```js
function prop(field, icon, label, valHtml, editable){
  var editing = (currentEditField === field);
  if(editing){
    // örn. bir <select> veya metin girişi, otomatik odaklanmış (data-autofocus)
    return '<div class="row">'
      + '<span class="icon">'+icon+'</span><span class="label">'+label+'</span>'
      + '<select data-propsel="'+field+'" data-autofocus>'+optionsFor(field)+'</select>'
      + '</div>';
  }
  return '<div class="row">'
    + '<span class="icon">'+icon+'</span><span class="label">'+label+'</span>'
    + (editable
        ? '<button data-prop="'+field+'" class="group/prop">'+valHtml
            +'<span class="edit-icon opacity-0 group-hover/prop:opacity-100">edit</span></button>'
        : '<div>'+valHtml+'</div>')
    + '</div>';
}
```

(Kaynak: TaskTracker `Index.html`, sadeleştirilmiş — tam biçim `prop()`.) Kurallar:
- **Düzenlenemeyen alanlar** (`editable=false` — ör. "Oluşturulma tarihi") hiçbir zaman
  tıklanabilir görünmez, hover'da kalem ikonu çıkmaz — kullanıcı yanlışlıkla değiştirilebilir
  sanmaz.
- **Alana özel giriş türü:** çoğu alan bir `<select>`, ama bazıları (proje adı gibi) serbest
  yazılabilir + var olanlardan öneren bir `<input list=…><datalist>`, bazıları (kişi ataması
  gibi) çoklu seçim yapılan bir onay-kutulu liste. Tek bir jenerik "düzenle" bileşeni yerine
  alanın veri tipine uygun giriş kontrolü seçilir.
- **Yetkisiz kullanıcıya düğme bile gösterilmez** (`canEdit` kontrolü `editable&&canEdit`) —
  `yetki-gorunumu.md`'deki "gerçek kontrol sunucuda, CSS yalnız görünürlük" ilkesiyle tutarlı:
  bu yalnız görünürlük katmanı, asıl yazma denetimi sunucuda tekrarlanmalı.
- Hover'da beliren kalem ikonu (`opacity-0 group-hover:opacity-100`) alanın düzenlenebilir
  olduğunu **sessizce** ima eder — her satıra kalıcı bir "Edit" düğmesi eklemek görsel gürültü
  yaratırdı.

## Önceki / Sonraki Kayıt Gezinmesi

Panel, açıldığı **listenin** neresinde olduğunu bilir ve ok tuşlarıyla o liste içinde
ilerlemeyi sağlar — kullanıcı her kaydı görmek için paneli kapatıp listeden yeniden
tıklamak zorunda kalmaz:

```js
var ids = scopedList().map(function(x){ return x.id; });
var pos = ids.indexOf(currentItem.id);
```
```html
<!-- pos<0: bu kayıt panelin açıldığı listede YOK (ör. başka bir kişinin satırı) —
     yanlış "0 / 42" göstermek ve alakasız bir kayda atlamak, oku hiç göstermemekten kötü -->
<span>Opened from a different list</span>
<!-- pos>=0: -->
<button data-step="-1" [disabled: pos<=0]>▲</button>
<button data-step="1"  [disabled: pos>=ids.length-1]>▼</button>
<span>(pos+1) / ids.length</span>
```

(Kaynak: TaskTracker `Index.html`, `renderDrawer()`.) Kritik kural: kayıt, panelin açıldığı
listenin bir üyesi **değilse** (ör. başka bir kaynaktan/farklı bir süzgeçten açılmışsa) ok
düğmeleri "0 / 0" gibi anlamsız bir sayı göstermek yerine **tamamen** metne dönüşür ("Opened
from a different list") — yanlış konum bilgisi vermek, konum bilgisi hiç vermemekten daha
kötü bir kullanıcı deneyimi. Listenin ilk/son kaydında ilgili ok `disabled` olur, döngüsel
gezinme (sona gelince başa sarma) yapılmaz.

## Ne Zaman Bu Deseni, Ne Zaman `InfoModal`'ı Kullan

| İhtiyaç | Bileşen |
|---|---|
| Bir referansa/hücreye tıklayınca hızlı bakış, düzenleme yok | `detay-popup.md` → `InfoModal` |
| Bir kaydı listeden çıkmadan görüntüleyip **düzenlemek**, kayıtlar arası gezinmek | Bu doküman → sağ panel |
| Çok adımlı, karmaşık bir form (ör. yeni kayıt oluşturma) | `bilesenler.md`'deki genel modal |

Üçü birbirinin yerine geçmez — bir projede aynı anda ikisi/üçü de bulunabilir, hangisinin
kullanılacağı görevin "yalnız oku", "gör ve düzenle" veya "çok adımlı doldur" olmasına bağlı.
