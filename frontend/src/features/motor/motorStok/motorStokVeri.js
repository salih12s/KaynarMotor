// Motor Stok ekranının saf kuralları (ekran/durum yok, doğrudan test edilebilir): süzme+sıralama, form dönüşümleri, ödeme çözümleme.
import { bugunYerel } from '../../../shared/utils/tarih';

// Ödeme dağılımı JSON'unu güvenle diziye çevirir
export const parseOdeme = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try {
    const a = JSON.parse(v);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
};

export const bosForm = () => ({
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
export const motordenForm = (motor) => ({
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

// Durum çipi + ikincil çip + arama süzgeci ve durum sırası (stokta, kapora, konsinye, depo, devir, perte, satılan).
export const filtrele = (motorlar, { isYatirimci, activeFilter, secondaryFilter, search }) =>
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
      if (secondaryFilter === 'odeme_tamam' && parseFloat(m.kalan_odeme || 0) > 0) return false;
      if (secondaryFilter === 'odeme_bekliyor' && !(parseFloat(m.kalan_odeme || 0) > 0)) return false;

      return (
        (m.plaka || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.marka || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.model || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.satici_adi || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.alici_adi || '').toLowerCase().includes(search.toLowerCase())
      );
    })
    .sort((a, b) => {
      const order = { stokta: 0, kapora: 1 };
      const aOrder =
        a.durum === 'tamamlandi'
          ? 6
          : a.durum === 'perte'
            ? 5
            : a.durum === 'devir_bekliyor'
              ? 4
              : a.durum === 'depo_serviste'
                ? 3
                : a.stok_tipi === 'konsinye'
                  ? 2
                  : (order[a.durum] ?? 0);
      const bOrder =
        b.durum === 'tamamlandi'
          ? 6
          : b.durum === 'perte'
            ? 5
            : b.durum === 'devir_bekliyor'
              ? 4
              : b.durum === 'depo_serviste'
                ? 3
                : b.stok_tipi === 'konsinye'
                  ? 2
                  : (order[b.durum] ?? 0);
      return aOrder - bOrder;
    });
