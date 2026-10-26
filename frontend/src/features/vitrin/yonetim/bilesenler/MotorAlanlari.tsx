import React from 'react';
import type { Motor, SifirMotor } from '../../../../shared/tipler';
import type { IlanFormuDurumu } from '../useIlanFormu';
import { RENK } from '../../../../app/tokenlar';
import { Box, Typography, TextField, Chip, Stack, Autocomplete, ToggleButton, ToggleButtonGroup, CircularProgress } from '@mui/material';
import { sayiYaz } from '../../../../shared/utils/bicim';
import { sifirAdi } from '../../../motor/sifirMotor/sifirVeri';
import { BelgeBolumu } from '../../../motor/SatisBelgeleri';
import { MOTOR_DURUMLARI } from '../../vitrinSabitleri';

// Motor ilanına özel alanlar: durum (sıfır/ikinci el), stoktan seçim (ikinci el stok ya da sıfır stok), marka/model/yıl/cc/km,
// segment, hasar kaydı ve belgeler.
interface MotorAlanlariProps {
  f: IlanFormuDurumu;
  stokMotorlar: Motor[];
  sifirModeller: SifirMotor[];
  segmentler: string[];
}

const MotorAlanlari = ({ f, stokMotorlar, sifirModeller, segmentler }: MotorAlanlariProps) => {
  const { form, setForm, secStokMotor, secSifirMotor, sifirGorselYukleniyor } = f;
  const sifir = form.motor_durumu === 'sifir';
  return (
    <>
      {/* Sıfır / İkinci El — sitede ilan seçilen sayfada listelenir */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
          Motor Durumu
        </Typography>
        <ToggleButtonGroup
          exclusive
          fullWidth
          value={form.motor_durumu}
          sx={{
            bgcolor: RENK.yuzey,
            '& .MuiToggleButton-root': {
              textTransform: 'none',
              color: RENK.soluk,
              borderColor: RENK.alanCizgi,
              '&.Mui-selected, &.Mui-selected:hover': { bgcolor: RENK.murekkep, color: '#fff' },
            },
          }}
          onChange={(e, val: string | null) => {
            if (!val) return;
            // İkinci ele geçince sıfır stok bağlantısı kalkar (sunucu da yalnızca sıfır ilanda saklar)
            setForm((f) => ({ ...f, motor_durumu: val, sifir_motor_id: val === 'sifir' ? f.sifir_motor_id : null }));
          }}
        >
          {MOTOR_DURUMLARI.map((d) => (
            <ToggleButton key={d.key} value={d.key} sx={{ fontWeight: 700 }}>
              {d.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Typography variant="caption" color="text.secondary">
          Sitede müşteri "{form.motor_durumu === 'sifir' ? 'Sıfır' : 'İkinci El'}" seçtiğinde bu ilan listelenir.
        </Typography>
      </Box>
      {/* Sıfır ilan: sıfır stoktan model seç — bilgiler, fiyat ve fotoğraflar stoktan gelir */}
      {sifir && (
        <Autocomplete
          options={sifirModeller}
          getOptionLabel={(m) => sifirAdi(m)}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          value={sifirModeller.find((m) => m.id === form.sifir_motor_id) || null}
          onChange={(e, val) => void secSifirMotor(val)}
          renderOption={(props, m) => (
            <li {...props} key={m.id}>
              <Typography component="span" sx={{ flex: 1 }}>
                {sifirAdi(m)}
              </Typography>
              <Typography component="span" variant="body2" sx={{ color: RENK.soluk, ml: 2 }}>
                {m.gorsel_sayisi ? `${m.gorsel_sayisi} fotoğraf • ` : ''}₺{sayiYaz(m.liste_fiyati)}
              </Typography>
            </li>
          )}
          noOptionsText="Sıfır stokta model yok. Önce Motor Stok > Sıfır sekmesinden ekleyin."
          renderInput={(params) => (
            <TextField
              {...params}
              label="Sıfır Stoktan Seç"
              helperText="Seçersen marka, model, fiyat, açıklama ve fotoğraflar sıfır stoktan gelir; stokta fiyat değişince ilan fiyatı da değişir."
            />
          )}
        />
      )}
      {sifirGorselYukleniyor && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: RENK.soluk }}>
          <CircularProgress size={16} />
          <Typography variant="body2">Fotoğraflar sıfır stoktan getiriliyor…</Typography>
        </Box>
      )}
      {sifir && form.sifir_motor_id && (
        <Chip
          label="Sıfır stoktan bağlandı — fiyat stokla birlikte güncellenir"
          color="success"
          variant="outlined"
          onDelete={() => setForm((f) => ({ ...f, sifir_motor_id: null }))}
          sx={{ alignSelf: 'flex-start' }}
        />
      )}
      {/* İkinci el ilan: stoktan motor seç — temel bilgiler otomatik gelsin */}
      {!sifir && (
        <Autocomplete
          options={stokMotorlar}
          getOptionLabel={(m) => `${m.plaka || '—'} • ${[m.marka, m.model, m.yil].filter(Boolean).join(' ')}`.trim()}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          value={stokMotorlar.find((m) => m.id === form.stok_motor_id) || null}
          onChange={(e, val) => secStokMotor(val)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Stoktan Motor Seç (opsiyonel)"
              helperText="Seçersen marka, model, yıl, km ve ilan fiyatı stoktan otomatik gelir; sen sadece site bilgilerini düzenlersin."
            />
          )}
        />
      )}
      {form.stok_motor_id && (
        <Chip
          label="Stoktan bağlandı — temel bilgiler stoktan geliyor"
          color="success"
          variant="outlined"
          onDelete={() => setForm((f) => ({ ...f, stok_motor_id: null }))}
          sx={{ alignSelf: 'flex-start' }}
        />
      )}
      <Stack direction="row" spacing={2}>
        <TextField
          label="Marka"
          value={form.marka}
          onChange={(e) => setForm({ ...form, marka: e.target.value })}
          fullWidth
          helperText="Sitede marka filtresinde görünür"
        />
        <TextField label="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} fullWidth />
      </Stack>
      <Stack direction="row" spacing={2}>
        <TextField label="Yıl" type="number" value={form.yil} onChange={(e) => setForm({ ...form, yil: e.target.value })} fullWidth />
        <TextField label="Motor (cc)" type="number" value={form.motor_cc} onChange={(e) => setForm({ ...form, motor_cc: e.target.value })} fullWidth />
        <TextField label="KM" type="number" value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} fullWidth />
      </Stack>
      <Autocomplete
        freeSolo
        options={segmentler}
        value={form.segment || null}
        onChange={(e, val) => setForm({ ...form, segment: val || '' })}
        onInputChange={(e, val) => setForm({ ...form, segment: val })}
        renderInput={(params) => <TextField {...params} label="Segment" required helperText="Listeden seçin veya yeni segment yazın" />}
      />
      <TextField
        label="Hasar Kaydı"
        value={form.hasar_kaydi}
        onChange={(e) => setForm({ ...form, hasar_kaydi: e.target.value })}
        fullWidth
        placeholder="Örn: Hasar kaydı yok / Değişen: ön kaput"
        helperText="İlan detayında özellikler arasında gösterilir"
      />
      {/* Belgeler stoktaki motora bağlıdır (ruhsat, sözleşme vb.); ilan bir stok motoruna bağlıysa eklenebilir */}
      {form.stok_motor_id ? (
        <Box sx={{ mt: -1.5 }}>
          <BelgeBolumu key={form.stok_motor_id} motorId={form.stok_motor_id} />
        </Box>
      ) : sifir ? null : (
        <Typography variant="caption" color="text.secondary">
          Belge eklemek için yukarıdan "Stoktan Motor Seç" ile ilanı bir stok motoruna bağlayın.
        </Typography>
      )}
    </>
  );
};

export default MotorAlanlari;
