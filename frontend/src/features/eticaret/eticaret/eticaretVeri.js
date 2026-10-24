// E-Ticaret ekranının saf kuralları (ekran/durum yok, doğrudan test edilebilir): form dönüşümleri, süzme, biçim, toplam kâr.
import { bugunYerel } from '../../../shared/utils/tarih';
import { hesaplaKomisyon, detectPlatform } from '../komisyon';

// Kâr, kâr oranı ve yatırım geri dönüş oranı e-ticaret yetkisi olanlara gösterilir (yetkisizler sayfaya zaten giremez)
export const karEtiketi = (etiket) => /kâr|geri dönüş/i.test(etiket);

export const formatTL = (v) => parseFloat(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Yeni satış formu (KDV %20, kargo 0, adet 1, tarih bugün)
export const bosSatisForm = () => ({
  stok_id: '',
  platform_id: '',
  urun_adi: '',
  alis_fiyati: '',
  satis_fiyati: '',
  komisyon_orani: '',
  kdv_orani: '20',
  kargo_ucreti: '0',
  adet: 1,
  tarih: bugunYerel(),
});

// Kayıtlı satışı form alanlarına çevirir (boşlar '', KDV yoksa '20', tarih yyyy-aa-gg)
export const satistanForm = (satis) => ({
  stok_id: satis.stok_id || '',
  platform_id: satis.platform_id || '',
  urun_adi: satis.urun_adi || '',
  alis_fiyati: satis.alis_fiyati || '',
  satis_fiyati: satis.satis_fiyati || '',
  komisyon_orani: satis.komisyon_orani || '',
  kdv_orani: satis.kdv_orani != null ? satis.kdv_orani : '20',
  kargo_ucreti: satis.kargo_ucreti || '0',
  adet: satis.adet || 1,
  tarih: satis.tarih ? satis.tarih.split('T')[0] : '',
});

export const bosPlatformForm = () => ({ platform_adi: '', komisyon_orani: '', kdv_orani: '20', kargo_ucreti: '0' });

export const platformdanForm = (p) => ({
  platform_adi: p.platform_adi,
  komisyon_orani: p.komisyon_orani,
  kdv_orani: p.kdv_orani != null ? p.kdv_orani : '20',
  kargo_ucreti: p.kargo_ucreti || '0',
});

// Platform süzgeci: boşsa hepsi
export const platformSuz = (satislar, platformFiltre) => (platformFiltre ? satislar.filter((s) => s.platform_id === Number(platformFiltre)) : satislar);

// Tüm satışlar için doğru hesaplanmış toplam kâr (hesaplaKomisyon ile satır satır)
export const hesaplaToplamKar = (satislar) =>
  satislar.reduce((t, s) => {
    const pt = detectPlatform(s.platform_adi);
    const h = hesaplaKomisyon(s.satis_fiyati, s.alis_fiyati, s.komisyon_orani, s.kdv_orani || 20, s.kargo_ucreti || 0, s.adet, pt);
    return t + h.netKar;
  }, 0);
