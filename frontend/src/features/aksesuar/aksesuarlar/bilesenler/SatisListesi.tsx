import React from 'react';
import { IslemDugmesi } from '../../../../shared/ui';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Alert } from '@mui/material';

import { filtrele } from '../aksesuarVeri';
import { sayiYaz, tarihYaz, sayiDegeri } from '../../../../shared/utils/bicim';
import type { AksesuarSatis } from '../../../../shared/tipler';

// Satış listesi: dar ekranda kartlar (süzgeç sonucu boşsa bilgi kutusu), geniş ekranda tablo; kâr yalnızca kâr yetkisi olana.
interface SatisListesiProps {
  satislar: AksesuarSatis[];
  aksSearch: string;
  aksStart: string;
  aksEnd: string;
  isMobile: boolean;
  karGor: boolean;
  onDetay: (id: number) => void;
  onDuzenle: (satis: AksesuarSatis) => void;
  onSil: (id: number) => void;
}

const SatisListesi = ({ satislar, aksSearch, aksStart, aksEnd, isMobile, karGor, onDetay, onDuzenle, onSil }: SatisListesiProps) => {
  const durumRenk = (d: string) => (d === 'tamamlandi' ? 'success' : 'warning');
  return isMobile ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {(() => {
        const filteredSatislar = filtrele(satislar, { aksSearch, aksStart, aksEnd });
        if (filteredSatislar.length === 0) return <Alert severity="info">Kayıt yok</Alert>;
        return filteredSatislar.map((s) => (
          <Paper key={s.id} sx={{ p: 1.5 }} onClick={() => onDetay(s.id)}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                {s.ad_soyad}
              </Typography>
              <Chip
                label={s.durum === 'tamamlandi' ? 'Tamamlandı' : 'Beklemede'}
                size="small"
                color={durumRenk(s.durum)}
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {s.telefon || '-'} • {s.olusturan_kisi || '-'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tarihYaz(s.satis_tarihi)}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
              <Typography variant="body2">
                Satış: <strong>{sayiYaz(s.toplam_satis)} ₺</strong>
              </Typography>
              {karGor && (
                <Typography variant="body2" sx={{ color: sayiDegeri(s.kar) >= 0 ? 'green' : 'red' }}>
                  Kâr: <strong>{sayiYaz(s.kar)} ₺</strong>
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }} onClick={(e) => e.stopPropagation()}>
              <IslemDugmesi tur="duz" onClick={() => onDuzenle(s)} />
              <IslemDugmesi tur="sil" onClick={() => onSil(s.id)} />
            </Box>
          </Paper>
        ));
      })()}
    </Box>
  ) : (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table>
        <TableHead>
          <TableRow>
            {['Müşteri', 'Telefon', 'Toplam Satış', ...(karGor ? ['Kâr'] : []), 'Oluşturan', 'Durum', 'Tarih', 'İşlemler'].map((h) => (
              <TableCell key={h} align={['Toplam Satış', 'Kâr'].includes(h) ? 'right' : 'left'}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {filtrele(satislar, { aksSearch, aksStart, aksEnd }).map((s) => (
            <TableRow key={s.id} hover>
              <TableCell sx={{ fontWeight: 700 }}>{s.ad_soyad}</TableCell>
              <TableCell sx={{ color: '#5B5F66' }}>{s.telefon || '-'}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {sayiYaz(s.toplam_satis)} ₺
              </TableCell>
              {karGor && (
                <TableCell align="right" sx={{ color: sayiDegeri(s.kar) >= 0 ? '#1D6A3B' : '#C62828', fontWeight: 700 }}>
                  {sayiYaz(s.kar)} ₺
                </TableCell>
              )}
              <TableCell>{s.olusturan_kisi || '-'}</TableCell>
              <TableCell>
                <Chip label={s.durum === 'tamamlandi' ? 'Tamamlandı' : 'Beklemede'} size="small" color={durumRenk(s.durum)} />
              </TableCell>
              <TableCell sx={{ color: '#5B5F66' }}>{tarihYaz(s.satis_tarihi)}</TableCell>
              <TableCell>
                <IslemDugmesi tur="goz" onClick={() => onDetay(s.id)} />
                <IslemDugmesi tur="duz" onClick={() => onDuzenle(s)} />
                <IslemDugmesi tur="sil" onClick={() => onSil(s.id)} />
              </TableCell>
            </TableRow>
          ))}
          {satislar.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} align="center">
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
