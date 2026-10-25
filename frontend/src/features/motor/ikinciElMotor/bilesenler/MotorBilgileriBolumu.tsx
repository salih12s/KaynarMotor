import React from 'react';
import TwoWheelerIcon from '@mui/icons-material/TwoWheelerOutlined';
import { BolumBasligi } from '../../../../shared/ui';
import { MENU_RENK } from '../../../../app/tokenlar';
import { TextField, Grid, MenuItem, Checkbox, FormControlLabel, Autocomplete } from '@mui/material';
import type { Motor } from '../../../../shared/tipler';
import type { SatisFormuDurumu } from '../useSatisFormu';

// Satış formu: motor bilgileri (plaka stoktan seçilebilir), durum, ödeme şekli, tarihler, yevmiye ve fatura.
interface MotorBilgileriBolumuProps {
  f: SatisFormuDurumu['formData'];
  setFormData: SatisFormuDurumu['setFormData'];
  stokMotorlar: Motor[];
  setSelectedStokId: SatisFormuDurumu['setSelectedStokId'];
}

const MotorBilgileriBolumu = ({ f, setFormData, stokMotorlar, setSelectedStokId }: MotorBilgileriBolumuProps) => {
  return (
    <>
      <BolumBasligi ikon={<TwoWheelerIcon />} renk={MENU_RENK.motor} sx={{ mt: 2 }}>
        Motor Bilgileri
      </BolumBasligi>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Autocomplete
            freeSolo
            options={stokMotorlar.map((m) => m.plaka)}
            // Yazılan metin (inputValue) ile "seçilmiş değer" (value) AYRI tutulur. Metin `value` olarak verilirse plaka tam yazıldığında
            // öneri zaten "seçili" sayılır ve MUI onChange'i hiç çağırmaz: stok kaydı forma dolmaz.
            value={null}
            inputValue={f.plaka}
            onInputChange={(e, val) => setFormData({ ...f, plaka: (val || '').toUpperCase() })}
            onChange={(e, val) => {
              if (val) {
                const motor = stokMotorlar.find((m) => m.plaka === val);
                if (motor) {
                  setSelectedStokId(motor.id);
                  setFormData({
                    ...f,
                    plaka: motor.plaka || '',
                    marka: motor.marka || '',
                    model: motor.model || '',
                    km: motor.km || '',
                    yil: motor.yil || '',
                    alis_fiyati: motor.alis_fiyati || '',
                    noter_alis: motor.noter_alis || '',
                    satici_adi: motor.satici_adi || '',
                    satici_tc: motor.satici_tc || '',
                    tarih: motor.tarih ? new Date(motor.tarih).toISOString().split('T')[0] : '',
                    durum: 'tamamlandi',
                    yatirimci_id: motor.yatirimci_id || '',
                    yatirimci_kar: motor.yatirimci_kar || '',
                    yatirimci_adi: motor.yatirimci_adi || '',
                  });
                } else {
                  setSelectedStokId(null);
                }
              }
            }}
            renderInput={(params) => <TextField {...params} fullWidth label="Plaka" required />}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField fullWidth label="Marka" value={f.marka} onChange={(e) => setFormData({ ...f, marka: e.target.value })} required />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField fullWidth label="Model" value={f.model} onChange={(e) => setFormData({ ...f, model: e.target.value })} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField fullWidth label="Yıl" type="number" value={f.yil} onChange={(e) => setFormData({ ...f, yil: e.target.value })} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField fullWidth label="KM" type="number" value={f.km} onChange={(e) => setFormData({ ...f, km: e.target.value })} />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            select
            fullWidth
            label="Durum"
            value={f.durum}
            onChange={(e) => setFormData({ ...f, durum: e.target.value })}
            sx={{
              '& .MuiInputBase-root': {
                bgcolor:
                  f.durum === 'tamamlandi'
                    ? '#D8EBDD'
                    : f.durum === 'kapora'
                      ? '#F7E7C4'
                      : f.durum === 'devir_bekliyor'
                        ? '#E7DFF3'
                        : f.durum === 'perte'
                          ? '#F6DAD7'
                          : 'inherit',
              },
            }}
          >
            <MenuItem value="stokta">Stokta</MenuItem>
            <MenuItem value="kapora">Kapora</MenuItem>
            <MenuItem value="devir_bekliyor">Devir Bekliyor</MenuItem>
            <MenuItem value="tamamlandi">Tamamlandı</MenuItem>
            <MenuItem value="perte">Perte</MenuItem>
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField select fullWidth label="Ödeme Şekli" value={f.odeme_sekli} onChange={(e) => setFormData({ ...f, odeme_sekli: e.target.value })}>
            <MenuItem value="nakit">Nakit</MenuItem>
            <MenuItem value="kredi_karti">Kredi Kartı</MenuItem>
            <MenuItem value="havale">Havale/EFT</MenuItem>
            <MenuItem value="taksit">Taksit</MenuItem>
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="Alım Tarihi"
            type="date"
            value={f.tarih}
            onChange={(e) => setFormData({ ...f, tarih: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="Satış Tarihi"
            type="date"
            value={f.satis_tarihi}
            onChange={(e) => setFormData({ ...f, satis_tarihi: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField fullWidth label="Yevmiye No" value={f.yevmiye_no} onChange={(e) => setFormData({ ...f, yevmiye_no: e.target.value })} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControlLabel
            control={<Checkbox checked={f.fatura_kesildi} onChange={(e) => setFormData({ ...f, fatura_kesildi: e.target.checked })} />}
            label="Fatura Kesildi"
          />
        </Grid>
      </Grid>
    </>
  );
};

export default MotorBilgileriBolumu;
