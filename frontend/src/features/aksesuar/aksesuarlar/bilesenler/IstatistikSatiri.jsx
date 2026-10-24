import React from 'react';
import { Box, Button, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { sayiYaz } from '../../../../shared/utils/bicim';

// Üst çipler (toplam, bugün, beklemede, tamamlandı, gelir, yalnızca kâr yetkisi olana kâr) ve "Yeni Satış" düğmesi.
const IstatistikSatiri = ({ satislar, stats, karGor, onYeni }) => {
  const beklemedeCnt = satislar.filter((s) => s.durum === 'beklemede').length;
  const tamamlandiCnt = satislar.filter((s) => s.durum === 'tamamlandi').length;
  const todayCnt = satislar.filter((s) => {
    const d = new Date(s.satis_tarihi || s.created_at);
    return d.toDateString() === new Date().toDateString();
  }).length;

  const statChips = [
    { label: `Toplam: ${satislar.length}`, color: '#C62828', bg: '#ffebee' },
    { label: `Bugün: ${todayCnt}`, color: '#C62828', bg: '#ffebee' },
    { label: `Beklemede: ${beklemedeCnt}`, color: '#C62828', bg: '#ffebee' },
    { label: `İşlemde: 0`, color: '#C62828', bg: '#ffebee' },
    { label: `Tamamlandı: ${tamamlandiCnt}`, color: '#C62828', bg: '#ffebee' },
    { label: `İptal: 0`, color: '#C62828', bg: '#ffebee' },
    { label: `₺${sayiYaz(stats.toplam_gelir)}`, color: '#C62828', bg: '#ffebee' },
    ...(karGor ? [{ label: `Kâr: ₺${sayiYaz(stats.toplam_kar)}`, color: '#C62828', bg: '#ffebee' }] : []),
  ];
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
      {statChips.map((c, i) => (
        <Chip key={i} label={c.label} sx={{ bgcolor: c.bg, color: c.color, fontWeight: 'bold', fontSize: '0.8rem', borderLeft: `4px solid ${c.color}` }} />
      ))}
      <Box sx={{ flexGrow: 1 }} />
      <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={onYeni}>
        Yeni Satış
      </Button>
    </Box>
  );
};

export default IstatistikSatiri;
