import React, { useState, useEffect, useCallback } from 'react';
import { hataMesaji } from '../../shared/api/istemci';
import { stokEtiketiYazdir } from '../../shared/utils/stokEtiketi';
import InventoryIcon from '@mui/icons-material/Inventory2Outlined';
import { IslemDugmesi, OzetSeridi, DialogBasligi, MevcutStok } from '../../shared/ui';
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
  InputAdornment,
  MenuItem,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import UploadIcon from '@mui/icons-material/Upload';
import SearchIcon from '@mui/icons-material/Search';
import PrintIcon from '@mui/icons-material/Print';
import { aksesuarStokService } from './aksesuarApi';
import { sayiYaz, sayiDegeri } from '../../shared/utils/bicim';
import type { AksesuarStok as AksesuarStokKaydi } from '../../shared/tipler';

// Hızlı yazarken eski aramanın yanıtı yeniyi ezmesin
const sonAra = sonIstek();

const BEDEN_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const KATEGORI_OPTIONS = ['Aksesuar', 'Demir', 'Tank Ped', 'Yedek Parça', 'Ekipman', 'Sticker'];

/** Stok ekleme/düzenleme formu: sayısal alanlar yazılırken metin, kayıttan gelirken sayı olabilir. */
interface StokFormu {
  stok_kodu: string;
  stok_adi: string;
  marka: string;
  alis_fiyati: string | number;
  satis_fiyati: string | number;
  giren_miktar: string | number;
  platform: string;
  beden: string;
  renk: string;
  kategori: string;
}

