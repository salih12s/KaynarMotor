// İş emirleri liste ekranının saf kuralları (ekran/durum yok, doğrudan test edilebilir):
// süzme, istatistik, durum etiketleri ve form için başlangıç/dönüşüm değerleri.
import { sayiDegeri, tarihYaz, type TarihGirdisi } from '../../../shared/utils/bicim';
import type { IsEmri } from '../../../shared/tipler';
import type { TonAdi } from '../../../app/tokenlar';

/** Form alanı: kullanıcı yazarken metin, kayıttan gelirken sayı olabilir. */
export type FormSayisi = string | number;

/** İş emri formunun alanları (ekrandaki girdilerle birebir). */
export interface IsEmriFormu {
  musteri_ad_soyad: string;
  telefon: string;
  adres: string;
  km: FormSayisi;
  marka: string;
  model_tip: string;
  plaka: string;
  tahmini_teslim_tarihi: string;
  tahmini_toplam_ucret: FormSayisi;
  ariza_sikayetler: string;
  aciklama: string;
  odeme_detaylari: string;
  durum: string;
  teslim_alan_ad_soyad: string;
  teslim_eden_teknisyen: string;
  teslim_tarihi: string;
  kalan_odeme: FormSayisi;
  odeme_tamamlandi: boolean;
}

/** Forma yeni eklenen parça satırı (henüz listeye girmemiş). */
export interface FormParcasi {
  parca_kodu: string;
  takilan_parca: string;
  adet: FormSayisi;
  birim_fiyat: FormSayisi;
  maliyet: FormSayisi;
}

/** Liste satırı: tarih için eski kayıtlarda `tarih` alanı da okunur (created_at yoksa). */
export type ListeSatiri = IsEmri & { tarih?: string };

export const bosForm = (): IsEmriFormu => ({
  musteri_ad_soyad: '',
  telefon: '',
  adres: '',
  km: '',
  marka: '',
  model_tip: '',
  plaka: '',
  tahmini_teslim_tarihi: '',
  tahmini_toplam_ucret: '',
  ariza_sikayetler: '',
  aciklama: '',
  odeme_detaylari: '',
  durum: 'beklemede',
  teslim_alan_ad_soyad: '',
  teslim_eden_teknisyen: '',
  teslim_tarihi: '',
  kalan_odeme: '',
  odeme_tamamlandi: true,
});

export const bosParca = (): FormParcasi => ({ parca_kodu: '', takilan_parca: '', adet: 1, birim_fiyat: 0, maliyet: 0 });

// Sunucudan gelen iş emrini form alanlarına çevirir (tarihler yyyy-aa-gg, boş değerler '').
// Kalan ödeme yoksa "Ödeme Tamamlandı" işaretli gelir.
export const kayittanForm = (d: IsEmri): IsEmriFormu => ({
  musteri_ad_soyad: d.musteri_ad_soyad || '',
  telefon: d.telefon || '',
  adres: d.adres || '',
  km: d.km || '',
  marka: d.marka || '',
  model_tip: d.model_tip || '',
  plaka: d.plaka || '',
  tahmini_teslim_tarihi: d.tahmini_teslim_tarihi ? new Date(d.tahmini_teslim_tarihi).toLocaleDateString('en-CA') : '',
  tahmini_toplam_ucret: d.tahmini_toplam_ucret || '',
  ariza_sikayetler: d.ariza_sikayetler || '',
  aciklama: d.aciklama || '',
  odeme_detaylari: d.odeme_detaylari || '',
  durum: d.durum || 'beklemede',
  teslim_alan_ad_soyad: d.teslim_alan_ad_soyad || d.olusturan_kisi || '',
  teslim_eden_teknisyen: d.teslim_eden_teknisyen || d.olusturan_kisi || '',
  teslim_tarihi: d.teslim_tarihi ? new Date(d.teslim_tarihi).toLocaleDateString('en-CA') : '',
  kalan_odeme: d.kalan_odeme || '',
  odeme_tamamlandi: !sayiDegeri(d.kalan_odeme),
});

export interface IsEmriSuzgeci {
  search: string;
  startDate: string;
  endDate: string;
}

// Arama (müşteri, fiş no, telefon, marka) ve oluşturma tarihi aralığı. Durum süzgeci sunucuda uygulanır.
export const filtrele = (isEmirleri: ListeSatiri[], { search, startDate, endDate }: IsEmriSuzgeci): ListeSatiri[] =>
  isEmirleri.filter((ie) => {
    const matchSearch =
      !search ||
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
export const istatistikler = (isEmirleri: ListeSatiri[], simdi: Date = new Date()) => ({
  toplam: isEmirleri.length,
  bugun: isEmirleri.filter((ie) => new Date(ie.created_at || ie.tarih || '').toDateString() === simdi.toDateString()).length,
  beklemede: isEmirleri.filter((ie) => ie.durum === 'beklemede').length,
  islemde: isEmirleri.filter((ie) => ie.durum === 'devam_ediyor').length,
  tamamlandi: isEmirleri.filter((ie) => ie.durum === 'tamamlandi').length,
  tutar: isEmirleri.reduce((t, ie) => t + sayiDegeri(ie.gercek_toplam_ucret), 0),
  kar: isEmirleri.reduce((t, ie) => t + sayiDegeri(ie.kar), 0),
});

export type IsEmriIstatistigi = ReturnType<typeof istatistikler>;

export const durumRenk = (d: string): 'success' | 'info' | 'warning' => {
  if (d === 'tamamlandi') return 'success';
  if (d === 'devam_ediyor') return 'info';
  return 'warning';
};

export const durumLabel = (d: string): string => {
  if (d === 'tamamlandi') return 'Tamamlandı';
  if (d === 'devam_ediyor') return 'İşlemde';
  return 'Beklemede';
};

// Damga (shared/ui/Damga) tonu: beklemede amber, işlemde mavi, tamamlandı yeşil
export const durumTon = (d: string): TonAdi => {
  if (d === 'tamamlandi') return 'yesil';
  if (d === 'devam_ediyor') return 'mavi';
  return 'bekle';
};

export const formatTarih = (d: TarihGirdisi): string => tarihYaz(d, '');
