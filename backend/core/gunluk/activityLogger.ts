import { pool } from '../veritabani/db';

export const ISLEM_TIPLERI = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  REGISTER: 'REGISTER',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  VIEW: 'VIEW',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  PRINT: 'PRINT',
  IS_EMRI_OLUSTUR: 'IS_EMRI_OLUSTUR',
  IS_EMRI_GUNCELLE: 'IS_EMRI_GUNCELLE',
  IS_EMRI_SIL: 'IS_EMRI_SIL',
  MUSTERI_OLUSTUR: 'MUSTERI_OLUSTUR',
  MUSTERI_GUNCELLE: 'MUSTERI_GUNCELLE',
  MUSTERI_SIL: 'MUSTERI_SIL',
  AKSESUAR_OLUSTUR: 'AKSESUAR_OLUSTUR',
  AKSESUAR_GUNCELLE: 'AKSESUAR_GUNCELLE',
  AKSESUAR_SIL: 'AKSESUAR_SIL',
  MOTOR_SATIS_OLUSTUR: 'MOTOR_SATIS_OLUSTUR',
  MOTOR_SATIS_GUNCELLE: 'MOTOR_SATIS_GUNCELLE',
  MOTOR_SATIS_SIL: 'MOTOR_SATIS_SIL',
  ETICARET_SATIS_OLUSTUR: 'ETICARET_SATIS_OLUSTUR',
  ETICARET_SATIS_GUNCELLE: 'ETICARET_SATIS_GUNCELLE',
  ETICARET_SATIS_SIL: 'ETICARET_SATIS_SIL',
  YEDEK_PARCA_OLUSTUR: 'YEDEK_PARCA_OLUSTUR',
  YEDEK_PARCA_GUNCELLE: 'YEDEK_PARCA_GUNCELLE',
  YEDEK_PARCA_SIL: 'YEDEK_PARCA_SIL',
} as const;

export type IslemTipi = (typeof ISLEM_TIPLERI)[keyof typeof ISLEM_TIPLERI];

export interface AktiviteParametreleri {
  kullanici_id?: number | null;
  kullanici_adi?: string | null;
  islem_tipi: IslemTipi | string;
  islem_detay?: string | null;
  hedef_tablo?: string | null;
  hedef_id?: number | null;
  ip_adresi?: string | null;
  tarayici_bilgisi?: string | null;
}

export const logAktivite = async (params: AktiviteParametreleri) => {
  try {
    // Object parametre
    if (typeof params === 'object' && !Array.isArray(params)) {
      const { kullanici_id, kullanici_adi, islem_tipi, islem_detay, hedef_tablo, hedef_id, ip_adresi, tarayici_bilgisi } = params;

      await pool.query(
        `INSERT INTO aktivite_log (kullanici_id, kullanici_adi, islem_tipi, islem_detay, hedef_tablo, hedef_id, ip_adresi, tarayici_bilgisi)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [kullanici_id, kullanici_adi, islem_tipi, islem_detay, hedef_tablo, hedef_id, ip_adresi, tarayici_bilgisi],
      );
    }
  } catch (error) {
    console.error('Aktivite log hatası:', (error as Error).message);
    // Log hatası ana işlemi durdurmamalı
  }
};
