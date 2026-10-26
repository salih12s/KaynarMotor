/*
 * İkinci el motor tipleri. Kaynak: `ikinci_el_motorlar` ve `satis_belgeleri` tabloları.
 * Sunucu, kullanıcının yetkisine göre alanları SİLER (backend ikinciElMotor.gorunum.ts: personel/muhasebeci/yatırımcı
 * için allowlist): bu yüzden mali ve kişi alanları isteğe bağlıdır; ekran `undefined` ile karşılaşabilir.
 */
import type { Sayi } from '../utils/bicim';

export interface Motor {
  id: number;
  tarih?: string | null;
  plaka?: string | null;
  marka?: string | null;
  model?: string | null;
  yil?: number | null;
  km?: number | null;
  durum?: string | null;
  /** 'sahip' (işletmenin) | 'yatirimci' | 'komisyon' */
  stok_tipi?: string | null;
  created_at?: string;
  updated_at?: string;
  fatura_kesildi?: boolean | null;
  eski_kayit?: boolean | null;
  // Alış tarafı
  alis_fiyati?: Sayi;
  noter_alis?: Sayi;
  masraflar?: Sayi;
  // Satış tarafı
  satis_fiyati?: Sayi;
  noter_satis?: Sayi;
  kalan_odeme?: Sayi;
  /** JSON metni: ödeme dağılımı. */
  odeme_detaylari?: string | null;
  odeme_sekli?: string | null;
  satis_tarihi?: string | null;
  tamamlama_tarihi?: string | null;
  yevmiye_no?: string | null;
  aciklama?: string | null;
  // Kişiler
  alici_adi?: string | null;
  alici_tc?: string | null;
  alici_telefon?: string | null;
  alici_adres?: string | null;
  satici_adi?: string | null;
  satici_tc?: string | null;
  komisyoncu_adi?: string | null;
  komisyoncu_telefon?: string | null;
  komisyoncu_tutari?: Sayi;
  // Kâr ve yatırımcı (yalnızca admin / ilgili yatırımcı)
  kar?: Sayi;
  yatirimci_id?: number | null;
  yatirimci_kar_orani?: Sayi;
  yatirimci_kar?: Sayi;
  /** Sunucu kaydında bu alan yok; formlar boş metinle başlatır (yatırımcı adı arayüzde listeden bulunur). */
  yatirimci_adi?: string | null;
  liste_fiyati?: Sayi;
  // Vitrin alanları (stok kaydıyla birlikte tutulur)
  vitrin_baslik?: string | null;
  vitrin_aciklama?: string | null;
  vitrin_segment?: string | null;
  vitrin_cc?: number | null;
  vitrin_fiyat?: Sayi;
  vitrin_hasar?: string | null;
  /** 'sifir': sıfır stoktaki bir modelin satışı (stoktan düşmez, raporda kârı ayrı); yoksa/'ikinci_el': ikinci el. */
  motor_durumu?: string | null;
  /** Sıfır satışın bağlı olduğu model (model silinirse null olur, satış yine "sıfır" kalır). */
  sifir_motor_id?: number | null;
}

/**
 * Sıfır motor stoğu: tek tek araç değil MODEL kaydı (adet tutulmaz). Kaynak: `sifir_motorlar`.
 * Alış fiyatı yalnızca yetkiliye gelir (backend sifirMotor.gorunum.ts).
 */
export interface SifirMotor {
  id: number;
  marka: string;
  model: string | null;
  yil: number | null;
  motor_cc: number | null;
  segment: string | null;
  alis_fiyati?: Sayi;
  liste_fiyati: Sayi;
  aciklama: string | null;
  kapak_gorsel_id: number | null;
  gorsel_sayisi: number;
  /** Bu modelden yapılmış (tamamlanmış) satış sayısı; bilgi içindir, stok azalmaz. */
  satilan_adet: number;
  /** Yalnızca tek kayıt (detay) yanıtında: görsel id'leri, ilki kapak. */
  gorsel_idler?: number[];
  created_at?: string;
  updated_at?: string;
}

/** `/ikinci-el-motor/stats/ozet` yanıtı: satış sayaçları (BIGINT/DECIMAL toplamlar metin gelir). */
export type MotorIstatistik = Record<string, Sayi>;

/** Belge arşivindeki bir dosya satırı. */
export type ArsivBelgesi = Pick<SatisBelgesi, 'id' | 'dosya_adi' | 'mime' | 'boyut' | 'created_at'>;

/** `/satis-belgeleri/arsiv`: belgesi olan motor ve belgeleri (fiyat/kişi bilgisi yok). */
export interface BelgeArsivGrubu {
  motor_id: number;
  plaka: string | null;
  marka: string | null;
  model: string | null;
  durum: string;
  alis_tarihi: string | null;
  satis_tarihi: string | null;
  belgeler: ArsivBelgesi[];
}

/** `satis_belgeleri` listesi (içerik dahil değil). */
export interface SatisBelgesi {
  id: number;
  motor_id: number;
  dosya_adi: string;
  mime: string;
  boyut: number;
  yukleyen_id: number | null;
  yukleyen_adi: string | null;
  created_at: string;
  /** Belge arşivi listesinde motorun plakası ve bilgisi de gelir. */
  plaka?: string | null;
  marka?: string | null;
  model?: string | null;
}
