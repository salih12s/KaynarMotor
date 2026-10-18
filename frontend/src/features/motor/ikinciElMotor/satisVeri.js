// İkinci El Motor (satış) ekranının saf kuralları (ekran/durum yok, doğrudan test edilebilir): form dönüşümleri, süzme+sıralama, canlı kâr.
import { bugunYerel } from '../../../shared/utils/tarih';

// Formun ilk (kapalıyken tutulan) hâli
export const ilkForm = () => ({
  plaka: '', marka: '', model: '', km: '', yil: '',
  alis_fiyati: '', satis_fiyati: '', noter_alis: '', noter_satis: '', masraflar: '',
  alici_adi: '', alici_tc: '', alici_telefon: '', alici_adres: '', aciklama: '',
  satici_adi: '', satici_tc: '',
  komisyoncu_adi: '', komisyoncu_telefon: '', komisyoncu_tutari: '',
  durum: 'stokta', odeme_sekli: 'nakit', stok_tipi: 'sahip',
  kalan_odeme: '', odeme_tamamlandi: true, fatura_kesildi: false, yevmiye_no: '',
  satis_tarihi: bugunYerel(),
  yatirimci_id: '', yatirimci_kar: '', yatirimci_adi: ''
});

// Yeni satış formu
export const bosForm = () => ({
  plaka: '', marka: '', model: '', km: '', yil: '',
  alis_fiyati: '', satis_fiyati: '', noter_alis: '', noter_satis: '', masraflar: '',
  alici_adi: '', alici_tc: '', alici_telefon: '', alici_adres: '', aciklama: '',
  satici_adi: '', satici_tc: '',
  komisyoncu_adi: '', komisyoncu_telefon: '', komisyoncu_tutari: '',
  durum: 'tamamlandi', odeme_sekli: 'nakit',
  kalan_odeme: '', odeme_tamamlandi: true, fatura_kesildi: false, yevmiye_no: '',
  tarih: '', satis_tarihi: bugunYerel(),
  yatirimci_id: '', yatirimci_kar: '', yatirimci_adi: ''
});

// Kayıtlı satışı form alanlarına çevirir (boşlar '', tarihler yyyy-aa-gg, kalan ödeme yoksa 'Ödeme Tamamlandı' işaretli)
export const motordenForm = (motor) => ({
  plaka: motor.plaka || '', marka: motor.marka || '', model: motor.model || '',
  km: motor.km || '', yil: motor.yil || '',
  alis_fiyati: motor.alis_fiyati || '', satis_fiyati: motor.satis_fiyati || '',
  noter_alis: motor.noter_alis || '', noter_satis: motor.noter_satis || '',
  masraflar: motor.masraflar || '',
  alici_adi: motor.alici_adi || '', alici_tc: motor.alici_tc || '',
  alici_telefon: motor.alici_telefon || '', alici_adres: motor.alici_adres || '',
  aciklama: motor.aciklama || '',
  satici_adi: motor.satici_adi || '', satici_tc: motor.satici_tc || '',
  komisyoncu_adi: motor.komisyoncu_adi || '', komisyoncu_telefon: motor.komisyoncu_telefon || '', komisyoncu_tutari: motor.komisyoncu_tutari || '',
  durum: motor.durum || 'tamamlandi', odeme_sekli: motor.odeme_sekli || 'nakit',
  kalan_odeme: motor.kalan_odeme || '', odeme_tamamlandi: !parseFloat(motor.kalan_odeme || 0),
  fatura_kesildi: motor.fatura_kesildi || false,
  yevmiye_no: motor.yevmiye_no || '',
  tarih: motor.tarih ? new Date(motor.tarih).toISOString().split('T')[0] : '',
  satis_tarihi: motor.satis_tarihi ? new Date(motor.satis_tarihi).toISOString().split('T')[0] : '',
  yatirimci_id: motor.yatirimci_id || '', yatirimci_kar: motor.yatirimci_kar || '', yatirimci_adi: motor.yatirimci_adi || ''
});

// Kâr = Satış - (Alış + Masraflar + Komisyoncu Tutarı)
export const hesaplaCanliKar = (f) => (Number(f.satis_fiyati) || 0) - (Number(f.alis_fiyati) || 0) - (Number(f.masraflar) || 0) - (Number(f.komisyoncu_tutari) || 0);

// Arama ve satış (yoksa alım) tarihi aralığı; sonuç satış tarihine göre yeniden eskiye sıralanır.
export const filtrele = (motorlar, { search, tarihBaslangic, tarihBitis }) => motorlar.filter(m => {
  // Tarih filtresi
  if (tarihBaslangic) {
    const mTarih = (m.satis_tarihi || m.tarih) ? (m.satis_tarihi || m.tarih).split('T')[0] : '';
    if (mTarih < tarihBaslangic) return false;
  }
  if (tarihBitis) {
    const mTarih = (m.satis_tarihi || m.tarih) ? (m.satis_tarihi || m.tarih).split('T')[0] : '';
    if (mTarih > tarihBitis) return false;
  }
  return (m.plaka || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.marka || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.model || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.alici_adi || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.satici_adi || '').toLowerCase().includes(search.toLowerCase());
}).sort((a, b) => {
  const da = (a.satis_tarihi || a.tarih) ? new Date(a.satis_tarihi || a.tarih).getTime() : 0;
  const db = (b.satis_tarihi || b.tarih) ? new Date(b.satis_tarihi || b.tarih).getTime() : 0;
  return db - da;
});
