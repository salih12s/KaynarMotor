/*
 * Sıfır motor stoğu iş kuralları. Stok bir MODEL listesidir (ör. "Honda PCX 125 2026"): adet tutulmaz ve satış modeli
 * stoktan düşürmez. Satışın kendisi motor satış kaydıdır (ikinciElMotor.service, motor_durumu = 'sifir').
 * Vitrin ilanı bilgi ve görselleri buradan alır; liste fiyatı değişince bağlı ilanın fiyatı da değişir.
 * HTTP bilmez (express yok). Denetim günlüğü controller'dadır.
 */
import { paketHatasi } from '../../../core/veritabani/db';
import { BulunamadiHatasi, GecersizIstek, YetkiHatasi } from '../../../core/dogrulama/dogrula';
import { bosuSifir } from '../../../core/dogrulama/sayi';
import type { BaglamDb, Kullanici, Veritabani } from '../../../core/tipler';
import { medyaOnbellegi } from '../../vitrin/medya/medya.service';
import type { MedyaSonucu } from '../../vitrin/medya/medya.service';
import { IZINLI_GORSEL, cokBuyukMesaji, medyaHatasi, paketAsimi, parseDataUrl } from '../../vitrin/vitrinOrtak';
import { sanitizeSifirMotor, sifirAlisGorur } from './sifirMotor.gorunum';
import * as repo from './sifirMotor.repository';
import type { SifirMotorAlanlari, SifirMotorSatiri } from './sifirMotor.repository';
import type { SifirMotorGovdesi } from './sifirMotor.schemas';

const metinVeyaNull = (v: unknown): string | null => {
  const s = v === undefined || v === null ? '' : String(v).trim();
  return s === '' ? null : s;
};
const sayiVeyaNull = (v: unknown): number | null => bosuSifir(v) || null;
const sayi = (v: unknown): number => parseFloat(v as string) || 0;

// ---------------------------------------------------------------------------------------------------------------
// Okuma
// ---------------------------------------------------------------------------------------------------------------

export const listele = async (db: Veritabani, kullanici: Kullanici) => (await repo.listele(db)).map((r) => sanitizeSifirMotor(r, kullanici));

/** Tek model + görsel id listesi (ilki kapak). */
export const detay = async (db: Veritabani, id: number, kullanici: Kullanici): Promise<SifirMotorSatiri> => {
  const satir = await repo.idyeGoreBul(db, id);
  if (!satir) throw new BulunamadiHatasi('Sıfır motor bulunamadı');
  return { ...sanitizeSifirMotor(satir, kullanici), gorsel_idler: await repo.gorselIdleri(db, id) };
};

/** Herkese açık görsel (yalnızca izinli görsel türleri sunulur). Sık istenen görsel bellekten gelir. */
export const gorselBul = async (db: Veritabani, id: string): Promise<MedyaSonucu> => {
  const anahtar = `s:${id}`;
  const bellekte = medyaOnbellegi.get(anahtar);
  if (bellekte) return { tur: 'bulundu', medya: bellekte };
  const veri = await repo.gorselVerisi(db, id);
  if (veri === null) return { tur: 'yok' };
  const medya = parseDataUrl(veri, IZINLI_GORSEL);
  if (!medya) return { tur: 'gecersiz' };
  medyaOnbellegi.set(anahtar, medya, medya.buffer.length);
  return { tur: 'bulundu', medya };
};

// ---------------------------------------------------------------------------------------------------------------
// Yazma (route kapısı: admin veya motor satış yetkilisi)
// ---------------------------------------------------------------------------------------------------------------

/** Görseller veritabanına yazılmadan ÖNCE denetlenir: tür allowlist'i ve veritabanı paket sınırı. */
const gorselleriDogrula = async (gorseller: unknown[] | undefined) => {
  if (!gorseller) return;
  const sorun = medyaHatasi(gorseller, undefined);
  if (sorun) throw new GecersizIstek(sorun);
  const asim = await paketAsimi(...gorseller);
  if (asim) throw new GecersizIstek(cokBuyukMesaji(asim), 413);
};

/** Görselleri sırayla yazar; kapak = ilk görsel. */
const gorselleriYaz = async (tx: Veritabani, id: number, gorseller: unknown[]) => {
  await repo.gorselleriSil(tx, id);
  let kapakId: number | null = null;
  for (let i = 0; i < gorseller.length; i++) {
    const gorselId = await repo.gorselEkle(tx, id, gorseller[i] as string, i);
    if (kapakId === null) kapakId = gorselId;
  }
  await repo.kapakAyarla(tx, id, kapakId);
};

