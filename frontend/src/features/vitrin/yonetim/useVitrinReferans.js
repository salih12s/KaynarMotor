import { useState, useEffect, useCallback } from 'react';
import { vitrinService } from '../vitrinApi';
import { ikinciElMotorService } from '../../motor/motorApi';
import { aksesuarStokService } from '../../aksesuar/aksesuarApi';
import { SEGMENTLER } from '../vitrinSabitleri';

// Formlar için yardımcı veriler: segment listesi, kategori iletişim kayıtları, video boyut sınırı, stoktaki motor ve aksesuarlar.
export const useVitrinReferans = () => {
  const [segmentler, setSegmentler] = useState(SEGMENTLER); // dinamik segment listesi (adlar)
  const [iletisim, setIletisim] = useState({}); // { kategori: {personel_adi, telefon} }
  const [stokMotorlar, setStokMotorlar] = useState([]); // stoktaki motorlar (vitrine aktarma için)
  const [stokAksesuarlar, setStokAksesuarlar] = useState([]); // aksesuar stok (vitrine aktarma için)
  const [videoLimitMb, setVideoLimitMb] = useState(40); // sunucudan öğrenilir (veritabanı paket sınırına bağlı)

  const loadIletisim = useCallback(async () => {
    try {
      const res = await vitrinService.getIletisim();
      const map = {};
      res.data.forEach((r) => {
        map[r.kategori] = r;
      });
      setIletisim(map);
    } catch {
      /* sessiz */
    }
  }, []);

  const loadSegmentler = useCallback(async () => {
    try {
      const res = await vitrinService.getSegmentler();
      if (res.data?.length) setSegmentler(res.data.map((s) => s.ad));
    } catch {
      /* varsayılan listede kalır */
    }
  }, []);

  useEffect(() => {
    loadIletisim();
  }, [loadIletisim]);
  useEffect(() => {
    loadSegmentler();
  }, [loadSegmentler]);
  useEffect(() => {
    vitrinService
      .getYuklemeSiniri()
      .then((res) => {
        if (res.data?.video_mb) setVideoLimitMb(res.data.video_mb);
      })
      .catch(() => {
        /* varsayılan sınırda kalır */
      });
  }, []);

  // Stoktaki (satılmamış) motorları yükle — vitrine aktarma için
  useEffect(() => {
    ikinciElMotorService
      .getAll()
      .then((res) => setStokMotorlar((res.data || []).filter((m) => m.durum !== 'tamamlandi' && m.durum !== 'perte')))
      .catch(() => {
        /* yetki yoksa boş kalır */
      });
  }, []);

  // Aksesuar stoğunu yükle — aksesuar ilanını otomatik doldurmak için
  useEffect(() => {
    aksesuarStokService
      .getAll()
      .then((res) => setStokAksesuarlar(res.data || []))
      .catch(() => {
        /* yetki yoksa boş kalır */
      });
  }, []);

  return { segmentler, iletisim, loadIletisim, stokMotorlar, stokAksesuarlar, videoLimitMb };
};
