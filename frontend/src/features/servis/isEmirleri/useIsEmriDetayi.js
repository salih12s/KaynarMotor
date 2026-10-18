import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isEmriService } from '../servisApi';

// Detay penceresi: kaydı sunucudan çekip açar. Başka sayfadan `state.openDetailId` ile gelinirse otomatik açar
// ve konum durumunu temizler (geri dönünce yeniden açılmasın).
export const useIsEmriDetayi = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [detayModal, setDetayModal] = useState({ open: false, data: null });

  const ac = async (id) => {
    try { const res = await isEmriService.getById(id); setDetayModal({ open: true, data: res.data }); } catch {}
  };
  const kapat = () => setDetayModal({ open: false, data: null });

  useEffect(() => {
    const id = location.state?.openDetailId;
    if (!id) return;
    ac(id);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state]);

  return { ...detayModal, ac, kapat };
};
