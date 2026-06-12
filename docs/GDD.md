# GRUKK: Kemik Çağı — Ürün ve Oyun Mantığı Dokümanı

Tür: Rogue-lite survival arena + upgrade seçimi + kısa run sistemi
Tema: Caveman Survivor (Taş Devri)
Platform: Web (masaüstü + mobil tarayıcı)
Versiyon: 1.0 (MVP — bu dokümandaki her sistem implement edilmiştir)

---

# 1. Oyun Özeti

GRUKK, kısa seanslı bir rogue-lite survival arena oyunudur. Oyuncu bir taş devri
avcısını kontrol eder; dalgalar halinde gelen tarih öncesi yaratıklardan kaçar,
karakteri otomatik saldırır, düşen XP taşlarını toplar, level atladıkça 3 upgrade
arasından seçim yaparak her run'da farklı bir build kurar. Mini boss'lar ve final
boss run'ın zirveleridir. Ölüm run'ı bitirir ama coin, karakter XP'si, görev ve
başarım ilerlemesi kalıcıdır — oyuncu her seferinde biraz daha güçlü döner.

Oyun hissi:
- 10 saniye içinde oynanır hale gelir, ilk dakikada ilk level up gelir.
- Sürekli güçlenme eğrisi: her dakika yeni bir silah, evrim veya sinerji.
- Ekran kaotikleşir ama silüetler, renk kodları ve net pickup'lar sayesinde okunur kalır.
- Run bittiğinde kalıcı ödül ekranı "bir run daha" dedirtir.

Özgünlük ilkesi: tür mantığı dışında hiçbir şey kopyalanmaz. İsimler, dünya,
düşmanlar, silahlar, UI dili ve upgrade isimleri tamamen bu dokümana özgüdür.

---

# 2. Özgün İsim Önerileri

1. **GRUKK: Kemik Çağı** ← seçilen isim (kısa, ilkel bir savaş narası gibi; akılda kalır)
2. Kor & Kemik
3. Avkor
4. Son Ateş
5. Obsidyen Av
6. Taşkan
7. Mağara Yankısı
8. Külboynuz
9. İlk Avcı: Sürü Gecesi
10. Ugra'nın Çağrısı
11. Fosil Fırtınası
12. Kemikdöven

Seçim gerekçesi: "GRUKK" tek hecede ilkel güç hissi verir, hiçbir mevcut oyuna
benzemez, web sekme başlığında ve logoda güçlü durur. Alt başlık "Kemik Çağı"
dünyayı tek bakışta anlatır.

---

# 3. Hedef Kitle

Kısa seans seven, rogue-lite ve build kurma motivasyonu yüksek, web/mobilde
hızlı oyun arayan casual-core oyuncular.

| Oyuncu Tipi | Ne ister? | Neden döner? | Nerede sıkılır? | Onu tutan sistem |
|---|---|---|---|---|
| 1. Hayatta kalmacı | Basit kontrol, net tehlike okuma | "Bu sefer 1 dk daha dayanırım" | Haksız ölümde | Adil hasar kuralları, düşük can uyarısı, kalıcı can/zırh upgrade'leri |
| 2. Build denemeci | Farklı silah/pasif kombinasyonları | Denemediği sinerji kaldıkça | Seçenekler tekrara düşünce | 6 silah × 6 evrim × 13 pasif, karakter pasifleri, reroll |
| 3. Skor avcısı | Ölçülebilir performans | Rekor kırma isteği | İlerleme görünmezse | Run sonu istatistikleri, kill sayacı, süre rekoru, Kanlı Ay zorluk modu |
| 4. Kalıcı gelişim kasıcısı | Her run'dan somut kazanç | Atalar Ağacı'nda sıradaki node | Grind duvara dönüşürse | Dengeli coin ekonomisi, görev ödülleri, karakter XP seviyeleri |
| 5. Boss kesici | Okunabilir, adil, epik boss'lar | Yenemediği boss'u yenmek | Boss tekrara düşerse | 4 farklı boss, fazlı final boss, boss sandık ödülleri, zafer ekranı |

---

# 4. Ana Oyun Vaadi

**"Kemik Çağı arenasında sürüler halinde gelen yaratıklardan kaç, ilkel
silahlarını kadim formlarına evrimleştir, her run'da bambaşka bir build kur —
düştüğünde bile kabilen güçlensin."**

---

# 5. Core Game Loop

