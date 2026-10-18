import React from 'react';
import { Typography, TextField, Grid, MenuItem, Checkbox, FormControlLabel, Autocomplete } from '@mui/material';

// Satış formu: motor bilgileri (plaka stoktan seçilebilir), durum, ödeme şekli, tarihler, yevmiye ve fatura.
const MotorBilgileriBolumu = ({ f, setFormData, stokMotorlar, setSelectedStokId }) => {
  return (
    <>
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2, mb: 1 }}>Motor Bilgileri</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Autocomplete
            freeSolo
            options={stokMotorlar.map(m => m.plaka)}
            value={f.plaka}
            onInputChange={(e, val) => setFormData({ ...f, plaka: (val || '').toUpperCase() })}
            onChange={(e, val) => {
              if (val) {
                const motor = stokMotorlar.find(m => m.plaka === val);
                if (motor) {
                  setSelectedStokId(motor.id);
                  setFormData({
                    ...f,
                    plaka: motor.plaka, marka: motor.marka || '', model: motor.model || '',
                    km: motor.km || '', yil: motor.yil || '',
                    alis_fiyati: motor.alis_fiyati || '', noter_alis: motor.noter_alis || '',
                    satici_adi: motor.satici_adi || '', satici_tc: motor.satici_tc || '',
                    tarih: motor.tarih ? new Date(motor.tarih).toISOString().split('T')[0] : '',
                    durum: 'tamamlandi',
                    yatirimci_id: motor.yatirimci_id || '', yatirimci_kar: motor.yatirimci_kar || '',
                    yatirimci_adi: motor.yatirimci_adi || ''
                  });
                } else {
                  setSelectedStokId(null);
                }
              }
            }}
            renderInput={(params) => <TextField {...params} fullWidth label="Plaka" required />}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Marka" value={f.marka} onChange={e => setFormData({ ...f, marka: e.target.value })} required /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Model" value={f.model} onChange={e => setFormData({ ...f, model: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Yıl" type="number" value={f.yil} onChange={e => setFormData({ ...f, yil: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="KM" type="number" value={f.km} onChange={e => setFormData({ ...f, km: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField select fullWidth label="Durum" value={f.durum} onChange={e => setFormData({ ...f, durum: e.target.value })}
            sx={{ '& .MuiInputBase-root': { bgcolor: f.durum === 'tamamlandi' ? '#e8f5e9' : f.durum === 'kapora' ? '#fff3e0' : f.durum === 'devir_bekliyor' ? '#f3e5f5' : f.durum === 'perte' ? '#ffebee' : 'inherit' } }}>
            <MenuItem value="stokta">Stokta</MenuItem>
            <MenuItem value="kapora">Kapora</MenuItem>
            <MenuItem value="devir_bekliyor">Devir Bekliyor</MenuItem>
            <MenuItem value="tamamlandi">Tamamlandı</MenuItem>
            <MenuItem value="perte">Perte</MenuItem>
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField select fullWidth label="Ödeme Şekli" value={f.odeme_sekli} onChange={e => setFormData({ ...f, odeme_sekli: e.target.value })}>
            <MenuItem value="nakit">Nakit</MenuItem>
            <MenuItem value="kredi_karti">Kredi Kartı</MenuItem>
            <MenuItem value="havale">Havale/EFT</MenuItem>
            <MenuItem value="taksit">Taksit</MenuItem>
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField fullWidth label="Alım Tarihi" type="date" value={f.tarih} onChange={e => setFormData({ ...f, tarih: e.target.value })} InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField fullWidth label="Satış Tarihi" type="date" value={f.satis_tarihi} onChange={e => setFormData({ ...f, satis_tarihi: e.target.value })} InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField fullWidth label="Yevmiye No" value={f.yevmiye_no} onChange={e => setFormData({ ...f, yevmiye_no: e.target.value })} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControlLabel control={<Checkbox checked={f.fatura_kesildi} onChange={e => setFormData({ ...f, fatura_kesildi: e.target.checked })} />} label="Fatura Kesildi" />
        </Grid>
      </Grid>
    </>
  );
};

export default MotorBilgileriBolumu;
