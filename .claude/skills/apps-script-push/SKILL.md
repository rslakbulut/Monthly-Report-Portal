---
name: apps-script-push
description: Bir Google Apps Script (GAS) projesine `clasp` ile kod push etmek/deploy etmek gerektiğinde bu skill'i kullan. Kullanıcı "Apps Script'e gönder", "clasp push", "kodu Sheets/Docs'taki scripte yükle", "değişiklikleri yayınla/deploy et", "canlıya al" gibi bir şey söylediğinde — hedef bir Apps Script/GAS projesiyse (container-bound script, standalone script, add-on) MUTLAKA bu skill'i çalıştır, elle clasp komutlarına girişme. Claude Code web'in bulut konteynerinden (tarayıcısız, her oturumda sıfırlanan) güvenli OAuth girişi + push sırasını yönetir; kimlik dosyasının asla ekrana yazdırılmaması gibi güvenlik kurallarını da uygular.
---

# Apps Script'e Push (Claude Code Web'den)

## Bu skill ne için var

Bir Claude Code web oturumu, kullanıcının kendi bilgisayarında değil Anthropic'in bulut
konteynerinde çalışır. Bu konteynerde tarayıcı yoktur ve oturum bitince tamamen silinir — yani
Google'ın `clasp` CLI'siyle bir Apps Script projesine push edebilmek için her seferinde
sıfırdan kimlik doğrulaması gerekir, üstelik interaktif OAuth adımını kullanıcı kendi
tarayıcısında tamamlamak zorundadır. Bu skill, bu ortam kısıtlarına özel güvenli sırayı
uygular — adımları atlama veya kısaltma, her biri bir öncekinin kurduğu güveni koruyor.

## Bağlam — ilerlemeden önce bil

- Node.js hazır kurulu gelir, `clasp` **kurulu değildir**.
- Konteyner her yeni oturumda sıfırlanır — kurulumun ve girişin oturum başına tekrarlanması
  beklenen davranıştır, kullanıcıya sorun gibi sunma.
- Konteynerde tarayıcı yok: OAuth'un interaktif kısmını kullanıcı kendi tarayıcısında yapar,
  sen yalnızca linki verip karşılığında gelen kodu alırsın.

## 0. Push'tan önce kullanıcıdan al

Aşağıdakiler netleşmeden 1. adıma geçme — sonradan geri dönmek daha pahalıya mal olur:

