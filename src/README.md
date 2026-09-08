# src/ — Valeo RO Aylık Rapor Dashboard'u (Google Apps Script)

**Bağımsız (standalone)** bir Apps Script projesidir. Aylık rapor her ay *yeni bir
spreadsheet* olarak oluşturulduğu için dashboard hiçbir dosyaya bağlı değildir;
dönem → dosya eşlemesini kendisi tutar ve aylık dosyaları **yalnız okur**.

## Dosyalar

| Dosya | Sorumluluk |
|---|---|
| `Code.gs` | `doGet` (web app), `getBootstrap`, `getDashboardData`, cache, ayarlar uçları |
| `PeriodRegistry.gs` | Dönem kaydı (ScriptProperties) + Gmail taraması + günlük tetikleyici |
| `SiteRegistry.gs` | 7 RO / 48 site → sayfa anahtarı eşlemesi, sayfa adı çözümleme |
| `SheetReader.gs` | Bölüm çapası, iki boyutlu sütun/satır haritası, sayı okuma |
| `DateUtil.gs` | `W23` / `April` / `01/2026` → (yıl, ay); ISO hafta Perşembe kuralı |
| `Parser.gs` | Bölüm 3/4 özet okuma + detay proje bloklarının sayımı |
| `SiteParser.gs` | Bir site sayfasını uçtan uca okuyup veri modelini üretir |
| `Index/Stylesheet/Script.html` | Sinoptik ekran, filtre barı, 3 seviye gezinme, koyu mod |

## Veri kuralları (kaynak: kullanıcı talimatı)

- Özet bloklardan **yalnız üç değer**: Bölüm 3 `Budget Year 2026` cirosu (M€),
  Bölüm 4 `Budget Year 2026` ve `Budget YTD` adedi.
- **Diğer her şey** `VS/OES Current Portfolio` (NEW/REMAN) ve `TTM Launch`
  detay tablolarından sayılır.
- `Launch Sheet Date`: **sağ hücre = gerçekleşen**, sol hücre = plan (ciro YTD
  planı için kullanılır). Bir proje YTD'ye ancak *gerçekleşen ay ≤ raporlama ayı*
  ise girer.
- Proje tipi `Type` sütunundan, **değer-tabanlı** bulunur (`P1`/`P10`/`PCO`).
  Değerler bu kümede değilse (REMAN bloklarında `A0/A1/A2` yazıyor) tip kırılımı
  **0** sayılır — uydurma yapılmaz.
- Detay satırları **k€**, Bölüm 3 **M€**: `k€ / 1000 = M€`.
- Boş hücre ≠ `0`. `#REF!` / `#DIV/0!` sayı değil "veri yok" sayılır.

## Kurulum

1. Yeni bir **bağımsız** Apps Script projesi aç, bu klasörü `clasp push` ile gönder
   (`.claude/skills/apps-script-push/`).
2. Web app olarak dağıt (`Deploy > New deployment > Web app`).
3. Aç → **Ayarlar** → *Şimdi tara* (Gmail'den bu ayın dosyasını bulur) →
   *Günlük taramayı kur*.
4. Tarama bulamazsa spreadsheet linkini **Ayarlar → Elle dönem ekle**'ye yapıştır.

## Test

```
node tests/parser-test.js
```

Apps Script global'lerine ihtiyaç duymadan ayrıştırma mantığını sentetik bir
`FUEN_06` sayfası üzerinde doğrular (60 kontrol): bilinen rakamlar (36/19, 1.8 M€,
EMI trendi), TTM YTD kuralı (`W35` sayılmaz), REMAN'ın bozuk `Type` sütunu,
Czechowice çift-RO ayrımı, `#REF!` dayanıklılığı.
