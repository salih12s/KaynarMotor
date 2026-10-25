import React, { useState, type ChangeEvent, type ReactNode } from 'react';
import { Box, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { RENK } from '../../../app/tokenlar';
import type { PresetAdi, Presetler } from '../useRaporVerisi';

const ON_AYARLAR: Array<[string, PresetAdi]> = [
  ['Bugün', 'bugun'],
  ['Bu Ay', 'buAy'],
  ['Geçen Ay', 'gecenAy'],
  ['Bu Yıl', 'buYil'],
  ['Geçen Yıl', 'gecenYil'],
];

// Hızlı tarih düğmeleri (tek parça şerit) + başlangıç/bitiş alanları, hepsi tek satırda.
// Seçili düğme yalnızca düğmeyle seçilince koyulaşır; tarih elle değişince seçim kalkar.
// `children`: aynı satıra eklenecek ek süzgeçler (ör. Personel).
interface TarihFiltresiProps {
  baslangic: string;
  bitis: string;
  setBaslangic: (tarih: string) => void;
  setBitis: (tarih: string) => void;
  presetler: Presetler;
  children?: ReactNode;
}

const TarihFiltresi = ({ baslangic, bitis, setBaslangic, setBitis, presetler, children }: TarihFiltresiProps) => {
  const [secili, setSecili] = useState<PresetAdi | null>('buAy');
  const elleDegis = (ayarla: (tarih: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    setSecili(null);
    ayarla(e.target.value);
  };
  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={secili}
        sx={{
          bgcolor: RENK.yuzey,
          '& .MuiToggleButton-root': {
            textTransform: 'none',
            fontWeight: 600,
            px: 1.75,
            color: RENK.soluk,
            borderColor: RENK.alanCizgi,
            '&.Mui-selected, &.Mui-selected:hover': { bgcolor: RENK.murekkep, color: '#fff' },
          },
        }}
      >
        {ON_AYARLAR.map(([etiket, anahtar]) => (
          <ToggleButton
            key={anahtar}
            value={anahtar}
            onClick={() => {
              setSecili(anahtar);
              presetler[anahtar]();
            }}
          >
            {etiket}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <TextField size="small" type="date" inputProps={{ 'aria-label': 'Başlangıç' }} value={baslangic} onChange={elleDegis(setBaslangic)} />
      <TextField size="small" type="date" inputProps={{ 'aria-label': 'Bitiş' }} value={bitis} onChange={elleDegis(setBitis)} />
      {children}
    </Box>
  );
};

export default TarihFiltresi;
