import React from 'react';
import { Box, Paper, Typography, Grid, Chip, Dialog, DialogContent, DialogActions, Button } from '@mui/material';
import { DialogBasligi } from '../../../shared/ui';
import { formatTL, formatDate, karColor } from '../bicim';
import { sayiYaz } from '../../../shared/utils/bicim';

// Motor satış detay penceresi. Net kâr = toplam kâr - yatırımcı payı.
const MotorDetayModal = ({ open, data, onClose, isMobile }) => {
  const dialogProps = { open, onClose, maxWidth: 'md', fullWidth: true, fullScreen: isMobile };
  if (!data) return <Dialog {...dialogProps} />;
  const m = data;
  const alis = parseFloat(m.alis_fiyati || 0);
  const satis = parseFloat(m.satis_fiyati || 0);
  const noterAlis = parseFloat(m.noter_alis || 0);
  const noterSatis = parseFloat(m.noter_satis || 0);
  const masraf = parseFloat(m.masraflar || 0);
  const toplamKar = parseFloat(m.kar || 0);
  const yatirimciPayi = parseFloat(m.yatirimci_kar || 0);
  const kar = toplamKar - yatirimciPayi;
  return (
    <Dialog {...dialogProps}>
      <DialogBasligi baslik={<>Motor Satış Detayı - {m.plaka}</>} onKapat={onClose} />
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mb: 2, mt: 0.5 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 1.5, bgcolor: '#FBFBF8' }}>
              <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>
                Araç Bilgileri
              </Typography>
              <Typography variant="body2">
                <strong>Plaka:</strong> {m.plaka || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>Marka:</strong> {m.marka || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>Model:</strong> {m.model || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>Yıl:</strong> {m.yil || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>KM:</strong> {m.km ? sayiYaz(m.km) + ' km' : '-'}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 1.5, bgcolor: '#FBFBF8' }}>
              <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>
                Satıcı Bilgileri
              </Typography>
              <Typography variant="body2">
                <strong>Ad Soyad:</strong> {m.satici_adi || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>TC:</strong> {m.satici_tc || '-'}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 1.5, bgcolor: '#FBFBF8' }}>
              <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>
                Alıcı Bilgileri
              </Typography>
              <Typography variant="body2">
                <strong>Ad Soyad:</strong> {m.alici_adi || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>TC:</strong> {m.alici_tc || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>Telefon:</strong> {m.alici_telefon || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>Adres:</strong> {m.alici_adres || '-'}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 1.5, bgcolor: '#FBFBF8' }}>
              <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>
                Fiyat Bilgileri
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, borderBottom: '1px dotted #E1E2DA' }}>
                <Typography variant="body2" color="text.secondary">
                  Alış Fiyatı:
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {formatTL(alis)} ₺
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, borderBottom: '1px dotted #E1E2DA' }}>
                <Typography variant="body2" color="text.secondary">
                  Satış Fiyatı:
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {formatTL(satis)} ₺
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, borderBottom: '1px dotted #E1E2DA' }}>
                <Typography variant="body2" color="text.secondary">
                  Masraflar:
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {formatTL(masraf)} ₺
                </Typography>
              </Box>
              {yatirimciPayi > 0 && (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, borderBottom: '1px dotted #E1E2DA' }}>
                    <Typography variant="body2" color="text.secondary">
                      Toplam Kâr:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatTL(toplamKar)} ₺
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, borderBottom: '1px dotted #E1E2DA' }}>
                    <Typography variant="body2" color="text.secondary">
                      Yatırımcı Payı:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" sx={{ color: '#1E4A86' }}>
                      - {formatTL(yatirimciPayi)} ₺
                    </Typography>
                  </Box>
                </>
              )}
              <Box
                sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, mt: 0.5, bgcolor: kar >= 0 ? '#D8EBDD' : '#F6DAD7', px: 1, borderRadius: 1 }}
              >
                <Typography variant="body2" fontWeight="bold">
                  Net Kâr (Payınız):
                </Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ color: karColor(kar) }}>
                  {formatTL(kar)} ₺
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 1.5, bgcolor: '#FBFBF8' }}>
              <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>
                Noter Bilgileri
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, borderBottom: '1px dotted #E1E2DA' }}>
                <Typography variant="body2" color="text.secondary">
                  Noter Alış:
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {formatTL(noterAlis)} ₺
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, borderBottom: '1px dotted #E1E2DA' }}>
                <Typography variant="body2" color="text.secondary">
                  Noter Satış:
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {formatTL(noterSatis)} ₺
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, borderBottom: '1px dotted #E1E2DA' }}>
                <Typography variant="body2" color="text.secondary">
                  Ödeme Şekli:
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {m.odeme_sekli || 'nakit'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Fatura:
                </Typography>
                <Chip
                  size="small"
                  label={m.fatura_kesildi ? '✓ Kesildi' : '✗ Kesilmedi'}
                  sx={{
                    bgcolor: m.fatura_kesildi ? '#D8EBDD' : '#F6DAD7',
                    color: m.fatura_kesildi ? '#1D6A3B' : '#A61F1F',
                    fontWeight: 'bold',
                    fontSize: '0.75rem',
                  }}
                />
              </Box>
              {m.yevmiye_no && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Yevmiye No:
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {m.yevmiye_no}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 1.5, bgcolor: '#FBFBF8' }}>
              <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>
                Tarih Bilgileri
              </Typography>
              <Typography variant="body2">
                <strong>Kayıt Tarihi:</strong> {formatDate(m.tarih || m.created_at)}
              </Typography>
              <Typography variant="body2">
                <strong>Satış Tarihi:</strong> {formatDate(m.satis_tarihi || m.tamamlama_tarihi)}
              </Typography>
            </Paper>
          </Grid>
          {m.komisyoncu_adi && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 1.5, bgcolor: '#F7E7C4', borderLeft: '3px solid #8A5300' }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#8A5300' }} gutterBottom>
                  Komisyoncu
                </Typography>
                <Typography variant="body2">
                  <strong>Ad Soyad:</strong> {m.komisyoncu_adi}
                </Typography>
                <Typography variant="body2">
                  <strong>Telefon:</strong> {m.komisyoncu_telefon || '-'}
                </Typography>
                <Typography variant="body2">
                  <strong>Tutar:</strong> ₺{sayiYaz(m.komisyoncu_tutari)}
                </Typography>
              </Paper>
            </Grid>
          )}
          {m.aciklama && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 1.5, bgcolor: '#DCE6F4', borderLeft: '3px solid #1E4A86' }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#1E4A86' }}>
                  Açıklama
                </Typography>
                <Typography variant="body2">{m.aciklama}</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose()}>Kapat</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MotorDetayModal;
