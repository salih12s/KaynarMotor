/*
 * Modül bazlı yetkilendirme.
 *
 * Bu kurallar frontend/src/App.jsx içindeki route guard'larının sunucu tarafındaki
 * karşılığıdır. Guard'lar yalnızca gezinmeyi kısıtlar; asıl koruma buradadır.
 *
 * ÖNEMLİ — okuma/yazma ayrımı:
 * Bazı uçlar, sahibi olmadıkları sayfalar tarafından da OKUMA amaçlı kullanılır.
 * Örneğin aksesuar stoğu; servis, e-ticaret, rapor ve vitrin ekranlarında ürün
 * aramak için okunur. Bu yüzden salt-okunur uçlar açık bırakılıp yalnızca yazma
 * işlemleri (POST/PUT/PATCH/DELETE) yetkiye bağlanır. Frontend'de tüm çapraz
 * kullanımların salt-okunur olduğu doğrulanmıştır.
 */

import type { NextFunction, Request, Response } from 'express';
import type { Rol, YetkiBayraklari } from '../tipler';

type YetkiAlani = keyof YetkiBayraklari;

export const YAZMA_METODLARI = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Verilen yetki alanlarından en az birine sahip olmayı zorunlu kılar.
// Admin her zaman geçer.
export const modulYetkisi =
  (...alanlar: YetkiAlani[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (req.user.rol === 'admin') return next();
    if (alanlar.some((alan) => req.user[alan])) return next();
    return res.status(403).json({ message: 'Bu modül için yetkiniz yok' });
  };

// Yalnızca yazma işlemlerinde yetki arar; GET istekleri serbest bırakılır.
export const yazmaYetkisi =
  (...alanlar: YetkiAlani[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!YAZMA_METODLARI.includes(req.method)) return next();
    if (req.user.rol === 'admin') return next();
    if (alanlar.some((alan) => req.user[alan])) return next();
    return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
  };

// Belirli rollere kısıtlar.
export const rolYetkisi =
  (...roller: Rol[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (roller.includes(req.user.rol)) return next();
    return res.status(403).json({ message: 'Bu bölüme erişim yetkiniz yok' });
  };

// Vitrin yönetimi: admin VEYA motor/aksesuar vitrin yetkisi olan personel.
// Hem route'ta hem de gövde ayrıştırılmadan önce (server.js) kullanılır.
export const vitrinYetkili = (req: Request, res: Response, next: NextFunction) => {
  const u: Partial<Request['user']> = req.user || {};
  if (u.rol === 'admin' || u.motor_vitrin_yetkisi || u.aksesuar_vitrin_yetkisi) return next();
  return res.status(403).json({ message: 'Vitrin yönetim yetkiniz yok' });
};

// Motor kayıtlarında yazma yetkisi: admin veya motor satış yetkisi olan personel.
// Yatırımcı motor ekranında SALT OKUNURDUR (arayüzde de düzenleme yok): eskiden POST/PUT geçiyordu, yatırımcı
// kendi motorunun durumunu/plakasını değiştirebiliyor ve sahipsiz motor kaydı açabiliyordu.
// Okuma serbesttir; hassas alanlar zaten ikinciElMotor.js içindeki sanitizeMotor() tarafından gizlenir.
export const motorYazmaYetkisi = (req: Request, res: Response, next: NextFunction) => {
  if (!YAZMA_METODLARI.includes(req.method)) return next();
  if (req.user.rol === 'admin') return next();
  // Muhasebeci de salt-okunurdur (motor_satis_gor yalnızca görüntüleme açar)
  if (req.user.rol !== 'yatirimci' && req.user.rol !== 'muhasebeci' && req.user.motor_satis_yetkisi) return next();
  return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
};

// Okuma uçlarını hangi yetkililerin kullandığı (ekran bağımlılıklarından): bu listeler dışındaki hesaplar
// (yatırımcı, muhasebeci, yetkisiz personel) müşteri dizinini ve stok maliyetlerini okuyamaz.
// Yeni bir ekran bu uçları kullanacaksa yetkisini buraya ekleyin.
export const MUSTERI_ARAYANLAR: YetkiAlani[] = ['servis_yetkisi', 'aksesuar_yetkisi', 'motor_satis_yetkisi', 'yedek_parca_yetkisi'];
export const AKSESUAR_STOK_OKUYANLAR: YetkiAlani[] = [
  'aksesuar_yetkisi',
  'aksesuar_stok_yetkisi',
  'eticaret_yetkisi',
  'servis_yetkisi',
  'motor_vitrin_yetkisi',
  'aksesuar_vitrin_yetkisi',
];
export const YEDEK_PARCA_STOK_OKUYANLAR: YetkiAlani[] = ['yedek_parca_yetkisi', 'servis_yetkisi'];

// Karlılık bilgisi yalnızca admin'e açıktır. Bu alanlar admin dışındaki herkesin yanıtından,
// iç içe nesneler ve diziler dahil, silinir. Uç tek tek temizlenmediği için yeni bir uç kâr
// döndürse bile sızmaz. (kar_gor gibi kullanıcı bayrakları artık hiçbir şeyi açmaz.)
export const KAR_ALANLARI = new Set<string>(['kar', 'toplam_kar', 'kar_toplam', 'isletme_kar', 'sifir_kar', 'ikinci_el_kar']);
// Yatırımcının kendi payı: yatırımcı kendi raporunda bunu görür, diğer roller görmez.
export const YATIRIMCI_PAYI_ALANLARI = new Set<string>(['yatirimci_kar', 'yatirimci_kar_orani', 'toplam_yatirimci_kar']);

const duzNesneMi = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype;

export const alanlariSil = (v: unknown, gizli: Set<string>): unknown => {
  if (Array.isArray(v)) return v.map((x) => alanlariSil(x, gizli));
  if (!duzNesneMi(v)) return v; // Date, Buffer, sayı, metin olduğu gibi kalır
  const temiz: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) {
    if (!gizli.has(k)) temiz[k] = alanlariSil(x, gizli);
  }
  return temiz;
};

export const kariGizle = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.rol === 'admin') return next();
  const gizli = req.user && req.user.rol === 'yatirimci' ? KAR_ALANLARI : new Set([...KAR_ALANLARI, ...YATIRIMCI_PAYI_ALANLARI]);
  const json = res.json.bind(res);
  res.json = (govde?: any) => json(alanlariSil(govde, gizli));
  next();
};
