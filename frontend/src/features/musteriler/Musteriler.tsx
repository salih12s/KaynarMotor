import React, { useState, useEffect, useCallback } from 'react';
import { hataMesaji } from '../../shared/api/istemci';
import KisiIkon from '@mui/icons-material/PersonOutlined';
import { BilgiKarti, BolumBasligi, Damga, DialogBasligi, IslemDugmesi, Plaka, sagaSutunlar, useOnay, bildir } from '../../shared/ui';
import MotorIkon from '@mui/icons-material/TwoWheelerOutlined';
import SepetIkon from '@mui/icons-material/ShoppingCartOutlined';
import ServisIkon from '@mui/icons-material/BuildOutlined';
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
  useTheme,
  useMediaQuery,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

import SearchIcon from '@mui/icons-material/Search';

import { musteriService } from './musteriApi';
import { sayiYaz, tarihYaz, sayiDegeri } from '../../shared/utils/bicim';
import type { Musteri, MusteriDetayi } from '../../shared/tipler';
import type { TonAdi } from '../../app/tokenlar';
import { MENU_RENK, RENK, TON } from '../../app/tokenlar';

// Hızlı yazarken eski aramanın yanıtı yeniyi ezmesin
const sonAra = sonIstek();

const Musteriler = () => {
  const onay = useOnay();
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [musteriler, setMusteriler] = useState<Musteri[]>([]);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<{ open: boolean; data: Musteri | null }>({ open: false, data: null });
  const [formData, setFormData] = useState({ ad_soyad: '', telefon: '', adres: '' });
  const [error, setError] = useState('');
  const [detayDialog, setDetayDialog] = useState<{ open: boolean; data: MusteriDetayi | null }>({ open: false, data: null });

  const openDetay = async (musteri: Musteri) => {
    try {
      const res = await musteriService.getById(musteri.id);
      setDetayDialog({ open: true, data: res.data });
    } catch {}
  };

  const loadData = useCallback(async () => {
    try {
      const res = await musteriService.getAll();
      setMusteriler(res.data);
    } catch {}
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = useCallback(async () => {
    if (!search.trim()) {
      sonAra.iptal();
      return loadData();
    }
    try {
      const res = await sonAra(musteriService.search(search));
      if (res) setMusteriler(res.data);
    } catch {}
  }, [search, loadData]);

  useEffect(() => {
    const timer = setTimeout(() => void handleSearch(), 300);
    return () => clearTimeout(timer);
  }, [handleSearch]);

  const openDialog = (musteri: Musteri | null = null) => {
    setFormData(
      musteri ? { ad_soyad: musteri.ad_soyad || '', telefon: musteri.telefon || '', adres: musteri.adres || '' } : { ad_soyad: '', telefon: '', adres: '' },
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
      setError(hataMesaji(err, 'Hata oluştu'));
    }
  };

  const handleDelete = async (id: number) => {
    const musteri = musteriler.find((m) => m.id === id);
    const mesaj = musteri ? (
      <>
        <strong>{musteri.ad_soyad}</strong> kaydı silinecek. Bu işlem geri alınamaz. Müşterinin geçmiş satış ve servis kayıtları silinmez.
      </>
    ) : (
      'Bu müşteriyi silmek istediğinizden emin misiniz?'
    );
    if (!(await onay(mesaj, { baslik: 'Müşteriyi sil' }))) return;
    try {
      await musteriService.delete(id);
      loadData();
    } catch (err) {
      bildir(hataMesaji(err, 'Silme hatası'));
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
            const motorlar = d.motorlar || [];
            const aksesuarlar = d.aksesuarlar || [];
            const isEmirleri = d.isEmirleri || [];
            const kapat = () => setDetayDialog({ open: false, data: null });
            const durumDamgasi = (durum: string | null | undefined) => {
              const harita: Record<string, [TonAdi, string]> = {
                tamamlandi: ['yesil', 'Tamamlandı'],
                stokta: ['gri', 'Stokta'],
                beklemede: ['bekle', 'Beklemede'],
                devir_bekliyor: ['mor', 'Devir Bekliyor'],
                iptal: ['kirmizi', 'İptal'],
              };
              const [ton, yazi] = (durum && harita[durum]) || ['gri', durum];
              return <Damga ton={ton}>{yazi}</Damga>;
            };
            return (
              <>
                <DialogBasligi ikon={<KisiIkon />} baslik={d.ad_soyad} onKapat={kapat} />
                <DialogContent>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start', mb: 2 }}>
                    <BilgiKarti
                      baslik="İletişim"
                      sx={{ flex: '1 1 340px', maxWidth: 520 }}
                      satirlar={[
                        ['Telefon', d.telefon || '-'],
                        ['Adres', d.adres || '-'],
                      ]}
                    />
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Damga ton="kirmizi" sx={{ fontSize: 13, px: 1.25, py: 0.5 }}>{`Motor: ${motorlar.length}`}</Damga>
                      <Damga ton="yesil" sx={{ fontSize: 13, px: 1.25, py: 0.5 }}>{`Aksesuar: ${aksesuarlar.length}`}</Damga>
                      <Damga ton="turuncu" sx={{ fontSize: 13, px: 1.25, py: 0.5 }}>{`Servis: ${isEmirleri.length}`}</Damga>
                    </Box>
                  </Box>

                  {motorlar.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <BolumBasligi ikon={<MotorIkon />} renk={MENU_RENK.motor}>
                        Motor İşlemleri
                      </BolumBasligi>
                      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                        <Table sx={sagaSutunlar(4)}>
                          <TableHead>
                            <TableRow>
                              {['Plaka', 'Marka/Model', 'Rol', 'Fiyat', 'Durum', 'Tarih'].map((h) => (
                                <TableCell key={h}>{h}</TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {motorlar.map((m) => {
                              const isSatici = m.satici_adi && m.satici_adi.toLowerCase() === (d.ad_soyad ?? '').toLowerCase();
                              const isAlici = m.alici_adi && m.alici_adi.toLowerCase() === (d.ad_soyad ?? '').toLowerCase();
                              return (
                                <TableRow key={m.id} hover>
                                  <TableCell>
                                    <Plaka plaka={m.plaka} />
                                  </TableCell>
                                  <TableCell>
                                    {m.marka} {m.model} {m.yil ? `(${m.yil})` : ''}
                                  </TableCell>
                                  <TableCell>
                                    {isSatici && <Damga ton="turuncu">Satıcı</Damga>}
                                    {isAlici && <Damga ton="yesil">Alıcı</Damga>}
                                  </TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>
                                    {isSatici && `₺${sayiYaz(m.alis_fiyati)}`}
                                    {isAlici && `₺${sayiYaz(m.satis_fiyati)}`}
                                  </TableCell>
                                  <TableCell>{durumDamgasi(m.durum)}</TableCell>
                                  <TableCell sx={{ color: RENK.soluk }}>{tarihYaz(m.satis_tarihi || m.tarih)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                  {aksesuarlar.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <BolumBasligi ikon={<SepetIkon />} renk={MENU_RENK.aksesuar}>
                        Aksesuar Satışları
                      </BolumBasligi>
                      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                        <Table sx={sagaSutunlar(1, 2)}>
                          <TableHead>
                            <TableRow>
                              {['Toplam Satış', 'Kâr', 'Durum', 'Tarih'].map((h) => (
                                <TableCell key={h}>{h}</TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {aksesuarlar.map((a) => (
                              <TableRow key={a.id} hover>
                                <TableCell sx={{ fontWeight: 700 }}>₺{sayiYaz(a.toplam_satis)}</TableCell>
                                <TableCell sx={{ color: sayiDegeri(a.kar) >= 0 ? RENK.yesil : RENK.kirmizi, fontWeight: 600 }}>₺{sayiYaz(a.kar)}</TableCell>
                                <TableCell>{durumDamgasi(a.durum)}</TableCell>
                                <TableCell sx={{ color: RENK.soluk }}>{tarihYaz(a.satis_tarihi)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                  {isEmirleri.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <BolumBasligi ikon={<ServisIkon />} renk={MENU_RENK.servis}>
                        Servis İşlemleri
                      </BolumBasligi>
                      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                        <Table sx={sagaSutunlar(3)}>
                          <TableHead>
                            <TableRow>
                              {['Fiş No', 'Model', 'Tutar', 'Durum', 'Tarih'].map((h) => (
                                <TableCell key={h}>{h}</TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {isEmirleri.map((ie) => (
                              <TableRow key={ie.id} hover>
                                <TableCell sx={{ fontWeight: 700 }}>#{ie.fis_no}</TableCell>
                                <TableCell>
                                  {ie.marka} {ie.model_tip}
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>₺{sayiYaz(ie.gercek_toplam_ucret)}</TableCell>
                                <TableCell>{durumDamgasi(ie.durum)}</TableCell>
                                <TableCell sx={{ color: RENK.soluk }}>{tarihYaz(ie.created_at)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                  {motorlar.length === 0 && aksesuarlar.length === 0 && isEmirleri.length === 0 && (
                    <Alert severity="info">Bu müşteriye ait işlem kaydı bulunamadı.</Alert>
                  )}
                </DialogContent>
                <DialogActions>
                  <Button
                    onClick={() => {
                      kapat();
                      openDialog(d);
                    }}
                    variant="outlined"
                    startIcon={<EditIcon />}
                  >
                    Düzenle
                  </Button>
                  <Button variant="contained" onClick={kapat}>
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

export default Musteriler;
