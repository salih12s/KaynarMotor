import React from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Alert } from '@mui/material';
import MotorFormBilgi from './MotorFormBilgi';
import MotorFormYatirimciSatici from './MotorFormYatirimciSatici';
import MotorFormVitrinBelge from './MotorFormVitrinBelge';

// Motor ekleme / düzenleme penceresi. Durum ve işlemler useMotorFormu hook'undan gelir (form).
const MotorFormModal = ({ form, perms, yatirimcilar, musteri, isMobile }) => {
  const { dialog, kapat, error, handleSave, formData: f, setFormData, bekleyenBelgeler, setBekleyenBelgeler } = form;
  const { isAdmin, canMusteri, canAlis, canListe, canEdit } = perms;
  const { musteriOptions, searchMusteri } = musteri;
  return (
    <Dialog open={dialog.open} onClose={kapat} maxWidth="md" fullWidth fullScreen={isMobile}>
      <DialogTitle>{dialog.data ? 'Motor Düzenle' : 'Yeni Motor Ekle'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <MotorFormBilgi f={f} setFormData={setFormData} dialog={dialog} canAlis={canAlis} canListe={canListe} />
        <MotorFormYatirimciSatici f={f} setFormData={setFormData} isAdmin={isAdmin} canMusteri={canMusteri} yatirimcilar={yatirimcilar}
          musteriOptions={musteriOptions} searchMusteri={searchMusteri} />
        <MotorFormVitrinBelge f={f} setFormData={setFormData} dialog={dialog} canEdit={canEdit} bekleyenBelgeler={bekleyenBelgeler} setBekleyenBelgeler={setBekleyenBelgeler} />
      </DialogContent>
      <DialogActions>
        <Button onClick={kapat}>İptal</Button>
        <Button variant="contained" onClick={handleSave}>{dialog.data ? 'Güncelle' : 'Kaydet'}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MotorFormModal;
