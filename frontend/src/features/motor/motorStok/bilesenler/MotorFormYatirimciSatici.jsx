import React from 'react';
import { Typography, TextField, Alert, Grid, MenuItem, Autocomplete, Checkbox, FormControlLabel } from '@mui/material';

// Form: yatırımcı (yalnızca admin) ve satıcı bilgileri (müşteri araması).
const MotorFormYatirimciSatici = ({ f, setFormData, isAdmin, canMusteri, yatirimcilar, musteriOptions, searchMusteri }) => {
  return (
    <>
      {isAdmin && (
        <>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1 }}>Yatırımcı</Typography>
          <FormControlLabel
            control={<Checkbox checked={f.yatirimci} onChange={e => setFormData({ ...f, yatirimci: e.target.checked, yatirimci_id: e.target.checked ? f.yatirimci_id : '' })} />}
            label="Bu motor bir yatırımcıya ait"
          />
          {f.yatirimci && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField select fullWidth label="Yatırımcı Seç" value={f.yatirimci_id} onChange={e => setFormData({ ...f, yatirimci_id: e.target.value })} required
                  helperText="Yatırımcı kârı satış esnasında tutar olarak girilir.">
                  <MenuItem value=""><em>Seçiniz</em></MenuItem>
                  {yatirimcilar.map(y => <MenuItem key={y.id} value={y.id}>{y.ad_soyad}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>
          )}
        </>
      )}

      <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1 }}>Satıcı Bilgileri</Typography>
      {canMusteri ? (
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Autocomplete freeSolo options={musteriOptions}
            getOptionLabel={(o) => typeof o === 'string' ? o : o.ad_soyad}
            inputValue={f.satici_adi} onInputChange={(e, val) => { setFormData({ ...f, satici_adi: val }); searchMusteri(val); }}
            onChange={(e, val) => { if (val && typeof val === 'object') { setFormData({ ...f, satici_adi: val.ad_soyad, satici_tc: f.satici_tc }); } }}
            renderInput={(params) => <TextField {...params} fullWidth label="İsim Soyisim" />}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="TC Kimlik" value={f.satici_tc} onChange={e => setFormData({ ...f, satici_tc: e.target.value })} /></Grid>
      </Grid>
      ) : (
        <Alert severity="info" sx={{ mb: 1 }}>Satıcı/müşteri bilgilerini görme yetkiniz yok.</Alert>
      )}
    </>
  );
};

export default MotorFormYatirimciSatici;
