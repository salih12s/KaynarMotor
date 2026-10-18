// Aksesuar satış ekranının saf kuralları (ekran/durum yok, doğrudan test edilebilir): form dönüşümleri, süzme, ürün satırı işlemleri
// (her işlem yeni dizi döndürür: eski kopya ezilmesin) ve toplam/indirim/kâr hesabı.
import { bugunYerel } from '../../../shared/utils/tarih';

// Formun ilk (kapalıyken tutulan) hâli
export const ilkForm = () => ({
  ad_soyad: '', telefon: '', odeme_sekli: '', aciklama: '', durum: 'beklemede', odeme_detaylari: '', satis_tarihi: '', kalan_odeme: '', odeme_tamamlandi: true, indirim: '',
});

// Yeni satış formu (satış tarihi bugün, ödeme tamamlandı işaretli)
export const bosForm = () => ({
  ad_soyad: '', telefon: '', odeme_sekli: '', aciklama: '', durum: 'beklemede', odeme_detaylari: '', satis_tarihi: bugunYerel(), kalan_odeme: '', odeme_tamamlandi: true, indirim: '',
});

// Kayıtlı satışı form alanlarına çevirir (boşlar '', tarih yyyy-aa-gg, kalan ödeme yoksa "Ödeme Tamamlandı" işaretli)
export const satistanForm = (d) => ({
  ad_soyad: d.ad_soyad || '', telefon: d.telefon || '', odeme_sekli: d.odeme_sekli || '', aciklama: d.aciklama || '', durum: d.durum || 'beklemede',
  odeme_detaylari: d.odeme_detaylari || '', satis_tarihi: d.satis_tarihi ? d.satis_tarihi.split('T')[0] : '', kalan_odeme: d.kalan_odeme || '',
  odeme_tamamlandi: !parseFloat(d.kalan_odeme || 0), indirim: parseFloat(d.indirim || 0) || '',
});

// Ad/telefon araması ve satış (yoksa oluşturma) tarihi aralığı
export const filtrele = (satislar, { aksSearch, aksStart, aksEnd }) => satislar.filter(s => {
  const matchSearch = !aksSearch ||
    (s.ad_soyad?.toLowerCase() || '').includes(aksSearch.toLowerCase()) ||
    (s.telefon || '').includes(aksSearch);
  const tarih = (s.satis_tarihi || s.created_at || '').split('T')[0];
  const matchStart = !aksStart || tarih >= aksStart;
  const matchEnd = !aksEnd || tarih <= aksEnd;
  return matchSearch && matchStart && matchEnd;
});

// ---- Ürün satırları ----------------------------------------------------------------------------------------------
export const yeniParca = () => ({ stok_id: null, urun_adi: '', adet: 1, maliyet: 0, satis_fiyati: 0 });

export const parcaEkle = (prev) => [...prev, yeniParca()];

// Barkod okutulduğunda ürünü otomatik ekle / adedini artır
export const stoktanEkleVeyaArtir = (prev, stok) => {
  const idx = prev.findIndex(p => (p.stok_id ? p.stok_id === stok.id : p.urun_adi === stok.stok_adi));
  if (idx >= 0) {
    const updated = [...prev];
    updated[idx] = { ...updated[idx], adet: (Number(updated[idx].adet) || 0) + 1 };
    return updated;
  }
  return [...prev, {
    stok_id: stok.id ?? null,
    urun_adi: stok.stok_adi,
    adet: 1,
    maliyet: parseFloat(stok.alis_fiyati || 0),
    satis_fiyati: parseFloat(stok.satis_fiyati || 0),
  }];
};

// Satırlar DEĞİŞTİRİLMEZ (yeni nesne üretilir): React önceki durumu doğru karşılaştırır, hızlı art arda girişte eski kopya ezilmez
export const parcaGuncelle = (prev, i, field, value) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p));

// Stok seçildiğinde satır stok kaydına ID ile bağlanır (aynı adlı kayıtlar karışmaz) ve fiyatlar stoktan gelir
export const parcaStokSec = (prev, i, stok) => prev.map((p, idx) => {
  if (idx !== i) return p;
  if (!stok) return { ...p, stok_id: null, urun_adi: '' };
  return { ...p, stok_id: stok.id ?? null, urun_adi: stok.stok_adi, maliyet: parseFloat(stok.alis_fiyati || 0), satis_fiyati: parseFloat(stok.satis_fiyati || 0) };
});

export const parcaSil = (prev, i) => prev.filter((_, idx) => idx !== i);

// Satırın bağlı olduğu stok kaydı (kimlik varsa kimlikle, yoksa adla)
export const stokDegeri = (stokOptions, p) => stokOptions.find(s => (p.stok_id ? s.id === p.stok_id : s.stok_adi === p.urun_adi)) || null;

// Toplamlar: indirim ürün toplamını aşamaz; kâr = indirimli toplam - maliyet
export const hesapla = (parcalar, indirimGirdi) => {
  const toplamSatis = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.satis_fiyati) || 0), 0);
  const toplamMaliyet = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.maliyet) || 0), 0);
  const indirim = Math.min(Number(indirimGirdi) || 0, toplamSatis);
  const netToplam = toplamSatis - indirim;
  return { toplamSatis, toplamMaliyet, indirim, netToplam, kar: netToplam - toplamMaliyet };
};
