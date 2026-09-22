# Kanban Panosu ve Görev Kartı (2026-08-29) — KAYNAK PROVENANCE FARKLI

## Kaynak Durumu

**Uyarı:** kaynağı `nphlvn/TaskTracker` — `ValeoDashboard`/`Bursa-CV-Projects` bu deseni
içermiyor, hiçbirinde bir kanban/pano görünümü yok. TaskTracker bu reponun kaynağı **değil**
(standartları tüketen bağımsız bir üretim uygulaması, "Kaynak depolara asla yazılmaz" kısıtı
buraya uygulanmaz) — üçüncü bir referans, aynı statüde daha önce eklenen AI Club Portal/M3
materyali gibi (bkz. `docs/renkler.md` → "Üçüncü Bir Referans"). Bu doküman tamamen yeni bir
alan: Standartlar'da önceden hiçbir kanban standardı yoktu.

## Sürükle-Bırak — Zorunlu `dragover` Engeli

Tarayıcının varsayılan davranışı `drop` olayını **engeller**; `dragover`'da
`preventDefault()` çağrılmazsa hiçbir sütun bırakma hedefi olarak çalışmaz:

```js
document.addEventListener('dragover', function(e){
  var col = e.target.closest('[data-dropcol]');
  if(!col) return;
  e.preventDefault(); // required so 'drop' fires
  e.dataTransfer.dropEffect = 'move';
  col.classList.add('ring-2','ring-mid-blue','ring-inset');
});
document.addEventListener('dragleave', function(e){
  var col = e.target.closest('[data-dropcol]');
  if(col && !col.contains(e.relatedTarget)) col.classList.remove('ring-2','ring-mid-blue','ring-inset');
});
```

(Kaynak: TaskTracker `Index.html`.) Sütunun bırakma hedefi olduğu bir `data-dropcol`
özniteliğiyle işaretlenir; sürüklenen kart üzerine geldiğinde sütun bir halka (`ring`) ile
vurgulanır — kullanıcı bırakırsa nereye düşeceğini görür, `dragleave`'de bu vurgu kaldırılır.
Bu, herhangi bir sürükle-bırak arayüzünde tekrar eden, kolayca unutulan bir tuzak — kanbanın
"neden kaymıyor" diye görünen en yaygın hatası budur.

## Görev Kartı — Dört Katmanlı Bilgi Mimarisi

Kart rastgele bir bilgi yığını değil, sabit dört katmanlı bir düzen izler:

```html
<div data-open="T-123" tabindex="0" role="button" aria-label="Compare supplier quotes"
     draggable="true"
     class="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-sm
            hover:shadow-md hover:-translate-y-0.5 transition p-4 border-l-4 cursor-grab"
     style="border-left-color:#0072ce">
  <!-- 1) durum + sıra no + öncelik rozeti -->
  <div class="flex items-center gap-2 mb-1.5">
    <span style="color:#0072ce">🕐 Ongoing</span>
    <span class="text-[var(--faint)]">#42</span>
    <span class="ml-auto" style="background:rgba(0,114,206,.12);color:#0072ce">K2</span>
  </div>
  <!-- 2) başlık + Must-Win / not ikonları -->
  <div class="fs-sm font-semibold">Compare supplier quotes 🏆 💬</div>
  <!-- 3) proje noktası + takım rozeti -->
  <div class="flex items-center gap-2 mb-2">
    <span class="w-2.5 h-2.5 rounded-sm" style="background:#7c3aed"></span>Front Camera Module
    <span class="badge">Team 1</span>
  </div>
  <!-- 4) sorumlu avatarı + termin pill'i -->
  <div class="flex items-center gap-2">
    <span class="w-6 h-6 rounded-full" style="background:#0052cc">JD</span>
    <span class="ml-auto">W32</span>
  </div>
</div>
```

(Kaynak: TaskTracker `Index.html`, sadeleştirilmiş — tam biçim `boardCardHtml()`.) Katman
sırası kasıtlı: önce "ne durumda ve ne kadar acil" (tarama sırasında en hızlı okunan bilgi),
sonra "ne işi", sonra "hangi bağlamda" (proje/takım), en son "kim ve ne zaman" — bir kullanıcı
panoyu yukarıdan aşağı tararken her kartta aynı sırayla aynı soruları cevaplıyor. Seçili
durumdaki kart zemini `rgba(0,114,206,.10)` alır (bkz. `renkler.md` → mid-blue); Must-Win/not
gibi ikincil işaretler başlığın hemen yanında, küçük ve renkli, ana metni bölmeden eklenir.

**Klavye erişilebilirliği:** kart `tabindex="0" role="button" aria-label="<başlık>"` taşır —
sürükle-bırak fare gerektirse de, kartı **açmak** (detay panelini göstermek) yalnızca fareyle
sınırlı değildir; Enter/Space ile klavyeden de açılabilir (bkz. `jenerik-desenler.md`'nin
genel erişilebilirlik kalıpları). Sürüklenemeyen bir kullanıcı (yetkisi yok) için
`draggable="false"` ve imleç `cursor-pointer`'a döner — sürükleme kaldırılır ama karta
tıklayıp açma özelliği kalır.

## Sütun Grubu (Swimlane) — Segment Kontrolüyle Seçilir

Panoyu yatayda (durum sütunları sabit) bir de dikeyde gruplamak isteyen bir görünüm (ör.
takıma veya önceliğe göre şeritlere ayırma) `bilesenler.md`'deki **Segment Kontrolü**
bileşeniyle seçilir — yeni bir açılır menü icat edilmez:

```js
[['none','None','grid_view'],['team','Team','groups'],['priority','Priority','flag']]
  .map(function(v){ return '<button data-bswim="'+v[0]+'" class="'+segBtn(active===v[0])+'">...'; })
```

(Kaynak: TaskTracker `Index.html`.) Varsayılan `none` — gruplama isteğe bağlı bir katman,
zorunlu değil.

## Ne Zaman Bu Deseni Kullan

Durumu az sayıda sabit aşamadan (bkz. `renkler.md`'deki durum renkleri: Ongoing/Late/Onhold/
Done/Cancelled gibi) oluşan, sürükle-bırakla ilerleyen bir iş listesi kuruyorsan bu desen
uygun. Aşamalar aşamalı değil de yalnızca filtrelenip sıralanacaksa (bkz.
`veri-listeleme.md`'nin `ColFilter`'ı) kanban yerine düz tablo/liste görünümü yeterlidir —
TaskTracker'ın kendisi de aynı veriyi Kanban/List/Timeline olarak üç ayrı görünümde sunuyor
(görünüm seçimi yine bir Segment Kontrolü, bkz. yukarısı), tek bir "doğru" görünüm dayatmıyor.
