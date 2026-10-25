# Frontend bölme raporu

Hazırlayan: Claude, 2026-10-18 (`typescript` dalı, backend düzeni bittikten sonra). Başka bir sohbette doğrudan buradan devam edilebilir.
**Durum (2026-10-18): Raporlar, IsEmirleri ve Vitrin yönetimi bölündü ve doğrulandı (§9). Sıradaki: MotorStok + IkinciElMotor.** Kapsam seçimi: Salih "Küçük" ile başladı; TanStack Query ayrı bir adım.

## 1. Neden
Backend katmanlı ve testli (puan ~9/10), frontend ise en zayıf halka (~5/10): sekiz dosya 600-1563 satır, tek bileşende
12-32 `useState`. Bu boyutta bir dosyada değişiklik yapmak yavaş ve risklidir (başka sekmeyi bozmak kolay), kod incelemesi
zordur. Hedef: **hiçbir bileşen ~300 satırı geçmesin**, durum ve veri çekme bileşenlerden ayrılsın, tekrar eden parçalar paylaşılsın.

## 2. Mevcut durum (ölçüm)
| Dosya | Satır | useState | İç yapı |
|---|---|---|---|
| `features/raporlar/Raporlar.jsx` | 1563 | 22 | 2 bileşen (`YatirimciRapor`, `Raporlar`); **10 sekme + 3 detay modalı** tek JSX'te |
| `features/vitrin/yonetim/Vitrin.jsx` | 972 | 32 | kategori kartı, ürün diyaloğu, iletişim diyaloğu, 12 `handle*` + sürükle-bırak |
| `features/servis/IsEmirleri.jsx` | 950 | 15 | liste, yeni/düzenle modalı (~300 satır), detay modalı (`IsEmriDetayModal`), QR/yazdırma |
| `features/motor/MotorStok.jsx` | 779 | 15 | liste, ekle/düzenle diyaloğu, hızlı satış diyaloğu, `StokDetayModal` |
| `features/vitrin/magaza/Storefront.jsx` | 721 | 19 | video giriş, kategori kartları, filtreler, ilan ızgarası, taksit diyaloğu, footer |
| `features/motor/IkinciElMotor.jsx` | 709 | 15 | liste (tablo+kart), satış diyaloğu, `MotorDetayModal` (yazdırılabilir) |
| `features/eticaret/ETicaret.jsx` | 622 | 12 | 2 sekme, satış diyaloğu (komisyon sonuçları ~100 satır), platform diyaloğu, detay diyaloğu |
| `features/aksesuar/Aksesuarlar.jsx` | 614 | 13 | liste, satış diyaloğu, detay diyaloğu |

Toplam frontend: 52 kaynak dosya, ~12.500 satır, **TypeScript yok**, 27 test (hiçbiri bileşen testi değil).

Tekrar eden desenler (paylaşım adayı): `toLocaleString('tr-TR')` 161 yerde / 20 dosyada, tarih/para biçimleyiciler 225 yerde / 11 dosyada,
`useReactToPrint` 4 dosyada, `Dialog` 32 yerde / 14 dosyada, `sonIstek()` 13 dosyada. Detay modalları (Motor/Stok/İş emri/Aksesuar/E-ticaret
için 6 ayrı kopya) birbirine çok benzer.

## 3. Hedef yapı (örnek: raporlar)
```
features/raporlar/
  Raporlar.jsx              ince kabuk: sekme çubuğu + seçili sekmeyi çizer (~150 satır)
  useRaporVerisi.js         loadRapor / loadFisKar, tarih aralığı, yükleniyor/hata durumu (özel hook)
  sekmeler/
    GenelOzet.jsx  MotorSatislari.jsx  IsEmirleri.jsx  AksesuarSatislari.jsx
    ETicaret.jsx   YedekParca.jsx      Yatirimcilar.jsx  YatirimciRapor.jsx
  modallar/
    MotorDetayModal.jsx  AksesuarDetayModal.jsx  ETicaretDetayModal.jsx  IsEmriDetayModal.jsx
  bilesenler/KartItem.jsx   (şimdi bileşenin İÇİNDE tanımlı: her render'da yeniden oluşuyor, ayrı dosyaya alınmalı)
```
Aynı kalıp diğerlerine: **kabuk (durum + veri) → alt bileşenler (yalnızca çizim, props ile)**.
Paylaşılan parçalar `src/shared/`: `bicim.js` (para/tarih/sayı, tek kaynak), `DetayModal` iskeleti, `useYazdir` hook'u (react-to-print sarmalayıcı).

