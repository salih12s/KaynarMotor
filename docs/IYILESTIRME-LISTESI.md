# İyileştirme listesi (senior değerlendirmesi, 2026-10-26)

Projenin bütünü (backend, frontend, veri modeli, testler, işletim, belgeler) gözden geçirildi; bu belge bulunan eksikleri
**teker teker düzeltilecek** bir liste olarak tutar. Her madde bittikçe kutusu işaretlenir ve kısa bir not (tarih, commit) eklenir.

- Kurallar: önce test (gerçek bir hataysa önce onu yakalayan regression testi), sonra düzeltme, tam doğrulama zinciri
  (`bash backend/scripts/hepsiniDogrula.sh`, frontend `typecheck` + `lint` + test, E2E), canlıya çıkış ayrıca onaylanır (`CLAUDE.md`).
- Güvenlik ayrıntıları depo herkese açık olduğu için yerel `GUVENLIK-BULGULARI.md` dosyasındadır (G kodları). Burada yalnızca kodlarıyla anılır.
- Eski listelerle ilişki: F kodları `YOL-HARITASI.md` §F'deki genel bulgulardır; burada aynı işi anlatan madde o koda bağlanır.

## Puanlar (2026-10-26)

| Bakış açısı | Puan |
|---|---|
| Gerçek bir işletmenin üretim yazılımı olarak | **7 / 10** |
| Junior portföy projesi olarak | **8,5 / 10** |

| Alan | Puan | Puanı düşüren |
|---|---|---|
| Ürün ve kapsam | 9 | - |
| Backend mimarisi | 7,5 | Kendi SQL derleme katmanı, sürümsüz şema değişiklikleri |
| Frontend kodu | 7 | Büyük bileşenler, iki farklı veri çekme kalıbı, ErrorBoundary yok |
| Veri modeli ve bütünlük | 5,5 | Müşteri adla bağlı, görseller veritabanında base64 |
| Güvenlik | 6,5 | G4, G5, G9-G12 (yerel dosyada) |
| Testler | 8,5 | CI yok, kapsam ölçülmüyor, E2E ince |
| İşletim (yedek, izleme, deploy) | 4,5 | Veritabanı yedeği/geri yükleme denenmemiş, izleme yok, staging yok |
| Performans ve ölçeklenme | 6 | Listelerde sayfalama yok |
| Dokümantasyon | 8 | Bayatlayan ve tekrar eden bölümler |
| Bakım yapılabilirlik | 6,5 | Tek kişi biliyor, kodun önemli kısmı AI ile yazıldı |

**İlk üç madde (D1-D3) işletme riskini en çok azaltanlardır; D1, D2 ve D8 birlikte iki günden kısa sürer ve üretim puanını 8'e çıkarır.**

---

## Kritik (gerçek işletme verisi riski)

