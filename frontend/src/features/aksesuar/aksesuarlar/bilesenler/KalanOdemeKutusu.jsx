import React from 'react';
import { Box, Typography, TextField, Grid, Checkbox, FormControlLabel } from '@mui/material';

// Satış formu: kalan ödeme (veresiye) işareti ve tutarı.
const KalanOdemeKutusu = ({ formData, setFormData }) => {
  return (
    <>
      <Box sx={{ mt: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>Kalan Ödeme</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControlLabel
              control={<Checkbox checked={formData.odeme_tamamlandi} onChange={e => setFormData({ ...formData, odeme_tamamlandi: e.target.checked, kalan_odeme: e.target.checked ? '' : formData.kalan_odeme })} />}
              label="Ödeme Tamamlandı"
            />
          </Grid>
          {!formData.odeme_tamamlandi && (
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Kalan Ödeme (₺)" type="number" value={formData.kalan_odeme} onChange={e => setFormData({ ...formData, kalan_odeme: e.target.value })} />
            </Grid>
          )}
        </Grid>
      </Box>
    </>
  );
};

export default KalanOdemeKutusu;
