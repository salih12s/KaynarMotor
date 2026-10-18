/* Aksesuar satışı HTTP katmanı: isteği okur, servisi çağırır, denetim günlüğünü yazar, yanıtı verir. */
import { ISLEM_TIPLERI, logAktivite } from '../../core/activityLogger';
import { pool } from '../../core/db';
import { dogrula } from '../../core/dogrula';
import { sarmala } from '../../core/kontrolcu';
import { satisGovdesi } from './aksesuarlar.schemas';
import * as servis from './aksesuarlar.service';

export const istatistik = sarmala('Aksesuar istatistik hatası:', async (_req, res) => {
  res.json(await servis.istatistik(pool));
});

export const listele = sarmala('Aksesuar listeleme hatası:', async (_req, res) => {
  res.json(await servis.listele(pool));
});

export const detay = sarmala('Aksesuar detay hatası:', async (req, res) => {
  res.json(await servis.detay(pool, Number(req.params.id)));
});

export const olustur = sarmala('Aksesuar oluşturma hatası:', async (req, res) => {
  const kayit = await servis.olustur(pool, dogrula(satisGovdesi, req.body), req.user);
  await logAktivite({
    kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
    islem_tipi: ISLEM_TIPLERI.AKSESUAR_OLUSTUR, islem_detay: `Aksesuar satış #${kayit.id}`,
    hedef_tablo: 'aksesuarlar', hedef_id: kayit.id,
  });
  res.status(201).json(kayit);
});

export const guncelle = sarmala('Aksesuar güncelleme hatası:', async (req, res) => {
  const id = Number(req.params.id);
  const kayit = await servis.guncelle(pool, id, dogrula(satisGovdesi, req.body));
  await logAktivite({
    kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
    islem_tipi: ISLEM_TIPLERI.AKSESUAR_GUNCELLE, islem_detay: `Aksesuar satış #${id} güncellendi`,
    hedef_tablo: 'aksesuarlar', hedef_id: id,
  });
  res.json(kayit);
});

export const sil = sarmala('Aksesuar silme hatası:', async (req, res) => {
  const id = Number(req.params.id);
  const vardi = await servis.sil(pool, id);
  // Para içeren bir satışın silinmesi iz bırakır (olmayan kayıt için günlük yazılmaz)
  if (vardi) {
    await logAktivite({
      kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
      islem_tipi: ISLEM_TIPLERI.AKSESUAR_SIL, islem_detay: `Aksesuar satış #${id} silindi`,
      hedef_tablo: 'aksesuarlar', hedef_id: id,
    });
  }
  res.json({ message: 'Aksesuar satışı silindi' });
});
