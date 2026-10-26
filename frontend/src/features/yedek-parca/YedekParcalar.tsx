import React, { useState, useEffect, type KeyboardEvent } from 'react';
import { hataMesaji } from '../../shared/api/istemci';
import AyarIkon from '@mui/icons-material/SettingsOutlined';
import { IslemDugmesi, OzetSeridi, DialogBasligi, bildir } from '../../shared/ui';
import { useOnay } from '../../shared/ui';
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
  Grid,
  Chip,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  Autocomplete,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import SearchIcon from '@mui/icons-material/Search';
import { useLocation, useNavigate } from 'react-router-dom';
import { yedekParcaService, yedekParcaStokService } from './yedekParcaApi';
import { musteriService } from '../musteriler/musteriApi';
import { useKarGor } from '../auth/AuthContext';
import { sayiYaz, sayiDegeri, type Sayi } from '../../shared/utils/bicim';
import type { YedekParcaSatis, YedekParcaStok } from '../../shared/tipler';
import { RENK, TON } from '../../app/tokenlar';
import { metinIcerir } from '../../shared/utils/metin';

// Hızlı yazarken eski aramanın yanıtı yeniyi ezmesin
const sonAra = sonIstek();

/** Satış formunun alanları: sayısal alanlar yazılırken metin, kayıttan gelirken sayı olabilir. */
interface YedekParcaFormu {
  urun_adi: string;
  alis_fiyati: string | number;
  satis_fiyati: string | number;
  musteri_adi: string;
  musteri_telefon: string;
  kalan_odeme: string | number;
  odeme_tamamlandi: boolean;
  stok_id: number | null;
  adet: string | number;
}

/** Satışa bağlanan stok: kayıt düzenlenirken yalnızca ad ve birim fiyatlar bilinir, stoktan seçilince `mevcut` da gelir. */
interface SeciliStok {
  id: number;
  stok_adi: string | null;
  alis_fiyati?: Sayi;
  satis_fiyati?: Sayi;
  mevcut?: number | null;
}

