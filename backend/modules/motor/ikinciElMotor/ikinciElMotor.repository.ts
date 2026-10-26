/* İkinci el motor tablosu ve bağlı vitrin ilanı için SQL. İş kuralı yok: yalnızca sorgular. */
import type { Veritabani } from '../../../core/tipler';
import type { MotorKapsami, MotorSatiri } from './ikinciElMotor.gorunum';
import type { MotorFiltresi } from './ikinciElMotor.schemas';

/** INSERT için hazır (normalize edilmiş) değerler. */
export interface YeniMotor {
  tarih: unknown;
  plaka: unknown;
  marka: unknown;
  model: unknown;
  km: number;
  alis: number;
  satis: number;
  noterAlis: number;
  noterSatis: number;
  masraf: number;
  kar: number;
  alici_adi: unknown;
  alici_tc: unknown;
  alici_telefon: unknown;
  alici_adres: unknown;
  odeme_sekli: unknown;
  aciklama: unknown;
  durum: unknown;
  tamamlamaTarihi: Date | null;
  stok_tipi: unknown;
  yil: number | null;
  satici_adi: unknown;
  satici_tc: unknown;
  kalan_odeme: number;
  fatura_kesildi: unknown;
  yevmiye_no: unknown;
  satis_tarihi: unknown;
  komisyoncu_adi: unknown;
  komisyoncu_telefon: unknown;
  komisyonTutar: number;
  yatirimciId: number | null;
  yatirimciOran: number;
  yatirimciKar: number;
  listeFiyati: number;
  odemeDetay: unknown;
  vitrin_baslik: unknown;
  vitrin_aciklama: unknown;
  vitrin_segment: unknown;
  vitrin_cc: number | null;
  vitrin_hasar: unknown;
  motorDurumu: 'sifir' | 'ikinci_el';
  sifirMotorId: number | null;
}

/** UPDATE için hazır değerler (kısmi güncelleme service'te çözülmüştür). */
export interface MotorGuncelleme {
  tarih: unknown;
  plaka: unknown;
  marka: unknown;
  model: unknown;
  km: number;
  alis: number;
  satis: number;
  noterAlis: number;
  noterSatis: number;
  masraf: number;
  kar: number;
  aliciAdi: unknown;
  aliciTc: unknown;
  aliciTel: unknown;
  aliciAdres: unknown;
  odeme_sekli: unknown;
  aciklama: unknown;
  durum: unknown;
  tamamlamaTarihi: Date | null;
  stok_tipi: unknown;
  yil: number | null;
  saticiAdi: unknown;
  saticiTc: unknown;
  kalan_odeme: number;
  fatura_kesildi: unknown;
  yevmiye_no: unknown;
  eski_kayit: unknown;
  satis_tarihi: unknown;
  komAdi: unknown;
  komTel: unknown;
  komisyonTutar: number;
  yatirimciId: number | null;
  yatirimciOran: number;
  yatirimciKar: number;
  listeFiyati: number;
  odemeDetay: unknown;
  vitrin_baslik: unknown;
  vitrin_aciklama: unknown;
  vitrin_segment: unknown;
  vitrin_cc: number | null;
  vitrin_hasar: unknown;
}

export const ozet = async (db: Veritabani): Promise<MotorSatiri> =>
  (
    await db.query(`
      SELECT
        COUNT(CASE WHEN durum = 'tamamlandi' THEN 1 END) as toplam,
        COALESCE(SUM(CASE WHEN durum = 'tamamlandi' THEN satis_fiyati END), 0) as toplam_satis,
        COALESCE(SUM(CASE WHEN durum = 'tamamlandi' THEN alis_fiyati END), 0) as toplam_alis,
        COALESCE(SUM(CASE WHEN durum = 'tamamlandi' THEN kar END), 0) as toplam_kar,
        COALESCE(SUM(CASE WHEN durum = 'tamamlandi' THEN satis_fiyati END), 0) as toplam_satis_tutari,
        COUNT(CASE WHEN durum = 'beklemede' THEN 1 END) as bekleyen,
        COUNT(CASE WHEN durum = 'tamamlandi' THEN 1 END) as tamamlanan,
        COUNT(CASE WHEN durum = 'tamamlandi' AND motor_durumu = 'sifir' THEN 1 END) as sifir_adet,
        COALESCE(SUM(CASE WHEN durum = 'tamamlandi' AND motor_durumu = 'sifir' THEN satis_fiyati END), 0) as sifir_satis,
        COALESCE(SUM(CASE WHEN durum = 'tamamlandi' AND motor_durumu = 'sifir' THEN kar END), 0) as sifir_kar
      FROM ikinci_el_motorlar
    `)
  ).rows[0];

