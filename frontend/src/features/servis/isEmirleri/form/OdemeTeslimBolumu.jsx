import React from 'react';
import { Paper, Typography, Grid, TextField, MenuItem, Checkbox, FormControlLabel } from '@mui/material';

// Ödeme detayları, kalan ödeme (veresiye) ve yalnızca düzenlemede görünen teslim bilgileri.
const OdemeTeslimBolumu = ({ formData, setFormData, editId, kullanicilar }) => {
  return (
    <>
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        📋 Ödeme Detayları
      </Typography>
      <TextField
        fullWidth
        size="small"
        placeholder="Örn: Nakit, Kart..."
        value={formData.odeme_detaylari}
        onChange={(e) => setFormData({ ...formData, odeme_detaylari: e.target.value })}
        multiline
        rows={2}
      />

      <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        💰 Kalan Ödeme
      </Typography>
      <Paper variant="outlined" sx={{ p: 1.5, bgcolor: formData.odeme_tamamlandi ? '#e8f5e9' : '#fff3e0' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.odeme_tamamlandi}
                  onChange={(e) => setFormData({ ...formData, odeme_tamamlandi: e.target.checked, kalan_odeme: e.target.checked ? '' : formData.kalan_odeme })}
                />
              }
              label="Ödeme Tamamlandı"
            />
          </Grid>
          {!formData.odeme_tamamlandi && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Kalan Ödeme (₺)"
                type="number"
                value={formData.kalan_odeme}
                onChange={(e) => setFormData({ ...formData, kalan_odeme: e.target.value })}
              />
            </Grid>
          )}
        </Grid>
        {!formData.odeme_tamamlandi && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Bu kayıt Veresiye sayfasında listelenecektir.
          </Typography>
        )}
      </Paper>

      {editId && (
        <>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            📅 Teslim Bilgileri
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Teslim Tarihi"
                type="date"
                value={formData.teslim_tarihi}
                onChange={(e) => setFormData({ ...formData, teslim_tarihi: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Teslim Alan"
                value={formData.teslim_alan_ad_soyad}
                onChange={(e) => setFormData({ ...formData, teslim_alan_ad_soyad: e.target.value })}
              >
                <MenuItem value="">Seçiniz</MenuItem>
                {kullanicilar.map((k) => (
                  <MenuItem key={k.id} value={k.ad_soyad}>
                    {k.ad_soyad}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Teslim Eden Teknisyen"
                value={formData.teslim_eden_teknisyen}
                onChange={(e) => setFormData({ ...formData, teslim_eden_teknisyen: e.target.value })}
              >
                <MenuItem value="">Seçiniz</MenuItem>
                {kullanicilar.map((k) => (
                  <MenuItem key={k.id} value={k.ad_soyad}>
                    {k.ad_soyad}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </>
      )}
    </>
  );
};

export default OdemeTeslimBolumu;