1. Oyuncu karakter, arena ve run modu seçer.
2. Run başlar; karakter anında hareket edebilir.
3. Oyuncu sadece hareketi kontrol eder; saldırılar otomatiktir.
4. Düşmanlar dalga dalga, her yönden gelir.
5. Ölen düşmanlar XP taşı, coin ve nadir pickup düşürür.
6. Oyuncu XP taşlarını toplar; pickup yarıçapı taşları kendine çeker.
7. XP barı dolunca level atlanır; oyun durur.
8. 3 upgrade kartından biri seçilir (nadirlik renkleri ile).
9. Build güçlenir; silahlar max seviyede doğru pasifle **evrimleşir**.
10. Zaman ilerledikçe yeni düşman tipleri ve yoğunluk artışı gelir.
11. %30 ve %60'ta mini boss, %80'de Kristal Ana, %100'de final boss.
12. Mini boss'lar sandık düşürür: coin + bedava upgrade kartı.
13. Oyuncu ölürse (revive yoksa) run biter; final boss ölürse zafer.
14. Run sonu ekranı: süre, kill, coin, build özeti, kalıcı kazanımlar.
15. Coin'ler Atalar Ağacı'na, XP karakter seviyesine yazılır; yeni run daha güçlü başlar.

Döngü tasarım hedefleri: ilk karar 30. saniyede; ölüm anında bile "ne kazandım"
ekranı; her run'da en az bir "keşke şunu seçseydim" anı.

---

# 6. Run Süresi

| Mod | Süre | Açılma koşulu | Kullanım |
|---|---|---|---|
| Hızlı Av | 5 dk | Baştan açık | Mola arası, mobil seans |
| Standart Av | 10 dk | Baştan açık (varsayılan, MVP odağı) | Ana deneyim |
| Uzun Av | 15 dk | Final boss'u 1 kez yen | Build'i sonuna kadar zorlama |

Tüm zaman çizelgesi orana bağlıdır (boss %30/%60/%80/%100), bu yüzden üç mod da
aynı dramatik eğriyi korur. Standart (10 dk) ritmi:

- **0–1 dk:** seyrek Küçük Sürüngen; ilk level up ~30–45 sn; temel saldırı öğrenilir.
- **1–3 dk:** Taş Böceği ve Uçan Yarasa girer; ikinci silah açılır; ilk sinerji.
- **3. dk:** Mini boss **Mağara Devi** + sandık ödülü; ardından 15 sn nefes alma.
- **3–5 dk:** Lav Kurdu girer; yoğunluk tırmanır; %45'te sürü baskını (çember spawn).
- **5–6 dk:** Kemik Devriyesi (zırhlı) girer.
- **6. dk:** Mini boss **Lav Dişli**; sonrası nefes alma.
- **6–8 dk:** Kristal Tüküren (menzilli) girer; %75'te ikinci sürü baskını; evrimler oturur.
- **8. dk:** **Kristal Ana** (çağırıcı mini boss).
- **8–10 dk:** final baskısı; maksimum yoğunluk.
- **10. dk:** Final boss **Fosil Tiran**; normal spawn durur; öldürülürse zafer.

Kural: zorluk testere dişi gibi artar — her zirveden sonra kısa nefes alma ve XP
toplama penceresi bırakılır.

---

# 7. Kontrol Mantığı

Oyuncu **sadece hareketi** kontrol eder.

- Klavye: WASD ve ok tuşları (ikisi de aktif).
- Mobil: ekranın herhangi bir yerine bas-sürükle ile dinamik sanal joystick.
- P / Esc: duraklat. Level up kartları fare/dokunma ile seçilir.

Saldırı tamamen otomatiktir; nişan alınmaz:
- Kemik Mızrak ve Lav Topu **en yakın düşmana** gider.
- Taş Balta oyuncunun **çevresinde döner**.
- Kıvılcım Taşı menzildeki düşmanlar arasında **zincirlenir**.
- Ruh Dalgası oyuncudan **halka** olarak yayılır.
- Fosil Tuzak oyuncunun **geçtiği yere** bırakılır (hareket yönüne göre çalışır).

Neden: oyun 10 saniyede öğrenilir, tek elle/tek parmakla oynanır; asıl beceri
konumlanma ve asıl karar upgrade seçimidir.

---

# 8. Kamera ve Arena

Kamera: oyuncuyu yumuşak lerp ile takip eder; shake yalnızca patlama/boss
vuruşlarında kısa ve düşük şiddettedir (ayarlardan tamamen kapatılabilir).

Arena: 4000×4000 birimlik açık alan; kenarlarda görsel duvar halkası. Düşmanlar
her yönden, ekran dışı bir halkadan spawn olur. Az sayıda (≈12) iri kaya/kemik
engeli taktik alan yaratır; uçan düşmanlar engelleri yok sayar.

