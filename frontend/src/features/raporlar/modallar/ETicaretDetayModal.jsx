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
  TableRow,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { formatTL, formatDate } from '../bicim';
import { hesaplaKomisyon, detectPlatform } from '../../eticaret/komisyon';

// E-ticaret satış detay penceresi (komisyon/kesinti dökümü).
const ETicaretDetayModal = ({ open, data, onClose, isMobile }) => {
  const dialogProps = { open, onClose, maxWidth: 'md', fullWidth: true, fullScreen: isMobile };
  if (!data) return <Dialog {...dialogProps} />;
  const e = data;
  const miktar = parseInt(e.adet || 1);
  const satis = parseFloat(e.satis_fiyati || 0);
  const alis = parseFloat(e.alis_fiyati || 0);
  const komisyonOrani = parseFloat(e.komisyon_orani || 0);
  const kdvOrani = parseFloat(e.kdv_orani || 20);
  const kargoUcreti = parseFloat(e.kargo_ucreti || 0);
  const pt = detectPlatform(e.platform_adi);
  const hesap = hesaplaKomisyon(e.satis_fiyati, e.alis_fiyati, e.komisyon_orani, e.kdv_orani || 20, e.kargo_ucreti || 0, e.adet, pt);
  const komisyonTutari = hesap.komisyonTutari;
  const toplamSatis = satis * miktar;
  const toplamAlis = alis * miktar;
  const netKar = hesap.netKar;
  const toplamKesinti = hesap.toplamKomisyon;
  const karOrani = toplamSatis > 0 ? ((netKar / toplamSatis) * 100).toFixed(1) : '0.0';
  return (
    <Dialog {...dialogProps}>
      <DialogBasligi baslik={<>E-Ticaret Satış Detayı - {e.urun_adi}</>} onKapat={onClose} />
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mb: 2, mt: 0.5 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 1.5, bgcolor: '#FBFBF8' }}>
              <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>
                Ürün Bilgileri
              </Typography>
              <Typography variant="body2">
                <strong>Ürün:</strong> {e.urun_adi || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>Platform:</strong> {e.platform_adi || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>Adet:</strong> {miktar}
              </Typography>
              <Typography variant="body2">
                <strong>Tarih:</strong> {formatDate(e.tarih)}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 1.5, bgcolor: '#FBFBF8' }}>
              <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>
                Fiyat Bilgileri
              </Typography>
              <Typography variant="body2">
                <strong>Alış Fiyatı:</strong> ₺{formatTL(alis)}
              </Typography>
              <Typography variant="body2">
                <strong>Satış Fiyatı:</strong> ₺{formatTL(satis)}
              </Typography>
              <Typography variant="body2">
                <strong>Toplam Alış:</strong> ₺{formatTL(toplamAlis)}
              </Typography>
              <Typography variant="body2">
                <strong>Toplam Satış:</strong> ₺{formatTL(toplamSatis)}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 1.5, bgcolor: '#FBFBF8' }}>
              <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>
                Platform Bilgileri
              </Typography>
              <Typography variant="body2">
                <strong>Komisyon Oranı:</strong> %{komisyonOrani}
              </Typography>
              <Typography variant="body2">
                <strong>KDV Oranı:</strong> %{kdvOrani}
              </Typography>
              <Typography variant="body2">
                <strong>Kargo Ücreti:</strong> ₺{formatTL(kargoUcreti)}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>
          Kesinti Detayları
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, overflowX: 'auto' }}>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell>Komisyon Tutarı (%{komisyonOrani})</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  ₺{formatTL(komisyonTutari / miktar)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Kargo Ücreti</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  ₺{formatTL(kargoUcreti)}
                </TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: '#F3F3EE' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Toplam Kesinti ({miktar} adet)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  ₺{formatTL(toplamKesinti)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Paper sx={{ px: 2, py: 1, bgcolor: '#F6DAD7' }}>
            <Typography variant="body2">
              Toplam Satış: <strong>₺{formatTL(toplamSatis)}</strong>
            </Typography>
          </Paper>
          <Paper sx={{ px: 2, py: 1, bgcolor: '#F7E7C4' }}>
            <Typography variant="body2">
              Toplam Maliyet: <strong>₺{formatTL(toplamAlis)}</strong>
            </Typography>
          </Paper>
          <Paper sx={{ px: 2, py: 1, bgcolor: '#F6DAD7' }}>
            <Typography variant="body2">
              Toplam Kesinti: <strong>₺{formatTL(toplamKesinti)}</strong>
            </Typography>
          </Paper>
          <Paper sx={{ px: 2, py: 1, bgcolor: netKar >= 0 ? '#D8EBDD' : '#F6DAD7' }}>
            <Typography variant="body2">
              Net Kâr: <strong style={{ color: netKar >= 0 ? '#1D6A3B' : '#c62828' }}>₺{formatTL(netKar)}</strong> (%{karOrani})
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

export default ETicaretDetayModal;
