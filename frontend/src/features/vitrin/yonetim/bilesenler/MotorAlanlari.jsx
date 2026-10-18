import React from 'react';
import { Box, Typography, TextField, Chip, Stack, Autocomplete, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { BelgeBolumu } from '../../../motor/SatisBelgeleri';
import { MOTOR_DURUMLARI } from '../../vitrinSabitleri';

// Motor ilanına özel alanlar: durum (sıfır/ikinci el), stoktan seçim, marka/model/yıl/cc/km, segment, hasar kaydı ve belgeler.
const MotorAlanlari = ({ f, stokMotorlar, segmentler }) => {
  const { form, setForm, secStokMotor } = f;
  return (
    <>
      {/* Sıfır / İkinci El — sitede ilan seçilen sayfada listelenir */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.75 }}>Motor Durumu</Typography>
        <ToggleButtonGroup exclusive fullWidth color="error" value={form.motor_durumu}
          onChange={(e, val) => {
            if (!val) return;
            setForm(f => ({ ...f, motor_durumu: val }));
          }}>
          {MOTOR_DURUMLARI.map(d => <ToggleButton key={d.key} value={d.key} sx={{ fontWeight: 700 }}>{d.label}</ToggleButton>)}
        </ToggleButtonGroup>
        <Typography variant="caption" color="text.secondary">Sitede müşteri "{form.motor_durumu === 'sifir' ? 'Sıfır' : 'İkinci El'}" seçtiğinde bu ilan listelenir.</Typography>
      </Box>
      {/* Stoktan motor seç — temel bilgiler otomatik gelsin (sıfır ve ikinci el) */}
      <Autocomplete
        options={stokMotorlar}
        getOptionLabel={(m) => `${m.plaka || '—'} • ${[m.marka, m.model, m.yil].filter(Boolean).join(' ')}`.trim()}
        isOptionEqualToValue={(o, v) => o.id === v.id}
        value={stokMotorlar.find(m => m.id === form.stok_motor_id) || null}
        onChange={(e, val) => secStokMotor(val)}
        renderInput={(params) => (
          <TextField {...params} label="Stoktan Motor Seç (opsiyonel)"
            helperText="Seçersen marka, model, yıl, km ve ilan fiyatı stoktan otomatik gelir; sen sadece site bilgilerini düzenlersin." />
        )}
      />
      {form.stok_motor_id && (
        <Chip label="Stoktan bağlandı — temel bilgiler stoktan geliyor" color="success" variant="outlined"
          onDelete={() => setForm(f => ({ ...f, stok_motor_id: null }))} sx={{ alignSelf: 'flex-start' }} />
      )}
      <Stack direction="row" spacing={2}>
        <TextField label="Marka" value={form.marka} onChange={e => setForm({ ...form, marka: e.target.value })} fullWidth
          helperText="Sitede marka filtresinde görünür" />
        <TextField label="Model" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} fullWidth />
      </Stack>
      <Stack direction="row" spacing={2}>
        <TextField label="Yıl" type="number" value={form.yil} onChange={e => setForm({ ...form, yil: e.target.value })} fullWidth />
        <TextField label="Motor (cc)" type="number" value={form.motor_cc} onChange={e => setForm({ ...form, motor_cc: e.target.value })} fullWidth />
        <TextField label="KM" type="number" value={form.km} onChange={e => setForm({ ...form, km: e.target.value })} fullWidth />
      </Stack>
      <Autocomplete freeSolo options={segmentler} value={form.segment || null}
        onChange={(e, val) => setForm({ ...form, segment: val || '' })}
        onInputChange={(e, val) => setForm({ ...form, segment: val })}
        renderInput={(params) => (
          <TextField {...params} label="Segment" required
            helperText="Listeden seçin veya yeni segment yazın" />
        )}
      />
      <TextField label="Hasar Kaydı" value={form.hasar_kaydi} onChange={e => setForm({ ...form, hasar_kaydi: e.target.value })} fullWidth
        placeholder="Örn: Hasar kaydı yok / Değişen: ön kaput" helperText="İlan detayında özellikler arasında gösterilir" />
      {/* Belgeler stoktaki motora bağlıdır (ruhsat, sözleşme vb.); ilan bir stok motoruna bağlıysa eklenebilir */}
      {form.stok_motor_id ? (
        <Box sx={{ mt: -1.5 }}>
          <BelgeBolumu key={form.stok_motor_id} motorId={form.stok_motor_id} />
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary">
          Belge eklemek için yukarıdan "Stoktan Motor Seç" ile ilanı bir stok motoruna bağlayın.
        </Typography>
      )}
    </>
  );
};

export default MotorAlanlari;
