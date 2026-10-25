import React, { useState, useEffect } from 'react';
import KisiIkon from '@mui/icons-material/PersonOutlined';
import { IslemDugmesi } from '../../shared/ui';
import { useOnay } from '../../shared/ui';
import { DialogBasligi } from '../../shared/ui';
import { sonIstek } from '../../shared/utils/sonIstek';
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
  TextField,
  Dialog,
  DialogContent,
  DialogActions,
  Alert,
  InputAdornment,
  Grid,
  Chip,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

import SearchIcon from '@mui/icons-material/Search';

import { musteriService } from './musteriApi';
import { sayiYaz, tarihYaz } from '../../shared/utils/bicim';
import { TON } from '../../app/tokenlar';

// Hızlı yazarken eski aramanın yanıtı yeniyi ezmesin
const sonAra = sonIstek();

const Musteriler = () => {
  const onay = useOnay();
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [musteriler, setMusteriler] = useState([]);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [formData, setFormData] = useState({ ad_soyad: '', telefon: '', adres: '' });
  const [error, setError] = useState('');
  const [detayDialog, setDetayDialog] = useState({ open: false, data: null });

  const openDetay = async (musteri) => {
    try {
      const res = await musteriService.getById(musteri.id);
      setDetayDialog({ open: true, data: res.data });
    } catch {}
  };

  const loadData = async () => {
    try {
      const res = await musteriService.getAll();
      setMusteriler(res.data);
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = async () => {
    if (!search.trim()) {
      sonAra.iptal();
      return loadData();
    }
    try {
      const res = await sonAra(musteriService.search(search));
      if (res) setMusteriler(res.data);
    } catch {}
  };

  useEffect(() => {
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const openDialog = (musteri = null) => {
    setFormData(
      musteri ? { ad_soyad: musteri.ad_soyad, telefon: musteri.telefon || '', adres: musteri.adres || '' } : { ad_soyad: '', telefon: '', adres: '' },
    );
    setDialog({ open: true, data: musteri });
    setError('');
  };

  const handleSave = async () => {
    try {
      if (dialog.data) {
        await musteriService.update(dialog.data.id, formData);
      } else {
        await musteriService.create(formData);
      }
      setDialog({ open: false, data: null });
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Hata oluştu');
    }
  };

  const handleDelete = async (id) => {
    if (!(await onay('Bu müşteriyi silmek istediğinizden emin misiniz?'))) return;
    try {
      await musteriService.delete(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Silme hatası');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: { xs: 'stretch', md: 'center' }, flexDirection: { xs: 'column', md: 'row' }, gap: 1.5, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Müşteri ara (ad, telefon)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: { md: '1 1 260px' }, maxWidth: { md: 560 }, order: { xs: 3, md: 0 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Box sx={{ flex: { md: 1 }, display: { xs: 'none', md: 'block' } }} />
        <Box
          component="span"
          sx={{
            order: { xs: 1, md: 0 },
            alignSelf: { xs: 'flex-start', md: 'center' },
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
          Toplam: {musteriler.length} müşteri
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog()} sx={{ order: { xs: 2, md: 0 } }}>
          Yeni Müşteri
        </Button>
      </Box>

      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {musteriler.length === 0 && <Alert severity="info">Kayıt bulunamadı</Alert>}
          {musteriler.map((m) => (
            <Paper key={m.id} sx={{ p: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {m.ad_soyad}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                  {m.telefon || '-'}
                </Typography>
              </Box>
              {m.adres && (
                <Typography variant="body2" color="text.secondary">
                  {m.adres}
                </Typography>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <IslemDugmesi
                  tur="goz"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDetay(m);
                  }}
                />
                <IslemDugmesi tur="duz" onClick={() => openDialog(m)} />
                <IslemDugmesi tur="sil" onClick={() => handleDelete(m.id)} />
              </Box>
            </Paper>
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                {['Ad Soyad', 'Telefon', 'Adres', 'İşlemler'].map((h) => (
                  <TableCell key={h}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {musteriler.map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{m.ad_soyad}</TableCell>
                  <TableCell>{m.telefon || '-'}</TableCell>
                  <TableCell>{m.adres || '-'}</TableCell>
                  <TableCell>
                    <IslemDugmesi tur="goz" onClick={() => openDetay(m)} />
                    <IslemDugmesi tur="duz" onClick={() => openDialog(m)} />
                    <IslemDugmesi tur="sil" onClick={() => handleDelete(m.id)} />
                  </TableCell>
                </TableRow>
              ))}
              {musteriler.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Kayıt bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, data: null })} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogBasligi ikon={<KisiIkon />} baslik={dialog.data ? 'Müşteri Düzenle' : 'Yeni Müşteri'} />
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Ad Soyad"
                value={formData.ad_soyad}
                onChange={(e) => setFormData({ ...formData, ad_soyad: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Telefon" value={formData.telefon} onChange={(e) => setFormData({ ...formData, telefon: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Adres"
                value={formData.adres}
                onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, data: null })}>İptal</Button>
          <Button variant="contained" onClick={handleSave}>
            {dialog.data ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Müşteri Detay Dialog */}
      <Dialog open={detayDialog.open} onClose={() => setDetayDialog({ open: false, data: null })} maxWidth="md" fullWidth fullScreen={isMobile}>
        {detayDialog.data &&
          (() => {
            const d = detayDialog.data;
            const formatTL = (v) => sayiYaz(v);
            return (
              <>
                <DialogBasligi baslik={<>{d.ad_soyad}</>} onKapat={() => setDetayDialog({ open: false, data: null })} />
                <DialogContent dividers>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Paper sx={{ p: 1.5, bgcolor: '#DCE6F4', borderLeft: '4px solid #1E4A86' }}>
                        <Typography variant="subtitle2" fontWeight="bold" color="#1E4A86">
                          İletişim
                        </Typography>
                        <Typography variant="body2">
                          <strong>Telefon:</strong> {d.telefon || '-'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Adres:</strong> {d.adres || '-'}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 8 }}>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip label={`Motor: ${(d.motorlar || []).length}`} sx={{ bgcolor: '#F6DAD7', color: '#C62828', fontWeight: 'bold' }} />
                        <Chip label={`Aksesuar: ${(d.aksesuarlar || []).length}`} sx={{ bgcolor: '#D8EBDD', color: '#1D6A3B', fontWeight: 'bold' }} />
                        <Chip label={`Servis: ${(d.isEmirleri || []).length}`} sx={{ bgcolor: '#F7E7C4', color: '#A5530F', fontWeight: 'bold' }} />
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Motor İşlemleri */}
                  {(d.motorlar || []).length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" fontWeight="bold" color="#C62828" gutterBottom>
                        Motor İşlemleri
                      </Typography>
                      <Divider sx={{ mb: 1 }} />
                      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: '#F6DAD7' }}>
                              {['Plaka', 'Marka/Model', 'Rol', 'Fiyat', 'Durum', 'Tarih'].map((h) => (
                                <TableCell key={h} sx={{ fontWeight: 'bold', color: '#C62828' }}>
                                  {h}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {d.motorlar.map((m) => {
                              const isSatici = m.satici_adi && m.satici_adi.toLowerCase() === d.ad_soyad.toLowerCase();
                              const isAlici = m.alici_adi && m.alici_adi.toLowerCase() === d.ad_soyad.toLowerCase();
                              return (
                                <TableRow key={m.id} hover>
                                  <TableCell>
                                    <strong>{m.plaka}</strong>
                                  </TableCell>
                                  <TableCell>
                                    {m.marka} {m.model} {m.yil ? `(${m.yil})` : ''}
                                  </TableCell>
                                  <TableCell>
                                    {isSatici && <Chip label="Satıcı" size="small" sx={{ bgcolor: '#F7E7C4', color: '#A5530F', mr: 0.5 }} />}
                                    {isAlici && <Chip label="Alıcı" size="small" sx={{ bgcolor: '#D8EBDD', color: '#1D6A3B' }} />}
                                  </TableCell>
                                  <TableCell>
                                    {isSatici && `₺${formatTL(m.alis_fiyati)}`}
                                    {isAlici && `₺${formatTL(m.satis_fiyati)}`}
                                  </TableCell>
                                  <TableCell>{m.durum === 'tamamlandi' ? 'Tamamlandı' : m.durum === 'stokta' ? 'Stokta' : m.durum}</TableCell>
                                  <TableCell>{tarihYaz(m.satis_tarihi || m.tarih)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                  {/* Aksesuar İşlemleri */}
                  {(d.aksesuarlar || []).length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" fontWeight="bold" color="#1D6A3B" gutterBottom>
                        Aksesuar Satışları
                      </Typography>
                      <Divider sx={{ mb: 1 }} />
                      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: '#D8EBDD' }}>
                              {['Toplam Satış', 'Kâr', 'Durum', 'Tarih'].map((h) => (
                                <TableCell key={h} sx={{ fontWeight: 'bold', color: '#1D6A3B' }}>
                                  {h}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {d.aksesuarlar.map((a) => (
                              <TableRow key={a.id} hover>
                                <TableCell>₺{formatTL(a.toplam_satis)}</TableCell>
                                <TableCell sx={{ color: parseFloat(a.kar || 0) >= 0 ? 'green' : 'red' }}>₺{formatTL(a.kar)}</TableCell>
                                <TableCell>{a.durum === 'tamamlandi' ? 'Tamamlandı' : 'Beklemede'}</TableCell>
                                <TableCell>{tarihYaz(a.satis_tarihi)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                  {/* İş Emirleri */}
                  {(d.isEmirleri || []).length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" fontWeight="bold" color="#A5530F" gutterBottom>
                        Servis İşlemleri
                      </Typography>
                      <Divider sx={{ mb: 1 }} />
                      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ bgcolor: '#F7E7C4' }}>
                              {['Fiş No', 'Model', 'Tutar', 'Durum', 'Tarih'].map((h) => (
                                <TableCell key={h} sx={{ fontWeight: 'bold', color: '#A5530F' }}>
                                  {h}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {d.isEmirleri.map((ie) => (
                              <TableRow key={ie.id} hover>
                                <TableCell>#{ie.fis_no}</TableCell>
                                <TableCell>
                                  {ie.marka} {ie.model_tip}
                                </TableCell>
                                <TableCell>₺{formatTL(ie.gercek_toplam_ucret)}</TableCell>
                                <TableCell>{ie.durum === 'tamamlandi' ? 'Tamamlandı' : ie.durum === 'beklemede' ? 'Beklemede' : ie.durum}</TableCell>
                                <TableCell>{tarihYaz(ie.created_at)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                  {(d.motorlar || []).length === 0 && (d.aksesuarlar || []).length === 0 && (d.isEmirleri || []).length === 0 && (
                    <Alert severity="info">Bu müşteriye ait işlem kaydı bulunamadı.</Alert>
                  )}
                </DialogContent>
                <DialogActions>
                  <Button
                    onClick={() => {
                      setDetayDialog({ open: false, data: null });
                      openDialog(d);
                    }}
                    variant="outlined"
                    startIcon={<EditIcon />}
                  >
                    Düzenle
                  </Button>
                  <Button onClick={() => setDetayDialog({ open: false, data: null })}>Kapat</Button>
                </DialogActions>
              </>
            );
          })()}
      </Dialog>
    </Box>
  );
};

export default Musteriler;
