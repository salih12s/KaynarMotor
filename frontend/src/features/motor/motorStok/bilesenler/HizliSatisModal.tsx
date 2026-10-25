import React from 'react';
import GroupIcon from '@mui/icons-material/GroupOutlined';
import PersonIcon from '@mui/icons-material/PersonOutline';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCartOutlined';
import { MENU_RENK, RENK, TON } from '../../../../app/tokenlar';
import { Button, TextField, Dialog, DialogContent, DialogActions, Alert, Grid, InputAdornment, Autocomplete } from '@mui/material';
import { DialogBasligi, BolumBasligi } from '../../../../shared/ui';
import { BelgeBolumu } from '../../SatisBelgeleri';
import OdemeDagilimi from './OdemeDagilimi';
import KarOnizleme from './KarOnizleme';
import type { HizliSatisDurumuVeIslemleri } from '../useHizliSatis';
import type { MotorYetkileri } from '../yetkiler';
import type { MusteriAramasi } from '../useMusteriAra';

// Hızlı satış penceresi: satış ve alıcı bilgileri, parçalı ödeme, (admin için) kâr önizlemesi ve belgeler.
interface HizliSatisModalProps {
  hs: HizliSatisDurumuVeIslemleri;
  perms: MotorYetkileri;
  musteri: MusteriAramasi;
  isMobile: boolean;
}

const HizliSatisModal = ({ hs, perms, musteri, isMobile }: HizliSatisModalProps) => {
  const { hizliSatis, kapat, hizliForm, setHizliForm, satisKaydediliyor, handleHizliSatis } = hs;
  const { musteriOptions, searchMusteri } = musteri;
  const { canKar } = perms;
  return (
    <Dialog open={hizliSatis.open} onClose={kapat} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogBasligi
        baslik={<>Hızlı Satış {hizliSatis.motor && `- ${hizliSatis.motor.plaka} ${hizliSatis.motor.marka || ''} ${hizliSatis.motor.model || ''}`}</>}
        onKapat={kapat}
      />
      <DialogContent>
        {hizliSatis.motor?.yatirimci_id && (
          <Alert severity="info" sx={{ mt: 1 }}>
            Bu motor bir yatırımcıya ait. Aşağıdan yatırımcı kârını tutar olarak girin; kalan işletme kârıdır.
          </Alert>
        )}
        <BolumBasligi ikon={<ShoppingCartIcon />} renk={MENU_RENK.aksesuar} sx={{ mt: 2 }}>
          Satış Bilgileri
        </BolumBasligi>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="Satış Fiyatı (₺)"
              type="number"
              value={hizliForm.satis_fiyati}
              onChange={(e) => setHizliForm({ ...hizliForm, satis_fiyati: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="Noter Satış (₺)"
              type="number"
              value={hizliForm.noter_satis}
              onChange={(e) => setHizliForm({ ...hizliForm, noter_satis: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="Masraflar (₺)"
              type="number"
              value={hizliForm.masraflar}
              onChange={(e) => setHizliForm({ ...hizliForm, masraflar: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Yevmiye No" value={hizliForm.yevmiye_no} onChange={(e) => setHizliForm({ ...hizliForm, yevmiye_no: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Satış Tarihi"
              type="date"
              value={hizliForm.satis_tarihi}
              onChange={(e) => setHizliForm({ ...hizliForm, satis_tarihi: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
        <BolumBasligi ikon={<PersonIcon />} renk={RENK.mavi} sx={{ mt: 3 }}>
          Alıcı Bilgileri
        </BolumBasligi>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Autocomplete
              freeSolo
              options={musteriOptions}
              getOptionLabel={(o) => (typeof o === 'string' ? o : o.ad_soyad || '')}
              inputValue={hizliForm.alici_adi}
              onInputChange={(e, val) => {
                setHizliForm({ ...hizliForm, alici_adi: val });
                searchMusteri(val);
              }}
              onChange={(e, val) => {
                if (val && typeof val === 'object') {
                  setHizliForm({
                    ...hizliForm,
                    alici_adi: val.ad_soyad || '',
                    alici_telefon: val.telefon || hizliForm.alici_telefon,
                    alici_adres: val.adres || hizliForm.alici_adres,
                  });
                }
              }}
              renderInput={(params) => <TextField {...params} fullWidth label="Ad Soyad" />}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="TC No" value={hizliForm.alici_tc} onChange={(e) => setHizliForm({ ...hizliForm, alici_tc: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Telefon"
              value={hizliForm.alici_telefon}
              onChange={(e) => setHizliForm({ ...hizliForm, alici_telefon: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Adres" value={hizliForm.alici_adres} onChange={(e) => setHizliForm({ ...hizliForm, alici_adres: e.target.value })} />
          </Grid>
        </Grid>

        <OdemeDagilimi hs={hs} />

        {hizliSatis.motor?.yatirimci_id && canKar && (
          <>
            <BolumBasligi ikon={<GroupIcon />} renk={RENK.mavi} sx={{ mt: 3 }}>
              Yatırımcı
            </BolumBasligi>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Yatırımcı Kârı (₺)"
                  type="number"
                  value={hizliForm.yatirimci_kar}
                  onChange={(e) => setHizliForm({ ...hizliForm, yatirimci_kar: e.target.value })}
                  helperText="Yatırımcıya verilecek tutar. Kalanı işletme (sizin) kârınızdır."
                  sx={{ '& .MuiInputBase-root': { bgcolor: TON.mavi.bg } }}
                  InputProps={{ startAdornment: <InputAdornment position="start">₺</InputAdornment> }}
                />
              </Grid>
            </Grid>
          </>
        )}

        <KarOnizleme hs={hs} canKar={canKar} />

        {/* Belgeler motora bağlıdır: stokta eklenenler burada da görünür, burada eklenenler motorda kalır */}
        {hizliSatis.motor && <BelgeBolumu key={hizliSatis.motor.id} motorId={hizliSatis.motor.id} />}
      </DialogContent>
      <DialogActions>
        <Button onClick={kapat} disabled={satisKaydediliyor}>
          İptal
        </Button>
        <Button variant="contained" onClick={handleHizliSatis} disabled={satisKaydediliyor} sx={{ bgcolor: RENK.yesil, '&:hover': { bgcolor: RENK.yesil } }}>
          {satisKaydediliyor ? 'Kaydediliyor…' : 'Satışı Tamamla'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HizliSatisModal;
