import React from 'react';
import { Box, Typography } from '@mui/material';
import { sayiYaz, sayiDegeri } from '../../../../shared/utils/bicim';
import type { HizliSatisDurumuVeIslemleri } from '../useHizliSatis';

// Hızlı satış: kâr önizlemesi (yalnızca admin görür): satış - alış - masraf - komisyon, yatırımcı payı düşülmüş işletme kârı.
const KarOnizleme = ({ hs, canKar }: { hs: HizliSatisDurumuVeIslemleri; canKar: boolean }) => {
  const { hizliSatis, hizliForm } = hs;
  return (
    canKar &&
    hizliSatis.motor &&
    (() => {
      const alis = sayiDegeri(hizliSatis.motor.alis_fiyati);
      const masraf = sayiDegeri(hizliForm.masraflar);
      const komisyon = sayiDegeri(hizliSatis.motor.komisyoncu_tutari);
      const satis = sayiDegeri(hizliForm.satis_fiyati);
      const kar = satis - alis - masraf - komisyon;
      const yatirimciKar = hizliSatis.motor.yatirimci_id ? sayiDegeri(hizliForm.yatirimci_kar) : 0;
      const benimKar = kar - yatirimciKar;
      const fmt = (v: number) => `₺${sayiYaz(v)}`;
      return (
        <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: '#D8EBDD', border: '1px solid #c5e1a5' }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
            Kâr Önizleme
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Toplam Kâr:</Typography>
            <Typography variant="body2" fontWeight="bold">
              {fmt(kar)}
            </Typography>
          </Box>
          {hizliSatis.motor.yatirimci_id ? (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Yatırımcı Kârı:</Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ color: '#1E4A86' }}>
                  {fmt(yatirimciKar)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">İşletme Kârı (Sizin):</Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ color: '#1D6A3B' }}>
                  {fmt(benimKar)}
                </Typography>
              </Box>
            </>
          ) : null}
        </Box>
      );
    })()
  );
};

export default KarOnizleme;
