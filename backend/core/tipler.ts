/*
 * Ortak tipler. Express'in `req.user` alanı burada tanımlanır: authenticateToken (core/middleware/auth) doldurur,
 * kimlik doğrulaması olmayan (herkese açık) uçlarda yoktur.
 */

export type Rol = 'admin' | 'personel' | 'yatirimci' | 'muhasebeci';

/** Yetki bayrakları (kullanicilar tablosundaki BOOLEAN kolonlar). */
export interface YetkiBayraklari {
  aksesuar_yetkisi: boolean;
  motor_satis_yetkisi: boolean;
  eticaret_yetkisi: boolean;
  servis_yetkisi: boolean;
  aksesuar_stok_yetkisi: boolean;
  yedek_parca_yetkisi: boolean;
  motor_vitrin_yetkisi: boolean;
  aksesuar_vitrin_yetkisi: boolean;
  liste_fiyati_gor: boolean;
  alis_fiyati_gor: boolean;
  satis_fiyati_gor: boolean;
  kar_gor: boolean;
  musteri_gor: boolean;
  satis_gecmisi_gor: boolean;
  /** Muhasebeci için: Motor Satış sayfasını salt okunur görebilir (admin açar). */
  motor_satis_gor: boolean;
}

/** `req.user`: veritabanından her istekte okunan güncel kullanıcı (şifre özeti yok, yalnızca kısa parmak izi). */
export interface Kullanici extends YetkiBayraklari {
  id: number;
  kullanici_adi: string;
  ad_soyad: string;
  rol: Rol;
  onay_durumu: string;
  sifre_parmak: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: Kullanici;
    }
  }
}

/** Veritabanı sorgu sonucu (node-pg biçimi korunur: `{ rows, rowCount }`). */
export interface SqlSonuc<T = any> {
  rows: T[];
  rowCount: number;
  insertId?: number;
}

/** Sorgu çalıştırabilen her şey: havuz (`pool`) ya da bir transaction bağlantısı. Repository'ler bunu alır. */
export interface Veritabani {
  query<T = any>(text: string, params?: unknown[]): Promise<SqlSonuc<T>>;
}

/** `pool.connect()` ile alınan tek bağlantı. */
export interface Baglanti extends Veritabani {
  release(): void;
}
