# Frontend: Vite ve TypeScript'e kademeli geçiş

Amaç: `frontend/` klasörünü CRA (`react-scripts`, bakımı bitti) üzerinden **Vite + Vitest + TypeScript (strict)** yapısına taşımak.
Kural: **her aşama tek başına canlıya çıkabilir.** Bir aşama bitmeden diğerine geçilmez; her aşamanın sonunda tüm doğrulama zinciri yeşildir
ve kullanıcının gördüğü hiçbir şey değişmez (API sözleşmesi, ekranlar, yazdırma çıktıları aynı).

Backend bu işin dışında: zaten strict TypeScript (`docs/TS-GECISI.md`). Burada yapılan, aynı disiplini arayüze getirmek.

---

## Neden (ölçülmüş başlangıç durumu, 2026-10-25)

| Ölçü | Şimdi (CRA) | Hedef | Not |
|---|---|---|---|
| Üretim derlemesi (`react-scripts build`) | **145 sn** | < 20 sn | Paketleme (`npm run package:hostinger`) bu sürenin çoğunu bekliyor |
| Geliştirme sunucusu açılışı (`npm start`, sıcak önbellek) | **19 sn** | < 2 sn | Değişiklik sonrası yenileme de yavaş |
| İlk yüklemede indirilen JS | **1,27 MB (gzip 351 KB), tek dosya** | Vitrin < 150 KB gzip | Bugün `/site`'a gelen **müşteri**, yönetim panelinin tüm kodunu da indiriyor. Rota bazlı bölme ile kullanıcıya görünen gerçek kazanç |
| Frontend kaynak | 178 dosya, ~26.400 satır, %0 TypeScript | %100 `.ts/.tsx`, `strict` | Oran her aşamada ölçülür |
| Frontend testleri | 415 test, 26 dosya (Jest) | Aynı 415 test (Vitest), daha hızlı | Test sayısı geçişte **azalmaz** |

**Kazanç:** bakımı süren araç zinciri, hızlı geliştirme ve derleme, vitrin ziyaretçisi için daha küçük ilk yükleme, derleme anında yakalanan hatalar
(yanlış alan adı, `undefined`, yanlış tipli prop), backend ile aynı dilde bir proje ("baştan sona TypeScript").

**Bedel:** test aracının değişmesi (`jest.*` -> `vi.*`), paketleme betiğinin ve E2E yapılandırmasının güncellenmesi, tip yazma emeği.
Kullanıcı aşama 1-3'te hiçbir fark görmez; tek görünür kazanç aşama 1'deki kod bölmedir.

---

## Güvenlik ağı (her aşamada)

