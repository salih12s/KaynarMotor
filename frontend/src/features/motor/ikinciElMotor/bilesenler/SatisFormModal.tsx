import React from 'react';
import MotorIkon from '@mui/icons-material/TwoWheelerOutlined';
import { DialogBasligi } from '../../../../shared/ui';
import { Box, Typography, Button, Dialog, DialogContent, DialogActions, Alert, Chip } from '@mui/material';
import MotorBilgileriBolumu from './MotorBilgileriBolumu';
import FiyatKarBolumu from './FiyatKarBolumu';
import TaraflarBolumu from './TaraflarBolumu';
import KalanOdemeBelgeBolumu from './KalanOdemeBelgeBolumu';
import type { Motor, SifirMotor } from '../../../../shared/tipler';
import type { SatisFormuDurumu } from '../useSatisFormu';
import { TON } from '../../../../app/tokenlar';

// Motor satış ekleme / düzenleme penceresi. Durum ve işlemler useSatisFormu hook'undan gelir (form).
interface SatisFormModalProps {
  form: SatisFormuDurumu;
  stokMotorlar: Motor[];
  sifirModeller: SifirMotor[];
  yatirimciMap: Record<number, string>;
  canAlis: boolean;
  canKar: boolean;
  isMobile: boolean;
}

const SatisFormModal = ({ form, stokMotorlar, sifirModeller, yatirimciMap, canAlis, canKar, isMobile }: SatisFormModalProps) => {
  const {
    dialog,
    kapat,
    error,
    handleSave,
    formData: f,
    setFormData,
    bekleyenBelgeler,
    setBekleyenBelgeler,
    kaydediliyor,
    setSelectedStokId,
    turSec,
    sifirSec,
    musteriOptions,
    searchMusteri,
    autofillByPhone,
    canliKar,
  } = form;
  return (
    <Dialog open={dialog.open} onClose={kapat} maxWidth="lg" fullWidth fullScreen={isMobile}>
      <DialogBasligi ikon={<MotorIkon />} baslik={dialog.data ? 'Motor Düzenle' : 'Yeni Motor Satış'} />
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {f.yatirimci_id && (
          <Alert severity="info" icon={false} sx={{ mb: 2, bgcolor: TON.mavi.bg, border: '1px solid #90caf9' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip label="YATIRIMCI MOTORU" color="primary" size="small" sx={{ fontWeight: 700 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Bu motor bir yatırımcıya ait
                {yatirimciMap[Number(f.yatirimci_id)] || f.yatirimci_adi ? `: ${yatirimciMap[Number(f.yatirimci_id)] || f.yatirimci_adi}` : ''}.
                {canKar ? ' Satışta yatırımcı kârını aşağıdan girin.' : ''}
              </Typography>
            </Box>
          </Alert>
        )}
        <MotorBilgileriBolumu
          f={f}
          setFormData={setFormData}
          stokMotorlar={stokMotorlar}
          setSelectedStokId={setSelectedStokId}
          sifirModeller={sifirModeller}
          turSec={turSec}
          sifirSec={sifirSec}
          duzenleme={!!dialog.data}
        />
        <FiyatKarBolumu f={f} setFormData={setFormData} canAlis={canAlis} canKar={canKar} canliKar={canliKar} />
        <TaraflarBolumu f={f} setFormData={setFormData} musteriOptions={musteriOptions} searchMusteri={searchMusteri} autofillByPhone={autofillByPhone} />
        <KalanOdemeBelgeBolumu
          f={f}
          setFormData={setFormData}
          dialog={dialog}
          bekleyenBelgeler={bekleyenBelgeler}
          setBekleyenBelgeler={setBekleyenBelgeler}
          kaydediliyor={kaydediliyor}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={kapat} disabled={kaydediliyor}>
          İptal
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={kaydediliyor}>
          {kaydediliyor ? 'Kaydediliyor…' : dialog.data ? 'Güncelle' : 'Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SatisFormModal;
