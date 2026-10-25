import React from 'react';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCartOutlined';
import { DialogBasligi } from '../../../../shared/ui';
import { Button, Dialog, DialogContent, DialogActions, Alert } from '@mui/material';
import MusteriSatisAlanlari from './MusteriSatisAlanlari';
import UrunlerBolumu from './UrunlerBolumu';
import ToplamOzeti from './ToplamOzeti';
import KalanOdemeKutusu from './KalanOdemeKutusu';

// Aksesuar satışı ekleme / düzenleme penceresi. Durum ve işlemler useAksesuarlar hook'undan gelir (a).
const SatisFormModal = ({ a, isMobile, karGor }) => {
  const { dialog, setDialog, error, formData, setFormData, musteriOptions, searchMusteri, handleSave } = a;
  const kapat = () => setDialog({ open: false, data: null });
  return (
    <Dialog open={dialog.open} onClose={kapat} maxWidth="md" fullWidth fullScreen={isMobile}>
      <DialogBasligi ikon={<ShoppingCartIcon />} baslik={dialog.data ? 'Satış Düzenle' : 'Yeni Aksesuar Satışı'} />
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <MusteriSatisAlanlari formData={formData} setFormData={setFormData} musteriOptions={musteriOptions} searchMusteri={searchMusteri} />

        <UrunlerBolumu a={a} isMobile={isMobile} />
        <ToplamOzeti a={a} karGor={karGor} />

        <KalanOdemeKutusu formData={formData} setFormData={setFormData} />
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

export default SatisFormModal;
