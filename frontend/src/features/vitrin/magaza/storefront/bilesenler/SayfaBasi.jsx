import React from 'react';
import { Box, Typography, TextField, IconButton, InputAdornment } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { RENK, YAZI, KisiSessiz } from '../../../VitrinOrtak';

// Sayfa başı: başlık, ilan sayısı, arama kutusu ve (masaüstünde) iletişim kişileri.
const SayfaBasi = ({ s }) => {
  const { sayfaBasligi, loading, aramaVar, q, setQ, gorunenUrunler, isMotor, kisiler } = s;
  return (
    <Box sx={{ maxWidth: 1400, width: '100%', mx: 'auto', px: { xs: 2, md: 3 }, pt: { xs: 2.5, md: 3 } }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'flex-end' }, gap: { xs: 2, md: 4 } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h1" sx={{ fontFamily: YAZI.baslik, fontWeight: 700, fontSize: { xs: 38, md: 48 }, lineHeight: 1 }}>
            {sayfaBasligi}
          </Typography>
          <Typography color="text.secondary" aria-live="polite" sx={{ mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
            {loading ? 'İlanlar yükleniyor…' : aramaVar ? `"${q.trim()}" için ${gorunenUrunler.length} ilan` : `${gorunenUrunler.length} ilan`}
          </Typography>
        </Box>
        <TextField
          size="small"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={isMotor ? 'Marka, model veya ilan no ara' : 'Ürün adı veya ilan no ara'}
          inputProps={{ 'aria-label': 'İlan ara', enterKeyHint: 'search' }}
          sx={{ width: { xs: '100%', md: 380 }, '& .MuiOutlinedInput-root': { bgcolor: RENK.yuzey, borderRadius: 2 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: q ? (
              <InputAdornment position="end">
                <IconButton size="small" edge="end" onClick={() => setQ('')} aria-label="Aramayı temizle">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
      </Box>

      {/* Telefonda iletişim kişileri listenin altında gösterilir; ilk ilan ekranın üstünde kalsın */}
      {kisiler.length > 0 && (
        <Box sx={{ mt: 1.5, display: { xs: 'none', md: 'flex' }, flexWrap: 'wrap', alignItems: 'center', columnGap: 2.5, rowGap: 0.75 }}>
          <Typography color="text.secondary" sx={{ fontSize: 14.5 }}>
            Sorularınız için arayın
          </Typography>
          {kisiler.map((k) => (
            <KisiSessiz key={`${k.ad}-${k.tel}`} kisi={k} />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default SayfaBasi;
