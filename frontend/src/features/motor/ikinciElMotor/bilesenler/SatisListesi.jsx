import React from 'react';
import { IslemDugmesi, Plaka } from '../../../../shared/ui';
import { RENK } from '../../../../app/tokenlar';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert } from '@mui/material';

import { sayiYaz, tarihYaz } from '../../../../shared/utils/bicim';

const SAYISAL = ['KM', 'Alım', 'Satış', 'Noter Alış', 'Noter Satış', 'Kâr'];

// Satış listesi: dar ekranda kartlar, geniş ekranda tablo. Alım, kâr, düzenleme ve silme düğmeleri yetkiye (canAlis, canKar, salt, isAdmin) göre.
const SatisListesi = ({ filteredMotorlar, isMobile, canAlis, canKar, salt, isAdmin, onDetay, onDuzenle, onSil }) => {
  return isMobile ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {filteredMotorlar.length === 0 && <Alert severity="info">Kayıt yok</Alert>}
      {filteredMotorlar.map((m) => {
        return (
          <Paper key={m.id} sx={{ p: 1.5 }} onClick={() => onDetay(m.id)}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Plaka plaka={m.plaka} />
              <Typography variant="caption" color="text.secondary">
                {tarihYaz(m.satis_tarihi || m.tarih)}
              </Typography>
            </Box>
            <Typography variant="body2">
              {m.marka} {m.model} {m.yil ? `(${m.yil})` : ''}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {m.alici_adi || '-'} • {m.km ? sayiYaz(m.km) + ' km' : ''}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
              {canAlis && (
                <Typography variant="body2">
                  Alım: <strong>₺{sayiYaz(m.alis_fiyati)}</strong>
                </Typography>
              )}
              <Typography variant="body2">
                Satış: <strong>₺{sayiYaz(m.satis_fiyati)}</strong>
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
              <Typography variant="body2">
                Noter Alış: <strong>₺{sayiYaz(m.noter_alis)}</strong>
              </Typography>
              <Typography variant="body2">
                Noter Satış: <strong>₺{sayiYaz(m.noter_satis)}</strong>
              </Typography>
              {canKar && (
                <Typography variant="body2" sx={{ color: parseFloat(m.kar || 0) >= 0 ? RENK.yesil : RENK.kirmizi }}>
                  Kâr: <strong>₺{sayiYaz(m.kar)}</strong>
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }} onClick={(e) => e.stopPropagation()}>
              {!salt && <IslemDugmesi tur="duz" onClick={() => onDuzenle(m)} />}
              {isAdmin && <IslemDugmesi tur="sil" onClick={() => onSil(m.id)} />}
            </Box>
          </Paper>
        );
      })}
    </Box>
  ) : (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ '& td, & th': { px: 1, py: 0.8, fontSize: '0.86rem', whiteSpace: 'nowrap' } }}>
        <TableHead>
          <TableRow>
            {[
              'Plaka',
              'Marka / Model',
              'Yıl',
              'KM',
              ...(canAlis ? ['Alım'] : []),
              'Satış',
              'Noter Alış',
              'Noter Satış',
              ...(canKar ? ['Kâr'] : []),
              'Alıcı',
              'Satış Tarihi',
              'İşlemler',
            ].map((h) => (
              <TableCell key={h} align={SAYISAL.includes(h) ? 'right' : 'left'}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredMotorlar.map((m) => {
            return (
              <TableRow key={m.id} hover>
                <TableCell>
                  <Plaka plaka={m.plaka} />
                </TableCell>
                <TableCell>
                  <Box sx={{ fontWeight: 700 }}>{m.marka || '-'}</Box>
                  <Box sx={{ color: RENK.soluk }}>{m.model || '-'}</Box>
                </TableCell>
                <TableCell sx={{ color: RENK.soluk }}>{m.yil || '-'}</TableCell>
                <TableCell align="right">{m.km ? sayiYaz(m.km) : '-'}</TableCell>
                {canAlis && <TableCell align="right">{sayiYaz(m.alis_fiyati)}</TableCell>}
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {sayiYaz(m.satis_fiyati)}
                </TableCell>
                <TableCell align="right">{sayiYaz(m.noter_alis)}</TableCell>
                <TableCell align="right">{sayiYaz(m.noter_satis)}</TableCell>
                {canKar && (
                  <TableCell align="right" sx={{ fontWeight: 700, color: parseFloat(m.kar || 0) >= 0 ? RENK.yesil : RENK.kirmizi }}>
                    {sayiYaz(m.kar)}
                  </TableCell>
                )}
                <TableCell>{m.alici_adi || '-'}</TableCell>
                <TableCell sx={{ color: RENK.soluk }}>{tarihYaz(m.satis_tarihi || m.tarih)}</TableCell>
                <TableCell>
                  <IslemDugmesi tur="goz" onClick={() => onDetay(m.id)} />
                  {!salt && <IslemDugmesi tur="duz" onClick={() => onDuzenle(m)} />}
                  {isAdmin && <IslemDugmesi tur="sil" onClick={() => onSil(m.id)} />}
                </TableCell>
              </TableRow>
            );
          })}
          {filteredMotorlar.length === 0 && (
            <TableRow>
              <TableCell colSpan={10 + (canAlis ? 1 : 0) + (canKar ? 1 : 0)} align="center">
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
