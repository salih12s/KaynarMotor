import { useOnay } from '../../../shared/ui';
import { useState, useEffect } from 'react';
import { eticaretService } from '../eticaretApi';
import { aksesuarStokService } from '../../aksesuar/aksesuarApi';
import { detectPlatform, hesaplaKomisyon } from '../komisyon';
import { bosSatisForm, satistanForm, bosPlatformForm, platformdanForm, hesaplaToplamKar } from './eticaretVeri';

// E-Ticaret sayfasının sunucu verisi ve pencere durumları: satışlar, platformlar, istatistik, stok listesi; satış/platform ekle-düzenle-sil;
// seçili platforma göre canlı komisyon hesabı.
export const useETicaret = () => {
  const onay = useOnay();
  const [satislar, setSatislar] = useState([]);
  const [platformlar, setPlatformlar] = useState([]);
  const [stokOptions, setStokOptions] = useState([]);
  const [stats, setStats] = useState({});
  const [error, setError] = useState('');

  // Satış dialog
  const [satisDialog, setSatisDialog] = useState({ open: false, data: null });
  const [satisForm, setSatisForm] = useState({
    stok_id: '',
    platform_id: '',
    urun_adi: '',
    alis_fiyati: '',
    satis_fiyati: '',
    komisyon_orani: '',
    kdv_orani: '20',
    kargo_ucreti: '0',
    adet: 1,
    tarih: '',
  });

  // Platform dialog
  const [platformDialog, setPlatformDialog] = useState({ open: false, data: null });
  const [platformForm, setPlatformForm] = useState({ platform_adi: '', komisyon_orani: '', kdv_orani: '20', kargo_ucreti: '0' });

  // Detay dialog
  const [detayDialog, setDetayDialog] = useState({ open: false, data: null });

  const loadData = async () => {
    try {
      const [satisRes, platformRes, statsRes, stokRes] = await Promise.all([
        eticaretService.getSales(),
        eticaretService.getPlatforms(),
        eticaretService.getStats(),
        aksesuarStokService.getAll(),
      ]);
      setSatislar(satisRes.data);
      setPlatformlar(platformRes.data);
      setStats(statsRes.data);
      setStokOptions(stokRes.data);
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, []);

  // ===== Satış İşlemleri =====
  const openSatisDialog = (satis = null) => {
    setError('');
    setSatisForm(satis ? satistanForm(satis) : bosSatisForm());
    setSatisDialog({ open: true, data: satis });
  };

  const handleStokSelect = (stokId) => {
    const found = stokOptions.find((s) => s.id === Number(stokId));
    if (found) {
      setSatisForm((prev) => ({ ...prev, stok_id: stokId, urun_adi: found.stok_adi, alis_fiyati: parseFloat(found.alis_fiyati || 0) }));
    } else {
      setSatisForm((prev) => ({ ...prev, stok_id: stokId }));
    }
  };

  const handlePlatformSelect = (platformId) => {
    const found = platformlar.find((p) => p.id === Number(platformId));
    if (found) {
      setSatisForm((prev) => ({
        ...prev,
        platform_id: platformId,
        komisyon_orani: parseFloat(found.komisyon_orani || 0),
        kdv_orani: parseFloat(found.kdv_orani || 20),
        kargo_ucreti: parseFloat(found.kargo_ucreti || 0),
      }));
    } else {
      setSatisForm((prev) => ({ ...prev, platform_id: platformId }));
    }
  };

  const sf = satisForm;
  const selectedPlatformObj = platformlar.find((p) => p.id === Number(sf.platform_id));
  const canliPlatformTipi = detectPlatform(selectedPlatformObj?.platform_adi);
  const canliHesap = hesaplaKomisyon(sf.satis_fiyati, sf.alis_fiyati, sf.komisyon_orani, sf.kdv_orani, sf.kargo_ucreti, sf.adet, canliPlatformTipi);

  const handleSatisSave = async () => {
    setError('');
    try {
      if (satisDialog.data) {
        await eticaretService.updateSale(satisDialog.data.id, satisForm);
      } else {
        await eticaretService.createSale(satisForm);
      }
      setSatisDialog({ open: false, data: null });
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Hata');
    }
  };

  const handleSatisDelete = async (id) => {
    if (!(await onay('Bu satışı silmek istediğinizden emin misiniz?'))) return;
    try {
      await eticaretService.deleteSale(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Hata');
    }
  };

  // ===== Platform İşlemleri =====
  const openPlatformDialog = (p = null) => {
    setError('');
    setPlatformForm(p ? platformdanForm(p) : bosPlatformForm());
    setPlatformDialog({ open: true, data: p });
  };

  const handlePlatformSave = async () => {
    setError('');
    try {
      if (platformDialog.data) {
        await eticaretService.updatePlatform(platformDialog.data.id, platformForm);
      } else {
        await eticaretService.createPlatform(platformForm);
      }
      setPlatformDialog({ open: false, data: null });
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Hata');
    }
  };

  const handlePlatformDelete = async (id) => {
    if (!(await onay('Bu platformu silmek istediğinizden emin misiniz?'))) return;
    try {
      await eticaretService.deletePlatform(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Hata');
    }
  };

  const hesaplananToplamKar = hesaplaToplamKar(satislar);

  return {
    satislar,
    platformlar,
    stokOptions,
    stats,
    error,
    satisDialog,
    setSatisDialog,
    satisForm,
    setSatisForm,
    platformDialog,
    setPlatformDialog,
    platformForm,
    setPlatformForm,
    detayDialog,
    setDetayDialog,
    openSatisDialog,
    handleStokSelect,
    handlePlatformSelect,
    sf,
    canliPlatformTipi,
    canliHesap,
    handleSatisSave,
    handleSatisDelete,
    openPlatformDialog,
    handlePlatformSave,
    handlePlatformDelete,
    hesaplananToplamKar,
  };
};
