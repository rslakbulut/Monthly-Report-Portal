# Form Kontrolleri (Checkbox, Radio, Switch, Text Field, Textarea)

**Kaynak durumu:** Ne ValeoDashboard ne Bursa CV Projects'te bu kontroller için bir piksel
standardı var — ikisi de tarayıcının varsayılan/tarayıcıya-özgü görünümünü kullanıyor gibi
görünüyor (filtre barındaki `FilterDrop` hariç, o zaten `bilesenler.md`'de ayrı belgeli).
Bu doküman tamamen yeni bir alan: M3 referans materyaliyle (Gemini Notebook, karar-girdisi
PDF'ler) karşılaştırma sonucu 2026-08-18'de eklendi.

Ortak ilke: her kontrolün görsel boyutu küçük kalabilir, ama **dokunma/tıklama hedefi
görünmez bir 48×48px alanla genişletilir** — buton sisteminin aksine (`jenerik-desenler.md`,
"Buton boyutu kasıtlı olarak kompakt bırakıldı" kararı) burada dokunma hedefi eklendi, çünkü
form kontrolleri tipik olarak buton kadar sık yan yana dizilmiyor, yanlış dokunma riski daha
yüksek (ör. checkbox listesi).

## Checkbox

```css
.ctl-checkbox {
  position: relative;
  width: 18px; height: 18px;
  border-radius: 4px;
  border: 1.5px solid var(--border);
  cursor: pointer;
}
.ctl-checkbox::before {   /* görünmez 48×48 dokunma alanı */
  content: ''; position: absolute;
  top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 48px; height: 48px;
}
.ctl-checkbox.checked { background: var(--valeo-blue); border-color: var(--valeo-blue); }
```

## Radio

```css
.ctl-radio {
  position: relative;
  width: 20px; height: 20px;
  border-radius: 50%;
  border: 1.5px solid var(--border);
  cursor: pointer;
}
.ctl-radio::before { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 48px; height: 48px; }
.ctl-radio.checked { border-color: var(--valeo-blue); border-width: 6px; }
```

## Switch / Toggle

```css
.ctl-switch {
  position: relative;
  width: 48px; height: 26px;
  border-radius: 999px;
  background: var(--border);
  cursor: pointer;
}
.ctl-switch::before { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 48px; height: 48px; }
.ctl-switch.on { background: var(--valeo-blue); }
```

Switch genişliği (48px) zaten dokunma hedefiyle örtüşüyor — ayrı bir `::before` genişletmesi
şart değil, yalnız yükseklik yönünde (26px < 48px) eklendi.

## Text Field (Outlined)

```css
.ctl-text {
  width: 100%; box-sizing: border-box;
  height: 56px;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0 14px;
  font-size: 13px;
  background: var(--surface);
}
.ctl-text:focus { border-color: var(--valeo-blue); border-width: 2px; }
```

## Text Field (Filled / alt çizgili varyant)

```css
.ctl-text-filled {
  width: 100%; box-sizing: border-box;
  height: 56px;
  border: none; border-bottom: 1px solid var(--border);
  border-radius: 4px 4px 0 0;
  padding: 0 14px;
  font-size: 13px;
  background: var(--surface-dim);
}
.ctl-text-filled:focus { border-bottom-color: var(--valeo-blue); border-bottom-width: 2px; }
```

## Textarea

```css
.ctl-textarea {
  width: 100%; box-sizing: border-box;
  min-height: 120px;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 10px 14px;
  font-size: 13px;
  resize: vertical;   /* yalnız dikey esneme — yatay büyüme layout'u bozar */
}
```

Varsayılan yükseklik (120px) yaklaşık 500 karaktere kadar taşmadan sığdırıyor — bu bir CSS
kuralı değil, **bir ürün kararı** (karakter sınırı validasyonu ayrıca implemente edilmeli,
bu doküman yalnız görsel varsayılanı belirtir).

## Kullanılmayan Alternatif

`bilesenler.md`'deki `FilterDrop` zaten çoklu-seçim + arama ihtiyacını karşılıyor — burada
tanımlı checkbox/radio, `FilterDrop` gibi bir seçim listesinin **içindeki tek satırlar**
için de kullanılabilir, `FilterDrop`'un yerine geçmez.
