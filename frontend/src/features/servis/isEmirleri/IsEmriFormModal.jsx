import React from 'react';
import MusteriAracBolumu from './form/MusteriAracBolumu';
import ParcaBolumu from './form/ParcaBolumu';
import OdemeTeslimBolumu from './form/OdemeTeslimBolumu';
import { Box, Typography, Grid, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';

// Yeni iş emri / düzenleme penceresi. Durum ve işlemler useIsEmriFormu hook'undan gelir (form).
const IsEmriFormModal = ({ form, kullanicilar, isMobile }) => {
  const {
    modalOpen, editId, error, kapat, handleSave, formData, setFormData, parcalar, newParca, setNewParca, stokOptions,
    musteriOptions, setMusteriOptions, addParca, removeParca, handleStokSearch, selectStok, handleParcaKeyDown,
    handleMusteriSearch, handleMusteriSelect,
  } = form;
  return (
    <Dialog open={modalOpen} onClose={kapat} maxWidth="lg" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 1, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18 }}>📋</Box>
        <Typography variant="h6" fontWeight="bold">{editId ? 'İş Emri Düzenle' : 'Yeni İş Emri'}</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={kapat}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={3}>
          {/* Sol: Müşteri + Araç + Arıza */}
          <Grid size={{ xs: 12, md: 6 }}>
            <MusteriAracBolumu formData={formData} setFormData={setFormData} musteriOptions={musteriOptions} setMusteriOptions={setMusteriOptions}
              handleMusteriSearch={handleMusteriSearch} handleMusteriSelect={handleMusteriSelect} />
          </Grid>

          {/* Sağ: Parçalar + Ödeme */}
          <Grid size={{ xs: 12, md: 6 }}>
            <ParcaBolumu parcalar={parcalar} newParca={newParca} setNewParca={setNewParca} stokOptions={stokOptions} addParca={addParca} removeParca={removeParca}
              handleStokSearch={handleStokSearch} selectStok={selectStok} handleParcaKeyDown={handleParcaKeyDown} isMobile={isMobile} />
            <OdemeTeslimBolumu formData={formData} setFormData={setFormData} editId={editId} kullanicilar={kullanicilar} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="outlined" color="error" onClick={kapat}>İptal</Button>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>{editId ? 'Güncelle' : 'Kaydet'}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default IsEmriFormModal;
