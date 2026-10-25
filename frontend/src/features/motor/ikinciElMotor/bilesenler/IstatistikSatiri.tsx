import React from 'react';
import { Box } from '@mui/material';
import { sayiYaz } from '../../../../shared/utils/bicim';
import { OzetSeridi } from '../../../../shared/ui';
import type { OzetOgesi } from '../../../../shared/ui/OzetSeridi';
import type { Motor, MotorIstatistik } from '../../../../shared/tipler';

// Üst özet şeridi: adet, satış tutarı, yalnızca admin için kâr.
const IstatistikSatiri = ({ motorlar, stats, canKar }: { motorlar: Motor[]; stats: MotorIstatistik; canKar: boolean }) => {
  const ogeler: OzetOgesi[] = [
    { etiket: 'Toplam', deger: motorlar.length },
    { etiket: 'Satış', deger: `₺${sayiYaz(stats.toplam_satis_tutari)}` },
    ...(canKar ? [{ etiket: 'Kâr', deger: `₺${sayiYaz(stats.toplam_kar)}`, ton: 'yesil' as const }] : []),
  ];
  return (
    <Box sx={{ mb: 2 }}>
      <OzetSeridi ogeler={ogeler} />
    </Box>
  );
};

export default IstatistikSatiri;
