# Hostinger deploy kılavuzu (Node.js + MariaDB)

Uygulama Hostinger'da **tek bir Node.js uygulaması** olarak çalışır: Express hem `/api` uçlarını hem de React derlemesini aynı
adresten sunar. Canlı adres: **kaynarmotor.com.tr** (hesap kullanıcısı `u454177254`, sipariş `1006826886`). Bu belge canlıya
alma adımlarını, ortam değişkenlerini ve Hostinger'a özgü dikkat noktalarını tutar.

## 1. Deploy adımları

Her canlıya alma için kullanıcının açık onayı gerekir (gerçek işletme verisi).

1. **Doğrula (yerel):** `bash backend/scripts/hepsiniDogrula.sh` (tsc, birim, API kaynak + paket), frontend testleri, `npm run test:e2e`.
2. **Paketle:** `npm run package:hostinger` → `deploy/hostinger/kaynarmotor-hostinger.zip` (~6,5 MB).
3. **Duman testi:** `cd backend && node --test tests/smoke/paket.smoke.test.js` (zip açılır, sunucu ayağa kalkar, sağlık ve giriş uçları denenir).
4. **Zip'i denetle:** içinde `.env`, anahtar dosyası, yerel geliştirme adresi, parola olmamalı.
5. **Yükle ve derle:** Hostinger MCP `hosting_deploy`: `domain: kaynarmotor.com.tr`, `path: <zip>`, `type: nodejs`, `appType: nest`,
   `nodeVersion: 24`, `outputDirectory: dist`, `buildScript: build`, `entryFile: main.cjs`, `packageManager: npm`.
   (Express olsa da `nest` tipiyle kurulur; `express` tipi `.htaccess` yazmıyor.) Ortam değişkenlerine dokunulmaz.
6. **Bekle:** `hosting_get-deployment` ile derleme `completed` olana kadar (genelde birkaç saniye). Başarısız olursa günlük ve analiz döner.
7. **Doğrula (canlı):**
   - `/api/health` ve `/api/health/database` 200.
   - Anonim istekle korumalı uçlar (`/api/vitrin?hepsi=1`, `/api/ikinci-el-motor`, `/api/raporlar/aralik`, `/api/is-emirleri`) **401**.
   - Canlı arayüzün `main.<özet>.js` dosya adı yerel paketteki ile aynı (yeni sürüm yayında).
   - Tarayıcıda vitrin, ilan detayı ve bir giriş akışı; konsolda hata ve ağda 4xx/5xx olmamalı.
8. **Yedek:** yüklenen zip'in bir kopyasını `deploy/yedek/` altına koy (git dışı); geri dönüş için önceki paket oradan yeniden yüklenir.

**Geri dönüş:** derleme başarısız olursa Hostinger önceki sürümü yerinde bırakır. Yayın çalışıp bozuk çıkarsa `deploy/yedek/` içindeki önceki zip
aynı adımlarla yeniden yüklenir. Şema değişikliği içeren bir sürümden eskisine dönmeden önce şemanın geriye uyumlu olduğundan emin olun
(sütunlar yalnızca eklenir, `initDb.ts` her açılışta `ADD COLUMN IF NOT EXISTS` ile tamamlar).

**Hostinger MCP:** sunucular `~/.hostinger-mcp` içindeki sabit sürümden `node` ile çalışır (bkz. `CLAUDE.md`). Araçlar oturum başında yüklenir;
yapılandırma değişirse pencere yenilenir. Hesap yanlışsa: `node ~/.hostinger-mcp/node_modules/@hostinger/mcp/src/servers/all.js --logout`, sonra `--login`.

## 2. Ortam değişkenleri (Hostinger → Node.js uygulaması)

`hosting_nodejs_replace-environment-variables` **tam set** ister ve okumada değerleri maskeler: şifre sonradan geri okunamaz. Bu yüzden
değişkenler tek seferde, tam set olarak gönderilir; **mevcut ayarlara dokunulmaz**, yalnızca gerçekten değişmesi gerekiyorsa güncellenir.

| Değişken | Değer |
|---|---|
| `NODE_ENV` | `production` |
| `DB_HOST` | `127.0.0.1` (uygulama veritabanına bununla bağlanır; `srvNNNN.hstgr.io` yalnızca dışarıdan erişim içindir) |
| `DB_PORT` | `3306` |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Hostinger'da oluşturulan veritabanı (`u454177254_kaynar`; şifre güçlü ve rastgele, `$` içermesin) |
| `JWT_SECRET` | rastgele, en az 32 (önerilen 64) karakter; değişirse tüm kullanıcılar yeniden giriş yapar |
| `FRONTEND_URL` | uygulamanın adresi, `https://kaynarmotor.com.tr` (aynı kaynaktan POST/PUT için CORS buna bakar) |
| `ADMIN_INITIAL_PASSWORD` | yalnızca veritabanı boşken ilk admin hesabı için |
| `TRUST_PROXY` | isteğe bağlı; `req.ip` yanlışsa vekil sayısı (bkz. §4) |

