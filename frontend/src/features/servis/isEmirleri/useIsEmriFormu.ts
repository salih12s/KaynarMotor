import { useState, type KeyboardEvent } from 'react';
import { hataMesaji } from '../../../shared/api/istemci';
import { sonIstek } from '../../../shared/utils/sonIstek';
import { isEmriService } from '../servisApi';
import { musteriService } from '../../musteriler/musteriApi';
import { aksesuarStokService } from '../../aksesuar/aksesuarApi';
import { yedekParcaStokService } from '../../yedek-parca/yedekParcaApi';
import { bosForm, bosParca, kayittanForm, type IsEmriFormu, type FormParcasi } from './isEmriVeri';
import type { AksesuarStok, Musteri, Parca, YedekParcaStok } from '../../../shared/tipler';

// Hızlı yazarken eski aramanın yanıtı yeniyi ezmesin
const sonAra = sonIstek();
const sonStokAra = sonIstek();

/** Parça seçimi için aranan stok kaydı: aksesuar ya da yedek parça stoğu, hangisinden geldiği etiketiyle. */
export type StokSecenegi = (AksesuarStok | YedekParcaStok) & { stok_kaynak: string };

// Yeni iş emri / düzenleme penceresinin tüm durumu ve işlemleri. `yenile`: kaydedince listeyi yeniden çeker.
export const useIsEmriFormu = ({ yenile }: { yenile: () => void }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState<IsEmriFormu>(bosForm());
  const [parcalar, setParcalar] = useState<Parca[]>([]);
  const [newParca, setNewParca] = useState<FormParcasi>(bosParca());
  const [stokOptions, setStokOptions] = useState<StokSecenegi[]>([]);
  const [error, setError] = useState('');
  const [musteriOptions, setMusteriOptions] = useState<Musteri[]>([]);

  const kapat = () => {
    setModalOpen(false);
    setEditId(null);
  };

  const openModal = () => {
    setEditId(null);
    setFormData(bosForm());
    setParcalar([]);
    setNewParca(bosParca());
    setStokOptions([]);
    setError('');
    setModalOpen(true);
  };

  const openEditModal = async (id: number) => {
    setError('');
    try {
      const res = await isEmriService.getById(id);
      const d = res.data;
      setEditId(id);
      setFormData(kayittanForm(d));
      setParcalar(d.parcalar || []);
      setNewParca(bosParca());
      setStokOptions([]);
      setModalOpen(true);
    } catch {
      setError('İş emri yüklenemedi');
    }
  };

  const addParca = () => {
    if (!newParca.takilan_parca.trim()) return;
    setParcalar([...parcalar, { ...newParca }]);
    setNewParca(bosParca());
    setStokOptions([]);
  };

  const removeParca = (index: number) => setParcalar(parcalar.filter((_, i) => i !== index));

  // Aksesuar ve yedek parça stoğundan parça ara (isim, marka veya stok kodu/barkod ile)
  const handleStokSearch = async (q: string) => {
    if (!q || q.trim().length < 2) {
      sonStokAra.iptal();
      setStokOptions([]);
      return;
    }
    try {
      const sonuc = await sonStokAra(
        Promise.all([
          aksesuarStokService.search(q.trim()).catch(() => ({ data: [] as AksesuarStok[] })),
          yedekParcaStokService.search(q.trim()).catch(() => ({ data: [] as YedekParcaStok[] })),
        ]),
      );
      if (!sonuc) return;
      const [aks, yedek] = sonuc;
      setStokOptions([
        ...(aks.data || []).map((s) => ({ ...s, stok_kaynak: 'Aksesuar Stok' })),
        ...(yedek.data || []).map((s) => ({ ...s, stok_kaynak: 'Yedek Parça Stok' })),
      ]);
    } catch {}
  };

  // Stok kaydını parça alanlarına doldur
  const selectStok = (stok: AksesuarStok | YedekParcaStok) => {
    setNewParca({
      parca_kodu: stok.stok_kodu || '',
      takilan_parca: stok.stok_adi || '',
      adet: 1,
      birim_fiyat: stok.satis_fiyati || 0,
      maliyet: stok.alis_fiyati || 0,
    });
    setStokOptions([]);
  };

  // Barkod okutulduğunda (Enter ile) stok kodundan tam eşleşme bul
  // Yedek parça barkodları 9 ile başlar; önce olası kaynağa, bulunamazsa diğerine bakılır.
  const handleParcaKeyDown = async (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const kod = (newParca.takilan_parca || '').trim();
    if (!kod) return;
    const kaynaklar = kod.startsWith('9') ? [yedekParcaStokService, aksesuarStokService] : [aksesuarStokService, yedekParcaStokService];
    for (const servis of kaynaklar) {
      try {
        const res = await servis.getByBarkod(kod);
        if (res.data) {
          e.preventDefault();
          selectStok(res.data);
          return;
        }
      } catch {}
    }
  };

  const handleMusteriSearch = async (query: string) => {
    if (query.length < 2) return;
    try {
      const res = await sonAra(musteriService.search(query));
      if (res) setMusteriOptions(res.data);
    } catch {}
  };

  const handleMusteriSelect = (musteri: Musteri | null) => {
    if (musteri) {
      setFormData({ ...formData, musteri_ad_soyad: musteri.ad_soyad || '', telefon: musteri.telefon || '', adres: musteri.adres || '' });
    }
  };

  const handleSave = async () => {
    setError('');
    if (!formData.musteri_ad_soyad.trim()) {
      setError('Ad Soyad zorunlu');
      return;
    }
    try {
      // `odeme_tamamlandi` yalnızca ekran içindir; sunucuya kalan ödeme olarak gider
      const { odeme_tamamlandi, ...alanlar } = formData;
      const payload = { ...alanlar, parcalar, kalan_odeme: odeme_tamamlandi ? 0 : formData.kalan_odeme || 0 };
      if (editId) {
        await isEmriService.update(editId, payload);
      } else {
        await isEmriService.create(payload);
      }
      setModalOpen(false);
      setEditId(null);
      yenile();
    } catch (err) {
      setError(hataMesaji(err, 'Kaydetme hatası'));
    }
  };

  return {
    modalOpen,
    editId,
    error,
    kapat,
    openModal,
    openEditModal,
    handleSave,
    formData,
    setFormData,
    parcalar,
    newParca,
    setNewParca,
    stokOptions,
    musteriOptions,
    setMusteriOptions,
    addParca,
    removeParca,
    handleStokSearch,
    selectStok,
    handleParcaKeyDown,
    handleMusteriSearch,
    handleMusteriSelect,
  };
};

/** Formun tüm durumu ve işlemleri (pencere ve bölümler bunun parçalarını prop olarak alır). */
export type IsEmriFormuDurumu = ReturnType<typeof useIsEmriFormu>;
