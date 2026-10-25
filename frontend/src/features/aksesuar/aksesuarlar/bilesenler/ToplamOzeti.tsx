import React from 'react';
import { Box, Typography, TextField, InputAdornment } from '@mui/material';
import { sayiYaz } from '../../../../shared/utils/bicim';
import type { AksesuarlarDurumu } from '../useAksesuarlar';
import { RENK } from '../../../../app/tokenlar';

// Satış formu: ara toplam, indirim girişi, toplam ve (kâr yetkisi olana) kâr.
const ToplamOzeti = ({ a, karGor }: { a: AksesuarlarDurumu; karGor: boolean }) => {
  const { toplamSatis, indirim, netToplam, kar, formData, setFormData } = a;
  return (
    <>
      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            Ara Toplam: {sayiYaz(toplamSatis)} ₺
          </Typography>
          <TextField
            size="small"
            label="İndirim (₺)"
            type="number"
            value={formData.indirim}
            onChange={(e) => setFormData({ ...formData, indirim: e.target.value })}
            sx={{ width: 150 }}
            InputProps={{ startAdornment: <InputAdornment position="start">₺</InputAdornment> }}
          />
        </Box>
        {indirim > 0 && (
          <Typography variant="body2" sx={{ color: RENK.kirmizi }}>
            İndirim: −{sayiYaz(indirim)} ₺
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Typography>
            Toplam: <strong>{sayiYaz(netToplam)} ₺</strong>
          </Typography>
          {karGor && (
            <Typography sx={{ color: kar >= 0 ? 'green' : 'red' }}>
              Kâr: <strong>{sayiYaz(kar)} ₺</strong>
            </Typography>
          )}
        </Box>
      </Box>
    </>
  );
};

export default ToplamOzeti;