const YedekParcalar = () => {
  const onay = useOnay();
  const karGor = useKarGor();
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const location = useLocation();
  const navigate = useNavigate();
  const [parcalar, setParcalar] = useState<YedekParcaSatis[]>([]);
  const [dialog, setDialog] = useState<{ open: boolean; data: YedekParcaSatis | null }>({ open: false, data: null });
  const [formData, setFormData] = useState<YedekParcaFormu>({
    urun_adi: '',
    alis_fiyati: '',
    satis_fiyati: '',
    musteri_adi: '',
    musteri_telefon: '',
    kalan_odeme: '',
    odeme_tamamlandi: true,
    stok_id: null,
    adet: 1,
  });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [stokOptions, setStokOptions] = useState<YedekParcaStok[]>([]);
  const [stokInput, setStokInput] = useState('');
  const [seciliStok, setSeciliStok] = useState<SeciliStok | null>(null);

  const loadData = async () => {
    try {
      const res = await yedekParcaService.getAll();
      setParcalar(res.data);
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const id = (location.state as { openDetailId?: number } | null)?.openDetailId;
    if (!id || parcalar.length === 0) return;
    const p = parcalar.find((x) => x.id === id);
    if (p) openDialog(p);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate, parcalar]);

  const filtered = parcalar.filter((p) => metinIcerir(p.urun_adi, search) || metinIcerir(p.musteri_adi, search) || (p.musteri_telefon || '').includes(search));

  const openDialog = (parca: YedekParcaSatis | null = null) => {
    setError('');
    setStokOptions([]);
    setStokInput('');
    // Stoğa bağlı kayıt düzenlenirken birim fiyatlar kayıttan türetilir (kayıtta toplam tutar saklanır):
    // adet değişince fiyatlar yeniden hesaplanabilsin; eskiden seciliStok null olduğu için hesap hiç çalışmıyordu.
    const kayitAdet = Math.max(Number(parca?.adet) || 1, 1);
    setSeciliStok(
      parca?.stok_id
        ? {
            id: parca.stok_id,
            stok_adi: parca.urun_adi,
            alis_fiyati: sayiDegeri(parca.alis_fiyati) / kayitAdet,
            satis_fiyati: sayiDegeri(parca.satis_fiyati) / kayitAdet,
          }
        : null,
    );
    setFormData(
      parca
        ? {
            urun_adi: parca.urun_adi || '',
            alis_fiyati: parca.alis_fiyati || '',
            satis_fiyati: parca.satis_fiyati || '',
            musteri_adi: parca.musteri_adi || '',
            musteri_telefon: parca.musteri_telefon || '',
            kalan_odeme: parca.kalan_odeme || '',
            odeme_tamamlandi: !sayiDegeri(parca.kalan_odeme),
            stok_id: parca.stok_id || null,
            adet: parca.adet || 1,
          }
        : {
            urun_adi: '',
            alis_fiyati: '',
            satis_fiyati: '',
            musteri_adi: '',
            musteri_telefon: '',
            kalan_odeme: '',
            odeme_tamamlandi: true,
            stok_id: null,
            adet: 1,
          },
    );
    setDialog({ open: true, data: parca });
  };

  // Yedek parça stoğundan ara (ad, marka veya barkod ile)
  const handleStokSearch = async (q: string) => {
    if (!q || q.trim().length < 2) {
      sonAra.iptal();
      setStokOptions([]);
      return;
    }
    try {
      const res = await sonAra(yedekParcaStokService.search(q.trim()));
      if (res) setStokOptions(res.data || []);
    } catch {}
  };

  // Stok ürününü satışa bağla: ürün adı ve fiyatlar otomatik dolar, kaydedilince stoktan düşer
  const selectStok = (stok: YedekParcaStok) => {
    setSeciliStok(stok);
    setFormData((prev) => ({
      ...prev,
      stok_id: stok.id,
      adet: 1,
      urun_adi: stok.stok_adi || '',
      alis_fiyati: sayiDegeri(stok.alis_fiyati),
      satis_fiyati: sayiDegeri(stok.satis_fiyati),
    }));
    setStokInput('');
    setStokOptions([]);
  };

  // Barkod okutulduğunda (Enter) stok kodundan tam eşleşme bul
  const handleStokKeyDown = async (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const kod = (stokInput || '').trim();
    if (!kod) return;
    e.preventDefault();
    try {
      const res = await yedekParcaStokService.getByBarkod(kod);
      if (res.data) selectStok(res.data);
    } catch {
      setError(`Barkod bulunamadı: ${kod}`);
    }
  };

  // Adet değişince stoğa bağlı satışta toplam fiyatlar birim fiyattan yeniden hesaplanır
  const handleAdetChange = (v: string) => {
    setFormData((prev) => {
      const adet = Number(v) || 0;
      if (seciliStok && adet > 0) {
        return {
          ...prev,
          adet: v,
          alis_fiyati: sayiDegeri(seciliStok.alis_fiyati) * adet,
          satis_fiyati: sayiDegeri(seciliStok.satis_fiyati) * adet,
        };
      }
      return { ...prev, adet: v };
    });
  };

  const stokBagKaldir = () => {
    setSeciliStok(null);
    setFormData((prev) => ({ ...prev, stok_id: null }));
  };

  const handleSave = async () => {
    setError('');
    try {
      // `odeme_tamamlandi` yalnızca ekran içindir; sunucuya kalan ödeme olarak gider
      const { odeme_tamamlandi, ...alanlar } = formData;
      const payload = { ...alanlar, kalan_odeme: odeme_tamamlandi ? 0 : formData.kalan_odeme || 0 };
      if (dialog.data) {
        await yedekParcaService.update(dialog.data.id, payload);
      } else {
        await yedekParcaService.create(payload);
      }
      setDialog({ open: false, data: null });
      loadData();
    } catch (err) {
      setError(hataMesaji(err, 'Hata'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await onay('Bu kaydı silmek istediğinizden emin misiniz?', { baslik: 'Kaydı sil' }))) return;
    try {
      await yedekParcaService.delete(id);
      loadData();
    } catch (err) {
      bildir(hataMesaji(err, 'Hata'));
    }
  };

  const kar = (Number(formData.satis_fiyati) || 0) - (Number(formData.alis_fiyati) || 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2, alignItems: 'center', justifyContent: 'space-between' }}>
        <OzetSeridi cip ogeler={[{ etiket: 'Toplam', deger: parcalar.length }]} />
        <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={() => openDialog()}>
          Yeni Parça
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Parça ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filtered.length === 0 && <Alert severity="info">Kayıt yok</Alert>}
          {filtered.map((p) => {
            const pKar = sayiDegeri(p.satis_fiyati) - sayiDegeri(p.alis_fiyati);
            const kalan = sayiDegeri(p.kalan_odeme);
            return (
              <Paper key={p.id} sx={{ p: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {p.urun_adi}
                    {(p.adet || 1) > 1 ? ` (x${p.adet})` : ''}
                  </Typography>
                  <Box>
                    <IslemDugmesi tur="duz" onClick={() => openDialog(p)} />
                    <IslemDugmesi tur="sil" onClick={() => handleDelete(p.id)} />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2">
                    Alış: <strong>{sayiYaz(p.alis_fiyati)} ₺</strong>
                  </Typography>
                  <Typography variant="body2">
                    Satış: <strong>{sayiYaz(p.satis_fiyati)} ₺</strong>
                  </Typography>
                  {karGor && (
                    <Typography variant="body2" sx={{ color: pKar >= 0 ? 'green' : 'red' }}>
                      Kâr: <strong>{sayiYaz(pKar)} ₺</strong>
                    </Typography>
                  )}
                </Box>
                <Box sx={{ mt: 0.5 }}>
                  {kalan > 0 ? (
                    <Chip size="small" label={`Kalan: ₺${sayiYaz(kalan)}`} sx={{ bgcolor: TON.bekle.bg, color: TON.turuncu.fg, fontWeight: 'bold' }} />
                  ) : (
                    <Chip size="small" label="Ödeme Tamamlandı" sx={{ bgcolor: TON.yesil.bg, color: RENK.yesil, fontWeight: 'bold' }} />
                  )}
                </Box>
                {(p.musteri_adi || p.musteri_telefon) && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {p.musteri_adi || ''}
                    {p.musteri_adi && p.musteri_telefon ? ' • ' : ''}
                    {p.musteri_telefon ? `Tel: ${p.musteri_telefon}` : ''}
                  </Typography>
                )}
              </Paper>
            );
          })}
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                {['Ürün Adı', 'Alış Fiyatı (₺)', 'Satış Fiyatı (₺)', 'Müşteri', 'Telefon', ...(karGor ? ['Kâr (₺)'] : []), 'Ödeme Durumu', 'İşlemler'].map(
                  (h) => (
                    <TableCell key={h}>{h}</TableCell>
                  ),
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((p) => {
                const pKar = sayiDegeri(p.satis_fiyati) - sayiDegeri(p.alis_fiyati);
                const kalan = sayiDegeri(p.kalan_odeme);
                return (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      {p.urun_adi}
                      {(p.adet || 1) > 1 ? ` (x${p.adet})` : ''}
                    </TableCell>
                    <TableCell>{sayiYaz(p.alis_fiyati)}</TableCell>
                    <TableCell>{sayiYaz(p.satis_fiyati)}</TableCell>
                    <TableCell>{p.musteri_adi || '-'}</TableCell>
                    <TableCell>{p.musteri_telefon || '-'}</TableCell>
                    {karGor && <TableCell sx={{ color: pKar >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>{sayiYaz(pKar)}</TableCell>}
                    <TableCell>
                      {kalan > 0 ? (
                        <Chip
                          size="small"
                          label={`Kalan: ₺${sayiYaz(kalan)}`}
                          sx={{ bgcolor: TON.bekle.bg, color: TON.turuncu.fg, fontWeight: 'bold', borderLeft: `3px solid ${TON.turuncu.fg}` }}
                        />
                      ) : (
                        <Chip
                          size="small"
                          label="Tamamlandı"
                          sx={{ bgcolor: TON.yesil.bg, color: RENK.yesil, fontWeight: 'bold', borderLeft: `3px solid ${RENK.yesil}` }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <IslemDugmesi tur="duz" onClick={() => openDialog(p)} />
                      <IslemDugmesi tur="sil" onClick={() => handleDelete(p.id)} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Kayıt yok
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, data: null })} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogBasligi ikon={<AyarIkon />} baslik={dialog.data ? 'Parça Düzenle' : 'Yeni Yedek Parça'} />
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <Autocomplete
                freeSolo
                options={stokOptions}
                getOptionLabel={(o) => (typeof o === 'string' ? o : `${o.stok_adi} (${o.stok_kodu}) — Mevcut: ${o.mevcut || 0}`)}
                inputValue={stokInput}
                onInputChange={(e, v) => {
                  setStokInput(v);
                  handleStokSearch(v);
                }}
                onChange={(e, v) => {
                  if (v && typeof v !== 'string') selectStok(v);
                }}
                filterOptions={(x) => x}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    label="Stoktan sat (ara veya barkod okut)"
                    placeholder="Barkod okutun veya ürün adı yazın"
                    onKeyDown={handleStokKeyDown}
                  />
                )}
              />
              {formData.stok_id && (
                <Chip
                  size="small"
                  sx={{ mt: 1, bgcolor: TON.yesil.bg, color: RENK.yesil, fontWeight: 'bold' }}
                  label={
                    seciliStok
                      ? `Stoğa bağlı: ${seciliStok.stok_adi}${seciliStok.mevcut !== undefined ? ` (Mevcut: ${seciliStok.mevcut || 0})` : ''} — kaydedilince stoktan düşer`
                      : 'Stoğa bağlı satış — kaydedilince stoktan düşer'
                  }
                  onDelete={stokBagKaldir}
                />
              )}
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Ürün Adı"
                value={formData.urun_adi}
                onChange={(e) => setFormData({ ...formData, urun_adi: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField fullWidth label="Adet" type="number" value={formData.adet} onChange={(e) => handleAdetChange(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                fullWidth
                label="Alış Fiyatı (₺)"
                type="number"
                value={formData.alis_fiyati}
                onChange={(e) => setFormData({ ...formData, alis_fiyati: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                fullWidth
                label="Satış Fiyatı (₺)"
                type="number"
                value={formData.satis_fiyati}
                onChange={(e) => setFormData({ ...formData, satis_fiyati: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="Müşteri Adı"
                value={formData.musteri_adi}
                onChange={(e) => setFormData({ ...formData, musteri_adi: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="Müşteri Telefon"
                value={formData.musteri_telefon}
                onChange={async (e) => {
                  const v = e.target.value;
                  setFormData((prev) => ({ ...prev, musteri_telefon: v }));
                  const tel = (v || '').replace(/\D/g, '');
                  if (tel.length < 10) return;
                  try {
                    const res = await musteriService.searchByPhone(tel);
                    const m = res.data;
                    if (m) setFormData((prev) => ({ ...prev, musteri_adi: prev.musteri_adi || m.ad_soyad || '' }));
                  } catch {}
                }}
                onBlur={async (e) => {
                  const tel = (e.target.value || '').replace(/\D/g, '');
                  if (!tel || tel.length < 7) return;
                  try {
                    const res = await musteriService.searchByPhone(tel);
                    const m = res.data;
                    if (m) setFormData((prev) => ({ ...prev, musteri_adi: prev.musteri_adi || m.ad_soyad || '' }));
                  } catch {}
                }}
              />
            </Grid>
          </Grid>
          {karGor && (
            <Paper sx={{ p: 1, mt: 2, textAlign: 'center', bgcolor: kar >= 0 ? TON.yesil.bg : TON.kirmizi.bg }}>
              <Typography sx={{ color: kar >= 0 ? 'green' : 'red' }}>
                Kâr: <strong>{sayiYaz(kar)} ₺</strong>
              </Typography>
            </Paper>
          )}
          <Box sx={{ mt: 2, p: 1.5, border: `1px solid ${RENK.cizgi}`, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
              Kalan Ödeme
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.odeme_tamamlandi}
                      onChange={(e) =>
                        setFormData({ ...formData, odeme_tamamlandi: e.target.checked, kalan_odeme: e.target.checked ? '' : formData.kalan_odeme })
                      }
                    />
                  }
                  label="Ödeme Tamamlandı"
                />
              </Grid>
              {!formData.odeme_tamamlandi && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Kalan Ödeme (₺)"
                    type="number"
                    value={formData.kalan_odeme}
                    onChange={(e) => setFormData({ ...formData, kalan_odeme: e.target.value })}
                  />
                </Grid>
              )}
            </Grid>
          </Box>{' '}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, data: null })}>İptal</Button>
          <Button variant="contained" onClick={handleSave}>
            {dialog.data ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default YedekParcalar;
