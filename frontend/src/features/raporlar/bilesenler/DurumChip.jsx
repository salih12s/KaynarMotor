import React from 'react';
import { Chip } from '@mui/material';

const DURUMLAR = {
  stokta: { label: 'Stokta', color: '#666', bg: '#f5f5f5' },
  beklemede: { label: 'Beklemede', color: '#ed6c02', bg: '#fff3e0' },
  kapora: { label: 'Kapora', color: '#e65100', bg: '#fff3e0' },
  devam_ediyor: { label: 'İşlemde', color: '#1565C0', bg: '#e3f2fd' },
  odeme_bekliyor: { label: 'Ödeme Bekl.', color: '#9c27b0', bg: '#f3e5f5' },
  devir_bekliyor: { label: 'Devir Bekliyor', color: '#9c27b0', bg: '#f3e5f5' },
  tamamlandi: { label: 'Tamamlandı', color: '#2e7d32', bg: '#e8f5e9' },
  iptal: { label: 'İptal', color: '#d32f2f', bg: '#ffebee' },
  perte: { label: 'Perte', color: '#d32f2f', bg: '#ffebee' },
};

// İş emri / aksesuar satışı durumunu renkli etiket olarak gösterir
const DurumChip = ({ durum }) => {
  const d = DURUMLAR[durum] || { label: durum || '-', color: '#666', bg: '#f5f5f5' };
  return <Chip size="small" label={d.label} sx={{ bgcolor: d.bg, color: d.color, fontWeight: 'bold', fontSize: '0.7rem' }} />;
};

export default DurumChip;
