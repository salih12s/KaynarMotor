import React from 'react';
import { Box, Typography, Button, IconButton, TextField, Alert, Grid, MenuItem } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { sayiYaz } from '../../../../shared/utils/bicim';

// Hızlı satış: parçalı ödeme satırları ve toplam / girilen / kalan özeti.
const OdemeDagilimi = ({ hs }) => {
  const { hizliForm, odemeKalemleri, odemeToplam, ODEME_TIPLERI, addOdemeKalemi, updateOdemeKalemi, removeOdemeKalemi } = hs;
  return (
    <>
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1 }}>Ödeme Dağılımı</Typography>
      {odemeKalemleri.map((o, i) => (
        <Grid container spacing={1} key={i} sx={{ mb: 1 }} alignItems="center">
          <Grid size={{ xs: 5 }}>
            <TextField select fullWidth size="small" label="Ödeme Türü" value={o.tip} onChange={e => updateOdemeKalemi(i, 'tip', e.target.value)}>
              {ODEME_TIPLERI.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 5 }}>
            <TextField fullWidth size="small" label="Tutar (₺)" type="number" value={o.tutar} onChange={e => updateOdemeKalemi(i, 'tutar', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 2 }}>
            <IconButton color="error" onClick={() => removeOdemeKalemi(i)}><CloseIcon fontSize="small" /></IconButton>
          </Grid>
        </Grid>
      ))}
      <Button size="small" startIcon={<AddIcon />} onClick={addOdemeKalemi}>Ödeme Ekle</Button>
      {odemeKalemleri.length > 0 && (() => {
        const satis = parseFloat(hizliForm.satis_fiyati || 0);
        const kalan = satis - odemeToplam;
        const fmt = (v) => `₺${sayiYaz(v)}`;
        return (
          <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1, bgcolor: '#f5f5f5', border: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="body2">Toplam Satış:</Typography><Typography variant="body2" fontWeight="bold">{fmt(satis)}</Typography></Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="body2">Girilen Ödeme:</Typography><Typography variant="body2" fontWeight="bold">{fmt(odemeToplam)}</Typography></Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">{kalan < 0 ? 'Fazla Ödeme:' : 'Kalan:'}</Typography>
              <Typography variant="body2" fontWeight="bold" sx={{ color: kalan === 0 ? '#2e7d32' : kalan < 0 ? '#d32f2f' : '#ef6c00' }}>{fmt(Math.abs(kalan))}</Typography>
            </Box>
            {kalan < 0 && <Alert severity="warning" sx={{ mt: 1 }}>Girilen ödeme toplamı satış tutarını aşıyor.</Alert>}
          </Box>
        );
      })()}
    </>
  );
};

export default OdemeDagilimi;
