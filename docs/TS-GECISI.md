# Backend: TypeScript ve modüler yapı

`typescript` dalında. **Faz 0-6 tamam.** Canlıya çıkış (Faz 7) kullanıcı onayı bekliyor: canlıdaki sürüm hâlâ eski JS
paketi (`deploy/yedek/kaynarmotor-hostinger-2026-10-18-canli.zip`, git'te değil).

## Kararlar
- Express'te kalındı. Gerçek NestJS kullanılmaz: esbuild `emitDecoratorMetadata` desteklemez ve Hostinger'a tek `main.cjs` gider.
- NestJS **tarzı** katmanlar, **sade fonksiyonlarla** (sınıf/decorator yok). `.ts` dosyaları baştan `strict`.
- Doğrulama: `zod` 4 (Türkçe mesajlar, hatalı alan adı mesaja eklenir).
- **API sözleşmesi değişmedi:** durum kodları, mesajlar, yanıt biçimleri aynı. Bilinen iki küçük sapma: gövde nesne değilse
  bazı uçlarda 500 yerine 400 (Türkçe mesaj); veritabanı "çok uzun değer" hatası artık her uçta 400 (eskiden bazı uçlarda 500).

## Mimari

```
istek → server.ts (CORS, helmet, gövde, kimlik, yetki, kâr gizleme)
      → *.routes.ts       URL → middleware → controller
      → *.controller.ts   HTTP: isteği oku, doğrula (zod), servisi çağır, DENETİM GÜNLÜĞÜ, yanıtı yaz
      → *.service.ts      iş kuralları; express BİLMEZ; hatayı IstemciHatasi sınıflarıyla bildirir
      → *.repository.ts   yalnızca SQL; iş kuralı YOK
      → platform/database/db.ts    havuz, transaction (pool.withTransaction), SQL uyum katmanı (sqlParams)
```

Klasör düzeni **iş alanına göre** (modüler; katmana göre değil): her iş alanı kendi klasörüdür, altyapı `platform/` içindedir.
Bu düzene üçüncü denemede varıldı: `modules/ + core/` (iç içe) ve katman klasörleri (`routes/ controllers/ services/ ...`, bir özellik 5 klasöre dağılıyordu)
bırakıldı. Gerekçe: Node.js Best Practices "bileşenlere böl, bileşeni genel arayüzünden tüket" der; NestJS özellik modülleri aynı ilkeyi
uygular (`exports` = genel arayüz). Kuralları `backend/tests/unit/mimari.test.js` zorlar (R1-R8).

```
backend/
├─ server.ts           uygulamayı kurar; her modülün yolunu yetkisiyle bağlar (yetki haritası tek yerde)
├─ platform/           iş alanı bilmeyen altyapı: database/ middleware/ lib/ medya/   (modüllere BAĞLANMAZ)
├─ auth/  musteriler/  servis/  aksesuar/  yedek-parca/  motor/  eticaret/  vitrin/  raporlar/    (iş modülleri; çok özellikli olanlarda özellik klasörleri)
└─ scripts/  tests/
```

Çok özellikli modülde **her özellik kendi klasöründedir** (en fazla bir seviye): `vitrin/ilanlar/`, `vitrin/iletisim/`, `vitrin/medya/`; `servis/isEmirleri/`, `servis/servisGecmisi/`.
Kökte yalnız `index.ts` ve modülün ortak yardımcısı kalır (`vitrin/vitrinOrtak.ts`). Tek özellikli modüller (`auth`, `musteriler`, `eticaret`) düz kalır: içine
klasör açmak yalnızca bir seviye daha yürümek olurdu. Bir modülün özellikleri birbirini kullanabilir (`ilanlar` → `iletisim`); modüller arası ise yalnız `index.ts` (R6).

| Dosya | Görevi | Neden ayrı |
|---|---|---|
| `<modül>/X.routes.ts` | URL ve middleware | Hangi yolun kimden geçtiği tek bakışta görünür |
| `<modül>/X.controller.ts` | HTTP + günlük | Servis HTTP bilmediği için testi kolay |
| `<modül>/X.service.ts` | İş kuralı (kâr, yetki, stok, tamamlama tarihi) | Sunucu ve veritabanı olmadan test edilir (Fake db) |
| `<modül>/X.repository.ts` | SQL | SQL tek yerde; kural değişince SQL'e dokunulmaz |
| `<modül>/X.schemas.ts` | zod gövde/sorgu şemaları | Alan adları ve tipler belgelenir. Girdisi olmayan uçlarda (veresiye, servis geçmişi) yoktur |
| `<modül>/X.gorunum.ts` / `X.hesap.ts` | Saf kurallar (kim neyi görür, rapor toplamları) | DB'siz, tablo gibi test |

Modüller: `auth`, `musteriler`, `servis` (iş emirleri + QR geçmişi), `aksesuar` (satış + stok), `yedek-parca` (satış + stok),
`eticaret` (+ komisyon), `motor` (ikinci el + sıfır stok + satış belgeleri), `raporlar` (+ veresiye), `vitrin` (ilanlar + medya + iletişim).

**Modül sınırı** (makineyle zorlanır):
- Başka modül ve `server.ts`, bir modüle yalnızca **`index.ts`** üzerinden erişir (`import { upsertMusteri } from '../musteriler'`); iç dosyaya (`../musteriler/musteriler.service`) doğrudan import yasaktır (R6).
- `index.ts` yalnızca `export ... from` satırlarıdır, mantık içermez (R8).
- Modüller arası bağlar `mimari.test.js` içindeki `MODUL_BAGLARI` listesiyle birebir aynıdır ve döngü oluşturmaz (R7). Bugün: aksesuar, motor, servis → musteriler
  (satış ya da iş emri müşteriyi bulur veya açar). Yeni bağ bilinçli karardır: listeye gerekçesiyle yazılır.
- `platform/` hiçbir modüle bağlanmaz (R3). İki modülün ortak ihtiyacı varsa kod `platform/`'a taşınır (örnek: medya, vitrin ile sıfır motorun ortağı olduğu için `platform/medya/`).

Ortak: `platform/lib/tipler.ts` (`Kullanici`, `req.user`, `BaglamDb`), `platform/lib/dogrulama/dogrula.ts` (`GecersizIstek` 400, `BulunamadiHatasi` 404,
`YetkiHatasi` 403, `dogrula()`), `platform/lib/http/kontrolcu.ts` (`sarmala`: try/catch + hata yanıtı), `platform/lib/dogrulama/semalar.ts`
(gevşek zod parçaları), `platform/lib/dogrulama/sayi.ts`, `platform/lib/env.ts` (.env'i HER ŞEYDEN önce yükler; `server.ts` ilk içe aktarır).

### Yeni özellik eklemek
(Önce hangi modüle ait olduğuna karar ver; yoksa yeni klasör aç ve `index.ts` ekle. Modülde özellik klasörleri varsa yeni özellik kendi klasörüne (`<modül>/<özellik>/`), yoksa modül köküne yazılır:
`X.schemas.ts`, `X.repository.ts`, `X.service.ts`, `X.controller.ts`, `X.routes.ts`; katman ya da modül sınırı ihlali `mimari.test.js`'te kırmızı olur.)
1. `schemas.ts`: gövde/sorgu alanlarını yaz (sözleşmeyi bozmamak için türleri gevşek tut, özel mesajları service'te ver).
2. `repository.ts`: SQL fonksiyonları (`db: Veritabani` alır; transaction içinde `tx` aynı arayüzdür).
3. `service.ts`: kuralları yaz; `db: BaglamDb` ilk parametre; durum için `IstemciHatasi` fırlat; transaction `db.withTransaction(async (tx) => ...)`.
4. `controller.ts`: `sarmala('bağlam:', async (req, res) => ...)`; `pool`'u geç; denetim günlüğünü yaz.
5. `routes.ts` yaz, yolu modülün `index.ts`'inden dışa aktar, `server.ts`'e `app.use(...)` ekle (yetki ve `kariGizle` orada).
6. Test: kuralları `tests/unit/` (Fake db), HTTP sözleşmesini `tests/api/` içine yaz.

## Test stratejisi

```
npm run typecheck        tsc (strict; yalnızca .ts)
npm test                 birim: saf kurallar + servisler (Fake veritabanı: tests/unit/sahteDb.js) + sqlParams vb.
npm run test:api         API: gerçek sunucu + gerçek MariaDB (kaynak koddan, tsx)
npm run test:api:paket   API testleri esbuild PAKETİNE karşı (canlıda çalışacak olanın aynısı)
bash scripts/hepsiniDogrula.sh   hepsi sırayla
```
API/paket testleri için `set -a; . ./.env.mariadb.test; set +a` ve yerel MariaDB (bkz. proje notları) gerekir.
`npm run package:hostinger` önce `tsc` çalıştırır; ardından `node --test tests/smoke/paket.smoke.test.js` paketi Hostinger'daki gibi açar.

Durum (2026-10-18): tsc temiz · **248 birim · 201 API (kaynak) · 201 API (paket)** yeşil · paket smoke yeşil.
Birim testlerde kritik kurallar **mutasyonla** doğrulandı (kuralı bozunca test kırılır): masraf/kâr sızıntısı, giriş zamanlama
eşitlemesi, stok kodu değişince parça kodu taşıma, tamamlama tarihi, yapıldı/iade sırası.

## Bilinçli olarak yapılmayanlar (ayrı işler)
- **zod şemaları gevşektir** (sözleşme dondurulduğu için). Sıkılaştırmak (ör. sayı alanı metin kabul etmesin) API değişikliğidir.
- **Yedek parça satışları toplam gelire/kâra girmiyor** (raporlar): mevcut davranış `tests/unit/raporlar.test.js` ile sabitlendi.
- Raporlarda `'2026-01-01'` gömülü tarih (eski aktarılmış motorlar) duruyor.
- `scripts/` ve `tests/` JS kaldı (tsx ile çalışır). `checkJs` kapalı. İstenirse ayrı iş olarak TS'ye çevrilir.
- `platform/database/db.ts` ve `platform/database/sqlParams.ts` yalnızca tip eklendi (eski PostgreSQL ile karşılaştırma aracı iş bitince depodan kaldırıldı); davranış testleri (34 sqlParams birim testi + tüm API testleri) yeşil.
- Medya önbelleği 10 dk: silinen ilanın görseli bir süre bellekten sunulabilir (tasarım, `MedyaOnbellegi` açıklamasında).

## Tuzaklar
- `.js` dosyası `.ts`'yi `require` edebilir (tsx ve esbuild çözer); `export default` `require(...).default` olur.
- Düz `node server.ts` çalışmaz: `npm start` (tsx) kullanın.
- TypeScript 7 `moduleResolution: node10` seçeneğini kaldırdı; `module: preserve` + `bundler` kullanılır.
- Bash araç satırında tek tırnak sayısı çift değilse komut ayrıştırılamaz: Türkçe metinli dosyaları `Write` ile yazın.
- Test dosyalarında SQL'e göre eşleşen Fake kuralları ilk eşleşen kazanır; daha özel kuralı öne koyun.

## Canlıya çıkmadan önce (Faz 7)
1. `bash scripts/hepsiniDogrula.sh` (yeşil olmalı) ve `npm run package:hostinger` + smoke.
2. Canlı DB'ye şema değişikliği YOK bu geçişte (Faz 9'daki `motor_satis_gor` sütunu zaten canlıda).
3. Canlı zip yedeği alınmış olmalı (`deploy/yedek/`). Yeni zip: `deploy/hostinger/kaynarmotor-hostinger.zip` (paket 6,54 MB; zod nedeniyle +0,1 MB).
4. Deploy tarifi `kaynarmotor-yol-haritasi` notunda; sonrasında `/api/health`, `/api/health/database`, giriş yapmadan `/api/vitrin?hepsi=1` = 401,
   ana sayfa > Motor Satışı > ilan listesi gerçek tarayıcıda açılmalı.