`UV_THREADPOOL_SIZE=1` pakete gömülüdür (Hostinger'da hesabın iş parçacığı kotası dar; 4 ile süreç izsiz ölüyor).
Gizli değerler (parolalar, jetonlar) kaynak koda, istemci JavaScript'ine ya da commit edilen `.env` dosyalarına yazılmaz.

## 3. Testler

```bash
cd backend
npm test                                          # birim (hızlı, veritabanı yok)
bash scripts/hepsiniDogrula.sh                    # tsc + birim + API (kaynak) + API (paket); yerel MariaDB açık olmalı
node --test tests/smoke/paket.smoke.test.js       # paketi açıp Hostinger'daki gibi çalıştırır
cd .. && npm run test:e2e                         # Playwright: sunucuları ve tek kullanımlık test veritabanını kendisi açar
```

Yerel MariaDB 11.8 elle başlatılır (`mariadbd.exe --defaults-file=<KaynarMariaDB>\my.ini`, port 3336). API testleri yalnızca yerel ve
adı `_test` ile biten veritabanında, E2E yalnızca `test_kaynar_e2e` adlı tek kullanımlık veritabanında çalışır. Gizli bilgiler
(`.env.mariadb.*`, canlı yedekler) git dışındadır.

## 4. Hostinger'a özgü dikkat noktaları

- **Node.js uygulama sınırı:** Hostinger Business planı en fazla 5 Node.js web uygulaması içerir (bölgeye göre değişebilir); yeni bir Node sitesi açarken kota
  yüzünden reddedilebilir. API'den kota sorgulanamaz.
- **`req.ip` / hız sınırlama:** uygulama LiteSpeed ve CDN arkasında. `trust proxy` 1 olarak ayarlı; giriş denemesinin `aktivite_log.ip_adresi`
  kaydına bakılmalı. Hep aynı (vekil) IP görünüyorsa `TRUST_PROXY` artırılır. Giriş sınırı IP + kullanıcı adı başınadır: bir çalışanın yanlış
  denemeleri yalnızca kendi hesabını 15 dakika bekletir, aynı IP'deki diğer kullanıcıları kilitlemez (IP başına geniş yedek sınır 200).
- **HTTP/3 (hcdn) takılması:** aynı hesaptaki diğer sitelerde, bazı ağlardan, tarayıcı HTTP/3'e geçince sayfa geç açılabiliyor (uygulama kaynaklı
  değil). Şikâyet gelirse hPanel'den CDN/HTTP3 ayarına bakılır.
- **Süreç kotası:** açıklanamayan 503'te ilk bakılacak yer; paket `UV_THREADPOOL_SIZE=1` ile gelir.
- **Veritabanı oturumu:** saat dilimi UTC, `sql_mode` katı ve `||` metin birleştirir; Hostinger'ın varsayılanı katı değildir, ayarlar her
  bağlantıda uygulamadan yapılır.
- **Büyük dosyalar:** belgeler ikili gönderilir; yükleme sınırı veritabanı sunucusunun `max_allowed_packet` değerinden otomatik türer,
  aşan dosya anlaşılır bir 413 ile reddedilir.
- **Asenkron işlemler:** `hosting_deploy` derlemeyi başlatıp hemen döner; sonuç `hosting_get-deployment` ile beklenir. Başarı yanıtı çoğu zaman
  "kuyruğa alındı" demektir, yazma işlemi tekrar gönderilmez.

## 5. PostgreSQL'den MariaDB'ye geçişte bilinen davranış farkları

Uygulama başlangıçta PostgreSQL üzerinde çalışıyordu; MariaDB'ye geçişte şu farklar bilinçli olarak yönetildi:

- **Geçersiz kayıt numarası:** `/api/.../abc` ya da `5abc` **400** döner (`core/middleware/idDogrula.ts`). Eskiden PostgreSQL 500 veriyordu;
  MariaDB `5abc`'yi sessizce `5` yapıp başka kaydı etkileyebilirdi.
- **Eşit sıralama anahtarlı satırların sırası:** SQL'de garanti değildi; aynı tarihli kayıtlar arasında PostgreSQL fiziksel sırayı, MariaDB id
  sırasını izler. Sıralama kuralının kendisi (tarihe göre azalan) testle doğrulanır.
- **Metin sıralaması:** PostgreSQL'in `en_US.utf8` sırası (boşluk/noktalama yok sayılır, küçük harf önce) `orderByText` ile taklit edildi.
- **Arama (`ILIKE`):** `LOWER(x) LIKE LOWER(?)`; Türkçe İ/ı/ş/ç, `%`, `_` dahil aynı kayıtları bulur.
- **Ondalık ölçek:** hiç kaydı olmayan toplamlar `"0"` yerine `"0.00"` dönebilir (sayısal olarak aynı).
- **Kayıt numaraları:** `npm run seed` kayıtları silip yeniden yazar (`TRUNCATE` yerine `DELETE`); numaralar 1'den başlamaz, kaldığı yerden devam eder.
- **Zaman:** `NOW()` sunucu yerel saatidir, uygulama UTC yazar; karşılaştırmada `UTC_TIMESTAMP()` kullanılır.

Geçiş sırasında kullanılan veri taşıma ve eski-yeni karşılaştırma araçları, iş bitince depodan kaldırıldı (git geçmişinde durur).

## 6. Bilinen açık konular

- `kullanicilar.plain_sifre` kolonu eski tasarımdan kaldı. Düz metin parolalar **artık saklanmıyor ve gösterilmiyor**: `initDb.ts` her açılışta
  kolonu `NULL`'a çeker ve hiçbir iş kodu ona yazmaz/okumaz. Kolonun `DROP COLUMN` ile kaldırılması geri alınamaz bir şema değişikliğidir ve ayrı karar bekler.
- Eski kaynaklardan kalma yerel yedekler (düz parola ve müşteri bilgisi içerebilir) depo dışında durur; şifreli arşive alınmalı ya da silinmelidir.
- `demo` dalı (Postgres/Supabase) bu işten etkilenmez.
