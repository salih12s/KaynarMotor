import React from 'react';
import { Box, Button, TextField, Collapse } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import { MOTOR_DURUMLARI } from '../../../vitrinSabitleri';
import { RENK } from '../../../VitrinOrtak';
import { FiltreSatiri, Secim } from './FiltreBilesenleri';

// Motor filtreleri: masaüstünde iki kısa satır, dar ekranda açılır panel.
const MotorFiltreleri = ({ s, darEkran }) => {
  const {
    filtreAcik,
    setFiltreAcik,
    aktifFiltreSayisi,
    motorDurumu,
    secMotorDurumu,
    markalar,
    marka,
    setMarka,
    ccMax,
    setCcMax,
    kmMax,
    setKmMax,
    filtreleriTemizle,
    segment,
    setSegment,
    segmentler,
  } = s;
  return (
    <Box component="section" aria-label="Filtreler" sx={{ maxWidth: 1400, width: '100%', mx: 'auto', px: { xs: 2, md: 3 }, mt: { xs: 2, md: 2 } }}>
      {darEkran && (
        <Button
          fullWidth
          variant="outlined"
          color="inherit"
          startIcon={<FilterListIcon />}
          onClick={() => setFiltreAcik((v) => !v)}
          aria-expanded={filtreAcik}
          sx={{ bgcolor: RENK.yuzey, borderColor: RENK.cizgi, justifyContent: 'flex-start', py: 1 }}
        >
          {aktifFiltreSayisi > 0 ? `Filtrele (${aktifFiltreSayisi} seçili)` : 'Filtrele'}
        </Button>
      )}
      <Collapse in={!darEkran || filtreAcik} timeout="auto">
        <Box
          sx={{
            mt: darEkran ? 1 : 0,
            p: { xs: 1.5, md: 1.75 },
            bgcolor: RENK.yuzey,
            border: `1px solid ${RENK.cizgi}`,
            borderRadius: 2.5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) auto' },
            columnGap: 2,
            rowGap: 1.25,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 2.5, rowGap: 1.25, minWidth: 0 }}>
            <FiltreSatiri baslik="Durum">
              {MOTOR_DURUMLARI.map((d) => (
                <Secim key={d.key} secili={motorDurumu === d.key} onClick={() => secMotorDurumu(d.key)}>
                  {d.label}
                </Secim>
              ))}
            </FiltreSatiri>
            {markalar.length > 0 && (
              <FiltreSatiri baslik="Marka">
                <Secim secili={marka === ''} onClick={() => setMarka('')}>
                  Tümü
                </Secim>
                {markalar.map((m) => (
                  <Secim key={m} secili={marka === m} onClick={() => setMarka(marka === m ? '' : m)}>
                    {m}
                  </Secim>
                ))}
              </FiltreSatiri>
            )}
          </Box>
          <FiltreSatiri baslik="Sınır" sx={{ gridRow: { xs: 3, lg: '1 / 3' }, gridColumn: { lg: 2 }, alignSelf: 'start' }}>
            <TextField
              size="small"
              label="En fazla cc"
              type="number"
              value={ccMax}
              onChange={(e) => setCcMax(e.target.value)}
              sx={{ width: 132, '& .MuiOutlinedInput-root': { bgcolor: RENK.zemin } }}
            />
            {motorDurumu !== 'sifir' && (
              <TextField
                size="small"
                label="En fazla km"
                type="number"
                value={kmMax}
                onChange={(e) => setKmMax(e.target.value)}
                sx={{ width: 132, '& .MuiOutlinedInput-root': { bgcolor: RENK.zemin } }}
              />
            )}
            {aktifFiltreSayisi > 0 && (
              <Button onClick={filtreleriTemizle} size="small" sx={{ p: 0.5, minWidth: 0, fontWeight: 600, color: RENK.kirmiziAcik }}>
                Temizle
              </Button>
            )}
          </FiltreSatiri>
          <Box sx={{ gridRow: 2, gridColumn: { lg: 1 }, pt: 1.25, borderTop: `1px solid ${RENK.cizgi}` }}>
            <FiltreSatiri baslik="Segment">
              <Secim secili={segment === ''} onClick={() => setSegment('')}>
                Tümü
              </Secim>
              {segmentler.map((s) => (
                <Secim key={s} secili={segment === s} onClick={() => setSegment(segment === s ? '' : s)}>
                  {s}
                </Secim>
              ))}
            </FiltreSatiri>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};

export default MotorFiltreleri;
