import React from 'react';
import { Box } from '@mui/material';
import { sayiYaz, paraYaz } from '../../../../shared/utils/bicim';
import { OzetSeridi } from '../../../../shared/ui';

// Özet şeridi: satış sayısı, gelir, komisyon ve (e-ticaret yetkilisi için) kâr.
const IstatistikSatiri = ({ stats, hesaplananToplamKar, karGor }) => {
  const ogeler = [
    { etiket: 'Satış', deger: stats.toplam_satis || 0 },
    { etiket: 'Gelir', deger: `₺${sayiYaz(stats.toplam_gelir)}` },
    { etiket: 'Komisyon', deger: `₺${sayiYaz(stats.toplam_komisyon)}`, ton: 'bekle' },
    ...(karGor ? [{ etiket: 'Kâr', deger: `₺${paraYaz(hesaplananToplamKar)}`, ton: 'yesil' }] : []),
  ];
  return (
    <Box sx={{ mb: 2 }}>
      <OzetSeridi ogeler={ogeler} />
    </Box>
  );
};

export default IstatistikSatiri;
