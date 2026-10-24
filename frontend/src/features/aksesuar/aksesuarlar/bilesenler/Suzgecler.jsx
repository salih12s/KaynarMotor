import React from 'react';
import { Box, Paper, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

// Ad/telefon arama kutusu ve satış tarihi aralığı.
const Suzgecler = ({ aksSearch, setAksSearch, aksStart, setAksStart, aksEnd, setAksEnd }) => {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Ad veya telefon ara..."
          value={aksSearch}
          onChange={(e) => setAksSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: { xs: '100%', sm: 250 } }}
        />
        <TextField
          size="small"
          label="Başlangıç Tarihi"
          type="date"
          value={aksStart}
          onChange={(e) => setAksStart(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label="Bitiş Tarihi"
          type="date"
          value={aksEnd}
          onChange={(e) => setAksEnd(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Box>
    </Paper>
  );
};

export default Suzgecler;
