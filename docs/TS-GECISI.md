# Backend TypeScript geçişi ve katmanlı yapı

`typescript` dalında yürür. **Hepsi bitmeden canlıya çıkılmaz** (karar: Salih, 2026-10-18). Canlıdaki sürümün yedeği:
`deploy/yedek/kaynarmotor-hostinger-2026-10-18-canli.zip` (git'te değil).

## Kararlar
- Express'te kalınır. Gerçek NestJS kullanılmaz: esbuild `emitDecoratorMetadata` desteklemez ve Hostinger'a tek `main.cjs` gider.
- NestJS **tarzı** katmanlar, **sade fonksiyonlarla** (sınıf/decorator yok). Her özellik (route dosyası) için:
  `*.routes.ts` (URL → controller) · `*.controller.ts` (HTTP) · `*.service.ts` (iş kuralları, express bilmez) ·
  `*.repository.ts` (yalnız SQL) · `*.schemas.ts` (zod doğrulama). Soneklerde İngilizce, alan adlarında Türkçe.
- Doğrulama: `zod`.
- **API sözleşmesi değişmez**: status kodları ve JSON yanıtları aynı kalır; bilinen tutarsızlıklar ayrı iş.
- Sıra (Yol A): önce altyapı ve ortak çekirdek, sonra modüller küçükten büyüğe; her modülde iki commit (A: TS'ye çevir,
  B: katmanlara böl), her commit sonrası testler yeşil.

## Fazlar
| Faz | İş | Durum |
|---|---|---|
| 0 | Zemin: commit, `typescript` dalı, canlı zip yedeği | ✔ |
| 1 | Altyapı: typescript, tsx, tsconfig, zod, paket tip kontrolü, testler tsx ile, paket üzerinde API testi | ✔ |
| 2 | Ortak tipler (`Kullanici`, `req.user`), hata/doğrulama yardımcıları, `db.withTransaction` | |
| 3 | Core yaprakları + riskli çekirdek (`db`, `sqlParams`, `initDb`, `auth/yetki`) | |
| 4 | Pilot modül: `musteriler` (TS + 5 katman) | |
| 5 | Kalan modüller: yedek-parca → servis → aksesuar → eticaret → motor → raporlar → auth → vitrin | |
| 6 | `server.ts`, `strict`, temizlik | |
| 7 | Paket üzerinde tüm testler, sonra (onayla) canlı | |

## Komutlar (backend klasöründe)
```
npm run typecheck        tsc: tip kontrolü (şu an yalnız .ts dosyaları denetlenir, checkJs kapalı)
npm run dev              tsx watch server.js
npm test                 birim testler            (node --import tsx --test)
npm run test:api         API testleri, kaynak koddan (gerçek sunucu + MariaDB)
npm run test:api:paket   API testleri, PAKETLENMİŞ sunucuya karşı (canlıda çalışacak olanın aynısı)
```
API testleri için: `set -a; . ./.env.mariadb.test; set +a` (yerel MariaDB açık olmalı, bkz. proje notları).
`npm run package:hostinger` artık önce `tsc` çalıştırır; tip hatası varsa paket üretilmez (esbuild tipleri kontrol etmez, siler).

## Tuzaklar
- `.js` dosyası `.ts` dosyasını `require` edebilir (tsx ve esbuild çözer). `export default` ise `require(...).default` olur;
  `module.exports = x` kalıbından `export default x`'e geçerken **çağıranları aynı commit'te** güncelleyin.
- TypeScript 7 `moduleResolution: node10` seçeneğini kaldırdı; `module: preserve` + `bundler` kullanılır.
- Düz `node server.js` artık `.ts` içeren kodu okuyamaz: `tsx server.js` veya `node --import tsx server.js`.
