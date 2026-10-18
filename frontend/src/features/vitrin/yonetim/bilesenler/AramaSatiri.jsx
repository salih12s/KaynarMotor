import React from 'react';
import { TextField, IconButton, Paper, ToggleButton, ToggleButtonGroup, InputAdornment } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import ArchiveIcon from '@mui/icons-material/Archive';

// İlan arama kutusu ve Yayında / Arşiv görünüm anahtarı.
const AramaSatiri = ({ arama, setArama, gorunum, setGorunum, aktifSayisi, arsivSayisi }) => {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      <TextField
        size="small"
        value={arama}
        onChange={e => setArama(e.target.value)}
        placeholder="İlan ara: başlık, marka, model, ilan no…"
        sx={{ flex: '1 1 260px', minWidth: 0 }}
        inputProps={{ 'aria-label': 'İlan ara' }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
          endAdornment: arama ? (
            <InputAdornment position="end">
              <IconButton size="small" edge="end" onClick={() => setArama('')} aria-label="Aramayı temizle"><CloseIcon fontSize="small" /></IconButton>
            </InputAdornment>
          ) : null,
        }}
      />
      <ToggleButtonGroup exclusive size="small" color="error" value={gorunum}
        onChange={(e, val) => { if (val) setGorunum(val); }}>
        <ToggleButton value="aktif" sx={{ fontWeight: 700, px: 2 }}>Yayında ({aktifSayisi})</ToggleButton>
        <ToggleButton value="arsiv" sx={{ fontWeight: 700, px: 2 }}>
          <ArchiveIcon fontSize="small" sx={{ mr: 0.5 }} />Arşiv ({arsivSayisi})
        </ToggleButton>
      </ToggleButtonGroup>
    </Paper>
  );
};

export default AramaSatiri;
