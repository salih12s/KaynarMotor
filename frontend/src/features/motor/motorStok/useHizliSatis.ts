import { useState } from 'react';
import { sayiDegeri } from '../../../shared/utils/bicim';
import { hataMesaji } from '../../../shared/api/istemci';
import { bugunYerel } from '../../../shared/utils/tarih';
import type { Motor } from '../../../shared/tipler';
import { ikinciElMotorService } from '../motorApi';
import { parseOdeme, type FormSayisi, type OdemeKalemi } from './motorStokVeri';

/** Hızlı satış penceresinin form alanları. */
export interface HizliSatisFormu {
  satis_fiyati: FormSayisi;
  noter_satis: FormSayisi;
  masraflar: FormSayisi;
  alici_adi: string;
  alici_tc: string;
  alici_telefon: string;
  alici_adres: string;
  yevmiye_no: string;
  satis_tarihi: string;
  yatirimci_kar: FormSayisi;
}

interface HizliSatisDurumu {
  open: boolean;
  motor: Motor | null;
}

// Hızlı satış penceresi: satış/alıcı alanları, parçalı ödeme kalemleri ve satışı tamamlama.
export const useHizliSatis = ({ yenile }: { yenile: () => void }) => {
  const [hizliSatis, setHizliSatis] = useState<HizliSatisDurumu>({ open: false, motor: null });
  const [satisKaydediliyor, setSatisKaydediliyor] = useState(false);
  const [hizliForm, setHizliForm] = useState<HizliSatisFormu>({
    satis_fiyati: '',
    noter_satis: '',
    masraflar: '',
    alici_adi: '',
    alici_tc: '',
    alici_telefon: '',
    alici_adres: '',
    yevmiye_no: '',
    satis_tarihi: bugunYerel(),
    yatirimci_kar: '',
  });
  // Parçalı ödeme dağılımı (hızlı satış için)
  const [odemeKalemleri, setOdemeKalemleri] = useState<OdemeKalemi[]>([]);
  const ODEME_TIPLERI = ['Nakit', 'Kart', 'Havale/EFT', 'Diğer'];
  const odemeToplam = odemeKalemleri.reduce((s, o) => s + sayiDegeri(o.tutar), 0);

  const kapat = () => setHizliSatis({ open: false, motor: null });

  const openHizliSatis = (motor: Motor) => {
    setHizliForm({
      satis_fiyati: '',
      noter_satis: '',
      masraflar: motor.masraflar || '',
      alici_adi: '',
      alici_tc: '',
      alici_telefon: '',
      alici_adres: '',
      yevmiye_no: '',
      satis_tarihi: bugunYerel(),
      yatirimci_kar: motor.yatirimci_kar || '',
    });
    setOdemeKalemleri(parseOdeme(motor.odeme_detaylari));
    setHizliSatis({ open: true, motor });
  };

  const addOdemeKalemi = () => setOdemeKalemleri([...odemeKalemleri, { tip: 'Nakit', tutar: '' }]);
  const updateOdemeKalemi = (i: number, key: keyof OdemeKalemi, val: string) =>
    setOdemeKalemleri(odemeKalemleri.map((o, idx) => (idx === i ? { ...o, [key]: val } : o)));
  const removeOdemeKalemi = (i: number) => setOdemeKalemleri(odemeKalemleri.filter((_, idx) => idx !== i));

  const handleHizliSatis = async () => {
    const motor = hizliSatis.motor;
    if (!motor) return;
    const dolular = odemeKalemleri.filter((o) => sayiDegeri(o.tutar) > 0);
    const satis = sayiDegeri(hizliForm.satis_fiyati);
    // Ödeme kalemi girildiyse kalanı otomatik hesapla; girilmediyse eski davranış (0)
    const kalan = dolular.length > 0 ? Math.max(0, satis - dolular.reduce((s, o) => s + sayiDegeri(o.tutar), 0)) : 0;
    setSatisKaydediliyor(true);
    try {
      await ikinciElMotorService.update(motor.id, {
        ...motor,
        ...hizliForm,
        durum: 'tamamlandi',
        kalan_odeme: kalan,
        odeme_detaylari: JSON.stringify(dolular),
      });
      setHizliSatis({ open: false, motor: null });
      yenile();
    } catch (err) {
      alert(hataMesaji(err, 'Hata'));
    }
    setSatisKaydediliyor(false);
  };

  return {
    hizliSatis,
    kapat,
    hizliForm,
    setHizliForm,
    satisKaydediliyor,
    odemeKalemleri,
    odemeToplam,
    ODEME_TIPLERI,
    openHizliSatis,
    addOdemeKalemi,
    updateOdemeKalemi,
    removeOdemeKalemi,
    handleHizliSatis,
  };
};

export type HizliSatisDurumuVeIslemleri = ReturnType<typeof useHizliSatis>;
