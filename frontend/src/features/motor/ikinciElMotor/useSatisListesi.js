import { useOnay } from '../../../shared/ui';
import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ikinciElMotorService } from '../motorApi';
import { useMotorListesi, useMotorIstatistik, useYatirimcilar, useMotorYenile } from '../motorSorgulari';

// Veri gelene kadar her render'da yeni nesne üretilmesin
const BOS = [];
const BOS_NESNE = {};

// Satış listesi (yalnızca "tamamlandi" motorlar), istatistikler, stoktaki motorlar (plaka seçimi), yatırımcı adları, silme ve detay penceresi.
// Başka sayfadan `state.openDetailId` ile gelinirse detay otomatik açılır ve konum durumu temizlenir.
// Liste ve yatırımcılar Motor Stok ile ortak önbellekten gelir (motorSorgulari.js).
export const useSatisListesi = () => {
  const onay = useOnay();
  const location = useLocation();
  const navigate = useNavigate();
  const [detayModal, setDetayModal] = useState({ open: false, data: null });

  const liste = useMotorListesi();
  const istatistik = useMotorIstatistik();
  // Yetki yoksa (403) sessiz geçilir: ibare yine "Yatırımcı Motoru" gösterir
  const yatirimcilar = useYatirimcilar();
  const yenile = useMotorYenile();

  const tumu = liste.data ?? BOS;
  const motorlar = useMemo(() => tumu.filter((m) => m.durum === 'tamamlandi'), [tumu]);
  const stokMotorlar = useMemo(() => tumu.filter((m) => m.durum === 'stokta' || m.durum === 'kapora'), [tumu]);
  // id -> ad_soyad (ibarede isim göstermek için)
  const yatirimciMap = useMemo(() => {
    const map = {};
    (yatirimcilar.data ?? BOS).forEach((y) => {
      map[y.id] = y.ad_soyad;
    });
    return map;
  }, [yatirimcilar.data]);

  useEffect(() => {
    const id = location.state?.openDetailId;
    if (!id) return;
    (async () => {
      try {
        const res = await ikinciElMotorService.getById(id);
        setDetayModal({ open: true, data: res.data });
      } catch {}
    })();
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state]);

  const handleDelete = async (id) => {
    if (!(await onay('Bu kaydı silmek istediğinizden emin misiniz?'))) return;
    try {
      await ikinciElMotorService.delete(id);
      yenile();
    } catch (err) {
      alert(err.response?.data?.message || 'Hata');
    }
  };

  const detayAc = async (id) => {
    try {
      const res = await ikinciElMotorService.getById(id);
      setDetayModal({ open: true, data: res.data });
    } catch {}
  };
  const detayKapat = () => setDetayModal({ open: false, data: null });

  return {
    motorlar,
    stats: istatistik.data ?? BOS_NESNE,
    stokMotorlar,
    yatirimciMap,
    detayModal,
    detayAc,
    detayKapat,
    yenile,
    sil: handleDelete,
  };
};
