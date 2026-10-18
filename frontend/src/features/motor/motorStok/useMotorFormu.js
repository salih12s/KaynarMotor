import { useState } from 'react';
import { ikinciElMotorService } from '../motorApi';
import { bekleyenBelgeleriYukle } from '../SatisBelgeleri';
import { bosForm, motordenForm } from './motorStokVeri';

// Motor ekleme/düzenleme penceresi: form alanları, bekleyen belgeler ve kaydetme. `yenile`: kaydedince listeyi yeniden çeker.
export const useMotorFormu = ({ yenile }) => {
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [formData, setFormData] = useState(bosForm());
  const [error, setError] = useState('');
  // Yeni motor eklenirken seçilen, kayıttan sonra yüklenecek belgeler (kayıtlı motorda belgeler anında yüklenir)
  const [bekleyenBelgeler, setBekleyenBelgeler] = useState([]);

  const kapat = () => setDialog({ open: false, data: null });

  const openDialog = (motor = null) => {
    setError('');
    setFormData(motor ? motordenForm(motor) : bosForm());
    setBekleyenBelgeler([]);
    setDialog({ open: true, data: motor });
  };

  const handleSave = async () => {
    setError('');
    try {
      const payload = { ...formData };
      if (!payload.yatirimci) { payload.yatirimci_id = null; payload.yatirimci_kar_orani = 0; }
      let belgeHatalari = [];
      if (dialog.data) {
        await ikinciElMotorService.update(dialog.data.id, payload);
      } else {
        const res = await ikinciElMotorService.create(payload);
        if (bekleyenBelgeler.length) belgeHatalari = await bekleyenBelgeleriYukle(res.data.id, bekleyenBelgeler);
      }
      setDialog({ open: false, data: null });
      setBekleyenBelgeler([]);
      yenile();
      if (belgeHatalari.length) {
        alert(`Motor kaydedildi ancak şu belgeler yüklenemedi:\n${belgeHatalari.join('\n')}\n\nMotoru düzenleyerek tekrar ekleyebilirsiniz.`);
      }
    } catch (err) { setError(err.response?.data?.message || 'Hata oluştu'); }
  };

  return { dialog, kapat, openDialog, handleSave, formData, setFormData, error, bekleyenBelgeler, setBekleyenBelgeler };
};
