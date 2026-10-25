import React from 'react';
import { Box, Paper, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert } from '@mui/material';
import { formatTL, headerSx } from '../bicim';
import KartItem from '../bilesenler/KartItem';

// Yatırımcılar sekmesi (yalnızca admin): stok + motor satışlarından türetilen özet.
const Yatirimcilar = ({ yatirimciOzetGosterim, isMobile }) => {
  return (
    <>
      {yatirimciOzetGosterim.length === 0 ? (
        <Alert severity="info">Henüz yatırımcı bulunmuyor. Kullanıcı Yönetimi ekranından yatırımcı ekleyebilirsiniz.</Alert>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {[
              { label: 'Yatırımcı Sayısı', value: yatirimciOzetGosterim.length, color: '#C62828' },
              { label: 'Toplam Stok', value: yatirimciOzetGosterim.reduce((t, y) => t + Number(y.stok_adet || 0), 0), color: '#1E4A86' },
              { label: 'Toplam Satılan', value: yatirimciOzetGosterim.reduce((t, y) => t + Number(y.satilan_adet || 0), 0), color: '#A5530F' },
              {
                label: 'Toplam Yatırımcı Kârı',
                value: `₺${formatTL(yatirimciOzetGosterim.reduce((t, y) => t + Number(y.yatirimci_kar || 0), 0))}`,
                color: '#1D6A3B',
              },
            ].map((k, i) => (
              <Grid size={{ xs: 12, md: 3 }} key={i}>
                <KartItem label={k.label} value={k.value} color={k.color} />
              </Grid>
            ))}
          </Grid>
          {isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {yatirimciOzetGosterim.map((y, i) => (
                <Paper key={i} sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {y.ad_soyad}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 0.5 }}>
                    <Typography variant="body2">
                      Stok: <strong>{y.stok_adet}</strong>
                    </Typography>
                    <Typography variant="body2">
                      Satılan: <strong>{y.satilan_adet}</strong>
                    </Typography>
                    <Typography variant="body2">
                      Stok Değeri: <strong>{formatTL(y.stok_degeri)} ₺</strong>
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 0.5 }}>
                    <Typography variant="body2" sx={{ color: '#1E4A86' }}>
                      Yatırımcı Kârı: <strong>{formatTL(y.yatirimci_kar)} ₺</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#1D6A3B' }}>
                      İşletme Kârı: <strong>{formatTL(y.isletme_kar)} ₺</strong>
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Yatırımcı', 'Stok Adet', 'Satılan', 'Stok Değeri', 'Toplam Satış', 'Yatırımcı Kârı', 'İşletme Kârı'].map((h) => (
                      <TableCell key={h} sx={headerSx}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {yatirimciOzetGosterim.map((y, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>{y.ad_soyad}</TableCell>
                      <TableCell>{y.stok_adet}</TableCell>
                      <TableCell>{y.satilan_adet}</TableCell>
                      <TableCell>{formatTL(y.stok_degeri)} ₺</TableCell>
                      <TableCell>{formatTL(y.toplam_satis)} ₺</TableCell>
                      <TableCell sx={{ color: '#1E4A86', fontWeight: 'bold' }}>{formatTL(y.yatirimci_kar)} ₺</TableCell>
                      <TableCell sx={{ color: '#1D6A3B', fontWeight: 'bold' }}>{formatTL(y.isletme_kar)} ₺</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </>
  );
};

export default Yatirimcilar;
