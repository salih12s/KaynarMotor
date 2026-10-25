import React from 'react';
import { Box, Typography, Grid, TextField, MenuItem, Checkbox, FormControlLabel } from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { BolumBasligi } from '../../../../shared/ui';
import { MENU_RENK, RENK, TON } from '../../../../app/tokenlar';

// Ödeme detayları, kalan ödeme (veresiye) ve yalnızca düzenlemede görünen teslim bilgileri.
const OdemeTeslimBolumu = ({ formData, setFormData, editId, kullanicilar }) => {
  // Ödeme tamam: yeşil kutu; bekleyen: sarı kutu (Veresiye'ye düşer)
  const kutu = formData.odeme_tamamlandi ? TON.yesil : TON.bekle;
  return (
    <>
      <BolumBasligi ikon={<PaymentsIcon />} renk={RENK.mavi}>
        Ödeme Detayları
      </BolumBasligi>
      <TextField
        fullWidth
        size="small"
        placeholder="Örn: Nakit, Kart..."
        value={formData.odeme_detaylari}
        onChange={(e) => setFormData({ ...formData, odeme_detaylari: e.target.value })}
        multiline
        rows={2}
      />

      <BolumBasligi ikon={<AccountBalanceWalletIcon />} renk={MENU_RENK.veresiye} sx={{ mt: 2.5 }}>
        Kalan Ödeme
      </BolumBasligi>
      <Box sx={{ p: 1.5, borderRadius: '6px', bgcolor: kutu.bg, border: `1px solid ${kutu.fg}40`, borderLeft: `4px solid ${kutu.fg}` }}>
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
          <Typography variant="caption" sx={{ mt: 1, display: 'block', color: kutu.fg }}>
            Bu kayıt Veresiye sayfasında listelenecektir.
          </Typography>
        )}
      </Box>

      {editId && (
        <>
          <BolumBasligi ikon={<EventAvailableIcon />} renk={MENU_RENK.taksit} sx={{ mt: 2.5 }}>
            Teslim Bilgileri
          </BolumBasligi>
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
