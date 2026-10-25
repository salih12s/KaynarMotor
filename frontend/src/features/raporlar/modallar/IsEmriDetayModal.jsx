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
import { sayiYaz } from '../../../shared/utils/bicim';

// İş emri detay penceresi (parça listesi JSON metin olarak gelebilir).
const IsEmriDetayModal = ({ open, data, onClose, isMobile }) => {
  const dialogProps = { open, onClose, maxWidth: 'md', fullWidth: true, fullScreen: isMobile };
  if (!data) return <Dialog {...dialogProps} />;
  const d = data;
  const parcalar = typeof d.parcalar === 'string' ? JSON.parse(d.parcalar) : d.parcalar || [];
  const toplamFiyat = parcalar.reduce((t, p) => t + parseFloat(p.toplam_fiyat || 0), 0);
  const toplamMaliyet = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.maliyet) || 0), 0);
  const kar = toplamFiyat - toplamMaliyet;
  return (
    <Dialog {...dialogProps}>
      <DialogBasligi
        baslik={
          <>
            İş Emri #{d.fis_no} - {d.musteri_ad_soyad}
          </>
        }
        onKapat={onClose}
      />
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mb: 2, mt: 0.5 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 1.5, bgcolor: '#FBFBF8' }}>
              <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>
                Müşteri Bilgileri
              </Typography>
              <Typography variant="body2">
                <strong>Ad Soyad:</strong> {d.musteri_ad_soyad}
              </Typography>
              <Typography variant="body2">
                <strong>Telefon:</strong> {d.telefon || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>Adres:</strong> {d.adres || '-'}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 1.5, bgcolor: '#FBFBF8' }}>
              <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>
                Araç Bilgileri
              </Typography>
              <Typography variant="body2">
                <strong>Marka:</strong> {d.marka || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>Model/Tip:</strong> {d.model_tip || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>KM:</strong> {d.km ? `${sayiYaz(parseInt(d.km))} km` : '-'}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 1.5, bgcolor: '#FBFBF8' }}>
              <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>
                İş Emri Bilgileri
              </Typography>
              <Typography variant="body2">
                <strong>Personel:</strong> {d.teslim_eden_teknisyen || d.olusturan_kisi || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>Tarih:</strong> {formatDate(d.created_at)}
              </Typography>
              <Typography variant="body2">
                <strong>Tamamlanma:</strong> {formatDate(d.tamamlama_tarihi)}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
        {d.ariza_sikayetler && (
          <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#F7E7C4', borderLeft: '3px solid #A5530F' }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#A5530F' }}>
              Arıza / Şikayetler
            </Typography>
            <Typography variant="body2">{d.ariza_sikayetler}</Typography>
          </Paper>
        )}
        {d.aciklama && (
          <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#DCE6F4', borderLeft: '3px solid #1E4A86' }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#1E4A86' }}>
              Açıklama
            </Typography>
            <Typography variant="body2">{d.aciklama}</Typography>
          </Paper>
        )}
        <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>
          Parçalar ve İşçilik
        </Typography>
        {parcalar.length > 0 ? (
          isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {parcalar.map((p, i) => {
                const pSatis = parseFloat(p.toplam_fiyat || 0);
                const pMaliyet = (Number(p.adet) || 0) * (Number(p.maliyet) || 0);
                const pKar = pSatis - pMaliyet;
                return (
                  <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {p.takilan_parca}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Adet: {p.adet} • Birim: ₺{sayiYaz(p.birim_fiyat)} • Toplam: ₺{sayiYaz(pSatis)}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block' }}>
                      Maliyet: ₺{sayiYaz(pMaliyet)} •{' '}
                      <span style={{ color: pKar >= 0 ? '#1D6A3B' : '#c62828', fontWeight: 'bold' }}>Kâr: ₺{sayiYaz(pKar)}</span>
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
                    {['Takılan Parça', 'Adet', 'Birim Fiyat', 'Toplam', 'Maliyet', 'Kâr'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 'bold' }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parcalar.map((p, i) => {
                    const pSatis = parseFloat(p.toplam_fiyat || 0);
                    const pMaliyet = (Number(p.adet) || 0) * (Number(p.maliyet) || 0);
                    const pKar = pSatis - pMaliyet;
                    return (
                      <TableRow key={i}>
                        <TableCell>{p.takilan_parca}</TableCell>
                        <TableCell>{p.adet}</TableCell>
                        <TableCell>₺{sayiYaz(p.birim_fiyat)}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>₺{sayiYaz(pSatis)}</TableCell>
                        <TableCell>₺{sayiYaz(pMaliyet)}</TableCell>
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
            Parça kaydı yok
          </Typography>
        )}
        <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Paper sx={{ px: 2, py: 1, bgcolor: '#F6DAD7' }}>
            <Typography variant="body2">
              Toplam: <strong>₺{sayiYaz(toplamFiyat)}</strong>
            </Typography>
          </Paper>
          <Paper sx={{ px: 2, py: 1, bgcolor: '#F7E7C4' }}>
            <Typography variant="body2">
              Maliyet: <strong>₺{sayiYaz(toplamMaliyet)}</strong>
            </Typography>
          </Paper>
          <Paper sx={{ px: 2, py: 1, bgcolor: '#D8EBDD' }}>
            <Typography variant="body2">
              Kâr: <strong style={{ color: kar >= 0 ? '#1D6A3B' : '#c62828' }}>₺{sayiYaz(kar)}</strong>
            </Typography>
          </Paper>
        </Box>
        {d.odeme_detaylari && (
          <Paper sx={{ p: 1.5, mt: 2, bgcolor: '#E7DFF3', borderLeft: '3px solid #5B3A8C' }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#5B3A8C' }}>
              Ödeme Detayları
            </Typography>
            <Typography variant="body2">{d.odeme_detaylari}</Typography>
          </Paper>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()}>Kapat</Button>
      </DialogActions>
    </Dialog>
  );
};

export default IsEmriDetayModal;
