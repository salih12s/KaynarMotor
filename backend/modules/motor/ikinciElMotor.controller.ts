/* İkinci el motor HTTP katmanı: isteği okur, servisi çağırır, denetim günlüğünü yazar, yanıtı verir. */
import { ISLEM_TIPLERI, logAktivite } from '../../core/activityLogger';
import { pool } from '../../core/db';
import { dogrula } from '../../core/dogrula';
import { sarmala } from '../../core/kontrolcu';
import { motorGuncelleGovdesi, motorOlusturGovdesi } from './ikinciElMotor.schemas';
import * as servis from './ikinciElMotor.service';

const metinSorgu = (deger: unknown): string | undefined => (typeof deger === 'string' && deger !== '' ? deger : undefined);

export const ozet = sarmala('Motor özet hatası:', async (req, res) => {
  res.json(await servis.ozet(pool, req.user));
});

export const listele = sarmala('Motor listeleme hatası:', async (req, res) => {
  res.json(await servis.listele(pool, req.user, {
    baslangic: metinSorgu(req.query.baslangic),
    bitis: metinSorgu(req.query.bitis),
    durum: metinSorgu(req.query.durum),
  }));
});

export const detay = sarmala('Motor detay hatası:', async (req, res) => {
  res.json(await servis.detay(pool, Number(req.params.id), req.user));
});

export const olustur = sarmala('Motor satış ekleme hatası:', async (req, res) => {
  const govde = dogrula(motorOlusturGovdesi, req.body);
  const kayit = await servis.olustur(pool, govde, req.user);
  await logAktivite({
    kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
    islem_tipi: ISLEM_TIPLERI.MOTOR_SATIS_OLUSTUR,
    islem_detay: `2. El Motor: ${govde.plaka} - ${govde.marka} ${govde.model}`,
    hedef_tablo: 'ikinci_el_motorlar', hedef_id: kayit.id,
  });
  res.status(201).json(kayit);
});

export const guncelle = sarmala('Motor satış güncelleme hatası:', async (req, res) => {
  const id = Number(req.params.id);
  const kayit = await servis.guncelle(pool, id, dogrula(motorGuncelleGovdesi, req.body), req.user);
  await logAktivite({
    kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
    islem_tipi: ISLEM_TIPLERI.MOTOR_SATIS_GUNCELLE,
    islem_detay: `2. El Motor #${id} güncellendi`,
    hedef_tablo: 'ikinci_el_motorlar', hedef_id: id,
  });
  res.json(kayit);
});

export const sil = sarmala('Motor silme hatası:', async (req, res) => {
  const id = Number(req.params.id);
  await servis.sil(pool, id, req.user);
  await logAktivite({
    kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
    islem_tipi: ISLEM_TIPLERI.MOTOR_SATIS_SIL,
    islem_detay: `2. El Motor #${id} silindi`,
    hedef_tablo: 'ikinci_el_motorlar', hedef_id: id,
  });
  res.json({ message: 'Motor satışı silindi' });
});
