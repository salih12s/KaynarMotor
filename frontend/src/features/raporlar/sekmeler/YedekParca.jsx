import React from 'react';
import { Box, Paper, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert } from '@mui/material';
import { formatTL, karColor, headerSx } from '../bicim';
import KartItem from '../bilesenler/KartItem';

// Yedek Parça (envanter) sekmesi.
const YedekParca = ({ rapor, isMobile }) => {
  return (
    <>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          { label: 'Toplam Ürün', value: rapor.yedekParcalar?.length || 0 },
          { label: 'Toplam Satış Değeri', value: `₺${formatTL(rapor.yedekParcaToplamDeger)}` },
          { label: 'Toplam Maliyet', value: `₺${formatTL(rapor.yedekParcaToplamMaliyet)}` },
          { label: 'Potansiyel Kâr', value: `₺${formatTL((rapor.yedekParcaToplamDeger || 0) - (rapor.yedekParcaToplamMaliyet || 0))}` },
        ].map((k, i) => (
          <Grid size={{ xs: 12, md: 3 }} key={i}>
            <KartItem label={k.label} value={k.value} />
          </Grid>
        ))}
      </Grid>
      {rapor.yedekParcalar && rapor.yedekParcalar.length > 0 ? (
        isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {rapor.yedekParcalar.map((yp, i) => {
            const alis = parseFloat(yp.alis_fiyati || 0);
            const satis = parseFloat(yp.satis_fiyati || 0);
            const kar = satis - alis;
            const oran = satis > 0 ? ((kar / satis) * 100).toFixed(1) : '0.0';
            return (
              <Paper key={i} sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>{yp.urun_adi}</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Typography variant="body2">Alış: <strong>{formatTL(alis)} ₺</strong></Typography>
                  <Typography variant="body2">Satış: <strong>{formatTL(satis)} ₺</strong></Typography>
                  <Typography variant="body2" sx={{ color: karColor(kar) }}>Kâr: <strong>{formatTL(kar)} ₺ (%{oran})</strong></Typography>
                </Box>
              </Paper>
            );
          })}
        </Box>
        ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow sx={{ bgcolor: '#C62828' }}>
              {['Ürün Adı', 'Alış Fiyatı', 'Satış Fiyatı', 'Kâr Marjı', 'Kâr Oranı'].map(h => <TableCell key={h} sx={headerSx}>{h}</TableCell>)}
            </TableRow></TableHead>
            <TableBody>
              {rapor.yedekParcalar.map((yp, i) => {
                const alis = parseFloat(yp.alis_fiyati || 0);
                const satis = parseFloat(yp.satis_fiyati || 0);
                const kar = satis - alis;
                const oran = satis > 0 ? ((kar / satis) * 100).toFixed(1) : '0.0';
                return (
                  <TableRow key={i} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{yp.urun_adi}</TableCell>
                    <TableCell>{formatTL(alis)} ₺</TableCell>
                    <TableCell>{formatTL(satis)} ₺</TableCell>
                    <TableCell sx={{ color: karColor(kar), fontWeight: 'bold' }}>{formatTL(kar)} ₺</TableCell>
                    <TableCell sx={{ color: karColor(kar), fontWeight: 'bold' }}>%{oran}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        )
      ) : (
        <Alert severity="info">Yedek parça kaydı bulunamadı.</Alert>
      )}
    </>
  );
};

export default YedekParca;
