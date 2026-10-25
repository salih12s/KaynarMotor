import React from 'react';
import MusteriAracBolumu from './form/MusteriAracBolumu';
import ParcaBolumu from './form/ParcaBolumu';
import OdemeTeslimBolumu from './form/OdemeTeslimBolumu';
import { Grid, Button, Dialog, DialogContent, DialogActions, Alert } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckIcon from '@mui/icons-material/Check';
import { DialogBasligi } from '../../../shared/ui';
import type { KullaniciOzeti } from '../../../shared/tipler';
import type { IsEmriFormuDurumu } from './useIsEmriFormu';

// Yeni iş emri / düzenleme penceresi. Durum ve işlemler useIsEmriFormu hook'undan gelir (form).
const IsEmriFormModal = ({ form, kullanicilar, isMobile }: { form: IsEmriFormuDurumu; kullanicilar: KullaniciOzeti[]; isMobile: boolean }) => {
  const {
    modalOpen,
    editId,
    error,
    kapat,
    handleSave,
    formData,
    setFormData,
    parcalar,
    newParca,
    setNewParca,
    stokOptions,
    musteriOptions,
    setMusteriOptions,
    addParca,
    removeParca,
    handleStokSearch,
    selectStok,
    handleParcaKeyDown,
    handleMusteriSearch,
    handleMusteriSelect,
  } = form;
  return (
    <Dialog open={modalOpen} onClose={kapat} maxWidth="lg" fullWidth fullScreen={isMobile}>
      <DialogBasligi baslik={editId ? 'İş Emri Düzenle' : 'Yeni İş Emri'} ikon={<AssignmentIcon />} onKapat={kapat} />
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={3}>
          {/* Sol: Müşteri + Araç + Arıza */}
          <Grid size={{ xs: 12, md: 6 }}>
            <MusteriAracBolumu
              formData={formData}
              setFormData={setFormData}
              musteriOptions={musteriOptions}
              setMusteriOptions={setMusteriOptions}
              handleMusteriSearch={handleMusteriSearch}
              handleMusteriSelect={handleMusteriSelect}
            />
          </Grid>

          {/* Sağ: Parçalar + Ödeme */}
          <Grid size={{ xs: 12, md: 6 }}>
            <ParcaBolumu
              parcalar={parcalar}
              newParca={newParca}
              setNewParca={setNewParca}
              stokOptions={stokOptions}
              addParca={addParca}
              removeParca={removeParca}
              handleStokSearch={handleStokSearch}
              selectStok={selectStok}
              handleParcaKeyDown={handleParcaKeyDown}
              isMobile={isMobile}
            />
            <OdemeTeslimBolumu formData={formData} setFormData={setFormData} editId={editId} kullanicilar={kullanicilar} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="outlined" color="inherit" onClick={kapat}>
          İptal
        </Button>
        <Button variant="contained" startIcon={<CheckIcon />} onClick={handleSave}>
          {editId ? 'Güncelle' : 'Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IsEmriFormModal;
