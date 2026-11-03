/* Kullanıcı ve etkinlik günlüğü tabloları için SQL. İş kuralı yok: yalnızca sorgular. */
import { orderByText } from '../database/sqlText';
import type { Veritabani } from '../lib/tipler';

/** Oturum açmış kullanıcıya/yönetici listesine dönen yetki kolonları (şifre özeti ASLA seçilmez). */
const YETKI_KOLONLARI =
  'aksesuar_yetkisi, motor_satis_yetkisi, eticaret_yetkisi, servis_yetkisi, aksesuar_stok_yetkisi, yedek_parca_yetkisi, motor_vitrin_yetkisi, aksesuar_vitrin_yetkisi, liste_fiyati_gor, alis_fiyati_gor, satis_fiyati_gor, kar_gor, musteri_gor, satis_gecmisi_gor, motor_satis_gor';

export const kullaniciAdiVarMi = async (db: Veritabani, kullaniciAdi: string): Promise<boolean> =>
  (await db.query('SELECT id FROM kullanicilar WHERE kullanici_adi = $1', [kullaniciAdi])).rows.length > 0;

/** Giriş için tam satır (şifre özeti dahil). */
export const kullaniciAdinaGoreBul = async (db: Veritabani, kullaniciAdi: string) =>
  (await db.query('SELECT * FROM kullanicilar WHERE kullanici_adi = $1', [kullaniciAdi])).rows[0] ?? null;

/** Herkese açık kayıt: admin onayı bekleyen hesap (rol/onay varsayılanları veritabanındadır). */
export const kayitEkle = async (db: Veritabani, kullaniciAdi: string, sifreOzeti: string, adSoyad: string) =>
  (
    await db.query(
      `INSERT INTO kullanicilar (kullanici_adi, sifre, ad_soyad)
     VALUES ($1, $2, $3) RETURNING id, kullanici_adi, ad_soyad, rol, onay_durumu`,
      [kullaniciAdi, sifreOzeti, adSoyad],
    )
  ).rows[0];

/** Admin oluşturur: onaylı ve rollü hesap. */
export const adminKullaniciEkle = async (db: Veritabani, kullaniciAdi: string, sifreOzeti: string, adSoyad: string, rol: string) =>
  (
    await db.query(
      `INSERT INTO kullanicilar (kullanici_adi, sifre, ad_soyad, rol, onay_durumu)
     VALUES ($1, $2, $3, $4, 'onaylandi')
     RETURNING id, kullanici_adi, ad_soyad, rol, onay_durumu`,
      [kullaniciAdi, sifreOzeti, adSoyad, rol],
    )
  ).rows[0];

export const oturumBilgisi = async (db: Veritabani, id: number) =>
  (await db.query(`SELECT id, kullanici_adi, ad_soyad, rol, ${YETKI_KOLONLARI} FROM kullanicilar WHERE id = $1`, [id])).rows[0] ?? null;

/** Tüm onaylı kullanıcıların kimlik listesi (herkes görebilir: formlardaki personel seçimi). */
export const personelListesi = async (db: Veritabani) =>
  (await db.query(`SELECT id, ad_soyad FROM kullanicilar WHERE onay_durumu = 'onaylandi' ORDER BY ${orderByText('ad_soyad')}`)).rows;

export const kullanicilar = async (db: Veritabani) =>
  (await db.query(`SELECT id, kullanici_adi, ad_soyad, rol, onay_durumu, ${YETKI_KOLONLARI}, created_at FROM kullanicilar ORDER BY created_at DESC`)).rows;

/** Kullanıcının rolü; kullanıcı yoksa null. */
export const rolBul = async (db: Veritabani, id: number): Promise<string | null> =>
  (await db.query<{ rol: string }>('SELECT rol FROM kullanicilar WHERE id = $1', [id])).rows[0]?.rol ?? null;

/** Kullanıcı adı; kullanıcı yoksa null (denetim günlüğünde "kim silindi" için). */
export const kullaniciAdiBul = async (db: Veritabani, id: number): Promise<string | null> =>
  (await db.query<{ kullanici_adi: string }>('SELECT kullanici_adi FROM kullanicilar WHERE id = $1', [id])).rows[0]?.kullanici_adi ?? null;

/**
 * Yetki bayraklarının MEVCUT değerleri + kullanıcı adı (denetim günlüğünde eski → yeni için). `kolonlar` service'te izinli listeden
 * (YETKI_ALANLARI) süzülür: SQL'e kullanıcı girdisi yazılmaz. Kullanıcı yoksa undefined.
 */
export const yetkileriOku = async (db: Veritabani, id: number, kolonlar: readonly string[]) =>
  (await db.query(`SELECT kullanici_adi, ${kolonlar.join(', ')} FROM kullanicilar WHERE id = $1`, [id])).rows[0] as Record<string, unknown> | undefined;

export const onayDurumuAyarla = async (db: Veritabani, id: number, durum: 'onaylandi' | 'reddedildi') => {
  await db.query('UPDATE kullanicilar SET onay_durumu = $1 WHERE id = $2', [durum, id]);
};

/** Kullanıcının oluşturduğu iş emirleri KORUNUR (oluşturan adı olusturan_kisi kolonunda durur); yalnızca bağlantı boşaltılır. */
export const isEmirleriBaginiKopar = async (db: Veritabani, kullaniciId: number) => {
  await db.query('UPDATE is_emirleri SET olusturan_kullanici_id = NULL WHERE olusturan_kullanici_id = $1', [kullaniciId]);
};

export const kullaniciSil = async (db: Veritabani, id: number) => {
  await db.query('DELETE FROM kullanicilar WHERE id = $1', [id]);
};

/** Güncellenen satır sayısı (0: kullanıcı yok). */
export const sifreGuncelle = async (db: Veritabani, id: number, sifreOzeti: string): Promise<number> =>
  (await db.query('UPDATE kullanicilar SET sifre = $1 WHERE id = $2', [sifreOzeti, id])).rowCount;

/** Yalnızca admin'in motor stok formundaki yatırımcı seçimi için (kullanıcı adlarını içerir). */
export const onayliYatirimcilar = async (db: Veritabani) =>
  (
    await db.query(
      `SELECT id, ad_soyad, kullanici_adi FROM kullanicilar WHERE rol = 'yatirimci' AND onay_durumu = 'onaylandi' ORDER BY ${orderByText('ad_soyad')}`,
    )
  ).rows;

/**
 * Yetki bayraklarını günceller. Alan adları service'te izinli listeden süzülür (SQL'e kullanıcı girdisi yazılmaz:
 * yalnızca sabit liste elemanları kolon adı olur).
 */
export const yetkiGuncelle = async (db: Veritabani, id: number, alanlar: Array<[kolon: string, deger: boolean]>): Promise<number> => {
  const set: string[] = [];
  const params: unknown[] = [];
  for (const [kolon, deger] of alanlar) {
    params.push(deger);
    set.push(`${kolon} = $${params.length}`);
  }
  params.push(id);
  return (await db.query(`UPDATE kullanicilar SET ${set.join(', ')} WHERE id = $${params.length}`, params)).rowCount;
};

export const sonAktiviteler = async (db: Veritabani) => (await db.query('SELECT * FROM aktivite_log ORDER BY created_at DESC LIMIT 200')).rows;

export const kullaniciAktiviteleri = async (db: Veritabani, kullaniciId: number) =>
  (await db.query('SELECT * FROM aktivite_log WHERE kullanici_id = $1 ORDER BY created_at DESC LIMIT 100', [kullaniciId])).rows;
