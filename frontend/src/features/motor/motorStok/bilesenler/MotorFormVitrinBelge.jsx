import React from 'react';
import { Typography, TextField, Grid, Autocomplete } from '@mui/material';
import { BelgeBolumu, BekleyenBelgeler } from '../../SatisBelgeleri';
import { SEGMENTLER } from '../../../vitrin/vitrinSabitleri';

// Form: vitrin bilgileri (yetkiliye), açıklama ve belgeler (kayıtlı motorda anında, yenide kayıttan sonra).
const MotorFormVitrinBelge = ({ f, setFormData, dialog, canEdit, bekleyenBelgeler, setBekleyenBelgeler }) => {
  return (
    <>
      {canEdit && (
        <>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 3, mb: 1 }}>
            Vitrin / Site Bilgileri <Typography component="span" variant="caption" color="text.secondary">(opsiyonel — bu motoru vitrine alırken otomatik dolar)</Typography>
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}><TextField fullWidth label="Vitrin Başlığı" value={f.vitrin_baslik} onChange={e => setFormData({ ...f, vitrin_baslik: e.target.value })} placeholder="Örn: 2.El Satılık Temiz, Bakımlı" /></Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Autocomplete freeSolo options={SEGMENTLER} value={f.vitrin_segment || null}
                onChange={(e, val) => setFormData({ ...f, vitrin_segment: val || '' })}
                onInputChange={(e, val) => setFormData({ ...f, vitrin_segment: val })}
                renderInput={(params) => <TextField {...params} fullWidth label="Segment" />} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Motor CC" type="number" value={f.vitrin_cc} onChange={e => setFormData({ ...f, vitrin_cc: e.target.value })} /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth label="Hasar Kaydı" value={f.vitrin_hasar} onChange={e => setFormData({ ...f, vitrin_hasar: e.target.value })} placeholder="Örn: Hasar kaydı yok / Değişen: ön çamurluk" /></Grid>
            <Grid size={{ xs: 12 }}><TextField fullWidth label="Vitrin Açıklaması" value={f.vitrin_aciklama} onChange={e => setFormData({ ...f, vitrin_aciklama: e.target.value })} multiline rows={2} /></Grid>
          </Grid>
        </>
      )}

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12 }}><TextField fullWidth label="Açıklama" value={f.aciklama} onChange={e => setFormData({ ...f, aciklama: e.target.value })} multiline rows={2} /></Grid>
      </Grid>

      {/* Ruhsat, alış sözleşmesi vb.: motor satılınca aynı belgeler satış kaydında da görünür */}
      {dialog.data
        ? <BelgeBolumu key={dialog.data.id} motorId={dialog.data.id} />
        : <BekleyenBelgeler dosyalar={bekleyenBelgeler} setDosyalar={setBekleyenBelgeler} />}
    </>
  );
};

export default MotorFormVitrinBelge;
