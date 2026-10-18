import React from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Chip, Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ViewIcon from '@mui/icons-material/Visibility';
import { filtrele } from '../aksesuarVeri';

// Satış listesi: dar ekranda kartlar (süzgeç sonucu boşsa bilgi kutusu), geniş ekranda tablo; kâr yalnızca kâr yetkisi olana.
const SatisListesi = ({ satislar, aksSearch, aksStart, aksEnd, isMobile, karGor, onDetay, onDuzenle, onSil }) => {
  const durumRenk = (d) => d === 'tamamlandi' ? 'success' : 'warning';
  return isMobile ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {(() => {
    const filteredSatislar = filtrele(satislar, { aksSearch, aksStart, aksEnd });
        if (filteredSatislar.length === 0) return <Alert severity="info">Kayıt yok</Alert>;
        return filteredSatislar.map(s => (
          <Paper key={s.id} sx={{ p: 1.5 }} onClick={() => onDetay(s.id)}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="subtitle2" fontWeight="bold">{s.ad_soyad}</Typography>
              <Chip label={s.durum === 'tamamlandi' ? 'Tamamlandı' : 'Beklemede'} size="small" color={durumRenk(s.durum)} sx={{ height: 20, fontSize: '0.7rem' }} />
            </Box>
            <Typography variant="body2" color="text.secondary">{s.telefon || '-'} • {s.olusturan_kisi || '-'}</Typography>
            <Typography variant="body2" color="text.secondary">{s.satis_tarihi ? new Date(s.satis_tarihi).toLocaleDateString('tr-TR') : '-'}</Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
              <Typography variant="body2">Satış: <strong>{parseFloat(s.toplam_satis || 0).toLocaleString('tr-TR')} ₺</strong></Typography>
              {karGor && <Typography variant="body2" sx={{ color: parseFloat(s.kar || 0) >= 0 ? 'green' : 'red' }}>Kâr: <strong>{parseFloat(s.kar || 0).toLocaleString('tr-TR')} ₺</strong></Typography>}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }} onClick={e => e.stopPropagation()}>
              <IconButton size="small" color="info" onClick={() => onDuzenle(s)}><EditIcon /></IconButton>
              <IconButton size="small" color="error" onClick={() => onSil(s.id)}><DeleteIcon /></IconButton>
            </Box>
          </Paper>
        ));
      })()}
    </Box>
  ) : (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: 'primary.main' }}>
            {['Müşteri', 'Telefon', 'Toplam Satış', ...(karGor ? ['Kâr'] : []), 'Oluşturan', 'Durum', 'Tarih', 'İşlemler'].map(h => (
              <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
      {filtrele(satislar, { aksSearch, aksStart, aksEnd }).map(s => (
            <TableRow key={s.id} hover>
              <TableCell>{s.ad_soyad}</TableCell>
              <TableCell>{s.telefon || '-'}</TableCell>
              <TableCell>{parseFloat(s.toplam_satis || 0).toLocaleString('tr-TR')} ₺</TableCell>
              {karGor && <TableCell sx={{ color: parseFloat(s.kar || 0) >= 0 ? 'green' : 'red' }}>{parseFloat(s.kar || 0).toLocaleString('tr-TR')} ₺</TableCell>}
              <TableCell>{s.olusturan_kisi || '-'}</TableCell>
              <TableCell><Chip label={s.durum === 'tamamlandi' ? 'Tamamlandı' : 'Beklemede'} size="small" color={durumRenk(s.durum)} /></TableCell>
              <TableCell>{s.satis_tarihi ? new Date(s.satis_tarihi).toLocaleDateString('tr-TR') : '-'}</TableCell>
              <TableCell>
                <IconButton size="small" color="primary" onClick={() => onDetay(s.id)}><ViewIcon /></IconButton>
                <IconButton size="small" color="info" onClick={() => onDuzenle(s)}><EditIcon /></IconButton>
                <IconButton size="small" color="error" onClick={() => onSil(s.id)}><DeleteIcon /></IconButton>
              </TableCell>
            </TableRow>
          ))}
          {satislar.length === 0 && <TableRow><TableCell colSpan={8} align="center">Kayıt yok</TableCell></TableRow>}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default SatisListesi;
