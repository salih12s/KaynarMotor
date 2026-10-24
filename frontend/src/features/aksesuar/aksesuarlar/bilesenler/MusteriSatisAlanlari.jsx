import React from 'react';
import { TextField, Grid, MenuItem, Autocomplete } from '@mui/material';
import { musteriService } from '../../../musteriler/musteriApi';

// Satış formu: müşteri (ad önerisi, telefondan eşleştirme), durum, ödeme şekli, tarih ve açıklama.
const MusteriSatisAlanlari = ({ formData, setFormData, musteriOptions, searchMusteri }) => {
  return (
    <>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Autocomplete
            freeSolo
            options={musteriOptions}
            getOptionLabel={(o) => (typeof o === 'string' ? o : o.ad_soyad)}
            inputValue={formData.ad_soyad}
            onInputChange={(e, val) => {
              setFormData({ ...formData, ad_soyad: val });
              searchMusteri(val);
            }}
            onChange={(e, val) => {
              if (val && typeof val === 'object') {
                setFormData({ ...formData, ad_soyad: val.ad_soyad, telefon: val.telefon || formData.telefon });
              }
            }}
            renderInput={(params) => <TextField {...params} fullWidth label="Ad Soyad" required />}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="Telefon"
            value={formData.telefon}
            onChange={async (e) => {
              const v = e.target.value;
              setFormData((prev) => ({ ...prev, telefon: v }));
              const tel = (v || '').replace(/\D/g, '');
              if (tel.length < 10) return;
              try {
                const res = await musteriService.searchByPhone(tel);
                const m = res.data;
                if (m) setFormData((prev) => ({ ...prev, ad_soyad: prev.ad_soyad || m.ad_soyad || '' }));
              } catch {}
            }}
            onBlur={async (e) => {
              const tel = (e.target.value || '').replace(/\D/g, '');
              if (!tel || tel.length < 7) return;
              try {
                const res = await musteriService.searchByPhone(tel);
                const m = res.data;
                if (m) setFormData((prev) => ({ ...prev, ad_soyad: prev.ad_soyad || m.ad_soyad || '' }));
              } catch {}
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField select fullWidth label="Durum" value={formData.durum} onChange={(e) => setFormData({ ...formData, durum: e.target.value })}>
            <MenuItem value="beklemede">Beklemede</MenuItem>
            <MenuItem value="tamamlandi">Tamamlandı</MenuItem>
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField fullWidth label="Ödeme Şekli" value={formData.odeme_sekli} onChange={(e) => setFormData({ ...formData, odeme_sekli: e.target.value })} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="Satış Tarihi"
            type="date"
            value={formData.satis_tarihi}
            onChange={(e) => setFormData({ ...formData, satis_tarihi: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="Ödeme Detayları"
            value={formData.odeme_detaylari}
            onChange={(e) => setFormData({ ...formData, odeme_detaylari: e.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            label="Açıklama"
            value={formData.aciklama}
            onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
            multiline
            rows={2}
          />
        </Grid>
      </Grid>
    </>
  );
};

export default MusteriSatisAlanlari;
