import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sonIstek } from '../../../shared/utils/sonIstek';
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
} from './aksesuarVeri';

// Hızlı yazarken eski aramanın yanıtı yeniyi ezmesin
const sonAra = sonIstek();

// Aksesuar satış sayfasının sunucu verisi ve pencere durumları: satışlar, istatistik, stok listesi, ekle/düzenle/sil, ürün satırları,
// barkod okutma, toplam/indirim/kâr hesabı. Başka sayfadan `state.openDetailId` ile gelinirse detay otomatik açılır.
export const useAksesuarlar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [satislar, setSatislar] = useState([]);
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [formData, setFormData] = useState(ilkForm());
  const [parcalar, setParcalar] = useState([]);
  const [stokOptions, setStokOptions] = useState([]);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({});
  const [detayDialog, setDetayDialog] = useState({ open: false, data: null });
  const [musteriOptions, setMusteriOptions] = useState([]);
  const [barkodInput, setBarkodInput] = useState('');

  const searchMusteri = async (query) => {
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

  const loadData = async () => {
    try {
      const [satisRes, statsRes] = await Promise.all([aksesuarService.getAll(), aksesuarService.getStats()]);
      setSatislar(satisRes.data);
      setStats(statsRes.data);
    } catch {}
  };

  const loadStok = async () => {
    try {
      const res = await aksesuarStokService.getAll();
      setStokOptions(res.data);
    } catch {}
  };

  useEffect(() => {
    loadData();
    loadStok();
  }, []);

  useEffect(() => {
    const id = location.state?.openDetailId;
    if (!id) return;
    (async () => {
      try {
        const res = await aksesuarService.getById(id);
        setDetayDialog({ open: true, data: res.data });
      } catch {}
    })();
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state]);

  const detayAc = async (id) => {
    try {
      const res = await aksesuarService.getById(id);
      setDetayDialog({ open: true, data: res.data });
    } catch {}
  };

  const openDialog = async (satis = null) => {
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

  const handleBarkodScan = async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const kod = barkodInput.trim();
    if (!kod) return;
    setError('');
    let stok = stokOptions.find((s) => String(s.stok_kodu || '').trim() === kod);
    if (!stok) {
      try {
        const res = await aksesuarStokService.getByBarkod(kod);
        stok = res.data;
      } catch {
        setError(`Barkod bulunamadı: ${kod}`);
        setBarkodInput('');
        return;
      }
    }
    setParcalar((prev) => stoktanEkleVeyaArtir(prev, stok));
    setBarkodInput('');
  };

  const updateParca = (i, field, value) => setParcalar((prev) => parcaGuncelle(prev, i, field, value));
  const secStok = (i, stok) => setParcalar((prev) => parcaStokSec(prev, i, stok));
  const stokDegeri = (p) => stokDegeriBul(stokOptions, p);
  const removeParca = (i) => setParcalar((prev) => parcaSil(prev, i));

  const { toplamSatis, toplamMaliyet, indirim, netToplam, kar } = hesapla(parcalar, formData.indirim);

  const handleSave = async () => {
    setError('');
    try {
      const payload = { ...formData, parcalar, kalan_odeme: formData.odeme_tamamlandi ? 0 : formData.kalan_odeme || 0 };
      delete payload.odeme_tamamlandi;
      if (dialog.data) {
        await aksesuarService.update(dialog.data.id, payload);
      } else {
        await aksesuarService.create(payload);
      }
      setDialog({ open: false, data: null });
      loadData();
      loadStok();
    } catch (err) {
      setError(err.response?.data?.message || 'Hata oluştu');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Silmek istediğinizden emin misiniz?')) return;
    try {
      await aksesuarService.delete(id);
      loadData();
      loadStok();
    } catch (err) {
      alert(err.response?.data?.message || 'Hata');
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
