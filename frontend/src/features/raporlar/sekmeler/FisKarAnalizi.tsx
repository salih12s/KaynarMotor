import React from 'react';
import type { FisKarSatiri } from '../../../shared/tipler';
import { sayiDegeri } from '../../../shared/utils/bicim';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert } from '@mui/material';
import { formatTL, formatDate, karColor, headerSx, sagaSutunlar } from '../bicim';
import DurumChip from '../bilesenler/DurumChip';
import KartItem, { KART_RENKLERI, kartlar } from '../bilesenler/KartItem';

// Fiş Kâr Analizi sekmesi (tamamlanmış iş emri fişleri).
const FisKarAnalizi = ({ fisKar, isMobile }: { fisKar: FisKarSatiri[] | null; isMobile: boolean }) => {
  return (
    <>
      {fisKar && Array.isArray(fisKar) && fisKar.length > 0 ? (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
            {kartlar([
              { label: 'Toplam Fiş', value: fisKar.length },
              { label: 'Toplam Gelir', value: `₺${formatTL(fisKar.reduce((t, r) => t + sayiDegeri(r.gercek_toplam_ucret), 0))}` },
              { label: 'Toplam Maliyet', value: `₺${formatTL(fisKar.reduce((t, r) => t + sayiDegeri(r.toplam_maliyet), 0))}` },
              { label: 'Toplam Kâr', value: `₺${formatTL(fisKar.reduce((t, r) => t + sayiDegeri(r.kar), 0))}` },
            ]).map((k, i) => (
              <KartItem key={i} label={k.label} value={k.value} color={k.color || KART_RENKLERI[i % KART_RENKLERI.length]} />
            ))}
          </Box>
          {isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {fisKar.map((r, i) => {
                const oran = sayiDegeri(r.gercek_toplam_ucret) > 0 ? ((sayiDegeri(r.kar) / sayiDegeri(r.gercek_toplam_ucret, 1)) * 100).toFixed(1) : '0.0';
                return (
                  <Paper key={i} sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        #{r.fis_no}
                      </Typography>
                      {<DurumChip durum={r.durum} />}
                    </Box>
                    <Typography variant="body2">
                      {r.musteri_ad_soyad} • {formatDate(r.tamamlama_tarihi || r.created_at)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant="body2">
                        Gelir: <strong>{formatTL(r.gercek_toplam_ucret)} ₺</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ color: karColor(r.kar) }}>
                        Kâr:{' '}
                        <strong>
                          {formatTL(r.kar)} ₺ (%{oran})
                        </strong>
                      </Typography>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
              <Table sx={sagaSutunlar(5, 6, 7, 8)}>
                <TableHead>
                  <TableRow>
                    {['Tarih', 'Fiş No', 'Müşteri', 'Durum', 'Toplam Gelir', 'Toplam Maliyet', 'Kâr', 'Kâr Oranı'].map((h) => (
                      <TableCell key={h} sx={headerSx}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fisKar.map((r, i) => {
                    const oran = sayiDegeri(r.gercek_toplam_ucret) > 0 ? ((sayiDegeri(r.kar) / sayiDegeri(r.gercek_toplam_ucret, 1)) * 100).toFixed(1) : '0.0';
                    return (
                      <TableRow key={i} hover>
                        <TableCell>{formatDate(r.tamamlama_tarihi || r.created_at)}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>#{r.fis_no}</TableCell>
                        <TableCell>{r.musteri_ad_soyad}</TableCell>
                        <TableCell>{<DurumChip durum={r.durum} />}</TableCell>
                        <TableCell>{formatTL(r.gercek_toplam_ucret)} ₺</TableCell>
                        <TableCell>{formatTL(r.toplam_maliyet)} ₺</TableCell>
                        <TableCell sx={{ color: karColor(r.kar), fontWeight: 'bold' }}>{formatTL(r.kar)} ₺</TableCell>
                        <TableCell sx={{ color: karColor(r.kar), fontWeight: 'bold' }}>%{oran}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      ) : (
        <Alert severity="info">Seçilen tarih aralığında tamamlanmış fiş bulunamadı.</Alert>
      )}
    </>
  );
};

export default FisKarAnalizi;
