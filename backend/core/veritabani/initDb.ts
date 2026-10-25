import bcrypt from 'bcryptjs';
import { pool } from './db';

// MariaDB şeması (Hostinger). Eski PostgreSQL şemasından kolon sırası, tipler,
// varsayılanlar, yabancı anahtarlar ve indeksler korunarak üretilmiştir.
//
//  - Tüm tablolar utf8mb4_nopad_bin ile açılır: karşılaştırma ve LIKE büyük/küçük harfe
//    duyarlıdır, sondaki boşluk anlamlıdır (PostgreSQL varchar davranışı).
//  - TIMESTAMP -> DATETIME(6) (UTC), BOOLEAN -> TINYINT(1), BYTEA -> LONGBLOB,
//    SERIAL -> AUTO_INCREMENT, vitrin ilan_no dizisi -> MariaDB SEQUENCE.
//  - Her CREATE ... IF NOT EXISTS olduğu için açılışta tekrar çalıştırmak güvenlidir;
//    mevcut veriyi değiştirmez. Şemaya yeni kolon eklerken MIGRATIONS listesine
//    "ALTER TABLE ... ADD COLUMN IF NOT EXISTS ..." ekleyin.

// Vitrin ilan numarası (benzersiz sıra no). vitrin_urunleri tablosundan ÖNCE oluşturulur.
const SIRA_ONCE = ['CREATE SEQUENCE IF NOT EXISTS vitrin_ilan_no_seq START WITH 1'];

const YARDIMCI = [
  // İş emri fiş numarası üretimini serileştiren tek satırlık kilit tablosu
  // (PostgreSQL'deki pg_advisory_xact_lock yerine; SELECT ... FOR UPDATE ile kullanılır).
  `CREATE TABLE IF NOT EXISTS fis_no_kilidi (
  id INT NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_nopad_bin`,
  'INSERT IGNORE INTO fis_no_kilidi (id) VALUES (1)',
];

