# Hostinger'a geçiş kılavuzu (Railway/PostgreSQL → Hostinger/MariaDB)

Bu belge `hostinger` dalındaki işin durumunu ve canlıya alma adımlarını anlatır. Kod tarafı hazırdır ve
test edilmiştir; **Hostinger hesabında henüz hiçbir şey oluşturulmadı/değiştirilmedi** (site, veritabanı,
DNS, ortam değişkeni yok).

## 1. Nelerin hazır olduğu

| Parça | Durum | Nerede |
|---|---|---|
| MariaDB uyum katmanı (`$1` parametreleri, `RETURNING`, UTC, transaction) | ✅ | `backend/core/db.js`, `sqlParams.js` |
| MariaDB şeması (canlı PostgreSQL şemasından üretildi) | ✅ | `backend/core/initDb.js` |
| Tüm route'ların çevirisi (PostgreSQL'e özgü ~60 sorgu) | ✅ | `backend/modules/*` |
| Canlı veriyi yükleme + doğrulama aracı | ✅ | `backend/scripts/mariadb/yedektenYukle.js` |
| Tek dosya sunucu + arayüz paketi | ✅ | `npm run package:hostinger` |
| Örnek veri (`npm run seed`) MariaDB'de | ✅ | `backend/scripts/seedLocal.js` |
| Testler (unit, entegrasyon, karşılaştırma, paket duman) | ✅ | `backend/tests/` |

## 2. Canlıya almadan önce karar gereken şeyler

1. **Node.js uygulama sınırı (en önemli risk).** Hostinger Business planı en fazla **5 Node.js web uygulaması**
   içerir (resmî fiyat sayfasına göre; bölgeye göre değişebilir). Hesapta şu an 5 Node sitesi var:
   `crm-mefateknik.com`, `kelime.salihsydm.com`, `otoyikama.salihsydm.com`, `fitnessapp.salihsydm.com`,
   `filo.salihsydm.com`. `kaynarmotor.com.tr` şu an *statik* siteyi (Node değil). Altıncı bir Node uygulaması
   (hem prova adresi hem asıl alan adı) kota yüzünden reddedilebilir. API'den kota sorgulanamıyor; denemek
   gerekir. Seçenekler: (a) kullanılmayan bir Node sitesini kaldırmak, (b) planı yükseltmek,
   (c) prova adresi açmadan doğrudan `kaynarmotor.com.tr`'yi dönüştürmek (önce statik site yedeği alınır).
2. **Prova adresi:** `yeni.kaynarmotor.com.tr` önerilir. DNS Hostinger'da olduğu için çoğu zaman otomatik çalışır.
3. **Video yükleme:** vitrin videoları veritabanında base64 saklanıyordu (üretimde 0 kayıt). Yükleme sınırı artık
   veritabanı sunucusunun `max_allowed_packet` değerinden otomatik türer; aşan dosya anlaşılır bir 413 mesajıyla
   reddedilir. Hostinger'ın değeri henüz bilinmiyor (ilk bağlantıda `SELECT @@max_allowed_packet` ile okunur).
4. **MariaDB sürümü:** Atölyeci projesinde Hostinger MariaDB 11.8.9 ölçüldü; yerel test aynı sürümle yapıldı.

## 3. Ortam değişkenleri (Hostinger → Node.js uygulaması)

`hosting_nodejs_replace-environment-variables` **tam set** ister ve okumada değerleri maskeler: şifreyi sonradan geri
okuyamazsınız. Bu yüzden şifre yerelde (git dışı) üretilip tek seferde tam set olarak gönderilir.

