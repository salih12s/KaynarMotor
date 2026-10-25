import React from 'react';
import { DialogBasligi } from '../../../../shared/ui';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

import { sayiYaz, tarihYaz } from '../../../../shared/utils/bicim';

// Satış detay penceresi: müşteri/satış/kayıt bilgisi, ürünler (stoktan marka/beden/renk), indirimli toplamlar ve kalan ödeme.
const SatisDetayModal = ({ open, data, onClose, onDuzenle, stokOptions, karGor, isMobile }) => {
  const dialogProps = { open, onClose, maxWidth: 'md', fullWidth: true, fullScreen: isMobile };
  if (!data) return <Dialog {...dialogProps} />;
  const d = data;
  const dp = d.parcalar || [];
  // Stok bilgilerini zenginleştir
  const enrichedDp = dp.map((p) => {
    const stok = stokOptions.find((s) => s.stok_adi === p.urun_adi);
    return { ...p, marka: stok?.marka, platform: stok?.platform, beden: stok?.beden, renk: stok?.renk };
  });
  const dBrutSatis = dp.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.satis_fiyati) || 0), 0);
  const dToplamMaliyet = dp.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.maliyet) || 0), 0);
  const dIndirim = Math.min(Number(d.indirim) || 0, dBrutSatis);
  const dNetSatis = dBrutSatis - dIndirim;
  const dKar = dNetSatis - dToplamMaliyet;
  return (
    <Dialog {...dialogProps}>
      <DialogBasligi baslik="Aksesuar Satış Detayı" onKapat={onClose} />
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mb: 2, mt: 0.5 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 1.5, bgcolor: '#FBFBF8' }}>
              <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>
                Müşteri Bilgileri
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Typography variant="body2">
                <strong>Ad Soyad:</strong> {d.ad_soyad || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>Telefon:</strong> {d.telefon || '-'}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 1.5, bgcolor: '#FBFBF8' }}>
              <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>
                Satış Bilgileri
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Typography variant="body2">
                <strong>Ödeme Şekli:</strong> {d.odeme_sekli || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>Satış Tarihi:</strong> {tarihYaz(d.satis_tarihi)}
              </Typography>
              <Typography variant="body2">
                <strong>Durum:</strong>{' '}
                <Chip label={d.durum === 'tamamlandi' ? 'Tamamlandı' : 'Beklemede'} size="small" color={d.durum === 'tamamlandi' ? 'success' : 'warning'} />
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 1.5, bgcolor: '#FBFBF8' }}>
              <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>
                Kayıt Bilgileri
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Typography variant="body2">
                <strong>Oluşturan:</strong> {d.olusturan_kisi || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>Oluşturma:</strong> {tarihYaz(d.created_at)}
              </Typography>
              {d.tamamlama_tarihi && (
                <Typography variant="body2">
                  <strong>Tamamlanma:</strong> {tarihYaz(d.tamamlama_tarihi)}
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>

        {d.aciklama && (
          <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#DCE6F4', borderLeft: '3px solid #1E4A86' }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#1E4A86' }}>
              Açıklama
            </Typography>
            <Typography variant="body2">{d.aciklama}</Typography>
          </Paper>
        )}

        {d.odeme_detaylari && (
          <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#E7DFF3', borderLeft: '3px solid #5B3A8C' }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#5B3A8C' }}>
              Ödeme Detayları
            </Typography>
            <Typography variant="body2">{d.odeme_detaylari}</Typography>
          </Paper>
        )}

        <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>
          Ürünler
        </Typography>
        {dp.length > 0 ? (
          isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {enrichedDp.map((p, i) => {
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
                    {karGor && (
                      <Typography variant="caption" sx={{ display: 'block', color: pKar >= 0 ? '#1D6A3B' : '#c62828', fontWeight: 'bold' }}>
                        Kâr: ₺{sayiYaz(pKar)}
                      </Typography>
                    )}
                  </Paper>
                );
              })}
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F3F3EE' }}>
                    {['Ürün Adı', 'Marka', 'Platform', 'Beden', 'Renk', 'Adet', 'Maliyet', 'Satış Fiyatı', 'Toplam', ...(karGor ? ['Kâr'] : [])].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 'bold' }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {enrichedDp.map((p, i) => {
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
                        <TableCell sx={{ fontWeight: 'bold' }}>₺{sayiYaz(pSatis)}</TableCell>
                        {karGor && <TableCell sx={{ color: pKar >= 0 ? '#1D6A3B' : '#c62828', fontWeight: 'bold' }}>₺{sayiYaz(pKar)}</TableCell>}
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
          {dIndirim > 0 && (
            <Paper sx={{ px: 2, py: 1, bgcolor: '#F3F3EE' }}>
              <Typography variant="body2">
                Ara Toplam: <strong>₺{sayiYaz(dBrutSatis)}</strong>
              </Typography>
            </Paper>
          )}
          {dIndirim > 0 && (
            <Paper sx={{ px: 2, py: 1, bgcolor: '#F6DAD7' }}>
              <Typography variant="body2" sx={{ color: '#c62828' }}>
                İndirim: <strong>−₺{sayiYaz(dIndirim)}</strong>
              </Typography>
            </Paper>
          )}
          <Paper sx={{ px: 2, py: 1, bgcolor: '#F6DAD7' }}>
            <Typography variant="body2">
              Toplam Satış: <strong>₺{sayiYaz(dNetSatis)}</strong>
            </Typography>
          </Paper>
          <Paper sx={{ px: 2, py: 1, bgcolor: '#F7E7C4' }}>
            <Typography variant="body2">
              Maliyet: <strong>₺{sayiYaz(dToplamMaliyet)}</strong>
            </Typography>
          </Paper>
          {karGor && (
            <Paper sx={{ px: 2, py: 1, bgcolor: '#D8EBDD' }}>
              <Typography variant="body2">
                Kâr: <strong style={{ color: dKar >= 0 ? '#1D6A3B' : '#c62828' }}>₺{sayiYaz(dKar)}</strong>
              </Typography>
            </Paper>
          )}
        </Box>
        <Paper
          sx={{
            mt: 2,
            p: 1.5,
            bgcolor: parseFloat(d.kalan_odeme || 0) > 0 ? '#F7E7C4' : '#D8EBDD',
            borderLeft: '4px solid',
            borderColor: parseFloat(d.kalan_odeme || 0) > 0 ? '#A5530F' : '#1D6A3B',
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold" sx={{ color: parseFloat(d.kalan_odeme || 0) > 0 ? '#A5530F' : '#1D6A3B' }}>
            {parseFloat(d.kalan_odeme || 0) > 0 ? `Kalan Ödeme: ₺${sayiYaz(d.kalan_odeme)}` : 'Ödeme Tamamlandı ✓'}
          </Typography>
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            onClose();
            onDuzenle(d);
          }}
          variant="outlined"
          startIcon={<EditIcon />}
        >
          Düzenle
        </Button>
        <Button onClick={onClose}>Kapat</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SatisDetayModal;
