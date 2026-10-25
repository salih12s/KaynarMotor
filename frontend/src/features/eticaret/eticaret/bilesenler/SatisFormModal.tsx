import React from 'react';
import type { AksesuarStok, Platform } from '../../../../shared/tipler';
import type { ETicaretDurumu } from '../useETicaret';
import StoreIcon from '@mui/icons-material/StorefrontOutlined';
import { DialogBasligi } from '../../../../shared/ui';
import { Button, TextField, Dialog, DialogContent, DialogActions, Alert, Grid, MenuItem } from '@mui/material';
import KomisyonOnizleme from './KomisyonOnizleme';
import { RENK } from '../../../../app/tokenlar';

// Satış ekleme / düzenleme penceresi: stok ve platform seçimiyle otomatik doldurma + canlı komisyon önizlemesi.
interface SatisFormModalProps {
  e: ETicaretDurumu;
  stokOptions: AksesuarStok[];
  platformlar: Platform[];
  karGor: boolean;
  isMobile: boolean;
}

const SatisFormModal = ({ e, stokOptions, platformlar, karGor, isMobile }: SatisFormModalProps) => {
  const { satisDialog, setSatisDialog, error, setSatisForm, handleStokSelect, handlePlatformSelect, sf, canliPlatformTipi, canliHesap, handleSatisSave } = e;
  const kapat = () => setSatisDialog({ open: false, data: null });
  return (
    <Dialog open={satisDialog.open} onClose={kapat} maxWidth="md" fullWidth fullScreen={isMobile}>
      <DialogBasligi ikon={<StoreIcon />} baslik={satisDialog.data ? 'Satış Düzenle' : 'Yeni E-Ticaret Satışı'} />
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField select fullWidth label="Ürün (Stoktan)" value={sf.stok_id} onChange={(e) => handleStokSelect(e.target.value)}>
              <MenuItem value="">Manuel Giriş</MenuItem>
              {stokOptions.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.stok_adi} (Stok: {s.mevcut})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Ürün Adı" value={sf.urun_adi} onChange={(e) => setSatisForm({ ...sf, urun_adi: e.target.value })} required />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField select fullWidth label="Platform" value={sf.platform_id} onChange={(e) => handlePlatformSelect(e.target.value)}>
              <MenuItem value="">Seçiniz</MenuItem>
              {platformlar.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.platform_adi} (%{parseFloat(String(p.komisyon_orani)).toFixed(2)})
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="Tarih"
              type="date"
              value={sf.tarih}
              onChange={(e) => setSatisForm({ ...sf, tarih: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth label="Adet" type="number" value={sf.adet} onChange={(e) => setSatisForm({ ...sf, adet: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              label="Ürün Satış Fiyatı (₺)"
              type="number"
              value={sf.satis_fiyati}
              onChange={(e) => setSatisForm({ ...sf, satis_fiyati: e.target.value })}
              helperText="KDV dahil"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              label="Ürün Alış Fiyatı (₺)"
              type="number"
              value={sf.alis_fiyati}
              onChange={(e) => setSatisForm({ ...sf, alis_fiyati: e.target.value })}
              helperText="KDV dahil"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              fullWidth
              label="Komisyon (%)"
              type="number"
              value={sf.komisyon_orani}
              onChange={(e) => setSatisForm({ ...sf, komisyon_orani: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField fullWidth label="KDV (%)" type="number" value={sf.kdv_orani} onChange={(e) => setSatisForm({ ...sf, kdv_orani: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              fullWidth
              label="Kargo (₺)"
              type="number"
              value={sf.kargo_ucreti}
              onChange={(e) => setSatisForm({ ...sf, kargo_ucreti: e.target.value })}
            />
          </Grid>
        </Grid>
        <KomisyonOnizleme sf={sf} canliPlatformTipi={canliPlatformTipi} canliHesap={canliHesap} karGor={karGor} />
      </DialogContent>
      <DialogActions>
        <Button onClick={kapat}>İptal</Button>
        <Button variant="contained" onClick={handleSatisSave} sx={{ bgcolor: RENK.kirmizi, '&:hover': { bgcolor: RENK.kirmiziKoyu } }}>
          {satisDialog.data ? 'Güncelle' : 'Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SatisFormModal;
