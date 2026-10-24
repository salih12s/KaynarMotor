import React from 'react';
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
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import QrIcon from '@mui/icons-material/QrCode2';
import { useKarGor } from '../../auth/AuthContext';
import { printServisQr, printIsEmri } from './servisYazdir';
import { sayiYaz, tarihYaz } from '../../../shared/utils/bicim';

// İş emri detay penceresi (liste sayfasından açılır; düzenle/yazdır/QR düğmeleri içinde).
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

const IsEmriDetayModal = ({ open, data, onClose, onEdit, isMobile }) => {
  const karGor = useKarGor();
  if (!data) return null;

  const parcalar = data.parcalar || [];
  const toplamFiyat = parcalar.reduce((t, p) => t + parseFloat(p.toplam_fiyat || 0), 0);
  const toplamMaliyet = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.maliyet) || 0), 0);
  const kar = toplamFiyat - toplamMaliyet;
  const durumLabel = (d) => (d === 'tamamlandi' ? 'Tamamlandı' : d === 'devam_ediyor' ? 'Devam Ediyor' : 'Beklemede');
  const durumRenk = (d) => (d === 'tamamlandi' ? 'success' : d === 'devam_ediyor' ? 'info' : 'warning');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>
          İş Emri #{data.fis_no}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => {
            onClose();
            onEdit(data.id);
          }}
          sx={{ mr: 1 }}
        >
          Düzenle
        </Button>
        {data.plaka && (
          <Button size="small" variant="outlined" startIcon={<QrIcon />} onClick={() => printServisQr(data.plaka)} sx={{ mr: 1 }}>
            Servis QR
          </Button>
        )}
        <Button size="small" variant="contained" startIcon={<PrintIcon />} onClick={() => printIsEmri(data)} sx={{ mr: 1 }}>
          Yazdır
        </Button>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ p: 1 }}>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                👤 Müşteri Bilgileri
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <InfoRow label="Ad Soyad" value={data.musteri_ad_soyad} />
              <InfoRow label="Telefon" value={data.telefon} />
              <InfoRow label="Adres" value={data.adres} />
              <InfoRow label="KM" value={data.km} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                🏍️ Araç Bilgileri
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <InfoRow label="Fiş No" value={`#${data.fis_no}`} />
              <InfoRow label="Plaka" value={data.plaka} />
              <InfoRow label="Marka" value={data.marka} />
              <InfoRow label="Model/Tip" value={data.model_tip} />
              <Box sx={{ mt: 1 }}>
                <Chip label={durumLabel(data.durum)} color={durumRenk(data.durum)} size="small" />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                📅 Tarih ve Teslim
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <InfoRow label="Oluşturma" value={tarihYaz(data.created_at)} />
              <InfoRow label="Tahmini Teslim" value={tarihYaz(data.tahmini_teslim_tarihi)} />
              <InfoRow label="Teslim Tarihi" value={tarihYaz(data.teslim_tarihi)} />
              <InfoRow label="Teslim Alan" value={data.teslim_alan_ad_soyad} />
              <InfoRow label="Teslim Eden" value={data.teslim_eden_teknisyen} />
              <InfoRow label="Kaydı Açan" value={data.olusturan_kisi} />
            </Grid>
          </Grid>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                  🔧 Arıza / Şikayetler
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <Typography>{data.ariza_sikayetler || 'Belirtilmemiş'}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                  📝 Açıklama
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <Typography>{data.aciklama || 'Belirtilmemiş'}</Typography>
              </Paper>
            </Grid>
          </Grid>

          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
              📋 Parçalar ve İşçilik
            </Typography>
            <Divider sx={{ mb: 1 }} />
            {parcalar.length > 0 ? (
              <>
                {isMobile ? (
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
                          <Typography variant="caption" className="no-print" sx={{ display: 'block' }}>
                            Maliyet: ₺{sayiYaz(pMaliyet)}
                            {karGor && (
                              <>
                                {' '}
                                • <span style={{ color: pKar >= 0 ? '#2e7d32' : '#c62828', fontWeight: 'bold' }}>Kâr: ₺{sayiYaz(pKar)}</span>
                              </>
                            )}
                          </Typography>
                        </Paper>
                      );
                    })}
                  </Box>
                ) : (
                  <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          {['Takılan Parça', 'Adet', 'Birim Fiyat', 'Toplam'].map((h) => (
                            <TableCell key={h} sx={{ fontWeight: 'bold' }}>
                              {h}
                            </TableCell>
                          ))}
                          <TableCell sx={{ fontWeight: 'bold' }} className="no-print">
                            Maliyet
                          </TableCell>
                          {karGor && (
                            <TableCell sx={{ fontWeight: 'bold' }} className="no-print">
                              Kâr
                            </TableCell>
                          )}
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
                              <TableCell className="no-print">₺{sayiYaz(pMaliyet)}</TableCell>
                              {karGor && (
                                <TableCell className="no-print" sx={{ color: pKar >= 0 ? '#2e7d32' : '#c62828', fontWeight: 'bold' }}>
                                  ₺{sayiYaz(pKar)}
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
                <Box sx={{ mt: 2, display: 'flex', gap: 3, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Paper sx={{ px: 2, py: 1, bgcolor: '#ffebee' }}>
                    <Typography variant="body2">
                      Toplam: <strong>₺{sayiYaz(toplamFiyat)}</strong>
                    </Typography>
                  </Paper>
                  <Paper sx={{ px: 2, py: 1, bgcolor: '#ffebee' }} className="no-print">
                    <Typography variant="body2">
                      Maliyet: <strong>₺{sayiYaz(toplamMaliyet)}</strong>
                    </Typography>
                  </Paper>
                  {karGor && (
                    <Paper sx={{ px: 2, py: 1, bgcolor: kar >= 0 ? '#e8f5e9' : '#ffebee' }} className="no-print">
                      <Typography variant="body2" sx={{ color: kar >= 0 ? '#2e7d32' : '#c62828' }}>
                        Kâr: <strong>₺{sayiYaz(kar)}</strong>
                      </Typography>
                    </Paper>
                  )}
                </Box>
              </>
            ) : (
              <Typography color="text.secondary" textAlign="center" py={2}>
                Parça kaydı yok
              </Typography>
            )}
          </Paper>

          {data.odeme_detaylari && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                💳 Ödeme Detayları
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Typography>{data.odeme_detaylari}</Typography>
            </Paper>
          )}

          {/* Ödeme Durumu */}
          {(() => {
            const kalan = parseFloat(data.kalan_odeme || 0);
            const toplam = parseFloat(data.gercek_toplam_ucret || data.tahmini_toplam_ucret || 0);
            const odenen = Math.max(0, toplam - kalan);
            return (
              <Paper sx={{ p: 2, bgcolor: kalan > 0 ? '#fff3e0' : '#e8f5e9', borderLeft: `4px solid ${kalan > 0 ? '#ed6c02' : '#2e7d32'}` }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ color: kalan > 0 ? '#ed6c02' : '#2e7d32' }} gutterBottom>
                  {kalan > 0 ? '⚠️ Kalan Ödeme' : '✓ Ödeme Tamamlandı'}
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                      Toplam Tutar
                    </Typography>
                    <Typography fontWeight="bold">₺{sayiYaz(toplam)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                      Ödenen
                    </Typography>
                    <Typography fontWeight="bold" sx={{ color: '#2e7d32' }}>
                      ₺{sayiYaz(odenen)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                      Kalan Borç
                    </Typography>
                    <Typography fontWeight="bold" sx={{ color: kalan > 0 ? '#C62828' : '#2e7d32' }}>
                      {kalan > 0 ? `₺${sayiYaz(kalan)}` : 'Tamamlandı'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            );
          })()}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default IsEmriDetayModal;
