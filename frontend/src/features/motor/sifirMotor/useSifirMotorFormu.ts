import { useState } from 'react';
import { bildir } from '../../../shared/ui';
import { hataMesaji } from '../../../shared/api/istemci';
import type { SifirMotor } from '../../../shared/tipler';
import { sifirMotorService } from '../motorApi';
import { useGorselListesi } from '../../vitrin/yonetim/useGorselListesi';
import { urlDenDataUrl } from '../../vitrin/yonetim/gorselIsle';
import type { BildirimTuru } from '../../vitrin/yonetim/tipler';
import { bosSifirForm, sifirdenForm, type SifirMotorFormu } from './sifirVeri';

const TUR = { success: 'bilgi', info: 'bilgi', warning: 'uyari', error: 'hata' } as const;
const gorselBildir = (mesaj: string, tur: BildirimTuru = 'error') => bildir(mesaj, TUR[tur]);

// Sıfır motor ekleme/düzenleme penceresi: alanlar, fotoğraflar (ilki vitrin fotoğrafı), kaydetme. `yenile`: kaydedince listeyi tazeler.
export const useSifirMotorFormu = ({ yenile }: { yenile: () => void }) => {
  const [acik, setAcik] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState<SifirMotor | null>(null);
  const [form, setForm] = useState<SifirMotorFormu>(bosSifirForm());
  const [hata, setHata] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [gorselYukleniyor, setGorselYukleniyor] = useState(false);
  const [gorselOkunamadi, setGorselOkunamadi] = useState(false);
  const gorselListesi = useGorselListesi(gorselBildir);

  const ac = async (model: SifirMotor | null = null) => {
    setHata('');
    setDuzenlenen(model);
    setForm(model ? sifirdenForm(model) : bosSifirForm());
    gorselListesi.setGorseller([]);
    setGorselOkunamadi(false);
    setAcik(true);
    if (!model?.gorsel_sayisi) return;
    // Kayıtlı fotoğraflar forma alınır: kaydedince liste tamamen yeniden gönderilir (sıra/kapak değişikliği dahil)
    setGorselYukleniyor(true);
    try {
      const { data } = await sifirMotorService.getById(model.id);
      gorselListesi.setGorseller(await Promise.all((data.gorsel_idler || []).map((id) => urlDenDataUrl(sifirMotorService.gorselUrl(id)))));
    } catch {
      setGorselOkunamadi(true);
      setHata('Fotoğraflar yüklenemedi. Kaydederseniz mevcut fotoğraflar silinmez.');
    }
    setGorselYukleniyor(false);
  };

  const kapat = () => setAcik(false);

  const kaydet = async () => {
    if (!form.marka.trim()) {
      setHata('Marka zorunlu');
      return;
    }
    setHata('');
    setKaydediliyor(true);
    // Fotoğraflar yüklenemediyse gönderilmez: sunucu mevcut fotoğraflara dokunmaz
    const govde = { ...form, ...(gorselYukleniyor || gorselOkunamadi ? {} : { gorseller: gorselListesi.gorseller }) };
    try {
      if (duzenlenen) await sifirMotorService.update(duzenlenen.id, govde);
      else await sifirMotorService.create(govde);
      setAcik(false);
      yenile();
    } catch (err) {
      setHata(hataMesaji(err, 'Kaydedilemedi'));
    }
    setKaydediliyor(false);
  };

  return { acik, ac, kapat, duzenlenen, form, setForm, hata, kaydediliyor, gorselYukleniyor, gorselOkunamadi, gorselListesi, kaydet };
};

export type SifirMotorFormuDurumu = ReturnType<typeof useSifirMotorFormu>;
