# İkon Kütüphanesi — Lucide (2026-08-21 kararı)

Bu repo daha önce bir ikon standardı tanımlamıyordu. `sidebar.md`'deki `icon: ICONS.mytask`
gibi referanslar, kaynağı hiçbir yerde belgelenmemiş, Bursa CV Projects'e özel elle çizilmiş
inline SVG'lere işaret ediyordu — her yeni proje ikon seçimini kendi başına, tutarsız yapıyordu.
**Resmi ikon kütüphanesi artık Lucide** (`lucide.dev`) — açık kaynak, MIT lisanslı, tutarlı
24×24 grid, `stroke`-tabanlı (dolgu değil çizgi) ikon seti.

## Neden Lucide

- Geniş kapsam (1000+ ikon), tek görsel dil (2px stroke, yuvarlak uçlar) — proje proje farklı
  ikon setleri taranmasını önler.
- Framework-agnostik, tek dosyalık inline SVG olarak kullanılabilir — bu repo canlı kod
  içermez kararıyla uyumlu: CDN script bağımlılığı yerine kopyala-yapıştır SVG.
- Zaten kullanılan `currentColor` deseniyle (bkz. `sidebar.md`) doğrudan uyumlu — Lucide
  ikonları `stroke="currentColor"` ile gelir, ayrı bir renk eşleme koduna gerek kalmaz.

## Kullanım

- **Boyut:** varsayılan 20×20px (`sidebar.md`'deki mevcut `.sidebar-icon svg` kuralıyla
  aynı ölçü); ikon-only buton/chip içinde 16×16px.
- **Renk:** `currentColor` — ayrı bir `fill`/`color` kuralı yazma, ikon bulunduğu elementin
  `color`'ından miras alır (`sidebar.md`'nin `--item-color` deseniyle aynı ilke).
- **Nasıl eklenir:** Lucide'ın kendi sitesinden/`lucide-static` paketinden ilgili ikonun SVG
  markup'ı kopyalanır, projeye **inline** yapıştırılır. CDN script (`<script src=...>`)
  bağımlılığı eklenmez — self-contained kalması gerekir.
- **`sidebar.md`'deki `ICONS` nesnesi** artık Lucide'dan seçilen ikonlarla doldurulur — yeni
  bir projeye taşınırken Bursa CV Projects'in elle çizilmiş özel SVG'leri birebir kopyalanmaz,
  Lucide karşılığıyla değiştirilir.

## Ne Zaman Hangi İkon (öneri, zorunlu değil)

| Kullanım | Lucide ikonu |
|---|---|
| Kapatma/kaldırma (chip remove, modal ×) | `x` |
| Durum: başarılı | `check-circle` |
| Durum: uyarı | `alert-triangle` |
| Durum: hata | `x-circle` |
| Arama | `search` |
| Filtre | `filter` |
| Bildirim | `bell` |
| Kullanıcı/profil | `user` |
| Ayarlar | `settings` |
| Dashboard/Sinoptik | `layout-dashboard` |

Bu tablo bağlayıcı değil — proje-özel ihtiyaçlar için Lucide'ın kendi katalog sayfasından uygun
ikon seçilir; amacı aynı kavram için her projede farklı bir ikon aranmasını önlemek.

## İlgili Bileşenler

Aşağıdaki desenler zaten bir "ikon" yer tutucusuna sahipti, kaynağı belirsizdi — artık hepsi
Lucide'dan seçilir: `sidebar.md`'deki menü ikonları, `veri-listeleme.md`'deki Input chip'in
silme ikonu, `bilesenler.md`'deki `appNotifyToast`'ın `icon` alanı, ikon-only butonlar
(`jenerik-desenler.md`).

## Bilinen Sapma: Bursa CV Projects → Material Symbols (2026-08-23 notu)

Bu karardan (2026-08-21) **sonra**, Bursa CV Projects'in kendi 08.2026 M3 denetiminde
`ICON_PATHS` (`JavaScript.html`) **Lucide'dan Material Symbols'a** (`@material-symbols/
svg-400`, `rounded`, Apache-2.0) çevrildiği görüldü — 51 ikon, gerekçe kodda şöyle yazılı:
"M3'ün birincil ikon ailesi budur ve Workspace ürünleriyle aynı optik dili konuşur." İki karar
da bağımsız birer "M3 referans materyaliyle karşılaştırma" turundan çıktı ve ikisi de kendi
bağlamında savunulabilir (Lucide: framework-agnostik/hafif, Material Symbols: M3'ün kendi
ikon dili + Google Workspace'le görsel tutarlılık).

**Karar (kullanıcı onayıyla, 2026-08-23): Bursa CV Projects'in kodu DEĞİŞTİRİLMEDİ** — mevcut
M3 denetiminin ikon kararı bilinçli ve kalibre edilmiş (51 çağrı yeri, `ICON_PATHS` tek
kaynak) olduğu için Lucide'a geri döndürmek bu çalışmayı geri alırdı. Bu repo hâlâ **yeni**
projeler için Lucide'ı öneriyor (yukarıdaki gerekçelerle), ama bir sonraki karşılaştırmada iki
sistem arasında seçim yapılırken bu not okunmalı: **Material Symbols, özellikle M3'e sıkı
uyum veya Google Workspace add-on'u (`workspace-addon.md`) hedefleniyorsa** meşru bir
alternatif — o zaman `fill="currentColor"`/`viewBox="0 -960 960 960"` mekanik farkını
(Lucide'ın `stroke="currentColor"`/`viewBox="0 0 24 24"`'ünden) hesaba kat, ikisini
karıştırma.
