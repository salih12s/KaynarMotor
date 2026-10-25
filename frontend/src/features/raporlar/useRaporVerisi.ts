import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { raporService } from './raporApi';
import { aksesuarStokService } from '../aksesuar/aksesuarApi';
import { yerelTarih } from '../../shared/utils/tarih';

const BOS: never[] = [];

// Önbellek anahtarları. Tarihe bağlı olanlar aralığı anahtarda taşır: her aralık ayrı saklanır, geç gelen eski yanıt
// yeni aralığın üzerine yazamaz (eskiden bunu elle `sonIstek` sağlıyordu).
export const raporAnahtari = {
  hepsi: ['raporlar'],
  aralik: (b: string, e: string) => ['raporlar', 'aralik', { b, e }],
  fisKar: (b: string, e: string) => ['raporlar', 'fisKar', { b, e }],
  yatirimciOzet: (b: string, e: string) => ['raporlar', 'yatirimciOzet', { b, e }],
  personeller: ['raporlar', 'personeller'],
  stok: ['aksesuarStok', 'liste'],
};

// Hata ekrana düşmeden önce konsola da yazılsın (eski davranış)
const konsolaYaz =
  <T>(istek: () => Promise<{ data: T }>) =>
  async (): Promise<T> => {
    try {
      return (await istek()).data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

/** Tarih aralığı hızlı seçimleri (TarihFiltresi düğmeleri). */
export type PresetAdi = 'bugun' | 'buAy' | 'gecenAy' | 'buYil' | 'gecenYil';
export type Presetler = Record<PresetAdi, () => void>;

// Raporlar ekranının verisi: tarih aralığı + sunucudan gelen rapor/fiş kârı/personel/stok/yatırımcı özeti.
// Yatırımcı kendi ekranında (YatirimciRapor) veriyi kendisi çeker; bu yüzden `yatirimci` iken hiçbir şey istenmez.
export const useRaporVerisi = ({ yatirimci, admin }: { yatirimci: boolean; admin: boolean }) => {
  const bugun = new Date();
  const [baslangic, setBaslangic] = useState(yerelTarih(new Date(bugun.getFullYear(), bugun.getMonth(), 1)));
  const [bitis, setBitis] = useState(yerelTarih(new Date(bugun.getFullYear(), bugun.getMonth() + 1, 0)));

  // Hızlı tarih ön ayarları — filtreyi tek tıkla veri olan aralığa taşımak için
  const aralik = (b: Date, e: Date) => {
    setBaslangic(yerelTarih(b));
    setBitis(yerelTarih(e));
  };
  const presetler: Presetler = {
    bugun: () => {
      const t = new Date();
      aralik(t, t);
    },
    buAy: () => {
      const t = new Date();
      aralik(new Date(t.getFullYear(), t.getMonth(), 1), new Date(t.getFullYear(), t.getMonth() + 1, 0));
    },
    gecenAy: () => {
      const t = new Date();
      aralik(new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 0));
    },
    buYil: () => {
      const t = new Date();
      aralik(new Date(t.getFullYear(), 0, 1), new Date(t.getFullYear(), 11, 31));
    },
    gecenYil: () => {
      const t = new Date();
      aralik(new Date(t.getFullYear() - 1, 0, 1), new Date(t.getFullYear() - 1, 11, 31));
    },
  };

  const etkin = !yatirimci;
  // Tarihe bağlı veriler: sayfa her açılışta tazelenir (başka ekranda yapılan satış raporda hemen görünsün);
  // aralık değişirken yeni veri gelene kadar eskisi tutulur (ekran boşa düşmez, yükleniyor göstergesi çıkar).
  const tarihli = { enabled: etkin, refetchOnMount: 'always' as const, placeholderData: keepPreviousData };

  const rapor = useQuery({
    queryKey: raporAnahtari.aralik(baslangic, bitis),
    queryFn: konsolaYaz(() => raporService.getAralik(baslangic, bitis)),
    ...tarihli,
  });
  const fisKar = useQuery({
    queryKey: raporAnahtari.fisKar(baslangic, bitis),
    queryFn: konsolaYaz(() => raporService.getFisKar(baslangic, bitis)),
    ...tarihli,
  });
  const yatirimciOzet = useQuery({
    queryKey: raporAnahtari.yatirimciOzet(baslangic, bitis),
    queryFn: async () => (await raporService.getYatirimciOzet(baslangic, bitis)).data,
    ...tarihli,
    enabled: etkin && !!admin,
  });
  // Tarihe bağlı değil: bir kez istenir (eskiden her aralık değişiminde yeniden isteniyordu)
  const personeller = useQuery({
    queryKey: raporAnahtari.personeller,
    queryFn: async () => (await raporService.getPersoneller()).data,
    enabled: etkin,
  });
  const stok = useQuery({
    queryKey: raporAnahtari.stok,
    queryFn: async () => (await aksesuarStokService.getAll()).data,
    enabled: etkin,
  });

  // Rapor ve fiş kârı birlikte yüklenir: biri bitip diğeri sürerken ekran erken açılmaz
  const loading = rapor.isFetching || fisKar.isFetching;
  // Placeholder (önceki aralık) verisi hata durumunda gösterilmez: yanlış aralığın raporu ekranda kalmasın
  const error = rapor.isError ? 'Rapor yüklenirken hata oluştu' : fisKar.isError ? 'Fiş kâr verileri yüklenirken hata oluştu' : '';

  return {
    baslangic,
    bitis,
    setBaslangic,
    setBitis,
    presetler,
    rapor: rapor.data ?? null,
    fisKar: fisKar.data ?? null,
    loading,
    error,
    personeller: personeller.data ?? BOS,
    stokOptions: stok.data ?? BOS,
    yatirimciOzet: yatirimciOzet.data ?? BOS,
  };
};
