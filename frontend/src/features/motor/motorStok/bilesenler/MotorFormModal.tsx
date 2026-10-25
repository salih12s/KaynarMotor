import React from 'react';
import MotorIkon from '@mui/icons-material/TwoWheelerOutlined';
import { DialogBasligi } from '../../../../shared/ui';
import { Button, Dialog, DialogContent, DialogActions, Alert } from '@mui/material';
import MotorFormBilgi from './MotorFormBilgi';
import MotorFormYatirimciSatici from './MotorFormYatirimciSatici';
import MotorFormVitrinBelge from './MotorFormVitrinBelge';
import type { YatirimciKaydi } from '../../../../shared/tipler';
import type { MotorFormuDurumu } from '../useMotorFormu';
import type { MotorYetkileri } from '../yetkiler';
import type { MusteriAramasi } from '../useMusteriAra';

// Motor ekleme / düzenleme penceresi. Durum ve işlemler useMotorFormu hook'undan gelir (form).
interface MotorFormModalProps {
  form: MotorFormuDurumu;
  perms: MotorYetkileri;
  yatirimcilar: YatirimciKaydi[];
  musteri: MusteriAramasi;
  isMobile: boolean;
}

const MotorFormModal = ({ form, perms, yatirimcilar, musteri, isMobile }: MotorFormModalProps) => {
  const { dialog, kapat, error, handleSave, formData: f, setFormData, bekleyenBelgeler, setBekleyenBelgeler } = form;
  const { isAdmin, canMusteri, canAlis, canListe, canEdit } = perms;
  const { musteriOptions, searchMusteri } = musteri;
  return (
    <Dialog open={dialog.open} onClose={kapat} maxWidth="md" fullWidth fullScreen={isMobile}>
      <DialogBasligi ikon={<MotorIkon />} baslik={dialog.data ? 'Motor Düzenle' : 'Yeni Motor Ekle'} />
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <MotorFormBilgi f={f} setFormData={setFormData} dialog={dialog} canAlis={canAlis} canListe={canListe} />
        <MotorFormYatirimciSatici
          f={f}
          setFormData={setFormData}
          isAdmin={isAdmin}
          canMusteri={canMusteri}
          yatirimcilar={yatirimcilar}
          musteriOptions={musteriOptions}
          searchMusteri={searchMusteri}
        />
        <MotorFormVitrinBelge
          f={f}
          setFormData={setFormData}
          dialog={dialog}
          canEdit={canEdit}
          bekleyenBelgeler={bekleyenBelgeler}
          setBekleyenBelgeler={setBekleyenBelgeler}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={kapat}>İptal</Button>
        <Button variant="contained" onClick={handleSave}>
          {dialog.data ? 'Güncelle' : 'Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MotorFormModal;