/** Filtre (tarih aralığı, durum) + kullanıcının kapsamı. Sıra: son tamamlanan/oluşturulan önce. */
export const listele = async (db: Veritabani, { baslangic, bitis, durum }: MotorFiltresi, kapsam: MotorKapsami): Promise<MotorSatiri[]> => {
  let sorgu = 'SELECT * FROM ikinci_el_motorlar WHERE 1=1';
  const params: unknown[] = [];
  if (baslangic) {
    params.push(baslangic);
    sorgu += ` AND tarih >= $${params.length}`;
  }
  if (bitis) {
    params.push(bitis);
    sorgu += ` AND tarih <= $${params.length}`;
  }
  if (durum) {
    params.push(durum);
    sorgu += ` AND durum = $${params.length}`;
  }

  if (kapsam.tur === 'yatirimci-vitrin') {
    // Vitrin modu: satılan/perte hariç tüm satılık motorlar (sadece liste fiyatı görünür)
    sorgu += ` AND durum NOT IN ('tamamlandi', 'perte')`;
  } else if (kapsam.tur === 'yatirimci-kendi') {
    params.push(kapsam.yatirimciId);
    sorgu += ` AND yatirimci_id = $${params.length}`;
  } else if (kapsam.tur === 'satilmislar-gizli') {
    sorgu += ` AND durum <> 'tamamlandi'`;
  }

  sorgu += ' ORDER BY COALESCE(tamamlama_tarihi, created_at) DESC';
  return (await db.query(sorgu, params)).rows;
};

export const idyeGoreBul = async (db: Veritabani, id: number): Promise<MotorSatiri | null> =>
  (await db.query('SELECT * FROM ikinci_el_motorlar WHERE id = $1', [id])).rows[0] ?? null;

/** FOR UPDATE: eşzamanlı güncellemeler sıraya girer. */
export const kilitleyerekOku = async (db: Veritabani, id: number): Promise<MotorSatiri | null> =>
  (await db.query('SELECT * FROM ikinci_el_motorlar WHERE id = $1 FOR UPDATE', [id])).rows[0] ?? null;

export const ekle = async (db: Veritabani, m: YeniMotor): Promise<MotorSatiri> =>
  (
    await db.query(
      `INSERT INTO ikinci_el_motorlar (tarih, plaka, marka, model, km, alis_fiyati, satis_fiyati, noter_alis, noter_satis, masraflar, kar,
      alici_adi, alici_tc, alici_telefon, alici_adres, odeme_sekli, aciklama, durum, tamamlama_tarihi, stok_tipi,
      yil, satici_adi, satici_tc, kalan_odeme, fatura_kesildi, yevmiye_no, satis_tarihi,
      komisyoncu_adi, komisyoncu_telefon, komisyoncu_tutari,
      yatirimci_id, yatirimci_kar_orani, yatirimci_kar, liste_fiyati, odeme_detaylari,
      vitrin_baslik, vitrin_aciklama, vitrin_segment, vitrin_cc, vitrin_hasar, motor_durumu, sifir_motor_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42) RETURNING *`,
      [
        m.tarih,
        m.plaka,
        m.marka,
        m.model,
        m.km,
        m.alis,
        m.satis,
        m.noterAlis,
        m.noterSatis,
        m.masraf,
        m.kar,
        m.alici_adi,
        m.alici_tc,
        m.alici_telefon,
        m.alici_adres,
        m.odeme_sekli,
        m.aciklama,
        m.durum,
        m.tamamlamaTarihi,
        m.stok_tipi,
        m.yil,
        m.satici_adi,
        m.satici_tc,
        m.kalan_odeme,
        m.fatura_kesildi,
        m.yevmiye_no,
        m.satis_tarihi,
        m.komisyoncu_adi,
        m.komisyoncu_telefon,
        m.komisyonTutar,
        m.yatirimciId,
        m.yatirimciOran,
        m.yatirimciKar,
        m.listeFiyati,
        m.odemeDetay,
        m.vitrin_baslik,
        m.vitrin_aciklama,
        m.vitrin_segment,
        m.vitrin_cc,
        m.vitrin_hasar,
        m.motorDurumu,
        m.sifirMotorId,
      ],
    )
  ).rows[0];

