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
- Frontend **TypeScript** (`.tsx`; önce `shared/`, sonra özellikler) ve **CRA -> Vite** (react-scripts bakımsız).
- ~~**E2E (Playwright)**~~ **YAPILDI (2026-10-25):** `npm run test:e2e`, 3 akış (giriş+rol, iş emri oluştur/tamamla, motor satışı), 13 test, 3 tur üst üste 27/27, mutasyonla doğrulandı. Her koşuda sıfırdan kurulan `test_kaynar_e2e` veritabanı. E2E ile bulunan hata (plaka tam yazılıp öneri seçilince satış formu dolmuyordu) düzeltildi: bileşen + E2E regression testi.
- Backend: `scripts/` ve `tests/` hâlâ JS (tsx ile çalışır).

## D. Tasarım gözden geçirme (arayüz işlerinde tasarım skill'leri kullanılır)
- Ayrık sol/sağ bölünmüş sayfa düzeni yok; ürünün kendi diline ait dokunuşlar (plaka, fiş, damga); açık tema ana tema, koyu tema kendi kimliğiyle.
- Gözden geçir: vitrin (ana sayfa ve ilan sayfası), mobil görünüm, erişilebilirlik (odak, kontrast, klavye), tutarlı boşluk/renk (şimdi kırmızı `#C62828` değerleri
  dosyalara dağınık: tek tema belirteci olmalı).

## E. Canlıya çıkış (YAPILDI 2026-10-25)
Yeni TS sürümü paketlendi (`npm run package:hostinger`), yedek ve tarif `docs/HOSTINGER.md`'de. **Sahibi açıkça "canlıya al" demeden çıkılmaz.**
