import { useState, useEffect } from 'react';
import { isEmriService } from '../servisApi';
import { authService } from '../../auth/authApi';

// Liste sayfasının sunucu verisi: iş emirleri (durum süzgeciyle), personel listesi, yenileme ve silme.
export const useIsEmirleri = () => {
  const [isEmirleri, setIsEmirleri] = useState([]);
  const [durumFilter, setDurumFilter] = useState('');
  const [kullanicilar, setKullanicilar] = useState([]);

  const loadData = async () => {
    try {
      const params = {};
      if (durumFilter) params.durum = durumFilter;
      const res = await isEmriService.getAll(params);
      setIsEmirleri(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    loadData();
    authService.getPersonelListesi().then(r => {
      setKullanicilar(r.data || []);
    }).catch(() => {});
  }, [durumFilter]);

  const sil = async (id) => {
    if (!window.confirm('Bu iş emrini silmek istediğinizden emin misiniz?')) return;
    try { await isEmriService.delete(id); loadData(); } catch (err) { alert(err.response?.data?.message || 'Silme hatası'); }
  };

  return { isEmirleri, durumFilter, setDurumFilter, kullanicilar, yenile: loadData, sil };
};
