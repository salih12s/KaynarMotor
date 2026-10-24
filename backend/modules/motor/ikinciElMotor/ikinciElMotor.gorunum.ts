/*
 * Motor kayıtlarında "kim hangi alanı görür" politikası (saf fonksiyonlar: veritabanı/HTTP yok).
 *
 * Personel için ALLOWLIST: listede olmayan (ör. ileride eklenecek) bir kolon varsayılan olarak GİZLİDİR.
 * Kâr ve yatırımcı alanları (kar, yatirimci_*) hiçbir yetkiyle personele açılmaz: yalnızca admin (ve kendi payı için
 * yatırımcı). Bu kural ayrıca server.js'teki kariGizle ara katmanıyla da güvence altındadır.
 */
import type { Kullanici } from '../../../core/tipler';

export type MotorSatiri = Record<string, any>;

// Personelin görebileceği motor alanları (allowlist). Gruplar ilgili yetkiyle açılır.
export const MOTOR_TEMEL = [
  'id',
  'plaka',
  'marka',
  'model',
  'yil',
  'km',
  'durum',
  'stok_tipi',
  'tarih',
  'created_at',
  'updated_at',
  'fatura_kesildi',
  'vitrin_baslik',
  'vitrin_aciklama',
  'vitrin_segment',
  'vitrin_cc',
  'vitrin_hasar',
];
export const MOTOR_ALIS = ['alis_fiyati', 'noter_alis', 'masraflar'];
export const MOTOR_SATIS = [
  'satis_fiyati',
  'noter_satis',
  'kalan_odeme',
  'odeme_detaylari',
  'odeme_sekli',
  'satis_tarihi',
  'tamamlama_tarihi',
  'yevmiye_no',
  'aciklama',
];
export const MOTOR_MUSTERI = [
  'alici_adi',
  'alici_tc',
  'alici_telefon',
  'alici_adres',
  'satici_adi',
  'satici_tc',
  'komisyoncu_adi',
  'komisyoncu_telefon',
  'komisyoncu_tutari',
];

/**
 * Muhasebeci: admin Yetkilendirme'den "Motor Satış'ı görebilir" anahtarını açtıysa satış kayıtlarını SALT OKUNUR görür
 * (yazma motorYazmaYetkisi ile kapalı). Anahtar kapalıysa bu uçlara hiç giremez (routes'taki kapı).
 */
export const muhasebeMotorGorur = (user: Pick<Kullanici, 'rol' | 'motor_satis_gor'>): boolean => user.rol === 'muhasebeci' && !!user.motor_satis_gor;

// Muhasebeci masraf göremez: alış ve masraftan kâr çıkarılabilir; kâr yalnızca admin'e özeldir.
const MUHASEBE_ALIS = ['alis_fiyati', 'noter_alis'];

