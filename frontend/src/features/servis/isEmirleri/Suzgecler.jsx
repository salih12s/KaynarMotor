import React from 'react';
import { Box, Paper, TextField, MenuItem, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

// Arama, durum (sunucuya gider) ve tarih aralığı (oluşturma tarihine göre) süzgeçleri.
const Suzgecler = ({ search, setSearch, durumFilter, setDurumFilter, startDate, setStartDate, endDate, setEndDate }) => {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Ara (Müşteri, Fiş No, Marka,...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
          select
          size="small"
          value={durumFilter}
          onChange={(e) => setDurumFilter(e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 150 } }}
          label="Durum"
        >
          <MenuItem value="">Tümü</MenuItem>
          <MenuItem value="beklemede">Beklemede</MenuItem>
          <MenuItem value="devam_ediyor">Devam Ediyor</MenuItem>
          <MenuItem value="tamamlandi">Tamamlandı</MenuItem>
        </TextField>
        <TextField
          size="small"
          label="Başlangıç"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField size="small" label="Bitiş" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
      </Box>
    </Paper>
  );
};

export default Suzgecler;
