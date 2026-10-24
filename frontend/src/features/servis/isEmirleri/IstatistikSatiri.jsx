import React from 'react';
import { Box, Button, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { sayiYaz } from '../../../shared/utils/bicim';

// Üstteki sayı çipleri ve "Yeni İş Emri" düğmesi. Kâr çipi yalnızca karGor için.
const IstatistikSatiri = ({ istatistik: s, karGor, onYeni }) => {
  const etiketler = [
    `Toplam: ${s.toplam}`,
    `Bugün: ${s.bugun}`,
    `Beklemede: ${s.beklemede}`,
    `İşlemde: ${s.islemde}`,
    `Ödeme Bekl.: 0`,
    `Tamamlandı: ${s.tamamlandi}`,
    `İptal: 0`,
    `₺${sayiYaz(s.tutar)}`,
    ...(karGor ? [`Kar: ₺${sayiYaz(s.kar)}`] : []),
  ];
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
      {etiketler.map((label, i) => (
        <Chip key={i} label={label} sx={{ bgcolor: '#ffebee', color: '#C62828', fontWeight: 'bold', fontSize: '0.8rem', borderLeft: '4px solid #C62828' }} />
      ))}
      <Box sx={{ flexGrow: 1 }} />
      <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={onYeni}>
        Yeni İş Emri
      </Button>
    </Box>
  );
};

export default IstatistikSatiri;