| # | Bölge | Palet/his | Açılma |
|---|---|---|---|
| 1 | Taş Ovası | Sıcak gri-amber, dağınık kayalar | Baştan açık |
| 2 | Kemik Ormanı | Kemik beyazı dikitler, koyu toprak | 2 run oyna |
| 3 | Lav Çukuru | Lav kırmızısı damarlar, kül zemini | 4 run oyna |
| 4 | Kristal Mağara | Kristal mavisi parıltılar, mor gölge | 6 run oyna |
| 5 | Fosil Bataklığı | Yosun yeşili, batık kemikler | 8 run oyna |
| 6 | Ay Taşı Tapınağı | Mağara moru, soluk ay taşları | 10 run oyna |

Arena kuralları: oyuncu duvara sıkışmaz (duvarlar uzak, engeller seyrek);
engeller saklanma değil sürü bölme aracıdır; yoğunluk artarken her zaman en az
bir kaçış koridoru kalacak şekilde spawn yönleri dağıtılır.

---

# 9. Karakterler

| Karakter | Rol | Başlangıç silahı | Can | Hız | Pasif | Açılma |
|---|---|---|---|---|---|---|
| **Karg — Taş Avcısı** | Dengeli, yeni oyuncu dostu | Kemik Mızrak | 100 | %100 | Yok (saf denge) | Baştan açık |
| **Velna — Ateş Toplayıcı** | Alan hasarı, kırılgan | Lav Topu | 75 | %100 | Alan +%15, hasar +%10 | 300 coin |
| **Odu — Kemik Şaman** | Yavaş ama bilge | Ruh Dalgası | 110 | %85 | XP kazanımı +%20 | 500 coin |
| **Sek — Mağara Koşucusu** | Hız ve kaçış | Kıvılcım Taşı | 85 | %125 | Pickup +%20, hasar −%15 | 750 coin |
| **Bruk — Kristal Kırıcı** | Tank, yakın alan | Taş Balta | 150 | %85 | Zırh +2, hasar +%10 | 1000 coin |

Her karakterin run içinde topladığı XP, kalıcı **karakter seviyesine** yazılır;
her karakter seviyesi o karaktere +%1 hasar verir (maks 10).

---

# 10. Ana Silahlar

Hepsi otomatik; her biri farklı bir iş yapar (tek hedef / kalabalık / savunma /
alan kontrolü). Aynı anda en fazla 4 silah taşınır.

| Silah | Davranış | Rolü |
|---|---|---|
| **Kemik Mızrak** | En yakın düşmana fırlar, seviyeyle delme ve adet kazanır | Tek hedef / boss hasarı |
| **Taş Balta** | Oyuncunun çevresinde döner, temas eden düşmanı keser | Yakın savunma |
| **Lav Topu** | Yavaş gider, ilk temasta alan patlaması | Kalabalık temizleme |
| **Kıvılcım Taşı** | En yakın düşmana çakar, hedefler arasında zıplar | Zincir / dağınık sürü |
| **Ruh Dalgası** | Aralıklı genişleyen halka; hasar + geri itme | Güvenli alan yaratma |
| **Fosil Tuzak** | Yere tuzak bırakır; üstünden geçen düşmanda patlar | Alan kontrolü / kaçış |

Açılma: Mızrak, Balta, Lav Topu ve Ruh Dalgası baştan havuzdadır.
**Kıvılcım Taşı** ilk mini boss öldürülünce, **Fosil Tuzak** bir run'da 8 dakika
hayatta kalınca kalıcı olarak havuza eklenir (koleksiyonda açılma ipucu yazar).

Her silahın 5 seviyesi vardır; seviyeler hasar/adet/hız/alan kazandırır.

---

# 11. Silah Evrimleri

Bir silah **5. seviyeye** ulaşır ve **eşleşik pasif** oyuncuda varsa, sonraki
level up'ta **Legendary evrim kartı** çıkabilir.

| Silah + Pasif | Evrim | Etki |
|---|---|---|
| Kemik Mızrak + Keskinlik | **Dev Avcı Mızrağı** | Dev mızrak, tüm sürüyü deler, boss'a yüksek hasar |
| Taş Balta + Dönüş Hızı | **Fırtına Baltası** | Daha çok balta, daha hızlı ve geniş yörünge |
| Lav Topu + Patlama Gücü | **Volkan Çekirdeği** | Büyük patlama + yerde yanan lav alanı bırakır |
| Kıvılcım Taşı + Zincirleme | **Gök Gürültüsü Fosili** | Çok daha fazla hedefe sıçrar, hasar artar |
| Ruh Dalgası + Ruh Gücü | **Ataların Çığlığı** | Dev halka; sürüyü uzağa savurur |
| Fosil Tuzak + Tuzak Ustası | **Kemik Mayın Tarlası** | Aynı anda çok daha fazla, daha güçlü tuzak |

