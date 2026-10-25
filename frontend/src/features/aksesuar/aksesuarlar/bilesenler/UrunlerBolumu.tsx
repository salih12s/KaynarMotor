import React from 'react';
import { IslemDugmesi } from '../../../../shared/ui';
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
  Grid,
  InputAdornment,
  Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import ScannerIcon from '@mui/icons-material/QrCodeScanner';
import { sayiYaz } from '../../../../shared/utils/bicim';
import type { AksesuarlarDurumu } from '../useAksesuarlar';

// Satış formu: ürün satırları (stoktan seçim, adet/maliyet/satış), barkod okutma; dar ekranda kartlar, geniş ekranda tablo.
const UrunlerBolumu = ({ a, isMobile }: { a: AksesuarlarDurumu; isMobile: boolean }) => {
  const { addParca, barkodInput, setBarkodInput, handleBarkodScan, parcalar, stokOptions, stokDegeri, secStok, updateParca, removeParca } = a;
  return (
    <>
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Ürünler</Typography>
        <Button startIcon={<AddIcon />} onClick={addParca} size="small" variant="outlined">
          Ürün Ekle
        </Button>
      </Box>
      <TextField
        fullWidth
        size="small"
        value={barkodInput}
        onChange={(e) => setBarkodInput(e.target.value)}
        onKeyDown={handleBarkodScan}
        placeholder="Barkod okutun veya stok kodu girip Enter'a basın"
        autoComplete="off"
        sx={{ mt: 1 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <ScannerIcon color="action" />
            </InputAdornment>
          ),
        }}
      />
      {parcalar.length > 0 &&
        (isMobile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            {parcalar.map((p, i) => (
              <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Ürün #{i + 1}
                  </Typography>
                  <IslemDugmesi tur="sil" onClick={() => removeParca(i)} />
                </Box>
                <Autocomplete
                  size="small"
                  options={stokOptions}
                  getOptionLabel={(option) => (typeof option === 'string' ? option : `${option.stok_adi} (Stok: ${option.mevcut})`)}
                  value={stokDegeri(p)}
                  onChange={(_, newValue) => secStok(i, newValue)}
                  renderInput={(params) => <TextField {...params} placeholder="Ürün ara..." label="Ürün" />}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  sx={{ mb: 1 }}
                />
                <Grid container spacing={1}>
                  <Grid size={4}>
                    <TextField fullWidth size="small" type="number" label="Adet" value={p.adet} onChange={(e) => updateParca(i, 'adet', e.target.value)} />
                  </Grid>
                  <Grid size={4}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Maliyet"
                      value={p.maliyet}
                      onChange={(e) => updateParca(i, 'maliyet', e.target.value)}
                    />
                  </Grid>
                  <Grid size={4}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Satış"
                      value={p.satis_fiyati}
                      onChange={(e) => updateParca(i, 'satis_fiyati', e.target.value)}
                    />
                  </Grid>
                </Grid>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Toplam: {sayiYaz((Number(p.adet) || 0) * (Number(p.satis_fiyati) || 0))} ₺
                </Typography>
              </Paper>
            ))}
          </Box>
        ) : (
          <TableContainer sx={{ mt: 1, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Ürün', 'Adet', 'Maliyet (₺)', 'Satış Fiyatı (₺)', 'Toplam', ''].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 'bold' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {parcalar.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Autocomplete
                        size="small"
                        options={stokOptions}
                        getOptionLabel={(option) => (typeof option === 'string' ? option : `${option.stok_adi} (Stok: ${option.mevcut})`)}
                        value={stokDegeri(p)}
                        onChange={(_, newValue) => secStok(i, newValue)}
                        renderInput={(params) => <TextField {...params} placeholder="Ürün ara..." />}
                        sx={{ minWidth: 200 }}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={p.adet} onChange={(e) => updateParca(i, 'adet', e.target.value)} sx={{ width: 80 }} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={p.maliyet} onChange={(e) => updateParca(i, 'maliyet', e.target.value)} sx={{ width: 100 }} />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={p.satis_fiyati}
                        onChange={(e) => updateParca(i, 'satis_fiyati', e.target.value)}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                    <TableCell>{sayiYaz((Number(p.adet) || 0) * (Number(p.satis_fiyati) || 0))} ₺</TableCell>
                    <TableCell>
                      <IslemDugmesi tur="sil" onClick={() => removeParca(i)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ))}
    </>
  );
};

export default UrunlerBolumu;