const paketHatasiniCevir = (hata: unknown): never => {
  if (paketHatasi(hata)) throw new GecersizIstek('Dosya çok büyük', 413);
  throw hata;
};

export const olustur = async (db: BaglamDb, govde: SifirMotorGovdesi, kullanici: Kullanici) => {
  const marka = metinVeyaNull(govde.marka);
  if (!marka) throw new GecersizIstek('Marka zorunlu');
  await gorselleriDogrula(govde.gorseller);

  const alanlar: SifirMotorAlanlari = {
    marka,
    model: metinVeyaNull(govde.model),
    yil: sayiVeyaNull(govde.yil),
    motor_cc: sayiVeyaNull(govde.motor_cc),
    segment: metinVeyaNull(govde.segment),
    alis_fiyati: sifirAlisGorur(kullanici) ? bosuSifir(govde.alis_fiyati) : 0,
    liste_fiyati: bosuSifir(govde.liste_fiyati),
    aciklama: metinVeyaNull(govde.aciklama),
  };
  try {
    const id = await db.withTransaction(async (tx) => {
      const kayit = await repo.ekle(tx, alanlar);
      if (govde.gorseller?.length) await gorselleriYaz(tx, kayit.id, govde.gorseller);
      return kayit.id as number;
    });
    return detay(db, id, kullanici);
  } catch (hata) {
    return paketHatasiniCevir(hata);
  }
};

/**
 * KISMİ güncelleme: gövdede olmayan alan mevcut değerle korunur. Alış fiyatını göremeyen kullanıcının gönderdiği değer
 * yok sayılır (veriyi bozmasın). Liste fiyatı değiştiyse bağlı vitrin ilanının fiyatı aynı işlemde güncellenir.
 */
export const guncelle = async (db: BaglamDb, id: number, govde: SifirMotorGovdesi, kullanici: Kullanici) => {
  await gorselleriDogrula(govde.gorseller);
  const g = govde as Record<string, unknown>;
  try {
    await db.withTransaction(async (tx) => {
      const mevcut: SifirMotorSatiri | null = await repo.kilitleyerekOku(tx, id);
      if (!mevcut) throw new BulunamadiHatasi('Sıfır motor bulunamadı');
      const al = (alan: string) => (g[alan] !== undefined ? g[alan] : mevcut[alan]);

      const marka = metinVeyaNull(al('marka'));
      if (!marka) throw new GecersizIstek('Marka zorunlu');
      const listeFiyati = bosuSifir(al('liste_fiyati'));
      await repo.guncelle(tx, id, {
        marka,
        model: metinVeyaNull(al('model')),
        yil: sayiVeyaNull(al('yil')),
        motor_cc: sayiVeyaNull(al('motor_cc')),
        segment: metinVeyaNull(al('segment')),
        alis_fiyati: sifirAlisGorur(kullanici) ? bosuSifir(al('alis_fiyati')) : sayi(mevcut.alis_fiyati),
        liste_fiyati: listeFiyati,
        aciklama: metinVeyaNull(al('aciklama')),
      });
      if (govde.gorseller) await gorselleriYaz(tx, id, govde.gorseller);
      if (listeFiyati > 0 && listeFiyati !== sayi(mevcut.liste_fiyati)) await repo.vitrinFiyatiniGuncelle(tx, id, listeFiyati);
    });
  } catch (hata) {
    paketHatasiniCevir(hata);
  }
  return detay(db, id, kullanici);
};

/**
 * Yalnızca admin siler. Bağlı vitrin ilanı yayından kalkar ve bağlantısı kopar (tek işlem). Bu modelle yapılmış
 * satışlar SİLİNMEZ: raporda "sıfır" olarak kalırlar (motor_durumu), yalnızca model bağlantısı boşalır.
 */
export const sil = async (db: BaglamDb, id: number, kullanici: Kullanici) => {
  if (kullanici.rol !== 'admin') throw new YetkiHatasi('Silme yetkiniz yok');
  await db.withTransaction(async (tx) => {
    await repo.vitrinBaglantisiniKopar(tx, id);
    const silinen = await repo.sil(tx, id);
    if (!silinen) throw new BulunamadiHatasi('Sıfır motor bulunamadı');
  });
};
