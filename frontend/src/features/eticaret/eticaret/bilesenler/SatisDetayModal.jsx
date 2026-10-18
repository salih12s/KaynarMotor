import React from 'react';
import { Paper, Typography, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Divider } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { hesaplaKomisyon, detectPlatform } from '../../komisyon';
import { karEtiketi, formatTL } from '../eticaretVeri';

// Satış detay penceresi: ürün/fiyat bilgileri, net kâr (admin) ve platforma özel komisyon ve KDV dökümü.
const SatisDetayModal = ({ open, data, onClose, onDuzenle, isMobile, isAdmin }) => {
  const dialogProps = { open, onClose, maxWidth: 'md', fullWidth: true, fullScreen: isMobile };
  if (!data) return <Dialog {...dialogProps} />;
  const s = data;
  const detayPlatformTipi = detectPlatform(s.platform_adi);
  const h = hesaplaKomisyon(s.satis_fiyati, s.alis_fiyati, s.komisyon_orani, s.kdv_orani || 20, s.kargo_ucreti || 0, s.adet, detayPlatformTipi);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('tr-TR') : '-';
  return (
    <Dialog {...dialogProps}>
      <DialogTitle sx={{ bgcolor: '#C62828', color: 'white', py: 1.5, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>E-Ticaret Satış Detayı</Typography>
        <IconButton onClick={onClose} sx={{ color: 'white' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {/* Ürün Bilgileri */}
        <Grid container spacing={2} sx={{ mb: 3, mt: 0.5 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 1.5, bgcolor: '#fafafa' }}>
              <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Ürün Bilgileri</Typography>
              <Divider sx={{ mb: 1 }} />
              <Typography variant="body2"><strong>Ürün:</strong> {s.urun_adi}</Typography>
              <Typography variant="body2"><strong>Platform:</strong> {s.platform_adi || '-'}</Typography>
              <Typography variant="body2"><strong>Adet:</strong> {s.adet}</Typography>
              <Typography variant="body2"><strong>Tarih:</strong> {formatDate(s.tarih)}</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 1.5, bgcolor: '#fafafa' }}>
              <Typography variant="subtitle2" color="#C62828" fontWeight="bold" gutterBottom>Fiyat Bilgileri</Typography>
              <Divider sx={{ mb: 1 }} />
              <Typography variant="body2"><strong>Satış Fiyatı:</strong> {formatTL(s.satis_fiyati)} ₺</Typography>
              <Typography variant="body2"><strong>Alış Fiyatı:</strong> {formatTL(s.alis_fiyati)} ₺</Typography>
              <Typography variant="body2"><strong>Komisyon:</strong> %{parseFloat(s.komisyon_orani || 0).toFixed(2)}</Typography>
              <Typography variant="body2"><strong>KDV:</strong> %{parseFloat(s.kdv_orani || 20).toFixed(2)}</Typography>
              <Typography variant="body2"><strong>Kargo:</strong> {formatTL(s.kargo_ucreti)} ₺</Typography>
            </Paper>
          </Grid>
          {isAdmin && (
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 2, bgcolor: h.netKar >= 0 ? '#e8f5e9' : '#ffebee', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">Net Kâr</Typography>
              <Typography variant="h4" fontWeight="bold" sx={{ color: h.netKar >= 0 ? '#2e7d32' : '#c62828' }}>
                {formatTL(h.netKar)} ₺
              </Typography>
            </Paper>
          </Grid>
          )}
        </Grid>

        {/* Komisyon Detayları - Platform bazlı */}
        <Typography variant="subtitle1" fontWeight="bold" color="#C62828" gutterBottom>
          Komisyon Hesaplama Detayları {detayPlatformTipi === 'hepsiburada' ? '(HepsiBurada)' : detayPlatformTipi === 'n11' ? '(N11)' : '(Trendyol)'}
        </Typography>
        <Paper sx={{ p: 2, bgcolor: '#fff8e1', mb: 2, borderTop: '3px solid #f57f17' }}>
          <Grid container spacing={2} textAlign="center">
            {(() => {
              let items = [];
              if (detayPlatformTipi === 'hepsiburada') {
                items = [
                  { label: 'Komisyon', value: `${formatTL(h.komisyonTutari)} ₺` },
                  { label: 'Yat. Geri Dönüş', value: `%${h.yatirimGeriDonus}` },
                  { label: 'Ödeme Bedeli', value: `${formatTL(h.odemeBedeli)} ₺` },
                  { label: 'İşlem Bedeli', value: `${formatTL(h.islemBedeli)} ₺` },
                  { label: 'Stopaj', value: `${formatTL(h.stopaj)} ₺` },
                  { label: 'Kâr Oranı', value: `%${h.karOrani}` },
                  { label: 'KDV', value: `${formatTL(h.odenecekKDV)} ₺` },
                ];
              } else if (detayPlatformTipi === 'n11') {
                items = [
                  { label: 'Komisyon', value: `${formatTL(h.komisyonTutari)} ₺` },
                  { label: 'Yat. Geri Dönüş', value: `%${h.yatirimGeriDonus}` },
                  { label: 'S. Pazarlama ve Hizmet', value: `${formatTL(h.pazarlamaHizmet)} ₺` },
                  { label: 'Stopaj', value: `${formatTL(h.stopaj)} ₺` },
                  { label: 'Kâr Oranı', value: `%${h.karOrani}` },
                  { label: 'KDV', value: `${formatTL(h.odenecekKDV)} ₺` },
                ];
              } else {
                items = [
                  { label: 'Komisyon (Toplam)', value: `${formatTL(h.toplamKomisyon)} ₺` },
                  { label: 'Komisyon', value: `${formatTL(h.komisyonTutari)} ₺` },
                  { label: 'Hizmet Bedeli', value: `${formatTL(h.hizmetBedeli)} ₺` },
                  { label: 'Stopaj', value: `${formatTL(h.stopaj)} ₺` },
                  { label: 'Kâr Oranı', value: `%${h.karOrani}` },
                  { label: 'KDV', value: `${formatTL(h.odenecekKDV)} ₺` },
                ];
              }
              return items.filter(item => isAdmin || !karEtiketi(item.label)).map((item, i) => (
                <Grid size={{ xs: 4, md: 2 }} key={i}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{item.label}</Typography>
                  <Typography variant="body1" fontWeight="bold">{item.value}</Typography>
                </Grid>
              ));
            })()}
          </Grid>
        </Paper>

        {/* KDV Detayları - Platform bazlı */}
        <Typography variant="subtitle1" fontWeight="bold" color="#C62828" gutterBottom>KDV Detayları</Typography>
        <Paper sx={{ p: 2, bgcolor: '#fafafa', borderTop: '3px solid #C62828' }}>
          <Grid container spacing={2} textAlign="center">
            {(() => {
              let kdvItems = [
                { label: 'Satıştan Oluşan KDV', value: `${formatTL(h.satistanKDV)} ₺` },
                { label: 'Alıştan Oluşan KDV', value: `${formatTL(h.alisKDV)} ₺` },
                { label: 'Kargodan Oluşan KDV', value: `${formatTL(h.kargoKDV)} ₺` },
                { label: 'Komisyondan Oluşan KDV', value: `${formatTL(h.komisyonKDV)} ₺` },
              ];
              if (detayPlatformTipi === 'hepsiburada') {
                kdvItems.push({ label: 'Ödeme ve İşlem Bedeli KDV', value: `${formatTL(h.odemIslemKDV)} ₺` });
              } else if (detayPlatformTipi === 'n11') {
                kdvItems.push({ label: 'Pazarlama ve Hizmet KDV', value: `${formatTL(h.pazarlamaHizmetKDV)} ₺` });
              } else {
                kdvItems.push({ label: 'Hizmet Bedeli KDV', value: `${formatTL(h.hizmetKDV)} ₺` });
              }
              kdvItems.push({ label: 'Ödenecek KDV', value: `${formatTL(h.odenecekKDV)} ₺` });
              return kdvItems.map((item, i) => (
                <Grid size={{ xs: 4, md: 2 }} key={i}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{item.label}</Typography>
                  <Typography variant="body1" fontWeight="bold">{item.value}</Typography>
                </Grid>
              ));
            })()}
          </Grid>
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { onClose(); onDuzenle(s); }} variant="outlined" startIcon={<EditIcon />}>Düzenle</Button>
        <Button onClick={onClose}>Kapat</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SatisDetayModal;
