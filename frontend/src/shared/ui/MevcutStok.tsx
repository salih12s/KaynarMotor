import React from 'react';
import { Box } from '@mui/material';
import Damga from './Damga';
import { RENK } from '../../app/tokenlar';
import type { Sayi } from '../utils/bicim';

// Stok adedi: bitmişse "Tükendi" damgası, azsa (1-3) "N adet" uyarı damgası, yeterliyse yeşil rakam.
const MevcutStok = ({ adet }: { adet: Sayi }) => {
  const n = Number(adet) || 0;
  if (n <= 0) return <Damga ton="kirmizi">Tükendi</Damga>;
  if (n <= 3) return <Damga ton="bekle">{n} adet</Damga>;
  return (
    <Box component="span" sx={{ fontWeight: 700, color: RENK.yesil }}>
      {n}
    </Box>
  );
};

export default MevcutStok;
