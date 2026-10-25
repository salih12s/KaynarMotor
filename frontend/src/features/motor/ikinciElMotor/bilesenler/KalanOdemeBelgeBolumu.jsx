import React from 'react';
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined';
import { BolumBasligi } from '../../../../shared/ui';
import { MENU_RENK } from '../../../../app/tokenlar';
import { TextField, Grid, Checkbox, FormControlLabel } from '@mui/material';
import { BelgeBolumu, BekleyenBelgeler } from '../../SatisBelgeleri';

// Satış formu: kalan ödeme, açıklama ve belgeler (kayıtlı satışta anında, yenide kayıttan sonra).
const KalanOdemeBelgeBolumu = ({ f, setFormData, dialog, bekleyenBelgeler, setBekleyenBelgeler, kaydediliyor }) => {
  return (
    <>
      <BolumBasligi ikon={<ReceiptIcon />} renk={MENU_RENK.veresiye} sx={{ mt: 3 }}>
        Kalan Ödeme
      </BolumBasligi>
      <Grid container spacing={2} alignItems="center">
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={f.odeme_tamamlandi}
                onChange={(e) => setFormData({ ...f, odeme_tamamlandi: e.target.checked, kalan_odeme: e.target.checked ? '' : f.kalan_odeme })}
              />
            }
            label="Ödeme Tamamlandı"
          />
        </Grid>
        {!f.odeme_tamamlandi && (
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="Kalan Ödeme (₺)"
              type="number"
              value={f.kalan_odeme}
              onChange={(e) => setFormData({ ...f, kalan_odeme: e.target.value })}
            />
          </Grid>
        )}
      </Grid>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12 }}>
          <TextField fullWidth label="Açıklama" value={f.aciklama} onChange={(e) => setFormData({ ...f, aciklama: e.target.value })} multiline rows={2} />
        </Grid>
      </Grid>

      {/* Belgeler: kayıtlı satışta anında yüklenir; yeni satışta seçilir, kaydedince yüklenir */}
      {dialog.data ? (
        <BelgeBolumu key={dialog.data.id} motorId={dialog.data.id} />
      ) : (
        <BekleyenBelgeler dosyalar={bekleyenBelgeler} setDosyalar={setBekleyenBelgeler} disabled={kaydediliyor} />
      )}
    </>
  );
};

export default KalanOdemeBelgeBolumu;
