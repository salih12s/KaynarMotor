import React, { useState, useEffect, useCallback, type ReactElement } from 'react';
import { DialogBasligi, IslemDugmesi } from '../../shared/ui';
import { useNavigate } from 'react-router-dom';
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
  Chip,
  TextField,
  InputAdornment,
  Grid,
  Alert,
  MenuItem,
  useTheme,
  useMediaQuery,
  Tooltip,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import BuildIcon from '@mui/icons-material/BuildOutlined';
import MotorIcon from '@mui/icons-material/TwoWheeler';
import ShopIcon from '@mui/icons-material/ShoppingCartOutlined';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import OpenIcon from '@mui/icons-material/OpenInNew';

import { veresiyeService } from './raporApi';
import { sayiYaz, tarihYaz, type Sayi } from '../../shared/utils/bicim';
import type { Borc, BorcKaynagi, VeresiyeOzeti } from '../../shared/tipler';
import { FONT, RENK, TON } from '../../app/tokenlar';

const KAYNAK_INFO: Record<BorcKaynagi, { label: string; color: string; bg: string; icon: ReactElement; path: string }> = {
  motor: { label: 'Motor Satış', color: '#C62828', bg: '#F6DAD7', icon: <MotorIcon fontSize="small" />, path: '/ikinci-el-motor' },
  servis: { label: 'Servis', color: '#1E4A86', bg: '#DCE6F4', icon: <BuildIcon fontSize="small" />, path: '/' },
  aksesuar: { label: 'Aksesuar', color: '#1D6A3B', bg: '#D8EBDD', icon: <ShopIcon fontSize="small" />, path: '/aksesuarlar' },
  yedek_parca: { label: 'Yedek Parça', color: '#5B3A8C', bg: '#E7DFF3', icon: <SettingsIcon fontSize="small" />, path: '/yedek-parcalar' },
};