- Apps Script projesinin sahibi olan Google hesabında **Editör** yetkisi var mı?
- O hesap `script.google.com/home/usersettings` üzerinden **Apps Script API**'yi açtı mı? Bu,
  Sık Çıkan Hatalar tablosundaki en sık rastlanan takılma noktası — sorarken şu iki referans
  görseli `SendUserFile` ile gönder, kullanıcı nereye bakacağını tam görsün (yol, bu skill'in
  kopyalandığı projenin köküne göre): `.claude/skills/apps-script-push/reference/apps-script-settings-full.png`
  (soldaki menüde **Settings** ⚙️'in yeri) ve
  `.claude/skills/apps-script-push/reference/apps-script-api-toggle.png` (**Google Apps Script
  API: On** yakın çekim).
- Kullanıcı bir **gizli sekme** hazırladı mı (yanlış hesabın izin vermesini önlemek için)?
- **`scriptId`** — repoda zaten `.clasp.json` varsa gerekmez, yoksa kullanıcıdan iste.

## 1. clasp'ı kur

```bash
npm i -g @google/clasp
clasp --version
```

Sürüm basılmıyorsa dur, kullanıcıya bildir — devam etme.

## 2. Hedef projeyi doğrula

```bash
cat .clasp.json
```

- Varsa içindeki `scriptId` kullanılır, dokunma.
- Yoksa 0. adımdaki `scriptId` ile oluştur: `echo '{"scriptId":"...","rootDir":"."}' > .clasp.json`
- `scriptId` de yoksa kullanıcıdan iste ve bekle.

## 3. Giriş linkini üret, sonra DUR

```bash
clasp login --no-localhost
```

Bu komut bir yetkilendirme linki basar. Linki kullanıcıya **olduğu gibi** göster ve **dur** —
kullanıcı sana bir kod/URL verene kadar başka hiçbir komut çalıştırma. Ona şunu söyle:

> Bu linki **gizli sekmede** aç, doğru hesapla giriş yap, izin ver. Sonra karşına çıkan kodu
> — sayfa açılmazsa adres çubuğundaki tam adresi — bana yapıştır.

## 4. Girişi tamamla

Kullanıcı kod veya URL verdiğinde: URL ise `code=` parametresini ayıkla, yalnız kodu kullan;
bekleyen `clasp login` komutuna geç. Doğrula:

```bash
ls -la ~/.clasprc.json
```

Yalnız **var olup olmadığını** doğrula — içeriğini asla yazdırma (bkz. Güvenlik Kuralları).

## 5. Ne gönderileceğini göster, onay al

```bash
clasp status
```

Gönderilecek dosyaları listele, kullanıcıdan **tek bir açık onay** iste. Onay gelmeden 6.
adıma geçme — push canlı projenin üzerine yazar, geri alması senin elinde değil.

## 6. Push et

```bash
clasp push
```

Sonucu kısaca özetle: kaç dosya gitti, hata var mı.

## Güvenlik Kuralları — İstisnasız

`~/.clasprc.json` bir parola gibidir: içindeki anahtar, o Google hesabı adına Apps Script
projelerini açma/değiştirme/yayına alma yetkisi taşır. Bu yüzden:

- İçeriğini **asla** ekrana yazdırma, kopyalama veya repo klasörüne taşıma — yalnız `ls` ile
  varlığını doğrula.
- Repo klasörünün **dışında** kalmalı.
- Commit atmadan önce `git status` çalıştır; `.clasprc.json` listede görünürse commit **etme**,
  `.gitignore`'a ekle ve kullanıcıyı uyar.
- Push hatası alırsan kimlik dosyasını elle taşıyarak/yeniden yazarak "düzeltmeye" çalışma —
  bu dosyanın kendi kendine bozulması nadir, çoğu hata (aşağıdaki tablo) başka bir sebepten
  gelir. Hatayı olduğu gibi bildir.

**Bu kurallar artık mekanik olarak da uygulanıyor** — aynı repodaki `.claude/settings.json`
(`.claude/hooks/guard-clasprc-*.sh`) `.clasprc.json` içeriğini okuyan/yazdıran komutları ve
onu commit etmeye çalışan `git add`/`git commit`'i PreToolUse hook'uyla engeller. Bu skill'i
kopyalarken `.claude/hooks/` ve `.claude/settings.json`'ı da birlikte kopyala — yalnız
SKILL.md'yi almak koruma katmanını atlamış olur.

## Sık Çıkan Hatalar

| Hata mesajı | Sebep | Çözüm |
|---|---|---|
| `User has not enabled the Apps Script API` | Hedef hesapta API kapalı | `script.google.com/home/usersettings` → aç, 1-2 dk bekle, tekrar dene |
| `Requested entity was not found` | scriptId yanlış, ya da hesabın o projede yetkisi yok | scriptId'yi ve Editör yetkisini kontrol et |
| `403` / `insufficient authentication` | İzni yanlış Google hesabı verdi | Gizli sekmede, doğru hesapla `clasp login` adımını tekrarla |
| `command not found: clasp` | Yeni oturum açılmış, kurulum silinmiş | 1. adımı tekrarla |
| `admin has disabled` / `blocked` | Kurumsal Workspace kısıtlaması | O hesapla clasp kullanılamaz; yetkisi olan başka bir hesap gerekir |

## Kalıcı Değil

Bu akış her yeni oturumda tekrarlanır — kurulum ve kimlik dosyası konteynerle birlikte gider.
Sık push edilecekse daha kalıcı yol: kod GitHub'a gönderilir, kullanıcı kendi bilgisayarından
`git pull` + `clasp push` yapar — anahtar hep kullanıcının bilgisayarında kalır, bu skill'e
oturum başına ihtiyaç kalmaz.

## Kaynak

Bu dosya tek kaynaktır — önceki ayrı insan-okur kopyası `docs/apps-script-push.md` 2026-09-02'de
kaldırıldı (bkz. `docs/karar-gecmisi.md`); iki dosyayı senkron tutma zorunluluğu bu şekilde
ortadan kalktı.