## 4. Dosya dosya plan
| Sıra | Dosya | Bölme | Zorluk | Süre (tahmin) |
|---|---|---|---|---|
| 1 | Raporlar | 10 sekme → 8 sekme bileşeni + 3-4 modal + hook | Orta (sekmeler doğal sınır; `KartItem` iç tanım) | 1-2 sa |
| 2 | IsEmirleri | form modalı, detay modalı, QR/yazdırma yardımcıları ayrı; `useIsEmirleri` hook | Orta | 1-1,5 sa |
| 3 | Vitrin (yönetim) | `KategoriIletisimKarti`, `UrunDialog` (görsel yönetimi alt bileşen), `IletisimDialog`, `useVitrinUrunleri` | **Yüksek** (32 state, sürükle-bırak, görsel boyutlandırma) | 1,5-2 sa |
| 4 | MotorStok + IkinciElMotor | ortak `MotorDetayModal`, ekle/düzenle ve hızlı satış diyaloğu ayrı | Orta | 1,5 sa (ikisi birlikte) |
| 5 | Storefront | `VideoGiris`, `KategoriKartlari`, `FiltrePaneli`, `IlanIzgarasi`, `TaksitDialog`, `Footer` | Orta (herkese açık sayfa: görsel kalite önemli) | 1-1,5 sa |
| 6 | ETicaret, Aksesuarlar | sekme/diyalog bileşenleri | Düşük-orta | 1 sa |
**Toplam: ~8-10 saatlik çalışma (2-3 uzun sohbet).** Önerilen kapsam seçenekleri: *Küçük* = yalnızca 1; *Orta* = 1+2+3; *Tam* = hepsi.

## 5. Güvenlik ağı (asıl risk burada)
Bölme hatası derlemeyi bozmadan davranışı bozabilir; mevcut 27 test bileşenleri sınamıyor. Bu yüzden her adım için:
1. **Önce karakterizasyon:** React Testing Library eklenir (`@testing-library/react`, `jest-dom`, `user-event`: şu an kurulu DEĞİL) ve bölünecek
   ekran için "render olur, sekme değişir, veri tabloda görünür" testleri yazılır (API `jest.mock` ile). Bölmeden ÖNCE yeşil olmalı, sonra da.
2. **Statik kontrol:** `CI=true npx react-scripts test`, `src/tanimsizDegisken.test.js` (tanımsız değişken), `react-scripts build` uyarı sayısı artmamalı.
3. **Tarayıcıda gezinti:** `npm run seed` ile yerel örnek veri (admin + demo hesapları, şifre `demo1234`), bölünen ekranın her sekmesi/diyaloğu elle gezilir;
   önce/sonra ekran görüntüsü karşılaştırılır (yazdırma ve QR akışları dahil).
4. Her dosya ayrı commit; geri alması kolay.
5. Canlıya çıkış yine yalnızca Salih'in onayıyla (frontend de `package:hostinger` paketine girer).

