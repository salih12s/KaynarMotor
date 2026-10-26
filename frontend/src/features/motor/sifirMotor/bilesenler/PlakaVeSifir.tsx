import React from 'react';
import { Box } from '@mui/material';
import { Damga, Plaka } from '../../../../shared/ui';
import type { Motor } from '../../../../shared/tipler';
import { sifirSatisMi } from '../sifirVeri';

// Satış listelerinde motorun kimliği: plaka rozeti ve sıfır satışsa "Sıfır" damgası (sıfır motor çoğu zaman tescilsiz, plakasızdır).
const PlakaVeSifir = ({ m }: { m: Pick<Motor, 'plaka' | 'motor_durumu'> }) => (
  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
    <Plaka plaka={m.plaka} />
    {sifirSatisMi(m) && <Damga ton="yesil">Sıfır</Damga>}
  </Box>
);

export default PlakaVeSifir;