const Veresiye = () => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const navigate = useNavigate();
  const [borclar, setBorclar] = useState<Borc[]>([]);
  const [ozet, setOzet] = useState<VeresiyeOzeti>({ motor: 0, servis: 0, aksesuar: 0, yedek_parca: 0, toplam: 0, kayit_sayisi: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kaynakFilter, setKaynakFilter] = useState<BorcKaynagi | 'hepsi'>('hepsi');
  const [detayModal, setDetayModal] = useState<{ open: boolean; borc: Borc | null }>({ open: false, borc: null });

  const openDetail = (b: Borc) => setDetayModal({ open: true, borc: b });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await veresiyeService.getAll();
      setBorclar(res.data.borclar || []);
      setOzet(res.data.ozet || ({} as VeresiyeOzeti));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = borclar.filter((b) => {
    if (kaynakFilter !== 'hepsi' && b.kaynak_key !== kaynakFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (b.musteri_adi || '').toLowerCase().includes(q) || (b.telefon || '').includes(search) || (b.aciklama || '').toLowerCase().includes(q);
  });

  const fmtTL = (v: Sayi) => `₺${sayiYaz(v)}`;

  const ozetCards = [
    { key: 'toplam', label: 'Toplam Borç', value: ozet.toplam, color: '#C62828', bg: '#F6DAD7' },
    { key: 'motor', label: 'Motor Satış', value: ozet.motor, color: KAYNAK_INFO.motor.color, bg: KAYNAK_INFO.motor.bg },
    { key: 'servis', label: 'Servis', value: ozet.servis, color: KAYNAK_INFO.servis.color, bg: KAYNAK_INFO.servis.bg },
    { key: 'aksesuar', label: 'Aksesuar', value: ozet.aksesuar, color: KAYNAK_INFO.aksesuar.color, bg: KAYNAK_INFO.aksesuar.bg },
    { key: 'yedek_parca', label: 'Yedek Parça', value: ozet.yedek_parca, color: KAYNAK_INFO.yedek_parca.color, bg: KAYNAK_INFO.yedek_parca.bg },
  ];

  return (
    <Box>
      {/* Özet kartları */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, minmax(0, 1fr))' }, gap: 2, mb: 2 }}>
        {ozetCards.map((c) => (
          <Paper key={c.key} sx={{ px: 2.25, py: 1.5, bgcolor: c.bg }}>
            <Typography sx={{ fontSize: 14, color: RENK.soluk }}>{c.label}</Typography>
            <Typography
              sx={{ fontFamily: FONT.baslik, fontWeight: 700, fontSize: { xs: 28, md: 28, lg: 34 }, lineHeight: 1.2, color: c.color, whiteSpace: 'nowrap' }}
            >
              {fmtTL(c.value)}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Filtre */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
        <TextField
          size="small"
          placeholder="Müşteri, telefon veya açıklama ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: '1 1 300px', maxWidth: 666 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          size="small"
          aria-label="Kaynak"
          SelectProps={{ renderValue: (v) => `Kaynak: ${v === 'hepsi' ? 'Tümü' : KAYNAK_INFO[v as BorcKaynagi]?.label}` }}
          value={kaynakFilter}
          onChange={(e) => setKaynakFilter(e.target.value as BorcKaynagi | 'hepsi')}
          sx={{ minWidth: 190 }}
        >
          <MenuItem value="hepsi">Tümü</MenuItem>
          <MenuItem value="motor">Motor Satış</MenuItem>
          <MenuItem value="servis">Servis</MenuItem>
          <MenuItem value="aksesuar">Aksesuar</MenuItem>
          <MenuItem value="yedek_parca">Yedek Parça</MenuItem>
        </TextField>
        <Box sx={{ flex: 1 }} />
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            height: 36,
            alignItems: 'center',
            px: 1.5,
            border: `1.5px solid ${TON.gri.fg}`,
            borderRadius: '4px',
            bgcolor: TON.gri.bg,
            color: TON.gri.fg,
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {filtered.length} kayıt
        </Box>
      </Box>

      {loading && <Alert severity="info">Yükleniyor...</Alert>}
      {!loading && filtered.length === 0 && <Alert severity="success">Açık borç bulunmuyor</Alert>}

      {!loading &&
        filtered.length > 0 &&
        (isMobile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {filtered.map((b, i) => {
              const info: Partial<(typeof KAYNAK_INFO)[BorcKaynagi]> = KAYNAK_INFO[b.kaynak_key] || {};
              return (
                <Paper key={i} sx={{ p: 1.5, borderLeft: `4px solid ${info.color || '#999'}` }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Chip icon={info.icon} label={info.label || b.kaynak} size="small" sx={{ bgcolor: info.bg, color: info.color, fontWeight: 'bold' }} />
                    <Typography variant="caption" color="text.secondary">
                      {tarihYaz(b.tarih)}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {b.musteri_adi}
                  </Typography>
                  {b.telefon && (
                    <Typography variant="body2" color="text.secondary">
                      {b.telefon}
                    </Typography>
                  )}
                  {b.aciklama && (
                    <Typography variant="body2" color="text.secondary">
                      {b.aciklama}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Toplam: {fmtTL(b.toplam_tutar)}
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#C62828' }} fontWeight="bold">
                      {fmtTL(b.kalan_odeme)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                    <Tooltip title="Detaylar">
                      <IslemDugmesi tur="goz" onClick={() => openDetail(b)} />
                    </Tooltip>
                    <Tooltip title={`${info.label || ''} sayfasına git`}>
                      <IslemDugmesi tur="ac" onClick={() => info.path && navigate(info.path)} />
                    </Tooltip>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  {['Kaynak', 'Müşteri', 'Telefon', 'Açıklama', 'Tarih', 'Toplam', 'Kalan Borç', 'İşlemler'].map((h) => (
                    <TableCell key={h} sx={{ whiteSpace: 'nowrap', textAlign: h === 'Toplam' || h === 'Kalan Borç' ? 'right' : 'left' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((b, i) => {
                  const info: Partial<(typeof KAYNAK_INFO)[BorcKaynagi]> = KAYNAK_INFO[b.kaynak_key] || {};
                  return (
                    <TableRow key={i} hover>
                      <TableCell>
                        <Chip
                          icon={info.icon}
                          label={info.label || b.kaynak}
                          size="small"
                          sx={{ bgcolor: info.bg, color: info.color, fontWeight: 700, '& .MuiChip-icon': { color: info.color } }}
                        />
                      </TableCell>
                      <TableCell>
                        <strong>{b.musteri_adi}</strong>
                      </TableCell>
                      <TableCell>{b.telefon || '-'}</TableCell>
                      <TableCell sx={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.aciklama || ''}>
                        {b.aciklama || '-'}
                      </TableCell>
                      <TableCell sx={{ color: RENK.soluk }}>{tarihYaz(b.tarih)}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{fmtTL(b.toplam_tutar)}</TableCell>
                      <TableCell sx={{ textAlign: 'right', color: RENK.kirmizi, fontWeight: 700 }}>{fmtTL(b.kalan_odeme)}</TableCell>
                      <TableCell>
                        <Tooltip title="Detaylar">
                          <IslemDugmesi tur="goz" onClick={() => openDetail(b)} />
                        </Tooltip>
                        <Tooltip title={`${info.label || ''} sayfasına git`}>
                          <IslemDugmesi tur="ac" onClick={() => info.path && navigate(info.path)} />
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ))}

      {/* Detay Modal */}
      <Dialog open={detayModal.open} onClose={() => setDetayModal({ open: false, borc: null })} maxWidth="md" fullWidth fullScreen={isMobile}>
        {detayModal.borc &&
          (() => {
            const b = detayModal.borc;
            const info: Partial<(typeof KAYNAK_INFO)[BorcKaynagi]> = KAYNAK_INFO[b.kaynak_key] || {};
            const yol = info.path;
            const d = b.detay || {};
            const parcalar = d.parcalar || [];
            const odenen = (parseFloat(String(b.toplam_tutar)) || 0) - (parseFloat(String(b.kalan_odeme)) || 0);
            return (
              <>
                <DialogBasligi ikon={info.icon} baslik={`${info.label} Detayı`} onKapat={() => setDetayModal({ open: false, borc: null })} />
                <DialogContent>
                  {/* Müşteri ve genel */}
                  <Grid container spacing={1.5} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary">
                        Müşteri
                      </Typography>
                      <Typography fontWeight="bold">{b.musteri_adi}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary">
                        Telefon
                      </Typography>
                      <Typography>{b.telefon || '-'}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <Typography variant="caption" color="text.secondary">
                        Tarih
                      </Typography>
                      <Typography>{tarihYaz(b.tarih)}</Typography>
                    </Grid>
                  </Grid>

                  {/* Ödeme özeti */}
                  <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: '#F7E7C4', borderLeft: '4px solid #A5530F' }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#A5530F', mb: 1 }}>
                      Ödeme Durumu
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 4 }}>
                        <Typography variant="caption" color="text.secondary">
                          Toplam Tutar
                        </Typography>
                        <Typography fontWeight="bold">{fmtTL(b.toplam_tutar)}</Typography>
                      </Grid>
                      <Grid size={{ xs: 4 }}>
                        <Typography variant="caption" color="text.secondary">
                          Ödenen
                        </Typography>
                        <Typography fontWeight="bold" sx={{ color: '#1D6A3B' }}>
                          {fmtTL(odenen)}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 4 }}>
                        <Typography variant="caption" color="text.secondary">
                          Kalan Borç
                        </Typography>
                        <Typography fontWeight="bold" sx={{ color: '#C62828' }}>
                          {fmtTL(b.kalan_odeme)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  <Divider sx={{ my: 2 }} />

                  {b.kaynak_key === 'motor' && (
                    <>
                      <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                        Motor Bilgileri
                      </Typography>
                      <Grid container spacing={1.5}>
                        {d.plaka && (
                          <Grid size={{ xs: 6, sm: 4 }}>
                            <Typography variant="caption" color="text.secondary">
                              Plaka
                            </Typography>
                            <Typography fontWeight="bold">{d.plaka}</Typography>
                          </Grid>
                        )}
                        {(d.marka || d.model) && (
                          <Grid size={{ xs: 6, sm: 4 }}>
                            <Typography variant="caption" color="text.secondary">
                              Marka / Model
                            </Typography>
                            <Typography>
                              {d.marka} {d.model}
                            </Typography>
                          </Grid>
                        )}
                        {d.yil && (
                          <Grid size={{ xs: 6, sm: 4 }}>
                            <Typography variant="caption" color="text.secondary">
                              Yıl
                            </Typography>
                            <Typography>{d.yil}</Typography>
                          </Grid>
                        )}
                        {d.km != null && (
                          <Grid size={{ xs: 6, sm: 4 }}>
                            <Typography variant="caption" color="text.secondary">
                              KM
                            </Typography>
                            <Typography>{d.km}</Typography>
                          </Grid>
                        )}
                        {d.odeme_sekli && (
                          <Grid size={{ xs: 6, sm: 4 }}>
                            <Typography variant="caption" color="text.secondary">
                              Ödeme Şekli
                            </Typography>
                            <Typography>{d.odeme_sekli}</Typography>
                          </Grid>
                        )}
                        {d.alici_tc && (
                          <Grid size={{ xs: 6, sm: 4 }}>
                            <Typography variant="caption" color="text.secondary">
                              TC
                            </Typography>
                            <Typography>{d.alici_tc}</Typography>
                          </Grid>
                        )}
                        {d.alici_adres && (
                          <Grid size={{ xs: 12 }}>
                            <Typography variant="caption" color="text.secondary">
                              Adres
                            </Typography>
                            <Typography>{d.alici_adres}</Typography>
                          </Grid>
                        )}
                        {d.notlar && (
                          <Grid size={{ xs: 12 }}>
                            <Typography variant="caption" color="text.secondary">
                              Notlar
                            </Typography>
                            <Typography>{d.notlar}</Typography>
                          </Grid>
                        )}
                      </Grid>
                    </>
                  )}

                  {b.kaynak_key === 'servis' && (
                    <>
                      <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                        Servis Bilgileri
                      </Typography>
                      <Grid container spacing={1.5} sx={{ mb: 2 }}>
                        {d.fis_no && (
                          <Grid size={{ xs: 6, sm: 4 }}>
                            <Typography variant="caption" color="text.secondary">
                              Fiş No
                            </Typography>
                            <Typography fontWeight="bold">#{d.fis_no}</Typography>
                          </Grid>
                        )}
                        {(d.marka || d.model_tip) && (
                          <Grid size={{ xs: 6, sm: 4 }}>
                            <Typography variant="caption" color="text.secondary">
                              Marka / Model
                            </Typography>
                            <Typography>
                              {d.marka} {d.model_tip}
                            </Typography>
                          </Grid>
                        )}
                        {d.km != null && (
                          <Grid size={{ xs: 6, sm: 4 }}>
                            <Typography variant="caption" color="text.secondary">
                              KM
                            </Typography>
                            <Typography>{d.km}</Typography>
                          </Grid>
                        )}
                        {d.durum && (
                          <Grid size={{ xs: 6, sm: 4 }}>
                            <Typography variant="caption" color="text.secondary">
                              Durum
                            </Typography>
                            <Typography>{d.durum}</Typography>
                          </Grid>
                        )}
                        {d.ariza_sikayetler && (
                          <Grid size={{ xs: 12 }}>
                            <Typography variant="caption" color="text.secondary">
                              Arıza / Şikayet
                            </Typography>
                            <Typography>{d.ariza_sikayetler}</Typography>
                          </Grid>
                        )}
                        {d.odeme_detaylari && (
                          <Grid size={{ xs: 12 }}>
                            <Typography variant="caption" color="text.secondary">
                              Ödeme Detayları
                            </Typography>
                            <Typography>{d.odeme_detaylari}</Typography>
                          </Grid>
                        )}
                        {d.notlar && (
                          <Grid size={{ xs: 12 }}>
                            <Typography variant="caption" color="text.secondary">
                              Açıklama
                            </Typography>
                            <Typography>{d.notlar}</Typography>
                          </Grid>
                        )}
                      </Grid>
                      {parcalar.length > 0 && (
                        <>
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                            Takılan Parçalar
                          </Typography>
                          <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                              <TableHead>
                                <TableRow sx={{ bgcolor: '#F3F3EE' }}>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Parça</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                                    Adet
                                  </TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                    Birim
                                  </TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                    Toplam
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {parcalar.map((p, i) => (
                                  <TableRow key={i}>
                                    <TableCell>{p.takilan_parca}</TableCell>
                                    <TableCell align="center">{p.adet}</TableCell>
                                    <TableCell align="right">{fmtTL(p.birim_fiyat)}</TableCell>
                                    <TableCell align="right">
                                      <strong>{fmtTL(p.toplam_fiyat || Number(p.adet) * Number(p.birim_fiyat))}</strong>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </>
                      )}
                    </>
                  )}

                  {b.kaynak_key === 'aksesuar' && (
                    <>
                      <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                        Aksesuar Satışı
                      </Typography>
                      <Grid container spacing={1.5} sx={{ mb: 2 }}>
                        {d.odeme_sekli && (
                          <Grid size={{ xs: 6, sm: 4 }}>
                            <Typography variant="caption" color="text.secondary">
                              Ödeme Şekli
                            </Typography>
                            <Typography>{d.odeme_sekli}</Typography>
                          </Grid>
                        )}
                        {d.durum && (
                          <Grid size={{ xs: 6, sm: 4 }}>
                            <Typography variant="caption" color="text.secondary">
                              Durum
                            </Typography>
                            <Typography>{d.durum}</Typography>
                          </Grid>
                        )}
                        {d.odeme_detaylari && (
                          <Grid size={{ xs: 12 }}>
                            <Typography variant="caption" color="text.secondary">
                              Ödeme Detayları
                            </Typography>
                            <Typography>{d.odeme_detaylari}</Typography>
                          </Grid>
                        )}
                        {d.notlar && (
                          <Grid size={{ xs: 12 }}>
                            <Typography variant="caption" color="text.secondary">
                              Açıklama
                            </Typography>
                            <Typography>{d.notlar}</Typography>
                          </Grid>
                        )}
                      </Grid>
                      {parcalar.length > 0 && (
                        <>
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                            Ürünler
                          </Typography>
                          <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                              <TableHead>
                                <TableRow sx={{ bgcolor: '#F3F3EE' }}>
                                  <TableCell sx={{ fontWeight: 'bold' }}>Ürün</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                                    Adet
                                  </TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                    Satış
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {parcalar.map((p, i) => (
                                  <TableRow key={i}>
                                    <TableCell>{p.urun_adi}</TableCell>
                                    <TableCell align="center">{p.adet}</TableCell>
                                    <TableCell align="right">
                                      <strong>{fmtTL(p.satis_fiyati)}</strong>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </>
                      )}
                    </>
                  )}

                  {b.kaynak_key === 'yedek_parca' && (
                    <>
                      <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                        Yedek Parça
                      </Typography>
                      <Grid container spacing={1.5}>
                        {d.urun_adi && (
                          <Grid size={{ xs: 12 }}>
                            <Typography variant="caption" color="text.secondary">
                              Ürün
                            </Typography>
                            <Typography fontWeight="bold">{d.urun_adi}</Typography>
                          </Grid>
                        )}
                        {d.alis_fiyati != null && (
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary">
                              Alış Fiyatı
                            </Typography>
                            <Typography>{fmtTL(d.alis_fiyati)}</Typography>
                          </Grid>
                        )}
                        {d.satis_fiyati != null && (
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" color="text.secondary">
                              Satış Fiyatı
                            </Typography>
                            <Typography>{fmtTL(d.satis_fiyati)}</Typography>
                          </Grid>
                        )}
                      </Grid>
                    </>
                  )}
                </DialogContent>
                <DialogActions>
                  {yol && (
                    <Button
                      startIcon={<OpenIcon />}
                      onClick={() => {
                        setDetayModal({ open: false, borc: null });
                        navigate(yol);
                      }}
                    >
                      {info.label} Sayfasına Git
                    </Button>
                  )}
                  <Button onClick={() => setDetayModal({ open: false, borc: null })} variant="contained">
                    Kapat
                  </Button>
                </DialogActions>
              </>
            );
          })()}
      </Dialog>
    </Box>
  );
};

export default Veresiye;