/** Satışı yapılacak sıfır model (işlem bitene kadar silinemesin diye paylaşımlı kilitle okunur). */
export const sifirModelBul = async (db: Veritabani, id: number): Promise<MotorSatiri | null> =>
  (await db.query('SELECT * FROM sifir_motorlar WHERE id = $1 LOCK IN SHARE MODE', [id])).rows[0] ?? null;

export const guncelle = async (db: Veritabani, id: number, m: MotorGuncelleme): Promise<MotorSatiri> =>
  (
    await db.query(
      `UPDATE ikinci_el_motorlar SET
      tarih=$1, plaka=$2, marka=$3, model=$4, km=$5,
      alis_fiyati=$6, satis_fiyati=$7, noter_alis=$8, noter_satis=$9, masraflar=$10, kar=$11,
      alici_adi=$12, alici_tc=$13, alici_telefon=$14, alici_adres=$15,
      odeme_sekli=$16, aciklama=$17, durum=$18,
      tamamlama_tarihi=COALESCE($19, tamamlama_tarihi),
      stok_tipi=$20, yil=$21, satici_adi=$22, satici_tc=$23,
      kalan_odeme=$24, fatura_kesildi=$25, yevmiye_no=$26,
      eski_kayit=COALESCE($28, eski_kayit),
      satis_tarihi=COALESCE($29, satis_tarihi),
      komisyoncu_adi=$30, komisyoncu_telefon=$31, komisyoncu_tutari=$32,
      yatirimci_id=$33, yatirimci_kar_orani=$34, yatirimci_kar=$35, liste_fiyati=$36,
      odeme_detaylari=$37,
      vitrin_baslik=$38, vitrin_aciklama=$39, vitrin_segment=$40, vitrin_cc=$41, vitrin_hasar=$42,
      updated_at=CURRENT_TIMESTAMP WHERE id=$27 RETURNING *`,
      [
        m.tarih,
        m.plaka,
        m.marka,
        m.model,
        m.km,
        m.alis,
        m.satis,
        m.noterAlis,
        m.noterSatis,
        m.masraf,
        m.kar,
        m.aliciAdi,
        m.aliciTc,
        m.aliciTel,
        m.aliciAdres,
        m.odeme_sekli,
        m.aciklama,
        m.durum,
        m.tamamlamaTarihi,
        m.stok_tipi,
        m.yil,
        m.saticiAdi,
        m.saticiTc,
        m.kalan_odeme,
        m.fatura_kesildi,
        m.yevmiye_no,
        id,
        m.eski_kayit,
        m.satis_tarihi,
        m.komAdi,
        m.komTel,
        m.komisyonTutar,
        m.yatirimciId,
        m.yatirimciOran,
        m.yatirimciKar,
        m.listeFiyati,
        m.odemeDetay,
        m.vitrin_baslik,
        m.vitrin_aciklama,
        m.vitrin_segment,
        m.vitrin_cc,
        m.vitrin_hasar,
      ],
    )
  ).rows[0];

/** Motor yeni satıldıysa bağlı vitrin/site ilanını yayından kaldırır. */
export const vitrinIlaniniYayindanKaldir = async (db: Veritabani, motorId: number) => {
  await db.query('UPDATE vitrin_urunleri SET yayinda = FALSE, updated_at = CURRENT_TIMESTAMP WHERE stok_motor_id = $1', [motorId]);
};

/** İlan fiyatı = site fiyatı: motorun liste fiyatı değişince bağlı ilanın fiyatı da güncellenir. */
export const vitrinFiyatiniGuncelle = async (db: Veritabani, motorId: number, fiyat: number) => {
  await db.query('UPDATE vitrin_urunleri SET fiyat = $1, updated_at = CURRENT_TIMESTAMP WHERE stok_motor_id = $2', [fiyat, motorId]);
};

/** Silinen motorun ilanı yetim kalmasın: yayından kaldırılır ve bağlantı koparılır (stok_motor_id'nin FK'si yok). */
export const vitrinBaglantisiniKopar = async (db: Veritabani, motorId: number) => {
  await db.query('UPDATE vitrin_urunleri SET stok_motor_id = NULL, yayinda = FALSE, updated_at = CURRENT_TIMESTAMP WHERE stok_motor_id = $1', [motorId]);
};

export const sil = async (db: Veritabani, id: number) => {
  await db.query('DELETE FROM ikinci_el_motorlar WHERE id = $1', [id]);
};
