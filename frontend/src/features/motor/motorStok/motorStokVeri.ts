// Motor Stok ekranının saf kuralları (ekran/durum yok, doğrudan test edilebilir): süzme+sıralama, form dönüşümleri, ödeme çözümleme.
import { bugunYerel } from '../../../shared/utils/tarih';
import { sayiDegeri } from '../../../shared/utils/bicim';
import type { Motor } from '../../../shared/tipler';

/** Form alanı: kullanıcı yazarken metin, kayıttan gelirken sayı olabilir. */
export type FormSayisi = string | number;

/** Parçalı ödeme kalemi (ör. { tip: 'Nakit', tutar: '5000' }); motor kaydında JSON metni olarak saklanır. */
export interface OdemeKalemi {
  tip: string;
  tutar: FormSayisi;
}

// Ödeme dağılımı JSON'unu güvenle diziye çevirir
export const parseOdeme = (v: unknown): OdemeKalemi[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v as OdemeKalemi[];
  try {
    const a: unknown = JSON.parse(String(v));
    return Array.isArray(a) ? (a as OdemeKalemi[]) : [];
  } catch {
    return [];
  }
};

/** Motor ekleme/düzenleme formunun alanları. */
export interface MotorStokFormu {
  plaka: string;
  marka: string;
  model: string;
  yil: FormSayisi;
  km: FormSayisi;
  alis_fiyati: FormSayisi;
  noter_alis: FormSayisi;
  masraflar: FormSayisi;
  liste_fiyati: FormSayisi;
  satici_adi: string;
  satici_tc: string;
  durum: string;
  stok_tipi: string;
  aciklama: string;
  tarih: string;
  fatura_kesildi: boolean;
  yatirimci: boolean;
  yatirimci_id: FormSayisi;
  yatirimci_kar_orani: FormSayisi;
  vitrin_baslik: string;
  vitrin_aciklama: string;
  vitrin_segment: string;
  vitrin_cc: FormSayisi;
  vitrin_hasar: string;
}

export const bosForm = (): MotorStokFormu => ({
  plaka: '',
  marka: '',
  model: '',
  yil: '',
  km: '',
  alis_fiyati: '',
  noter_alis: '',
  masraflar: '',
  liste_fiyati: '',
  satici_adi: '',
  satici_tc: '',
  durum: 'stokta',
  stok_tipi: 'sahip',
  aciklama: '',
  tarih: bugunYerel(),
  fatura_kesildi: false,
  yatirimci: false,
  yatirimci_id: '',
  yatirimci_kar_orani: '',
  vitrin_baslik: '',
  vitrin_aciklama: '',
  vitrin_segment: '',
  vitrin_cc: '',
  vitrin_hasar: '',
});

// Kayıtlı motoru form alanlarına çevirir (boş değerler '', tarih yyyy-aa-gg).
export const motordenForm = (motor: Motor): MotorStokFormu => ({
  plaka: motor.plaka || '',
  marka: motor.marka || '',
  model: motor.model || '',
  yil: motor.yil || '',
  km: motor.km || '',
  alis_fiyati: motor.alis_fiyati || '',
  noter_alis: motor.noter_alis || '',
  masraflar: motor.masraflar || '',
  liste_fiyati: motor.liste_fiyati || '',
  satici_adi: motor.satici_adi || '',
  satici_tc: motor.satici_tc || '',
  durum: motor.durum || 'stokta',
  stok_tipi: motor.stok_tipi || 'sahip',
  aciklama: motor.aciklama || '',
  tarih: motor.tarih ? new Date(motor.tarih).toISOString().split('T')[0] : bugunYerel(),
  fatura_kesildi: motor.fatura_kesildi || false,
  yatirimci: !!motor.yatirimci_id,
  yatirimci_id: motor.yatirimci_id || '',
  yatirimci_kar_orani: motor.yatirimci_kar_orani || '',
  vitrin_baslik: motor.vitrin_baslik || '',
  vitrin_aciklama: motor.vitrin_aciklama || '',
  vitrin_segment: motor.vitrin_segment || '',
  vitrin_cc: motor.vitrin_cc || '',
  vitrin_hasar: motor.vitrin_hasar || '',
});

export interface MotorStokSuzgeci {
  isYatirimci: boolean;
  activeFilter: string | null;
  secondaryFilter: string | null;
  search: string;
}

const durumSirasi: Record<string, number> = { stokta: 0, kapora: 1 };

// Listedeki sıra: stokta, kapora, konsinye, depo, devir, perte, satılan
const siraNo = (m: Motor): number => {
  if (m.durum === 'tamamlandi') return 6;
  if (m.durum === 'perte') return 5;
  if (m.durum === 'devir_bekliyor') return 4;
  if (m.durum === 'depo_serviste') return 3;
  if (m.stok_tipi === 'konsinye') return 2;
  return durumSirasi[m.durum ?? ''] ?? 0;
};

// Durum çipi + ikincil çip + arama süzgeci ve durum sırası (stokta, kapora, konsinye, depo, devir, perte, satılan).
export const filtrele = (motorlar: Motor[], { isYatirimci, activeFilter, secondaryFilter, search }: MotorStokSuzgeci): Motor[] =>
  motorlar
    .filter((m) => {
      // Yatırımcı: varsayılanda stoktakileri görür; satılanları yalnızca "Satılan" filtresinde görür (kârıyla birlikte)
      if (isYatirimci && m.durum === 'tamamlandi' && activeFilter !== 'tamamlandi') return false;
      // Apply active filter
      if (activeFilter === 'stokta' && (m.durum !== 'stokta' || m.stok_tipi === 'konsinye')) return false;
      if (activeFilter === 'kapora' && m.durum !== 'kapora') return false;
      if (activeFilter === 'konsinye' && (m.durum !== 'stokta' || m.stok_tipi !== 'konsinye')) return false;
      if (activeFilter === 'depo_serviste' && m.durum !== 'depo_serviste') return false;
      if (activeFilter === 'devir_bekliyor' && m.durum !== 'devir_bekliyor') return false;
      if (activeFilter === 'tamamlandi' && m.durum !== 'tamamlandi') return false;
      if (activeFilter === 'perte' && m.durum !== 'perte') return false;

      // Secondary filters
      if (secondaryFilter === 'fatura_kesildi' && !m.fatura_kesildi) return false;
      if (secondaryFilter === 'fatura_kesilmedi' && m.fatura_kesildi) return false;
      if (secondaryFilter === 'devir_verildi' && m.durum !== 'tamamlandi') return false;
      if (secondaryFilter === 'devir_verilmedi' && m.durum !== 'devir_bekliyor') return false;
      if (secondaryFilter === 'odeme_tamam' && sayiDegeri(m.kalan_odeme) > 0) return false;
      if (secondaryFilter === 'odeme_bekliyor' && !(sayiDegeri(m.kalan_odeme) > 0)) return false;

      return (
        (m.plaka || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.marka || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.model || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.satici_adi || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.alici_adi || '').toLowerCase().includes(search.toLowerCase())
      );
    })
    .sort((a, b) => siraNo(a) - siraNo(b));
