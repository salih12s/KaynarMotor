import React, { type ReactNode } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogContent,
  useMediaQuery,
  useTheme,
  type SxProps,
  type Theme,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import QrIcon from '@mui/icons-material/QrCode2';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';
import WarningIcon from '@mui/icons-material/ErrorOutline';
import { useKarGor } from '../../auth/AuthContext';
import { printServisQr, printIsEmri } from './servisYazdir';
import { sayiYaz, tarihYaz, sayiDegeri } from '../../../shared/utils/bicim';
import { DialogBasligi, Plaka } from '../../../shared/ui';
import { FONT, RENK, TON, ISLEM } from '../../../app/tokenlar';
import { durumLabel, durumTon } from './isEmriVeri';
import type { IsEmriDetayi } from '../../../shared/tipler';

// İş emri detay penceresi (liste sayfasından açılır): delikli iş emri fişi görünümü. Düzenle / Servis QR / Yazdır düğmeleri başlıkta.

// Etiket .......... değer (noktalı kılavuz çizgili)
const Satir = ({ label, value }: { label: string; value?: ReactNode }) => (
  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, py: 0.45, fontSize: 14.5 }}>
    <Box component="span" sx={{ color: RENK.soluk, flex: 'none' }}>
      {label}
    </Box>
    <Box component="span" aria-hidden="true" sx={{ flex: 1, minWidth: 12, borderBottom: `1px dotted ${RENK.alanCizgi}`, transform: 'translateY(-3px)' }} />
    <Box component="span" sx={{ fontWeight: 600, textAlign: 'right', minWidth: 0, overflowWrap: 'anywhere' }}>
      {value || '-'}
    </Box>
  </Box>
);

const Bolum = ({ baslik, children }: { baslik: string; children?: ReactNode }) => (
  <Box>
    <Typography component="h3" sx={{ fontFamily: FONT.baslik, fontWeight: 700, fontSize: 22, mb: 0.75 }}>
      {baslik}
    </Typography>
    {children}
  </Box>
);

// Fişin üst ve alt kenarındaki delik sırası
const delikler = (yer: 'top' | 'bottom'): SxProps<Theme> => ({
  position: 'absolute',
  left: 0,
  right: 0,
  [yer]: -6,
  height: 12,
  backgroundImage: `radial-gradient(circle at 8px 6px, ${RENK.kagit} 6px, transparent 6.5px)`,
  backgroundSize: '16px 12px',
  backgroundRepeat: 'repeat-x',
});

interface IsEmriDetayModalProps {
  open: boolean;
  data: IsEmriDetayi | null;
  onClose: () => void;
  onEdit: (id: number) => void;
  isMobile: boolean;
}

