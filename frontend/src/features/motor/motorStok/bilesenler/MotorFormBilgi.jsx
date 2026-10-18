import React from 'react';
import { Typography, TextField, Grid, MenuItem } from '@mui/material';

// Form: motor bilgileri (plaka, durum, tarih, fatura) ve fiyat bilgileri.
const MotorFormBilgi = ({ f, setFormData, dialog, canAlis, canListe }) => {
  return (
    <>
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2, mb: 1 }}>Motor Bilgileri</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Plaka" value={f.plaka} onChange={e => setFormData({ ...f, plaka: e.target.value.toUpperCase() })} required /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Marka" value={f.marka} onChange={e => setFormData({ ...f, marka: e.target.value })} required /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Model" value={f.model} onChange={e => setFormData({ ...f, model: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Yıl" type="number" value={f.yil} onChange={e => setFormData({ ...f, yil: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="KM" type="number" value={f.km} onChange={e => setFormData({ ...f, km: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField select fullWidth label="Durum" value={f.durum} onChange={e => setFormData({ ...f, durum: e.target.value })}
            sx={{ '& .MuiInputBase-root': { bgcolor: f.durum === 'kapora' ? '#FFFDE7' : f.durum === 'devir_bekliyor' ? '#F3E5F5' : f.durum === 'depo_serviste' ? '#FFF3E0' : f.durum === 'tamamlandi' ? '#E0F2F1' : 'inherit' } }}>
            <MenuItem value="stokta">Stokta</MenuItem>
            <MenuItem value="kapora">Kapora</MenuItem>
            <MenuItem value="depo_serviste">Depo/Serviste</MenuItem>
            <MenuItem value="devir_bekliyor">Devir Bekliyor</MenuItem>
            <MenuItem value="tamamlandi">Satıldı</MenuItem>
            <MenuItem value="perte">Perte</MenuItem>
          </TextField>
        </Grid>
        {dialog.data && dialog.data.durum !== 'tamamlandi' && (
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField select fullWidth label="Stok Tipi" value={f.stok_tipi} onChange={e => setFormData({ ...f, stok_tipi: e.target.value })}
              sx={{ '& .MuiInputBase-root': { bgcolor: f.stok_tipi === 'konsinye' ? '#e3f2fd' : '#fff3e0' } }}>
              <MenuItem value="sahip">Benim Olanlar</MenuItem>
              <MenuItem value="konsinye">Konsinye</MenuItem>
            </TextField>
          </Grid>
        )}
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField fullWidth label="Alım Tarihi" type="date" value={f.tarih} onChange={e => setFormData({ ...f, tarih: e.target.value })} InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField select fullWidth label="Fatura Durumu" value={f.fatura_kesildi ? 'true' : 'false'} onChange={e => setFormData({ ...f, fatura_kesildi: e.target.value === 'true' })}
            sx={{ '& .MuiInputBase-root': { bgcolor: f.fatura_kesildi ? '#e8f5e9' : '#ffebee' } }}>
            <MenuItem value="false">Fatura Kesilmedi</MenuItem>
            <MenuItem value="true">Fatura Kesildi</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1 }}>Fiyat Bilgileri</Typography>
      <Grid container spacing={2}>
        {canAlis && <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Alım (₺)" type="number" value={f.alis_fiyati} onChange={e => setFormData({ ...f, alis_fiyati: e.target.value })} /></Grid>}
        {canAlis && <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Alış Bedeli / Noter (₺)" type="number" value={f.noter_alis} onChange={e => setFormData({ ...f, noter_alis: e.target.value })} /></Grid>}
        <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Masraflar (₺)" type="number" value={f.masraflar} onChange={e => setFormData({ ...f, masraflar: e.target.value })} helperText="Stokta girilen masraf satışta otomatik gelir" /></Grid>
        {canListe && <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="İlan Fiyatı (₺)" helperText="Sitede de bu fiyat gösterilir" type="number" value={f.liste_fiyati} onChange={e => setFormData({ ...f, liste_fiyati: e.target.value })} sx={{ '& .MuiInputBase-root': { bgcolor: '#e3f2fd' } }} /></Grid>}
      </Grid>
    </>
  );
};

export default MotorFormBilgi;
