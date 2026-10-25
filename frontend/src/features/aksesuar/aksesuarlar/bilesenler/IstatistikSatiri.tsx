import React from 'react';
import { Box } from '@mui/material';
import { sayiYaz } from '../../../../shared/utils/bicim';
import { OzetSeridi } from '../../../../shared/ui';
import type { OzetOgesi } from '../../../../shared/ui/OzetSeridi';
import type { AksesuarIstatistik, AksesuarSatis } from '../../../../shared/tipler';

// Üst özet şeridi: toplam, bugün, beklemede, tamamlandı, gelir ve yalnızca kâr yetkisi olana kâr.
const IstatistikSatiri = ({ satislar, stats, karGor }: { satislar: AksesuarSatis[]; stats: AksesuarIstatistik; karGor: boolean }) => {
  const beklemedeCnt = satislar.filter((s) => s.durum === 'beklemede').length;
  const tamamlandiCnt = satislar.filter((s) => s.durum === 'tamamlandi').length;
  const todayCnt = satislar.filter((s) => {
    const d = new Date(s.satis_tarihi || s.created_at);
    return d.toDateString() === new Date().toDateString();
  }).length;

  const ogeler: OzetOgesi[] = [
    { etiket: 'Toplam', deger: satislar.length },
    { etiket: 'Bugün', deger: todayCnt },
    { etiket: 'Beklemede', deger: beklemedeCnt, ton: 'bekle' },
    { etiket: 'İşlemde', deger: 0, ton: 'mavi' },
    { etiket: 'Tamamlandı', deger: tamamlandiCnt, ton: 'yesil' },
    { etiket: 'İptal', deger: 0 },
    { etiket: 'Satış', deger: `₺${sayiYaz(stats.toplam_gelir)}` },
    ...(karGor ? [{ etiket: 'Kâr', deger: `₺${sayiYaz(stats.toplam_kar)}`, ton: 'yesil' as const }] : []),
  ];
  return (
    <Box sx={{ mb: 2 }}>
      <OzetSeridi ogeler={ogeler} />
    </Box>
  );
};

export default IstatistikSatiri;
