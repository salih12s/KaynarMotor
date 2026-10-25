import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  InputAdornment,
  Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import { useKarGor } from '../../../auth/AuthContext';
import { sayiYaz } from '../../../../shared/utils/bicim';
import { BolumBasligi, IslemDugmesi } from '../../../../shared/ui';
import { MENU_RENK, RENK } from '../../../../app/tokenlar';
import type { IsEmriFormuDurumu } from '../useIsEmriFormu';

const kesikKutu = { borderStyle: 'dashed', borderColor: RENK.cizgiKesik };

// Parçalar ve işçilik: stok araması/barkod, ekleme ve parça tablosu (kâr sütunu yalnızca karGor için).
type ParcaBolumuProps = Pick<
  IsEmriFormuDurumu,
  'parcalar' | 'newParca' | 'setNewParca' | 'stokOptions' | 'addParca' | 'removeParca' | 'handleStokSearch' | 'selectStok' | 'handleParcaKeyDown'
> & { isMobile: boolean };

const ParcaBolumu = ({
  parcalar,
  newParca,
  setNewParca,
  stokOptions,
  addParca,
  removeParca,
  handleStokSearch,
  selectStok,
  handleParcaKeyDown,
  isMobile,
}: ParcaBolumuProps) => {
  const karGor = useKarGor();
  return (
    <>
      <BolumBasligi
        ikon={<SettingsIcon />}
        renk={MENU_RENK.aksesuar}
        sag={
          <Box
            component="span"
            sx={{ px: 1.25, py: 0.25, borderRadius: '999px', border: `1.5px solid ${RENK.alanCizgi}`, fontSize: 13, fontWeight: 600, color: RENK.soluk }}
          >
            {parcalar.length} parça
          </Box>
        }
      >
        Parçalar ve İşçilik
      </BolumBasligi>
      <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: RENK.yuzeyKoyu, ...kesikKutu }}>
        <Autocomplete
          freeSolo
          options={stokOptions}
          filterOptions={(x) => x}
          groupBy={(o) => o.stok_kaynak || ''}
          inputValue={newParca.takilan_parca}
          getOptionLabel={(o) => (typeof o === 'string' ? o : o.stok_adi || '')}
          onInputChange={(e, v, reason) => {
            if (reason === 'reset') return;
            setNewParca((prev) => ({ ...prev, takilan_parca: v, parca_kodu: '' }));
            handleStokSearch(v);
          }}
          onChange={(e, v) => {
            if (v && typeof v === 'object') selectStok(v);
          }}
          renderOption={(props, o) => (
            <Box component="li" {...props} key={`${o.stok_kaynak}-${o.id}`}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="body2" fontWeight="bold">
                  {o.stok_adi}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Kod: {o.stok_kodu} • Stok: {o.mevcut ?? 0} • Satış: ₺{sayiYaz(o.satis_fiyati)}
                </Typography>
              </Box>
            </Box>
          )}
          renderInput={(params) => <TextField {...params} size="small" label="Takılan Parça / İşçilik (ara veya barkod okut)" onKeyDown={handleParcaKeyDown} />}
          sx={{ mb: 1.5 }}
        />
        {newParca.parca_kodu && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Stok kodu: <strong>{newParca.parca_kodu}</strong>
          </Typography>
        )}
        <Grid container spacing={2}>
          <Grid size={{ xs: 4 }}>
            <TextField
              fullWidth
              size="small"
              label="Adet"
              type="number"
              value={newParca.adet}
              onChange={(e) => setNewParca({ ...newParca, adet: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField
              fullWidth
              size="small"
              label="Satış Fiyatı (₺)"
              type="number"
              value={newParca.birim_fiyat}
              onChange={(e) => setNewParca({ ...newParca, birim_fiyat: e.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start">₺</InputAdornment> }}
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField
              fullWidth
              size="small"
              label="Maliyet Fiyatı (₺)"
              type="number"
              value={newParca.maliyet}
              onChange={(e) => setNewParca({ ...newParca, maliyet: e.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start">₺</InputAdornment> }}
            />
          </Grid>
        </Grid>
        <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={addParca} sx={{ mt: 1.5 }}>
          Parça Ekle
        </Button>
      </Paper>

      {parcalar.length > 0 ? (
        isMobile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {parcalar.map((p, i) => {
              const pSatis = (Number(p.adet) || 0) * (Number(p.birim_fiyat) || 0);
              const pMaliyet = (Number(p.adet) || 0) * (Number(p.maliyet) || 0);
              const pKar = pSatis - pMaliyet;
              return (
                <Paper key={i} variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {p.takilan_parca}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Adet: {p.adet} • Satış: ₺{sayiYaz(pSatis)} • Maliyet: ₺{sayiYaz(pMaliyet)}
                    </Typography>
                    {karGor && (
                      <Typography variant="caption" sx={{ display: 'block', color: pKar >= 0 ? RENK.yesil : RENK.kirmizi, fontWeight: 'bold' }}>
                        Kâr: ₺{sayiYaz(pKar)}
                      </Typography>
                    )}
                  </Box>
                  <IslemDugmesi tur="carpi" etiket="Parçayı çıkar" onClick={() => removeParca(i)} />
                </Paper>
              );
            })}
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Parça</TableCell>
                  <TableCell align="center">Adet</TableCell>
                  <TableCell align="right">Satış</TableCell>
                  <TableCell align="right">Maliyet</TableCell>
                  {karGor && <TableCell align="right">Kâr</TableCell>}
                  <TableCell align="center">Sil</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parcalar.map((p, i) => {
                  const pSatis = (Number(p.adet) || 0) * (Number(p.birim_fiyat) || 0);
                  const pMaliyet = (Number(p.adet) || 0) * (Number(p.maliyet) || 0);
                  const pKar = pSatis - pMaliyet;
                  return (
                    <TableRow key={i}>
                      <TableCell>{p.takilan_parca}</TableCell>
                      <TableCell align="center">{p.adet}</TableCell>
                      <TableCell align="right">₺{sayiYaz(pSatis)}</TableCell>
                      <TableCell align="right">₺{sayiYaz(pMaliyet)}</TableCell>
                      {karGor && (
                        <TableCell align="right" sx={{ color: pKar >= 0 ? RENK.yesil : RENK.kirmizi, fontWeight: 'bold' }}>
                          ₺{sayiYaz(pKar)}
                        </TableCell>
                      )}
                      <TableCell align="center">
                        <IslemDugmesi tur="carpi" etiket="Parçayı çıkar" onClick={() => removeParca(i)} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )
      ) : (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary', mb: 2, ...kesikKutu }}>
          Henüz parça eklenmedi
        </Paper>
      )}
    </>
  );
};

export default ParcaBolumu;
