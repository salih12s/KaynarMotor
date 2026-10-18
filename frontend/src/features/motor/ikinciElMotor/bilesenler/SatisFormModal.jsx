import React from 'react';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Chip } from '@mui/material';
import MotorBilgileriBolumu from './MotorBilgileriBolumu';
import FiyatKarBolumu from './FiyatKarBolumu';
import TaraflarBolumu from './TaraflarBolumu';
import KalanOdemeBelgeBolumu from './KalanOdemeBelgeBolumu';

// Motor satış ekleme / düzenleme penceresi. Durum ve işlemler useSatisFormu hook'undan gelir (form).
const SatisFormModal = ({ form, stokMotorlar, yatirimciMap, canAlis, canKar, isMobile }) => {
  const {
    dialog, kapat, error, handleSave, formData: f, setFormData, bekleyenBelgeler, setBekleyenBelgeler, kaydediliyor, setSelectedStokId,
    musteriOptions, searchMusteri, autofillByPhone, canliKar,
  } = form;
  return (
    <Dialog open={dialog.open} onClose={kapat} maxWidth="md" fullWidth fullScreen={isMobile}>
      <DialogTitle>{dialog.data ? 'Motor Düzenle' : 'Yeni Motor Satış'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {f.yatirimci_id && (
          <Alert severity="info" icon={false} sx={{ mb: 2, bgcolor: '#e3f2fd', border: '1px solid #90caf9' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip label="YATIRIMCI MOTORU" color="primary" size="small" sx={{ fontWeight: 700 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Bu motor bir yatırımcıya ait{(yatirimciMap[f.yatirimci_id] || f.yatirimci_adi) ? `: ${yatirimciMap[f.yatirimci_id] || f.yatirimci_adi}` : ''}.{canKar ? ' Satışta yatırımcı kârını aşağıdan girin.' : ''}
              </Typography>
            </Box>
          </Alert>
        )}
        <MotorBilgileriBolumu f={f} setFormData={setFormData} stokMotorlar={stokMotorlar} setSelectedStokId={setSelectedStokId} />
        <FiyatKarBolumu f={f} setFormData={setFormData} canAlis={canAlis} canKar={canKar} canliKar={canliKar} />
        <TaraflarBolumu f={f} setFormData={setFormData} musteriOptions={musteriOptions} searchMusteri={searchMusteri} autofillByPhone={autofillByPhone} />
        <KalanOdemeBelgeBolumu f={f} setFormData={setFormData} dialog={dialog} bekleyenBelgeler={bekleyenBelgeler} setBekleyenBelgeler={setBekleyenBelgeler} kaydediliyor={kaydediliyor} />
      </DialogContent>
      <DialogActions>
        <Button onClick={kapat} disabled={kaydediliyor}>İptal</Button>
        <Button variant="contained" onClick={handleSave} disabled={kaydediliyor}>
          {kaydediliyor ? 'Kaydediliyor…' : dialog.data ? 'Güncelle' : 'Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SatisFormModal;