const AksesuarStok = () => {
  const onay = useOnay();
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [stoklar, setStoklar] = useState<AksesuarStokKaydi[]>([]);
  const [dialog, setDialog] = useState<{ open: boolean; data: AksesuarStokKaydi | null }>({ open: false, data: null });
  const [importDialog, setImportDialog] = useState(false);
  const [importText, setImportText] = useState('');
  const [formData, setFormData] = useState<StokFormu>({
    stok_kodu: '',
    stok_adi: '',
    marka: '',
    alis_fiyati: '',
    satis_fiyati: '',
    giren_miktar: '',
    platform: '',
    beden: '',
    renk: '',
    kategori: '',
  });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('');
  const [stokFilter, setStokFilter] = useState('');

  const loadData = useCallback(async () => {
    try {
      const res = await aksesuarStokService.getAll();
      setStoklar(res.data);
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
      const res = await sonAra(aksesuarStokService.search(search));
      if (res) setStoklar(res.data);
    } catch {}
  }, [search, loadData]);

  useEffect(() => {
    const t = setTimeout(() => void handleSearch(), 300);
    return () => clearTimeout(t);
  }, [handleSearch]);

  const openDialog = async (stok: AksesuarStokKaydi | null = null) => {
    setError('');
    if (stok) {
      setFormData({
        stok_kodu: stok.stok_kodu || '',
        stok_adi: stok.stok_adi || '',
        marka: stok.marka || '',
        alis_fiyati: stok.alis_fiyati || '',
        satis_fiyati: stok.satis_fiyati || '',
        giren_miktar: stok.giren_miktar || 0,
        platform: stok.platform || '',
        beden: stok.beden || '',
        renk: stok.renk || '',
        kategori: stok.kategori || '',
      });
    } else {
      let nextKodu = '';
      try {
        const res = await aksesuarStokService.getNextStokKodu();
        nextKodu = res.data.nextStokKodu;
      } catch {}
      setFormData({
        stok_kodu: nextKodu,
        stok_adi: '',
        marka: '',
        alis_fiyati: '',
        satis_fiyati: '',
        giren_miktar: 0,
        platform: '',
        beden: '',
        renk: '',
        kategori: '',
      });
    }
    setDialog({ open: true, data: stok });
  };

  const handleSave = async () => {
    setError('');
    try {
      if (dialog.data) {
        await aksesuarStokService.update(dialog.data.id, formData);
      } else {
        await aksesuarStokService.create(formData);
      }
      setDialog({ open: false, data: null });
      loadData();
    } catch (err) {
      setError(hataMesaji(err, 'Hata'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await onay('Bu stok kaydını silmek istediğinizden emin misiniz?', { baslik: 'Stok kaydını sil' }))) return;
    try {
      await aksesuarStokService.delete(id);
      loadData();
    } catch (err) {
      alert(hataMesaji(err, 'Hata'));
    }
  };

  const handleImport = async () => {
    setError('');
    try {
      const lines = importText
        .trim()
        .split('\n')
        .filter((l) => l.trim());
      const items = lines.map((line) => {
        const parts = line.split('\t').map((p) => p.trim());
        return { stok_kodu: parts[0] || '', stok_adi: parts[1] || '', alis_fiyati: parts[2] || 0, satis_fiyati: parts[3] || 0, giren_miktar: parts[4] || 0 };
      });
      await aksesuarStokService.topluEkle(items);
      setImportDialog(false);
      setImportText('');
      loadData();
    } catch (err) {
      setError(hataMesaji(err, 'İçe aktarma hatası'));
    }
  };

  const totalUrun = stoklar.length;
  const envanter = stoklar.reduce((acc, s) => acc + sayiDegeri(s.alis_fiyati) * parseInt(String(s.mevcut || 0)), 0);

  const filteredStoklar = stoklar.filter((s) => {
    const matchKategori = !kategoriFilter || (s.kategori || '').toLowerCase() === kategoriFilter.toLowerCase();
    const matchStok = !stokFilter || (stokFilter === 'biten' ? (s.mevcut || 0) <= 0 : (s.mevcut || 0) > 0);
    return matchKategori && matchStok;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2, alignItems: 'center', justifyContent: 'space-between' }}>
        <OzetSeridi
          cip
          ogeler={[
            { etiket: 'Toplam', deger: `${totalUrun} ürün` },
            { etiket: 'Envanter', deger: `₺${sayiYaz(envanter)}`, ton: 'yesil' },
          ]}
        />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => setImportDialog(true)}>
            İçe Aktar
          </Button>
          <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={() => openDialog()}>
            Yeni Stok
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Stok ara (kod, ad, marka)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: { xs: '100%', sm: 250 } }}
          />
          <TextField select size="small" label="Kategori" value={kategoriFilter} onChange={(e) => setKategoriFilter(e.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="">Tümü</MenuItem>
            {KATEGORI_OPTIONS.map((k) => (
              <MenuItem key={k} value={k}>
                {k}
              </MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Stok Durumu" value={stokFilter} onChange={(e) => setStokFilter(e.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="var">Stokta Var</MenuItem>
            <MenuItem value="biten">Stok Biten</MenuItem>
          </TextField>
        </Box>
      </Paper>

      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filteredStoklar.length === 0 && <Alert severity="info">Kayıt yok</Alert>}
          {filteredStoklar.map((s) => (
            <Paper key={s.id} sx={{ p: 1.5, bgcolor: (s.mevcut || 0) <= 0 ? '#F6DAD7' : '#fff' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {s.stok_adi}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: (s.mevcut || 0) <= 0 ? 'red' : 'green' }}>
                  Mevcut: {s.mevcut || 0}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {s.stok_kodu || '-'} • {s.marka || '-'} • {s.kategori || '-'}
                {s.beden ? ` • ${s.beden}` : ''}
                {s.renk ? ` • ${s.renk}` : ''}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                <Typography variant="body2">
                  Alış: <strong>{sayiYaz(s.alis_fiyati)} ₺</strong>
                </Typography>
                <Typography variant="body2">
                  Satış: <strong>{sayiYaz(s.satis_fiyati)} ₺</strong>
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                <IslemDugmesi tur="yaz" onClick={() => stokEtiketiYazdir(s)} title="Etiket Yazdır" />
                <IslemDugmesi tur="duz" onClick={() => openDialog(s)} />
                <IslemDugmesi tur="sil" onClick={() => handleDelete(s.id)} />
              </Box>
            </Paper>
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Stok Kodu', 'Stok Adı', 'Marka', 'Kategori', 'Beden', 'Renk', 'Alış (₺)', 'Satış (₺)', 'Mevcut', 'İşlemler'].map((h) => (
                  <TableCell key={h}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStoklar.map((s) => (
                <TableRow key={s.id} hover sx={{ bgcolor: (s.mevcut || 0) <= 0 ? '#F6DAD7' : 'inherit' }}>
                  <TableCell>{s.stok_kodu || '-'}</TableCell>
                  <TableCell>{s.stok_adi}</TableCell>
                  <TableCell>{s.marka || '-'}</TableCell>
                  <TableCell>{s.kategori || '-'}</TableCell>
                  <TableCell>{s.beden || '-'}</TableCell>
                  <TableCell>{s.renk || '-'}</TableCell>
                  <TableCell>{sayiYaz(s.alis_fiyati)}</TableCell>
                  <TableCell>{sayiYaz(s.satis_fiyati)}</TableCell>
                  <TableCell>
                    <MevcutStok adet={s.mevcut} />
                  </TableCell>
                  <TableCell>
                    <IslemDugmesi tur="yaz" onClick={() => stokEtiketiYazdir(s)} title="Etiket Yazdır" />
                    <IslemDugmesi tur="duz" onClick={() => openDialog(s)} />
                    <IslemDugmesi tur="sil" onClick={() => handleDelete(s.id)} />
                  </TableCell>
                </TableRow>
              ))}
              {filteredStoklar.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    Kayıt yok
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Stok Ekle/Düzenle Dialog */}
      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, data: null })} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogBasligi ikon={<InventoryIcon />} baslik={dialog.data ? 'Stok Düzenle' : 'Yeni Stok'} />
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Stok Kodu" value={formData.stok_kodu} onChange={(e) => setFormData({ ...formData, stok_kodu: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Stok Adı"
                value={formData.stok_adi}
                onChange={(e) => setFormData({ ...formData, stok_adi: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Marka" value={formData.marka} onChange={(e) => setFormData({ ...formData, marka: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="Alış Fiyatı"
                type="number"
                value={formData.alis_fiyati}
                onChange={(e) => setFormData({ ...formData, alis_fiyati: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="Satış Fiyatı"
                type="number"
                value={formData.satis_fiyati}
                onChange={(e) => setFormData({ ...formData, satis_fiyati: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="Giren Miktar"
                type="number"
                value={formData.giren_miktar}
                onChange={(e) => setFormData({ ...formData, giren_miktar: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="Platform"
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                placeholder="Örn: Trendyol, Hepsiburada"
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField select fullWidth label="Kategori" value={formData.kategori} onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}>
                <MenuItem value="">Kategori Yok</MenuItem>
                {KATEGORI_OPTIONS.map((k) => (
                  <MenuItem key={k} value={k}>
                    {k}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField select fullWidth label="Beden" value={formData.beden} onChange={(e) => setFormData({ ...formData, beden: e.target.value })}>
                <MenuItem value="">Beden Yok</MenuItem>
                {BEDEN_OPTIONS.map((b) => (
                  <MenuItem key={b} value={b}>
                    {b}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="Renk"
                value={formData.renk}
                onChange={(e) => setFormData({ ...formData, renk: e.target.value })}
                placeholder="Opsiyonel"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, data: null })}>İptal</Button>
          <Button startIcon={<PrintIcon />} onClick={() => stokEtiketiYazdir(formData)} disabled={!formData.stok_kodu}>
            Etiket Yazdır
          </Button>
          <Button variant="contained" onClick={handleSave}>
            {dialog.data ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toplu İçe Aktarma */}
      <Dialog open={importDialog} onClose={() => setImportDialog(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogBasligi ikon={<UploadIcon />} baslik={'Toplu Stok İçe Aktar'} />
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Her satıra bir ürün girin (Tab ile ayırın): Stok Kodu, Stok Adı, Alış Fiyatı, Satış Fiyatı, Miktar
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField fullWidth multiline rows={10} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="AKS001	Ayna	Aksesuar	50	100	20" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialog(false)}>İptal</Button>
          <Button variant="contained" onClick={handleImport}>
            İçe Aktar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AksesuarStok;