- [ ] **D1 · Veritabanı yedeği ve geri yükleme provası**
  - Sorun: `docs/HOSTINGER.md`'deki "yedek" yalnızca kod paketidir. Canlı veritabanının yedeği olup olmadığı, ne sıklıkta alındığı ve geri yüklenebildiği doğrulanmadı. 2026-10-26 yayınında veritabanı yedeği alınamadı.
  - Yapılacak: Hostinger'ın otomatik yedeğini (sıklık, saklama süresi) hPanel'den doğrula; haftalık bağımsız döküm (uzaktan erişim yalnız kendi IP'ne, iş bitince kapat; `hostinger-deploy` notları) git dışı ve ikinci bir yerde (harici disk/bulut) sakla; **bir kez** yerel MariaDB'ye geri yükleyip uygulamayı ona karşı aç.
  - Bitti sayılır: belgelenmiş yedek takvimi + geri yükleme provasının tarihi ve süresi `docs/HOSTINGER.md`'de; "veritabanı yarın bozulsa en fazla N saatlik veri kaybolur" cümlesi yazılabiliyor.
  - Emek: 1 gün.

- [ ] **D2 · İzleme ve uyarı** (G6 ile birlikte)
  - Sorun: site ya da veritabanı çökerse bunu kimse fark etmez, müşteri arayınca öğrenilir. `uncaughtException` yutulduğu için süreç bozuk durumda çalışmaya devam edebilir (G6).
  - Yapılacak: ücretsiz bir uptime izleyici (ör. UptimeRobot) `/api/health` ve `/api/health/database` için, e-posta/telefon bildirimi; sunucu hataları için basit bildirim (ör. Sentry ücretsiz katmanı ya da 500 hatalarını günlük e-postayla özetleyen küçük bir iş); Hostinger'ın çöken süreci yeniden başlattığı doğrulanınca G6 (`process.exit(1)`).
  - Bitti sayılır: veritabanını yerelde kapatınca bildirim geliyor (provası yapıldı); G6 kapandı.
  - Emek: yarım gün.

- [ ] **D3 · Müşteri kimliği (F1)**
  - Sorun: müşteri geçmişi isimle eşleşiyor (`LOWER(ad_soyad) = LOWER(alici_adi)`); motor ve aksesuar satışlarında `musteri_id` yok. Aynı adlı iki müşterinin geçmişi karışır, ad düzeltilince geçmiş kopar.
  - Yapılacak: `musteri_id` kolonu + yabancı anahtar; mevcut kayıtlar için eşleştirme betiği (tek eşleşenler otomatik, çakışanlar elle karar listesi); formlar müşteriyi id ile seçer. Önce D1 (yedek), sonra yerelde canlının kopyasıyla prova.
  - Bitti sayılır: müşteri detayı id üzerinden çalışıyor; "aynı adlı iki müşteri" regression testi yeşil; canlı veride eşleşmeyen kayıt kalmadı (ya da listesi işletme sahibine verildi).
  - Emek: 2-3 gün (veri temizliği dahil).

## Yüksek

- [ ] **D4 · Listelerde sunucu tarafı sayfalama**
  - Sorun: listeleme sorgularında `LIMIT` yok; ekranlar bütün kaydı indirip çiziyor. Bugün hızlı, birkaç yıl sonra on binlerce kayıtta ekran donar.
  - Yer: `listele` / `hepsiniListele` fonksiyonları: `isEmirleri`, `ikinciElMotor`, `musteriler`, `aksesuarlar`, `aksesuarStok`, `yedekParcalar`, `yedekParcaStok` repository'leri.
  - Yapılacak: önce en büyüyecek iki liste (iş emirleri, motorlar): `?sayfa=&adet=` + toplam sayı; arama ve süzgeçler sunucuya taşınır (bir kısmı şimdi istemcide); frontend TanStack Query ile sayfalı sorgu. Özet şeritleri (Toplam, Ciro) ayrı istatistik ucundan gelir (ekranda görünen sayfadan hesaplanmamalı).
  - Bitti sayılır: 10.000 kayıtlı test veritabanında liste ilk açılışı < 1 sn; API testleri sayfa sınırlarını (boş sayfa, son sayfa, geçersiz değer → 400) kapsıyor.
  - Emek: 1-2 gün (ilk iki liste).

- [ ] **D5 · Görseller veritabanında base64 (F2, G12)**
  - Sorun: vitrin görsel ve videoları `LONGTEXT` base64 (yaklaşık %33 şişme, büyük yedekler); bunun için `/api/vitrin`'e 120 MB JSON gövdesi izni var (G12).
  - Yapılacak: satış belgelerinde zaten kullanılan yöntem (ham ikili gövde + `LONGBLOB`, ya da diske dosya); eski verinin dönüştürülmesi için geçiş betiği; JSON sınırı birkaç MB'a iner.
  - Bitti sayılır: yeni yüklemeler base64 değil; eski görseller dönüştürüldü ve sitede aynı görünüyor; veritabanı boyutu ölçülüp nottan düşüldü.
  - Emek: 2 gün.

- [ ] **D6 · Şema değişikliklerinin sürüm kaydı (F3)**
  - Sorun: `backend/core/veritabani/initDb.ts` her açılışta `ALTER` ve veri düzeltme cümlelerini yeniden çalıştırıyor; hangi değişikliğin ne zaman uygulandığı bilinmiyor, geri dönüş zor (2026-10-26 `plain_sifre` silinmesinde yaşandı).
  - Yapılacak: `sema_surumu` tablosu, numaralı ve bir kez çalışan geçiş dosyaları (`001_...`), açılışta yalnız uygulanmamış olanlar; mevcut durum "0. sürüm" olarak işaretlenir.
  - Bitti sayılır: yeni bir kolon eklemek tek dosya; API testleri sıfırdan kurulan ve mevcut veritabanında aynı şemayı doğruluyor.
  - Emek: 1 gün.

- [ ] **D7 · Güvenlik borçları** (ayrıntı yerel `GUVENLIK-BULGULARI.md`)
  - G4 (oturum anahtarının saklandığı yer ve CSP), G5 (hazır ifadeye geçiş, uzun vade), G9 (KVKK: kişisel veri ve aydınlatma metni), G10 (admin için iki adımlı doğrulama, isteğe bağlı), G11 (servis QR bağlantısının yenilenmesi), G12 (D5 ile birlikte).
  - Önerilen sıra: G9 (yasal yükümlülük) → G4 (önce rapor modunda CSP) → G11 → G10 → G5.
  - Bitti sayılır: yerel dosyada her G maddesinin durumu "Kapandı" ya da "bilinçli olarak kabul edildi, gerekçesi şu".

## Orta

- [ ] **D8 · Hata sınırı (ErrorBoundary)**
  - Sorun: frontend'de hiç ErrorBoundary yok; tek bir bileşendeki çalışma zamanı hatası bütün paneli beyaz ekrana çevirir.
  - Yapılacak: uygulama kabuğunda ve her rota için hata sınırı ("Bu ekran açılamadı, sayfayı yenileyin" + hata bildirimi D2'ye); `React.lazy` yükleme hatası (yeni sürüm yayınlanınca eski parça adı bulunamaz) için sayfayı bir kez yenileme.
  - Bitti sayılır: bilerek hata atan bir bileşenle bileşen testi; menü ve diğer ekranlar çalışmaya devam ediyor.
  - Emek: 1-2 saat.

- [ ] **D9 · Veri çekmeyi tek kalıpta birleştirmek**
  - Sorun: TanStack Query yalnızca 3 ekranda (servis, motor, raporlar); diğerleri elle `useEffect` + `useState` ile çekiyor (yükleniyor/hata durumları ve önbellek her ekranda farklı).
  - Yapılacak: ekran ekran TanStack Query'ye geçiş (önce aksesuar, yedek parça, e-ticaret, müşteriler); yazma sonrası geçersiz kılma kuralları testle sabitlenir (servis ekranındaki örnek gibi).
  - Bitti sayılır: `features/` altında veri çeken `useEffect` kalmadı (ya da kalanların gerekçesi yazıldı).
  - Emek: 2-3 gün, parça parça.

- [ ] **D10 · Büyük bileşenleri bölmek**
  - Sorun: `vitrin/magaza/StorefrontDetay.tsx` (660 satır), `raporlar/Veresiye.tsx` (642), `yedek-parca/YedekParcalar.tsx` (552), `musteriler/Musteriler.tsx` (452), `app/Layout.tsx` (430), `app/App.tsx` (428, tekrar eden rota korumaları).
  - Yapılacak: `docs/FRONTEND-BOLME-RAPORU.md` §9'daki yöntem (önce karakterizasyon testi, sonra taşıma); Veresiye'nin dört kaynak detayı ayrı bileşenler; App'teki rota korumaları tek tablo.
  - Bitti sayılır: hiçbir ekran dosyası 300 satırı geçmiyor; testler adlarıyla aynen geçiyor.
  - Emek: 2 gün.

- [ ] **D11 · Yayın öncesi güvence ve staging (F12)**
  - Sorun: CI kullanılmıyor (bilinçli karar), push öncesi kanca etkin değil, deploy elle; yeni sürümü canlıdan önce deneyecek bir ortam yok.
  - Yapılacak: `git config core.hooksPath .githooks`; kanca şu an yalnızca backend tip kontrolü ve birim testlerini koşuyor, frontend `typecheck`, `lint` ve `test:hizli` eklenmeli (veritabanı gerektirmeyen, dakikanın altında bir zincir); deploy kontrol listesini tek betiğe topla (paket → duman testi → yayın sonrası kontroller: health, 401'ler, arayüz dosya adı); Node uygulama kotası el veriyorsa bir alt alan adında staging (aynı paket, ayrı veritabanı).
  - Bitti sayılır: kırık test varken `git push` duruyor; yayın sonrası kontroller tek komut.
  - Emek: yarım gün (staging hariç).

- [ ] **D12 · Belgelerin bayatlaması**
  - Sorun: `backend/server.ts` yorumları hâlâ `frontend/src/App.jsx` diyor; `CLAUDE.md` "Durum" bölümünde eski ve yeni satırlar yan yana (415/568 test, 9/11 E2E, `typescript` dalı, `App.jsx`, `tokenlar.js`); `YOL-HARITASI.md` başlığı ve "Biten" tablosu eski sayılarla (201 API, 328 frontend).
  - Yapılacak: CLAUDE.md "Durum" bölümünü tek güncel paragrafa indir; yol haritasının "Biten" tablosunu güncelle; kod yorumlarındaki eski dosya adlarını düzelt.
  - Bitti sayılır: `grep -rn "App.jsx\|tokenlar.js\|\.jsx" backend docs CLAUDE.md` yalnızca tarihsel kayıtları buluyor.
  - Emek: 1-2 saat.

## Düşük / yarım kalanlar

- [ ] **D13 · API test dosyalarını özelliğe göre bölmek (F8 kalanı)**: dört karışık dosya (`motor-guncelleme-ve-istek-isleme`, `stok-butunlugu-ve-silme`, `kimlik-yetki-ve-stok-simetrisi`, `girdi-dogrulama-ve-stok-kodlari`) `describe` bazında özellik dosyalarına; test adları ve sayısı (213) aynı kalmalı.
- [ ] **D14 · Ertelenen sıkılaştırmalar**: `@typescript-eslint/no-floating-promises` (82 yer, bilerek kapalı), isteğe bağlı `noUncheckedIndexedAccess`; ayrıntı `docs/VITE-TS-YOL-HARITASI.md` "Aşama 5 sonuçları".
- [ ] **D15 · Backend tip borcu**: 25 `any` (çoğu `typeCast`, hata işleyici); `backend/scripts/` ve `backend/tests/` hâlâ JavaScript.
- [ ] **D16 · Bağımlılıklar (F9)**: React 19.3 ve MUI 7.3.11 yamaları (2026-10-26'da `npm update` takıldı, uygulanmadı); büyük sürümler ayrı işler: Express 5, MUI 9 (tasarım kontrolüyle), dotenv, bcryptjs 3.
- [ ] **D17 · README**: dil karışık (İngilizce özet + Türkçe gövde, bilinçli ama tek dile inebilir); "Servis" bölümü "barkodla parça ekleme" diyor, yeni GIF stoktan aramayı gösteriyor.
- [ ] **D18 · Karar kayıtları (mülakat hazırlığı)**: kısa ADR'ler (`docs/kararlar/`): neden kendi SQL katmanı (PostgreSQL'den geçiş), neden müşteri adla eşleşiyordu ve nasıl düzeltildi, neden CI yerine yerel güvence, neden tek Hostinger sunucusu. Her birinde "bilinen sınır" ve "ne zaman değiştirilir" satırı. Kodun AI desteğiyle yazıldığını bilen bir mülakatçının ilk soracağı yer burasıdır.

---

## Önerilen sıra

| Sıra | Madde | Neden şimdi |
|---|---|---|
| 1 | D1 yedek + geri yükleme | Diğer her veri değişikliğinin (D3, D5, D6) ön koşulu |
| 2 | D2 izleme (+ G6) | Sorunu müşteriden önce öğrenmek |
| 3 | D8 ErrorBoundary | Bir saatlik iş, beyaz ekran riskini kaldırır |
| 4 | D12 belgeler | Kısa; sonraki işlerde yanlış bilgiyle çalışmamak için |
| 5 | D4 sayfalama | Veri büyüdükçe kaçınılmaz |
| 6 | D3 müşteri kimliği | Veri bütünlüğü; D1'den sonra, provayla |
| 7 | D7 güvenlik (G9 → G4 → ...) | G9 yasal yükümlülük |
| 8 | D6 şema sürümü | D5'ten önce olursa görsel geçişi tek dosya olur |
| 9 | D5 görseller | Yedek boyutu ve bellek |
| 10 | D9, D10, D11, D13-D18 | Bakım kolaylığı, sırası esnek |

## Durum

| Tarih | Ne yapıldı |
|---|---|
| 2026-10-26 | Liste oluşturuldu (senior değerlendirmesi). Aynı gün kapananlar: F4, F6, F7, F11, F13, G1-G3, G7, G8 (bkz. `YOL-HARITASI.md` §F durum ve yerel güvenlik dosyası). |
