import React from 'react';
import { Box, Button, TextField, MenuItem, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';

// Arama, durum (sunucuya gider) ve tarih aralığı (oluşturma tarihine göre) süzgeçleri; sağda "Yeni İş Emri".
interface SuzgeclerProps {
  search: string;
  setSearch: (v: string) => void;
  durumFilter: string;
  setDurumFilter: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  onYeni: () => void;
}

const Suzgecler = ({ search, setSearch, durumFilter, setDurumFilter, startDate, setStartDate, endDate, setEndDate, onYeni }: SuzgeclerProps) => {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-end', mb: 2 }}>
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
        sx={{ minWidth: { xs: '100%', sm: 300 } }}
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
        sx={{ flex: { xs: 1, sm: 'none' } }}
      />
      <TextField
        size="small"
        label="Bitiş"
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ flex: { xs: 1, sm: 'none' } }}
      />
      <Box sx={{ flexGrow: 1 }} />
      <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={onYeni} sx={{ width: { xs: '100%', sm: 'auto' } }}>
        Yeni İş Emri
      </Button>
    </Box>
  );
};

export default Suzgecler;
