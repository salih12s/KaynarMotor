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

## Komutlar
```
# backend klasöründe (yerel MariaDB açık olmalı; env dosyaları git dışıdır)
set -a; . ./.env.mariadb.test; set +a
bash scripts/hepsiniDogrula.sh        # tsc + birim + API(kaynak) + API(paket)
npm run typecheck | npm test | npm run test:api | npm run test:api:paket
npm run dev      # tsx watch (port 5100); frontend: npm start (port 3100)
# kökte
npm run package:hostinger             # tsc + frontend build + esbuild + zip  → deploy/hostinger/
```

## Kurallar
- **Canlıya çıkmadan önce kullanıcıya sor** (gerçek işletme verisi). Deploy tarifi: `docs/HOSTINGER.md`.
- Test yaz/çalıştır: servisler Fake veritabanıyla (`backend/tests/unit/sahteDb.js`), HTTP sözleşmesi API testleriyle; kritik kuralları
  mutasyonla doğrula. Refactor'da **API sözleşmesi (durum kodu, mesaj, yanıt biçimi) değişmez**.
- Geri alınamayanı silme: git dışı dosyaları taşı. Kullanıcının izlenmeyen dosyalarını (`docs/ogrenme/`, `scripts/*learning*`,
  `docs/PROJE-INCELEME-VE-OGRENME.md`) commit'e katma; `git add` için yolları tek tek ver.
- Bash araç satırında tek tırnak sayısı çift değilse komut ayrıştırılamaz: Türkçe metinli dosyaları Write aracıyla yaz.
- MUI ikonları tek tek içe aktarılır: `import X from '@mui/icons-material/X'`.

## Durum (2026-10-18)
`typescript` dalı: backend TS geçişi + katmanlı yapı + klasör düzeni + genel temizlik **tamam**; tsc temiz, 248 birim, 201 API (kaynak ve paket),
328 frontend testi yeşil (Testing Library kurulu; sekiz ekran için bileşen + birim testleri; tam koşu ~4-8 dk, geliştirirken `cd frontend && npm run test:hizli` ~26 sn). Canlı hâlâ eski JS paketi (`hostinger` dalı). `typescript` dalı GitHub'a gönderildi (origin/typescript).
**KARAR: Salih GitHub faturalandırmasını çözmeyecek, GitHub Actions kullanılmayacak.** `.github/workflows/dogrula.yml` yalnızca elle
tetiklenir (kırmızı ✗ üretmesin diye) ve GitHub'da hiç doğrulanmadı. Asıl güvenlik ağı yerel: `bash backend/scripts/hepsiniDogrula.sh` (+ frontend testleri) ve
`.githooks/pre-push` (etkinleştirme: `git config core.hooksPath .githooks`; tsc + birim, ~3 sn). README'de CI rozeti KOYMA; kanıt olarak test sayılarını yaz.
Frontend bölme **bitti (2026-10-19)**: Raporlar 1563->95, IsEmirleri 950->53, Vitrin 972->75, MotorStok 779->66, IkinciElMotor 709->57, Storefront 721->77, ETicaret 622->52, Aksesuarlar 614->33.
Yöntem ve kurallar `docs/FRONTEND-BOLME-RAPORU.md` §9'da (önce karakterizasyon testi, betikle taşıma, eski-yeni HTML karşılaştırması).
Sonraki işler: TanStack Query (ayrı adım), ESLint/Prettier, Vite+TSX.
**Tüm kalan işler, öncelik sırası ve sunum (portföy) hedefi: `docs/YOL-HARITASI.md`.** Yeni sohbette önce onu oku.
