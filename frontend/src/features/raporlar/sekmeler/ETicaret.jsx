import React from 'react';
import { Box, Paper, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert, Chip, IconButton } from '@mui/material';
import ViewIcon from '@mui/icons-material/Visibility';
import { formatTL, formatDate, karColor, headerSx } from '../bicim';
import KartItem from '../bilesenler/KartItem';
import { hesaplaKomisyon, detectPlatform } from '../../eticaret/komisyon';

// E-Ticaret sekmesi. Net kâr sunucudan değil hesaplaKomisyon ile satır satır hesaplanır.
const ETicaret = ({ rapor, hesaplananEticaretKar, isMobile, onDetay }) => {
  return (
    <>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          { label: 'Toplam Satış', value: rapor.eticaret?.length || 0 },
          { label: 'E-Ticaret Gelir', value: `₺${formatTL(rapor.eticaretGelir)}` },
          { label: 'E-Ticaret Maliyet', value: `₺${formatTL(rapor.eticaretMaliyet)}` },
          { label: 'E-Ticaret Kâr', value: `₺${formatTL(hesaplananEticaretKar)}` },
        ].map((k, i) => (
          <Grid size={{ xs: 12, md: 3 }} key={i}>
            <KartItem label={k.label} value={k.value} />
          </Grid>
        ))}
      </Grid>
      {rapor.eticaret && rapor.eticaret.length > 0 ? (
        isMobile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {rapor.eticaret.map((e, i) => {
              const miktar = parseInt(e.adet || 1);
              const satis = parseFloat(e.satis_fiyati || 0);
              const alis = parseFloat(e.alis_fiyati || 0);
              const pt = detectPlatform(e.platform_adi);
              const hesap = hesaplaKomisyon(e.satis_fiyati, e.alis_fiyati, e.komisyon_orani, e.kdv_orani || 20, e.kargo_ucreti || 0, e.adet, pt);
              const netKar = hesap.netKar;
              return (
                <Paper key={i} sx={{ p: 1.5 }} onClick={() => onDetay(e)}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {e.urun_adi || '-'}
                    </Typography>
                    <Chip
                      label={e.platform_adi || '-'}
                      size="small"
                      sx={{ bgcolor: '#ffebee', color: '#C62828', fontWeight: 'bold', fontSize: '0.65rem', height: 20 }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(e.tarih)} • Adet: {miktar}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="body2">
                      Alış: <strong>{formatTL(alis)} ₺</strong>
                    </Typography>
                    <Typography variant="body2">
                      Satış: <strong>{formatTL(satis)} ₺</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ color: karColor(netKar) }}>
                      Net Kâr: <strong>{formatTL(netKar)} ₺</strong>
                    </Typography>
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
                  {['', 'Tarih', 'Platform', 'Ürün', 'Adet', 'Alış', 'Satış', 'Kargo', 'Komisyon', 'Toplam Kesinti', 'Net Kâr'].map((h) => (
                    <TableCell key={h} sx={headerSx}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rapor.eticaret.map((e, i) => {
                  const miktar = parseInt(e.adet || 1);
                  const satis = parseFloat(e.satis_fiyati || 0);
                  const alis = parseFloat(e.alis_fiyati || 0);
                  const komisyonOrani = parseFloat(e.komisyon_orani || 0);
                  const kargoUcreti = parseFloat(e.kargo_ucreti || 0);
                  const pt = detectPlatform(e.platform_adi);
                  const hesap = hesaplaKomisyon(e.satis_fiyati, e.alis_fiyati, e.komisyon_orani, e.kdv_orani || 20, e.kargo_ucreti || 0, e.adet, pt);
                  const netKar = hesap.netKar;
                  return (
                    <TableRow key={i} hover>
                      <TableCell>
                        <IconButton size="small" color="primary" onClick={() => onDetay(e)}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                      <TableCell>{formatDate(e.tarih)}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{e.platform_adi || '-'}</TableCell>
                      <TableCell>{e.urun_adi || '-'}</TableCell>
                      <TableCell>{miktar}</TableCell>
                      <TableCell>{formatTL(alis)} ₺</TableCell>
                      <TableCell>{formatTL(satis)} ₺</TableCell>
                      <TableCell>{formatTL(kargoUcreti)} ₺</TableCell>
                      <TableCell>
                        {formatTL(hesap.komisyonTutari)} ₺ (%{komisyonOrani})
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{formatTL(hesap.toplamKomisyon)} ₺</TableCell>
                      <TableCell sx={{ color: karColor(netKar), fontWeight: 'bold' }}>{formatTL(netKar)} ₺</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )
      ) : (
        <Alert severity="info">Seçilen tarih aralığında e-ticaret satışı bulunamadı.</Alert>
      )}
    </>
  );
};

export default ETicaret;
