# Yol haritası: kalan işler (2026-10-18)

Amaç: projeyi bir ekip ya da işveren önünde **kanıtlarıyla** gösterebilmek: temiz klasör yapısı, katmanlı ve testli backend, düzenli frontend,
tutarlı tasarım. Bu belge neyin bittiğini, neyin kaldığını ve hangi sırayla yapılacağını tutar. Yeni sohbette "docs/YOL-HARITASI.md'yi oku, sıradaki maddeden devam et" demek yeterlidir.

## Biten
| Alan | Durum | Kanıt |
|---|---|---|
| Backend TypeScript (strict) + katmanlı yapı | Tamam | `tsc` temiz, 248 birim, 201 API testi (kaynak + paket) |
| Klasör düzeni + genel temizlik | Tamam | `backend/{core,shared,modules}`, kök sadeleşti |
| Frontend: Testing Library + sekiz büyük dosyanın bölünmesi | Tamam (2026-10-19) | Raporlar 1563 -> 95, İş Emirleri 950 -> 53, Vitrin 972 -> 75, MotorStok 779 -> 66, İkinci El 709 -> 57, Storefront 721 -> 77, E-Ticaret 622 -> 52, Aksesuar 614 -> 33; 328 frontend testi (21 dosya, ~4 dk); her biri için mutasyon denemesi ve eski-yeni HTML karşılaştırması aynı |
| CI iş akışı | Yazıldı, **GitHub'da kullanılmayacak** | Sahibi faturalandırmayı çözmeyecek; iş akışı yalnızca elle tetiklenir, kanıt yerel doğrulamadır |

## A. Önce yapılacaklar (sunum etkisi yüksek, emek düşük)
1. **CI yerine yerel kanıt** (karar: GitHub faturalandırması çözülmeyecek). README'de CI rozeti olmaz; bunun yerine "Testler ve doğrulama" bölümü: test piramidi,
   güncel sayılar, tek komutla yeniden üretme (`backend/scripts/hepsiniDogrula.sh`), mutasyon kontrolü ve paket duman testi anlatılır. Pre-push kancası
   (`.githooks`) istenirse etkinleştirilir. Mülakatta dürüst cümle: "CI tanımı hazır, hesap kısıtı yüzünden Actions'ta çalıştırmadım, aynı adımlar yerelde tek komutla koşuyor." 
2. ~~`typescript` dalını push et ve `main`'e al.~~ **YAPILDI (2026-10-18):** `main` ve `typescript` aynı commit'te (e91a16a); canlı sürüm (`hostinger` dalı) etkilenmedi.
   Bundan sonra: ilerleme `typescript` dalında sürer, anlamlı bir turdan sonra aynı şekilde `main`'e ileri sarılır (`git push origin typescript:main`).
3. **README** (2026-10-18 güncellendi: teknoloji tablosu, Testler ve Doğrulama bölümü, yollar; kalanlar):
   - "Teknoloji Yığını" tablosu: Node 22 / Express / `backend/core/db.js` eski; TypeScript strict, zod, tsx + esbuild, Testing Library eksik.
   - "Testler" bölümü yok: test piramidi ve sayılar (birim 248, API 201, frontend 61, paket duman testi) + nasıl çalıştırılır.
   - Mimari diyagramı güncel yapıyla karşılaştır.
   - Ekran görüntüleri güncel mi kontrol et (`docs/screenshots`); GIF/video için `readme-media` skill'i, "Demo ile dene" için `demo-account` skill'i.
4. **Yerel temizlik:** ~~Railway kopyaları~~ **YAPILDI (2026-10-25)**: depodaki tüm Railway/parity araçları, yerel Railway yedekleri (2 × 172 MB), `kaynar_pgkopya` ve `kaynar_ref` veritabanları, eski ortam betikleri ve Railway ortam bilgileri silindi. Kalan (sahibi karar verir): `yerel-arsiv/notlar-ve-veri/` içindeki gerçek müşteri CSV'si, makine genelindeki Railway CLI ve oturumu, Railway panelindeki proje/hizmet (kapatılmalı).

## B. Frontend bölme (sırayla; yöntem: `docs/FRONTEND-BOLME-RAPORU.md` §9)
| Sıra | Dosya | Satır | Zorluk |
|---|---|---|---|
| ✓ | ~~`features/servis/IsEmirleri.jsx`~~ (950 -> 53, 2026-10-18) | tamam | |
| ✓ | ~~`features/vitrin/yonetim/Vitrin.jsx`~~ (972 -> 75, 2026-10-18) | tamam | |
| ✓ | ~~MotorStok, IkinciElMotor, Storefront, ETicaret, Aksesuarlar~~ (2026-10-19) | tamam | |

