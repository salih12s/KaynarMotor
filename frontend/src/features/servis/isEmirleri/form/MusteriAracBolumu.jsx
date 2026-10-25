import React from 'react';
import { Box, Paper, Typography, Grid, TextField, MenuItem, InputAdornment } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import BuildIcon from '@mui/icons-material/Build';
import { musteriService } from '../../../musteriler/musteriApi';
import { BolumBasligi } from '../../../../shared/ui';
import { MENU_RENK, RENK } from '../../../../app/tokenlar';

// Formun sol sütunu: müşteri (telefondan otomatik eşleştirme), araç, arıza ve açıklama.
const MusteriAracBolumu = ({ formData, setFormData, musteriOptions, setMusteriOptions, handleMusteriSearch, handleMusteriSelect }) => {
  return (
    <>
      <BolumBasligi ikon={<PersonIcon />} renk={RENK.mavi}>
        Müşteri Bilgileri
      </BolumBasligi>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6 }}>
          <TextField
            fullWidth
            size="small"
            label="Ad Soyad *"
            value={formData.musteri_ad_soyad}
            onChange={(e) => setFormData({ ...formData, musteri_ad_soyad: e.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 6 }} sx={{ position: 'relative' }}>
          <TextField
            fullWidth
            size="small"
            label="Telefon"
            value={formData.telefon}
            onChange={async (e) => {
              const v = e.target.value;
              setFormData((prev) => ({ ...prev, telefon: v }));
              handleMusteriSearch(v);
              const tel = (v || '').replace(/\D/g, '');
              if (tel.length < 10) return;
              try {
                const res = await musteriService.searchByPhone(tel);
                const m = res.data;
                if (m)
                  setFormData((prev) => ({
                    ...prev,
                    musteri_ad_soyad: prev.musteri_ad_soyad || m.ad_soyad || '',
                    adres: prev.adres || m.adres || '',
                  }));
              } catch {}
            }}
            onBlur={async (e) => {
              const tel = (e.target.value || '').replace(/\D/g, '');
              if (!tel || tel.length < 7) return;
              try {
                const res = await musteriService.searchByPhone(tel);
                const m = res.data;
                if (m)
                  setFormData((prev) => ({
                    ...prev,
                    musteri_ad_soyad: prev.musteri_ad_soyad || m.ad_soyad || '',
                    adres: prev.adres || m.adres || '',
                  }));
              } catch {}
            }}
          />
          {musteriOptions.length > 0 && formData.telefon.length >= 2 && (
            <Paper
              sx={{
                position: 'absolute',
                zIndex: 10,
                left: 16,
                right: 0,
                top: '100%',
                maxHeight: 200,
                overflow: 'auto',
                boxShadow: '0 8px 20px rgba(22,24,28,.15)',
                bgcolor: RENK.yuzey,
              }}
            >
              {musteriOptions.map((m) => (
                <Box
                  key={m.id}
                  sx={{ p: 1, cursor: 'pointer', '&:hover': { bgcolor: RENK.yuzeyKoyu }, borderBottom: `1px solid ${RENK.cizgiSoluk}` }}
                  onClick={() => {
                    handleMusteriSelect(m);
                    setMusteriOptions([]);
                  }}
                >
                  <Typography variant="body2">
                    <strong>{m.telefon}</strong> - {m.ad_soyad}
                  </Typography>
                </Box>
              ))}
            </Paper>
          )}
        </Grid>
        <Grid size={{ xs: 6 }}>
          <TextField
            fullWidth
            size="small"
            label="KM"
            value={formData.km}
            onChange={(e) => setFormData({ ...formData, km: e.target.value })}
            InputProps={{ endAdornment: <InputAdornment position="end">km</InputAdornment> }}
          />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <TextField fullWidth size="small" label="Adres" value={formData.adres} onChange={(e) => setFormData({ ...formData, adres: e.target.value })} />
        </Grid>
      </Grid>

      <BolumBasligi ikon={<TwoWheelerIcon />} renk={MENU_RENK.motor} sx={{ mt: 3 }}>
        Araç Bilgileri
      </BolumBasligi>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            fullWidth
            size="small"
            label="Plaka"
            value={formData.plaka}
            onChange={(e) => setFormData({ ...formData, plaka: e.target.value.toUpperCase() })}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField fullWidth size="small" label="Marka" value={formData.marka} onChange={(e) => setFormData({ ...formData, marka: e.target.value })} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            fullWidth
            size="small"
            label="Model/Tip"
            value={formData.model_tip}
            onChange={(e) => setFormData({ ...formData, model_tip: e.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField select fullWidth size="small" label="Durum" value={formData.durum} onChange={(e) => setFormData({ ...formData, durum: e.target.value })}>
            <MenuItem value="beklemede">Beklemede</MenuItem>
            <MenuItem value="devam_ediyor">Devam Ediyor</MenuItem>
            <MenuItem value="tamamlandi">Tamamlandı</MenuItem>
          </TextField>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <TextField
            fullWidth
            size="small"
            type="date"
            label="Tahmini Teslim"
            value={formData.tahmini_teslim_tarihi}
            onChange={(e) => setFormData({ ...formData, tahmini_teslim_tarihi: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <TextField
            fullWidth
            size="small"
            label="Tahmini Ücret"
            type="number"
            value={formData.tahmini_toplam_ucret}
            onChange={(e) => setFormData({ ...formData, tahmini_toplam_ucret: e.target.value })}
            InputProps={{ startAdornment: <InputAdornment position="start">₺</InputAdornment> }}
          />
        </Grid>
      </Grid>

      <BolumBasligi ikon={<BuildIcon />} renk={MENU_RENK.servis} sx={{ mt: 3 }}>
        Arıza ve Açıklama
      </BolumBasligi>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6 }}>
          <TextField
            fullWidth
            size="small"
            label="Arıza / Şikayetler"
            multiline
            rows={2}
            value={formData.ariza_sikayetler}
            onChange={(e) => setFormData({ ...formData, ariza_sikayetler: e.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <TextField
            fullWidth
            size="small"
            label="Ek Açıklama"
            multiline
            rows={2}
            value={formData.aciklama}
            onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
          />
        </Grid>
      </Grid>
    </>
  );
};

export default MusteriAracBolumu;
