// Aksesuar ve yedek parça stok sayfalarının ortak mantığı (ekran yok): liste yükleme, gecikmeli arama, ekleme/düzenleme penceresi,
// silme onayı, toplu içe aktarma, özet sayıları. Sayfalar yalnızca kendi alanlarını (form, süzgeç, tablo) çizer.
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AxiosResponse } from 'axios';
import { hataMesaji, type Govde } from '../api/istemci';
import { useOnay } from '../ui';
import { sayiDegeri, type Sayi } from '../utils/bicim';
import { sonIstek } from '../utils/sonIstek';

/** Ortak stok satırı: özet ve süzgeç yalnız bu alanlara bakar. */
export interface StokSatiri {
  id: number;
  mevcut?: number | null;
  alis_fiyati?: Sayi;
}

/** Stok API'sinin (aksesuarStokService / yedekParcaStokService) kullanılan yüzü. */
export interface StokServisi<T> {
  getAll: () => Promise<AxiosResponse<T[]>>;
  search: (q: string) => Promise<AxiosResponse<T[]>>;
  getNextStokKodu: () => Promise<AxiosResponse<{ nextStokKodu: string }>>;
  create: (data: Govde) => Promise<unknown>;
  update: (id: number, data: Govde) => Promise<unknown>;
  delete: (id: number) => Promise<unknown>;
  topluEkle: (stoklar: Govde[]) => Promise<unknown>;
}

interface Secenekler<T, F> {
  servis: StokServisi<T>;
  /** Kayıtlı stoktan düzenleme formunu kurar. */
  kayittanForm: (stok: T) => F;
  /** Yeni stok formu; sunucudan gelen sıradaki stok kodu verilir. */
  yeniForm: (stokKodu: string) => F;
  /** Sayfaya özgü ek süzgeç (ör. aksesuarda kategori); stok durumu süzgecine EK olarak uygulanır. */
  ekSuzgec?: (stok: T) => boolean;
}

export const useStokYonetimi = <T extends StokSatiri, F extends { stok_kodu: string }>({ servis, kayittanForm, yeniForm, ekSuzgec }: Secenekler<T, F>) => {
  const onay = useOnay();
  // Hızlı yazarken eski aramanın yanıtı yeniyi ezmesin (her ekran kendi koruyucusunu taşır)
  const sonAra = useMemo(() => sonIstek(), []);
  const [stoklar, setStoklar] = useState<T[]>([]);
  const [dialog, setDialog] = useState<{ open: boolean; data: T | null }>({ open: false, data: null });
  const [importDialog, setImportDialog] = useState(false);
  const [importText, setImportText] = useState('');
  const [formData, setFormData] = useState<F>(() => yeniForm(''));
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [stokFilter, setStokFilter] = useState('');

  const loadData = useCallback(async () => {
    try {
      const res = await servis.getAll();
      setStoklar(res.data);
    } catch {}
  }, [servis]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = useCallback(async () => {
    if (!search.trim()) {
      sonAra.iptal();
      return loadData();
    }
    try {
      const res = await sonAra(servis.search(search));
      if (res) setStoklar(res.data);
    } catch {}
  }, [search, loadData, servis, sonAra]);

  useEffect(() => {
    const t = setTimeout(() => void handleSearch(), 300);
    return () => clearTimeout(t);
  }, [handleSearch]);

  const openDialog = async (stok: T | null = null) => {
    setError('');
    if (stok) {
      setFormData(kayittanForm(stok));
    } else {
      let nextKodu = '';
      try {
        const res = await servis.getNextStokKodu();
        nextKodu = res.data.nextStokKodu;
      } catch {}
      setFormData(yeniForm(nextKodu));
    }
    setDialog({ open: true, data: stok });
  };

  const closeDialog = () => setDialog({ open: false, data: null });

  const handleSave = async () => {
    setError('');
    try {
      if (dialog.data) {
        await servis.update(dialog.data.id, formData);
      } else {
        await servis.create(formData);
      }
      closeDialog();
      loadData();
    } catch (err) {
      setError(hataMesaji(err, 'Hata'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await onay('Bu stok kaydını silmek istediğinizden emin misiniz?', { baslik: 'Stok kaydını sil' }))) return;
    try {
      await servis.delete(id);
      loadData();
    } catch (err) {
      alert(hataMesaji(err, 'Hata'));
    }
  };

  // Her satır Tab ile ayrılmış: Stok Kodu, Ad, Alış, Satış, Miktar
  const handleImport = async () => {
    setError('');
    try {
      const lines = importText
        .trim()
        .split('\n')
        .filter((l) => l.trim());
      const items = lines.map((line) => {
        const parts = line.split('\t').map((p) => p.trim());
        return { stok_kodu: parts[0] || '', stok_adi: parts[1] || '', alis_fiyati: parts[2] || 0, satis_fiyati: parts[3] || 0, giren_miktar: parts[4] || 0 };
      });
      await servis.topluEkle(items);
      setImportDialog(false);
      setImportText('');
      loadData();
    } catch (err) {
      setError(hataMesaji(err, 'İçe aktarma hatası'));
    }
  };

  const totalUrun = stoklar.length;
  const envanter = stoklar.reduce((acc, s) => acc + sayiDegeri(s.alis_fiyati) * parseInt(String(s.mevcut || 0)), 0);

  const filteredStoklar = stoklar.filter((s) => {
    const matchEk = !ekSuzgec || ekSuzgec(s);
    const matchStok = !stokFilter || (stokFilter === 'biten' ? (s.mevcut || 0) <= 0 : (s.mevcut || 0) > 0);
    return matchEk && matchStok;
  });

  return {
    stoklar,
    filteredStoklar,
    totalUrun,
    envanter,
    dialog,
    openDialog,
    closeDialog,
    formData,
    setFormData,
    handleSave,
    handleDelete,
    importDialog,
    setImportDialog,
    importText,
    setImportText,
    handleImport,
    error,
    search,
    setSearch,
    stokFilter,
    setStokFilter,
  };
};
