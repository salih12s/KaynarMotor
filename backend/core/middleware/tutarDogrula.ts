/*
 * Negatif tutar engeli (yazma isteklerinde, tüm /api).
 *
 * Eskiden fiyat/maliyet/indirim/kalan ödeme gibi alanlara eksi değer girilebiliyordu: eksi parça fiyatı servis
 * toplamını, eksi indirim satış tutarını düşürüp/şişirip raporları bozuyordu. Kontrol tek yerde, alan ADIYLA yapılır;
 * gövdedeki iç içe nesne ve dizilere (parcalar, odeme_detaylari) de bakılır. Büyük metin değerleri (vitrin medyası)
 * taranmaz: yalnızca anahtar adları gezilir.
 *
 * Bilerek dışarıda: kar, yatirimci_kar (zararına satışta eksi olabilir).
 */
import type { NextFunction, Request, Response } from 'express';

const YAZMA = new Set(['POST', 'PUT', 'PATCH']);
const TUTAR_ALANLARI = new Set([
  'birim_fiyat', 'maliyet', 'satis_fiyati', 'alis_fiyati', 'noter_alis', 'noter_satis', 'masraflar', 'komisyoncu_tutari',
  'liste_fiyati', 'fiyat', 'indirim', 'kalan_odeme', 'tahmini_toplam_ucret', 'odeme_tutari', 'kargo_ucreti',
  'komisyon_orani', 'kdv_orani', 'tutar', 'giren_miktar',
]);

export const negatifBul = (deger: unknown, derinlik = 0): string | null => {
  if (derinlik > 6 || deger === null || typeof deger !== 'object') return null;
  if (Array.isArray(deger)) {
    for (const oge of deger) { const b = negatifBul(oge, derinlik + 1); if (b) return b; }
    return null;
  }
  for (const [anahtar, v] of Object.entries(deger as Record<string, unknown>)) {
    if (TUTAR_ALANLARI.has(anahtar) && (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && Number(v) < 0) return anahtar;
    if (v !== null && typeof v === 'object') { const b = negatifBul(v, derinlik + 1); if (b) return b; }
  }
  return null;
};

export const negatifTutarEngelle = (req: Request, res: Response, next: NextFunction) => {
  if (!YAZMA.has(req.method) || !req.body || typeof req.body !== 'object') return next();
  const alan = negatifBul(req.body);
  if (alan) return res.status(400).json({ message: `${alan} negatif olamaz` });
  next();
};