const TABLOLAR = [
  `
CREATE TABLE IF NOT EXISTS aksesuarlar (
  id INT NOT NULL AUTO_INCREMENT,
  ad_soyad VARCHAR(100),
  telefon VARCHAR(20),
  urun_adi VARCHAR(255),
  odeme_tutari DECIMAL(10,2) DEFAULT 0,
  odeme_sekli VARCHAR(50),
  aciklama TEXT,
  durum VARCHAR(50) DEFAULT 'beklemede',
  toplam_maliyet DECIMAL(10,2) DEFAULT 0,
  toplam_satis DECIMAL(10,2) DEFAULT 0,
  kar DECIMAL(10,2) DEFAULT 0,
  odeme_detaylari TEXT,
  satis_tarihi DATE DEFAULT (CURRENT_DATE),
  tamamlama_tarihi DATETIME(6),
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  olusturan_kisi VARCHAR(100),
  kalan_odeme DECIMAL(12,2) DEFAULT 0,
  indirim DECIMAL(12,2) DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_nopad_bin
  `,
  `
CREATE TABLE IF NOT EXISTS aksesuar_parcalar (
  id INT NOT NULL AUTO_INCREMENT,
  aksesuar_id INT,
  urun_adi VARCHAR(255),
  adet INT DEFAULT 1,
  maliyet DECIMAL(10,2) DEFAULT 0,
  satis_fiyati DECIMAL(10,2) DEFAULT 0,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  FOREIGN KEY (aksesuar_id) REFERENCES aksesuarlar(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_nopad_bin
  `,
  `
CREATE TABLE IF NOT EXISTS aksesuar_stok (
  id INT NOT NULL AUTO_INCREMENT,
  stok_kodu VARCHAR(20) NOT NULL,
  stok_adi VARCHAR(255) NOT NULL,
  giren_miktar INT DEFAULT 0,
  cikan_miktar INT DEFAULT 0,
  mevcut INT DEFAULT 0,
  birimi VARCHAR(20) DEFAULT 'Adet',
  alis_fiyati DECIMAL(10,2) DEFAULT 0,
  satis_fiyati DECIMAL(10,2) DEFAULT 0,
  envanter_degeri DECIMAL(12,2) DEFAULT 0,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  marka VARCHAR(100),
  platform VARCHAR(100),
  beden VARCHAR(10),
  renk VARCHAR(50),
  kategori VARCHAR(50),
  PRIMARY KEY (id),
  UNIQUE KEY aksesuar_stok_stok_kodu_key (stok_kodu)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_nopad_bin
  `,
  `
CREATE TABLE IF NOT EXISTS kullanicilar (
  id INT NOT NULL AUTO_INCREMENT,
  kullanici_adi VARCHAR(50) NOT NULL,
  sifre VARCHAR(255) NOT NULL,
  plain_sifre VARCHAR(255),
  ad_soyad VARCHAR(100) NOT NULL,
  rol VARCHAR(20) DEFAULT 'personel',
  onay_durumu VARCHAR(20) DEFAULT 'beklemede',
  aksesuar_yetkisi BOOLEAN DEFAULT FALSE,
  motor_satis_yetkisi BOOLEAN DEFAULT FALSE,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  eticaret_yetkisi BOOLEAN DEFAULT FALSE,
  servis_yetkisi BOOLEAN DEFAULT FALSE,
  aksesuar_stok_yetkisi BOOLEAN DEFAULT FALSE,
  yedek_parca_yetkisi BOOLEAN DEFAULT FALSE,
  liste_fiyati_gor BOOLEAN DEFAULT FALSE,
  alis_fiyati_gor BOOLEAN DEFAULT FALSE,
  satis_fiyati_gor BOOLEAN DEFAULT FALSE,
  kar_gor BOOLEAN DEFAULT FALSE,
  musteri_gor BOOLEAN DEFAULT FALSE,
  satis_gecmisi_gor BOOLEAN DEFAULT FALSE,
  motor_vitrin_yetkisi BOOLEAN DEFAULT FALSE,
  aksesuar_vitrin_yetkisi BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (id),
  UNIQUE KEY kullanicilar_kullanici_adi_key (kullanici_adi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_nopad_bin
  `,
  `
CREATE TABLE IF NOT EXISTS aktivite_log (
  id INT NOT NULL AUTO_INCREMENT,
  kullanici_id INT,
  kullanici_adi VARCHAR(50),
  islem_tipi VARCHAR(50) NOT NULL,
  islem_detay TEXT,
  hedef_tablo VARCHAR(50),
  hedef_id INT,
  ip_adresi VARCHAR(45),
  tarayici_bilgisi TEXT,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  FOREIGN KEY (kullanici_id) REFERENCES kullanicilar(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_nopad_bin
  `,
  `
CREATE TABLE IF NOT EXISTS eticaret_platformlar (
  id INT NOT NULL AUTO_INCREMENT,
  platform_adi VARCHAR(100) NOT NULL,
  komisyon_orani DECIMAL(5,2) DEFAULT 0,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  kdv_orani DECIMAL(5,2) DEFAULT 20,
  kargo_ucreti DECIMAL(10,2) DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_nopad_bin
  `,
  `
CREATE TABLE IF NOT EXISTS eticaret_satislar (
  id INT NOT NULL AUTO_INCREMENT,
  stok_id INT,
  platform_id INT,
  urun_adi VARCHAR(255),
  alis_fiyati DECIMAL(10,2) DEFAULT 0,
  satis_fiyati DECIMAL(10,2) DEFAULT 0,
  komisyon_orani DECIMAL(5,2) DEFAULT 0,
  komisyon_tutari DECIMAL(10,2) DEFAULT 0,
  kar DECIMAL(10,2) DEFAULT 0,
  adet INT DEFAULT 1,
  tarih DATE DEFAULT (CURRENT_DATE),
  durum VARCHAR(50) DEFAULT 'tamamlandi',
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  kdv_orani DECIMAL(5,2) DEFAULT 20,
  kargo_ucreti DECIMAL(10,2) DEFAULT 0,
  PRIMARY KEY (id),
  FOREIGN KEY (platform_id) REFERENCES eticaret_platformlar(id) ON DELETE SET NULL,
  FOREIGN KEY (stok_id) REFERENCES aksesuar_stok(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_nopad_bin
  `,
  `
CREATE TABLE IF NOT EXISTS ikinci_el_motorlar (
  id INT NOT NULL AUTO_INCREMENT,
  tarih DATE DEFAULT (CURRENT_DATE),
  plaka VARCHAR(20),
  marka VARCHAR(100),
  model VARCHAR(100),
  km INT,
  alis_fiyati DECIMAL(12,2) DEFAULT 0,
  satis_fiyati DECIMAL(12,2) DEFAULT 0,
  noter_alis DECIMAL(12,2) DEFAULT 0,
  noter_satis DECIMAL(12,2) DEFAULT 0,
  kar DECIMAL(12,2) DEFAULT 0,
  alici_adi VARCHAR(255),
  alici_tc VARCHAR(100),
  alici_telefon VARCHAR(50),
  alici_adres TEXT,
  odeme_sekli VARCHAR(50) DEFAULT 'nakit',
  aciklama TEXT,
  durum VARCHAR(50) DEFAULT 'beklemede',
  tamamlama_tarihi DATETIME(6),
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  masraflar DECIMAL(12,2) DEFAULT 0,
  stok_tipi VARCHAR(20) DEFAULT 'sahip',
  yil INT,
  satici_adi VARCHAR(255),
  satici_tc VARCHAR(20),
  kalan_odeme DECIMAL(12,2) DEFAULT 0,
  fatura_kesildi BOOLEAN DEFAULT FALSE,
  yevmiye_no VARCHAR(50),
  eski_kayit BOOLEAN DEFAULT FALSE,
  satis_tarihi DATE,
  komisyoncu_adi VARCHAR(255),
  komisyoncu_telefon VARCHAR(50),
  komisyoncu_tutari DECIMAL(12,2) DEFAULT 0,
  yatirimci_id INT,
  yatirimci_kar_orani DECIMAL(5,2) DEFAULT 0,
  yatirimci_kar DECIMAL(12,2) DEFAULT 0,
  liste_fiyati DECIMAL(12,2) DEFAULT 0,
  odeme_detaylari TEXT,
  vitrin_baslik TEXT,
  vitrin_aciklama TEXT,
  vitrin_segment VARCHAR(50),
  vitrin_cc INT,
  vitrin_fiyat DECIMAL(12,2),
  vitrin_hasar TEXT,
  PRIMARY KEY (id),
  FOREIGN KEY (yatirimci_id) REFERENCES kullanicilar(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_nopad_bin
  `,
  `
CREATE TABLE IF NOT EXISTS musteriler (
  id INT NOT NULL AUTO_INCREMENT,
  ad_soyad VARCHAR(100),
  adres TEXT,
  telefon VARCHAR(20),
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_nopad_bin
  `,
  `
CREATE TABLE IF NOT EXISTS is_emirleri (
  id INT NOT NULL AUTO_INCREMENT,
  fis_no INT,
  musteri_id INT,
  musteri_ad_soyad VARCHAR(100),
  adres TEXT,
  telefon VARCHAR(20),
  km INT,
  model_tip VARCHAR(100),
  marka VARCHAR(100),
  aciklama TEXT,
  ariza_sikayetler TEXT,
  tahmini_teslim_tarihi DATE,
  tahmini_toplam_ucret DECIMAL(10,2) DEFAULT 0,
  gercek_toplam_ucret DECIMAL(10,2) DEFAULT 0,
  toplam_maliyet DECIMAL(10,2) DEFAULT 0,
  kar DECIMAL(10,2) DEFAULT 0,
  durum VARCHAR(20) DEFAULT 'beklemede',
  musteri_imza BOOLEAN DEFAULT FALSE,
  teslim_alan_ad_soyad VARCHAR(100),
  teslim_eden_teknisyen VARCHAR(100),
  teslim_tarihi DATE,
  olusturan_kullanici_id INT,
  olusturan_kisi VARCHAR(100),
  odeme_detaylari TEXT,
  tamamlama_tarihi DATETIME(6),
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  kalan_odeme DECIMAL(12,2) DEFAULT 0,
  plaka VARCHAR(20),
  PRIMARY KEY (id),
  UNIQUE KEY is_emirleri_fis_no_key (fis_no),
  FOREIGN KEY (musteri_id) REFERENCES musteriler(id),
  FOREIGN KEY (olusturan_kullanici_id) REFERENCES kullanicilar(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_nopad_bin
  `,
  `
CREATE TABLE IF NOT EXISTS parcalar (
  id INT NOT NULL AUTO_INCREMENT,
  is_emri_id INT,
  parca_kodu VARCHAR(50),
  takilan_parca VARCHAR(200),
  adet INT DEFAULT 1,
  birim_fiyat DECIMAL(10,2) DEFAULT 0,
  maliyet DECIMAL(10,2) DEFAULT 0,
  toplam_fiyat DECIMAL(10,2) DEFAULT 0,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  FOREIGN KEY (is_emri_id) REFERENCES is_emirleri(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_nopad_bin
  `,
  `
CREATE TABLE IF NOT EXISTS satis_belgeleri (
  id INT NOT NULL AUTO_INCREMENT,
  motor_id INT NOT NULL,
  dosya_adi VARCHAR(255) NOT NULL,
  mime VARCHAR(100) NOT NULL,
  boyut INT NOT NULL,
  icerik LONGBLOB NOT NULL,
  yukleyen_id INT,
  yukleyen_adi VARCHAR(100),
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  FOREIGN KEY (motor_id) REFERENCES ikinci_el_motorlar(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_nopad_bin
  `,
  `
CREATE TABLE IF NOT EXISTS servis_qr_tokenler (
  id INT NOT NULL AUTO_INCREMENT,
  plaka VARCHAR(20) NOT NULL,
  token VARCHAR(64) NOT NULL,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY servis_qr_tokenler_plaka_key (plaka),
  UNIQUE KEY servis_qr_tokenler_token_key (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_nopad_bin
  `,
  `
CREATE TABLE IF NOT EXISTS vitrin_urunleri (
  id INT NOT NULL AUTO_INCREMENT,
  kategori VARCHAR(30) NOT NULL,
  baslik VARCHAR(255) NOT NULL,
  aciklama TEXT,
  fiyat DECIMAL(12,2) DEFAULT 0,
  video_url TEXT,
  kapak_gorsel_id INT,
  marka VARCHAR(100),
  model VARCHAR(100),
  yil INT,
  segment VARCHAR(30),
  motor_cc INT,
  km INT,
  yayinda BOOLEAN DEFAULT TRUE,
  siralama INT DEFAULT 0,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  ilan_no INT DEFAULT nextval(vitrin_ilan_no_seq),
  video_dosya_id INT,
  stok_motor_id INT,
  one_cikan BOOLEAN DEFAULT FALSE,
  rubik_link TEXT,
  hasar_kaydi TEXT,
  motor_durumu VARCHAR(20) DEFAULT 'ikinci_el',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_nopad_bin
  `,
  `
CREATE TABLE IF NOT EXISTS vitrin_gorseller (
  id INT NOT NULL AUTO_INCREMENT,
  urun_id INT,
  data LONGTEXT NOT NULL,
  sira INT DEFAULT 0,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  FOREIGN KEY (urun_id) REFERENCES vitrin_urunleri(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_nopad_bin
  `,
  `
CREATE TABLE IF NOT EXISTS vitrin_kategori_iletisim (
  kategori VARCHAR(30) NOT NULL,
  personel_adi VARCHAR(100),
  telefon VARCHAR(50),
  aciklama TEXT,
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  gorsel LONGTEXT,
  baslik VARCHAR(255),
  personel_adi_2 VARCHAR(100),
  telefon_2 VARCHAR(50),
  PRIMARY KEY (kategori)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_nopad_bin
  `,
  `
CREATE TABLE IF NOT EXISTS vitrin_segmentler (
  id INT NOT NULL AUTO_INCREMENT,
  ad VARCHAR(50) NOT NULL,
  sira INT DEFAULT 0,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY vitrin_segmentler_ad_key (ad)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_nopad_bin
  `,
  `
CREATE TABLE IF NOT EXISTS vitrin_videolar (
  id INT NOT NULL AUTO_INCREMENT,
  urun_id INT,
  data LONGTEXT NOT NULL,
  mime VARCHAR(60),
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  FOREIGN KEY (urun_id) REFERENCES vitrin_urunleri(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_nopad_bin
  `,
  `
CREATE TABLE IF NOT EXISTS yedek_parca_stok (
  id INT NOT NULL AUTO_INCREMENT,
  stok_kodu VARCHAR(20) NOT NULL,
  stok_adi VARCHAR(255) NOT NULL,
  marka VARCHAR(100),
  giren_miktar INT DEFAULT 0,
  cikan_miktar INT DEFAULT 0,
  mevcut INT DEFAULT 0,
  birimi VARCHAR(20) DEFAULT 'Adet',
  alis_fiyati DECIMAL(10,2) DEFAULT 0,
  satis_fiyati DECIMAL(10,2) DEFAULT 0,
  envanter_degeri DECIMAL(12,2) DEFAULT 0,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY yedek_parca_stok_stok_kodu_key (stok_kodu)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_nopad_bin
  `,
  `
CREATE TABLE IF NOT EXISTS yedek_parcalar (
  id INT NOT NULL AUTO_INCREMENT,
  urun_adi VARCHAR(255) NOT NULL,
  alis_fiyati DECIMAL(10,2) DEFAULT 0,
  satis_fiyati DECIMAL(10,2) DEFAULT 0,
  created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
  musteri_adi VARCHAR(255),
  musteri_telefon VARCHAR(50),
  kalan_odeme DECIMAL(12,2) DEFAULT 0,
  stok_id INT,
  adet INT DEFAULT 1,
  PRIMARY KEY (id),
  FOREIGN KEY (stok_id) REFERENCES yedek_parca_stok(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_nopad_bin
  `,
];

