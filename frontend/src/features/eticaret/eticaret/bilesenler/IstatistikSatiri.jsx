import React from 'react';
import { Box, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { sayiYaz, paraYaz } from '../../../../shared/utils/bicim';
import { OzetSeridi } from '../../../../shared/ui';

// Özet şeridi (satış sayısı, gelir, komisyon, e-ticaret yetkilisi için kâr) ve sekmeye göre "Yeni Satış" / "Yeni Platform" (yalnız admin) düğmesi.
const IstatistikSatiri = ({ stats, hesaplananToplamKar, karGor, isAdmin, tab, onYeniSatis, onYeniPlatform }) => {
  const ogeler = [
    { etiket: 'Satış', deger: stats.toplam_satis || 0 },
    { etiket: 'Gelir', deger: `₺${sayiYaz(stats.toplam_gelir)}` },
    { etiket: 'Komisyon', deger: `₺${sayiYaz(stats.toplam_komisyon)}`, ton: 'bekle' },
    ...(karGor ? [{ etiket: 'Kâr', deger: `₺${paraYaz(hesaplananToplamKar)}`, ton: 'yesil' }] : []),
  ];
  return (
    <Box sx={{ mb: 2 }}>
      <OzetSeridi ogeler={ogeler} />
      {(tab === 0 || (tab === 1 && isAdmin)) && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
          {tab === 0 && (
            <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={onYeniSatis}>
              Yeni Satış
            </Button>
          )}
          {tab === 1 && isAdmin && (
            <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={onYeniPlatform}>
              Yeni Platform
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};

export default IstatistikSatiri;
