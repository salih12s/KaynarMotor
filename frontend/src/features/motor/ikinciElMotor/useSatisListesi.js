import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ikinciElMotorService } from '../motorApi';
import { authService } from '../../auth/authApi';

// Satış listesi (yalnızca "tamamlandi" motorlar), istatistikler, stoktaki motorlar (plaka seçimi), yatırımcı adları, silme ve detay penceresi.
// Başka sayfadan `state.openDetailId` ile gelinirse detay otomatik açılır ve konum durumu temizlenir.
export const useSatisListesi = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [motorlar, setMotorlar] = useState([]);
  const [detayModal, setDetayModal] = useState({ open: false, data: null });
  const [stats, setStats] = useState({});
  const [stokMotorlar, setStokMotorlar] = useState([]);
  const [yatirimciMap, setYatirimciMap] = useState({}); // id -> ad_soyad (ibarede isim göstermek için)

  const loadData = async () => {
    try {
      const [motorRes, statsRes] = await Promise.all([ikinciElMotorService.getAll(), ikinciElMotorService.getStats()]);
      const allMotors = motorRes.data;
      const satisMotorlar = allMotors.filter(m => m.durum === 'tamamlandi');
      setMotorlar(satisMotorlar);
      setStats(statsRes.data);
      setStokMotorlar(allMotors.filter(m => m.durum === 'stokta' || m.durum === 'kapora'));
    } catch {}
  };

  useEffect(() => { loadData(); }, []);

  // Yatırımcı isimlerini yükle (yetki yoksa sessiz geç — ibare yine "Yatırımcı Motoru" gösterir)
  useEffect(() => {
    authService.getYatirimcilar()
      .then(res => { const map = {}; res.data.forEach(y => { map[y.id] = y.ad_soyad; }); setYatirimciMap(map); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = location.state?.openDetailId;
    if (!id) return;
    (async () => {
      try { const res = await ikinciElMotorService.getById(id); setDetayModal({ open: true, data: res.data }); } catch {}
    })();
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state]);

  const handleDelete = async (id) => {
    if (!window.confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    try { await ikinciElMotorService.delete(id); loadData(); } catch (err) { alert(err.response?.data?.message || 'Hata'); }
  };

  const detayAc = async (id) => {
    try { const res = await ikinciElMotorService.getById(id); setDetayModal({ open: true, data: res.data }); } catch {}
  };
  const detayKapat = () => setDetayModal({ open: false, data: null });

  return { motorlar, stats, stokMotorlar, yatirimciMap, detayModal, detayAc, detayKapat, yenile: loadData, sil: handleDelete };
};
