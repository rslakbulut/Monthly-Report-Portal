# Etkileşim Kuralları (2026-08-29) — KAYNAK PROVENANCE FARKLI

## Kaynak Durumu

**Uyarı:** kaynağı `nphlvn/TaskTracker` — üçüncü bir referans, `ValeoDashboard`/
`Bursa-CV-Projects`'ten değil (bkz. `docs/renkler.md` → "Üçüncü Bir Referans"). Bu dosyadaki
desenler görsel bir bileşen değil, **davranış** kuralları — Standartlar'ın önceki dokümanları
büyük ölçüde görünüme (renk, boyut, CSS) odaklandığı için bunlara şimdiye kadar bir yer yoktu.

## Tek Satırlık Hızlı Ekleme

En sık yapılan işin (yeni kayıt açma) sekiz alanlı bir forma ihtiyacı yoktur: tek bir kutu
başlığı alır, kalan alanları **güvenle tahmin edilebildiği** ölçüde akıllı varsayımla
doldurur — ama bir alan güvenle tahmin edilemiyorsa sessizce yanlış bir değer yazmak yerine
tam formu açar:

```js
function quickAddTask(){
  var title = String(box.value||'').trim();
  if(!title){ box.focus(); return; }
  var g = ntGuess(), b = boardState();
  // Panoda tek bir proje/takım süzgeci açıksa niyet bellidir: iş oraya açılır.
  // Birden fazlası seçiliyse seçim belirsizdir, tahmine dönülmez.
  var picked = mvList(b.filters.project);
  var project = (picked.length===1 ? picked[0] : g.project);
  var onTeams = Object.keys(b.teams).filter(function(k){ return b.teams[k]; });
  var team = (onTeams.length===1 ? teamWire(onTeams[0]) : teamWire(teamKeyOf(g.team)));
  if(!project || !team || !g.people.length){
    box.value=''; openNewTaskModal(title); return;   // güvenle tahmin edilemedi → tam form
  }
  box.value='';
  gs('addTask', { title:title, project:project, team:team, priority:'K2',
                  responsible:g.people.join(', '), dueDate:g.due, status:'Ongoing' })
    /* ... */;
}
```

(Kaynak: TaskTracker `Index.html`.) Kural: tahmin kaynağı **açık bağlam**tan gelir (o an
ekranda tek bir proje/takım süzgeci seçiliyse, kullanıcının niyeti zaten bellidir) —
belirsizlik varsa (birden fazla süzgeç açık, sorumlu atanmamış) tahmine **hiç girişilmez**,
kullanıcı tam formla karşılanır. Bu, formu doldurma hızını artırırken yanlış veri riskini
sıfıra indiren bir orta yol: "her zaman tam form" kadar yavaş değil, "her zaman tahmin et"
kadar riskli değil.

## Ölçüt Destekli Arama

Tek bir arama kutusu hem serbest metni hem yapılandırılmış ölçütleri kabul eder
(`status:late`, `due:W32`, `project:radar`, `@kişi`):

```js
var SEARCH_PREFIX = { status:'status', durum:'status', due:'due', termin:'due',
                       project:'project', proje:'project', person:'person', kisi:'person', kişi:'person' };
var SEARCH_STATUS = { ongoing:'ongoing', devam:'ongoing', late:'late', gec:'late', geciken:'late',
                       onhold:'onhold', beklemede:'onhold', done:'done', bitti:'done',
                       cancelled:'cancelled', iptal:'cancelled', open:'open', overdue:'overdue' };

function searchParse(raw){
  var out={ text:'', person:'', status:'', due:'', project:'', bad:[] };
  var words=String(raw||'').trim().split(/\s+/).filter(Boolean), free=[];
  words.forEach(function(w){
    if(w.length>1 && w.charAt(0)==='@'){ out.person=w.slice(1); return; }
    var c=w.indexOf(':');
    if(c>0){
      var key=SEARCH_PREFIX[normName(w.slice(0,c))], val=w.slice(c+1);
      if(key && val){
        if(key==='status'){ var sv=SEARCH_STATUS[normName(val)]; if(sv) out.status=sv; else out.bad.push(val); }
        else if(key==='person') out.person=val;
        else out[key]=val;
        return;
      }
    }
    free.push(w);          // tanınmayan ölçüt kaybolmaz, serbest metne düşer
  });
  out.text=free.join(' ');
  return out;
}
```

(Kaynak: TaskTracker `Index.html`.) Üç kural:
- **Yerelleştirilmiş eş anlamlılar:** arayüz İngilizce olsa da ekibin kendi dilindeki
  karşılıklar (`durum:`, `termin:`, `proje:`, `kişi:`) sessizce kabul edilir — `SEARCH_PREFIX`
  ve `SEARCH_STATUS` haritaları hem İngilizce hem Türkçe anahtarları aynı değere eşliyor.