const IsEmriDetayModal = ({ open, data, onClose, onEdit, isMobile }: IsEmriDetayModalProps) => {
  const karGor = useKarGor();
  const dar = useMediaQuery(useTheme().breakpoints.down('md'));
  if (!data) return null;

  const parcalar = data.parcalar || [];
  const toplamFiyat = parcalar.reduce((t, p) => t + sayiDegeri(p.toplam_fiyat), 0);
  const toplamMaliyet = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.maliyet) || 0), 0);
  const kar = toplamFiyat - toplamMaliyet;
  const ton = durumTon(data.durum);
  const kalan = sayiDegeri(data.kalan_odeme);
  const odemeToplam = sayiDegeri(data.gercek_toplam_ucret || data.tahmini_toplam_ucret);
  const odenen = Math.max(0, odemeToplam - kalan);
  const odemeRenk = kalan > 0 ? TON.turuncu : TON.yesil;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth fullScreen={isMobile}>
      <DialogBasligi
        baslik={`İş Emri #${data.fis_no}`}
        onKapat={onClose}
        eylemler={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => {
                onClose();
                onEdit(data.id);
              }}
            >
              Düzenle
            </Button>
            {data.plaka && (
              <Button size="small" variant="outlined" startIcon={<QrIcon />} onClick={() => printServisQr(data.plaka)}>
                Servis QR
              </Button>
            )}
            <Button size="small" variant="contained" startIcon={<PrintIcon />} onClick={() => printIsEmri(data)}>
              Yazdır
            </Button>
          </Box>
        }
      />
      <DialogContent sx={{ bgcolor: RENK.kagit, p: { xs: 2, md: 4 } }}>
        <Box
          sx={{
            position: 'relative',
            bgcolor: '#FDFDFB',
            boxShadow: '0 14px 34px rgba(20,22,26,.14)',
            px: { xs: 2, md: 4.5 },
            py: { xs: 3, md: 4 },
            mx: 'auto',
            maxWidth: 1000,
          }}
        >
          <Box aria-hidden="true" sx={delikler('top')} />
          <Box aria-hidden="true" sx={delikler('bottom')} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <img src="/kaynar-logo.png" alt="Kaynar Motor" style={{ display: 'block', width: dar ? 150 : 190, height: 'auto' }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                <Typography sx={{ fontFamily: FONT.baslik, fontSize: dar ? 40 : 52, lineHeight: 1 }}>
                  № <span style={{ marginLeft: 6 }}>{data.fis_no}</span>
                </Typography>
                <Plaka plaka={data.plaka} buyuk />
              </Box>
            </Box>
            <Box
              role="status"
              sx={{
                alignSelf: 'flex-start',
                transform: 'rotate(-3deg)',
                border: `3px solid ${TON[ton].fg}`,
                color: TON[ton].fg,
                borderRadius: '8px',
                px: 2,
                py: 0.5,
                fontFamily: FONT.baslik,
                fontWeight: 700,
                fontSize: dar ? 24 : 30,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                opacity: 0.92,
              }}
            >
              {durumLabel(data.durum)}
            </Box>
          </Box>

          <Box sx={{ borderTop: `1px dashed ${RENK.cizgiKesik}`, my: 3 }} />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: { xs: 3, md: 5 } }}>
            <Bolum baslik="Müşteri">
              <Satir label="Ad Soyad" value={data.musteri_ad_soyad} />
              <Satir label="Telefon" value={data.telefon} />
              <Satir label="Adres" value={data.adres} />
              <Satir label="KM" value={data.km} />
            </Bolum>
            <Bolum baslik="Araç">
              <Satir label="Fiş No" value={`#${data.fis_no}`} />
              <Satir label="Plaka" value={data.plaka} />
              <Satir label="Marka" value={data.marka} />
              <Satir label="Model/Tip" value={data.model_tip} />
            </Bolum>
            <Bolum baslik="Tarih ve teslim">
              <Satir label="Oluşturma" value={tarihYaz(data.created_at)} />
              <Satir label="Tahmini Teslim" value={tarihYaz(data.tahmini_teslim_tarihi)} />
              <Satir label="Teslim Tarihi" value={tarihYaz(data.teslim_tarihi)} />
              <Satir label="Teslim Alan" value={data.teslim_alan_ad_soyad} />
              <Satir label="Teslim Eden" value={data.teslim_eden_teknisyen} />
              <Satir label="Kaydı Açan" value={data.olusturan_kisi} />
            </Bolum>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 3, md: 5 }, mt: 3.5 }}>
            <Bolum baslik="Arıza ve şikâyet">
              <Typography sx={{ fontSize: 16 }}>{data.ariza_sikayetler || 'Belirtilmemiş'}</Typography>
            </Bolum>
            <Bolum baslik="Açıklama">
              <Typography sx={{ fontSize: 16, color: data.aciklama ? 'text.primary' : 'text.secondary' }}>{data.aciklama || 'Belirtilmemiş'}</Typography>
            </Bolum>
          </Box>

          <Box sx={{ mt: 3.5 }}>
            <Bolum baslik="Parçalar ve işçilik">
              {parcalar.length > 0 ? (
                dar ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, borderTop: `1.5px solid ${RENK.murekkep}` }}>
                    {parcalar.map((p, i) => {
                      const pSatis = sayiDegeri(p.toplam_fiyat);
                      const pMaliyet = (Number(p.adet) || 0) * (Number(p.maliyet) || 0);
                      const pKar = pSatis - pMaliyet;
                      return (
                        <Box key={i} sx={{ py: 1, borderBottom: `1px dashed ${RENK.cizgiKesik}` }}>
                          <Typography sx={{ fontWeight: 700 }}>{p.takilan_parca}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Adet: {p.adet} • Birim: ₺{sayiYaz(p.birim_fiyat)} • Toplam: ₺{sayiYaz(pSatis)}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            Maliyet: ₺{sayiYaz(pMaliyet)}
                            {karGor && (
                              <>
                                {' '}
                                • <span style={{ color: pKar >= 0 ? RENK.yesil : ISLEM.sil.fg, fontWeight: 'bold' }}>Kâr: ₺{sayiYaz(pKar)}</span>
                              </>
                            )}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table
                      size="small"
                      sx={{ '& th': { bgcolor: 'transparent', borderBottom: `1.5px solid ${RENK.murekkep}` }, '& td, & th': { fontSize: 15 } }}
                    >
                      <TableHead>
                        <TableRow>
                          <TableCell>Takılan Parça</TableCell>
                          <TableCell align="right">Adet</TableCell>
                          <TableCell align="right">Birim Fiyat</TableCell>
                          <TableCell align="right">Toplam</TableCell>
                          <TableCell align="right">Maliyet</TableCell>
                          {karGor && <TableCell align="right">Kâr</TableCell>}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {parcalar.map((p, i) => {
                          const pSatis = sayiDegeri(p.toplam_fiyat);
                          const pMaliyet = (Number(p.adet) || 0) * (Number(p.maliyet) || 0);
                          const pKar = pSatis - pMaliyet;
                          return (
                            <TableRow key={i}>
                              <TableCell>{p.takilan_parca}</TableCell>
                              <TableCell align="right">{p.adet}</TableCell>
                              <TableCell align="right">₺{sayiYaz(p.birim_fiyat)}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700 }}>
                                ₺{sayiYaz(pSatis)}
                              </TableCell>
                              <TableCell align="right" sx={{ color: RENK.soluk }}>
                                ₺{sayiYaz(pMaliyet)}
                              </TableCell>
                              {karGor && (
                                <TableCell align="right" sx={{ color: pKar >= 0 ? 'success.main' : 'error.main', fontWeight: 700 }}>
                                  ₺{sayiYaz(pKar)}
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )
              ) : (
                <Typography color="text.secondary" textAlign="center" py={2}>
                  Parça kaydı yok
                </Typography>
              )}
            </Bolum>
            {parcalar.length > 0 && (
              <Box sx={{ mt: 2, display: 'flex', gap: 3, justifyContent: 'flex-end', alignItems: 'baseline', flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: 15 }}>
                  Maliyet: <strong>₺{sayiYaz(toplamMaliyet)}</strong>
                </Typography>
                {karGor && (
                  <Typography sx={{ fontSize: 15, color: kar >= 0 ? 'success.main' : 'error.main' }}>
                    Kâr: <strong>₺{sayiYaz(kar)}</strong>
                  </Typography>
                )}
                <Typography sx={{ fontFamily: FONT.baslik, fontWeight: 700, fontSize: dar ? 30 : 38, lineHeight: 1 }}>
                  Toplam: ₺{sayiYaz(toplamFiyat)}
                </Typography>
              </Box>
            )}
          </Box>

          {data.odeme_detaylari && (
            <Box sx={{ mt: 3 }}>
              <Bolum baslik="Ödeme detayları">
                <Typography>{data.odeme_detaylari}</Typography>
              </Bolum>
            </Box>
          )}

          {/* Ödeme durumu */}
          <Box sx={{ mt: 3.5, border: `2px solid ${odemeRenk.fg}`, borderRadius: '6px', bgcolor: odemeRenk.bg, p: 2 }}>
            <Typography
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                fontFamily: FONT.baslik,
                fontWeight: 700,
                fontSize: 24,
                textTransform: 'uppercase',
                letterSpacing: '.03em',
                color: odemeRenk.fg,
                mb: 1,
              }}
            >
              {kalan > 0 ? <WarningIcon /> : <CheckCircleIcon />}
              {kalan > 0 ? 'Kalan Ödeme' : 'Ödeme Tamamlandı'}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Toplam Tutar
                </Typography>
                <Typography fontWeight="bold">₺{sayiYaz(odemeToplam)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Ödenen
                </Typography>
                <Typography fontWeight="bold" sx={{ color: RENK.yesil }}>
                  ₺{sayiYaz(odenen)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Kalan Borç
                </Typography>
                <Typography fontWeight="bold" sx={{ color: kalan > 0 ? RENK.kirmizi : RENK.yesil }}>
                  {kalan > 0 ? `₺${sayiYaz(kalan)}` : 'Tamamlandı'}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default IsEmriDetayModal;
