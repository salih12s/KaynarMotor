import { useState } from 'react';
import { hataMesaji } from '../../../shared/api/istemci';
import type { Motor } from '../../../shared/tipler';
import { ikinciElMotorService } from '../motorApi';
import { bekleyenBelgeleriYukle } from '../SatisBelgeleri';
import { bosForm, motordenForm, type MotorStokFormu } from './motorStokVeri';
import { bildir } from '../../../shared/ui';

interface MotorDialogDurumu {
  open: boolean;
  data: Motor | null;
}

// Motor ekleme/düzenleme penceresi: form alanları, bekleyen belgeler ve kaydetme. `yenile`: kaydedince listeyi yeniden çeker.
export const useMotorFormu = ({ yenile }: { yenile: () => void }) => {
  const [dialog, setDialog] = useState<MotorDialogDurumu>({ open: false, data: null });
  const [formData, setFormData] = useState<MotorStokFormu>(bosForm());
  const [error, setError] = useState('');
  // Yeni motor eklenirken seçilen, kayıttan sonra yüklenecek belgeler (kayıtlı motorda belgeler anında yüklenir)
  const [bekleyenBelgeler, setBekleyenBelgeler] = useState<File[]>([]);

  const kapat = () => setDialog({ open: false, data: null });

  const openDialog = (motor: Motor | null = null) => {
    setError('');
    setFormData(motor ? motordenForm(motor) : bosForm());
    setBekleyenBelgeler([]);
    setDialog({ open: true, data: motor });
  };

  const handleSave = async () => {
    setError('');
    try {
      const payload: Record<string, unknown> = { ...formData };
      if (!payload.yatirimci) {
        payload.yatirimci_id = null;
        payload.yatirimci_kar_orani = 0;
      }
      let belgeHatalari: string[] = [];
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
        bildir(`Motor kaydedildi ancak şu belgeler yüklenemedi:\n${belgeHatalari.join('\n')}\n\nMotoru düzenleyerek tekrar ekleyebilirsiniz.`, 'uyari');
      }
    } catch (err) {
      setError(hataMesaji(err, 'Hata oluştu'));
    }
  };

  return { dialog, kapat, openDialog, handleSave, formData, setFormData, error, bekleyenBelgeler, setBekleyenBelgeler };
};

export type MotorFormuDurumu = ReturnType<typeof useMotorFormu>;
