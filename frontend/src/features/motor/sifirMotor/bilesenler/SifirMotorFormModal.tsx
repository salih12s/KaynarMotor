import React from 'react';
import MotorIkon from '@mui/icons-material/TwoWheelerOutlined';
import FotoIkon from '@mui/icons-material/PhotoLibraryOutlined';
import FiyatIkon from '@mui/icons-material/PaymentsOutlined';
import { Alert, Autocomplete, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, Grid, TextField, Typography } from '@mui/material';
import { BolumBasligi, DialogBasligi } from '../../../../shared/ui';
import { MENU_RENK, RENK } from '../../../../app/tokenlar';
import { SEGMENTLER } from '../../../vitrin/vitrinSabitleri';
import GorselYonetimi from '../../../vitrin/yonetim/bilesenler/GorselYonetimi';
import type { SifirMotorFormuDurumu } from '../useSifirMotorFormu';

// Sıfır motor (model) ekleme/düzenleme penceresi. Durum ve işlemler useSifirMotorFormu'ndan gelir.
interface SifirMotorFormModalProps {
  form: SifirMotorFormuDurumu;
  canAlis: boolean;
  isMobile: boolean;
}

const SifirMotorFormModal = ({ form, canAlis, isMobile }: SifirMotorFormModalProps) => {
  const { acik, kapat, duzenlenen, form: f, setForm, hata, kaydediliyor, gorselYukleniyor, gorselListesi, kaydet } = form;
  const alan = (ad: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((onceki) => ({ ...onceki, [ad]: e.target.value }));
  return (
    <Dialog open={acik} onClose={kapat} maxWidth="md" fullWidth fullScreen={isMobile}>
      <DialogBasligi ikon={<MotorIkon />} baslik={duzenlenen ? 'Sıfır Motoru Düzenle' : 'Sıfır Motor Ekle'} onKapat={kapat} />
      <DialogContent>
        {hata && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {hata}
          </Alert>
        )}
        <BolumBasligi ikon={<MotorIkon />} renk={MENU_RENK.motor} sx={{ mt: 2 }}>
          Model
        </BolumBasligi>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField fullWidth required label="Marka" value={f.marka} onChange={alan('marka')} autoFocus={!duzenlenen} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth label="Model" value={f.model} onChange={alan('model')} placeholder="Örn: PCX 125" />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField fullWidth label="Model Yılı" type="number" inputProps={{ inputMode: 'numeric' }} value={f.yil} onChange={alan('yil')} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4 }}>
            <TextField fullWidth label="Motor (cc)" type="number" inputProps={{ inputMode: 'numeric' }} value={f.motor_cc} onChange={alan('motor_cc')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <Autocomplete
              freeSolo
              options={SEGMENTLER}
              value={f.segment || null}
              onChange={(_, val) => setForm((o) => ({ ...o, segment: val || '' }))}
              onInputChange={(_, val) => setForm((o) => ({ ...o, segment: val }))}
              renderInput={(params) => <TextField {...params} label="Segment" helperText="Vitrin ilanında motor türü olarak görünür" />}
            />
          </Grid>
        </Grid>

        <BolumBasligi ikon={<FiyatIkon />} renk={RENK.mavi} sx={{ mt: 3 }}>
          Fiyat
        </BolumBasligi>
        <Grid container spacing={2}>
          {canAlis && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Alış Fiyatı (₺)"
                type="number"
                inputProps={{ inputMode: 'decimal' }}
                value={f.alis_fiyati}
                onChange={alan('alis_fiyati')}
                helperText="Satışta kâr bu fiyattan hesaplanır"
              />
            </Grid>
          )}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Liste Fiyatı (₺)"
              type="number"
              inputProps={{ inputMode: 'decimal' }}
              value={f.liste_fiyati}
              onChange={alan('liste_fiyati')}
              helperText="Satış formuna ve bağlı vitrin ilanına bu fiyat gelir"
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Açıklama"
              value={f.aciklama}
              onChange={alan('aciklama')}
              placeholder="Renk seçenekleri, garanti, teslim süresi…"
              helperText="Vitrin ilanına açıklama olarak gelir"
            />
          </Grid>
        </Grid>

        <BolumBasligi ikon={<FotoIkon />} renk={MENU_RENK.vitrin} sx={{ mt: 3 }}>
          Fotoğraflar
        </BolumBasligi>
        {gorselYukleniyor ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: RENK.soluk }}>
            <CircularProgress size={18} />
            <Typography variant="body2">Fotoğraflar yükleniyor…</Typography>
          </Box>
        ) : (
          <GorselYonetimi f={gorselListesi} />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={kapat} disabled={kaydediliyor}>
          İptal
        </Button>
        <Button variant="contained" onClick={kaydet} disabled={kaydediliyor || gorselYukleniyor}>
          {kaydediliyor ? 'Kaydediliyor…' : duzenlenen ? 'Güncelle' : 'Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SifirMotorFormModal;
