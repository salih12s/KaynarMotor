// İkinci El Motor (satış) ekranının saf kuralları (ekran/durum yok, doğrudan test edilebilir): form dönüşümleri, süzme+sıralama, canlı kâr.
import { bugunYerel } from '../../../shared/utils/tarih';
import type { Motor } from '../../../shared/tipler';
import { metinIcerir } from '../../../shared/utils/metin';

/** Form alanı: kullanıcı yazarken metin, kayıttan gelirken sayı olabilir. */
export type FormSayisi = string | number;

/** Satış formunun alanları (ekrandaki girdilerle birebir). */
export interface MotorSatisFormu {
  plaka: string;
  marka: string;
  model: string;
  km: FormSayisi;
  yil: FormSayisi;
  alis_fiyati: FormSayisi;
  satis_fiyati: FormSayisi;
  noter_alis: FormSayisi;
  noter_satis: FormSayisi;
  masraflar: FormSayisi;
  alici_adi: string;
  alici_tc: string;
  alici_telefon: string;
  alici_adres: string;
  aciklama: string;
  satici_adi: string;
  satici_tc: string;
  komisyoncu_adi: string;
  komisyoncu_telefon: string;
  komisyoncu_tutari: FormSayisi;
  durum: string;
  odeme_sekli: string;
  stok_tipi?: string;
  kalan_odeme: FormSayisi;
  odeme_tamamlandi: boolean;
  fatura_kesildi: boolean;
  yevmiye_no: string;
  tarih?: string;
  satis_tarihi: string;
  yatirimci_id: FormSayisi;
  yatirimci_kar: FormSayisi;
  yatirimci_adi: string;
}

// Formun ilk (kapalıyken tutulan) hâli
export const ilkForm = (): MotorSatisFormu => ({
  plaka: '',
  marka: '',
  model: '',
  km: '',
  yil: '',
  alis_fiyati: '',
  satis_fiyati: '',
  noter_alis: '',
  noter_satis: '',
  masraflar: '',
  alici_adi: '',
  alici_tc: '',
  alici_telefon: '',
  alici_adres: '',
  aciklama: '',
  satici_adi: '',
  satici_tc: '',
  komisyoncu_adi: '',
  komisyoncu_telefon: '',
  komisyoncu_tutari: '',
  durum: 'stokta',
  odeme_sekli: 'nakit',
  stok_tipi: 'sahip',
  kalan_odeme: '',
  odeme_tamamlandi: true,
  fatura_kesildi: false,
  yevmiye_no: '',
  satis_tarihi: bugunYerel(),
  yatirimci_id: '',
  yatirimci_kar: '',
  yatirimci_adi: '',
});

// Yeni satış formu
export const bosForm = (): MotorSatisFormu => ({
  plaka: '',
  marka: '',
  model: '',
  km: '',
  yil: '',
  alis_fiyati: '',
  satis_fiyati: '',
  noter_alis: '',
  noter_satis: '',
  masraflar: '',
  alici_adi: '',
  alici_tc: '',
  alici_telefon: '',
  alici_adres: '',
  aciklama: '',
  satici_adi: '',
  satici_tc: '',
  komisyoncu_adi: '',
  komisyoncu_telefon: '',
  komisyoncu_tutari: '',
  durum: 'tamamlandi',
  odeme_sekli: 'nakit',
  kalan_odeme: '',
  odeme_tamamlandi: true,
  fatura_kesildi: false,
  yevmiye_no: '',
  tarih: '',
  satis_tarihi: bugunYerel(),
  yatirimci_id: '',
  yatirimci_kar: '',
  yatirimci_adi: '',
});

// Kayıtlı satışı form alanlarına çevirir (boşlar '', tarihler yyyy-aa-gg, kalan ödeme yoksa 'Ödeme Tamamlandı' işaretli)
export const motordenForm = (motor: Motor): MotorSatisFormu => ({
  plaka: motor.plaka || '',
  marka: motor.marka || '',
  model: motor.model || '',
  km: motor.km || '',
  yil: motor.yil || '',
  alis_fiyati: motor.alis_fiyati || '',
  satis_fiyati: motor.satis_fiyati || '',
  noter_alis: motor.noter_alis || '',
  noter_satis: motor.noter_satis || '',
  masraflar: motor.masraflar || '',
  alici_adi: motor.alici_adi || '',
  alici_tc: motor.alici_tc || '',
  alici_telefon: motor.alici_telefon || '',
  alici_adres: motor.alici_adres || '',
  aciklama: motor.aciklama || '',
  satici_adi: motor.satici_adi || '',
  satici_tc: motor.satici_tc || '',
  komisyoncu_adi: motor.komisyoncu_adi || '',
  komisyoncu_telefon: motor.komisyoncu_telefon || '',
  komisyoncu_tutari: motor.komisyoncu_tutari || '',
  durum: motor.durum || 'tamamlandi',
  odeme_sekli: motor.odeme_sekli || 'nakit',
  kalan_odeme: motor.kalan_odeme || '',
  odeme_tamamlandi: !parseFloat(String(motor.kalan_odeme || 0)),
  fatura_kesildi: motor.fatura_kesildi || false,
  yevmiye_no: motor.yevmiye_no || '',
  tarih: motor.tarih ? new Date(motor.tarih).toISOString().split('T')[0] : '',
  satis_tarihi: motor.satis_tarihi ? new Date(motor.satis_tarihi).toISOString().split('T')[0] : '',
  yatirimci_id: motor.yatirimci_id || '',
  yatirimci_kar: motor.yatirimci_kar || '',
  yatirimci_adi: motor.yatirimci_adi || '',
});

// Kâr = Satış - (Alış + Masraflar + Komisyoncu Tutarı)
export const hesaplaCanliKar = (f: Partial<Pick<MotorSatisFormu, 'satis_fiyati' | 'alis_fiyati' | 'masraflar' | 'komisyoncu_tutari'>>): number =>
  (Number(f.satis_fiyati) || 0) - (Number(f.alis_fiyati) || 0) - (Number(f.masraflar) || 0) - (Number(f.komisyoncu_tutari) || 0);

export interface MotorSuzgeci {
  search: string;
  tarihBaslangic?: string;
  tarihBitis?: string;
}

// Satış (yoksa alım) tarihi
const islemTarihi = (m: Motor): string | null | undefined => m.satis_tarihi || m.tarih;

// Arama ve satış (yoksa alım) tarihi aralığı; sonuç satış tarihine göre yeniden eskiye sıralanır.
export const filtrele = (motorlar: Motor[], { search, tarihBaslangic, tarihBitis }: MotorSuzgeci): Motor[] =>
  motorlar
    .filter((m) => {
      // Tarih filtresi
      const tarih = islemTarihi(m);
      const mTarih = tarih ? tarih.split('T')[0] : '';
      if (tarihBaslangic && mTarih < tarihBaslangic) return false;
      if (tarihBitis && mTarih > tarihBitis) return false;
      return (
        metinIcerir(m.plaka, search) ||
        metinIcerir(m.marka, search) ||
        metinIcerir(m.model, search) ||
        metinIcerir(m.alici_adi, search) ||
        metinIcerir(m.satici_adi, search)
      );
    })
    .sort((a, b) => {
      const ta = islemTarihi(a);
      const tb = islemTarihi(b);
      const da = ta ? new Date(ta).getTime() : 0;
      const db = tb ? new Date(tb).getTime() : 0;
      return db - da;
    });
