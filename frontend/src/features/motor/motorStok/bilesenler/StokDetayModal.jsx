import React from 'react';
import { Box, Paper, Typography, Button, IconButton, Dialog, DialogTitle, DialogContent, Grid, Divider } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import { BelgeBolumu } from '../../SatisBelgeleri';
import { useReactToPrint } from 'react-to-print';
import { parseOdeme } from '../motorStokVeri';
import { sayiYaz, tarihYaz } from '../../../../shared/utils/bicim';

// Motor stok detay penceresi: yetkiye göre fiyat/satıcı/kâr bölümleri, ödeme dağılımı, yazdırma ve belgeler.
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

const StokDetayModal = ({ open, data, onClose, printRef, isMobile, perms = {} }) => {
  const { canAlis = true, canListe = true, canMusteri = true, canKar = true, isYatirimci = false, canBelge = false } = perms;
  const handlePrint = useReactToPrint({ contentRef: printRef });
  if (!data) return null;

  const formatTL = (v) => sayiYaz(v);
  const alis = parseFloat(data.alis_fiyati || 0);
  const noterAlis = parseFloat(data.noter_alis || 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>
          Motor Stok Detay
        </Typography>
        <Button
          startIcon={<PrintIcon />}
          variant="contained"
          size="small"
          onClick={handlePrint}
          sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#A61F1F' }, mr: 1 }}
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
                Motor Bilgileri
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <InfoRow label="Plaka" value={data.plaka} />
              <InfoRow label="Marka" value={data.marka} />
              <InfoRow label="Model" value={data.model} />
              <InfoRow label="Yıl" value={data.yil} />
              <InfoRow label="KM" value={data.km ? sayiYaz(data.km) : null} />
              <InfoRow label="Stok Tipi" value={data.stok_tipi === 'konsinye' ? 'Konsinye' : 'Sahip'} />
              <InfoRow label="Alım Tarihi" value={tarihYaz(data.tarih)} />
              {data.yevmiye_no && <InfoRow label="Yevmiye No" value={data.yevmiye_no} />}
              {canListe && <InfoRow label="İlan Fiyatı" value={`₺${formatTL(data.liste_fiyati)}`} />}
            </Grid>
            {canMusteri && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                  Satıcı Bilgileri
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <InfoRow label="İsim Soyisim" value={data.satici_adi} />
                <InfoRow label="TC Kimlik" value={data.satici_tc} />
              </Grid>
            )}
          </Grid>

          {(canAlis || canKar) && (
            <>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                Fiyat Bilgileri
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {canAlis && (
                  <Grid size={{ xs: 6, md: 4 }}>
                    <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#F6DAD7', borderLeft: '4px solid #C62828' }}>
                      <Typography variant="caption" color="text.secondary">
                        Alım
                      </Typography>
                      <Typography fontWeight="bold" sx={{ color: '#C62828' }}>
                        ₺{formatTL(alis)}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
                {canAlis && (
                  <Grid size={{ xs: 6, md: 4 }}>
                    <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#F6DAD7', borderLeft: '4px solid #c62828' }}>
                      <Typography variant="caption" color="text.secondary">
                        Alış Bedeli (Noter)
                      </Typography>
                      <Typography fontWeight="bold" sx={{ color: '#c62828' }}>
                        ₺{formatTL(noterAlis)}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
                <Grid size={{ xs: 6, md: 4 }}>
                  <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#F7E7C4', borderLeft: '4px solid #A5530F' }}>
                    <Typography variant="caption" color="text.secondary">
                      Masraflar
                    </Typography>
                    <Typography fontWeight="bold" sx={{ color: '#A5530F' }}>
                      ₺{formatTL(data.masraflar)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
              {data.yatirimci_id && canKar && (
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 6, md: 6 }}>
                    <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#DCE6F4', borderLeft: '4px solid #1E4A86' }}>
                      <Typography variant="caption" color="text.secondary">
                        Yatırımcı Kârı
                      </Typography>
                      <Typography fontWeight="bold" sx={{ color: '#1E4A86' }}>
                        ₺{formatTL(data.yatirimci_kar)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 6 }}>
                    <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#D8EBDD', borderLeft: '4px solid #1D6A3B' }}>
                      <Typography variant="caption" color="text.secondary">
                        İşletme Kârı
                      </Typography>
                      <Typography fontWeight="bold" sx={{ color: '#1D6A3B' }}>
                        ₺{formatTL(parseFloat(data.kar || 0) - parseFloat(data.yatirimci_kar || 0))}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              )}
              {isYatirimci && data.durum === 'tamamlandi' && (
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 12 }}>
                    <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#D8EBDD', borderLeft: '4px solid #1D6A3B' }}>
                      <Typography variant="caption" color="text.secondary">
                        Kazancım
                      </Typography>
                      <Typography fontWeight="bold" sx={{ color: '#1D6A3B' }}>
                        ₺{formatTL(data.yatirimci_kar)}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              )}
            </>
          )}

          {(() => {
            const odemeler = parseOdeme(data.odeme_detaylari);
            if (odemeler.length === 0) return null;
            const toplam = odemeler.reduce((s, o) => s + parseFloat(o.tutar || 0), 0);
            return (
              <>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                  Ödeme Dağılımı
                </Typography>
                <Divider sx={{ mb: 1 }} />
                {data.satis_fiyati ? <InfoRow label="Toplam Satış" value={`₺${formatTL(data.satis_fiyati)}`} /> : null}
                {odemeler.map((o, i) => (
                  <InfoRow key={i} label={o.tip} value={`₺${sayiYaz(o.tutar)}`} />
                ))}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.5, mt: 0.5, borderTop: '1px solid #E1E2DA' }}>
                  <Typography variant="body2" fontWeight="bold">
                    Toplam Ödeme
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    ₺{sayiYaz(toplam)}
                  </Typography>
                </Box>
                {parseFloat(data.kalan_odeme || 0) > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#A5530F' }}>
                      Kalan
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" sx={{ color: '#A5530F' }}>
                      ₺{formatTL(data.kalan_odeme)}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ mb: 2 }} />
              </>
            );
          })()}

          {data.aciklama && (
            <>
              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                Açıklama
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Typography>{data.aciklama}</Typography>
            </>
          )}
        </Box>
        {/* Belgeler yazdırma alanının (printRef) dışında: çıktıya girmez */}
        {canBelge && <BelgeBolumu key={data.id} motorId={data.id} />}
      </DialogContent>
    </Dialog>
  );
};

export default StokDetayModal;
