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
- `frontend/`: CRA + React + MUI (JS), `src/features/<alan>/`. Büyük dosyalar bölünecek (bkz. `docs/FRONTEND-BOLME-RAPORU.md`).
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
27 frontend testi yeşil. Canlı hâlâ eski JS paketi (`hostinger` dalı). `typescript` dalı GitHub'a gönderildi (origin/typescript).
CI iş akışı yazıldı (`.github/workflows/dogrula.yml`) ama **GitHub hesabı faturalandırma sorunu yüzünden kilitli: işler başlamıyor**
(Salih: Settings > Billing and plans'tan çözmeli). O zamana kadar yerel güvenlik ağı: `bash backend/scripts/hepsiniDogrula.sh` ve
`.githooks/pre-push` (etkinleştirme: `git config core.hooksPath .githooks`; tsc + birim, ~3 sn). CI'ın adımları henüz GitHub'da doğrulanmadı.
Sıradaki işler: frontend bölme (`docs/FRONTEND-BOLME-RAPORU.md`: Küçük/Orta/Tam kapsam seçimi bekliyor), ESLint/Prettier, Vite+TSX.
