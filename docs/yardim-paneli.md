# Uygulama İçi Yardım Paneli + İlk Kullanım Turu (2026-08-29) — KAYNAK PROVENANCE FARKLI

## Kaynak Durumu

**Uyarı:** kaynağı `nphlvn/TaskTracker` — üçüncü bir referans, `ValeoDashboard`/
`Bursa-CV-Projects`'ten değil (bkz. `docs/renkler.md` → "Üçüncü Bir Referans"; yazma kısıtı
bu projeye uygulanmaz, resmi bir "kaynak proje" de değil). Hiçbir Standartlar dokümanında
bir uygulama-içi yardım/dokümantasyon sistemi ya da ilk-kullanım turu (onboarding) yoktu —
bu iki bileşen tamamen yeni bir alan, aynı vurgulama mekanizmasını (spot ışığı) paylaştığı
için tek dosyada tutuluyor.

## Yardım Paneli — Karartmayan Bir Çekmece

Sağdan açılan bir çekmece (`min(96vw, 436px)`, `z-index:75` — bkz. `jenerik-desenler.md`'deki
z-index tablosu, **modalın üstünde** durur çünkü açık bir pencerenin kılavuzu o pencere
açıkken okunabilmeli). Modalin aksine **arkayı karartmaz** — panel açıkken uygulama
kullanılmaya devam eder, kullanıcı yardımı okurken aynı anda ekrandaki düğmeye de bakabilir.

Sabit üç bölüm:

```html
<div id="help-root">
  <!-- 1) Başlık şeridi: koyu marka zemini, lime kare içinde ikon -->
  <div class="header">Yardım · Kullanım Kılavuzu <button data-hclose>×</button></div>

  <!-- 2) Arama kutusu + hazır soru çipleri -->
  <div class="search-area">
    <input id="help-q" placeholder="Örn. hedef nasıl eklerim, neden mail geliyor…">
    <div class="chips">
      <!-- en sık sorulan 4-5 soru, tek tıkla arama kutusunu doldurur -->
      <button data-hask="hedef ekleme">hedef ekleme</button>
      <button data-hask="neden mail geliyor">neden mail geliyor</button>
    </div>
  </div>

  <!-- 3) İçerik: kategoriler + akordeon maddeler -->
  <div id="help-body"></div>

  <!-- Alt çubuk: turu yeniden aç + geri bildirim -->
  <div class="footer">
    <button data-tour-open>Tanıtımı göster</button>
    <button data-hfeedback>Bize bildir</button>
  </div>
</div>
```

(Kaynak: TaskTracker `Index.html`, `renderHelp()` — sadeleştirilmiş.) İçerik tek bir veri
listesinden (`HELP`) üretilir, kategori/yetki filtresiyle (`HELP_CATS`, `gate:` alanı) —
`sidebar.md`'deki "tek kaynaktan türeyen menü" ilkesiyle aynı disiplin: ikinci bir içerik
listesi yok, tek liste hem aramayı hem akordeonu besliyor.

## "Bunu Bana Göster" — Spot Işığı

Yardım maddesindeki bir buton/alanı ekranda **fiilen** göstermek için, o öğenin etrafına
geçici bir vurgu halkası çizilir:

```css
@keyframes helpPulse{0%,100%{box-shadow:0 0 0 0 rgba(0,114,206,0)}18%,58%{box-shadow:0 0 0 4px rgba(0,114,206,.55)}}
.help-pulse{animation:helpPulse 1.9s ease-out 2;border-radius:10px;position:relative;z-index:1}
```
```js
function helpPulse(node){
  if(!node) return false;
  try{ node.scrollIntoView({behavior:'smooth',block:'center'}); }catch(e){ node.scrollIntoView(); }
  node.classList.remove('help-pulse');
  void node.offsetWidth;                    // animasyonu yeniden tetiklemek için
  node.classList.add('help-pulse');
  setTimeout(function(){ node.classList.remove('help-pulse'); }, 4200);
  // Panel sağda sabit durur ve scrollIntoView yalnız DİKEY hizalar; hedef panelin
  // arkasında kalıyorsa ışık yanar ama görünmez — o zaman paneli kenara çek.
  var panel = document.querySelector('#help-root');
  setTimeout(function(){
    if(panel){
      var nr=node.getBoundingClientRect(), pr=panel.getBoundingClientRect();
      var behind = nr.right>pr.left && nr.left<pr.right && nr.bottom>pr.top && nr.top<pr.bottom;
      if(behind){
        panel.classList.add('help-peek');       // panel geçici olarak kenara kayar
        setTimeout(function(){ panel.classList.remove('help-peek'); }, 3400);
      }
    }
  }, 260);
  return true;
}
```