Evrim sinerjisi level up kartında **"⚡ Evrim sinerjisi"** rozetiyle işaretlenir;
oyuncu evrime yaklaştığını her zaman bilir.

---

# 12. Upgrade Sistemi

Level atlayınca oyun durur, 3 kart gelir. Kart türleri:

**Silah kartları:** yeni silah aç / mevcut silahı +1 seviye / (koşullar uygunsa) evrim.

**Stat/pasif kartları** (taş devri diliyle adlandırılmış, kademeli):

| Pasif | Stat | Pasif | Stat |
|---|---|---|---|
| Keskinlik | Hasar + | Mamut Derisi | Maks can + |
| Dönüş Hızı | Saldırı hızı + | Taş Kabuk | Zırh + |
| Patlama Gücü | Etki alanı + | Toplayıcı İçgüdü | Pickup mesafesi + |
| Zincirleme | Zincir hedefi +1, kritik + | Avcı Gözü | Kritik şansı + |
| Ruh Gücü | İtme + alan + | Kadim Bilgi | XP kazanımı + |
| Yel Ayakları | Hareket hızı + | Şifalı Yosun | Can yenileme + |
| Tuzak Ustası | Tuzak/mermi adedi + | | |

**Nadirlik:** Common (kemik beyazı) %58 · Rare (kristal mavi) %26 · Epic (mağara
moru) %12 · Legendary (amber/altın) %4. Nadirlik stat kartlarında bonusun
büyüklüğünü belirler (ör. Keskinlik: +%10 / +%15 / +%22 / +%32). Evrim kartları
her zaman Legendary'dir. Renk + çerçeve + kısa parlama ile anlaşılır; casino
hissi verecek aşırı animasyon yoktur.

Seçim kuralları: aynı elde aynı kart iki kez çıkmaz; havuz boşalırsa "Et Ziyafeti
(%30 can)" ve "Çakıl Kesesi (+50 coin)" yedek kartları gelir; çöp seçenek yoktur.
Atalar Ağacı'ndan **reroll hakkı** alındıysa kartlar yeniden çevrilebilir.

---

# 13. Build Mantığı

Her build kazanabilir; tek doğru build yoktur. Örnek arketipler:

| Build | Çekirdek | Güçlü | Zayıf |
|---|---|---|---|
| **Mızrak Avcısı** | Dev Avcı Mızrağı + Keskinlik + Avcı Gözü | Boss eritme | Çevresel sürü |
| **Lav Patlatıcı** | Volkan Çekirdeği + Patlama Gücü + Kadim Bilgi | Kalabalık silme | Yavaş açılış |
| **Hızlı Kaçak** | Yel Ayakları + Toplayıcı İçgüdü + Fosil Tuzak | Uzun yaşam, XP kasma | Düşük anlık hasar |
| **Ruh Şamanı** | Ataların Çığlığı + Ruh Gücü + Mamut Derisi | Güvenli alan, kontrol | Menzilli düşman |
| **Kritik Avcı** | Kıvılcım evrimi + Avcı Gözü + Zincirleme | Patlayıcı hasar | Riskli, kırılgan |

Sinerji ödüllendirilir (evrimler, zincir+kritik, itme+tuzak) ama kötü seçim ani
ceza getirmez — her silah tek başına da işlevseldir.

---

# 14. Düşmanlar

| Düşman | Silüet/renk | Davranış | Giriş (10 dk normunda) |
|---|---|---|---|
| **Küçük Sürüngen** | Küçük yeşil, sivri kuyruk | Hızlı, zayıf, düz saldırır | 0:00 |
| **Taş Böceği** | Yuvarlak gri kabuk | Yavaş, dayanıklı, iter | 1:00 |
| **Uçan Yarasa** | Mor kanat, dalgalı uçuş | Engelleri yok sayar, direkt gelir | 2:00 |
| **Lav Kurdu** | Turuncu boğumlu gövde | Orta hız, temas hasarı yüksek | 3:30 |
| **Kemik Devriyesi** | Kemik beyazı, kalkanlı | Zırhlı (sabit hasar emer) | 5:00 |
| **Kristal Tüküren** | Mavi kristal sırt | Mesafe korur, kristal tükürür | 6:00 |

