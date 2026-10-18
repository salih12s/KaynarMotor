import React from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Alert, Chip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ViewIcon from '@mui/icons-material/Visibility';
import { hesaplaKomisyon, detectPlatform } from '../../komisyon';
import { formatTL } from '../eticaretVeri';

// Satış listesi: dar ekranda kartlar, geniş ekranda tablo; kâr sütunu yalnızca admin için.
const SatisListesi = ({ satislar, platformFiltre, isMobile, isAdmin, onDetay, onDuzenle, onSil }) => {
  const filtered = platformFiltre ? satislar.filter(s => s.platform_id === Number(platformFiltre)) : satislar;
  return isMobile ? (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    {filtered.length === 0 && <Alert severity="info">Kayıt yok</Alert>}
    {filtered.map(s => {
      const sPlatformTipi = detectPlatform(s.platform_adi);
      const sHesap = hesaplaKomisyon(s.satis_fiyati, s.alis_fiyati, s.komisyon_orani, s.kdv_orani || 20, s.kargo_ucreti || 0, s.adet, sPlatformTipi);
      return (
      <Paper key={s.id} sx={{ p: 1.5 }} onClick={() => onDetay(s)}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="subtitle2" fontWeight="bold">{s.urun_adi}</Typography>
          <Chip label={s.platform_adi || '-'} size="small" sx={{ bgcolor: '#ffebee', color: '#C62828', fontWeight: 'bold', fontSize: '0.7rem' }} />
        </Box>
        <Typography variant="body2" color="text.secondary">Adet: {s.adet} • {s.tarih ? new Date(s.tarih).toLocaleDateString('tr-TR') : '-'}</Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
          <Typography variant="body2">Alış: <strong>{formatTL(s.alis_fiyati)} ₺</strong></Typography>
          <Typography variant="body2">Satış: <strong>{formatTL(s.satis_fiyati)} ₺</strong></Typography>
          {isAdmin && <Typography variant="body2" sx={{ color: sHesap.netKar >= 0 ? 'green' : 'red' }}>Kâr: <strong>{formatTL(sHesap.netKar)} ₺</strong></Typography>}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }} onClick={e => e.stopPropagation()}>
          <IconButton size="small" color="info" onClick={() => onDuzenle(s)}><EditIcon /></IconButton>
          <IconButton size="small" color="error" onClick={() => onSil(s.id)}><DeleteIcon /></IconButton>
        </Box>
      </Paper>
      );
    })}
  </Box>
  ) : (
  <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: '#C62828' }}>
          {['Ürün', 'Platform', 'Adet', 'Alış (₺)', 'Satış (₺)', 'Komisyon (%)', 'KDV (%)', 'Komisyon (₺)', ...(isAdmin ? ['Kâr (₺)'] : []), 'Tarih', 'İşlemler'].map(h => (
            <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {filtered.map(s => {
          const sPlatformTipi = detectPlatform(s.platform_adi);
          const sHesap = hesaplaKomisyon(s.satis_fiyati, s.alis_fiyati, s.komisyon_orani, s.kdv_orani || 20, s.kargo_ucreti || 0, s.adet, sPlatformTipi);
          return (
          <TableRow key={s.id} hover>
            <TableCell>{s.urun_adi}</TableCell>
            <TableCell>{s.platform_adi || '-'}</TableCell>
            <TableCell>{s.adet}</TableCell>
            <TableCell>{formatTL(s.alis_fiyati)}</TableCell>
            <TableCell>{formatTL(s.satis_fiyati)}</TableCell>
            <TableCell>%{parseFloat(s.komisyon_orani || 0).toFixed(2)}</TableCell>
            <TableCell>%{parseFloat(s.kdv_orani || 20).toFixed(0)}</TableCell>
            <TableCell>{formatTL(sHesap.komisyonTutari)}</TableCell>
            {isAdmin && <TableCell sx={{ color: sHesap.netKar >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>{formatTL(sHesap.netKar)}</TableCell>}
            <TableCell>{s.tarih ? new Date(s.tarih).toLocaleDateString('tr-TR') : '-'}</TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>
              <IconButton size="small" color="primary" onClick={() => onDetay(s)}><ViewIcon /></IconButton>
              <IconButton size="small" color="info" onClick={() => onDuzenle(s)}><EditIcon /></IconButton>
              <IconButton size="small" color="error" onClick={() => onSil(s.id)}><DeleteIcon /></IconButton>
            </TableCell>
          </TableRow>
          );
        })}
        {filtered.length === 0 && <TableRow><TableCell colSpan={11} align="center">Kayıt yok</TableCell></TableRow>}
      </TableBody>
    </Table>
  </TableContainer>
  );
};

export default SatisListesi;