(Kaynak: TaskTracker `Index.html`.) Üç ayrı sorunu birlikte çözüyor: (1) hedef ekranda
görünmüyorsa önce oraya kaydırır, (2) animasyon `classList` kaldır-yeniden-ekle + zorla
reflow (`void node.offsetWidth`) ile **her çağrıda** yeniden tetiklenir — yoksa art arda iki
"bunu göster" tıklaması ikinci kez animasyon oynatmaz, (3) hedef panelin **arkasında**
kalıyorsa (geometrik çakışma testiyle tespit edilir) panel geçici olarak kenara kayar, ışık
söndükten sonra yerine döner. Hedef o an ekranda **hiç yoksa** (ör. farklı bir sayfaya
geçmeden bakılıyorsa) sessizce `false` döner, yardım maddesi kendi metniyle açıklamaya devam
eder — hata gösterilmez, çünkü madde zaten ne olduğunu anlatıyor.

## Zorunlu Kapsam Denetimi — `helpAudit()`

Yardım paneli yalnızca "varsa iyi" bir katman değil; kaynak projede her yeni düğme/alan
eklendiğinde aynı commit'te bir `HELP` maddesiyle eşleştirilmesi **zorunlu** ve bu mekanik
olarak denetleniyor: `helpAudit()` ekrandaki `[data-action]`/kontrolleri tarar, karşılığı
olmayanları raporlar. Fonksiyon **boş dizi** dönmeden iş bitmiş sayılmaz. Bu disiplin,
kılavuzun zamanla koddan kopan "eski, güncellenmemiş" bir belgeye dönüşmesini engelliyor —
kılavuz güncel kalmazsa spot-ışığı da (yukarısı) yanlış/eksik öğeyi işaret eder. Yeni bir
projede yardım paneli kurulacaksa bu denetim fonksiyonu **isteğe bağlı bir iyileştirme değil**,
panelin kendisiyle birlikte kurulması gereken bir parça olarak ele alınmalı.

## İlk Kullanım Turu (Onboarding) — Modal Değil, Karartmayan Köşe Kartı

Yeni bir kullanıcı ilk kez (ve gerçek veri varken — boş bir ekranda tur anlamsız) giriş
yaptığında, tam ekranı kaplayan bir tur/modal yerine köşede duran küçük bir kart açılır:

```js
function tourMaybeStart(){
  if(S.tour || tourSeen()) return;
  if(!(S.tasks||[]).length && !(S.goals||[]).length) return;   // veri yokken tanıtım anlamsız
  tourStart();
}
function renderTour(){
  var steps=tourSteps(), st=steps[S.tour.i];
  if(st.page && st.page!==S.page) goto(st.page);   // önce doğru sayfaya geç
  // Vurgu, sayfa geçişi DOM'u yeniden kurduktan SONRA yapılır — sırası tersse
  // silinmiş bir düğümü yakıp söndürmüş oluruz.
  setTimeout(function(){ var n=document.querySelector(st.sel); if(n) helpPulse(n); }, 260);
  // Kart: köşede, karartmasız, ilerleme noktaları + Skip/Back/Next
}
```

(Kaynak: TaskTracker `Index.html`, `tourMaybeStart`/`renderTour` — sadeleştirilmiş.)
Özellikler:
- **Arkayı karartmaz, uygulamayı kilitlemez** — kullanıcı tur açıkken de ekranla etkileşebilir,
  turu görmezden gelip kendi başına keşfetmeye başlayabilir.
- **Yardım panelinin aynı spot-ışığı mekanizmasını** (`helpPulse`) kullanır — ikinci bir
  vurgulama yolu icat edilmedi; bu bilinçli, çünkü iki ayrı vurgulama mekanizması zamanla iki
  ayrı davranışa ayrışır (bkz. TaskTracker `design.md`'nin "Kaçınılan Desenler" bölümü).
- **Bir kez gösterilir** (`tourSeen()`), atlanırsa (Skip) veya bitirilirse bir daha
  kendiliğinden açılmaz — ama yardım panelinin alt çubuğundaki "Tanıtımı göster" düğmesiyle
  (yukarısı) istenildiği zaman yeniden başlatılabilir; tur bitmiş olmak, kalıcı olarak
  erişilemez olmak anlamına gelmez.
- Adımlar arası ilerleme noktaları (dots) + Skip/Back/Next; son adımda "Next" yerine "Done".
- Bir adımın hedefi farklı bir sayfadaysa **önce o sayfaya geçilir**, spot ışığı sayfa
  DOM'u yeniden kurulduktan **sonra** yakılır — sırası tersse henüz var olmayan (silinmiş)
  bir düğüme ışık tutulmaya çalışılmış olur.

## Ne Zaman Bu İkisini Kur

Kullanıcı kitlesi yazılım bilmeyen, teknik terim yerine somut tarif bekleyen bir ekipse (bkz.
TaskTracker `CLAUDE.md` §1 — "projenin sahibi yazılım bilmiyor") ve uygulama küçük bir
"araç" değil günlük olarak dönülen bir sistemse, bu ikili düşünülmeli: yardım paneli
tekrarlayan "bu nasıl çalışıyor" sorularını azaltır, ilk-kullanım turu ise bu panelin
varlığını yeni kullanıcıya baştan öğretir (turun son adımı zaten "Sıkıştın mı? `?`'ye bas"
mesajıyla panele yönlendiriyor). Basit, az sayfalı bir araçta ikisi de gereksiz karmaşıklık
olabilir — `baslarken.md`'deki genel "gerekmedikçe ekleme" ilkesi burada da geçerli.
