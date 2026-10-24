// İş emirleri liste ekranının saf kuralları (ekran/durum yok, doğrudan test edilebilir):
// süzme, istatistik, durum etiketleri ve form için başlangıç/dönüşüm değerleri.
import { tarihYaz } from '../../../shared/utils/bicim';

export const bosForm = () => ({
  musteri_ad_soyad: '', telefon: '', adres: '', km: '', marka: '', model_tip: '', plaka: '',
  tahmini_teslim_tarihi: '', tahmini_toplam_ucret: '',
  ariza_sikayetler: '', aciklama: '', odeme_detaylari: '', durum: 'beklemede',
  teslim_alan_ad_soyad: '', teslim_eden_teknisyen: '', teslim_tarihi: '',
  kalan_odeme: '', odeme_tamamlandi: true,
});

export const bosParca = () => ({ parca_kodu: '', takilan_parca: '', adet: 1, birim_fiyat: 0, maliyet: 0 });

// Sunucudan gelen iş emrini form alanlarına çevirir (tarihler yyyy-aa-gg, boş değerler '').
// Kalan ödeme yoksa "Ödeme Tamamlandı" işaretli gelir.
export const kayittanForm = (d) => ({
  musteri_ad_soyad: d.musteri_ad_soyad || '', telefon: d.telefon || '', adres: d.adres || '',
  km: d.km || '', marka: d.marka || '', model_tip: d.model_tip || '', plaka: d.plaka || '',
  tahmini_teslim_tarihi: d.tahmini_teslim_tarihi ? new Date(d.tahmini_teslim_tarihi).toLocaleDateString('en-CA') : '',
  tahmini_toplam_ucret: d.tahmini_toplam_ucret || '',
  ariza_sikayetler: d.ariza_sikayetler || '', aciklama: d.aciklama || '',
  odeme_detaylari: d.odeme_detaylari || '', durum: d.durum || 'beklemede',
  teslim_alan_ad_soyad: d.teslim_alan_ad_soyad || d.olusturan_kisi || '',
  teslim_eden_teknisyen: d.teslim_eden_teknisyen || d.olusturan_kisi || '',
  teslim_tarihi: d.teslim_tarihi ? new Date(d.teslim_tarihi).toLocaleDateString('en-CA') : '',
  kalan_odeme: d.kalan_odeme || '', odeme_tamamlandi: !parseFloat(d.kalan_odeme || 0),
});

// Arama (müşteri, fiş no, telefon, marka) ve oluşturma tarihi aralığı. Durum süzgeci sunucuda uygulanır.
export const filtrele = (isEmirleri, { search, startDate, endDate }) => isEmirleri.filter(ie => {
  const matchSearch = !search ||
    (ie.musteri_ad_soyad?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (ie.fis_no?.toString() || '').includes(search) ||
    (ie.telefon || '').includes(search) ||
    (ie.marka?.toLowerCase() || '').includes(search.toLowerCase());
  const tarih = (ie.created_at || ie.tarih || '').split('T')[0];
  const matchStart = !startDate || tarih >= startDate;
  const matchEnd = !endDate || tarih <= endDate;
  return matchSearch && matchStart && matchEnd;
});

// Üst çiplerdeki sayılar (süzülmemiş liste üzerinden). `simdi`: "bugün" için; testte sabitlenebilir.
export const istatistikler = (isEmirleri, simdi = new Date()) => ({
  toplam: isEmirleri.length,
  bugun: isEmirleri.filter(ie => new Date(ie.created_at || ie.tarih).toDateString() === simdi.toDateString()).length,
  beklemede: isEmirleri.filter(ie => ie.durum === 'beklemede').length,
  islemde: isEmirleri.filter(ie => ie.durum === 'devam_ediyor').length,
  tamamlandi: isEmirleri.filter(ie => ie.durum === 'tamamlandi').length,
  tutar: isEmirleri.reduce((t, ie) => t + parseFloat(ie.gercek_toplam_ucret || 0), 0),
  kar: isEmirleri.reduce((t, ie) => t + parseFloat(ie.kar || 0), 0),
});

export const durumRenk = (d) => {
  if (d === 'tamamlandi') return 'success';
  if (d === 'devam_ediyor') return 'info';
  return 'warning';
};

export const durumLabel = (d) => {
  if (d === 'tamamlandi') return 'Tamam';
  if (d === 'devam_ediyor') return 'İşlemde';
  return 'Bekl.';
};

export const formatTarih = (d) => tarihYaz(d, '');
