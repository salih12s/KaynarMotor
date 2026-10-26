import { useState } from 'react';
import { hataMesaji } from '../../../shared/api/istemci';
import { sonIstek } from '../../../shared/utils/sonIstek';
import type { Motor, Musteri, SifirMotor } from '../../../shared/tipler';
import { ikinciElMotorService } from '../motorApi';
import { musteriService } from '../../musteriler/musteriApi';
import { bekleyenBelgeleriYukle } from '../SatisBelgeleri';
import { ilkForm, bosForm, motordenForm, hesaplaCanliKar, sifirdenSatisFormu, ikinciElFormu, type MotorSatisFormu } from './satisVeri';
import { bildir } from '../../../shared/ui';

// Hızlı yazarken eski aramanın yanıtı yeniyi ezmesin
const sonAra = sonIstek();

interface SatisDialogDurumu {
  open: boolean;
  data: Motor | null;
}

// Satış ekleme/düzenleme penceresi. `salt`: muhasebeci (salt okunur, form açılmaz). `yenile`: kaydedince listeyi yeniden çeker.
export const useSatisFormu = ({ salt, yenile }: { salt: boolean; yenile: () => void }) => {
  const [dialog, setDialog] = useState<SatisDialogDurumu>({ open: false, data: null });
  const [formData, setFormData] = useState<MotorSatisFormu>(ilkForm());
  const [error, setError] = useState('');
  // Yeni satışta seçilen, kayıt sonrası yüklenecek belgeler
  const [bekleyenBelgeler, setBekleyenBelgeler] = useState<File[]>([]);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [selectedStokId, setSelectedStokId] = useState<number | null>(null);
  const [musteriOptions, setMusteriOptions] = useState<Musteri[]>([]);

  const searchMusteri = async (query: string) => {
    if (!query || query.length < 2) {
      setMusteriOptions([]);
      return;
    }
    try {
      const res = await sonAra(musteriService.search(query));
      if (res) setMusteriOptions(res.data);
    } catch {
      setMusteriOptions([]);
    }
  };

  const kapat = () => setDialog({ open: false, data: null });

  // `sifirModel` verilirse yeni satış o sıfır modelle açılır (Motor Stok > Sıfır > "Satış gir")
  const openDialog = (motor: Motor | null = null, sifirModel: SifirMotor | null = null) => {
    if (salt) return;
    setError('');
    setSelectedStokId(null);
    setBekleyenBelgeler([]);
    setFormData(motor ? motordenForm(motor) : sifirModel ? sifirdenSatisFormu(bosForm(), sifirModel) : bosForm());
    setDialog({ open: true, data: motor });
  };

  // Yeni satışta tür seçimi: sıfıra geçince stoktan seçilmiş ikinci el kaydı bırakılır
  const turSec = (tur: 'sifir' | 'ikinci_el') => {
    setSelectedStokId(null);
    setFormData((f) => (tur === 'sifir' ? { ...f, motor_durumu: 'sifir', durum: 'tamamlandi', plaka: '' } : ikinciElFormu(f)));
  };
  const sifirSec = (model: SifirMotor | null) =>
    setFormData((f) => (model ? sifirdenSatisFormu(f, model) : { ...f, sifir_motor_id: '', marka: '', model: '', yil: '', alis_fiyati: '', satis_fiyati: '' }));

  const handleSave = async () => {
    setError('');
    setKaydediliyor(true);
    try {
      // `odeme_tamamlandi` yalnızca ekran içindir; sunucuya kalan ödeme olarak gider
      const { odeme_tamamlandi, ...alanlar } = formData;
      if (alanlar.motor_durumu === 'sifir' && !alanlar.sifir_motor_id) {
        setError('Sıfır stoktan bir model seçin');
        setKaydediliyor(false);
        return;
      }
      const payload = { ...alanlar, kalan_odeme: odeme_tamamlandi ? 0 : formData.kalan_odeme || 0 };
      let motorId: number;
      if (dialog.data) {
        await ikinciElMotorService.update(dialog.data.id, payload);
        motorId = dialog.data.id;
      } else if (selectedStokId) {
        // Stoktan seçilen motor - güncelle ve eski_kayit kaldır
        await ikinciElMotorService.update(selectedStokId, { ...payload, eski_kayit: false });
        motorId = selectedStokId;
      } else {
        const res = await ikinciElMotorService.create(payload);
        motorId = res.data.id;
      }
      // Satış kaydedildi; diyalogda seçilen belgeler şimdi bu satışa yüklenir
      const belgeHatalari = bekleyenBelgeler.length ? await bekleyenBelgeleriYukle(motorId, bekleyenBelgeler) : [];
      setDialog({ open: false, data: null });
      setSelectedStokId(null);
      setBekleyenBelgeler([]);
      yenile();
      if (belgeHatalari.length) {
        bildir(`Satış kaydedildi ancak şu belgeler yüklenemedi:\n${belgeHatalari.join('\n')}\n\nSatışın detayından tekrar ekleyebilirsiniz.`, 'uyari');
      }
    } catch (err) {
      setError(hataMesaji(err, 'Hata oluştu'));
    }
    setKaydediliyor(false);
  };

  const canliKar = hesaplaCanliKar(formData);

  // Telefon numarasına göre müşteri bilgilerini otomatik doldur
  const autofillByPhone = async (telefon: string, target: 'alici' | 'komisyoncu') => {
    const tel = (telefon || '').replace(/\D/g, '');
    if (!tel || tel.length < 7) return;
    try {
      const res = await musteriService.searchByPhone(tel);
      const m = res.data;
      if (!m) return;
      setFormData((prev) => {
        if (target === 'alici') {
          return { ...prev, alici_adi: prev.alici_adi || m.ad_soyad || '', alici_adres: prev.alici_adres || m.adres || '' };
        }
        if (target === 'komisyoncu') {
          return { ...prev, komisyoncu_adi: prev.komisyoncu_adi || m.ad_soyad || '' };
        }
        return prev;
      });
    } catch {}
  };

  return {
    dialog,
    kapat,
    openDialog,
    handleSave,
    formData,
    setFormData,
    error,
    bekleyenBelgeler,
    setBekleyenBelgeler,
    kaydediliyor,
    setSelectedStokId,
    turSec,
    sifirSec,
    musteriOptions,
    searchMusteri,
    autofillByPhone,
    canliKar,
  };
};

export type SatisFormuDurumu = ReturnType<typeof useSatisFormu>;
