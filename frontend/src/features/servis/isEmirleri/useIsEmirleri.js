import { useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { isEmriService } from '../servisApi';
import { authService } from '../../auth/authApi';

// Önbellek anahtarları: ['isEmirleri'] ile başlayan her şey birlikte geçersiz kılınabilir (silme/kaydetme sonrası)
export const isEmriAnahtari = {
  hepsi: ['isEmirleri'],
  liste: (durum) => ['isEmirleri', 'liste', { durum }],
  personel: ['personelListesi'],
};

// Veri gelene kadar her render'da yeni dizi üretilmesin (tüketen useMemo/useEffect'ler boşuna çalışmasın)
const BOS = [];

// Liste sayfasının sunucu verisi: iş emirleri (durum süzgeciyle), personel listesi, yenileme ve silme.
export const useIsEmirleri = () => {
  const [durumFilter, setDurumFilter] = useState('');
  const istemci = useQueryClient();

  const liste = useQuery({
    queryKey: isEmriAnahtari.liste(durumFilter),
    queryFn: async () => {
      const params = {};
      if (durumFilter) params.durum = durumFilter;
      try {
        return (await isEmriService.getAll(params)).data;
      } catch (err) {
        console.error(err);
        throw err;
      }
    },
    // Süzgeç değişirken yeni liste gelene kadar eskisi ekranda kalır (eskiden de böyleydi; boş tabloya düşmez)
    placeholderData: keepPreviousData,
    // Sayfa her açılışta tazelenir: başka ekranda (ayrı form sayfası, detay) yapılan değişiklik 30 sn beklemeden görünür.
    // Sayfa açıkken süzgeçler arasında gidip gelmek ise önbellekten okunur.
    refetchOnMount: 'always',
  });

  const personel = useQuery({
    queryKey: isEmriAnahtari.personel,
    queryFn: async () => (await authService.getPersonelListesi()).data || [],
  });

  const yenile = () => istemci.invalidateQueries({ queryKey: isEmriAnahtari.hepsi });

  const sil = async (id) => {
    if (!window.confirm('Bu iş emrini silmek istediğinizden emin misiniz?')) return;
    try {
      await isEmriService.delete(id);
      yenile();
    } catch (err) {
      alert(err.response?.data?.message || 'Silme hatası');
    }
  };

  return { isEmirleri: liste.data ?? BOS, durumFilter, setDurumFilter, kullanicilar: personel.data ?? BOS, yenile, sil };
};
