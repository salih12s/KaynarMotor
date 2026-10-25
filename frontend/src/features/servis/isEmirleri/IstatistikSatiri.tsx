import React from 'react';
import { Box } from '@mui/material';
import { sayiYaz } from '../../../shared/utils/bicim';
import { OzetSeridi } from '../../../shared/ui';
import type { OzetOgesi } from '../../../shared/ui/OzetSeridi';
import type { IsEmriIstatistigi } from './isEmriVeri';

// Sayfanın üstündeki özet şeridi. Kâr yalnızca karGor için.
const IstatistikSatiri = ({ istatistik: s, karGor }: { istatistik: IsEmriIstatistigi; karGor: boolean }) => {
  const ogeler: OzetOgesi[] = [
    { etiket: 'Toplam', deger: s.toplam },
    { etiket: 'Bugün', deger: s.bugun },
    { etiket: 'Beklemede', deger: s.beklemede, ton: 'bekle' },
    { etiket: 'İşlemde', deger: s.islemde, ton: 'mavi' },
    { etiket: 'Ödeme bekl.', deger: 0 },
    { etiket: 'Tamamlandı', deger: s.tamamlandi, ton: 'yesil' },
    { etiket: 'İptal', deger: 0 },
    { etiket: 'Ciro', deger: `₺${sayiYaz(s.tutar)}` },
    ...(karGor ? [{ etiket: 'Kâr', deger: `₺${sayiYaz(s.kar)}`, ton: 'yesil' as const }] : []),
  ];
  return (
    <Box sx={{ mb: 2 }}>
      <OzetSeridi ogeler={ogeler} />
    </Box>
  );
};

export default IstatistikSatiri;
