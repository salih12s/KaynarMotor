import React from 'react';
import { Box, Button, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';

// Ad/telefon arama kutusu, satış tarihi aralığı ve sağda "Yeni Satış".
const Suzgecler = ({ aksSearch, setAksSearch, aksStart, setAksStart, aksEnd, setAksEnd, onYeni }) => {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-end', mb: 2 }}>
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
        sx={{ flex: { xs: '1 1 100%', md: '1 1 340px' }, maxWidth: { md: 480 } }}
      />
      <TextField
        size="small"
        label="Başlangıç Tarihi"
        type="date"
        value={aksStart}
        onChange={(e) => setAksStart(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ flex: { xs: 1, md: 'none' } }}
      />
      <TextField
        size="small"
        label="Bitiş Tarihi"
        type="date"
        value={aksEnd}
        onChange={(e) => setAksEnd(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ flex: { xs: 1, md: 'none' } }}
      />
      <Box sx={{ flexGrow: 1 }} />
      <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={onYeni} sx={{ width: { xs: '100%', md: 'auto' } }}>
        Yeni Satış
      </Button>
    </Box>
  );
};

export default Suzgecler;
