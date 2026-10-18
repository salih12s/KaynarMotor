# Yol haritası: kalan işler (2026-10-18)

Amaç: projeyi bir ekip ya da işveren önünde **kanıtlarıyla** gösterebilmek: temiz klasör yapısı, katmanlı ve testli backend, düzenli frontend,
tutarlı tasarım. Bu belge neyin bittiğini, neyin kaldığını ve hangi sırayla yapılacağını tutar. Yeni sohbette "docs/YOL-HARITASI.md'yi oku, sıradaki maddeden devam et" demek yeterlidir.

## Biten
| Alan | Durum | Kanıt |
|---|---|---|
| Backend TypeScript (strict) + katmanlı yapı | Tamam | `tsc` temiz, 248 birim, 201 API testi (kaynak + paket) |
| Klasör düzeni + genel temizlik | Tamam | `backend/{core,shared,modules}`, kök sadeleşti |
| Frontend: Testing Library + Raporlar bölme | Tamam | Raporlar 1563 -> 95 satır, 61 frontend testi, eski-yeni HTML karşılaştırması aynı |
| CI iş akışı | Yazıldı, **GitHub'da kullanılmayacak** | Sahibi faturalandırmayı çözmeyecek; iş akışı yalnızca elle tetiklenir, kanıt yerel doğrulamadır |

## A. Önce yapılacaklar (sunum etkisi yüksek, emek düşük)
1. **CI yerine yerel kanıt** (karar: GitHub faturalandırması çözülmeyecek). README'de CI rozeti olmaz; bunun yerine "Testler ve doğrulama" bölümü: test piramidi,
   güncel sayılar, tek komutla yeniden üretme (`backend/scripts/hepsiniDogrula.sh`), mutasyon kontrolü ve paket duman testi anlatılır. Pre-push kancası
   (`.githooks`) istenirse etkinleştirilir. Mülakatta dürüst cümle: "CI tanımı hazır, hesap kısıtı yüzünden Actions'ta çalıştırmadım, aynı adımlar yerelde tek komutla koşuyor." 
2. **`typescript` dalını push et ve `main`'e al.** Şu an `main` 36 commit geride: depoya bakan biri eski JS kodu görüyor. Karar gerekir: `main`'e birleştirme
   canlı sürümü (`hostinger` dalı) etkilemez, ama canlıya çıkış ayrı ve yalnızca sahibinin onayıyla yapılır.
3. **README'yi güncel hâle getir** (şimdi eski kalan yerler):
   - "Teknoloji Yığını" tablosu: Node 22 / Express / `backend/core/db.js` eski; TypeScript strict, zod, tsx + esbuild, Testing Library eksik.
   - "Testler" bölümü yok: test piramidi ve sayılar (birim 248, API 201, frontend 61, paket duman testi) + nasıl çalıştırılır.
   - Railway/PostgreSQL anıları ("eski yapılandırma temizlendi") sadeleştir; mimari diyagramı güncel yapıyla karşılaştır.
   - Ekran görüntüleri güncel mi kontrol et (`docs/screenshots`); GIF/video için `readme-media` skill'i, "Demo ile dene" için `demo-account` skill'i.
4. **Yerel temizlik** (git dışı, sahibi yapar): `yerel-arsiv/` içindeki eski ortam betiklerini sil, eski ortamın parolasını değiştir; gerçek müşteri CSV'sini sil.

## B. Frontend bölme (sırayla; yöntem: `docs/FRONTEND-BOLME-RAPORU.md` §9)
| Sıra | Dosya | Satır | Zorluk |
|---|---|---|---|
| 1 | `features/servis/IsEmirleri.jsx` | 950 | Orta |
| 2 | `features/vitrin/yonetim/Vitrin.jsx` | 972 | Yüksek (32 durum, sürükle-bırak) |
| 3 | `features/motor/MotorStok.jsx` + `IkinciElMotor.jsx` | 779 + 709 | Orta |
| 4 | `features/vitrin/magaza/Storefront.jsx` (herkese açık sayfa) | 721 | Orta (görsel kalite önemli) |
| 5 | `features/eticaret/ETicaret.jsx`, `features/aksesuar/Aksesuarlar.jsx` | 622, 614 | Düşük-orta |

Her dosya: önce karakterizasyon testi, testi bozarak sına, betikle taşı, eski-yeni HTML karşılaştır, ayrı commit. Tahmini toplam 7-8 saat.

## C. Bölmeden sonra (her biri ayrı karar)
- `shared/bicim.js`: para/tarih biçimleyicilerini tekilleştir (şimdi `toLocaleString('tr-TR')` ~161 yerde).
- **ESLint + Prettier** (`react-hooks` kuralı dahil: şu an tanımlı değil, bağımlılık uyarıları hiç üretilmiyor; CRLF/LF karışıklığı da biter).
- **TanStack Query**: veri çekme/önbellek; `useRaporVerisi` gibi hook'ların yerini alır.
- Frontend **TypeScript** (`.tsx`; önce `shared/`, sonra özellikler) ve **CRA -> Vite** (react-scripts bakımsız).
- **E2E (Playwright)**: yalnızca 2-3 kritik akış (giriş, iş emri oluştur/tamamla, motor satışı); API testleri gerçek MariaDB'yi zaten kapsıyor.
- Backend: `scripts/` ve `tests/` hâlâ JS (tsx ile çalışır); `test:parity` çalıştırılmadı (eski PostgreSQL yedeği ister).

## D. Tasarım gözden geçirme (arayüz işlerinde tasarım skill'leri kullanılır)
- Ayrık sol/sağ bölünmüş sayfa düzeni yok; ürünün kendi diline ait dokunuşlar (plaka, fiş, damga); açık tema ana tema, koyu tema kendi kimliğiyle.
- Gözden geçir: vitrin (ana sayfa ve ilan sayfası), mobil görünüm, erişilebilirlik (odak, kontrast, klavye), tutarlı boşluk/renk (şimdi kırmızı `#C62828` değerleri
  dosyalara dağınık: tek tema belirteci olmalı).

## E. Canlıya çıkış
Yeni TS sürümü paketlendi (`npm run package:hostinger`), yedek ve tarif `docs/HOSTINGER.md`'de. **Sahibi açıkça "canlıya al" demeden çıkılmaz.**