Okunabilirlik kuralları: her tip farklı **şekil + renk** ile ayrışır; tehlikeli
olanlar (Lav Kurdu, Tüküren mermisi) sıcak/parlak renktedir; hiçbir düşman
ekranda kaybolacak kadar küçük çizilmez; sürü yoğunken bile ayrışma korunur
(azaltılmış efekt modu vardır).

---

# 15. Boss Sistemi

| Boss | Zaman | Davranış | Adalet kuralı |
|---|---|---|---|
| **Mağara Devi** (mini) | %30 | Yavaş yürür, hedef noktaya **yer sarsma** vurur, köşeye sıkıştırmaya çalışır | Sarsma alanı 0.9 sn önceden kırmızı haleyle gösterilir |
| **Lav Dişli** (mini) | %60 | Kısa **dash** saldırıları yapar; sürekli hareket zorunlu | Dash hattı 0.6 sn önceden çizgiyle gösterilir |
| **Kristal Ana** (mini) | %80 | Küçük düşman çağırır, çevresine kristal mermi halkası saçar | Mermiler yavaş ve görünür; çağrılanlar ekstra XP verir |
| **Fosil Tiran** (final) | %100 | 3 faz: (1) takip + sarsma, (2) %66 altı: sürü çağırır, (3) %33 altı: öfke — dash + 12 yönlü mermi | Her saldırı telegraflı; faz geçişi kükremeyle duyurulur |

Boss girişinde isimli can barı ve kükreme; normal spawn durur/azalır. Mini boss
**sandık** düşürür: +40 coin ve **bedava upgrade kartı seçimi**. Final boss
ölünce zafer ekranı + büyük coin ödülü + zorluk/mod kilidi açılır. Boss'lar
geri itmeden büyük ölçüde etkilenmez ama yavaşlatma çalışır.

---

# 16. Dalga Sistemi

Spawn yönetmeni iki katmanlıdır:

1. **Sürekli akış:** saniye başına spawn oranı `0.8 → 4.2` arasında zamanla
   tırmanır; canlı düşman tavanı 230'dur (azaltılmış efekt modunda 160).
2. **Olaylar:** %30/%60/%80/%100 boss'ları; %45 ve %75'te **sürü baskını**
   (oyuncunun etrafına çember halinde 36–44 hızlı düşman); her boss sonrası
   15 sn düşük yoğunluk (nefes alma + XP toplama penceresi).

Düşman statları normalize zamana göre ölçeklenir: can ×1'den ×~5.4'e, hasar
×1'den ×~2.2'ye. Tip seçimi, girmiş tiplere zaman ağırlıklı rastgeledir; yeni
giren tip ilk 30 sn daha sık gelir ki oyuncu onu izole şekilde öğrensin.

---

# 17. XP ve Level Sistemi

- Düşmanlar değerine göre küçük (1), orta (5), büyük (20) **XP taşı** düşürür.
- Pickup yarıçapı (taban 70 birim) taşları oyuncuya çeker; stat ve meta ile büyür.
- Mini boss ve sandıklar büyük taş kümeleri saçar.
- Level eşiği: `8 + 7·(L−1) + 1.6·(L−1)^1.9` — ilk level ~30–45 sn'de, orta
  oyunda dengeli, sonlara doğru her seçim daha değerli.
- Level atlayınca oyun durur → 3 kart → seçim → devam. Birden çok level
  birikirse kartlar sırayla gelir.

---

# 18. Can ve Hasar Sistemi

- Hasar kaynakları: temas, boss alan vuruşu, boss dash'i, kristal mermi, lav alanı.
- Zırh gelen hasarı sabit düşürür (her zaman en az 1 hasar geçer).
- Hasar alınca: 0.6 sn dokunulmazlık, beyaz flaş, kısa titreşim, ekran kenarı kızarması.
- **Düşük can (%30):** kalp atışı sesi + nabız gibi atan kırmızı vinyet (renk
  körlüğü için animasyon da var, sadece renk değil).
- Can yenileme: Et Parçası pickup'ı (%20 can), Şifalı Yosun pasifi (sn başına),
  boss sandığı.
- Ölünce: Ata Nefesi (revive) varsa %50 canla patlama eşliğinde dönüş; yoksa
  kısa ağır çekim → run sonu.

Kural: oyuncu neden öldüğünü her zaman bilir — tüm büyük vuruşlar telegraflı,
temas hasarı görsel olarak nettir, "haksız ölüm" hissi yaratan ani görünmez
hasar yoktur.

---

# 19. Pickup Sistemi

