import React from 'react';
import PersonIcon from '@mui/icons-material/PersonOutline';
import { BolumBasligi } from '../../../../shared/ui';
import { RENK } from '../../../../app/tokenlar';
import { Typography, TextField, Grid, Autocomplete } from '@mui/material';

// Satış formu: satıcı, alıcı (telefondan otomatik eşleştirme) ve komisyoncu bilgileri.
const TaraflarBolumu = ({ f, setFormData, musteriOptions, searchMusteri, autofillByPhone }) => {
  return (
    <>
      <BolumBasligi ikon={<PersonIcon />} renk={RENK.mavi} sx={{ mt: 3 }}>
        Satıcı Bilgileri
      </BolumBasligi>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Autocomplete
            freeSolo
            options={musteriOptions}
            getOptionLabel={(o) => (typeof o === 'string' ? o : o.ad_soyad)}
            inputValue={f.satici_adi}
            onInputChange={(e, val) => {
              setFormData({ ...f, satici_adi: val });
              searchMusteri(val);
            }}
            onChange={(e, val) => {
              if (val && typeof val === 'object') {
                setFormData({ ...f, satici_adi: val.ad_soyad });
              }
            }}
            renderInput={(params) => <TextField {...params} fullWidth label="Satıcı Ad Soyad" />}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth label="Satıcı TC No" value={f.satici_tc} onChange={(e) => setFormData({ ...f, satici_tc: e.target.value })} />
        </Grid>
      </Grid>

      <BolumBasligi ikon={<PersonIcon />} renk={RENK.mavi} sx={{ mt: 3 }}>
        Alıcı Bilgileri
      </BolumBasligi>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Autocomplete
            freeSolo
            options={musteriOptions}
            getOptionLabel={(o) => (typeof o === 'string' ? o : o.ad_soyad)}
            inputValue={f.alici_adi}
            onInputChange={(e, val) => {
              setFormData({ ...f, alici_adi: val });
              searchMusteri(val);
            }}
            onChange={(e, val) => {
              if (val && typeof val === 'object') {
                setFormData({ ...f, alici_adi: val.ad_soyad, alici_telefon: val.telefon || f.alici_telefon, alici_adres: val.adres || f.alici_adres });
              }
            }}
            renderInput={(params) => <TextField {...params} fullWidth label="Ad Soyad" />}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField fullWidth label="TC No" value={f.alici_tc} onChange={(e) => setFormData({ ...f, alici_tc: e.target.value })} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            fullWidth
            label="Telefon"
            value={f.alici_telefon}
            onChange={(e) => {
              const v = e.target.value;
              setFormData({ ...f, alici_telefon: v });
              if ((v || '').replace(/\D/g, '').length >= 10) autofillByPhone(v, 'alici');
            }}
            onBlur={(e) => autofillByPhone(e.target.value, 'alici')}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField fullWidth label="Adres" value={f.alici_adres} onChange={(e) => setFormData({ ...f, alici_adres: e.target.value })} />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1 }}>
        Komisyoncu Bilgileri{' '}
        <Typography component="span" variant="caption" color="text.secondary">
          (opsiyonel)
        </Typography>
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField fullWidth label="Komisyoncu Ad Soyad" value={f.komisyoncu_adi} onChange={(e) => setFormData({ ...f, komisyoncu_adi: e.target.value })} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="Komisyoncu Telefon"
            value={f.komisyoncu_telefon}
            onChange={(e) => {
              const v = e.target.value;
              setFormData({ ...f, komisyoncu_telefon: v });
              if ((v || '').replace(/\D/g, '').length >= 10) autofillByPhone(v, 'komisyoncu');
            }}
            onBlur={(e) => autofillByPhone(e.target.value, 'komisyoncu')}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="Komisyoncu Tutarı (₺)"
            type="number"
            value={f.komisyoncu_tutari}
            onChange={(e) => setFormData({ ...f, komisyoncu_tutari: e.target.value })}
            helperText="Masraf olarak net kârdan düşülür"
          />
        </Grid>
      </Grid>
    </>
  );
};

export default TaraflarBolumu;
