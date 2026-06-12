# GRUKK: Kemik Çağı 🦴

> Çalışma adı: ürün adı değişirse oyun içi metin ve repo adı ayrıca güncellenebilir.

GitHub Pages yayını: https://alisahindev.github.io/web-game-3/

Tamamen özgün, web'den oynanabilir bir **rogue-lite survival arena** oyunu.
Taş devri arenasında sürüler halinde gelen yaratıklardan kaç, otomatik saldıran
ilkel silahlarını evrimleştir, her run'da farklı bir build kur — düştüğünde bile
kalıcı ilerleme kazan.

## Oynamak

Hiçbir bağımlılık ve build adımı yoktur. İki yol:

```bash
# 1) Doğrudan aç
open index.html

# 2) Veya herhangi bir statik sunucu
python3 -m http.server 8000   # http://localhost:8000
```

## Kontroller

| Girdi | İşlev |
|---|---|
| WASD / Ok tuşları | Hareket |
| Dokunma (mobil) | Dinamik sanal joystick |
| P / Esc | Duraklat |
| Fare/dokunma | Menü ve upgrade kartı seçimi |

Saldırı tamamen otomatiktir.

## Öne çıkanlar

- 5 karakter, 6 silah + 6 efsanevi evrim, 13 pasif, 4 nadirlik kademesi
- 6 düşman tipi, 3 mini boss + fazlı final boss (Fosil Tiran)
- 6 açılabilir arena bölgesi, 3 run modu (5/10/15 dk), Kanlı Ay zorluğu
- Kalıcı ilerleme: Atalar Ağacı (8 node), karakter seviyeleri, başarımlar,
  günlük/haftalık görevler, koleksiyon kitabı (hepsi localStorage'da)
- WebAudio ile sentezlenen tribal müzik ve SFX (hiç ses dosyası yok)
- Mobil uyumlu, erişilebilirlik ayarları (efekt azaltma, sarsıntı kapatma vb.)

## Dosyalar

- [docs/GDD.md](docs/GDD.md) — eksiksiz ürün ve oyun mantığı dokümanı (37 bölüm)
- `index.html`, `css/style.css` — ekranlar ve tema
- `js/data.js` — tüm oyun verileri (silah/düşman/boss/görev/meta dengeleri)
- `js/game.js` — oyun motoru (döngü, savaş, dalga yönetmeni, boss AI)
- `js/ui.js`, `js/meta.js`, `js/audio.js`, `js/main.js`
