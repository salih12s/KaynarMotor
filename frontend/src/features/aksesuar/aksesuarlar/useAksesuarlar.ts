import { useOnay } from '../../../shared/ui';
import { hataMesaji } from '../../../shared/api/istemci';
import { useState, useEffect, useCallback, type KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sonIstek } from '../../../shared/utils/sonIstek';
import type { AksesuarIstatistik, AksesuarSatis, AksesuarStok, Musteri } from '../../../shared/tipler';
import { aksesuarService, aksesuarStokService } from '../aksesuarApi';
import { musteriService } from '../../musteriler/musteriApi';
import {
  ilkForm,
  bosForm,
  satistanForm,
  parcaEkle,
  stoktanEkleVeyaArtir,
  parcaGuncelle,
  parcaStokSec,
  parcaSil,
  stokDegeri as stokDegeriBul,
  hesapla,
  type AksesuarSatisFormu,
  type FormParca,
  type SatirStogu,
} from './aksesuarVeri';

// Hızlı yazarken eski aramanın yanıtı yeniyi ezmesin
const sonAra = sonIstek();

interface SatisDialogDurumu {
  open: boolean;
  data: AksesuarSatis | null;
}

// Aksesuar satış sayfasının sunucu verisi ve pencere durumları: satışlar, istatistik, stok listesi, ekle/düzenle/sil, ürün satırları,
// barkod okutma, toplam/indirim/kâr hesabı. Başka sayfadan `state.openDetailId` ile gelinirse detay otomatik açılır.
export const useAksesuarlar = () => {
  const onay = useOnay();
  const location = useLocation();
  const navigate = useNavigate();
  const [satislar, setSatislar] = useState<AksesuarSatis[]>([]);
  const [dialog, setDialog] = useState<SatisDialogDurumu>({ open: false, data: null });
  const [formData, setFormData] = useState<AksesuarSatisFormu>(ilkForm());
  const [parcalar, setParcalar] = useState<FormParca[]>([]);
  const [stokOptions, setStokOptions] = useState<AksesuarStok[]>([]);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<AksesuarIstatistik>({});
  const [detayDialog, setDetayDialog] = useState<SatisDialogDurumu>({ open: false, data: null });
  const [musteriOptions, setMusteriOptions] = useState<Musteri[]>([]);
  const [barkodInput, setBarkodInput] = useState('');

  const searchMusteri = async (query: string) => {
    if (!query || query.length < 2) {
      setMusteriOptions([]);
      return;
    }
    try {
      const res = await sonAra(musteriService.search(query));
      if (res) setMusteriOptions(res.data);
    } catch {
      setMusteriOptions([]);
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [satisRes, statsRes] = await Promise.all([aksesuarService.getAll(), aksesuarService.getStats()]);
      setSatislar(satisRes.data);
      setStats(statsRes.data);
    } catch {}
  }, []);

  const loadStok = useCallback(async () => {
    try {
      const res = await aksesuarStokService.getAll();
      setStokOptions(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    loadData();
    loadStok();
  }, [loadData, loadStok]);

  useEffect(() => {
    const id = (location.state as { openDetailId?: number } | null)?.openDetailId;
    if (!id) return;
    (async () => {
      try {
        const res = await aksesuarService.getById(id);
        setDetayDialog({ open: true, data: res.data });
      } catch {}
    })();
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate]);

  const detayAc = async (id: number) => {
    try {
      const res = await aksesuarService.getById(id);
      setDetayDialog({ open: true, data: res.data });
    } catch {}
  };

  const openDialog = async (satis: AksesuarSatis | null = null) => {
    setError('');
    if (satis) {
      try {
        const res = await aksesuarService.getById(satis.id);
        const d = res.data;
        setFormData(satistanForm(d));
        setParcalar(d.parcalar || []);
      } catch {
        setError('Yükleme hatası');
      }
    } else {
      setFormData(bosForm());
      setParcalar([]);
    }
    setDialog({ open: true, data: satis });
  };

  const addParca = () => setParcalar(parcaEkle);

  const handleBarkodScan = async (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const kod = barkodInput.trim();
    if (!kod) return;
    setError('');
    let bulunan: AksesuarStok | undefined = stokOptions.find((s) => String(s.stok_kodu || '').trim() === kod);
    if (!bulunan) {
      try {
        const res = await aksesuarStokService.getByBarkod(kod);
        bulunan = res.data;
      } catch {
        setError(`Barkod bulunamadı: ${kod}`);
        setBarkodInput('');
        return;
      }
    }
    const stok: AksesuarStok = bulunan;
    setParcalar((prev) => stoktanEkleVeyaArtir(prev, stok));
    setBarkodInput('');
  };

  const updateParca = <K extends keyof FormParca>(i: number, field: K, value: FormParca[K]) => setParcalar((prev) => parcaGuncelle(prev, i, field, value));
  const secStok = (i: number, stok: SatirStogu | null) => setParcalar((prev) => parcaStokSec(prev, i, stok));
  const stokDegeri = (p: FormParca) => stokDegeriBul(stokOptions, p);
  const removeParca = (i: number) => setParcalar((prev) => parcaSil(prev, i));

  const { toplamSatis, toplamMaliyet, indirim, netToplam, kar } = hesapla(parcalar, formData.indirim);

  const handleSave = async () => {
    setError('');
    try {
      // `odeme_tamamlandi` yalnızca ekran içindir; sunucuya kalan ödeme olarak gider
      const { odeme_tamamlandi, ...alanlar } = formData;
      const payload = { ...alanlar, parcalar, kalan_odeme: odeme_tamamlandi ? 0 : formData.kalan_odeme || 0 };
      if (dialog.data) {
        await aksesuarService.update(dialog.data.id, payload);
      } else {
        await aksesuarService.create(payload);
      }
      setDialog({ open: false, data: null });
      loadData();
      loadStok();
    } catch (err) {
      setError(hataMesaji(err, 'Hata oluştu'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await onay('Silmek istediğinizden emin misiniz?'))) return;
    try {
      await aksesuarService.delete(id);
      loadData();
      loadStok();
    } catch (err) {
      alert(hataMesaji(err, 'Hata'));
    }
  };

  return {
    satislar,
    stats,
    dialog,
    setDialog,
    formData,
    setFormData,
    parcalar,
    stokOptions,
    error,
    detayDialog,
    setDetayDialog,
    musteriOptions,
    searchMusteri,
    barkodInput,
    setBarkodInput,
    detayAc,
    openDialog,
    addParca,
    handleBarkodScan,
    updateParca,
    secStok,
    stokDegeri,
    removeParca,
    toplamSatis,
    toplamMaliyet,
    indirim,
    netToplam,
    kar,
    handleSave,
    handleDelete,
  };
};

export type AksesuarlarDurumu = ReturnType<typeof useAksesuarlar>;
