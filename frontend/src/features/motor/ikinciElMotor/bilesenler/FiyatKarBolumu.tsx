import React from 'react';
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined';
import { BolumBasligi } from '../../../../shared/ui';
import { RENK } from '../../../../app/tokenlar';
import { Box, Paper, Typography, TextField, Grid, InputAdornment } from '@mui/material';
import { sayiYaz } from '../../../../shared/utils/bicim';
import type { SatisFormuDurumu } from '../useSatisFormu';

// Satış formu: fiyat bilgileri ve (yalnızca admin) canlı net kâr.
interface FiyatKarBolumuProps {
  f: SatisFormuDurumu['formData'];
  setFormData: SatisFormuDurumu['setFormData'];
  canAlis: boolean;
  canKar: boolean;
  canliKar: number;
}

const FiyatKarBolumu = ({ f, setFormData, canAlis, canKar, canliKar }: FiyatKarBolumuProps) => {
  return (
    <>
      <BolumBasligi ikon={<PaymentsIcon />} renk={RENK.mavi} sx={{ mt: 3 }}>
        Fiyat Bilgileri
      </BolumBasligi>
      <Grid container spacing={2}>
        {canAlis && (
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="Alış Fiyatı (₺)"
              type="number"
              value={f.alis_fiyati}
              onChange={(e) => setFormData({ ...f, alis_fiyati: e.target.value })}
            />
          </Grid>
        )}
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="Satış Fiyatı (₺)"
            type="number"
            value={f.satis_fiyati}
            onChange={(e) => setFormData({ ...f, satis_fiyati: e.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="Masraflar (₺)"
            type="number"
            value={f.masraflar}
            onChange={(e) => setFormData({ ...f, masraflar: e.target.value })}
            helperText="Tamir, bakım, sigorta vb."
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField fullWidth label="Noter Alış (₺)" type="number" value={f.noter_alis} onChange={(e) => setFormData({ ...f, noter_alis: e.target.value })} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            fullWidth
            label="Noter Satış (₺)"
            type="number"
            value={f.noter_satis}
            onChange={(e) => setFormData({ ...f, noter_satis: e.target.value })}
          />
        </Grid>
        {f.yatirimci_id && canKar && (
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Yatırımcı Kârı (₺)"
              type="number"
              value={f.yatirimci_kar}
              onChange={(e) => setFormData({ ...f, yatirimci_kar: e.target.value })}
              helperText="Yatırımcıya verilecek tutar; kalanı işletme kârıdır."
              sx={{ '& .MuiInputBase-root': { bgcolor: '#DCE6F4' } }}
              InputProps={{ startAdornment: <InputAdornment position="start">₺</InputAdornment> }}
            />
          </Grid>
        )}
      </Grid>
      {canKar && (
        <Paper sx={{ p: 2, mt: 2, bgcolor: canliKar >= 0 ? '#D8EBDD' : '#F6DAD7', textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: canliKar >= 0 ? 'green' : 'red' }}>
            Net Kâr: <strong>{sayiYaz(canliKar)} ₺</strong>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Kâr = Satış - (Alış + Masraflar + Komisyoncu Tutarı)
          </Typography>
          {f.yatirimci_id ? (
            <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed #bbb', display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
              <Typography variant="body2">
                Yatırımcı Kârı: <strong style={{ color: '#1E4A86' }}>{sayiYaz(Number(f.yatirimci_kar) || 0)} ₺</strong>
              </Typography>
              <Typography variant="body2">
                Benim Kârım: <strong style={{ color: '#1D6A3B' }}>{sayiYaz(canliKar - (Number(f.yatirimci_kar) || 0))} ₺</strong>
              </Typography>
            </Box>
          ) : null}
        </Paper>
      )}
    </>
  );
};

export default FiyatKarBolumu;
