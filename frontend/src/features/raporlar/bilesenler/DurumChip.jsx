import React from 'react';
import { Chip } from '@mui/material';

const DURUMLAR = {
  stokta: { label: 'Stokta', color: '#666', bg: '#F3F3EE' },
  beklemede: { label: 'Beklemede', color: '#A5530F', bg: '#F7E7C4' },
  kapora: { label: 'Kapora', color: '#A5530F', bg: '#F7E7C4' },
  devam_ediyor: { label: 'İşlemde', color: '#1E4A86', bg: '#DCE6F4' },
  odeme_bekliyor: { label: 'Ödeme Bekl.', color: '#5B3A8C', bg: '#E7DFF3' },
  devir_bekliyor: { label: 'Devir Bekliyor', color: '#5B3A8C', bg: '#E7DFF3' },
  tamamlandi: { label: 'Tamamlandı', color: '#1D6A3B', bg: '#D8EBDD' },
  iptal: { label: 'İptal', color: '#A61F1F', bg: '#F6DAD7' },
  perte: { label: 'Perte', color: '#A61F1F', bg: '#F6DAD7' },
};

// İş emri / aksesuar satışı durumunu renkli etiket olarak gösterir
const DurumChip = ({ durum }) => {
  const d = DURUMLAR[durum] || { label: durum || '-', color: '#666', bg: '#F3F3EE' };
  return <Chip size="small" label={d.label} sx={{ bgcolor: d.bg, color: d.color, fontWeight: 'bold', fontSize: '0.7rem' }} />;
};

export default DurumChip;