Her dosya: önce karakterizasyon testi, testi bozarak sına, betikle taşı, eski-yeni HTML karşılaştır, ayrı commit. **B listesi bitti.**

## C. Bölmeden sonra (her biri ayrı karar)
- ~~`shared/utils/bicim.js`~~ **YAPILDI (2026-10-24):** `sayiYaz`/`paraYaz`/`tarihYaz` (61 karakterizasyon testi); ~340 çağrı taşındı, `toLocale…` 169 -> 5 (bilerek kalanlar: Layout uzun tarih, `en-CA` ISO giriş, e-ticaret `formatTL` tam 2 ondalık, raporlar/bicim.js sarmalayıcıları).
- ~~**ESLint + Prettier**~~ **YAPILDI (2026-10-24):** ESLint `react-app` (react-hooks dahil; kaynakta 0 hata, 13 `exhaustive-deps` uyarısı bilerek açık: her biri davranış analizi ister), `.gitattributes`/`.editorconfig` (LF), Prettier (tek tırnak, 160 genişlik; 257 dosya, +17k/-6k satır, `.git-blame-ignore-revs`). NOT: bu belgedeki satır sayıları (95, 53...) Prettier ÖNCESİDİR.
- **TanStack Query**: veri çekme/önbellek; `useRaporVerisi` gibi hook'ların yerini alır.
- Frontend **CRA -> Vite** ve **TypeScript** (kademeli, 6 aşama): ayrıntılı plan, ölçülmüş başlangıç ve durum tablosu `docs/VITE-TS-YOL-HARITASI.md`.
- ~~**E2E (Playwright)**~~ **YAPILDI (2026-10-25):** `npm run test:e2e`, 3 akış (giriş+rol, iş emri oluştur/tamamla, motor satışı), 13 test, 3 tur üst üste 27/27, mutasyonla doğrulandı. Her koşuda sıfırdan kurulan `test_kaynar_e2e` veritabanı. E2E ile bulunan hata (plaka tam yazılıp öneri seçilince satış formu dolmuyordu) düzeltildi: bileşen + E2E regression testi.
- Backend: `scripts/` ve `tests/` hâlâ JS (tsx ile çalışır).

