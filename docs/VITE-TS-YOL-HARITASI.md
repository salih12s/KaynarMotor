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

## Aşama 2 sonuçları (2026-10-25)

| Ölçü | Jest (önce) | Vitest 5 (sonra) |
|---|---|---|
| Tam frontend testi (`--maxWorkers=2`) | 415 test, 344 sn | **415 test, 171 sn** (~2 kat hızlı) |
| `npm run test:hizli` (ağır bileşen testleri hariç) | ~26 sn | **~12 sn** (176 test) |
| Test adı listesi | 415 ad | **aynı 415 ad** (dosya + tam ad + durum, sıralanıp `diff` ile karşılaştırıldı) |
| `react-scripts` | bağımlılık | **kaldırıldı** (CRA zinciri: Webpack, Babel, Jest 27, ESLint 8 de gitti) |
| ESLint | CRA `react-app` (ESLint 8) | ESLint 9 düz yapılandırma (`eslint.config.mjs`), **0 hata, 11 uyarı** (aynı) |
| E2E, paket duman testi | yeşil | yeşil (11/11; paket 6,64 MB) |

Kanıt ve mutasyon (testler gerçekten bir şey denetliyor mu):
- `tanimsizDegisken.test.js` yeni ESLint ayarına göre yeniden yazıldı; kasıtlı tanımsız değişken eklenince **kırmızı**, silince yeşil.
- Komisyon: `kdvHaricSatis = satis / (1 + kdv / 10)` (100 yerine 10) -> `komisyon.test.js` 2 test **kırmızı**.
- Kâr gizleme: `IstatistikSatiri` içinde `karGor ? ...` yerine `true ? ...` -> Aksesuarlar testlerinden 2 tanesi **kırmızı** ("kâr yetkisi yoksa kâr çipi ve Kâr sütunu görünmez", "personel kartında kâr yok"). Kodlar geri alındı, yeşil.
- **Taksit: kanıtlanamadı.** Frontend'de taksit hesabı için ayrı birim testi yok (`TaksitHesaplama.jsx`, `TaksitGoruntule.jsx` testsiz). Bu bir boşluk: aşama 4.5'te (para hesabı olan dosyalar) hesap saf fonksiyona çıkarılıp önce testi yazılacak.

