import { useState, useEffect } from 'react';
import { raporService } from './raporApi';
import { aksesuarStokService } from '../aksesuar/aksesuarApi';
import { sonIstek } from '../../shared/utils/sonIstek';

// Tarih aralığı hızlı değişirken eski isteğin yanıtı yenisini ezmesin
const sonRapor = sonIstek();
const sonFisKar = sonIstek();

// Yerel tarihi YYYY-AA-GG biçimine çevirir (UTC kayması olmadan)
const yerelTarih = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Raporlar ekranının verisi: tarih aralığı + sunucudan gelen rapor/fiş kârı/personel/stok/yatırımcı özeti.
// Yatırımcı kendi ekranında (YatirimciRapor) veriyi kendisi çeker; bu yüzden `yatirimci` iken hiçbir şey istenmez.
export const useRaporVerisi = ({ yatirimci, admin }) => {
  const bugun = new Date();
  const [baslangic, setBaslangic] = useState(yerelTarih(new Date(bugun.getFullYear(), bugun.getMonth(), 1)));
  const [bitis, setBitis] = useState(yerelTarih(new Date(bugun.getFullYear(), bugun.getMonth() + 1, 0)));
  const [rapor, setRapor] = useState(null);
  const [fisKar, setFisKar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [personeller, setPersoneller] = useState([]);
  const [stokOptions, setStokOptions] = useState([]);
  const [yatirimciOzet, setYatirimciOzet] = useState([]);

  // Hızlı tarih ön ayarları — filtreyi tek tıkla veri olan aralığa taşımak için
  const aralik = (b, e) => { setBaslangic(yerelTarih(b)); setBitis(yerelTarih(e)); };
  const presetler = {
    bugun: () => { const t = new Date(); aralik(t, t); },
    buAy: () => { const t = new Date(); aralik(new Date(t.getFullYear(), t.getMonth(), 1), new Date(t.getFullYear(), t.getMonth() + 1, 0)); },
    gecenAy: () => { const t = new Date(); aralik(new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 0)); },
    buYil: () => { const t = new Date(); aralik(new Date(t.getFullYear(), 0, 1), new Date(t.getFullYear(), 11, 31)); },
    gecenYil: () => { const t = new Date(); aralik(new Date(t.getFullYear() - 1, 0, 1), new Date(t.getFullYear() - 1, 11, 31)); },
  };

  const loadRapor = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await sonRapor(raporService.getAralik(baslangic, bitis));
      if (!res) return; // tarih aralığı bu arada değişti: eski yanıt yok sayılır
      setRapor(res.data);
    } catch (err) {
      setError('Rapor yüklenirken hata oluştu');
      console.error(err);
    }
    setLoading(false);
  };

  const loadFisKar = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await sonFisKar(raporService.getFisKar(baslangic, bitis));
      if (!res) return;
      setFisKar(res.data);
    } catch (err) {
      setError('Fiş kâr verileri yüklenirken hata oluştu');
      console.error(err);
    }
    setLoading(false);
  };

  // Yalnızca tarih aralığı değişince yeniden çekilir (rol oturum boyunca sabittir).
  useEffect(() => {
    if (yatirimci) return;
    loadRapor();
    loadFisKar();
    raporService.getPersoneller().then(r => setPersoneller(r.data)).catch(() => {});
    aksesuarStokService.getAll().then(r => setStokOptions(r.data)).catch(() => {});
    if (admin) raporService.getYatirimciOzet(baslangic, bitis).then(r => setYatirimciOzet(r.data)).catch(() => {});
  }, [baslangic, bitis]);

  return { baslangic, bitis, setBaslangic, setBitis, presetler, rapor, fisKar, loading, error, personeller, stokOptions, yatirimciOzet };
};
