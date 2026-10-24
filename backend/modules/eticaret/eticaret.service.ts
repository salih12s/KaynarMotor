/*
 * E-ticaret iş kuralları: platform yönetimi (admin), komisyon/kâr hesabı, aksesuar stoğundan düşüm/iade.
 * HTTP bilmez (express yok). Denetim günlüğü HTTP katmanında, controller'da yazılır.
 * Komisyon/kâr formülü komisyon.ts içindedir (arayüzdeki kopyasıyla aynı test vektörlerinden geçer).
 */
import { BulunamadiHatasi, GecersizIstek, YetkiHatasi, adetCoz, bosuNull } from '../../core/dogrulama/dogrula';
import { bosuSifir } from '../../core/dogrulama/sayi';
import type { BaglamDb, Kullanici, Veritabani } from '../../core/tipler';
import { stokAyarla } from '../../shared/stok';
import { detectPlatform, hesaplaKomisyon } from './komisyon';
import type { PlatformTipi } from './komisyon';
import type { PlatformGovdesi, SatisGovdesi } from './eticaret.schemas';
import * as repo from './eticaret.repository';
import type { PlatformAlanlari, SatisAlanlari } from './eticaret.repository';

/** KDV boş bırakılırsa %20; 0 geçerli bir orandır. */
const kdvVarsayilan = (kdv: unknown): number => (kdv !== '' && kdv !== undefined && kdv !== null ? bosuSifir(kdv) : 20);

const yalnizAdmin = (kullanici: Kullanici) => {
  if (kullanici.rol !== 'admin') throw new YetkiHatasi('Admin yetkisi gerekli');
};

// ============ PLATFORMLAR ============

export const platformlariListele = (db: Veritabani) => repo.platformlariListele(db);

const platformAlanlari = (g: PlatformGovdesi): PlatformAlanlari => {
  const ad = typeof g.platform_adi === 'string' ? g.platform_adi.trim() : '';
  if (!ad) throw new GecersizIstek('Platform adı zorunludur');
  return { platform_adi: ad, komisyon_orani: bosuSifir(g.komisyon_orani), kdv_orani: kdvVarsayilan(g.kdv_orani), kargo_ucreti: bosuSifir(g.kargo_ucreti) };
};

export const platformEkle = async (db: Veritabani, govde: PlatformGovdesi, kullanici: Kullanici) => {
  yalnizAdmin(kullanici);
  return repo.platformEkle(db, platformAlanlari(govde));
};

export const platformGuncelle = async (db: Veritabani, id: number, govde: PlatformGovdesi, kullanici: Kullanici) => {
  yalnizAdmin(kullanici);
  const platform = await repo.platformGuncelle(db, id, platformAlanlari(govde));
  if (!platform) throw new BulunamadiHatasi('Platform bulunamadı');
  return platform;
};

/** Platformu siler; kayıt vardıysa true (günlük yazılır), yoksa false. */
export const platformSil = async (db: Veritabani, id: number, kullanici: Kullanici): Promise<boolean> => {
  yalnizAdmin(kullanici);
  return (await repo.platformSil(db, id)) > 0;
};

// ============ SATIŞLAR ============

export const istatistik = (db: Veritabani) => repo.istatistik(db);

export const satislariListele = (db: Veritabani) => repo.satislariListele(db);

export const satisDetay = async (db: Veritabani, id: number) => {
  const satis = await repo.satisBul(db, id);
  if (!satis) throw new BulunamadiHatasi('Satış bulunamadı');
  return satis;
};

/** Gövdedeki alanlardan hesaplanmış satış satırı: adet doğrulanır, platform tipine göre komisyon/kâr hesaplanır. */
const satisHesapla = async (db: Veritabani, g: SatisGovdesi): Promise<SatisAlanlari> => {
  const miktar = adetCoz(g.adet);
  const alis = bosuSifir(g.alis_fiyati);
  const satis = bosuSifir(g.satis_fiyati);
  const komisyon = bosuSifir(g.komisyon_orani);
  const kdv = kdvVarsayilan(g.kdv_orani);
  const kargo = bosuSifir(g.kargo_ucreti);

  // Platform tipini belirle
  let platformTipi: PlatformTipi = 'trendyol';
  if (g.platform_id) {
    const ad = await repo.platformAdi(db, g.platform_id);
    if (ad !== null) platformTipi = detectPlatform(ad);
  }
  const hesap = hesaplaKomisyon(satis, alis, komisyon, kdv, kargo, miktar, platformTipi);

  return {
    stok_id: bosuNull(g.stok_id),
    platform_id: bosuNull(g.platform_id),
    urun_adi: g.urun_adi,
    alis_fiyati: alis,
    satis_fiyati: satis,
    komisyon_orani: komisyon,
    komisyon_tutari: hesap.komisyonTutari,
    kdv_orani: kdv,
    kargo_ucreti: kargo,
    kar: hesap.netKar,
    adet: miktar,
    tarih: g.tarih,
  };
};

/** Satış oluşturur ve stoktan düşer (tek transaction). */
export const satisOlustur = async (db: BaglamDb, govde: SatisGovdesi) => {
  const id = await db.withTransaction(async (tx) => {
    const alanlar = await satisHesapla(tx, govde);
    const satis = await repo.satisEkle(tx, { ...alanlar, tarih: govde.tarih || new Date() });
    if (govde.stok_id) await stokAyarla(tx, 'aksesuar_stok', 'id = $2', govde.stok_id, alanlar.adet);
    return satis.id as number;
  });
  return repo.satisPlatformlaBul(db, id);
};

/** Eski stok düşümü geri eklenir, yenisi uygulanır; hesap yeniden yapılır (tek transaction). */
export const satisGuncelle = async (db: BaglamDb, id: number, govde: SatisGovdesi) => {
  await db.withTransaction(async (tx) => {
    const eski = await repo.satisiKilitleyerekOku(tx, id);
    if (!eski) throw new BulunamadiHatasi('Bulunamadı');

    // Eski stok geri ekle
    if (eski.stok_id) await stokAyarla(tx, 'aksesuar_stok', 'id = $2', eski.stok_id, -eski.adet);

    const alanlar = await satisHesapla(tx, govde);
    await repo.satisGuncelle(tx, id, alanlar);

    // Yeni stoktan düş
    if (govde.stok_id) await stokAyarla(tx, 'aksesuar_stok', 'id = $2', govde.stok_id, alanlar.adet);
  });
  return repo.satisPlatformlaBul(db, id);
};

/** Satışı siler, stok geri eklenir. Kayıt vardıysa true (günlük yazılır). */
export const satisSil = (db: BaglamDb, id: number): Promise<boolean> =>
  db.withTransaction(async (tx) => {
    const mevcut = await repo.satisiKilitleyerekOku(tx, id);
    if (mevcut && mevcut.stok_id) await stokAyarla(tx, 'aksesuar_stok', 'id = $2', mevcut.stok_id, -mevcut.adet);
    await repo.satisSil(tx, id);
    return mevcut !== null;
  });
