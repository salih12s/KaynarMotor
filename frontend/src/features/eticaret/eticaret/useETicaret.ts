import { useOnay } from '../../../shared/ui';
import { sayiDegeri } from '../../../shared/utils/bicim';
import { hataMesaji } from '../../../shared/api/istemci';
import { useState, useEffect, useCallback } from 'react';
import type { AksesuarStok, EticaretIstatistik, EticaretSatis, Platform } from '../../../shared/tipler';
import { eticaretService } from '../eticaretApi';
import { aksesuarStokService } from '../../aksesuar/aksesuarApi';
import { detectPlatform, hesaplaKomisyon } from '../komisyon';
import { bosSatisForm, satistanForm, bosPlatformForm, platformdanForm, hesaplaToplamKar, type EticaretSatisFormu, type PlatformFormu } from './eticaretVeri';

interface SatisDialogDurumu {
  open: boolean;
  data: EticaretSatis | null;
}

interface PlatformDialogDurumu {
  open: boolean;
  data: Platform | null;
}

// E-Ticaret sayfasının sunucu verisi ve pencere durumları: satışlar, platformlar, istatistik, stok listesi; satış/platform ekle-düzenle-sil;
// seçili platforma göre canlı komisyon hesabı.
export const useETicaret = () => {
  const onay = useOnay();
  const [satislar, setSatislar] = useState<EticaretSatis[]>([]);
  const [platformlar, setPlatformlar] = useState<Platform[]>([]);
  const [stokOptions, setStokOptions] = useState<AksesuarStok[]>([]);
  const [stats, setStats] = useState<EticaretIstatistik>({});
  const [error, setError] = useState('');

  // Satış dialog
  const [satisDialog, setSatisDialog] = useState<SatisDialogDurumu>({ open: false, data: null });
  const [satisForm, setSatisForm] = useState<EticaretSatisFormu>({
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
  const [platformDialog, setPlatformDialog] = useState<PlatformDialogDurumu>({ open: false, data: null });
  const [platformForm, setPlatformForm] = useState<PlatformFormu>({ platform_adi: '', komisyon_orani: '', kdv_orani: '20', kargo_ucreti: '0' });

  // Detay dialog
  const [detayDialog, setDetayDialog] = useState<SatisDialogDurumu>({ open: false, data: null });

  const loadData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ===== Satış İşlemleri =====
  const openSatisDialog = (satis: EticaretSatis | null = null) => {
    setError('');
    setSatisForm(satis ? satistanForm(satis) : bosSatisForm());
    setSatisDialog({ open: true, data: satis });
  };

  const handleStokSelect = (stokId: string | number) => {
    const found = stokOptions.find((s) => s.id === Number(stokId));
    if (found) {
      setSatisForm((prev) => ({ ...prev, stok_id: stokId, urun_adi: found.stok_adi, alis_fiyati: sayiDegeri(found.alis_fiyati) }));
    } else {
      setSatisForm((prev) => ({ ...prev, stok_id: stokId }));
    }
  };

  const handlePlatformSelect = (platformId: string | number) => {
    const found = platformlar.find((p) => p.id === Number(platformId));
    if (found) {
      setSatisForm((prev) => ({
        ...prev,
        platform_id: platformId,
        komisyon_orani: sayiDegeri(found.komisyon_orani),
        kdv_orani: sayiDegeri(found.kdv_orani, 20),
        kargo_ucreti: sayiDegeri(found.kargo_ucreti),
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
      setError(hataMesaji(err, 'Hata'));
    }
  };

  const handleSatisDelete = async (id: number) => {
    if (!(await onay('Bu satışı silmek istediğinizden emin misiniz?'))) return;
    try {
      await eticaretService.deleteSale(id);
      loadData();
    } catch (err) {
      alert(hataMesaji(err, 'Hata'));
    }
  };

  // ===== Platform İşlemleri =====
  const openPlatformDialog = (p: Platform | null = null) => {
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
      setError(hataMesaji(err, 'Hata'));
    }
  };

  const handlePlatformDelete = async (id: number) => {
    if (!(await onay('Bu platformu silmek istediğinizden emin misiniz?'))) return;
    try {
      await eticaretService.deletePlatform(id);
      loadData();
    } catch (err) {
      alert(hataMesaji(err, 'Hata'));
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

export type ETicaretDurumu = ReturnType<typeof useETicaret>;
