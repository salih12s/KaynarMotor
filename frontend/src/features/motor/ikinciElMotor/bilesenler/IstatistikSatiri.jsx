import React from 'react';
import { Box, Button, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

// Üst çipler (adet, satış tutarı, yalnızca admin için kâr), "Excel'e Aktar" ve "Motor Satış" düğmeleri.
const IstatistikSatiri = ({ motorlar, stats, canKar, salt, onExcel, onYeni }) => {
  const statChips = [
    { label: `Toplam: ${motorlar.length}`, color: '#C62828', bg: '#ffebee' },
    { label: `Satış: ₺${parseFloat(stats.toplam_satis_tutari || 0).toLocaleString('tr-TR')}`, color: '#C62828', bg: '#ffebee' },
    ...(canKar ? [{ label: `Kâr: ₺${parseFloat(stats.toplam_kar || 0).toLocaleString('tr-TR')}`, color: '#C62828', bg: '#ffebee' }] : []),
  ];
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
      {statChips.map((c, i) => (
        <Chip key={i} label={c.label} sx={{ bgcolor: c.bg, color: c.color, fontWeight: 'bold', fontSize: '0.8rem', borderLeft: `4px solid ${c.color}` }} />
      ))}
      <Box sx={{ flexGrow: 1 }} />
      <Button variant="outlined" size="large" startIcon={<FileDownloadIcon />} onClick={onExcel} sx={{ mr: 1, color: '#1B5E20', borderColor: '#1B5E20', '&:hover': { borderColor: '#1B5E20', bgcolor: '#E8F5E9' } }}>Excel'e Aktar</Button>
      {!salt && <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={onYeni} sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#b71c1c' } }}>Motor Satış</Button>}
    </Box>
  );
};

export default IstatistikSatiri;
