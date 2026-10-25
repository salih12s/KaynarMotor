import { useState, type ChangeEvent } from 'react';
import type { VitrinIletisim } from '../../../shared/tipler';
import { vitrinService } from '../vitrinApi';
import { resizeImage } from './gorselIsle';
import type { Bildir } from './tipler';

/** İletişim / hizmet sayfası penceresinin metin alanları. */
export interface IletisimFormu {
  personel_adi: string;
  telefon: string;
  personel_adi_2: string;
  telefon_2: string;
  aciklama: string;
  baslik: string;
}

interface IletisimFormuGirdisi {
  kategori: string;
  iletisim: Record<string, VitrinIletisim>;
  yenileIletisim: () => void;
  bildir: Bildir;
}

// Kategori iletişim / hizmet sayfası penceresi: personel, telefon, açıklama ve (hizmet sayfalarında) görsel.
export const useIletisimFormu = ({ kategori, iletisim, yenileIletisim, bildir }: IletisimFormuGirdisi) => {
  const [iletDlg, setIletDlg] = useState(false);
  const [iletForm, setIletForm] = useState<IletisimFormu>({ personel_adi: '', telefon: '', personel_adi_2: '', telefon_2: '', aciklama: '', baslik: '' });
  const [iletGorsel, setIletGorsel] = useState<string | null>(null); // yeni seçilen hizmet görseli (base64)
  const [iletGorselVar, setIletGorselVar] = useState(false);
  const [iletGorselSil, setIletGorselSil] = useState(false);

  const openIletisim = () => {
    const cur: Partial<VitrinIletisim> = iletisim[kategori] || {};
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

  const handleIletGorsel = async (e: ChangeEvent<HTMLInputElement>) => {
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
      const payload: Record<string, unknown> = { ...iletForm };
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

export type IletisimFormuDurumu = ReturnType<typeof useIletisimFormu>;
