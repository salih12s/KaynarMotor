import React from 'react';
import { Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Grid } from '@mui/material';

// Platform ekleme / düzenleme penceresi (yalnızca admin).
const PlatformFormModal = ({ e, isMobile }) => {
  const { platformDialog, setPlatformDialog, error, platformForm, setPlatformForm, handlePlatformSave } = e;
  const kapat = () => setPlatformDialog({ open: false, data: null });
  return (
    <Dialog open={platformDialog.open} onClose={kapat} maxWidth="xs" fullWidth fullScreen={isMobile}>
      <DialogTitle>{platformDialog.data ? 'Platform Düzenle' : 'Yeni Platform'}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Platform Adı"
              value={platformForm.platform_adi}
              onChange={(e) => setPlatformForm({ ...platformForm, platform_adi: e.target.value })}
              required
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Komisyon Oranı (%)"
              type="number"
              value={platformForm.komisyon_orani}
              onChange={(e) => setPlatformForm({ ...platformForm, komisyon_orani: e.target.value })}
              required
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              label="KDV Oranı (%)"
              type="number"
              value={platformForm.kdv_orani}
              onChange={(e) => setPlatformForm({ ...platformForm, kdv_orani: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              label="Kargo Ücreti (₺)"
              type="number"
              value={platformForm.kargo_ucreti}
              onChange={(e) => setPlatformForm({ ...platformForm, kargo_ucreti: e.target.value })}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={kapat}>İptal</Button>
        <Button variant="contained" onClick={handlePlatformSave} sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#b71c1c' } }}>
          {platformDialog.data ? 'Güncelle' : 'Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlatformFormModal;
