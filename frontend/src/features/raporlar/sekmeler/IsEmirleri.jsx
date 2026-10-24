import React from 'react';
import { Box, Paper, Typography, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton } from '@mui/material';
import ViewIcon from '@mui/icons-material/Visibility';
import { formatTL, formatDate, karColor, headerSx } from '../bicim';
import KartItem from '../bilesenler/KartItem';
import { sayiYaz } from '../../../shared/utils/bicim';

// İş Emirleri (servis) sekmesi; personel süzgeci üstteki tarih çubuğundadır.
const IsEmirleri = ({ rapor, isMobile, seciliPersonel, onDetay }) => {
  const filtered = (rapor.isEmirleri || []).filter(ie => {
    if (!seciliPersonel) return true;
    const personel = (ie.teslim_eden_teknisyen || ie.olusturan_kisi || '').toLowerCase();
    return personel === seciliPersonel.toLowerCase();
  });
  const fGelir = filtered.reduce((t, r) => t + parseFloat(r.gercek_toplam_ucret || 0), 0);
  const fMaliyet = filtered.reduce((t, r) => t + parseFloat(r.toplam_maliyet || 0), 0);
  const fKar = filtered.reduce((t, r) => t + parseFloat(r.kar || 0), 0);
  return (
    <>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          { label: 'Toplam İş Emri', value: filtered.length },
          { label: 'Servis Gelir', value: `₺${formatTL(fGelir)}` },
          { label: 'Servis Maliyet', value: `₺${formatTL(fMaliyet)}` },
          { label: 'Servis Kâr', value: `₺${formatTL(fKar)}` },
        ].map((k, i) => (
          <Grid size={{ xs: 12, md: 3 }} key={i}>
            <KartItem label={k.label} value={k.value} />
          </Grid>
        ))}
      </Grid>
      {filtered.length > 0 ? (
        isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filtered.map((ie, i) => (
            <Paper key={i} sx={{ p: 1.5 }} onClick={() => onDetay(ie)}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle2" fontWeight="bold">#{ie.fis_no}</Typography>
                <Typography variant="caption" color="text.secondary">{formatDate(ie.tamamlama_tarihi || ie.created_at)}</Typography>
              </Box>
              <Typography variant="body2">{ie.musteri_ad_soyad} • {ie.marka} {ie.model_tip || ''}</Typography>
              <Typography variant="body2" color="text.secondary">{ie.teslim_eden_teknisyen || ie.olusturan_kisi || '-'} • {ie.km ? `${sayiYaz(parseInt(ie.km))} km` : ''}</Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                <Typography variant="body2">Gelir: <strong>{formatTL(ie.gercek_toplam_ucret)} ₺</strong></Typography>
                <Typography variant="body2" sx={{ color: karColor(ie.kar) }}>Kâr: <strong>{formatTL(ie.kar)} ₺</strong></Typography>
              </Box>
            </Paper>
          ))}
        </Box>
        ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow sx={{ bgcolor: '#C62828' }}>
              {['', 'Tarih', 'Fiş No', 'Müşteri', 'Telefon', 'Marka/Model', 'KM', 'Personel', 'Arıza/Şikayet', 'Gelir', 'Maliyet', 'Kâr'].map(h => <TableCell key={h} sx={headerSx}>{h}</TableCell>)}
            </TableRow></TableHead>
            <TableBody>
              {filtered.map((ie, i) => (
                <TableRow key={i} hover>
                  <TableCell>
                    <IconButton size="small" color="primary" onClick={() => onDetay(ie)}>
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                  <TableCell>{formatDate(ie.tamamlama_tarihi || ie.created_at)}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>#{ie.fis_no}</TableCell>
                  <TableCell>{ie.musteri_ad_soyad}</TableCell>
                  <TableCell>{ie.telefon || '-'}</TableCell>
                  <TableCell>{ie.marka} {ie.model_tip || ''}</TableCell>
                  <TableCell>{ie.km ? `${sayiYaz(parseInt(ie.km))} km` : '-'}</TableCell>
                  <TableCell>{ie.teslim_eden_teknisyen || ie.olusturan_kisi || '-'}</TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ie.ariza_sikayetler || '-'}</TableCell>
                  <TableCell>{formatTL(ie.gercek_toplam_ucret)} ₺</TableCell>
                  <TableCell>{formatTL(ie.toplam_maliyet)} ₺</TableCell>
                  <TableCell sx={{ color: karColor(ie.kar), fontWeight: 'bold' }}>{formatTL(ie.kar)} ₺</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        )
      ) : (
        <Typography color="text.secondary" textAlign="center" py={3}>Kayıt bulunamadı</Typography>
      )}
    </>
  );
};

export default IsEmirleri;
