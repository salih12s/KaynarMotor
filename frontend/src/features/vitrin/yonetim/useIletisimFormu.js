import { useState } from 'react';
import { vitrinService } from '../vitrinApi';
import { resizeImage } from './gorselIsle';

// Kategori iletişim / hizmet sayfası penceresi: personel, telefon, açıklama ve (hizmet sayfalarında) görsel.
export const useIletisimFormu = ({ kategori, iletisim, yenileIletisim, bildir }) => {
  const [iletDlg, setIletDlg] = useState(false);
  const [iletForm, setIletForm] = useState({ personel_adi: '', telefon: '', personel_adi_2: '', telefon_2: '', aciklama: '', baslik: '' });
  const [iletGorsel, setIletGorsel] = useState(null); // yeni seçilen hizmet görseli (base64)
  const [iletGorselVar, setIletGorselVar] = useState(false);
  const [iletGorselSil, setIletGorselSil] = useState(false);

  const openIletisim = () => {
    const cur = iletisim[kategori] || {};
    setIletForm({
      personel_adi: cur.personel_adi || '',
      telefon: cur.telefon || '',
      personel_adi_2: cur.personel_adi_2 || '',
      telefon_2: cur.telefon_2 || '',
      aciklama: cur.aciklama || '',
      baslik: cur.baslik || '',
    });
    setIletGorsel(null);
    setIletGorselSil(false);
    setIletGorselVar(!!cur.gorsel_var);
    setIletDlg(true);
  };

  const handleIletGorsel = async (e) => {
    const file = (e.target.files || [])[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = await resizeImage(file, 1280, 0.75);
      setIletGorsel(data);
      setIletGorselSil(false);
    } catch {
      bildir('Görsel işlenemedi', 'error');
    }
  };

  const removeIletGorsel = () => {
    setIletGorsel(null);
    if (iletGorselVar) setIletGorselSil(true);
  };

  const handleSaveIletisim = async () => {
    try {
      const payload = { ...iletForm };
      if (iletGorsel) payload.gorsel = iletGorsel;
      else if (iletGorselSil) payload.gorsel_sil = true;
      await vitrinService.updateIletisim(kategori, payload);
      setIletDlg(false);
      bildir('Kaydedildi');
      yenileIletisim();
    } catch {
      bildir('Kaydedilemedi', 'error');
    }
  };

  const kapat = () => setIletDlg(false);

  return {
    iletDlg,
    kapat,
    iletForm,
    setIletForm,
    iletGorsel,
    iletGorselVar,
    iletGorselSil,
    openIletisim,
    handleIletGorsel,
    removeIletGorsel,
    handleSaveIletisim,
  };
};
