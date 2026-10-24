/* Satış belgeleri HTTP katmanı: ham dosya gövdesini okur, servisi çağırır, denetim günlüğünü yazar. */
import { ISLEM_TIPLERI, logAktivite } from '../../../core/gunluk/activityLogger';
import { pool } from '../../../core/veritabani/db';
import { dogrula } from '../../../core/dogrulama/dogrula';
import { sarmala } from '../../../core/http/kontrolcu';
import { belgeYuklemeSorgusu } from './satisBelgeleri.schemas';
import * as servis from './satisBelgeleri.service';

export const arsiv = sarmala('Belge arşivi hatası:', async (_req, res) => {
  res.json(await servis.arsiv(pool));
});

export const motorBelgeleri = sarmala('Satış belge listesi hatası:', async (req, res) => {
  res.json(await servis.motorBelgeleri(pool, req.params.motorId));
});

// Yetki kontrolü routes'taki kapıda yapıldığı için gövde (10 MB'a kadar) ancak yetkili isteklerde okunur.
export const yukle = sarmala('Satış belgesi yükleme hatası:', async (req, res) => {
  const sorgu = dogrula(belgeYuklemeSorgusu, req.query);
  const belge = await servis.yukle(pool, { motorIdHam: req.params.motorId, dosyaAdiHam: sorgu.ad, icerik: req.body, kullanici: req.user });
  await logAktivite({
    kullanici_id: req.user.id,
    kullanici_adi: req.user.kullanici_adi,
    islem_tipi: ISLEM_TIPLERI.MOTOR_SATIS_GUNCELLE,
    islem_detay: `2. El Motor #${belge.motor_id}: belge eklendi (${belge.dosya_adi})`,
    hedef_tablo: 'ikinci_el_motorlar',
    hedef_id: belge.motor_id,
  });
  res.status(201).json(belge);
});

export const indir = sarmala('Satış belgesi indirme hatası:', async (req, res) => {
  const { dosya_adi: ad, mime, icerik } = await servis.indir(pool, req.params.id);
  res.set({
    'Content-Type': mime,
    'Content-Length': String(icerik.length),
    // eslint-disable-next-line no-control-regex
    'Content-Disposition': `attachment; filename="${ad.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(ad)}`,
    'Cache-Control': 'private, no-store',
  });
  res.end(icerik);
});

export const sil = sarmala('Satış belgesi silme hatası:', async (req, res) => {
  const silinen = await servis.sil(pool, req.params.id);
  await logAktivite({
    kullanici_id: req.user.id,
    kullanici_adi: req.user.kullanici_adi,
    islem_tipi: ISLEM_TIPLERI.MOTOR_SATIS_GUNCELLE,
    islem_detay: `2. El Motor #${silinen.motor_id}: belge silindi (${silinen.dosya_adi})`,
    hedef_tablo: 'ikinci_el_motorlar',
    hedef_id: silinen.motor_id,
  });
  res.json({ message: 'Belge silindi' });
});
