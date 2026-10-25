import React from 'react';
import { Box } from '@mui/material';
import { sayiYaz, paraYaz } from '../../../../shared/utils/bicim';
import { OzetSeridi } from '../../../../shared/ui';
import type { OzetOgesi } from '../../../../shared/ui/OzetSeridi';
import type { EticaretIstatistik } from '../../../../shared/tipler';

// Özet şeridi: satış sayısı, gelir, komisyon ve (e-ticaret yetkilisi için) kâr.
interface IstatistikSatiriProps {
  stats: EticaretIstatistik;
  hesaplananToplamKar: number;
  karGor: boolean;
}

const IstatistikSatiri = ({ stats, hesaplananToplamKar, karGor }: IstatistikSatiriProps) => {
  const ogeler: OzetOgesi[] = [
    { etiket: 'Satış', deger: stats.toplam_satis || 0 },
    { etiket: 'Gelir', deger: `₺${sayiYaz(stats.toplam_gelir)}` },
    { etiket: 'Komisyon', deger: `₺${sayiYaz(stats.toplam_komisyon)}`, ton: 'bekle' as const },
    ...(karGor ? [{ etiket: 'Kâr', deger: `₺${paraYaz(hesaplananToplamKar)}`, ton: 'yesil' as const }] : []),
  ];
  return (
    <Box sx={{ mb: 2 }}>
      <OzetSeridi ogeler={ogeler} />
    </Box>
  );
};

export default IstatistikSatiri;
