import React from 'react';
import { IslemDugmesi } from '../../../shared/ui';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert } from '@mui/material';

import { formatTL, formatDate, karColor, headerSx, sagaSutunlar } from '../bicim';
import DurumChip from '../bilesenler/DurumChip';
import KartItem, { KART_RENKLERI } from '../bilesenler/KartItem';

// Aksesuar Satışları sekmesi.
const AksesuarSatislari = ({ rapor, isMobile, onDetay }) => {
  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
        {[
          { label: 'Toplam Satış', value: rapor.aksesuarlar?.length || 0 },
          { label: 'Aksesuar Gelir', value: `₺${formatTL(rapor.aksesuarGelir)}` },
          { label: 'Aksesuar Maliyet', value: `₺${formatTL(rapor.aksesuarMaliyet)}` },
          { label: 'Aksesuar Kâr', value: `₺${formatTL(rapor.aksesuarKar)}` },
        ].map((k, i) => (
          <KartItem key={i} label={k.label} value={k.value} color={k.color || KART_RENKLERI[i % KART_RENKLERI.length]} />
        ))}
      </Box>
      {rapor.aksesuarlar && rapor.aksesuarlar.length > 0 ? (
        isMobile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {rapor.aksesuarlar.map((a, i) => (
              <Paper key={i} sx={{ p: 1.5 }} onClick={() => onDetay(a)}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {a.ad_soyad}
                  </Typography>
                  {<DurumChip durum={a.durum} />}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(a.tamamlama_tarihi || a.satis_tarihi || a.created_at)} • {a.olusturan_kisi || '-'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                  <Typography variant="body2">
                    Satış: <strong>{formatTL(a.toplam_satis)} ₺</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ color: karColor(a.kar) }}>
                    Kâr: <strong>{formatTL(a.kar)} ₺</strong>
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
            <Table sx={sagaSutunlar(7, 8, 9)}>
              <TableHead>
                <TableRow>
                  {['', 'Tarih', 'Müşteri', 'Telefon', 'Oluşturan', 'Ödeme Şekli', 'Satış', 'Maliyet', 'Kâr', 'Durum'].map((h) => (
                    <TableCell key={h} sx={headerSx}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rapor.aksesuarlar.map((a, i) => (
                  <TableRow key={i} hover>
                    <TableCell>
                      <IslemDugmesi tur="goz" onClick={() => onDetay(a)} />
                    </TableCell>
                    <TableCell>{formatDate(a.tamamlama_tarihi || a.satis_tarihi || a.created_at)}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{a.ad_soyad}</TableCell>
                    <TableCell>{a.telefon || '-'}</TableCell>
                    <TableCell>{a.olusturan_kisi || '-'}</TableCell>
                    <TableCell>{a.odeme_sekli || '-'}</TableCell>
                    <TableCell>{formatTL(a.toplam_satis)} ₺</TableCell>
                    <TableCell>{formatTL(a.toplam_maliyet)} ₺</TableCell>
                    <TableCell sx={{ color: karColor(a.kar), fontWeight: 'bold' }}>{formatTL(a.kar)} ₺</TableCell>
                    <TableCell>{<DurumChip durum={a.durum} />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      ) : (
        <Alert severity="info">Seçilen tarih aralığında aksesuar satışı bulunamadı.</Alert>
      )}
    </>
  );
};

export default AksesuarSatislari;