## D. Tasarım gözden geçirme (arayüz işlerinde tasarım skill'leri kullanılır)
**Tasarım A "Servis Defteri" CANLIDA (2026-10-25, kaynak `typescript` dalı; `tasarim-a` aynı commit'e birleşti).** Yapıldı: tokenlar/tema (anahtarlar, pencere başlığı/altı), ortak parçalar
(`shared/ui`: Plaka, Damga, IslemDugmesi, OzetSeridi, DialogBasligi, BolumBasligi, BilgiKarti/SayiKutusu/Not, Onay, `sagaSutunlar`), yan menü + alt gezinme, Servis, giriş/kayıt, Müşteriler,
Raporlar (tüm sekmeler + detay pencereleri), Kullanıcılar, Yetkilendirme, Veresiye, Belge Arşivi, Taksit (yönetim), Vitrin yönetimi, E-Ticaret, motor/aksesuar/yedek parça listeleri, form
başlıkları (simgeli), stok etiketi (`shared/utils/stokEtiketi.js`). Kapsam kuralı: müşterinin gördüğü sayfalara (`/site`, `/ilan`, `/taksit/:fiyat`, `/s/:token`) dokunulmadı.
Kalan cilalar (isteğe bağlı): telefonda iş emri formunun tek sütun olması ve Motor Stok'ta tam genişlikte "Motor ekle" düğmesi, iş emri A4 yazdırma çıktısının yeni dile uyarlanması, stok ve QR etiketlerinin gerçek yazıcıda denenmesi, README ekran görüntüleri/GIF'leri (`readme-media`), müşteriye dönük sayfaların (vitrin, ilan, taksit, servis geçmişi) aynı dile getirilip getirilmeyeceği kararı. Menü düzeni E2E ile korunuyor (`e2e/4-menu.spec.js`).
- Ayrık sol/sağ bölünmüş sayfa düzeni yok; ürünün kendi diline ait dokunuşlar (plaka, fiş, damga); açık tema ana tema, koyu tema kendi kimliğiyle.
- Gözden geçir: vitrin (ana sayfa ve ilan sayfası), mobil görünüm, erişilebilirlik (odak, kontrast, klavye), tutarlı boşluk/renk (şimdi kırmızı `#C62828` değerleri
  dosyalara dağınık: tek tema belirteci olmalı).

## E. Canlıya çıkış (YAPILDI 2026-10-25)
Yeni TS sürümü paketlendi (`npm run package:hostinger`), yedek ve tarif `docs/HOSTINGER.md`'de. **Sahibi açıkça "canlıya al" demeden çıkılmaz.**

## F. Genel inceleme bulguları (2026-10-25, sonra düzeltilecek)
Backend, frontend, veritabanı, bağımlılık, test ve depo düzeni incelemesi. Güvenlik ayrıntıları depoya girmez: kökteki yerel `GUVENLIK-BULGULARI.md`
(git dışı; G1-G8). Her madde: önce test (varsa regression), sonra düzeltme, tam doğrulama zinciri, canlıya çıkış onayı.

| # | Öncelik | Bulgu | Yer | Öneri |
|---|---|---|---|---|
| F1 | Yüksek | Müşteri geçmişi isimle eşleşiyor (`LOWER(ad_soyad) = LOWER(alici_adi)`); `musteri_id` yok. Aynı isimli müşteriler karışır, isim düzeltilince geçmiş kopar | `backend/modules/musteriler/musteriler.repository.ts`; motor ve aksesuar tabloları | `musteri_id` kolonu + mevcut kayıtlar için eşleştirme betiği (çakışanlar elle) + FK. Canlı veriye dokunur: önce yedek ve prova |
| F2 | Yüksek | Vitrin görsel/videoları veritabanında base64 `LONGTEXT` (yaklaşık %33 şişme, büyük yedek, 120 MB JSON gövdesi). Satış belgeleri ise doğru yöntemle (ham gövde + `LONGBLOB`) | `vitrin_gorseller`, `vitrin_videolar`, `vitrin_kategori_iletisim.gorsel`; `backend/server.ts` 120 MB limit | Satış belgeleri yöntemine (ya da diske) taşı; geçiş betiği + eski verinin dönüştürülmesi |
| F3 | Orta | Şema geçişlerinin sürüm kaydı yok; veri düzeltme `UPDATE`'leri her açılışta çalışıyor | `backend/core/veritabani/initDb.ts` | `sema_surumu` tablosu, numaralı ve bir kez çalışan geçişler |
| F4 | Orta | Ölü kod (~1.100 satır): `IsEmriForm`, `IsEmriDetay`, `MotorDetay` sayfalarına bağlantı yok (işi pencereler görüyor), yeni tasarıma geçmedi | `frontend/src/features/servis/IsEmriForm.jsx`, `IsEmriDetay.jsx`, `features/motor/MotorDetay.jsx`; `app/App.jsx` rotaları | Dışarıdan bağlantı olmadığı doğrulanınca rotalarla birlikte sil (rota eski adrese gelen olursa `/servis`'e yönlendir) |
| F5 | Orta | Tekrarlanan kod: aksesuar ve yedek parça stok sayfaları (442 ve 371 satır) ve backend toplu içe aktarma neredeyse aynı | `features/aksesuar/AksesuarStok.jsx`, `features/yedek-parca/YedekParcaStok.jsx`; `*Stok.service.ts` | Ortak stok bileşeni ve servis yardımcısı |
| F6 | Orta | Panel kodunda 279 sabit renk kodu (belirteç yerine); 20 yerde tarayıcı `alert()` | `frontend/src/features/**` | Renkler `app/tokenlar.js`'e; `alert` yerine uygulamanın bildirim/onay penceresi |
| F7 | Orta | Frontend test boşlukları: Müşteriler, Kullanıcılar, Veresiye, stok sayfaları, Belge Arşivi, Taksit (`hesaplaTaksit` para hesabı) | `frontend/src/features/...` | Önce `hesaplaTaksit` birim testleri (para), sonra ekran testleri |
| F8 | Orta | API testleri göç aşamasına göre adlandırılmış (`faz1`...`faz12`), özelliğe göre değil | `backend/tests/api/` | Özellik adlarıyla yeniden adlandır (ör. `musteriler.api.test.js`) |
| F9 | Düşük | Güncel olmayan bağımlılıklar: küçükler (axios, React 19.3, Router 7.18, mysql2) hemen; büyükler ayrı iş (Express 5, MUI 9, dotenv 18, bcryptjs 3, @types/node) | `package.json` dosyaları | Küçükleri toplu güncelle + zincir; MUI 9'u tasarım kontrolüyle ayrı yap |
| F10 | Düşük | README karışık dilde (giriş İngilizce, gövde Türkçe), ekran görüntüleri/GIF'ler eski tasarım, test sayıları eski (406) | `README.md`, `docs/screenshots`, `docs/demo` | Tek dil, yeni görseller (`readme-media`), güncel sayılar (415 / 248 / 203 / 11 E2E) |
| F11 | Düşük | Depo kalabalığı: `docs` altında ~50 MB görsel; yaklaşık yarısı reddedilen B tasarımının (`docs/tasarim-yonleri` içindeki `b-*`); `docs` için içindekiler yok | `docs/` | B görsellerini depodan çıkar (git geçmişinde kalır), `docs/README.md` içindekiler |
| F12 | Düşük | Push öncesi kanca var ama etkin değil; backend'de 24 `any`; 11 `exhaustive-deps` uyarısı | `.githooks/pre-push`, `backend/**` | `git config core.hooksPath .githooks`; `any`'leri tiple; uyarılar TS geçişinde (aşama 4) |
| F13 | Doğrulanmadı | Türkçe aramada büyük/küçük harf (İ/ı) eşleşmesi: tablolar `utf8mb4_nopad_bin`, aramalar `LOWER(...) LIKE LOWER(...)` | Arama repository'leri | "IŞIK" / "ışık" ile dene; gerekirse Türkçe duyarlı karşılaştırma |

Önerilen sıra: G1-G2 (güvenlik yamaları) → F4 + G8 (ölü kod, `plain_sifre`) → Vite geçişi (G3, G4'ün yolu) → F1-F2 (veri modeli, ayrı plan ve onay) → F10 (README).

### F listesi: durum (2026-10-26, dal `vite-ts`, canlıya çıkmadı)
- **F4 yapıldı:** `IsEmriForm`, `IsEmriDetay`, `MotorDetay` ve rotaları kaldırıldı; eski `/is-emri/*` adresleri `/servis`'e, `/motor/:id` `/ikinci-el-motor`'a yönlenir.
- **F5 yarım:** frontend'de iki stok sayfasının ortak mantığı `shared/stok/` altına çıkarıldı (`useStokYonetimi`, `StokIceAktarPenceresi`). Backend stok servisleri bilerek ayrı kaldı: barkod şeması ve yedek parçadaki işlemli kod değişimi gerçekten farklı.
- **F6 yapıldı (kapsamı belirtilerek):** panelde tokenla birebir aynı 241 renk sabiti token başvurusuna çevrildi; 19 `alert()` uygulamanın bildirimine (`bildir`) geçti. Kalan: tokenı olmayan birkaç renk, müşteriye dönük sayfalar (bilerek eski tema) ve yazdırma HTML'leri.
- **F7 yapıldı:** aksesuar/yedek parça stok, Müşteriler, Kullanıcılar, Veresiye, Belge Arşivi için yaklaşık 120 karakterizasyon testi; taksit önceki turda kapandı. Frontend toplam 568 test.
- **F8 yarım:** `faz1..faz12` dosyaları konu adlarıyla yeniden adlandırıldı; dört karışık dosyanın (`describe` bazında) özelliğe göre bölünmesi yapılmadı.
- **F10 büyük ölçüde yapıldı:** test sayıları, Vite/TS maddesi, 13 ekran görüntüsü ve 4 demo GIF yeni tasarımla yenilendi (gerçek uygulamadan, geliştirme veritabanının atılabilir kopyasında kaydedildi; veri sentetik). Kalan: README dili karışık (İngilizce özet + Türkçe gövde, bilerek).
- **F11 yapıldı:** B tasarımı görselleri depodan çıkarıldı, `docs/README.md` içindekiler eklendi.
- **F13 (frontend) yapıldı:** `shared/utils/metin.ts`; büyük "YILMAZ" artık "Yılmaz" ile eşleşir (8 ekranın arama/eşitlik karşılaştırmaları). Sunucu tarafı arama (`LOWER ... LIKE`) doğrulanmadı.
