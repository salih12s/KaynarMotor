import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { FONT, RENK, TON } from '../../app/tokenlar';

// Detay pencerelerinde kullanılan küçük yapı taşları.

// Başlıklı etiket/değer kartı. satirlar: [[etiket, değer], ...]
export const BilgiKarti = ({ baslik, satirlar, sx, children }) => (
  <Paper sx={{ p: 1.75, ...sx }}>
    <Typography sx={{ fontFamily: FONT.baslik, fontWeight: 700, fontSize: 20, color: 'primary.main', mb: 0.75, lineHeight: 1.2 }}>{baslik}</Typography>
    {(satirlar || []).map(([etiket, deger]) => (
      <Box key={etiket} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, py: 0.35, fontSize: 14 }}>
        <Box component="span" sx={{ color: RENK.soluk }}>
          {etiket}
        </Box>
        <Box component="b" sx={{ textAlign: 'right', fontWeight: 600 }}>
          {deger}
        </Box>
      </Box>
    ))}
    {children}
  </Paper>
);

// Tonlu sayı kutusu (ör. Alış ₺161.000)
export const SayiKutusu = ({ etiket, deger, ton, sx }) => {
  const { fg, bg } = ton ? TON[ton] : { fg: RENK.murekkep, bg: RENK.yuzey };
  return (
    <Paper sx={{ px: 1.75, py: 1.25, textAlign: 'center', bgcolor: bg, ...sx }}>
      <Typography sx={{ fontSize: 12.5, color: RENK.soluk }}>{etiket}</Typography>
      <Typography sx={{ fontFamily: FONT.baslik, fontWeight: 700, fontSize: 24, lineHeight: 1.2, color: fg }}>{deger}</Typography>
    </Paper>
  );
};

// Soldan renkli çizgili not kutusu (açıklama, arıza, ödeme detayı)
export const Not = ({ baslik, ton = 'mavi', children, sx }) => {
  const { fg, bg } = TON[ton];
  return (
    <Box sx={{ px: 2, py: 1.5, borderRadius: '5px', bgcolor: bg, borderLeft: `4px solid ${fg}`, ...sx }}>
      {baslik && <Typography sx={{ fontWeight: 700, color: fg, mb: 0.25 }}>{baslik}</Typography>}
      <Box sx={{ fontSize: 14.5 }}>{children}</Box>
    </Box>
  );
};
