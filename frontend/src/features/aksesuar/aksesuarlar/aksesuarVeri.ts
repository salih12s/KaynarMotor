// Aksesuar satış ekranının saf kuralları (ekran/durum yok, doğrudan test edilebilir): form dönüşümleri, süzme, ürün satırı işlemleri
// (her işlem yeni dizi döndürür: eski kopya ezilmesin) ve toplam/indirim/kâr hesabı.
import { bugunYerel } from '../../../shared/utils/tarih';
import { sayiDegeri, type Sayi } from '../../../shared/utils/bicim';
import type { AksesuarSatis } from '../../../shared/tipler';

/** Form alanı: kullanıcı yazarken metin, kayıttan gelirken sayı olabilir. */
export type FormSayisi = string | number;

/** Satış formunun alanları (ekrandaki girdilerle birebir). */
export interface AksesuarSatisFormu {
  ad_soyad: string;
  telefon: string;
  odeme_sekli: string;
  aciklama: string;
  durum: string;
  odeme_detaylari: string;
  satis_tarihi: string;
  kalan_odeme: FormSayisi;
  odeme_tamamlandi: boolean;
  indirim: FormSayisi;
}

// Formun ilk (kapalıyken tutulan) hâli
export const ilkForm = (): AksesuarSatisFormu => ({
  ad_soyad: '',
  telefon: '',
  odeme_sekli: '',
  aciklama: '',
  durum: 'beklemede',
  odeme_detaylari: '',
  satis_tarihi: '',
  kalan_odeme: '',
  odeme_tamamlandi: true,
  indirim: '',
});

// Yeni satış formu (satış tarihi bugün, ödeme tamamlandı işaretli)
export const bosForm = (): AksesuarSatisFormu => ({
  ad_soyad: '',
  telefon: '',
  odeme_sekli: '',
  aciklama: '',
  durum: 'beklemede',
  odeme_detaylari: '',
  satis_tarihi: bugunYerel(),
  kalan_odeme: '',
  odeme_tamamlandi: true,
  indirim: '',
});

// Kayıtlı satışı form alanlarına çevirir (boşlar '', tarih yyyy-aa-gg, kalan ödeme yoksa "Ödeme Tamamlandı" işaretli)
export const satistanForm = (d: AksesuarSatis): AksesuarSatisFormu => ({
  ad_soyad: d.ad_soyad || '',
  telefon: d.telefon || '',
  odeme_sekli: d.odeme_sekli || '',
  aciklama: d.aciklama || '',
  durum: d.durum || 'beklemede',
  odeme_detaylari: d.odeme_detaylari || '',
  satis_tarihi: d.satis_tarihi ? d.satis_tarihi.split('T')[0] : '',
  kalan_odeme: d.kalan_odeme || '',
  odeme_tamamlandi: !sayiDegeri(d.kalan_odeme),
  indirim: sayiDegeri(d.indirim) || '',
});

export interface AksesuarSuzgeci {
  aksSearch?: string;
  aksStart?: string;
  aksEnd?: string;
}

// Ad/telefon araması ve satış (yoksa oluşturma) tarihi aralığı
export const filtrele = (satislar: AksesuarSatis[], { aksSearch, aksStart, aksEnd }: AksesuarSuzgeci): AksesuarSatis[] =>
  satislar.filter((s) => {
    const matchSearch = !aksSearch || (s.ad_soyad?.toLowerCase() || '').includes(aksSearch.toLowerCase()) || (s.telefon || '').includes(aksSearch);
    const tarih = (s.satis_tarihi || s.created_at || '').split('T')[0];
    const matchStart = !aksStart || tarih >= aksStart;
    const matchEnd = !aksEnd || tarih <= aksEnd;
    return matchSearch && matchStart && matchEnd;
  });

// ---- Ürün satırları ----------------------------------------------------------------------------------------------

/** Formdaki bir ürün satırı (kayıtlı satışın satırları da aynı şekildedir: sunucudan boş alanlar null gelebilir). */
export interface FormParca {
  stok_id?: number | null;
  urun_adi: string | null;
  adet: FormSayisi | null;
  maliyet: Sayi;
  satis_fiyati: Sayi;
}

/** Satırın bağlanabileceği stok kaydı (aksesuar stoğu). */
export interface SatirStogu {
  id?: number;
  stok_adi: string;
  alis_fiyati?: Sayi;
  satis_fiyati?: Sayi;
}

export const yeniParca = (): FormParca => ({ stok_id: null, urun_adi: '', adet: 1, maliyet: 0, satis_fiyati: 0 });

export const parcaEkle = (prev: FormParca[]): FormParca[] => [...prev, yeniParca()];

// Barkod okutulduğunda ürünü otomatik ekle / adedini artır
export const stoktanEkleVeyaArtir = (prev: FormParca[], stok: SatirStogu): FormParca[] => {
  const idx = prev.findIndex((p) => (p.stok_id ? p.stok_id === stok.id : p.urun_adi === stok.stok_adi));
  if (idx >= 0) {
    const updated = [...prev];
    updated[idx] = { ...updated[idx], adet: (Number(updated[idx].adet) || 0) + 1 };
    return updated;
  }
  return [
    ...prev,
    {
      stok_id: stok.id ?? null,
      urun_adi: stok.stok_adi,
      adet: 1,
      maliyet: sayiDegeri(stok.alis_fiyati),
      satis_fiyati: sayiDegeri(stok.satis_fiyati),
    },
  ];
};

// Satırlar DEĞİŞTİRİLMEZ (yeni nesne üretilir): React önceki durumu doğru karşılaştırır, hızlı art arda girişte eski kopya ezilmez
export const parcaGuncelle = <K extends keyof FormParca>(prev: FormParca[], i: number, field: K, value: FormParca[K]): FormParca[] =>
  prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p));

// Stok seçildiğinde satır stok kaydına ID ile bağlanır (aynı adlı kayıtlar karışmaz) ve fiyatlar stoktan gelir
export const parcaStokSec = (prev: FormParca[], i: number, stok: SatirStogu | null): FormParca[] =>
  prev.map((p, idx) => {
    if (idx !== i) return p;
    if (!stok) return { ...p, stok_id: null, urun_adi: '' };
    return {
      ...p,
      stok_id: stok.id ?? null,
      urun_adi: stok.stok_adi,
      maliyet: sayiDegeri(stok.alis_fiyati),
      satis_fiyati: sayiDegeri(stok.satis_fiyati),
    };
  });

export const parcaSil = (prev: FormParca[], i: number): FormParca[] => prev.filter((_, idx) => idx !== i);

// Satırın bağlı olduğu stok kaydı (kimlik varsa kimlikle, yoksa adla)
export const stokDegeri = <T extends { id?: number; stok_adi: string }>(stokOptions: T[], p: FormParca): T | null =>
  stokOptions.find((s) => (p.stok_id ? s.id === p.stok_id : s.stok_adi === p.urun_adi)) || null;

// Toplamlar: indirim ürün toplamını aşamaz; kâr = indirimli toplam - maliyet
export const hesapla = (parcalar: FormParca[], indirimGirdi: FormSayisi) => {
  const toplamSatis = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.satis_fiyati) || 0), 0);
  const toplamMaliyet = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.maliyet) || 0), 0);
  const indirim = Math.min(Number(indirimGirdi) || 0, toplamSatis);
  const netToplam = toplamSatis - indirim;
  return { toplamSatis, toplamMaliyet, indirim, netToplam, kar: netToplam - toplamMaliyet };
};
