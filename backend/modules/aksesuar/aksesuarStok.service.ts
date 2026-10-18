/* Aksesuar stok iş kuralları. HTTP bilmez; hataları IstemciHatasi sınıflarıyla bildirir. */
import { isUniqueViolation } from '../../core/db';
import { BulunamadiHatasi, GecersizIstek } from '../../core/dogrula';
import { ondalik, tamSayi } from '../../core/sayi';
import type { BaglamDb, Veritabani } from '../../core/tipler';
import type { StokGovdesi, TopluStokGovdesi } from './aksesuarStok.schemas';
import * as repo from './aksesuarStok.repository';
import type { StokGirdisi } from './aksesuarStok.repository';

const ILK_KOD = '0000000000001';

const metinDolu = (deger: unknown) => String(deger || '').trim() !== '';

/** Sonraki otomatik stok kodu: 0 ile başlayan 13 haneli en büyük dahili kodun bir fazlası (yoksa ilk kod). */
export const sonrakiStokKodu = async (db: Veritabani) => {
  const son = await repo.enBuyukDahiliKod(db);
  return { nextStokKodu: son === null ? ILK_KOD : String(parseInt(son, 10) + 1).padStart(13, '0') };
};

export const listele = (db: Veritabani) => repo.hepsiniListele(db);

export const ara = async (db: Veritabani, q: unknown) => {
  if (typeof q !== 'string' || q.length < 2) return [];
  return repo.ara(db, `%${q}%`);
};

/** Barkod (stok kodu) ile tek ürün. */
export const barkodlaBul = async (db: Veritabani, barkod: string) => {
  const kod = (barkod || '').trim();
  if (!kod) throw new GecersizIstek('Barkod gerekli');
  const stok = await repo.koduneGoreBul(db, kod);
  if (!stok) throw new BulunamadiHatasi('Bu barkoda ait ürün bulunamadı');
  return stok;
};

/** Gövdeyi doğrular ve normalize eder (zorunlu alanlar, sayılar, varsayılan birim). */
const girdiHazirla = (g: StokGovdesi): StokGirdisi => {
  if (!metinDolu(g.stok_kodu) || !metinDolu(g.stok_adi)) throw new GecersizIstek('Stok kodu ve stok adı zorunludur');
  return {
    stok_kodu: g.stok_kodu, stok_adi: g.stok_adi, marka: g.marka,
    giren_miktar: tamSayi(g.giren_miktar),
    birimi: (g.birimi as string) || 'Adet',
    alis_fiyati: ondalik(g.alis_fiyati),
    satis_fiyati: ondalik(g.satis_fiyati),
    platform: g.platform, beden: g.beden, renk: g.renk, kategori: g.kategori,
  };
};

const stokKoduCakismasiniCevir = (hata: unknown): never => {
  if (isUniqueViolation(hata)) throw new GecersizIstek('Bu stok kodu zaten mevcut');
  throw hata;
};

export const ekle = async (db: Veritabani, govde: StokGovdesi) => {
  const girdi = girdiHazirla(govde);
  try {
    return await repo.ekle(db, girdi, girdi.giren_miktar * girdi.satis_fiyati);
  } catch (hata) {
    return stokKoduCakismasiniCevir(hata);
  }
};

export const guncelle = async (db: Veritabani, id: number, govde: StokGovdesi) => {
  const girdi = girdiHazirla(govde);
  if (girdi.giren_miktar < 0) throw new GecersizIstek('Giren miktar negatif olamaz');
  try {
    const stok = await repo.guncelle(db, id, girdi);
    if (!stok) throw new BulunamadiHatasi('Stok bulunamadı');
    return stok;
  } catch (hata) {
    return stokKoduCakismasiniCevir(hata);
  }
};

export const sil = (db: Veritabani, id: number) => repo.sil(db, id);

/** Toplu ekleme: ya hep ya hiç (ortadaki hatalı satır yüzünden yarım içe aktarma kalmasın). Eklenen/güncellenen sayısı döner. */
export const topluEkle = async (db: BaglamDb, govde: TopluStokGovdesi): Promise<number> => {
  const stoklar = govde.stoklar;
  if (!stoklar || !Array.isArray(stoklar)) throw new GecersizIstek('Stok listesi gerekli');

  const gecersiz = stoklar
    .map((s: any, i: number) => (!metinDolu(s && s.stok_kodu) || !metinDolu(s && s.stok_adi) ? i + 1 : null))
    .filter(Boolean);
  if (gecersiz.length) throw new GecersizIstek(`Stok kodu ve adı boş olamaz (satır: ${gecersiz.slice(0, 10).join(', ')})`);

  return db.withTransaction(async (tx) => {
    let eklenen = 0;
    for (const s of stoklar as any[]) {
      const giren = tamSayi(s.giren_miktar);
      const satis = ondalik(s.satis_fiyati);
      await repo.topluEkleVeyaGuncelle(tx, {
        stok_kodu: s.stok_kodu, stok_adi: s.stok_adi, marka: s.marka,
        giren_miktar: giren, birimi: s.birimi || 'Adet', alis_fiyati: ondalik(s.alis_fiyati), satis_fiyati: satis,
      }, giren * satis);
      eklenen++;
    }
    return eklenen;
  });
};
