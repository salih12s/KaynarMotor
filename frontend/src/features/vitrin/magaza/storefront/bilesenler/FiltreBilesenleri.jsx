import React from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import { RENK, ODAK } from '../../../VitrinOrtak';

// Filtre grubunu kısa bir başlık ve yan yana seçeneklerle göster
export const FiltreSatiri = ({ baslik, children, sx = {} }) => (
  <Box role="group" aria-label={baslik} sx={{
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 1.25, rowGap: 0.75, minWidth: 0, ...sx,
  }}>
    <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'text.secondary', flexShrink: 0 }}>{baslik}</Typography>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, minWidth: 0 }}>{children}</Box>
  </Box>
);

// Filtre seçeneği: seçiliyken kırmızı çerçeve ve hafif kırmızı zemin, değilken koyu yüzey
export const Secim = ({ secili, children, ...props }) => (
  <ButtonBase aria-pressed={secili} {...props}
    sx={{
      px: 1.25, py: 0.6, minHeight: 34, borderRadius: 1.25, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, lineHeight: 1.2,
      border: '1px solid', borderColor: secili ? RENK.kirmiziAcik : RENK.cizgi,
      bgcolor: secili ? 'rgba(255,90,79,0.14)' : RENK.yuzey2, color: RENK.murekkep,
      '&:hover': { borderColor: secili ? RENK.kirmiziAcik : RENK.ikincil }, ...ODAK,
    }}>
    {children}
  </ButtonBase>
);
