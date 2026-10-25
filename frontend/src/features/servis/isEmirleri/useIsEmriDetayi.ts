import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isEmriService } from '../servisApi';
import type { IsEmriDetayi } from '../../../shared/tipler';

interface DetayDurumu {
  open: boolean;
  data: IsEmriDetayi | null;
}

// Detay penceresi: kaydı sunucudan çekip açar. Başka sayfadan `state.openDetailId` ile gelinirse otomatik açar
// ve konum durumunu temizler (geri dönünce yeniden açılmasın).
export const useIsEmriDetayi = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [detayModal, setDetayModal] = useState<DetayDurumu>({ open: false, data: null });

  const ac = useCallback(async (id: number) => {
    try {
      const res = await isEmriService.getById(id);
      setDetayModal({ open: true, data: res.data });
    } catch {}
  }, []);
  const kapat = () => setDetayModal({ open: false, data: null });

  useEffect(() => {
    const id = (location.state as { openDetailId?: number } | null)?.openDetailId;
    if (!id) return;
    ac(id);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate, ac]);

  return { ...detayModal, ac, kapat };
};