- **Tanınmayan bir ölçüt asla sessizce kaybolmaz.** `status:banana` gibi geçersiz bir değer
  `bad[]` dizisine düşer ve arayüzde **açıkça** "bu değer tanınmadı" gösterilir; yazdığının
  sessizce yok sayılması, kullanıcıya yanlış sonuç göstermekten beter — en azından neyin
  eşleşmediği görünür.
- **`key:` biçiminde olmayan her kelime serbest metne düşer** — `project:` gibi bir önek
  taşımayan kelimeler filtre olarak yorumlanmaya çalışılmaz, aranan metnin bir parçası sayılır.
  Bu, `sidebar.md`'deki komut paletinin (Ctrl+K — sayfa/ref/eylem arayan) çözdüğü sorundan
  **farklı**: komut paleti "nereye gideyim" sorusuna, bu arama kutusu "hangi kayıtları
  filtreleyeyim" sorusuna cevap veriyor — ikisi tamamlayıcı, biri diğerinin yerine geçmez.

## Sonuç Görünmüyorsa Söylenir

Yeni eklenen bir kayıt mevcut süzgeçlerin dışında kalıyorsa (ör. "Late" filtresi açıkken yeni
görev "Ongoing" olarak eklendi), bildirim bunu açıkça belirtir:

```js
var msg = 'Task added · ' + project + ' · ' + due + (hidden ? ' — hidden by the current filters' : '');
```

(Kaynak: TaskTracker `Index.html`.) Gerekçe: aksi halde kullanıcı ekliyor ama listede
göremiyor, "kaydetmedi" sanıp aynı işi tekrar giriyor — bu, sessiz bir veri tekrarına yol
açan, yaygın ve fark edilmesi zor bir kullanıcı hatası kaynağı. Kural genel: **bir işlemin
sonucu, o an açık olan görünümde görünmeyecekse**, bunu bildirim metninde söylemek işlemi
"başarısız" göstermekten de, hiç söylememekten de daha iyi bir orta yoldur.

## Kademeli Esc Önceliği

Aynı anda birden fazla katman (arama kutusu, yardım paneli, modal, sağ panel, sütun filtre
kutusu) açık olabildiği için tek bir global `Escape` dinleyicisi **öncelik sırasına** göre
davranır — en üstteki/en dar kapsamlı katman önce kapanır:

```js
if(e.key==='Escape' && S.help){
  // Önce arama kutusunu temizle, panel ikinci basışta kapanır.
  if(S.help.q){ S.help.q=''; renderHelp(); return; }
  closeHelp(); return;
}
if(e.key==='Escape' && (S.modal || S.drawer)){
  // İçindeki bir giriş kutusu (hızlı ekleme, arama, sütun filtresi) kendi Esc'ini
  // yönetiyorsa BURAYA girilmez — kutu temizlenir, pencere yerinde kalır.
  var ownsEsc = /* odak quickadd/global-search/help-q/[data-flt] üzerindeyse true */ false;
  if(!ownsEsc){ /* modal/drawer kapanır */ }
}
```

(Kaynak: TaskTracker `Index.html`.) Genel kural, herhangi bir çok-katmanlı arayüze taşınabilir:
**en dar kapsamlı, en son açılan öğe önce kapanır** (arama kutusundaki metin → yardım paneli
→ modal/panel → hiçbir şey). Bir giriş kutusunun (arama, hızlı ekleme, sütun filtresi) kendi
Escape davranışı varsa (kutuyu temizlemek), odak o kutudayken üstteki katmanların Escape'i
**devreye girmez** — aksi halde kullanıcı bir arama kutusunu temizlemek isterken yanlışlıkla
arkasındaki paneli kapatmış olur.

## Hareket (Motion) Kataloğu

Her animasyon türü için sabit süre/eğri — proje büyüdükçe her yeni bileşenin kendi rastgele
süresini icat etmesini önler:

| Animasyon | Süre / eğri |
|---|---|
| Panel girişi (`sheetIn`) | 220ms `cubic-bezier(.4,0,.2,1)`, 24px sağdan |
| Modal girişi (`modalIn`) | 200ms, 10px yukarı + `scale(.98)` |
| Kenar çubuğu | 200–250ms genişlik/kaydırma |
| Hover | 150ms zemin geçişi |
| Vurgu halkası (`helpPulse`) | 1.9–2.2s, 1–2 tekrar |
| Kayıt göstergesi (savebar) | 220ms opaklık + kayma |

(Kaynak: TaskTracker `design.md`.) Kural: `transition-all` ve `hover:scale-105` sınırı
aşılmaz — sürekli açılan bir çalışma aracında agresif animasyon yorucudur (bkz.
`jenerik-desenler.md`'deki `prefers-reduced-motion` kuralıyla birlikte uygulanmalı).
