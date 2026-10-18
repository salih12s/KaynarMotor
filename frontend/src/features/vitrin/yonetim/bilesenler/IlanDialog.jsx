import React from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Switch, FormControlLabel, Stack, CircularProgress, Autocomplete } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import MotorAlanlari from './MotorAlanlari';
import VideoAlani from './VideoAlani';
import GorselYonetimi from './GorselYonetimi';

// İlan ekleme/düzenleme penceresi. Durum ve işlemler useIlanFormu hook'undan gelir (f).
const IlanDialog = ({ f, aktifKategori, isMotor, isAksesuar, isAdmin, stokMotorlar, stokAksesuarlar, segmentler, videoLimitMb }) => {
  const {
    dlgOpen, kapat, form, setForm, editId, saving, secStokAksesuar, handleSave,
  } = f;
  return (
    <Dialog open={dlgOpen} onClose={kapat} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {editId ? 'İlanı Düzenle' : 'Yeni İlan'} — {aktifKategori.label}
        <IconButton onClick={kapat}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {/* Aksesuar: stoktan seçip bilgileri otomatik doldur */}
          {isAksesuar && (
            <Autocomplete
              options={stokAksesuarlar}
              getOptionLabel={(a) => `${a.stok_adi || ''}${a.marka ? ' • ' + a.marka : ''}${a.satis_fiyati ? ' — ₺' + Number(a.satis_fiyati).toLocaleString('tr-TR') : ''}`.trim()}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              onChange={(e, val) => secStokAksesuar(val)}
              renderInput={(params) => (
                <TextField {...params} label="Stoktan Aksesuar Seç (opsiyonel)"
                  helperText="Aksesuar stoğundan seçersen başlık ve fiyat otomatik gelir." />
              )}
            />
          )}
          <TextField label="Başlık" value={form.baslik} onChange={e => setForm({ ...form, baslik: e.target.value })} fullWidth required />
          <TextField label="Açıklama" value={form.aciklama} onChange={e => setForm({ ...form, aciklama: e.target.value })} fullWidth multiline minRows={2} />
          <TextField label="Fiyat (₺)" type="number" value={form.fiyat} onChange={e => setForm({ ...form, fiyat: e.target.value })} fullWidth />

          {isAksesuar && (
            <TextField label="Marka" value={form.marka} onChange={e => setForm({ ...form, marka: e.target.value })} fullWidth />
          )}

          {isMotor && <MotorAlanlari f={f} stokMotorlar={stokMotorlar} segmentler={segmentler} />}

          {/* Video: kendi dosyanı yükle (DB'de tutulur, akıcı oynatılır) */}
          <VideoAlani f={f} videoLimitMb={videoLimitMb} />

          <TextField label="veya YouTube / dış video linki (opsiyonel)" value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} fullWidth placeholder="https://..." />

          <TextField label="Rubik Ödeme Linki (opsiyonel)" value={form.rubik_link} onChange={e => setForm({ ...form, rubik_link: e.target.value })} fullWidth placeholder="https://..."
            helperText='Rubik panelinden oluşturduğun ödeme linkini yapıştır. Girilirse ilan detayında müşteriye "Taksitli Ödeme Yap" butonu çıkar.' />

          {/* Görseller */}
          <GorselYonetimi f={f} />

          <Stack direction="row" spacing={2} flexWrap="wrap">
            <FormControlLabel
              control={<Switch checked={form.yayinda} disabled={!isAdmin} onChange={e => setForm({ ...form, yayinda: e.target.checked })} />}
              label={isAdmin ? 'Sitede yayınla' : 'Sitede yayınla (yalnızca yönetici değiştirebilir)'}
            />
            <FormControlLabel
              control={<Switch color="warning" checked={!!form.one_cikan} onChange={e => setForm({ ...form, one_cikan: e.target.checked })} />}
              label="Öne çıkar"
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={kapat}>İptal</Button>
        <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} onClick={handleSave} disabled={saving}>
          Kaydet
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IlanDialog;
