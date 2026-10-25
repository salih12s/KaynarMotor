import React from 'react';
import { stokEtiketiYazdir } from '../../shared/utils/stokEtiketi';
import AyarIkon from '@mui/icons-material/SettingsOutlined';
import { IslemDugmesi, OzetSeridi, DialogBasligi, MevcutStok } from '../../shared/ui';
import { useStokYonetimi } from '../../shared/stok/useStokYonetimi';
import StokIceAktarPenceresi from '../../shared/stok/StokIceAktarPenceresi';
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
import { yedekParcaStokService } from './yedekParcaApi';
import { sayiYaz } from '../../shared/utils/bicim';
import type { YedekParcaStok as YedekParcaStokKaydi } from '../../shared/tipler';

/** Stok ekleme/düzenleme formu: sayısal alanlar yazılırken metin, kayıttan gelirken sayı olabilir. */
interface StokFormu {
  stok_kodu: string;
  stok_adi: string;
  marka: string;
  alis_fiyati: string | number;
  satis_fiyati: string | number;
  giren_miktar: string | number;
}

// Kayıtlı stoktan düzenleme formu
const kayittanForm = (stok: YedekParcaStokKaydi): StokFormu => ({
  stok_kodu: stok.stok_kodu || '',
  stok_adi: stok.stok_adi || '',
  marka: stok.marka || '',
  alis_fiyati: stok.alis_fiyati || '',
  satis_fiyati: stok.satis_fiyati || '',
  giren_miktar: stok.giren_miktar || 0,
});

// Yeni stok formu (stok kodu sunucudan önerilir)
const yeniForm = (stokKodu: string): StokFormu => ({ stok_kodu: stokKodu, stok_adi: '', marka: '', alis_fiyati: '', satis_fiyati: '', giren_miktar: 0 });

const YedekParcaStok = () => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const {
    filteredStoklar,
    totalUrun,
    envanter,
    dialog,
    openDialog,
    closeDialog,
    formData,
    setFormData,
    handleSave,
    handleDelete,
    importDialog,
    setImportDialog,
    importText,
    setImportText,
    handleImport,
    error,
    search,
    setSearch,
    stokFilter,
    setStokFilter,
  } = useStokYonetimi<YedekParcaStokKaydi, StokFormu>({ servis: yedekParcaStokService, kayittanForm, yeniForm });

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
                {s.stok_kodu || '-'} • {s.marka || '-'}
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
                {['Stok Kodu', 'Stok Adı', 'Marka', 'Alış (₺)', 'Satış (₺)', 'Mevcut', 'İşlemler'].map((h) => (
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
                  <TableCell colSpan={7} align="center">
                    Kayıt yok
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Stok Ekle/Düzenle Dialog */}
      <Dialog open={dialog.open} onClose={closeDialog} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogBasligi ikon={<AyarIkon />} baslik={dialog.data ? 'Stok Düzenle' : 'Yeni Yedek Parça Stoğu'} />
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Stok Kodu (Barkod)"
                value={formData.stok_kodu}
                onChange={(e) => setFormData({ ...formData, stok_kodu: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Ürün Adı"
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>İptal</Button>
          <Button startIcon={<PrintIcon />} onClick={() => stokEtiketiYazdir(formData)} disabled={!formData.stok_kodu}>
            Etiket Yazdır
          </Button>
          <Button variant="contained" onClick={handleSave}>
            {dialog.data ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      <StokIceAktarPenceresi
        acik={importDialog}
        kapat={() => setImportDialog(false)}
        metin={importText}
        setMetin={setImportText}
        hata={error}
        aktar={handleImport}
        isMobile={isMobile}
        ornekSatir={'9000000000001\tFren Balatası\t250\t400\t10'}
        sutunlar="Stok Kodu, Ürün Adı, Alış Fiyatı, Satış Fiyatı, Miktar"
      />
    </Box>
  );
};

export default YedekParcaStok;