## 6. Bölme kuralları
- Bileşen ≤ ~300 satır; durum yalnızca kabukta veya özel hook'ta; alt bileşen props alır, API çağırmaz.
- **Davranış ve görünüm DEĞİŞMEZ** (refactor): CSS/tema, metinler, yetki kontrolleri (`useKarGor`, rol kontrolleri) olduğu gibi taşınır.
- Kâr alanları yalnızca admin: `useKarGor` kullanımları kaybolmamalı (bölünen her dosyada `git grep useKarGor` önce/sonra aynı olmalı).
- İçeride tanımlı bileşenler (`KartItem`, `InfoRow`) dışarı alınır (her render'da yeniden oluşmasın).
- `toLocaleString('tr-TR')` toplu değişimi AYRI bir adım (önce bölme, sonra `shared/bicim.js` ile tekilleştirme).

## 7. Sonrası (ayrı işler)
CRA → Vite (react-scripts bakımsız), `.jsx` → `.tsx` (önce `shared/`, sonra özellikler), ESLint + Prettier (CRLF/LF karışıklığı), 12 React Hook bağımlılık uyarısının
tek tek ele alınması (davranış değiştirebilir: test ile birlikte).

## 8. Yeni sohbette başlamak için
"`docs/FRONTEND-BOLME-RAPORU.md` ve `CLAUDE.md`'yi oku; kapsam <Küçük/Orta/Tam>; Raporlar'dan başla" demeniz yeterli.
Hafıza notları `proje-genel-bakis` ve `kaynarmotor-yol-haritasi` otomatik yüklenir.

## 9. Uygulama günlüğü ve kanıtlanmış yöntem

### Raporlar (tamam, 2026-10-18)
`Raporlar.jsx` 1563 -> 95 satır. Yeni yapı (`features/raporlar/`): `Raporlar.jsx` (kabuk: rol, seçili sekme, süzgeçler, detay pencereleri),
`useRaporVerisi.js` (tarih aralığı + sunucu verisi + "son istek kazanır" koruması), `useDetayModal.js`, `raporHesap.js` (saf hesaplar),
`bicim.js`, `bilesenler/{KartItem,DurumChip,TarihFiltresi}.jsx`, `sekmeler/` (9 dosya), `modallar/` (4 dosya).
Karakterizasyon testi (`Raporlar.test.js`, 24) + birim test (`raporHesap.test.js`, 10). Derleme uyarısız.

### İş Emirleri (tamam, 2026-10-18)
`features/servis/IsEmirleri.jsx` 950 -> 53 satır. Yeni klasör `features/servis/isEmirleri/`: `useIsEmirleri` (liste + silme + personel), `useIsEmriDetayi`
(detay + konumdan otomatik açma), `useIsEmriFormu` (form durumu, stok/barkod arama, müşteri eşleştirme, kaydetme), `isEmriVeri.js` (saf kurallar), `servisYazdir.js`
(fiş + QR etiketi), `IstatistikSatiri`, `Suzgecler`, `IsEmriListesi`, `IsEmriFormModal` + `form/{MusteriAracBolumu,ParcaBolumu,OdemeTeslimBolumu}`, `IsEmriDetayModal`.
`IsEmriForm.jsx` / `IsEmriDetay.jsx` ayrı sayfalar (kendi rotaları) ve bu turda dokunulmadı. Testler: `IsEmirleri.test.js` (41) + `isEmirleri/isEmriVeri.test.js` (11);
bileşen testi yavaş (2-6 dk, MUI formu + çok tuş vuruşu; `userEvent.setup({delay:null})` denendi, daha yavaş ve kararsız oldu).
Öğrenilen: `react-router-dom` v7'nin `exports` alanını CRA'nın Jest 27'si çözemez, testte `jest.mock('react-router-dom', ..., { virtual: true })` ile
`useNavigate/useLocation` sahtelenir. Mutasyonla yakalanmayan bir kural ("0.00" metin kalan ödeme -> 0) için test eklendi.

### Vitrin yönetimi (tamam, 2026-10-18)
`features/vitrin/yonetim/Vitrin.jsx` 972 -> 75 satır (32 useState dört hook'a dağıldı): `useIlanListesi` (liste, arama, arşiv, sıralama, yayın/silme),
`useVitrinReferans` (segmentler, iletişim, video sınırı, stok listeleri), `useIlanFormu` (alanlar, görseller, video, kaydetme), `useIletisimFormu`;
`gorselIsle.js` (canvas ile küçültme); `bilesenler/`: HizmetPaneli, IletisimSatiri, AramaSatiri, IlanListesi, IlanKarti, IlanDialog (+ MotorAlanlari,
VideoAlani, GorselYonetimi), IletisimDialog. Hook'larla bileşenler arasında "hook nesnesi" (liste, f, ilet) geçirilir: yüzlerce tek tek prop yerine.
**Yapı düzeltmesi:** herkese açık `Storefront` ve `MotorStok`, sabitleri yönetim sayfasının modülünden içe aktarıyordu (mağaza paketine yönetim kodu
çekiyordu); `vitrin/vitrinSabitleri.js` ve `vitrin/ilanArama.js`'e taşındı. Testler: `Vitrin.test.js` (37) + `ilanArama.test.js` (5).
**Test altyapısı dersi:** 3 ağır bileşen test dosyası paralel çalışınca 5 sn'lik varsayılan sınırı aşıp "bazen geçen bazen kalan" (flaky) oldu;
ortak 60 sn sınır `setupTests.js`'e kondu. Tam koşu ~8 dk; geliştirirken `npm run test:hizli` (~26 sn, bileşen testleri hariç).
**Bilinen React inceliği:** bileşenin kökündeki fragman React'te açılır; bu yüzden `IlanListesi`'nde önceki dalın DOM düğümü yeniden kullanılıyor
(görünüm aynı, yalnızca boş bir `style` niteliği kalıyor). Gerekirse dönüş ifadesini `<>…</>` ile sarmak eski davranışı verir.
**Test edilmedi:** tarayıcıda resim küçültme (canvas) ve gerçek sürükle-bırak; ikisi de jsdom'da yok (sürükle-bırak olayları `fireEvent` ile sınandı).

### MotorStok (tamam, 2026-10-19)
`features/motor/MotorStok.jsx` -> 66 satırlık kabuk. `motor/motorStok/`: `yetkiler.js` (kim ne görür/yapar), `motorStokVeri.js` (saf kurallar), `useMotorStok`,
`useMusteriAra`, `useMotorFormu`, `useHizliSatis`; `bilesenler/`: IstatistikCipleri, MotorListesi, MotorFormModal (+ Bilgi / YatirimciSatici / VitrinBelge),
HizliSatisModal (+ OdemeDagilimi, KarOnizleme), StokDetayModal. Testler: `MotorStok.test.js` (32) + `motorStok.test.js` (15). Mutasyonda "sıralama" mutantı
yalnızca karşılaştırıcının iki yönü de sınanınca yakalandı.

### İkinci El Motor (tamam, 2026-10-19)
`features/motor/IkinciElMotor.jsx` -> 57 satır. `motor/ikinciElMotor/`: `satisVeri.js` (saf), `excel.js` (dışa aktarma), `useSatisListesi`, `useSatisFormu`;
`bilesenler/`: IstatistikSatiri, Suzgecler, SatisListesi, SatisFormModal (+ MotorBilgileri / FiyatKar / Taraflar / KalanOdemeBelge), MotorDetayModal.
Testler: `IkinciElMotor.test.js` (29) + `satisVeri.test.js` (9). Önce testler (ec05d3a), sonra bölme (b8346e6).

### Storefront (herkese açık mağaza, tamam, 2026-10-19)
`features/vitrin/magaza/Storefront.jsx` 722 -> 77 satır. `storefront/useStorefront.js` (ilanlar, süzgeçler, giriş ekranı, yoklama), `kategoriSabitleri.jsx`;
`bilesenler/`: GirisEkrani, UstBar, MobilMenu, HizmetSayfasi, DurumSecimi, SayfaBasi, MotorFiltreleri, IlanAlani, TaksitHesaplaDialog, FiltreBilesenleri.
Test: `Storefront.test.js` (17). Giriş videosu `window.matchMedia` çağırdığı için testte her zaman sahtelenir; mobilde `HTMLMediaElement.prototype.pause` da.

### E-Ticaret (tamam, 2026-10-19)
`features/eticaret/ETicaret.jsx` 622 -> 52 satır. `eticaret/useETicaret.js`, `eticaretVeri.js` (saf; komisyon önizlemesi, form dönüşümleri), `bilesenler/`:
IstatistikSatiri, Sekmeler, SatisListesi, PlatformListesi, SatisFormModal (+ KomisyonOnizleme), PlatformFormModal, SatisDetayModal.
Testler: `ETicaret.test.js` (23) + `eticaretVeri.test.js` (12).

### Aksesuarlar (tamam, 2026-10-19)
`features/aksesuar/Aksesuarlar.jsx` 614 -> 33 satır. `aksesuarlar/`: `useAksesuarlar.js` (satışlar, istatistik, stok, form, ürün satırları, barkod, kaydet/sil),
`aksesuarVeri.js` (form dönüşümleri, süzme, ürün satırı işlemleri, toplam/indirim/kâr; her işlem yeni dizi döndürür), `bilesenler/`: IstatistikSatiri,
Suzgecler, SatisListesi, SatisFormModal (+ MusteriSatisAlanlari / UrunlerBolumu / ToplamOzeti / KalanOdemeKutusu), SatisDetayModal.
Testler: `Aksesuarlar.test.js` (23) + `aksesuarVeri.test.js` (16). Mutasyon: 9 bilinçli hatanın 9'u da yakalandı.
**Testin yakaladığı bölme hatası:** betik `musteriService` içe aktarmasını bileşene taşımayı unuttu; çağrı `try/catch` içinde olduğundan ekranda hata görünmedi
ama telefondan müşteri eşleştirme sessizce çalışmaz oldu. Karakterizasyon testi ("telefon yazınca ad dolar") bunu yakaladı: `catch {}` yutan kodda test şart.

### Bu tur (MotorStok -> Aksesuarlar) dersleri
- Ağır bileşen testleri çoğalınca 5 sn'lik `waitFor` sınırı da yetmedi: `setupTests.js`'e `configure({ asyncUtilTimeout: 5000 })` ve 60 sn test sınırı kondu.
- Eski-yeni HTML karşılaştırmasında zamana bağlı gürültü: MUI ripple içi, `role="tooltip"`, `_r_xx_` kimlikleri, boş `style=""`; ayrıca yalnızca boşluktan oluşan
  metin düğümleri (özgün JSX'te aynı satırda kalmış etiketler). Pencere kapanış animasyonu bitmeden kare alınırsa eski pencere `aria-hidden` olarak DOM'da kalır:
  kareden önce `.MuiDialog-root` sayısını 1'e `waitFor` ile bekle.
- Git Bash tuzağı: `/kâr|...` gibi `/` ile başlayan argüman Windows yoluna çevrilir (mutasyon sessizce uygulanmaz); mutasyonları dosyadan okuyan Python ile uygula.
- Mutasyonla yakalanmayan "0.00" (metin) kalan ödeme -> 0 kuralı üç sayfada (İş Emirleri, İkinci El, Aksesuar) ayrı test gerektirdi: aynı kalıp, aynı tuzak.
- Hook'lar arası ortak nesne ("hook nesnesi": `liste`, `f`, `ilet`, `a`, `e`, `s`, `form`, `hs`) tek tek prop geçmekten çok daha okunaklı; ama bileşenin hangi alanları
  kullandığını `const { ... } = a` ile ilk satırda göstermek şart.

### Yöntem (sonraki dosyalar için tarif)
1. **Önce test:** Testing Library ile mevcut davranışı sınayan testler yaz (API `jest.mock`, oturum `useAuth` mock). CRA `resetMocks` açık: sahte cevapları her testten ÖNCE kur.
   Test dosyası `.test.js` olmalı (`tanimsizDegisken.test.js` yalnızca `.test.js`'i tarama dışı bırakır). Sayıları elle hesapla; tr-TR tarihi `05.10.2026` (sıfırlı).
2. **Testin değerini sına:** koda bilerek hata sok (rol koşulunu kaldır, toplamdan bir terimi çıkar, eski-yanıt korumasını sil); test kırmızıya dönmeli.
   Raporlar'da ilk denemede eski-yanıt koruması yakalanmadı (yalnızca sayıya bakılmıştı, sahte hata uyarısına bakılmalıydı); test güçlendirildi.
3. **Betikle taşı:** gövdeleri elle yeniden yazma. Satır aralıklarını doğrulayan (`assert`) bir Python betiği sekmeleri/pencereleri dosyalara taşır;
   yalnızca girinti ve durum ayarlayıcı adları (`setXModal(...)` -> `onDetay(...)`) değişir. Elle yazılan kısım: kabuk, hook, saf hesaplar, küçük bileşenler.
4. **Eski-yeni HTML karşılaştırması (altın ana kopya):** eski dosyayı geçici klasöre koy, aynı sahte veriyle her sekme/pencere/rol/mobil için
   `document.body.innerHTML` karşılaştır. Normalize et: React 19 kimlikleri `_r_xx_`, `:r1:`, MUI ripple içi (zamana bağlı animasyon). Pencere/menü
   kapanış animasyonu bitmeden (`waitFor` ile `dialog`/`listbox` kaybolana dek) sonraki öğeler erişilebilirlik ağacında gizli kalır. Geçici dosyaları commit etme.
5. **Durum nerede kalır:** sekme değişince kaybolmaması gereken süzgeçler (örn. motor alt sekmesi, komisyoncu süzgeci, personel) kabukta kalır;
   yalnızca bir sekmeye ait ve sekmeyle sıfırlanabilecek durum sekmeye taşınabilir ama bu DAVRANIŞ DEĞİŞTİRİR, bölme turunda yapma.
6. **Bilinen tuzak:** projede `react-hooks` ESLint kuralı tanımlı değil (`eslint-disable react-hooks/...` yorumu derlemeyi kırar); `useEffect` bağımlılık
   uyarıları zaten üretilmiyor. İleride ESLint eklenirken ele alınacak.
7. Doğrulama komutları: `cd frontend; CI=true npx react-scripts test --watchAll=false` ve `CI=false npx react-scripts build` ("Compiled successfully").
   Yerel sunucu için ortam değişkenleri `set -a; . ./.env.mariadb.dev; set +a` ile önce yüklenir (dotenv var olan değişkeni ezmez).

### Sıradaki işler
Sekiz büyük dosyanın hepsi bölündü (Raporlar, İş Emirleri, Vitrin, MotorStok, İkinci El, Storefront, E-Ticaret, Aksesuarlar). `shared/bicim.js` tekilleştirmesi ve
`toLocaleString('tr-TR')` toplu değişimi, ardından TanStack Query, ESLint + Prettier, Vite + TSX ayrı adımlardır (`docs/YOL-HARITASI.md`).
