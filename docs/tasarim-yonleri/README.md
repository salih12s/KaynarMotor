# Tasarım yönleri (2026-10-25)

Arayüzü yenilemek için hazırlanan iki yön. **Karar verilmedi, projenin koduna henüz hiçbir şey uygulanmadı.** C yönü elendi.
Bu klasör git'e eklenmedi (yaklaşık 30 MB resim içerir). İstenirse ayrı bir dalda ya da Git LFS ile eklenebilir.

## Nerede

- **Karşılaştırma sayfası (tüm ekranlar, A ve B yan yana):** https://claude.ai/artifact/GGC5HVz51fEZdvCD4rYKgY (yalnızca sahibine açık)
- **İlk tuval (Şimdi, A, B, C):** https://claude.ai/artifact/1gHCMGaXGgDQFxJjseuYgn
- **Tam boy resimler:** `uretici/gorsel/` (her ekran `a-…` ve `b-…` diye ayrı; site sayfaları ortak: `vitrin-…`, `site-tel-…`, `taksit-goruntule`)
- **Resimleri üreten kod:** `uretici/` (aşağıya bakın)
- Resimlerdeki veriler yerel geliştirme veritabanından (`kaynar_dev`), gerçek müşteri verisi değil.

## Yön A: Servis Defteri

Atölye fişi gibi. Açık, kâğıt tonlu çalışma alanı, açık renk kenar menü (üstte gerçek logo).

| Öğe | Değer |
| --- | --- |
| Kâğıt zemin / yüzey | `#EEEFEB` / `#FBFBF8` |
| Mürekkep (yazı) / soluk yazı | `#16181C` / `#5B5F66` |
| Vurgu (eylem düğmesi, damga) | `#C62828` |
| Onay yeşili | `#1D6A3B` |
| Kenar menü | `#E4E5DE`, seçili öğe `#FBFBF8` |
| Yazı tipleri | Barlow Condensed (başlık), Barlow (metin), IBM Plex Mono (fiş no) |
| İmza öğeler | Plaka rozeti (TR şeritli), durum **damgası** (çerçeveli etiket), delikli fiş kenarı, kesikli satır çizgisi |
| Köşe yarıçapı | 5–6 px, düz ve keskin |

## Yön B: Gösterge

Motorun gösterge paneli gibi. Koyu kenar menü, açık gri çalışma alanı, LED durum noktaları.

| Öğe | Değer |
| --- | --- |
| Çalışma alanı / yüzey | `#E9ECEF` / `#FFFFFF` |
| Kenar menü (grafit) | `#1D2228`, seçili `#2B333B` + kırmızı LED nokta |
| Yazı / soluk yazı | `#1D2228` / `#5E6670` |
| Vurgu | `#D7261E` |
| Yazı tipleri | Chakra Petch (başlık, rakam), Barlow Semi Condensed (metin) |
| İmza öğeler | Yanan LED durum noktası, sayı kutuları (sağ üstte LED), yarım daire kadran (servis özeti), plaka çerçevesi |
| Köşe yarıçapı | 5–8 px |

## İki yönde ortak kararlar

- **Kenar menü simgeleri renkli.** Servis kırmızı, Motorsiklet turuncu, Aksesuar mor, E-Ticaret mavi, Taksit turkuaz, Yedek Parça sarı, Vitrin pembe, Veresiye yeşil, Raporlar camgöbeği, Müşteriler çivit, Belge Arşivi sarı, Kullanıcılar açık mavi, Yetkilendirme gri-mavi, Ana Sayfa limon. Renk değerleri `uretici/ortak.cjs` içinde `NAV` dizisinde (A için koyu, B için parlak tonlar).
- **İşlem düğmeleri renkli ve yumuşak zeminli:** Görüntüle mavi, Yazdır gri, Servis QR mor, Düzenle sarı, Sil kırmızı, Satışa çevir yeşil. Değerler `ISL` içinde.
- **Durum renkleri:** Beklemede amber, İşlemde mavi, Tamamlandı yeşil, İptal / tükendi kırmızı, Devir bekliyor mor, Depo turuncu. A'da damga, B'de LED.
- **Silme onayı** tarayıcı kutusu yerine uygulamanın kendi penceresi (yeni).
- **Telefon:** üstte menü düğmesi, altta 5 sekme (Servis, Motor, Raporlar, Müşteriler, Menü), sağ altta ana eylem.
- **Müşteriye açık site:** koyu zemin, sarı rozet yok, hover'da kırmızı çerçeve yok, fiyat beyaz ve büyük, "Öne çıkan" küçük kırmızı noktalı sade etiket.

## İleride birini uygulamak için

Önerilen sıra (hangi yön seçilirse seçilsin aynı):

1. **Temel (ayrı commit):** renk ve yazı tipi tokenları (MUI tema + CSS değişkenleri), kenar menü simge renkleri, işlem düğmesi renkleri. İkon düğmelerine `aria-label` ekle (testler de bunu kullanır).
2. **Kabuk:** Layout (kenar menü, üst çubuk), giriş ve kayıt ekranı.
3. **Servis:** liste, iş emri formu, iş emri fişi. Fiş, yazdırma çıktısıyla (`isEmriYazdir`) aynı dilde olmalı.
4. **Diğer listeler ve formlar** tek tek: motor satış / stok, aksesuar, e-ticaret, yedek parça, veresiye, müşteriler, kullanıcılar, yetkilendirme, belge arşivi, raporlar.
5. **Vitrin / site** (A ve B'de ortak).
6. **Telefon görünümleri** her ekranla birlikte.

Her adımda: ilgili Jest testlerini güncelle (A etiketleri büyük oranda korur, B'de durum rozeti LED'e döner ve ikon yapısı değişir), `npm run test:e2e`, `bash backend/scripts/hepsiniDogrula.sh`. Canlıya çıkmadan önce kullanıcıya sor.

## Resimleri yeniden üretmek (isteğe bağlı)

`uretici/` içindeki betikler Playwright (gerçek Chrome) ile `html/` altındaki sayfaları `gorsel/` altına çizer. Kök `node_modules` içindeki `@playwright/test` kullanılır.

```
cd docs/tasarim-yonleri/uretici
node uret.cjs          # ana yönetim sayfaları (A ve B)
node uret2.cjs         # Raporlar sekmeleri, formlar, giriş, servis geçmişi, telefon servis
node uret3.cjs         # detay pencereleri, onay pencereleri, yazdırma çıktıları
node uret4.cjs         # telefon ekranları ve site (telefon)
node vitrin2.cjs       # site sayfaları (ana sayfa, kategoriler, taksit)
node vitrin-ilan.cjs   # ilan detayı;  node vitrin-ilan2.cjs  # taksit tablosu açık hali
```

Veri ve metinler `sayfalar.cjs`, `sayfalar2.cjs`, `sayfalar3.cjs`, `telefon3.cjs` içinde; ortak bileşenler, ikonlar ve renkler `ortak.cjs` içinde.
Karşılaştırma sayfasını yayınlayan betik `sayfa-uret.py` (görselleri Artifact varlığı olarak yüklemek gerekir; `idler*.json` yüklenmiş görsellerin kimlikleri).
