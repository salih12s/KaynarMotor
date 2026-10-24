import React from 'react';
import { Box, Typography } from '@mui/material';
import { sayiYaz } from '../../../../shared/utils/bicim';

// Hızlı satış: kâr önizlemesi (yalnızca admin görür): satış - alış - masraf - komisyon, yatırımcı payı düşülmüş işletme kârı.
const KarOnizleme = ({ hs, canKar }) => {
  const { hizliSatis, hizliForm } = hs;
  return (
    canKar &&
    hizliSatis.motor &&
    (() => {
      const alis = parseFloat(hizliSatis.motor.alis_fiyati || 0);
      const masraf = parseFloat(hizliForm.masraflar || 0);
      const komisyon = parseFloat(hizliSatis.motor.komisyoncu_tutari || 0);
      const satis = parseFloat(hizliForm.satis_fiyati || 0);
      const kar = satis - alis - masraf - komisyon;
      const yatirimciKar = hizliSatis.motor.yatirimci_id ? parseFloat(hizliForm.yatirimci_kar || 0) : 0;
      const benimKar = kar - yatirimciKar;
      const fmt = (v) => `₺${sayiYaz(v)}`;
      return (
        <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: '#f1f8e9', border: '1px solid #c5e1a5' }}>
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
                <Typography variant="body2" fontWeight="bold" sx={{ color: '#1565C0' }}>
                  {fmt(yatirimciKar)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">İşletme Kârı (Sizin):</Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ color: '#2e7d32' }}>
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
