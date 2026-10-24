import React from 'react';
import { Box, Paper, Typography, Button, IconButton, Dialog, DialogTitle, DialogContent, Grid, Divider } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import { BelgeBolumu } from '../../SatisBelgeleri';
import { useReactToPrint } from 'react-to-print';
import { sayiYaz, tarihYaz } from '../../../../shared/utils/bicim';

// Satış detay penceresi: yetkiye göre finansal kutular ve net kâr (admin), yazdırma, belgeler (muhasebeci için yok).
const InfoRow = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3 }}>
    <Typography variant="body2" color="text.secondary">
      {label}:
    </Typography>
    <Typography variant="body2" fontWeight="500">
      {value || '-'}
    </Typography>
  </Box>
);

const MotorDetayModal = ({ open, data, onClose, printRef, isMobile, canAlis, canKar, salt }) => {
  const handlePrint = useReactToPrint({ contentRef: printRef });
  if (!data) return null;

  const formatTL = (v) => sayiYaz(v);
  const alis = parseFloat(data.alis_fiyati || 0);
  const satis = parseFloat(data.satis_fiyati || 0);
  const noterAlis = parseFloat(data.noter_alis || 0);
  const noterSatis = parseFloat(data.noter_satis || 0);
  const masraflar = parseFloat(data.masraflar || 0);
  const toplamMaliyet = alis + masraflar;
  const kar = parseFloat(data.kar || 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>
          Motor Detay
        </Typography>
        <Button
          startIcon={<PrintIcon />}
          variant="contained"
          size="small"
          onClick={handlePrint}
          sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#b71c1c' }, mr: 1 }}
        >
          Yazdır
        </Button>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box ref={printRef} sx={{ p: 1 }}>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                🏍️ Motor Bilgileri
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <InfoRow label="Plaka" value={data.plaka} />
              <InfoRow label="Marka" value={data.marka} />
              <InfoRow label="Model" value={data.model} />
              <InfoRow label="Yıl" value={data.yil} />
              <InfoRow label="KM" value={data.km ? sayiYaz(data.km) : null} />
              <InfoRow label="Alım Tarihi" value={tarihYaz(data.tarih)} />
              <InfoRow label="Satış Tarihi" value={tarihYaz(data.satis_tarihi)} />
              <InfoRow
                label="Durum"
                value={
                  data.durum === 'stokta'
                    ? 'Stokta'
                    : data.durum === 'kapora'
                      ? 'Kapora'
                      : data.durum === 'depo_serviste'
                        ? 'Depo/Serviste'
                        : data.durum === 'devir_bekliyor'
                          ? 'Devir Bekliyor'
                          : data.durum === 'tamamlandi'
                            ? 'Tamamlandı'
                            : data.durum === 'perte'
                              ? 'Perte'
                              : data.durum
                }
              />
              <InfoRow label="Stok Tipi" value={data.stok_tipi === 'konsinye' ? 'Konsinye' : 'Sahip'} />
              <InfoRow label="Ödeme Şekli" value={data.odeme_sekli || 'Nakit'} />
              <InfoRow label="Fatura" value={data.fatura_kesildi ? 'Kesildi ✓' : 'Kesilmedi'} />
              {data.yevmiye_no && <InfoRow label="Yevmiye No" value={data.yevmiye_no} />}
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                🏪 Satıcı (Alım) Bilgileri
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <InfoRow label="İsim Soyisim" value={data.satici_adi} />
              <InfoRow label="TC Kimlik" value={data.satici_tc} />
              <InfoRow label="Alım Tarihi" value={tarihYaz(data.tarih)} />
              {canAlis && <InfoRow label="Alış Bedeli" value={noterAlis ? `₺${formatTL(noterAlis)}` : null} />}
            </Grid>
          </Grid>

          {(data.alici_adi || data.alici_tc) && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                👤 Alıcı (Satım) Bilgileri
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 3 }}>
                  <InfoRow label="İsim Soyisim" value={data.alici_adi} />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <InfoRow label="TC Kimlik" value={data.alici_tc} />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <InfoRow label="Telefon" value={data.alici_telefon} />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <InfoRow label="Kalan Ödeme" value={parseFloat(data.kalan_odeme || 0) > 0 ? `₺${sayiYaz(data.kalan_odeme)}` : 'Tamamlandı ✓'} />
                </Grid>
              </Grid>
            </Box>
          )}

          {data.komisyoncu_adi && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                🤝 Komisyoncu
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <InfoRow label="Ad Soyad" value={data.komisyoncu_adi} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <InfoRow label="Telefon" value={data.komisyoncu_telefon} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <InfoRow label="Tutar" value={`₺${sayiYaz(data.komisyoncu_tutari)}`} />
                </Grid>
              </Grid>
            </Box>
          )}

          {canAlis && (
            <>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                💰 Finansal Detaylar
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#ffebee', borderLeft: '4px solid #C62828' }}>
                    <Typography variant="caption" color="text.secondary">
                      Alış
                    </Typography>
                    <Typography fontWeight="bold" sx={{ color: '#C62828' }}>
                      ₺{formatTL(alis)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#ffebee', borderLeft: '4px solid #C62828' }}>
                    <Typography variant="caption" color="text.secondary">
                      Satış
                    </Typography>
                    <Typography fontWeight="bold" sx={{ color: '#C62828' }}>
                      ₺{formatTL(satis)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#fce4ec', borderLeft: '4px solid #c62828' }}>
                    <Typography variant="caption" color="text.secondary">
                      Noter Alış
                    </Typography>
                    <Typography fontWeight="bold" sx={{ color: '#c62828' }}>
                      ₺{formatTL(noterAlis)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#fce4ec', borderLeft: '4px solid #c62828' }}>
                    <Typography variant="caption" color="text.secondary">
                      Noter Satış
                    </Typography>
                    <Typography fontWeight="bold" sx={{ color: '#c62828' }}>
                      ₺{formatTL(noterSatis)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, md: canKar ? 4 : 6 }}>
                  <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#ffebee', borderLeft: '4px solid #C62828' }}>
                    <Typography variant="caption" color="text.secondary">
                      Masraflar
                    </Typography>
                    <Typography fontWeight="bold" sx={{ color: '#C62828' }}>
                      ₺{formatTL(masraflar)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, md: canKar ? 4 : 6 }}>
                  <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#ffebee', borderLeft: '4px solid #C62828' }}>
                    <Typography variant="caption" color="text.secondary">
                      Toplam Maliyet
                    </Typography>
                    <Typography fontWeight="bold" sx={{ color: '#C62828' }}>
                      ₺{formatTL(toplamMaliyet)}
                    </Typography>
                  </Paper>
                </Grid>
                {canKar && (
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Paper
                      sx={{
                        p: 1.5,
                        textAlign: 'center',
                        bgcolor: kar >= 0 ? '#e8f5e9' : '#ffebee',
                        borderLeft: `4px solid ${kar >= 0 ? '#2e7d32' : '#C62828'}`,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        NET KÂR
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" sx={{ color: kar >= 0 ? '#2e7d32' : '#C62828' }}>
                        ₺{formatTL(kar)}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </>
          )}

          {data.aciklama && (
            <>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                📝 Açıklama
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Typography>{data.aciklama}</Typography>
            </>
          )}
        </Box>
        {/* Belgeler yazdırma alanının (printRef) dışında: çıktıya girmez */}
        {!salt && <BelgeBolumu key={data.id} motorId={data.id} />}
      </DialogContent>
    </Dialog>
  );
};

export default MotorDetayModal;
