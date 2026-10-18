import React from 'react';
import { Box, Paper, TextField, Button } from '@mui/material';

const ON_AYARLAR = [['Bugün', 'bugun'], ['Bu Ay', 'buAy'], ['Geçen Ay', 'gecenAy'], ['Bu Yıl', 'buYil'], ['Geçen Yıl', 'gecenYil']];

// Hızlı tarih düğmeleri + başlangıç/bitiş alanları. `children`: aynı satıra eklenecek ek süzgeçler (ör. Personel).
const TarihFiltresi = ({ baslangic, bitis, setBaslangic, setBitis, presetler, children }) => (
  <Paper sx={{ p: 2, mb: 2 }}>
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1.5 }}>
      {ON_AYARLAR.map(([etiket, anahtar]) => (
        <Button key={anahtar} size="small" variant="outlined" onClick={presetler[anahtar]} sx={{ color: '#C62828', borderColor: '#C62828' }}>{etiket}</Button>
      ))}
    </Box>
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
      <TextField size="small" type="date" label="Başlangıç" value={baslangic} onChange={e => setBaslangic(e.target.value)} InputLabelProps={{ shrink: true }} />
      <TextField size="small" type="date" label="Bitiş" value={bitis} onChange={e => setBitis(e.target.value)} InputLabelProps={{ shrink: true }} />
      {children}
    </Box>
  </Paper>
);

export default TarihFiltresi;
