import React from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ViewIcon from '@mui/icons-material/Visibility';
import { sayiYaz, tarihYaz } from '../../../../shared/utils/bicim';

// Satış listesi: dar ekranda kartlar, geniş ekranda tablo. Alım, kâr, düzenleme ve silme düğmeleri yetkiye (canAlis, canKar, salt, isAdmin) göre.
const SatisListesi = ({ filteredMotorlar, isMobile, canAlis, canKar, salt, isAdmin, onDetay, onDuzenle, onSil }) => {
  return isMobile ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {filteredMotorlar.length === 0 && <Alert severity="info">Kayıt yok</Alert>}
      {filteredMotorlar.map((m) => {
        return (
          <Paper key={m.id} sx={{ p: 1.5 }} onClick={() => onDetay(m.id)}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                {m.plaka}
              </Typography>
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
                <Typography variant="body2" sx={{ color: parseFloat(m.kar || 0) >= 0 ? 'green' : 'red' }}>
                  Kâr: <strong>₺{sayiYaz(m.kar)}</strong>
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }} onClick={(e) => e.stopPropagation()}>
              {!salt && (
                <IconButton size="small" color="info" onClick={() => onDuzenle(m)}>
                  <EditIcon />
                </IconButton>
              )}
              {isAdmin && (
                <IconButton size="small" color="error" onClick={() => onSil(m.id)}>
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          </Paper>
        );
      })}
    </Box>
  ) : (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ '& td, & th': { px: 0.75, py: 0.6, fontSize: '0.78rem', whiteSpace: 'nowrap' } }}>
        <TableHead>
          <TableRow sx={{ bgcolor: '#C62828' }}>
            {[
              'Plaka',
              'Marka',
              'Model',
              'Yıl',
              'KM',
              ...(canAlis ? ['Alım (₺)'] : []),
              'Satış (₺)',
              'Noter Alış (₺)',
              'Noter Satış (₺)',
              ...(canKar ? ['Kâr (₺)'] : []),
              'Alıcı',
              'Satış Tarihi',
              'İşlemler',
            ].map((h) => (
              <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>
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
                  <strong>{m.plaka}</strong>
                </TableCell>
                <TableCell>{m.marka || '-'}</TableCell>
                <TableCell>{m.model || '-'}</TableCell>
                <TableCell>{m.yil || '-'}</TableCell>
                <TableCell>{m.km ? sayiYaz(m.km) : '-'}</TableCell>
                {canAlis && <TableCell>{sayiYaz(m.alis_fiyati)}</TableCell>}
                <TableCell>{sayiYaz(m.satis_fiyati)}</TableCell>
                <TableCell>{sayiYaz(m.noter_alis)}</TableCell>
                <TableCell>{sayiYaz(m.noter_satis)}</TableCell>
                {canKar && <TableCell sx={{ fontWeight: 'bold', color: parseFloat(m.kar || 0) >= 0 ? 'green' : 'red' }}>{sayiYaz(m.kar)}</TableCell>}
                <TableCell>{m.alici_adi || '-'}</TableCell>
                <TableCell>{tarihYaz(m.satis_tarihi || m.tarih)}</TableCell>
                <TableCell>
                  <IconButton size="small" color="primary" onClick={() => onDetay(m.id)}>
                    <ViewIcon />
                  </IconButton>
                  {!salt && (
                    <IconButton size="small" color="info" onClick={() => onDuzenle(m)}>
                      <EditIcon />
                    </IconButton>
                  )}
                  {isAdmin && (
                    <IconButton size="small" color="error" onClick={() => onSil(m.id)}>
                      <DeleteIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {filteredMotorlar.length === 0 && (
            <TableRow>
              <TableCell colSpan={11 + (canAlis ? 1 : 0) + (canKar ? 1 : 0)} align="center">
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
