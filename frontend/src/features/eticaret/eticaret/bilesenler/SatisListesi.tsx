import React from 'react';
import type { EticaretSatis } from '../../../../shared/tipler';
import { IslemDugmesi, sagaSutunlar } from '../../../../shared/ui';
import { RENK } from '../../../../app/tokenlar';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert, Chip } from '@mui/material';

import { hesaplaKomisyon, detectPlatform } from '../../komisyon';
import { formatTL } from '../eticaretVeri';
import { tarihYaz, sayiDegeri } from '../../../../shared/utils/bicim';

// Satış listesi: dar ekranda kartlar, geniş ekranda tablo; kâr sütunu yalnızca e-ticaret yetkisi olanlar için.
interface SatisListesiProps {
  satislar: EticaretSatis[];
  platformFiltre: string | number;
  isMobile: boolean;
  karGor: boolean;
  onDetay: (satis: EticaretSatis) => void;
  onDuzenle: (satis: EticaretSatis) => void;
  onSil: (id: number) => void;
}

const SatisListesi = ({ satislar, platformFiltre, isMobile, karGor, onDetay, onDuzenle, onSil }: SatisListesiProps) => {
  const filtered = platformFiltre ? satislar.filter((s) => s.platform_id === Number(platformFiltre)) : satislar;
  return isMobile ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {filtered.length === 0 && <Alert severity="info">Kayıt yok</Alert>}
      {filtered.map((s) => {
        const sPlatformTipi = detectPlatform(s.platform_adi);
        const sHesap = hesaplaKomisyon(s.satis_fiyati, s.alis_fiyati, s.komisyon_orani, s.kdv_orani || 20, s.kargo_ucreti || 0, s.adet, sPlatformTipi);
        return (
          <Paper key={s.id} sx={{ p: 1.5 }} onClick={() => onDetay(s)}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                {s.urun_adi}
              </Typography>
              <Chip label={s.platform_adi || '-'} size="small" sx={{ bgcolor: '#F6DAD7', color: '#C62828', fontWeight: 'bold', fontSize: '0.7rem' }} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Adet: {s.adet} • {tarihYaz(s.tarih)}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
              <Typography variant="body2">
                Alış: <strong>{formatTL(s.alis_fiyati)} ₺</strong>
              </Typography>
              <Typography variant="body2">
                Satış: <strong>{formatTL(s.satis_fiyati)} ₺</strong>
              </Typography>
              {karGor && (
                <Typography variant="body2" sx={{ color: sHesap.netKar >= 0 ? 'green' : 'red' }}>
                  Kâr: <strong>{formatTL(sHesap.netKar)} ₺</strong>
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }} onClick={(e) => e.stopPropagation()}>
              <IslemDugmesi tur="duz" onClick={() => onDuzenle(s)} />
              <IslemDugmesi tur="sil" onClick={() => onSil(s.id)} />
            </Box>
          </Paper>
        );
      })}
    </Box>
  ) : (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table sx={sagaSutunlar(...(karGor ? [3, 4, 5, 6, 7, 8, 9] : [3, 4, 5, 6, 7, 8]))}>
        <TableHead>
          <TableRow>
            {[
              'Ürün',
              'Platform',
              'Adet',
              'Alış (₺)',
              'Satış (₺)',
              'Komisyon (%)',
              'KDV (%)',
              'Komisyon (₺)',
              ...(karGor ? ['Kâr (₺)'] : []),
              'Tarih',
              'İşlemler',
            ].map((h) => (
              <TableCell key={h}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.map((s) => {
            const sPlatformTipi = detectPlatform(s.platform_adi);
            const sHesap = hesaplaKomisyon(s.satis_fiyati, s.alis_fiyati, s.komisyon_orani, s.kdv_orani || 20, s.kargo_ucreti || 0, s.adet, sPlatformTipi);
            return (
              <TableRow key={s.id} hover>
                <TableCell sx={{ fontWeight: 700 }}>{s.urun_adi}</TableCell>
                <TableCell>{s.platform_adi || '-'}</TableCell>
                <TableCell>{s.adet}</TableCell>
                <TableCell>{formatTL(s.alis_fiyati)}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{formatTL(s.satis_fiyati)}</TableCell>
                <TableCell>%{sayiDegeri(s.komisyon_orani).toFixed(2)}</TableCell>
                <TableCell>%{sayiDegeri(s.kdv_orani, 20).toFixed(0)}</TableCell>
                <TableCell>{formatTL(sHesap.komisyonTutari)}</TableCell>
                {karGor && <TableCell sx={{ color: sHesap.netKar >= 0 ? RENK.yesil : RENK.kirmizi, fontWeight: 'bold' }}>{formatTL(sHesap.netKar)}</TableCell>}
                <TableCell sx={{ color: RENK.soluk, whiteSpace: 'nowrap' }}>{tarihYaz(s.tarih)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <IslemDugmesi tur="goz" onClick={() => onDetay(s)} />
                  <IslemDugmesi tur="duz" onClick={() => onDuzenle(s)} />
                  <IslemDugmesi tur="sil" onClick={() => onSil(s.id)} />
                </TableCell>
              </TableRow>
            );
          })}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} align="center">
                Kayıt yok
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default SatisListesi;