Aşamada çıkan notlar:
- Dönüşüm betikle yapıldı: `jest.fn/spyOn/mock/restoreAllMocks` -> `vi.*` (186 yer), `{ virtual: true }` kaldırıldı (Vitest `react-router-dom` v7'yi çözebilir, ama sahte kancalar sözleşme gereği korundu). `vi.hoisted` **gerekmedi**: fabrikalardaki `mockNavigate` gibi dış değişkenlere yalnızca çağrı anında (`() => mockNavigate`) erişiliyor.
- JSX içeren 11 test dosyası `.test.jsx` oldu (`satisVeri` ve `isEmriYazdir` yalnızca HTML metni içerdiği için `.test.js` kaldı).
- CRA'nın örtük `resetMocks: true` ayarı Vitest'te `mockReset: true` olarak açıkça yazıldı; `jest.setTimeout(60000)` -> `testTimeout/hookTimeout: 60000`.
- `bicim.test.js`: Vitest'in `%p` başlık biçimi çalışmıyor (`%p` olduğu gibi yazılıyor, adlar aynı kalıyordu); girdiyi başlığa yazan küçük yardımcıyla Jest'teki adlar birebir korundu.
- ESLint: `no-empty` boş `catch {}`'e izin verir (en iyi çaba işlemleri; CRA bu kuralı açmıyordu), `process` global tanımlı (aşama 3'te `import.meta.env`'e geçince kalkacak).
- `eslint.config.mjs` ve `vite.config.mjs` `.mjs`: paket `"type": "module"` değil.

## Aşama 3 sonuçları (2026-10-25/26)

- TypeScript 6.0.3, `strict: true`, `moduleResolution: bundler`, `noEmit`; `npm run typecheck` paketleme betiğine (`package-hostinger.cjs`) ve CI/yerel doğrulama zincirine girdi (Vite tip denetlemez).
- Ortam değişkeni `import.meta.env.VITE_API_URL` (tek yer: `shared/api/istemci.ts`, `AuthContext` oradaki `API_URL`'i kullanır). Paketleme `VITE_API_URL=/api` verir.
- API tipleri kararı: **(a)** elle yazılmış `frontend/src/shared/tipler/*`. Tipler backend'in `core/veritabani/initDb.ts` şemasından türetildi; MariaDB `DECIMAL` sürücüden **string** döndüğü için para/sayı alanları `Sayi = number | string | null | undefined` ve okuma `sayiDegeri()` ile yapılıyor. Sunucu rol bazında alan sildiği için (kâr yalnızca admin) `Motor` gibi tiplerde alanlar isteğe bağlı.

## Aşama 4 sonuçları (2026-10-25/26)

Sekiz alt adımın hepsi bitti (4.1 yardımcılar, 4.2 API, 4.3 ortak arayüz, 4.4 uygulama kabuğu, 4.5 para hesapları, 4.6 yönetim ekranları, 4.7 herkese açık vitrin, 4.8 testler); her adım ayrı commit.

| Ölçü | Önce | Sonra |
|---|---|---|
| TypeScript oranı (`node scripts/tsOrani.cjs`) | %0 (204 dosya, 26.567 satır) | **%100** (217 dosya, 28.855 satır, testler dahil) |
| `any`, `@ts-ignore`, `@ts-expect-error`, `eslint-disable` (kaynakta) | - | **0 / 0 / 0 / 0** |
| ESLint | 0 hata, **11 uyarı** | 0 hata, **0 uyarı** (11 `exhaustive-deps` tek tek incelenip kapatıldı) |
| `tsc --noEmit` | - | temiz, ~11 sn |
| Frontend testleri (Vitest) | 415 | **431** (fark açıklaması aşağıda) |

Test sayısı farkı: 415 - 3 (kaldırılan tarama testleri) + 18 (yeni taksit birim testi) + 1 (aşağıdaki regression) = **431**.

Dönüştürme sırasında bulunanlar:
- **Taksit boşluğu kapandı:** hesap saf modüle (`taksit/taksitHesap.ts`) çıkarıldı ve ilk kez 18 birim testi yazıldı (aşama 2'de "kanıtlanamadı" denen madde).
- **Gizli hata (IsEmriForm, tam sayfa "Yeni İş Emri"):** "Ad Soyad" serbest metin (`freeSolo`) alanında listeden seçmeden Enter'a basınca `onChange`'e müşteri değil **string** geliyordu; kod onu müşteri nesnesi sayıp telefon ve adresi boşaltıyordu. Düzeltme + regression testi (`IsEmriForm.test.tsx`). **Mutasyonla kanıt:** eski kod geri konunca test kırmızı, düzeltilmiş kodla yeşil.
- Liste yükleme etkisinde bağımlılık dizisi eksikti; `bildir` (snack) işlevi kararlı kimliğe (`useCallback`) alınmadan bağımlılığa eklenseydi sonsuz döngü olurdu, önce işlev sabitlendi.
- Test tarafı: kısmi test verisi için `shared/test/kayit.ts` (`kayit<T>()`, `kayitlar<T>()`). Üretim koduna `as never` girmedi; 112 kullanım yalnızca testlerde sahte (mock) yanıtlar için.

## Aşama 5 sonuçları (2026-10-26)

1. **`allowJs: false`** (ve `checkJs` kalktı): `src` içinde tek `.js/.jsx` yok; `tsc` temiz.
2. **Tip bilgili ESLint** (`typescript-eslint` `recommendedTypeChecked`, `projectService`): ilk koşuda 292 bulgu. Ayrıştırma: gerçek bulgular düzeltildi, gürültü kuralları gerekçesiyle ayarlandı.
   - Düzeltilen (gerçek): MUI `Tabs`/`ToggleButtonGroup` `onChange` değeri `any` sızdırıyordu (8 yer, parametre tipi yazıldı); `useLocation().state` `any` idi (4 yer, tipli okuma); `setTimeout(asyncIslev)` söz döndüren işlev (4 yer); axios yanıt kesicisi `Error` olmayan değerle `reject` edebiliyordu (`istemci.ts`); testlerde gereksiz tip iddiaları (`eslint --fix`, 31 yer).
   - Kapatılan (gerekçe `eslint.config.mjs` içinde): `no-misused-promises` için JSX niteliği/özellik denetimi (React'te `onClick={async ...}` yaygın, 112 yer); `no-base-to-string` (genel amaçlı `String(unknown)` yardımcıları bilerek nesne de alır); testlerde `unbound-method`, `require-await` (sahte async işlevler).
   - **Bilerek kapalı bırakılan: `no-floating-promises` (82 yer).** Etkide `yukle();` gibi çağrılar kendi hatasını yakalıyor; hepsine `void` eklemek davranışı değiştirmez ama diff gürültüsü. Sonraki iş olarak açık duruyor, **kaçak değil, ertelenmiş**.
   - Maliyet: ESLint ~3 sn -> ~34 sn (tip bilgisi). Yerel doğrulamada kabul edilebilir; geliştirirken `eslint src --cache` ya da editör eklentisi.
3. **İki tarama testi kaldırıldı** (`servisCagrilari.test.js` 2 test, `tanimsizDegisken.test.js` 1 test): yakaladıkları hata sınıfları (tanımsız servis metodu, tanımsız değişken) artık derleyicide. Kanıt: kasıtlı hata içeren dosyayla `tsc` her ikisini de yakaladı (`bulkImport` ve tanımsız değişken olayları). "Test yerine tip" kararı olarak README'de anlatılabilir.
4. **(b) ortak zod tipleri değerlendirildi, yapılmadı:** backend `*.schemas.ts` (13 dosya) yalnızca **istek gövdelerini** doğruluyor, üstelik bilerek "gevşek" (`gevsekMetin`, `gevsekSayi`); yanıt biçimleri şemalı değil. Ortak pakete taşımak yalnızca istek tiplerini kapsar, iki paket arasında yol/derleme ayarı ister ve kazanç küçük. Yanıt tipleri zaten `initDb.ts`'ten elle türetiliyor. Gerekirse sonraki adım: yanıt tiplerini `initDb.ts` tablolarından üretmek.
5. **Denenmedi:** `noUncheckedIndexedAccess` (isteğe bağlıydı; açılırsa yüzlerce `arr[0]` düzeltmesi çıkar, ayrı iş). TypeScript 7 (yerel derleyici) denenmedi; şu an 6.0.3.

Son doğrulama zinciri (2026-10-26): `typecheck` temiz, `lint` 0/0, `format:check` temiz, Vitest 431/431, `package:hostinger` 22,8 sn (tsc + Vite + esbuild + zip, zip 6,64 MB), paket duman testi yeşil, E2E 11/11 (Vite dev sunucusunda, ~48 sn). Backend'e dokunulmadı.

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
| 2 | **Kodda bitti, canlıya çıkmadı** | 2026-10-25 | Vitest 5, 415/415 aynı adlar, react-scripts yok, ESLint 9; mutasyon: komisyon ve kâr gizleme kırmızıya döndü, taksit testsiz (boşluk) |
| 3 | **Kodda bitti, canlıya çıkmadı** | 2026-10-25 | TypeScript 6 strict, `typecheck` zincirde, `VITE_API_URL`, elle yazılmış API tipleri (a) |
| 4 | **Kodda bitti, canlıya çıkmadı** | 2026-10-26 | 8 alt adım, %100 TypeScript, `any` 0, ESLint 0 uyarı, 431 test; IsEmriForm freeSolo hatası bulunup düzeltildi |
| 5 | **Kodda bitti, canlıya çıkmadı** | 2026-10-26 | `allowJs: false`, tip bilgili ESLint, iki tarama testi kaldırıldı; ertelenen: `no-floating-promises`, `noUncheckedIndexedAccess`, ortak zod tipleri |
