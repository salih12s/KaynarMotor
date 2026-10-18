import React from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Alert } from '@mui/material';
import ViewIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import QrIcon from '@mui/icons-material/QrCode2';
import { printServisQr } from './servisYazdir';
import { durumRenk, durumLabel, formatTarih } from './isEmriVeri';

// Filtrelenmiş iş emirleri: dar ekranda kartlar, geniş ekranda tablo. Kâr sütunu yalnızca karGor için.
const IsEmriListesi = ({ filtered, isMobile, karGor, isAdmin, onDetay, onYazdir, onDuzenle, onSil }) => {
  return isMobile ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {filtered.length === 0 && <Alert severity="info">Kayıt bulunamadı</Alert>}
      {filtered.map(ie => {
        const toplam = parseFloat(ie.gercek_toplam_ucret || 0);
        const kar = parseFloat(ie.kar || 0);
        return (
          <Paper key={ie.id} sx={{ p: 1.5 }} onClick={() => onDetay(ie.id)}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="subtitle2" sx={{ color: '#C62828', fontWeight: 'bold' }}>#{ie.fis_no}</Typography>
              <Chip label={durumLabel(ie.durum)} size="small" color={durumRenk(ie.durum)} sx={{ height: 20, fontSize: '0.7rem' }} />
            </Box>
            <Typography variant="body2" fontWeight="bold">{ie.musteri_ad_soyad}</Typography>
            <Typography variant="body2" color="text.secondary">{ie.marka} {ie.model_tip} • {ie.telefon || '-'}</Typography>
            <Typography variant="body2" color="text.secondary">{formatTarih(ie.created_at || ie.tarih)} • {ie.teslim_eden_teknisyen || ie.teslim_alan_ad_soyad || ie.olusturan_kisi || '-'}</Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
              <Typography variant="body2">Toplam: <strong>₺{toplam.toLocaleString('tr-TR')}</strong></Typography>
              {karGor && <Typography variant="body2" sx={{ color: kar >= 0 ? '#2e7d32' : '#c62828' }}>Kâr: <strong>₺{kar.toLocaleString('tr-TR')}</strong></Typography>}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }} onClick={e => e.stopPropagation()}>
              <IconButton size="small" sx={{ color: '#C62828' }} onClick={() => onYazdir(ie.id)}><PrintIcon /></IconButton>
              {ie.plaka && (
                <IconButton size="small" sx={{ color: '#1a1a1a' }} onClick={() => printServisQr(ie.plaka)} title="Servis Geçmişi QR Yazdır"><QrIcon /></IconButton>
              )}
              <IconButton size="small" color="info" onClick={() => onDuzenle(ie.id)}><EditIcon /></IconButton>
              {isAdmin && <IconButton size="small" color="error" onClick={() => onSil(ie.id)}><DeleteIcon /></IconButton>}
            </Box>
          </Paper>
        );
      })}
    </Box>
  ) : (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ '& td, & th': { px: 0.75, py: 0.55, fontSize: '0.76rem' } }}>
        <TableHead>
          <TableRow sx={{ bgcolor: 'primary.main' }}>
            {['Fiş No', 'Müşteri', 'Araç', 'Telefon', 'Tarih/Durum', 'Personel', 'Arıza', 'Toplam', 'Maliyet', ...(karGor ? ['Kar'] : []), 'İşlemler'].map(h => (
              <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.map(ie => {
            const toplam = parseFloat(ie.gercek_toplam_ucret || 0);
            const maliyet = parseFloat(ie.toplam_maliyet || 0);
            const kar = parseFloat(ie.kar || 0);
            return (
              <TableRow key={ie.id} hover>
                <TableCell sx={{ color: '#C62828', fontWeight: 'bold' }}>{ie.fis_no}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{ie.musteri_ad_soyad}</TableCell>
                <TableCell>{ie.marka} {ie.model_tip}</TableCell>
                <TableCell>{ie.telefon}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontSize="0.8rem">{formatTarih(ie.created_at || ie.tarih)}</Typography>
                  <Chip label={durumLabel(ie.durum)} size="small" color={durumRenk(ie.durum)}
                    sx={{ height: 20, fontSize: '0.7rem', mt: 0.3 }} />
                </TableCell>
                <TableCell>{ie.teslim_eden_teknisyen || ie.teslim_alan_ad_soyad || ie.olusturan_kisi || '-'}</TableCell>
                <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ie.ariza_sikayetler || ''}>{ie.ariza_sikayetler || '-'}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>₺{toplam.toLocaleString('tr-TR')}</TableCell>
                <TableCell sx={{ color: '#C62828' }}>₺{maliyet.toLocaleString('tr-TR')}</TableCell>
                {karGor && <TableCell sx={{ color: kar >= 0 ? '#2e7d32' : '#c62828', fontWeight: 'bold' }}>₺{kar.toLocaleString('tr-TR')}</TableCell>}
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <IconButton size="small" color="primary" onClick={() => onDetay(ie.id)}><ViewIcon /></IconButton>
                  <IconButton size="small" sx={{ color: '#C62828' }} onClick={() => onYazdir(ie.id)}><PrintIcon /></IconButton>
                  {ie.plaka && (
                    <IconButton size="small" sx={{ color: '#1a1a1a' }} onClick={() => printServisQr(ie.plaka)} title="Servis Geçmişi QR Yazdır"><QrIcon /></IconButton>
                  )}
                  <IconButton size="small" color="info" onClick={() => onDuzenle(ie.id)}><EditIcon /></IconButton>
                  {isAdmin && (
                    <IconButton size="small" color="error" onClick={() => onSil(ie.id)}><DeleteIcon /></IconButton>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {filtered.length === 0 && (
            <TableRow><TableCell colSpan={11} align="center">Kayıt bulunamadı</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default IsEmriListesi;
