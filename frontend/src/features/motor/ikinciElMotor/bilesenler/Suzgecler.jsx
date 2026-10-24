import React from 'react';
import { Paper, TextField, Grid, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

// Arama kutusu ve satış/alım tarihi aralığı.
const Suzgecler = ({ search, setSearch, tarihBaslangic, setTarihBaslangic, tarihBitis, setTarihBitis }) => {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Plaka, marka, model veya satıcı adı ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            size="small"
            fullWidth
            label="Başlangıç"
            type="date"
            value={tarihBaslangic}
            onChange={(e) => setTarihBaslangic(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            size="small"
            fullWidth
            label="Bitiş"
            type="date"
            value={tarihBitis}
            onChange={(e) => setTarihBitis(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      </Grid>
    </Paper>
  );
};

export default Suzgecler;