| Değişken | Değer |
|---|---|
| `NODE_ENV` | `production` |
| `DB_HOST` | `127.0.0.1` (uygulama veritabanına bununla bağlanır; `srvNNNN.hstgr.io` yalnızca dışarıdan erişim içindir) |
| `DB_PORT` | `3306` |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Hostinger'da oluşturulan veritabanı (şifre güçlü ve rastgele; `$` içermesin) |
| `JWT_SECRET` | yeni, rastgele 64 hane (Railway'dekini kullanmayın: kullanıcılar yeniden giriş yapar, sorun değil) |
| `FRONTEND_URL` | uygulamanın adresi, örn. `https://yeni.kaynarmotor.com.tr` (aynı kaynaktan POST/PUT için CORS buna bakar) |
| `ADMIN_INITIAL_PASSWORD` | yalnızca veritabanı boşsa; canlı veri yüklendiğinde gerekmez |
| `TRUST_PROXY` | isteğe bağlı; `req.ip` yanlışsa (bkz. §6) vekil sayısı |

`UV_THREADPOOL_SIZE=1` pakete gömülüdür (Hostinger'da hesabın iş parçacığı kotası dar; 4 ile süreç izsiz ölüyor).

## 4. Adımlar (her biri ayrı onay ister)

1. **Veritabanı oluştur:** `hosting_databases_create` (ad `u454177254_kaynar`, kullanıcı, rastgele şifre) ve
   `website_domain` ile siteye bağla. Şifreyi yerelde `backend/.env.hostinger.local` (git dışı) dosyasına yaz.
2. **Prova sitesini aç:** `hosting_websites_create` (`order_id` 1006826886, alan adı `yeni.kaynarmotor.com.tr`);
   `hosting_websites_list-setups` ile `completed` olana kadar bekle.
3. **Veriyi taşı** (Railway'e yalnızca **okuma**; kendi IP'ne **geçici** uzak erişim):
   - `node scripts/mariadb/railwayYedekAl.js` → taze yedek (depo dışına)
   - `hosting_databases_create-remote-connection` (yalnızca kendi IP'n, `%` asla)
   - `node scripts/mariadb/yedektenYukle.js --env .env.hostinger.local --uzak-izin`
     (şemayı kurar, tabloları boşaltır, yükler ve **satır sayısı, sütun toplamları, uzunluklar, min/maks, yabancı
     anahtar bütünlüğünü** yedekle karşılaştırır; sapma varsa 2 koduyla çıkar)
   - uzak erişimi **hemen kapat** (`hosting_databases_delete-remote-connection`)
4. **Paketi yükle:** `npm run package:hostinger` → zip'i `hosting_files_generate-upload-url` + TUS ile yükle →
   env değişkenlerini gönder → `hosting_nodejs_start-build` (`app_type: nest`, `node_version: 24`,
   `output_directory: dist`, `build_script: build`, `entry_file: main.cjs`; Express olsa da `nest` ile kurulur,
   `express` tipi `.htaccess` yazmıyor).
5. **Doğrula:** `/api/health`, `/api/health/database`; tarayıcıda giriş, motor/servis/rapor/vitrin; Salih telefondan dener.
6. **Geçiş günü:** yeni bir taze yedek + yükleme (adım 3), Salih'in onayıyla `kaynarmotor.com.tr` yeni uygulamaya
   alınır (statik sitenin yedeği önceden alınır; aynı alan adıyla ikinci site açılamaz, önce eski site silinir).
   `FRONTEND_URL` ve CORS yeni adrese göre güncellenir.
7. **Railway'i 1–2 hafta açık tut**, sonra kapat. Kapatmadan önce son yedeği sakla (kilitli Railway volume yedeği
   Railway silinince gider).

### Geri dönüş
Geçişten sonra sorun çıkarsa Railway hâlâ açıktır: DNS/alan adı eski adrese çevrilir. Yeni sistemde girilen kayıtlar
Railway'e taşınmaz (tersine taşıma aracı yok); bu yüzden geçiş sonrası ilk günlerde Railway yalnızca okunur tutulmalı
ve geri dönüş ancak çok erken (ilk saatler) yapılmalıdır.

## 5. Testler

```bash
cd backend
npm test                                  # unit (hızlı, veritabanı yok)
npm run test:integration                  # canlıyla aynı arama sonuçları (yerel MariaDB kopyası gerekir)
PG_REF_DIR=<eski kodun backend klasörü> npm run test:parity   # eski(PostgreSQL) ↔ yeni(MariaDB) karşılaştırma
node --test tests/smoke/paket.smoke.test.js                   # paketi açıp Hostinger'daki gibi çalıştırır
```

Karşılaştırma testi iki sunucuyu aynı canlı-veri kopyasıyla yan yana çalıştırır: **148 GET ucu × 8 rol = 1184 istek
çifti** + **10 yazma senaryosu** (stok düşümü/geri ekleme, transaction, fiş numarası yarışı, belgeler, vitrin, yetki,
doğrulama) + senaryo sonunda **iki veritabanının tüm tablolarının karşılaştırılması**. Testin gerçekten hata yakaladığı
bilerek hata sokularak doğrulandı (stok `SET` sırası, fiş numarası kilidi).

Gerekli yerel araçlar: MariaDB 11.8 (`C:\Users\salih\KaynarMariaDB`, port 3336, elle başlatılır:
`mariadbd.exe --defaults-file=C:\Users\salih\KaynarMariaDB\my.ini`), eski kodun temiz bir kopyası
(`git worktree add --detach <klasör> <eski commit>` + `node_modules` bağlantısı) ve yerel PostgreSQL (`kaynar_ref`).
Gizli bilgiler (`.env.mariadb.*`, `.env.pg.ref`, canlı yedek) git dışındadır.

## 6. MariaDB'ye geçişte bilinen davranış farkları (ve nedenleri)

- **Geçersiz kayıt numarası:** `/api/.../abc` ya da `5abc` artık **400** döner (`core/middleware/idDogrula.js`). Eskiden
  PostgreSQL 500 veriyordu; MariaDB `5abc`'yi sessizce `5` yapıp başka kaydı etkileyebilirdi.
- **Eşit sıralama anahtarlı satırların sırası:** SQL'de garanti değildi. Aynı tarihli kayıtlar arasında PostgreSQL
  fiziksel sırayı, MariaDB id sırasını izler. Sıralama kuralının kendisi (tarihe göre azalan) testle doğrulanır.
- **Metin sıralaması:** canlının `en_US.utf8` sırası (boşluk/noktalama yok sayılır, küçük harf önce) `orderByText`
  ile taklit edildi; canlı veride **78 sütunun 78'inde birebir** doğrulandı (`_sira.json` kehaneti).
- **Arama (`ILIKE`):** `LOWER(x) LIKE LOWER(?)`; canlıda 331 sözcük × 4 arama için birebir aynı kayıtları buluyor
  (Türkçe İ/ı/ş/ç, `%`, `_` dahil).
- **Ondalık ölçek:** hiç kaydı olmayan toplamlar `"0"` yerine `"0.00"` dönebilir (sayısal olarak aynı).
- **`kayit numaraları`:** `npm run seed` kayıtları silip yeniden yazar (`TRUNCATE` yerine `DELETE`); numaralar 1'den
  başlamaz, kaldığı yerden devam eder.

## 7. Hostinger'a özgü dikkat noktaları

- **`req.ip` / hız sınırlama:** uygulama LiteSpeed ve CDN arkasında. `trust proxy` 1 olarak ayarlı; ilk dağıtımda
  giriş denemesinin `aktivite_log.ip_adresi` kaydına bakılmalı. Hep aynı (vekil) IP görünüyorsa `TRUST_PROXY`
  artırılır, aksi halde 30 başarısız giriş tüm kullanıcıları 15 dakika kilitler.
- **HTTP/3 (hcdn) takılması:** aynı hesaptaki diğer sitelerde, bazı ağlardan, tarayıcı HTTP/3'e geçince sayfa geç
  açılabiliyor (uygulama kaynaklı değil). Kullanıcı şikâyet ederse hPanel'den CDN/HTTP3 ayarına bakılır.
- **Süreç kotası:** açıklanamayan 503'te ilk bakılacak yer; paket `UV_THREADPOOL_SIZE=1` ile gelir.
- **Veritabanı oturumu:** saat dilimi UTC, `sql_mode` katı (PostgreSQL gibi) ve `||` metin birleştirir; Hostinger'ın
  varsayılanı katı değildir, ayarlar her bağlantıda uygulamadan yapılır.
- **Büyük dosyalar:** belgeler ikili (hazır ifade) gönderilir; sınır `max_allowed_packet` (bkz. §2).

## 8. Kaçınılan/değiştirilmeyenler

- `plain_sifre` kolonu (kullanıcı şifrelerini **düz metin** saklıyor) olduğu gibi taşındı: bu eski tasarımdır,
  davranış değişikliği olmasın diye dokunulmadı. Ayrı bir iş olarak kaldırılması önerilir.
- `scripts/` altındaki tek seferlik eski araçlar (`importCsv`, `fix*`, `check*`, `add*`) PostgreSQL döneminden kalmadır;
  MariaDB'ye karşı doğrulanmadı. Sürdürülen araçlar: `seedLocal.js`, `seedGorselIndir.js`, `scripts/mariadb/*`.
- `demo` dalı (Postgres/Supabase) bu işten etkilenmez.
