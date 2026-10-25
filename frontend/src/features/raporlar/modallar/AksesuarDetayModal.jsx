import React from 'react';
import { DialogBasligi } from '../../../shared/ui';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { formatDate } from '../bicim';
import DurumChip from '../bilesenler/DurumChip';
import { sayiYaz } from '../../../shared/utils/bicim';

// Aksesuar satış detay penceresi; ürünlerin marka/beden/renk bilgisi stok listesinden eşlenir.
const AksesuarDetayModal = ({ open, data, onClose, isMobile, stokOptions }) => {
  const dialogProps = { open, onClose, maxWidth: 'md', fullWidth: true, fullScreen: isMobile };
  if (!data) return <Dialog {...dialogProps} />;
  const a = data;
  const parcalar = typeof a.parcalar === 'string' ? JSON.parse(a.parcalar) : a.parcalar || [];
  const enrichedParcalar = parcalar.map((p) => {
    const stok = stokOptions.find((s) => s.stok_adi === p.urun_adi);
    return { ...p, marka: stok?.marka, platform: stok?.platform, beden: stok?.beden, renk: stok?.renk };
  });
  const topSatis = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.satis_fiyati) || 0), 0);
  const topMaliyet = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.maliyet) || 0), 0);
  const topKar = topSatis - topMaliyet;
  return (
    <Dialog {...dialogProps}>
      <DialogBasligi baslik={<>Aksesuar Satış Detayı - {a.ad_soyad}</>} onKapat={onClose} />
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mb: 2, mt: 0.5 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 1.5, bgcolor: '#FBFBF8' }}>
              <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>
                Müşteri Bilgileri
              </Typography>
              <Typography variant="body2">
                <strong>Ad Soyad:</strong> {a.ad_soyad || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>Telefon:</strong> {a.telefon || '-'}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 1.5, bgcolor: '#FBFBF8' }}>
              <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>
                Satış Bilgileri
              </Typography>
              <Typography variant="body2">
                <strong>Ödeme Şekli:</strong> {a.odeme_sekli || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>Satış Tarihi:</strong> {formatDate(a.satis_tarihi)}
              </Typography>
              <Typography variant="body2">
                <strong>Durum:</strong> {<DurumChip durum={a.durum} />}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 1.5, bgcolor: '#FBFBF8' }}>
              <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>
                Kayıt Bilgileri
              </Typography>
              <Typography variant="body2">
                <strong>Oluşturan:</strong> {a.olusturan_kisi || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>Oluşturma:</strong> {formatDate(a.created_at)}
              </Typography>
              {a.tamamlama_tarihi && (
                <Typography variant="body2">
                  <strong>Tamamlanma:</strong> {formatDate(a.tamamlama_tarihi)}
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
        {a.aciklama && (
          <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#DCE6F4', borderLeft: '3px solid #1E4A86' }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#1E4A86' }}>
              Açıklama
            </Typography>
            <Typography variant="body2">{a.aciklama}</Typography>
          </Paper>
        )}
        {a.odeme_detaylari && (
          <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#E7DFF3', borderLeft: '3px solid #5B3A8C' }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#5B3A8C' }}>
              Ödeme Detayları
            </Typography>
            <Typography variant="body2">{a.odeme_detaylari}</Typography>
          </Paper>
        )}
        <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>
          Ürünler
        </Typography>
        {parcalar.length > 0 ? (
          isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {enrichedParcalar.map((p, i) => {
                const pSatis = (Number(p.adet) || 0) * (Number(p.satis_fiyati) || 0);
                const pMaliyet = (Number(p.adet) || 0) * (Number(p.maliyet) || 0);
                const pKar = pSatis - pMaliyet;
                return (
                  <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {p.urun_adi}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Adet: {p.adet} • Maliyet: ₺{sayiYaz(pMaliyet)} • Satış: ₺{sayiYaz(pSatis)}
                      {p.marka ? ` • ${p.marka}` : ''}
                      {p.platform ? ` • ${p.platform}` : ''}
                      {p.beden ? ` • ${p.beden}` : ''}
                      {p.renk ? ` • ${p.renk}` : ''}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: pKar >= 0 ? '#1D6A3B' : '#c62828', fontWeight: 'bold' }}>
                      Kâr: ₺{sayiYaz(pKar)}
                    </Typography>
                  </Paper>
                );
              })}
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F3F3EE' }}>
                    {['Ürün Adı', 'Marka', 'Platform', 'Beden', 'Renk', 'Adet', 'Maliyet', 'Satış Fiyatı', 'Kâr'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 'bold' }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {enrichedParcalar.map((p, i) => {
                    const pSatis = (Number(p.adet) || 0) * (Number(p.satis_fiyati) || 0);
                    const pMaliyet = (Number(p.adet) || 0) * (Number(p.maliyet) || 0);
                    const pKar = pSatis - pMaliyet;
                    return (
                      <TableRow key={i}>
                        <TableCell>{p.urun_adi}</TableCell>
                        <TableCell>{p.marka || '-'}</TableCell>
                        <TableCell>{p.platform || '-'}</TableCell>
                        <TableCell>{p.beden || '-'}</TableCell>
                        <TableCell>{p.renk || '-'}</TableCell>
                        <TableCell>{p.adet}</TableCell>
                        <TableCell>₺{sayiYaz(pMaliyet)}</TableCell>
                        <TableCell>₺{sayiYaz(pSatis)}</TableCell>
                        <TableCell sx={{ color: pKar >= 0 ? '#1D6A3B' : '#c62828', fontWeight: 'bold' }}>₺{sayiYaz(pKar)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            Ürün kaydı yok
          </Typography>
        )}
        <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Paper sx={{ px: 2, py: 1, bgcolor: '#F6DAD7' }}>
            <Typography variant="body2">
              Satış: <strong>₺{sayiYaz(topSatis)}</strong>
            </Typography>
          </Paper>
          <Paper sx={{ px: 2, py: 1, bgcolor: '#F7E7C4' }}>
            <Typography variant="body2">
              Maliyet: <strong>₺{sayiYaz(topMaliyet)}</strong>
            </Typography>
          </Paper>
          <Paper sx={{ px: 2, py: 1, bgcolor: '#D8EBDD' }}>
            <Typography variant="body2">
              Kâr: <strong style={{ color: topKar >= 0 ? '#1D6A3B' : '#c62828' }}>₺{sayiYaz(topKar)}</strong>
            </Typography>
          </Paper>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()}>Kapat</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AksesuarDetayModal;