const INDEKSLER = [
  'CREATE INDEX IF NOT EXISTS idx_aksesuar_parcalar_aksesuar ON aksesuar_parcalar (aksesuar_id)',
  'CREATE INDEX IF NOT EXISTS idx_aksesuar_stok_adi ON aksesuar_stok (stok_adi)',
  'CREATE INDEX IF NOT EXISTS idx_aktivite_log_kullanici ON aktivite_log (kullanici_id, created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_motorlar_durum ON ikinci_el_motorlar (durum)',
  'CREATE INDEX IF NOT EXISTS idx_motorlar_yatirimci ON ikinci_el_motorlar (yatirimci_id)',
  'CREATE INDEX IF NOT EXISTS idx_is_emirleri_created ON is_emirleri (created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_is_emirleri_durum ON is_emirleri (durum)',
  'CREATE INDEX IF NOT EXISTS idx_musteriler_telefon ON musteriler (telefon)',
  'CREATE INDEX IF NOT EXISTS idx_parcalar_is_emri ON parcalar (is_emri_id)',
  'CREATE INDEX IF NOT EXISTS idx_satis_belge_motor ON satis_belgeleri (motor_id)',
  'CREATE INDEX IF NOT EXISTS idx_vitrin_gorsel_urun ON vitrin_gorseller (urun_id)',
  'CREATE INDEX IF NOT EXISTS idx_vitrin_kategori_yayinda ON vitrin_urunleri (kategori, yayinda)',
  'CREATE INDEX IF NOT EXISTS idx_vitrin_video_urun ON vitrin_videolar (urun_id)',
];