| Pickup | Görsel | Etki |
|---|---|---|
| **XP Taşı** | Yeşil/mavi/amber elmas (boyut=değer) | Level ilerlemesi |
| **Coin** | Altın çakıl | Kalıcı para (run sonunda cüzdana) |
| **Et Parçası** | Kemikli et | %20 can yeniler |
| **Manyetik Kemik** | Parlayan kemik | Haritadaki tüm XP taşlarını çeker |
| **Patlama Totemi** | Turuncu totem | Ekrandaki düşmanlara büyük hasar (boss'a yarısı) |
| **Zaman Fosili** | Mavi fosil | 5 sn tüm düşmanları yavaşlatır |

Kurallar: pickup'lar zeminden parlaklık ve hafif salınımla ayrışır; XP taşları
küçük ama ışıltılıdır; nadir pickup'lar (son üçü) düşük oranda düşer ve run
başına sınırlıdır; toplama anında ses perdesi art arda toplamada yükselir
(toplama tatmini).

---

# 20. Kalıcı İlerleme

Run sonunda kazanılanlar: coin, karakter XP'si, başarı puanı, görev ilerlemesi,
silah/karakter/bölge kilitleri, koleksiyon kayıtları.

**Atalar Ağacı** (coin ile kalıcı upgrade):

| Node | Etki/seviye | Maks | Maliyet eğrisi |
|---|---|---|---|
| Mamut Yüreği | Başlangıç canı +10 | 5 | 50→400 |
| Keskin Miras | Hasar +%4 | 5 | 60→480 |
| Uzun Kollar | Pickup mesafesi +%8 | 5 | 40→320 |
| Parlak Göz | Coin kazanımı +%6 | 5 | 50→400 |
| Kadim Ruh | XP kazanımı +%5 | 5 | 60→480 |
| Yeniden Fırlat | Run başına +1 reroll | 2 | 150, 350 |
| Usta Eller | Başlangıç silahı +1 seviye | 2 | 200, 500 |
| Ata Nefesi | Run başına +1 revive | 1 | 600 |

Kural: kalıcı güçlenme **destekler ama çözmez** — toplam katkı orta oyunda
hissedilir, run içi kararların yerini asla almaz.

---

# 21. Meta Progression

- **Karakter açma:** 4 karakter coin ile (300–1000).
- **Silah açma:** 2 silah oyun içi başarıyla (mini boss kes / 8 dk yaşa).
- **Pasif upgrade ağacı:** Atalar Ağacı (8 node).
- **Başarımlar:** 12 başarım + başarı puanı.
- **Günlük görevler:** her gün 3 görev (tarih tohumlu, herkes için aynı gün aynı set).
- **Haftalık challenge:** her hafta 2 büyük görev.
- **Zorluk modu:** **Kanlı Ay** (düşman canı +%40, hasarı +%30; coin +%25) — final boss yenilince açılır.
- **Koleksiyon kitabı:** silahlar/evrimler, yaratıklar, boss'lar — görüleni kaydeder.

Dönüş motivasyonları: yeni build denemek, rekor kırmak, sıradaki node/karakter,
günlük görev ödülü, koleksiyonu tamamlamak, Kanlı Ay'da zafer.

---

# 22. Görevler

**Günlük havuz** (her gün 3'ü seçilir): 5 dk hayatta kal · 500 düşman öldür ·
bir run'da 8 seviye atla · 1 mini boss öldür · 200 coin topla · Lav Topu ile
100 düşman öldür · 2 run tamamla · 1500 XP topla. Ödül: 25–40 coin.

**Haftalık havuz** (her hafta 2'si seçilir): 10 run tamamla · final boss'u 3 kez
yen · 10.000 düşman öldür · 3 farklı karakterle run oyna · 2 silah evrimleştir.
Ödül: 150–250 coin.

Görevler otomatik takip edilir, tamamlanınca anlık bildirimle ödül yazılır;
oyuncuyu farklı silah/karakter/sistemlere yönlendirir, grind hissi vermez.

---

# 23. Ekranlar

1. Loading (kısa, ipucu metinli)
2. Ana Menü
3. Karakter Seçimi (+ arena bölgesi ve run modu seçimi)
4. Koleksiyon Kitabı (silahlar / yaratıklar / başarımlar sekmeleri)
5. Atalar Ağacı (kalıcı upgrade)
6. Run Başlangıç (karakter ekranından tek dokunuşla)
7. Oyun Ekranı
8. Level Up Seçim Ekranı
9. Pause
10. Run Sonu Ekranı (yenilgi dili: suçlamayan)
11. Boss Zafer Ekranı (final boss zaferi + mini boss devrilme bandı)
12. Günlük Görevler
13. Haftalık Challenge (görevler ekranında ikinci bölüm)
14. Ayarlar
15. Nasıl Oynanır

---

# 24. HUD Mantığı

- Sol üst: can barı (+ sayı), seviye rozeti.
- Üst orta: XP barı (ince, tam genişlik) ve süre.
- Sağ üst: kill sayacı, run coin'i, pause butonu.
- Sol alt: silah ikonları + seviye noktaları (evrimleşen ikon altın çerçeve alır).
- Boss aktifken üstte isimli boss can barı.
- Mini map yok (bilinçli karar — tüm tehdit ekranda okunur).

HUD ekranın %10'undan azını kaplar; savaş alanını kapatmaz; düşük can durumu
HUD + vinyet + ses ile üç kanaldan bildirilir; level up anı parlama ve ses ile
güçlü hissettirilir.

---

# 25. Level Up Ekranı

Oyun durur → karanlık perde → 3 kart kayarak gelir. Kartta: ikon, ad, kısa
açıklama, nadirlik (renk + etiket), mevcut build ile **evrim sinerjisi rozeti**.
Reroll hakkı varsa altta "Yeniden Çevir (n)" butonu. Kartlar mobilde büyük,
tek dokunuşla seçilir. Örnek kartlar: "Kemik Mızrak Sv.3", "Lav Topu'nu Aç",
"Yel Ayakları +%9", "Toplayıcı İçgüdü +%22", "Mamut Derisi +32", "⚡ EVRİM:
Fırtına Baltası".

---

# 26. Run Sonu Ekranı

Gösterilen: sonuç başlığı, hayatta kalma süresi, öldürülen düşman, kazanılan
coin (meta çarpanıyla), ulaşılan seviye, en çok hasar veren silah, run'daki tüm
silah/pasif listesi, açılan başarım/kilitler, kalıcı ilerleme satırı, "Tekrar
Av'a Çık" ve "Mağaraya Dön" butonları.

Yenilgi dili suçlamaz: **"Av bitti. Ama kemikler güçlendi."** — altında somut
kazanım listesi. Zaferde: **"Fosil Tiran devrildi. Sürünün efsanesi sensin."**

---

# 27. Görsel Stil

Premium casual/indie, "okunabilir kaos". Güçlü silüetler, sıcak mağara tonları,
basit ama karakterli prosedürel çizimler.

Palet: amber `#e8a33d` · lav kırmızısı `#e05038` · kemik beyazı `#e8dcc8` ·
taş grisi `#8a8278` · yosun yeşili `#7a9a5a` · kristal mavi `#6ec3d8` ·
mağara moru `#8a6aa8` · zemin koyu sıcak kahve tonları.

Kaçınılanlar: aşırı karanlık sahne, düşmanı örten efekt, okunmayan minik obje,
plastik/çocuksu görünüm. Efekt yoğunluğu sınırlandırılmıştır ve "azaltılmış
efekt" modu vardır.

---

# 28. Animasyon ve Hissiyat

Karakter yürüme salınımı ve yön dönüşü; silahların fırlatma/dönme/patlama
animasyonları; düşman vuruş flaşı + ölüm parçacığı; XP taşının oyuncuya
ivmelenerek çekilmesi; level up halka patlaması; boss giriş kükremesi + isim
bandı; düşük can nabız vinyeti; kart seçiminde parlama; zaferde altın parçacık
yağmuru. Hissiyat hedefleri: kesmek tok, toplamak bağımlılık yapıcı, güçlenme
her dakika hissedilir, boss korkutucu ama adil.

---

# 29. Ses ve Müzik

Tüm sesler ilkel dile uyar: kemik tıkırtısı, taş çarpması, davul, mağara
yankısı, lav patlaması.

Ses olayları: saldırı (silah başına ayrı karakter), düşman hasarı, düşman
ölümü, XP toplama (art arda toplamada yükselen perde), coin, level up, kart
seçimi, boss girişi (kükreme), düşük can (kalp atışı), oyuncu hasarı, ölüm,
zafer.

Müzik: ritmik tribal davul döngüsü + pentatonik kemik flütü motifi; tempo run
ilerledikçe ve boss'ta yükselir; dikkat dağıtmayan düşük miks. SFX ve müzik
ayrı ayrı kapatılabilir/kısılabilir.

---

# 30. Mobil/Web UX

Tek elle oynanır (dinamik joystick + otomatik saldırı); level up kartları büyük
ve dokunma dostu; run kısa; ölümden yeni run'a 2 dokunuş; menüler tek sütun
mobil düzene iner; düşük cihaz için azaltılmış efekt modu (daha az parçacık,
daha düşük düşman tavanı); sekme arka plana geçince otomatik pause.

---

# 31. Erişilebilirlik

Düşman ve pickup'lar renk **ve** şekil ile ayrışır; can barı büyük ve sayılı;
düşük can uyarısı renk + animasyon + ses (üç kanal); animasyon/efekt azaltma
modu; ekran sarsıntısı kapatma; hasar sayılarını kapatma; SFX/müzik ayrı ses
kontrolü; büyük dokunma hedefleri; yüksek kontrastlı okunur tipografi.

---

# 32. İlk 5 Dakika Deneyimi

- **0–10 sn:** Menüde tek büyük buton → karakter hazır seçili → "Av'a Çık".
  Oyun açılır açılmaz karakter hareket eder; ekranda 2 satırlık kontrol ipucu.
- **10–30 sn:** İlk sürüngenler ölür, ilk XP taşları çekilir, toplama sesi oturur.
- **30–60 sn:** İlk level up → ilk 3 kart → ilk build kararı.
- **1–3 dk:** İkinci silah açılır, sürü kalabalıklaşır, ilk sinerji hissedilir.
- **3–5 dk:** Mağara Devi gelir; telegraf öğrenilir; sandık + bedava kart ödülü.

İlk 5 dakikada: ödeme yok, reklam yok, uzun tutorial yok, karmaşık menü yok.

---

# 33. İlk Gün Deneyimi

İlk run → ilk ölüm ("Av bitti. Ama kemikler güçlendi.") → run sonunda coin →
Atalar Ağacı'nda ilk node → ikinci run'da fark edilir güç → ilk mini boss
ölümü → Kıvılcım Taşı kilidi açılır → günlük görevlerden 1–2 tamamlanır →
yeni karakter hedefi görünür (coin barı dolmakta) → "yarın yine gel" nedeni:
yeni günlük set + birikmiş coin hedefi.

---

# 34. Başarı Kriterleri

- İlk 10 saniyede oynanabilirlik (menüden arenaya ≤2 dokunuş).
- İlk 60 saniyede ilk level up.
- İlk 3 dakikada build hissi (2. silah + ilk pasif sinerji).
- Tüm ölümler açıklanabilir (telegraf + temas görünürlüğü).
- Her run'dan en az bir kalıcı kazanım.
- Aynı karakterle ardışık 3 run'da farklı build çıkabilmesi.
- 200+ düşman ekranda iken silüet okunabilirliğinin korunması.

---

# 35. Riskler ve Çözümler

| Risk | Çözüm |
|---|---|
| Oyun pasif kalır | Konumlanma, kaçış koridorları, pickup kovalama ve kart kararları aktif beceri olarak tasarlandı; tuzak silahı hareketi ödüllendirir |
| Ekran okunmaz olur | Düşman tavanı, sınırlı efekt, ayrışık silüet/renk, azaltılmış efekt modu |
| Run'lar birbirine benzer | 5 karakter × 6 silah × 6 evrim × 13 pasif × nadirlik varyansı + sürü baskını/boss olayları |
| Kalıcı upgrade oyunu bozar | Node etkileri küçük-ama-hissedilir; toplamı erken oyunu hızlandırır, geç oyunu çözmez |
| Oyuncu neden öldüğünü anlamaz | Telegraflı boss saldırıları, dokunulmazlık flaşı, düşük can üç kanallı uyarı |

---

# 36. Yapılmaması Gerekenler

Vampire Survivors (veya herhangi bir oyunun) içerik/isim/UI kopyası yok ·
ekranı efekt çöplüğüne çevirmek yok · ilk dakikada oyuncuyu öldürmek yok ·
anlamsız/çöp upgrade kartı yok · tek doğru build yok · oyunu çözen kalıcı
ilerleme yok · reklam/ödeme baskısı yok (MVP tamamen ücretsiz) · kaybetme
nedenini gizlemek yok.

---

# 37. Üretim Ekibine Net Notlar (öncelik sırası)

1. Hareket iyi hissetsin — ivmesiz, anında tepki veren, yumuşak kamera.
2. Otomatik saldırı tok olsun — vuruş flaşı, ses, sayı, parçacık aynı karede.
3. XP toplamak bağımlılık yapsın — çekim ivmesi + yükselen perde sesi.
4. Level up seçimleri anlamlı olsun — çöp kart yok, evrim rozetli sinerji.
5. Her run farklı build oluştursun — havuz genişliği + nadirlik varyansı.
6. Ölüm bile ilerleme hissi versin — run sonu kazanım listesi her zaman dolu.
7. Ekran kaotik ama okunabilir kalsın — tavanlar, silüetler, efekt bütçesi.
8. İlk 5 dakika oyuncuyu bağlasın — 2 dokunuşta arena, 60 sn'de ilk kart.
