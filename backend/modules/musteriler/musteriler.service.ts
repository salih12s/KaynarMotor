/*
 * Müşteri iş kuralları. HTTP bilmez (express yok): hataları IstemciHatasi sınıflarıyla bildirir.
 *
 * Yetkilendirme notu:
 * Arama uçları (/ara, /telefon) servis, aksesuar, motor satış ve yedek parça yetkililerine açıktır (müşteri seçen
 * formlar). Yatırımcı, muhasebeci ve yetkisiz hesaplar arayamaz: eskiden her giriş yapmış hesap 2 harfle tüm
 * müşteri dizinini tarayabiliyordu. Toplu listeleme ve yönetim uçları yalnızca admin'e açıktır. (Kural route'ta.)
 */
import { pool } from '../../core/veritabani/db';
import { BulunamadiHatasi } from '../../core/dogrulama/dogrula';
import type { BaglamDb, Veritabani } from '../../core/tipler';
import type { MusteriGovdesi } from './musteriler.schemas';
import * as repo from './musteriler.repository';
import type { MusteriSatiri } from './musteriler.repository';

export const listele = (db: Veritabani) => repo.hepsiniListele(db);

export const ara = (db: Veritabani, sorgu: string) => repo.adVeyaTelefonaGoreAra(db, `%${sorgu}%`);

/** Telefon numarasına göre müşteri bul (son 10 hane ile eşleşme). Çok kısa/boş numara için null. */
export const telefonaGoreBul = async (db: Veritabani, telefon: string): Promise<MusteriSatiri | null> => {
  const rakamlar = (telefon || '').replace(/\D/g, '');
  if (!rakamlar || rakamlar.length < 7) return null;
  // Türkiye cep telefonu 10 haneli (başında 0 veya +90 olabilir) - son 10 haneyi al
  return repo.sonHanelereGoreBul(db, rakamlar.slice(-10));
};

/** Tek müşteri + işlem geçmişi (motor, aksesuar, iş emri). Motor alış fiyatı ve kâr içerdiği için admin'e kısıtlıdır. */
export const detay = async (db: Veritabani, id: number) => {
  const musteri = await repo.idyeGoreBul(db, id);
  if (!musteri) throw new BulunamadiHatasi('Müşteri bulunamadı');
  const ad = musteri.ad_soyad as string;
  const motorlar = await repo.motorGecmisi(db, ad);
  const aksesuarlar = await repo.aksesuarGecmisi(db, ad);
  const isEmirleri = await repo.isEmriGecmisi(db, ad);
  return { ...musteri, motorlar, aksesuarlar, isEmirleri };
};

/** Müşteri yönetim ekranından ekleme. Diğer modüller kaydı `upsertMusteri` ile otomatik oluşturur. */
export const ekle = (db: Veritabani, govde: MusteriGovdesi) => repo.ekle(db, govde.ad_soyad, govde.adres, govde.telefon);

export const guncelle = async (db: Veritabani, id: number, govde: MusteriGovdesi) => {
  const musteri = await repo.guncelle(db, id, govde.ad_soyad, govde.adres, govde.telefon);
  if (!musteri) throw new BulunamadiHatasi('Müşteri bulunamadı');
  return musteri;
};

/**
 * İş emirleri müşterinin ad/telefon/adresini kendi üzerinde de taşır: bağlantıyı boşaltıp kayıtları KORUR
 * (eskiden FK yüzünden "Sunucu hatası" veriyor ve müşteri silinemiyordu). İkisi tek transaction'da.
 */
export const sil = (db: BaglamDb, id: number) =>
  db.withTransaction(async (tx) => {
    await repo.isEmirleriniAyir(tx, id);
    await repo.sil(tx, id);
  });

// ---------------------------------------------------------------------------------------------------------------
// Otomatik müşteri kaydı (satış/servis modülleri kullanır)
// ---------------------------------------------------------------------------------------------------------------

const metin = (deger: unknown) => String(deger ?? '').trim();

type DoldurulacakAlan = ['ad_soyad' | 'telefon' | 'adres', string];

/**
 * KURAL: mevcut müşteri kaydı asla EZİLMEZ. Yalnızca kaydın BOŞ alanları doldurulur (saf fonksiyon: DB yok).
 * Aynı telefon (aile numarası) ya da aynı ad başka bir kişiye ait olabilir; eskiden gelen yeni isim/adres mevcut
 * kaydın üstüne yazılıyor ve başka bir müşterinin bilgisi kayboluyordu.
 */
export const doldurulacakAlanlar = (
  mevcut: Pick<MusteriSatiri, 'ad_soyad' | 'telefon' | 'adres'>,
  ad: string, telefon: string, adres: string
): DoldurulacakAlan[] => {
  const alanlar: DoldurulacakAlan[] = [];
  if (!metin(mevcut.ad_soyad)) alanlar.push(['ad_soyad', ad]);
  if (telefon && !metin(mevcut.telefon)) alanlar.push(['telefon', telefon]);
  if (adres && !metin(mevcut.adres)) alanlar.push(['adres', adres]);
  return alanlar;
};

/**
 * Satış/servis kayıtlarından müşteri kaydını otomatik oluşturur ya da bulur; müşteri id'sini döner (hata/boş ad: null).
 * `db`: havuz (varsayılan) ya da açık bir transaction'ın bağlantısı (iş emri, kaydıyla birlikte geri alınsın diye).
 */
export async function upsertMusteri(
  ad_soyad: unknown, telefon: unknown, adres: unknown, db: Veritabani = pool
): Promise<number | null> {
  if (!ad_soyad || !metin(ad_soyad)) return null;

  const ad = metin(ad_soyad);
  const tel = metin(telefon);
  const telRakam = tel.replace(/\D/g, '');
  const adresTemiz = metin(adres);

  try {
    let mevcut: MusteriSatiri | null = null;

    // 1) Önce telefona göre bul (son 10 hane): yazım biçimi farklı olsa da aynı müşteri bulunur
    if (telRakam.length >= 7) mevcut = await repo.telefonaGoreBulOzet(db, telRakam.slice(-10));

    // 2) Telefon verilmemişse ada göre bul (büyük/küçük harf duyarsız). Telefon VARSA ve eşleşmediyse ada
    //    bakılmaz: aynı adlı başka biri olabilir (ör. iki 'Ahmet Yılmaz'), birleştirmek yeni numarayı kaybettirirdi.
    if (!mevcut && telRakam.length < 7) mevcut = await repo.adaGoreBul(db, ad);

    if (mevcut) {
      const alanlar = doldurulacakAlanlar(mevcut, ad, tel, adresTemiz);
      if (alanlar.length > 0) await repo.alanlariDoldur(db, mevcut.id, alanlar);
      return mevcut.id;
    }

    // Eşleşme yok: yeni müşteri
    return await repo.otomatikEkle(db, ad, tel || null, adresTemiz || null);
  } catch (err) {
    console.error('Müşteri upsert hatası:', (err as Error).message);
    return null;
  }
}