// Sonradan eklenen kolonlar buraya yazılır (ör. 'ALTER TABLE x ADD COLUMN IF NOT EXISTS y INT').
const MIGRATIONS = [
  // Aksesuar satış satırı stok kaydına ID ile bağlanır (stok yeniden adlandırılsa da iade doğru stoğa gider)
  'ALTER TABLE aksesuar_parcalar ADD COLUMN IF NOT EXISTS stok_id INT NULL',
  'ALTER TABLE aksesuar_parcalar ADD CONSTRAINT aksesuar_parcalar_stok_fk FOREIGN KEY IF NOT EXISTS (stok_id) REFERENCES aksesuar_stok(id) ON DELETE SET NULL',
  // Düz metin şifreler artık saklanmıyor/gösterilmiyor: önceden kalmış olanları temizle (kolon geri dönüş için duruyor)
  'UPDATE kullanicilar SET plain_sifre = NULL WHERE plain_sifre IS NOT NULL',
  // Muhasebeci için "Motor Satış sayfasını salt-okunur görebilir" anahtarı (admin Yetkilendirme'den açar)
  'ALTER TABLE kullanicilar ADD COLUMN IF NOT EXISTS motor_satis_gor BOOLEAN DEFAULT FALSE',
];

export const initializeDatabase = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    for (const sql of SIRA_ONCE) await client.query(sql);
    for (const sql of TABLOLAR) await client.query(sql);
    for (const sql of YARDIMCI) await client.query(sql);
    for (const sql of INDEKSLER) await client.query(sql);
    for (const sql of MIGRATIONS) await client.query(sql);

    // Varsayılan admin kullanıcı oluştur.
    // Şifre ADMIN_INITIAL_PASSWORD ortam değişkeninden okunur; tanımlı değilse
    // admin oluşturulmaz (koda gömülü varsayılan şifre bilinçli olarak yoktur).
    const adminCheck = await client.query("SELECT id FROM kullanicilar WHERE kullanici_adi = 'admin'");
    if (adminCheck.rows.length === 0) {
      const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
      if (initialPassword) {
        const hashedPassword = await bcrypt.hash(initialPassword, 10);
        await client.query(
          `INSERT INTO kullanicilar (kullanici_adi, sifre, ad_soyad, rol, onay_durumu)
           VALUES ('admin', $1, 'Admin', 'admin', 'onaylandi')`,
          [hashedPassword],
        );
        console.log('Varsayılan admin oluşturuldu (kullanıcı adı: admin)');
      } else {
        console.warn(
          'UYARI: admin kullanıcısı yok ve ADMIN_INITIAL_PASSWORD tanımlı değil. ' +
            'İlk admin hesabını oluşturmak için bu değişkeni set edip sunucuyu yeniden başlatın.',
        );
      }
    }

    // Varsayılan e-ticaret platformları
    const platformCheck = await client.query('SELECT id FROM eticaret_platformlar LIMIT 1');
    if (platformCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO eticaret_platformlar (platform_adi, komisyon_orani) VALUES
        ('Trendyol', 23.99),
        ('Hepsiburada', 19.99)
      `);
      console.log('Varsayılan e-ticaret platformları oluşturuldu');
    }

    // Varsayılan vitrin segmentleri
    const segCheck = await client.query('SELECT id FROM vitrin_segmentler LIMIT 1');
    if (segCheck.rows.length === 0) {
      await client.query(`
        INSERT IGNORE INTO vitrin_segmentler (ad, sira) VALUES
        ('Chopper',1),('Scooter',2),('Racing',3),('Naked',4),
        ('Touring',5),('Cross/Enduro',6),('Cub',7),('Maxi Scooter',8)
      `);
      console.log('Varsayılan vitrin segmentleri oluşturuldu');
    }

    // Veri düzeltmeleri (eski sürümlerden kalan; tekrar çalıştırmak güvenlidir)
    //  - eski 'beklemede' motor durumu 'stokta' olur
    //  - motor_durumu boş kalan vitrin ilanları 'ikinci_el' olur
    await client.query("UPDATE ikinci_el_motorlar SET durum = 'stokta' WHERE durum = 'beklemede'");
    await client.query("UPDATE vitrin_urunleri SET motor_durumu = 'ikinci_el' WHERE motor_durumu IS NULL");

    console.log('Tüm tablolar başarıyla oluşturuldu/kontrol edildi');
  } catch (error) {
    console.error('Veritabanı başlatma hatası:', (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
};
