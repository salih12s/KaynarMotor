import type { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/*
 * Kimlik doğrulama uçları için hız sınırlama.
 *
 * İşletmedeki tüm personel tek bir genel IP adresinin arkasından bağlanır (ayrıca vekil yapılandırması
 * yanlışsa herkes aynı IP görünebilir). Bu yüzden sayaç yalnızca IP'ye değil IP + KULLANICI ADINA bağlıdır:
 * bir çalışanın üst üste yanlış denemesi yalnızca kendi hesabını bekletir, aynı dükkândaki patronu kilitlemez.
 * skipSuccessfulRequests sayesinde başarılı girişler kotayı tüketmez; yalnızca başarısız denemeler sayılır.
 */

const MESAJ_GIRIS = { message: 'Çok fazla başarısız giriş denemesi yapıldı. Lütfen 15 dakika sonra tekrar deneyin.' };

// Gövdedeki kullanıcı adı (metin değilse boş sayılır); büyük/küçük harf farkıyla sayaç atlatılamasın
const kullaniciAdiAnahtari = (req: Request): string => {
  const ad = (req.body as { kullanici_adi?: unknown } | undefined)?.kullanici_adi;
  return typeof ad === 'string' ? ad.trim().toLowerCase().slice(0, 100) : '';
};

// Asıl koruma: aynı IP'den aynı hesaba 10 başarısız deneme -> o hesap için 15 dakika bekleme
export const girisHesapLimiti = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip || '')}|${kullaniciAdiAnahtari(req)}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: MESAJ_GIRIS,
});

// Arka güvence: aynı IP'den çok sayıda farklı hesabı denemeye karşı (parola püskürtme); herkesi kilitlemeyecek kadar geniş
export const girisIpLimiti = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: MESAJ_GIRIS,
});

export const girisLimiti = [girisIpLimiti, girisHesapLimiti];

export const kayitLimiti = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 10,                  // IP başına saatte 10 kayıt denemesi
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Çok fazla kayıt denemesi yapıldı. Lütfen bir saat sonra tekrar deneyin.'
  },
});
