import React from 'react';
import { Box, Button, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { RENK, TON } from '../../../../app/tokenlar';

// Arama kutusu, satış/alım tarihi aralığı; sağda "Excel'e Aktar" ve "Motor Satış" düğmeleri.
interface SuzgeclerProps {
  search: string;
  setSearch: (v: string) => void;
  tarihBaslangic: string;
  setTarihBaslangic: (v: string) => void;
  tarihBitis: string;
  setTarihBitis: (v: string) => void;
  salt: boolean;
  onExcel: () => void;
  onYeni: () => void;
}

const Suzgecler = ({ search, setSearch, tarihBaslangic, setTarihBaslangic, tarihBitis, setTarihBitis, salt, onExcel, onYeni }: SuzgeclerProps) => {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-end', mb: 2 }}>
      <TextField
        size="small"
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
        sx={{ flex: { xs: '1 1 100%', md: '1 1 340px' }, maxWidth: { md: 520 } }}
      />
      <TextField
        size="small"
        label="Başlangıç"
        type="date"
        value={tarihBaslangic}
        onChange={(e) => setTarihBaslangic(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ flex: { xs: 1, md: 'none' } }}
      />
      <TextField
        size="small"
        label="Bitiş"
        type="date"
        value={tarihBitis}
        onChange={(e) => setTarihBitis(e.target.value)}
        InputLabelProps={{ shrink: true }}
        sx={{ flex: { xs: 1, md: 'none' } }}
      />
      <Box sx={{ flexGrow: 1 }} />
      <Button
        variant="outlined"
        size="large"
        startIcon={<FileDownloadIcon />}
        onClick={onExcel}
        sx={{ color: RENK.yesil, borderColor: RENK.yesil, '&:hover': { borderColor: RENK.yesil, bgcolor: TON.yesil.bg }, flex: { xs: 1, md: 'none' } }}
      >
        Excel'e Aktar
      </Button>
      {!salt && (
        <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={onYeni} sx={{ flex: { xs: 1, md: 'none' } }}>
          Motor Satış
        </Button>
      )}
    </Box>
  );
};

export default Suzgecler;
