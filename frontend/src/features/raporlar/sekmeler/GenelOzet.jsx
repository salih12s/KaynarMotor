import React from 'react';
import { Box, Paper, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { formatTL, karColor, headerSx } from '../bicim';

// Genel Özet sekmesi: toplam kartları + kategori tablosu (satıra tıklamak o sekmeye geçirir).
const GenelOzet = ({ rapor, toplamlar, isMobile, onSekmeAc }) => {
  const { hesaplananEticaretKar, duzeltilmisTotalKar, duzeltilmisTotalGelir, duzeltilmisTotalMaliyet } = toplamlar;
  return (
    <>
      {/* Toplam Kartları */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#C62828', color: 'white', borderRadius: 2 }}>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>Toplam Gelir</Typography>
            <Typography variant="h4" fontWeight="bold">₺{formatTL(duzeltilmisTotalGelir)}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#1565C0', color: 'white', borderRadius: 2 }}>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>Toplam Maliyet</Typography>
            <Typography variant="h4" fontWeight="bold">₺{formatTL(duzeltilmisTotalMaliyet)}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: duzeltilmisTotalKar >= 0 ? '#2e7d32' : '#C62828', color: 'white', borderRadius: 2 }}>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>Toplam Kâr</Typography>
            <Typography variant="h4" fontWeight="bold">₺{formatTL(duzeltilmisTotalKar)}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#E65100', color: 'white', borderRadius: 2 }}>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>Toplam İşlem</Typography>
            <Typography variant="h4" fontWeight="bold">{(rapor.motorlar?.length || 0) + (rapor.isEmirleri?.length || 0) + (rapor.aksesuarlar?.length || 0) + (rapor.eticaret?.length || 0) + (rapor.yedekParcalar?.length || 0)}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#4A148C', color: 'white', borderRadius: 2 }}>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>Motor Stok Değeri</Typography>
            <Typography variant="h4" fontWeight="bold">₺{formatTL(rapor.motorStokToplam)}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Kategori Detay */}
      {isMobile ? (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
        {[
          { label: 'Motor Satışları', count: rapor.motorlar?.length || 0, gelir: rapor.motorGelir, maliyet: rapor.motorMaliyet, kar: rapor.motorKar },
          { label: 'İş Emirleri (Servis)', count: rapor.isEmirleri?.length || 0, gelir: rapor.isEmriGelir, maliyet: rapor.isEmriMaliyet, kar: rapor.isEmriKar },
          { label: 'Aksesuar Satışları', count: rapor.aksesuarlar?.length || 0, gelir: rapor.aksesuarGelir, maliyet: rapor.aksesuarMaliyet, kar: rapor.aksesuarKar },
          { label: 'E-Ticaret', count: rapor.eticaret?.length || 0, gelir: rapor.eticaretGelir, maliyet: rapor.eticaretMaliyet, kar: hesaplananEticaretKar },
          { label: 'Yedek Parça (Envanter)', count: rapor.yedekParcalar?.length || 0, gelir: rapor.yedekParcaToplamDeger, maliyet: rapor.yedekParcaToplamMaliyet, kar: (rapor.yedekParcaToplamDeger || 0) - (rapor.yedekParcaToplamMaliyet || 0) },
        ].map((row, i) => {
          const oran = parseFloat(row.gelir || 0) > 0 ? ((parseFloat(row.kar || 0) / parseFloat(row.gelir || 1)) * 100).toFixed(1) : '0.0';
          const tabMap = { 'Motor Satışları': 1, 'İş Emirleri (Servis)': 2, 'Aksesuar Satışları': 3, 'E-Ticaret': 4, 'Yedek Parça (Envanter)': 5 };
          return (
            <Paper key={i} sx={{ p: 1.5, cursor: 'pointer' }} onClick={() => onSekmeAc(tabMap[row.label] || 0)}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle2" fontWeight="bold">{row.label}</Typography>
                <Typography variant="body2">{row.count} işlem</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2">Gelir: <strong>{formatTL(row.gelir)} ₺</strong></Typography>
                <Typography variant="body2">Maliyet: <strong>{formatTL(row.maliyet)} ₺</strong></Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                <Typography variant="body2" sx={{ color: karColor(row.kar) }}>Kâr: <strong>{formatTL(row.kar)} ₺</strong></Typography>
                <Typography variant="body2" sx={{ color: karColor(row.kar) }}>Oran: <strong>%{oran}</strong></Typography>
              </Box>
            </Paper>
          );
        })}
        <Paper sx={{ p: 1.5, bgcolor: '#f5f5f5' }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>TOPLAM</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="body2">Gelir: <strong>{formatTL(duzeltilmisTotalGelir)} ₺</strong></Typography>
            <Typography variant="body2">Maliyet: <strong>{formatTL(duzeltilmisTotalMaliyet)} ₺</strong></Typography>
            <Typography variant="body2" sx={{ color: karColor(duzeltilmisTotalKar) }}>Kâr: <strong>{formatTL(duzeltilmisTotalKar)} ₺</strong></Typography>
          </Box>
        </Paper>
      </Box>
      ) : (
      <TableContainer component={Paper} sx={{ mb: 2, overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#C62828' }}>
              {['Kategori', 'İşlem Sayısı', 'Gelir', 'Maliyet', 'Kâr', 'Kâr Oranı'].map(h => (
                <TableCell key={h} sx={headerSx}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              { label: 'Motor Satışları', count: rapor.motorlar?.length || 0, gelir: rapor.motorGelir, maliyet: rapor.motorMaliyet, kar: rapor.motorKar },
              { label: 'İş Emirleri (Servis)', count: rapor.isEmirleri?.length || 0, gelir: rapor.isEmriGelir, maliyet: rapor.isEmriMaliyet, kar: rapor.isEmriKar },
              { label: 'Aksesuar Satışları', count: rapor.aksesuarlar?.length || 0, gelir: rapor.aksesuarGelir, maliyet: rapor.aksesuarMaliyet, kar: rapor.aksesuarKar },
              { label: 'E-Ticaret', count: rapor.eticaret?.length || 0, gelir: rapor.eticaretGelir, maliyet: rapor.eticaretMaliyet, kar: hesaplananEticaretKar },
              { label: 'Yedek Parça (Envanter)', count: rapor.yedekParcalar?.length || 0, gelir: rapor.yedekParcaToplamDeger, maliyet: rapor.yedekParcaToplamMaliyet, kar: (rapor.yedekParcaToplamDeger || 0) - (rapor.yedekParcaToplamMaliyet || 0) },
            ].map((row, i) => {
              const oran = parseFloat(row.gelir || 0) > 0 ? ((parseFloat(row.kar || 0) / parseFloat(row.gelir || 1)) * 100).toFixed(1) : '0.0';
              const tabMap = { 'Motor Satışları': 1, 'İş Emirleri (Servis)': 2, 'Aksesuar Satışları': 3, 'E-Ticaret': 4, 'Yedek Parça (Envanter)': 5 };
              return (
                <TableRow key={i} hover sx={{ cursor: 'pointer' }} onClick={() => onSekmeAc(tabMap[row.label] || 0)}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{row.label}</TableCell>
                  <TableCell>{row.count}</TableCell>
                  <TableCell>{formatTL(row.gelir)} ₺</TableCell>
                  <TableCell>{formatTL(row.maliyet)} ₺</TableCell>
                  <TableCell sx={{ color: karColor(row.kar), fontWeight: 'bold' }}>{formatTL(row.kar)} ₺</TableCell>
                  <TableCell sx={{ color: karColor(row.kar), fontWeight: 'bold' }}>%{oran}</TableCell>
                </TableRow>
              );
            })}
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 'bold', fontSize: '1rem' }}>TOPLAM</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{(rapor.motorlar?.length || 0) + (rapor.isEmirleri?.length || 0) + (rapor.aksesuarlar?.length || 0) + (rapor.eticaret?.length || 0) + (rapor.yedekParcalar?.length || 0)}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{formatTL(duzeltilmisTotalGelir)} ₺</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{formatTL(duzeltilmisTotalMaliyet)} ₺</TableCell>
              <TableCell sx={{ color: karColor(duzeltilmisTotalKar), fontWeight: 'bold', fontSize: '1rem' }}>{formatTL(duzeltilmisTotalKar)} ₺</TableCell>
              <TableCell sx={{ color: karColor(duzeltilmisTotalKar), fontWeight: 'bold' }}>
                %{duzeltilmisTotalGelir > 0 ? ((duzeltilmisTotalKar / duzeltilmisTotalGelir) * 100).toFixed(1) : '0.0'}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      )}
    </>
  );
};

export default GenelOzet;
