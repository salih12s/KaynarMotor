import { useState } from 'react';
import { sonIstek } from '../../../shared/utils/sonIstek';
import { isEmriService } from '../servisApi';
import { musteriService } from '../../musteriler/musteriApi';
import { aksesuarStokService } from '../../aksesuar/aksesuarApi';
import { yedekParcaStokService } from '../../yedek-parca/yedekParcaApi';
import { bosForm, bosParca, kayittanForm } from './isEmriVeri';

// Hızlı yazarken eski aramanın yanıtı yeniyi ezmesin
const sonAra = sonIstek();
const sonStokAra = sonIstek();

// Yeni iş emri / düzenleme penceresinin tüm durumu ve işlemleri. `yenile`: kaydedince listeyi yeniden çeker.
export const useIsEmriFormu = ({ yenile }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(bosForm());
  const [parcalar, setParcalar] = useState([]);
  const [newParca, setNewParca] = useState(bosParca());
  const [stokOptions, setStokOptions] = useState([]);
  const [error, setError] = useState('');
  const [musteriOptions, setMusteriOptions] = useState([]);

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

  const openEditModal = async (id) => {
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

  const removeParca = (index) => setParcalar(parcalar.filter((_, i) => i !== index));

  // Aksesuar ve yedek parça stoğundan parça ara (isim, marka veya stok kodu/barkod ile)
  const handleStokSearch = async (q) => {
    if (!q || q.trim().length < 2) {
      sonStokAra.iptal();
      setStokOptions([]);
      return;
    }
    try {
      const sonuc = await sonStokAra(
        Promise.all([aksesuarStokService.search(q.trim()).catch(() => ({ data: [] })), yedekParcaStokService.search(q.trim()).catch(() => ({ data: [] }))]),
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
  const selectStok = (stok) => {
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
  const handleParcaKeyDown = async (e) => {
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

  const handleMusteriSearch = async (query) => {
    if (query.length < 2) return;
    try {
      const res = await sonAra(musteriService.search(query));
      if (res) setMusteriOptions(res.data);
    } catch {}
  };

  const handleMusteriSelect = (musteri) => {
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
      const payload = { ...formData, parcalar, kalan_odeme: formData.odeme_tamamlandi ? 0 : formData.kalan_odeme || 0 };
      delete payload.odeme_tamamlandi;
      if (editId) {
        await isEmriService.update(editId, payload);
      } else {
        await isEmriService.create(payload);
      }
      setModalOpen(false);
      setEditId(null);
      yenile();
    } catch (err) {
      setError(err.response?.data?.message || 'Kaydetme hatası');
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