| Tür | Neyi korur | Neden bu tür |
|---|---|---|
| Statik (ESLint, aşama 3'ten sonra `tsc --noEmit`) | Tanımsız değişken, yanlış tip, unutulmuş import | Test değil ama ilk savunma hattı; derleyici değişince "derleme geçti" artık tip kontrolü demek değil (Vite tip kontrol etmez) |
| Unit / Integration (415 frontend testi) | Bileşen davranışı, hesaplar (kâr, komisyon, taksit), yetkiye göre görünürlük | Geçişin asıl kanıtı: aynı testler aynı sonucu vermeli. Sayı bir aşamada düşerse aşama bitmemiştir |
| E2E (Playwright, 11 test) | Giriş ve rol, iş emri, motor satışı, kenar menü düzeni | Derleyici değişikliği gerçek tarayıcıda ancak böyle görülür; birim testleri jsdom'da çalışır |
| Smoke (paket duman testi) | Zip açılır, üretim modunda başlar, `/static/js/main.*.js` kalıcı önbelleğe alınır, API ayakta | Vite'ın çıktı düzeni farklı; sunucunun ve Hostinger paketinin onu doğru sunduğu burada görülür |
| Regression | Geçişte bulunan her hata | Önce hatayı yakalayan test, sonra düzeltme |
| Mutation (seçerek) | Taşınan testler gerçekten bir şey denetliyor mu | `jest.mock` -> `vi.mock` gibi taşımalarda bir testin "boş geçmesi" en büyük risk; birkaç kritik testte kodu bozup testin kırmızıya döndüğü gösterilir |

Komutlar (aşama sonunda hepsi): `npm run lint`, frontend testleri, `npm run format:check`, `bash backend/scripts/hepsiniDogrula.sh`,
`npm run test:e2e` (dev sunucuları kapalı), `npm run package:hostinger` + `node --test tests/smoke/paket.smoke.test.js` (`.env.mariadb.dev` ile).

---

## Aşama 0: hazırlık (yarım saat)

- `vite-ts` dalı aç (`typescript` dalından).
- Başlangıç ölçülerini bu belgeye yaz: yukarıdaki tablo + tam frontend test süresi (`--maxWorkers=2`).
- Küçük bir ölçüm betiği: `scripts/tsOrani.cjs` (`.ts/.tsx` dosya ve satır oranı). Her aşama sonunda çalıştırılır, README'deki "TypeScript oranı" buradan gelir.

**Bitti sayılır:** dal açık, ölçüler yazılı.

---

## Aşama 1: CRA -> Vite (yalnızca derleyici; testler şimdilik Jest'te kalır)

Tek hareketli parça derleyici olsun diye testlere dokunulmaz: `react-scripts` bu aşamada **yalnızca `npm test` için** kalır.

1. Bağımlılık: `vite`, `@vitejs/plugin-react`. `vite.config.js` (port 3100, `server.open: false`).
2. `public/index.html` -> `frontend/index.html`; `%PUBLIC_URL%` önekleri kaldırılır; `<script type="module" src="/src/index.jsx">` eklenir.
3. **Ortam değişkeni:** bu aşamada kod değişmez. `vite.config.js` içinde `define: { 'process.env.REACT_APP_API_URL': ... }` ile aynı ad
   derleme anında yerine konur (iki kullanım: `shared/api/istemci.js`, `features/auth/AuthContext.jsx`). `import.meta.env`'e geçiş aşama 3'te,
   Jest artık yokken yapılır (Jest `import.meta`'yı ayrıştıramaz).
4. **JSX içeren `.js` dosyaları:** Vite eklentisi JSX'i `.jsx`'te bekler. Gerçekten JSX içerenler `.jsx` yapılır
   (aday: `shared/sorgu/sorguluRender.js`; yazdırma betiklerindeki HTML şablon metinleri JSX değildir, onlara dokunulmaz).
5. **Çıktı düzeni sunucuyla aynı kalır** (backend ve duman testi değişmesin diye):
   `build.outDir: 'build'`, `build.assetsDir: 'static'`, Rollup çıktı adları `static/js/main.[hash].js`, `static/js/[name].[hash].js`,
   `static/css/...`, `static/media/...`, `output.hashCharacters: 'hex'`. Böylece `backend/server.ts`'teki `/static` (immutable) kuralı ve
   duman testindeki `/static\/js\/main\.[a-z0-9]+\.js/` aynen çalışır.
6. **Kod bölme:** `app/App.jsx` rotaları `React.lazy` + `Suspense` ile; en az iki parça: herkese açık vitrin (`/site`, `/ilan/:id`, `/taksit/:fiyat`,
   `/s/:token`) ve yönetim paneli. Ölçü: `/site` ilk yükleme boyutu (tabloya yazılır).
7. `scripts/package-hostinger.cjs`: `npx react-scripts build` -> `npx vite build` (ortam: `REACT_APP_API_URL=/api`, kaynak haritası kapalı).
8. `playwright.config.js`: web sunucusu komutu Vite (`npm start` = `vite`), port ve ortam değişkeni aynı.
9. `browserslist` yerine Vite `build.target` (varsayılan yeterli; Hostinger'daki ziyaretçi tarayıcıları için not düşülür).

**Riskler:** `qrcode`, `jsbarcode`, `react-to-print` paketlerinin ES modül çözümlemesi (dev ve build ayrı denenir); `public/` içindeki video ve görsellerin yolları.
**Bitti sayılır:** dev ve build Vite ile; 415 test (hâlâ Jest) + E2E + duman testi yeşil; derleme ve açılış süreleri ve `/site` boyutu ölçülüp yazılmış.
**Canlıya çıkabilir:** evet (kullanıcıya görünen tek fark daha hızlı açılan vitrin).

---

## Aşama 2: Jest -> Vitest, `react-scripts` tamamen kalkar

1. `vitest`, `jsdom`; `vite.config.js` içinde `test: { environment: 'jsdom', setupFiles: 'src/setupTests.js', globals: true, testTimeout: 60000 }`.
   Testlerdeki JSX için ya test dosyaları `.test.jsx` yapılır ya da yalnız testlerde `.js` için JSX yükleyicisi açılır (tercih: yeniden adlandırma).
2. Kod dönüşümü (betikle, elle değil): `jest.fn` (114) -> `vi.fn`, `jest.spyOn` (22) -> `vi.spyOn`, `jest.restoreAllMocks` (7), `jest.setTimeout` -> yapılandırma.
   **`jest.mock` (43) dikkat ister:** `vi.mock` dosyanın başına taşınır; fabrika içinden dış değişkene erişen yerler `vi.hoisted` ile yazılır.
   Her dosya taşındıktan sonra o dosyanın testleri tek tek koşulur.
3. `src/tanimsizDegisken.test.js` CRA'nın ESLint ayarına bağlı: yeni ESLint ayarıyla çalışacak şekilde yeniden yazılır (aşama 5'te tip kontrolü bu işi üstlenince kaldırılır).
4. ESLint 9 düz yapılandırma (`eslint.config.js`): `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `no-undef`; `eslint-config-react-app` kalkar.
5. `package.json`: `react-scripts` silinir; `test`, `test:hizli` (Vitest zaten hızlı olduğundan muhtemelen gereksiz), `lint` güncellenir.
6. Kanıt: **aynı 415 test adı** Vitest'te geçer (liste karşılaştırılır); üç kritik testte (kâr gizleme, komisyon, taksit) kodu bozup testin kırmızıya döndüğü gösterilir (mutation).

**Bitti sayılır:** `react-scripts` bağımlılıklarda yok; 415/415; test süresi ölçülüp yazılmış.

---

## Aşama 3: TypeScript temeli (henüz dosya dönüşümü yok)

1. `typescript`, `@types/react`, `@types/react-dom`; `tsconfig.json`: `strict: true`, `allowJs: true`, `checkJs: false`, `jsx: react-jsx`, `noEmit: true`, `moduleResolution: bundler`.
2. `src/vite-env.d.ts` ve `ImportMetaEnv` tipi; ortam değişkeni `import.meta.env.VITE_API_URL`'e geçer (tek yer: `shared/api/istemci.ts`; `AuthContext` oradaki `API_URL`'i kullanır, kopyası kalkar).
   Paketleme betiği ve Playwright ayarı `VITE_API_URL` verir.
3. `npm run typecheck` (`tsc --noEmit`) eklenir; **paketleme betiğine ve doğrulama zincirine** girer (Vite tip kontrol etmez, aksi hâlde tip hatalı kod pakete girer; backend'deki kuralın aynısı).
4. Karar: **API tipleri nereden gelecek?** Seçenekler: (a) frontend'de elle yazılmış `shared/tipler/` (basit, hemen); (b) backend `schemas.ts` (zod) tiplerini
   ortak bir klasörden paylaşmak (tek doğruluk kaynağı, ama iki paket arasında yol ve derleme ayarı ister). Öneri: (a) ile başla, (b)'yi aşama 5'te değerlendir.

**Bitti sayılır:** `tsc --noEmit` temiz ve zincirde; ortam değişkeni Vite usulü.

---

## Aşama 4: dosya dosya `.ts/.tsx` (en riskli ve en uzun aşama; küçük commit'ler)

Sıra **risk ve bağımlılık** sırasıdır: önce başkalarının kullandığı saf parçalar, sonra para ve yetki taşıyan ekranlar.
Her adım: dosyayı yeniden adlandır, tipleri yaz, `any` yok (ESLint `@typescript-eslint/no-explicit-any` hata), testler aynen geçer, tek commit.

| Adım | Kapsam | Neden bu sırada |
|---|---|---|
| 4.1 | `shared/utils` (`bicim`, `plakaBicim`, `sonIstek`, `htmlKacis`, `stokEtiketi`), `app/tokenlar` | Saf fonksiyonlar, testleri var; herkes bunları kullanır |
| 4.2 | `shared/api` (istemci + servis modülleri, istek/yanıt tipleri) | Tip hatalarının çoğu API sınırında doğar; `servisCagrilari.test.js`'in denetlediği hata ("tanımsız servis metodu") artık derlemede yakalanır |
| 4.3 | `shared/ui` (Plaka, Damga, IslemDugmesi, OzetSeridi, DialogBasligi, BilgiKarti, Onay, MevcutStok, sagaSutunlar) | Ortak bileşenlerin prop tipleri tüm ekranlara yayılır |
| 4.4 | `app/` (tema, Layout, App, AuthContext); `Rol = 'admin' \| 'personel' \| 'yatirimci' \| 'muhasebeci'` | Yetki ve rol kuralları tipte görünür (kâr yalnızca admin) |
| 4.5 | Para hesabı olanlar: `raporlar/raporHesap`, `eticaret/komisyon`, `taksit`, aksesuar toplamları | En riskli iş kuralları; testleri en güçlü olanlar |
| 4.6 | Ekranlar: servis (iş emri) -> motor (satış, stok) -> aksesuar -> yedek parça -> e-ticaret -> raporlar -> müşteriler, kullanıcılar, belge arşivi -> vitrin yönetimi | Kullanım sıklığı ve para etkisi |
| 4.7 | Herkese açık vitrin (`vitrin/magaza`, `VitrinOrtak`, `TaksitGoruntule`, `ServisGecmisi`) | Müşteriye dönük; en son ve ayrı doğrulamayla |
| 4.8 | Test dosyaları `.test.tsx` | İsteğe bağlı; davranış değil, okunabilirlik |

Bu aşamada 11 `exhaustive-deps` uyarısı, ilgili dosya dönüştürülürken tek tek incelenip kapatılır (her biri davranış analizi ister).
Dönüştürme sırasında bulunan her gerçek hata önce bir testle yakalanır, sonra düzeltilir (regression).

**Bitti sayılır:** `tsOrani` %100; `allowJs` kapatılabilir durumda.

---

## Aşama 5: sıkılaştırma ve sunum

1. `allowJs: false`; isteğe bağlı `noUncheckedIndexedAccess`.
2. ESLint `typescript-eslint` tip bilgili kurallar (`recommended-type-checked`).
3. `tanimsizDegisken.test.js` ve `servisCagrilari.test.js` kaldırılır: yakaladıkları hatalar artık derleyicide. README'de "test yerine tip" kararı olarak anlatılır.
4. (b) seçeneği değerlendirilir: backend zod şemalarından ortak API tipleri.
5. README ve `CLAUDE.md`: teknoloji tablosu (Vite, Vitest, TypeScript), ölçü tablosunun "sonra" sütunu, komutlar.

---

## Aşama 0 taban ölçüleri (2026-10-25)

| Ölçü | Değer |
|---|---|
| Frontend kaynak (testler dahil) | 204 dosya, 26.567 satır, %0 TypeScript (`node scripts/tsOrani.cjs`) |
| Tam frontend testi (Jest, `--maxWorkers=2`) | 415 test, 26 dosya, **5 dk 44 sn** |
| E2E (Playwright) | 11 test, ~1,5 dk |

## Aşama 1 sonuçları (2026-10-25)

| Ölçü | CRA (önce) | Vite 8 (sonra) |
|---|---|---|
| Üretim derlemesi | 145 sn | **~1 sn** (`vite build`) |
| Paketleme (`npm run package:hostinger`: tsc + arayüz + esbuild + zip) | ~3 dk | **15 sn** |
| Geliştirme sunucusu açılışı | 19 sn | **0,24 sn** |
| `/site` ilk yükleme (JS, gzip, tarayıcıda ölçüldü) | 351 KB tek dosya | **206 KB** (31 dosya, ham 620 KB). Hedef <150 KB tutmadı: kalan yük React + MUI çekirdeği (main 93 KB + Box 37 KB + TextField 15 KB gzip) |
| `/login` ilk yükleme | 351 KB | 179 KB |
| E2E | 11/11 | **11/11** (Vite dev sunucusunda, ~54 sn) |
| Paket duman testi | yeşil | yeşil |
| ESLint | 0 hata, 11 uyarı | 0 hata, 11 uyarı (aynı) |

Aşamada çıkan notlar (bir sonrakine taşınanlar):
- Vite 8 **Rolldown** kullanıyor: `rollupOptions` hâlâ çalışıyor, `hashCharacters: 'hex'` dahil; çıktı `static/js/main.<hex>.js` düzeni backend ve duman testiyle uyumlu. Çıktı deterministik (aynı kaynak, aynı özet).
- `.js` içinde gerçek JSX yalnızca `shared/sorgu/sorguluRender` idi (`.jsx` yapıldı); tüm `.js` dosyaları dev sunucudan geçirilerek tarandı.
- `emptyOutDir` yolda ASCII dışı karakter (`GüncelProjelerim`) varsa temizlemiyor (Node 24.4 hatası; paket betiği kendi `temizle`'siyle çözüyor). Elle `vite build` koşarken önce `build/` silinmeli.
- Playwright web portu `E2E_WEB_PORT` ile değiştirilebilir (varsayılan 3100); `1-giris.spec.js` içinde sabit `3100` yazan bir URL denetimi porttan bağımsız yapıldı.
- Vite `PORT` ortam değişkenini okumaz: port `vite.config.mjs` içinde (3100, `strictPort`).

## Takvim (tahmini, oturum bazında)

| Aşama | Emek | Canlıya çıkış |
|---|---|---|
| 0 | 0,5 saat | yok |
| 1 | 0,5-1 gün | evet (kod bölme dahil) |
| 2 | 0,5-1 gün | evet (kullanıcıya fark yok) |
| 3 | 2-3 saat | evet |
| 4 | 3-5 gün, parça parça | her alt adım sonunda istenirse |
| 5 | 0,5 gün | evet |

Her canlıya çıkış ayrıca onaylanır (`CLAUDE.md` deploy kuralı). Geri dönüş: her yayın öncesi canlı paket `deploy/yedek/` altına alınır.

## Durum

| Aşama | Durum | Tarih | Not |
|---|---|---|---|
| 0 | **Bitti** | 2026-10-25 | `vite-ts` dalı, `scripts/tsOrani.cjs`, taban ölçüleri aşağıda |
| 1 | **Kodda bitti, canlıya çıkmadı** | 2026-10-25 | Vite 8 dev+build, kod bölme, paket+duman yeşil, E2E 11/11; Jest sonucu ve ölçüler "Aşama 1 sonuçları" bölümünde |
| 2 | Bekliyor | | |
| 3 | Bekliyor | | |
| 4 | Bekliyor | | |
| 5 | Bekliyor | | |
