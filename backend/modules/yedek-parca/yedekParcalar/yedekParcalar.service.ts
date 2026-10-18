/* Yedek parça satış iş kuralları: satış kaydı + bağlı stoktan düşüm/iade, tek transaction'da. HTTP bilmez. */
import { BulunamadiHatasi, adetCoz } from '../../../core/dogrulama/dogrula';
import { bosuSifir } from '../../../core/dogrulama/sayi';
import type { BaglamDb, Veritabani } from '../../../core/tipler';
import { stokAyarla as stokDuzenle } from '../../../shared/stok';
import type { SatisGovdesi } from './yedekParcalar.schemas';
import * as repo from './yedekParcalar.repository';
import type { SatisGirdisi } from './yedekParcalar.repository';

/** Satış stok kaydına bağlıysa yedek parça stoğunu ayarla (yon: 1 düş, -1 geri ekle). Stok eksiye düşebilir (shared/stok). */
const stokAyarla = async (db: Veritabani, stokId: unknown, adet: number, yon: 1 | -1) => {
  if (!stokId || !adet) return;
  await stokDuzenle(db, 'yedek_parca_stok', 'id = $2', stokId, adet * yon);
};

const girdiHazirla = (g: SatisGovdesi): SatisGirdisi => ({
  urun_adi: g.urun_adi,
  alis_fiyati: bosuSifir(g.alis_fiyati),
  satis_fiyati: bosuSifir(g.satis_fiyati),
  musteri_adi: g.musteri_adi,
  musteri_telefon: g.musteri_telefon,
  kalan_odeme: bosuSifir(g.kalan_odeme),
  stok_id: g.stok_id,
  adet: adetCoz(g.adet),
});

export const listele = (db: Veritabani) => repo.hepsiniListele(db);

export const detay = async (db: Veritabani, id: number) => {
  const satis = await repo.idyeGoreBul(db, id);
  if (!satis) throw new BulunamadiHatasi('Yedek parça bulunamadı');
  return satis;
};

/** Barkodla stoktan satıldıysa stoktan düşer. */
export const ekle = (db: BaglamDb, govde: SatisGovdesi) =>
  db.withTransaction(async (tx) => {
    const girdi = girdiHazirla(govde);
    const satis = await repo.ekle(tx, girdi);
    await stokAyarla(tx, girdi.stok_id || null, girdi.adet, 1);
    return satis;
  });

export const guncelle = (db: BaglamDb, id: number, govde: SatisGovdesi) =>
  db.withTransaction(async (tx) => {
    const eski = await repo.kilitleyerekOku(tx, id);
    if (!eski) throw new BulunamadiHatasi('Yedek parça bulunamadı');
    const girdi = girdiHazirla(govde);
    const satis = await repo.guncelle(tx, id, girdi);
    // Eski stok düşümünü geri al, yenisini uygula
    await stokAyarla(tx, eski.stok_id, eski.adet || 1, -1);
    await stokAyarla(tx, girdi.stok_id || null, girdi.adet, 1);
    return satis;
  });

/** Satış silinince stok geri eklenir. Kayıt yoksa sessizce başarılı döner (eski davranış). */
export const sil = (db: BaglamDb, id: number) =>
  db.withTransaction(async (tx) => {
    const eski = await repo.kilitleyerekOku(tx, id);
    await repo.sil(tx, id);
    if (eski) await stokAyarla(tx, eski.stok_id, eski.adet || 1, -1);
  });