/** Bir motor kaydını kullanıcının yetkisine göre temizler (hassas alanları gizler). */
export const sanitizeMotor = (row: MotorSatiri | null | undefined, user: Kullanici): MotorSatiri | null | undefined => {
  if (!row) return row;
  // Admin her şeyi görür
  if (user.rol === 'admin') return row;
  // Muhasebeci: alım/satım bedelleri, noter tutarları, satış bilgileri ve kişi bilgileri. Kâr ve yatırımcı alanları yok.
  if (user.rol === 'muhasebeci') {
    if (!muhasebeMotorGorur(user)) return {};
    const m: MotorSatiri = {};
    for (const alan of [...MOTOR_TEMEL, ...MUHASEBE_ALIS, ...MOTOR_SATIS, ...MOTOR_MUSTERI]) if (alan in row) m[alan] = row[alan];
    return m;
  }
  // Yatırımcı:
  //  - liste_fiyati_gor AÇIK ise "vitrin" modundadır: tüm satılık motorları SADECE liste fiyatıyla görür
  //  - kapalı ise kendi motorlarını tam detayıyla görür
  if (user.rol === 'yatirimci') {
    // Kendi motoru: mali alanları görür ama alıcı/satıcı/komisyoncu kimliği ve iletişimi (TC, adres, telefon, ad) HİÇBİR
    // durumda yatırımcıya gitmez (KVKK; yatırımcı raporu da aynı alanları taşımaz).
    if (!user.liste_fiyati_gor) {
      return {
        ...row,
        alici_adi: null,
        alici_tc: null,
        alici_telefon: null,
        alici_adres: null,
        satici_adi: null,
        satici_tc: null,
        komisyoncu_adi: null,
        komisyoncu_telefon: null,
      };
    }
    return {
      id: row.id,
      plaka: row.plaka,
      marka: row.marka,
      model: row.model,
      yil: row.yil,
      km: row.km,
      durum: row.durum,
      stok_tipi: row.stok_tipi,
      tarih: row.tarih,
      liste_fiyati: row.liste_fiyati,
      // Hassas alanlar gizli
      alis_fiyati: null,
      noter_alis: null,
      satis_fiyati: null,
      noter_satis: null,
      masraflar: null,
      kar: null,
      yatirimci_id: null,
      yatirimci_kar: null,
      yatirimci_kar_orani: null,
      satici_adi: null,
      satici_tc: null,
      alici_adi: null,
      alici_tc: null,
      alici_telefon: null,
      alici_adres: null,
      komisyoncu_adi: null,
      komisyoncu_telefon: null,
      komisyoncu_tutari: null,
    };
  }

  // Personel: ALLOWLIST.
  const ms = !!user.motor_satis_yetkisi; // Motor Satış yetkisi alış/satış fiyatı, müşteri ve satış geçmişini kapsar
  const izinli = [
    ...MOTOR_TEMEL,
    ...(user.alis_fiyati_gor || ms ? MOTOR_ALIS : []),
    ...(user.satis_fiyati_gor || ms ? MOTOR_SATIS : []),
    ...(user.musteri_gor || ms ? MOTOR_MUSTERI : []),
    ...(user.liste_fiyati_gor ? ['liste_fiyati'] : []),
  ];
  const m: MotorSatiri = {};
  for (const alan of izinli) if (alan in row) m[alan] = row[alan];
  return m;
};

/**
 * Özet istatistikleri kullanıcının yetkisine göre temizler. sanitizeMotor tek kayıtları filtreler; toplamlar da aynı
 * kuralı izlemelidir, aksi hâlde kâr/alış bilgisi bu uç üzerinden sızar.
 */
export const sanitizeOzet = (row: MotorSatiri, user: Kullanici): MotorSatiri => {
  if (user.rol === 'admin') return row;
  const o = { ...row };
  o.toplam_kar = null;
  const muhasebe = muhasebeMotorGorur(user);
  if (!(user.alis_fiyati_gor || user.motor_satis_yetkisi || muhasebe)) o.toplam_alis = null;
  if (!(user.satis_fiyati_gor || user.motor_satis_yetkisi || muhasebe)) {
    o.toplam_satis = null;
    o.toplam_satis_tutari = null;
  }
  return o;
};

/** Listeyi/tek kaydı kullanıcıya göre hangi kapsamda görebilir (SQL filtresini service seçer). */
export type MotorKapsami =
  | { tur: 'yatirimci-vitrin' } // satılan/perte hariç tüm satılık motorlar (yalnız liste fiyatı görünür)
  | { tur: 'yatirimci-kendi'; yatirimciId: number } // yalnız kendi motorları
  | { tur: 'satilmislar-gizli' } // satılmış motorlar görünmez
  | { tur: 'hepsi' };

export const motorKapsami = (user: Kullanici): MotorKapsami => {
  if (user.rol === 'yatirimci') {
    return user.liste_fiyati_gor ? { tur: 'yatirimci-vitrin' } : { tur: 'yatirimci-kendi', yatirimciId: user.id };
  }
  // Satış geçmişi/motor satış yetkisi olmayan personel satılan motorları görmez
  if (user.rol !== 'admin' && !user.satis_gecmisi_gor && !user.motor_satis_yetkisi && !muhasebeMotorGorur(user)) {
    return { tur: 'satilmislar-gizli' };
  }
  return { tur: 'hepsi' };
};
