# Yetki (Rol) — Salt-Okuma Görünümü

Kaynak: Bursa CV Projects, `src/Stylesheet.html`. ValeoDashboard'da yetki bazlı UI kısıtlaması
yok — bu tek kaynaklı bir standart.

## Prensip: Gerçek Yetki Kontrolü Sunucuda, CSS Yalnız Görünürlük

**Yazma denetimi HER ZAMAN sunucuda** (`_denyWrite` gibi bir sunucu fonksiyonu) — buradaki
kurallar yalnız kullanıcının hakkını **görünür** kılar, güvenliği sağlamaz. Bir düğme
işaretlenmemiş kalırsa güvenlik açığı oluşmaz (sunucu zaten reddeder), yalnız kullanıcı
deneyimi bozulur: yetkisi olmayan bir kullanıcı tıklanabilir görünen ama sunucudan hata alan
bir düğmeyle karşılaşır. Bu ayrım önemli — CSS/JS katmanını "yetki sistemi" sanıp sunucu
tarafı kontrolü atlamak ciddi bir güvenlik hatası olurdu.

## Mekanizma: `data-w` İşareti + Gövde Sınıfı

Bir düğmeyi/kontrolü belirli bir yetki kapsamına almak için `data-w` özniteliği eklenir:

```html
<button data-w="plan" onclick="savePlan()">Kaydet</button>
<span data-w="l2" data-l2cell onclick="editStatus()">...</span>
```

Kullanıcının o kapsamda yazma hakkı yoksa `<body>`'ye ilgili `no-*` sınıfı eklenir
(sayfa açılışında, kullanıcının rolüne göre sunucudan gelen bilgiyle):

```css
body.no-plan  [data-w="plan"],
body.no-l2    [data-w="l2"],
body.no-data  [data-w="data"],
body.no-admin [data-w="admin"] {
  opacity: .45;
  pointer-events: none;
  filter: grayscale(1);
}
/* Tıklanabilir span/div gibi öğelerde imleç de değişmeli */
body.no-l2 [data-w="l2"][data-l2cell] { cursor: not-allowed; }
```

Kapsam adları projeye göre değişir (`plan`/`l2`/`data`/`admin` burada Bursa CV'nin kendi
modülleri) — yeni bir projede kendi yetki alanlarınla değiştir, mekanizma aynı kalır.

## Sabit Uyarı Şeridi (`#ro-bar`)

Salt-okuma modundaki bir kullanıcıya, tek tek soluklaşan düğmelerin ötesinde ekranın altında
kalıcı bir hatırlatma:

```css
#ro-bar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 9996;
  padding: 7px 16px; font-size: 12px; font-weight: 600; text-align: center;
  background: var(--st-warn-bg); color: var(--st-warn-fg);
  border-top: 1px solid var(--status-warning);
}
@media print { #ro-bar { display: none !important; } }
```

Renk `--st-warn-bg`/`--st-warn-fg` çiftinden — durum rozetleriyle **aynı** desen (bkz.
`renkler.md`), yeni bir renk çifti icat edilmiyor.

## Neden Bu Desen İyi

- **Tek işaret, çok yer:** yeni bir yetki-kısıtlı kontrol eklemek tek bir `data-w="..."`
  özniteliği yazmak kadar ucuz — ayrı bir JS kontrolü, ayrı bir `if (canEdit)` dalı gerekmez.
- **İşaretsiz kalmak sessiz güvenlik açığı DEĞİL:** işaretlenmemiş bir düğme yalnız görünüşte
  aktif kalır, tıklanınca sunucudan hata alır. Riskli taraf kullanıcı deneyimidir, veri
  güvenliği değil — bu, "şüphede işaretleme" yerine "şüphede işaretle" davranışını güvenli
  kılıyor.
- **Tek CSS kuralı, çok bileşen türü:** buton, span, div — hepsi aynı `data-w` + `body.no-*`
  ikilisiyle çalışır, bileşen türüne göre ayrı bir kısıtlama mekanizması yazılmaz.
