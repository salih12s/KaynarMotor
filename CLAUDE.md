# KaynarMotor CRM: çalışma notları

Motosiklet satış + servis işletmesi için CRM (servis iş emirleri, ikinci el motor alım/satım ve stok, aksesuar/yedek parça,
e-ticaret, müşteriler, raporlar, veresiye, herkese açık vitrin, muhasebeci belge arşivi). Dil: **Türkçe**. Depo herkese
açıktır: gerçek müşteri verisi, parola, token ve kullanıcı adı **commit edilmez**. Canlı: kaynarmotor.com.tr (Hostinger Node + MariaDB).

## Mimari
- `backend/`: Express + **TypeScript (strict)** + mysql2 + zod; `tsx` ile çalışır, `esbuild` tek dosyaya paketler.
  Her özellik kendi klasöründe: `X.routes / controller / service / repository / schemas.ts` (sade fonksiyonlar).
  service express bilmez (hata `IstemciHatasi` sınıflarıyla), denetim günlüğü controller'da, saf kurallar `*.gorunum.ts` / `*.hesap.ts`.
  Klasörler: `core/{veritabani,dogrulama,http,gunluk,onbellek,middleware}`, `shared/`, `modules/<alan>/<özellik>/`.
  **Ayrıntı ve "yeni özellik ekleme" adımları: `docs/TS-GECISI.md`.**
- `frontend/`: CRA + React + MUI (JS), `src/features/<alan>/`. Bölme sürüyor (bkz. `docs/FRONTEND-BOLME-RAPORU.md`): **büyük dosyaların hepsi bölündü** (Raporlar, IsEmirleri, Vitrin, MotorStok, IkinciElMotor, Storefront, ETicaret, Aksesuarlar)
- Roller: admin, personel (modül yetkileri), yatırımcı, muhasebeci. **Kâr yalnızca admin görür.** Alan düzeyinde görünürlük:
  `backend/modules/motor/ikinciElMotor/ikinciElMotor.gorunum.ts` + `core/middleware/yetki.ts` (`kariGizle`).
  **İstisna (2026-10-22): e-ticaret kârı, `eticaret_yetkisi` olan herkese açıktır** (`/api/eticaret` `kariGizle` dışında; arayüzde `karGor`).

## Komutlar
```
# backend klasöründe (yerel MariaDB açık olmalı; env dosyaları git dışıdır)
set -a; . ./.env.mariadb.test; set +a
bash scripts/hepsiniDogrula.sh        # tsc + birim + API(kaynak) + API(paket)
npm run typecheck | npm test | npm run test:api | npm run test:api:paket
npm run dev      # tsx watch (port 5100); frontend: npm start (port 3100)
# kökte
npm run package:hostinger             # tsc + frontend build + esbuild + zip  → deploy/hostinger/
npm run format:check                  # Prettier (yazmak için: npm run format); frontend: npm run lint (ESLint)
npm run test:e2e                      # Playwright (gerçek Chrome + sıfırdan kurulan test_kaynar_e2e; yerel MariaDB açık olmalı; ~1,5 dk)
```

## Kurallar
- **Canlıya çıkmadan önce kullanıcıya sor** (gerçek işletme verisi). Deploy tarifi: `docs/HOSTINGER.md`.
- Test yaz/çalıştır: servisler Fake veritabanıyla (`backend/tests/unit/sahteDb.js`), HTTP sözleşmesi API testleriyle; kritik kuralları
  mutasyonla doğrula. Refactor'da **API sözleşmesi (durum kodu, mesaj, yanıt biçimi) değişmez**.
- Geri alınamayanı silme: git dışı dosyaları taşı. Kullanıcının izlenmeyen dosyalarını (`docs/ogrenme/`, `scripts/*learning*`,
  `docs/PROJE-INCELEME-VE-OGRENME.md`) commit'e katma; `git add` için yolları tek tek ver.
- Bash araç satırında tek tırnak sayısı çift değilse komut ayrıştırılamaz: Türkçe metinli dosyaları Write aracıyla yaz.
- MUI ikonları tek tek içe aktarılır: `import X from '@mui/icons-material/X'`.

## Durum (2026-10-25)
`typescript` dalı (= `main`, GitHub'da) **canlıda**: kaynarmotor.com.tr 2026-10-25'te bu daldan yayına alındı (Hostinger build 01a17083; önceki yayın 21 Ekim).
Doğrulama: tsc temiz, 248 birim, 203 API (kaynak ve paket), 406 frontend, 13 E2E (Playwright, `npm run test:e2e`). Tam frontend koşusu için
`--maxWorkers=2` kullan (yavaş makinede 60 sn zaman aşımı flaky üretir); geliştirirken `cd frontend && npm run test:hizli` (~26 sn).
**Deploy (her seferinde kullanıcı onayı):** `npm run package:hostinger` → `cd backend && node --test tests/smoke/paket.smoke.test.js` → Hostinger MCP
`hosting_deploy` (domain kaynarmotor.com.tr, path = deploy/hostinger/kaynarmotor-hostinger.zip, type nodejs, appType nest, nodeVersion 24,
outputDirectory dist, buildScript build, entryFile main.cjs) → `hosting_get-deployment` ile bekle → `/api/health`, `/api/health/database`, anonim
korumalı uçlar 401, canlı arayüz dosya adı yerel paketle eşleşmeli. Ortam değişkenlerine DOKUNMA. Önceki paketler: `deploy/yedek/` (git dışı).
**Hostinger MCP:** sunucular `npx @latest` yerine `~/.hostinger-mcp` içindeki sabit sürümden (3.8.1) `node` ile çalışır (npx yarışı "Connection closed"
üretiyordu). Yanlış hesapla oturum açıldıysa: `node ~/.hostinger-mcp/node_modules/@hostinger/mcp/src/servers/all.js --logout`, sonra `--login`.
**KARAR: Salih GitHub faturalandırmasını çözmeyecek, GitHub Actions kullanılmayacak.** `.github/workflows/dogrula.yml` yalnızca elle tetiklenir.
Güvenlik ağı yerel: `bash backend/scripts/hepsiniDogrula.sh` (+ frontend + E2E) ve `.githooks/pre-push` (etkinleştirme: `git config core.hooksPath .githooks`).
README'de CI rozeti KOYMA; kanıt olarak test sayılarını yaz.
Frontend bölme **bitti**; satır sayıları Prettier sonrası: Raporlar 126 (1563'ten), IsEmirleri 72, Vitrin 107, MotorStok 102, IkinciElMotor 84, Storefront 77, ETicaret 74, Aksesuarlar 49.
Yöntem ve kurallar `docs/FRONTEND-BOLME-RAPORU.md` §9'da. Tamamlananlar: bicim.js, ESLint/Prettier, TanStack Query (İş Emirleri, Motor, Raporlar), Playwright E2E.
Sonraki işler: `plain_sifre` kararı, tasarım gözden geçirme, Vite+TSX.
**Tüm kalan işler, öncelik sırası ve sunum (portföy) hedefi: `docs/YOL-HARITASI.md`.** Yeni sohbette önce onu oku.
