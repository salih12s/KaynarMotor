import React from 'react';
import { Box, Button, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

// Üst çipler (satış sayısı, gelir, komisyon, yalnızca admin için kâr) ve sekmeye göre "Yeni Satış" / "Yeni Platform" düğmesi.
const IstatistikSatiri = ({ stats, hesaplananToplamKar, isAdmin, tab, onYeniSatis, onYeniPlatform }) => {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
      {[
        { label: `Satış: ${stats.toplam_satis || 0}`, color: '#C62828', bg: '#ffebee' },
        { label: `Gelir: ₺${parseFloat(stats.toplam_gelir || 0).toLocaleString('tr-TR')}`, color: '#C62828', bg: '#ffebee' },
        { label: `Komisyon: ₺${parseFloat(stats.toplam_komisyon || 0).toLocaleString('tr-TR')}`, color: '#C62828', bg: '#ffebee' },
        ...(isAdmin ? [{ label: `Kâr: ₺${hesaplananToplamKar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, color: '#C62828', bg: '#ffebee' }] : []),
      ].map((c, i) => (
        <Chip key={i} label={c.label} sx={{ bgcolor: c.bg, color: c.color, fontWeight: 'bold', fontSize: '0.8rem', borderLeft: `4px solid ${c.color}` }} />
      ))}
      <Box sx={{ flexGrow: 1 }} />
      {tab === 0 && <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={onYeniSatis} sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#b71c1c' } }}>Yeni Satış</Button>}
      {tab === 1 && isAdmin && <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={onYeniPlatform} sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#b71c1c' } }}>Yeni Platform</Button>}
    </Box>
  );
};

export default IstatistikSatiri;
