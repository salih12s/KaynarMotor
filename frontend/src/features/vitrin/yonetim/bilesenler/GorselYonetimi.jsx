import React from 'react';
import { Box, Button, Typography, Grid, IconButton, Chip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PhotoIcon from '@mui/icons-material/PhotoCamera';
import BackIcon from '@mui/icons-material/ArrowBack';
import ForwardIcon from '@mui/icons-material/ArrowForward';

// İlan görselleri: ekleme, vitrin fotoğrafı seçme, oklarla ve sürükleyerek sıralama, silme.
const GorselYonetimi = ({ f }) => {
  const { gorseller, handleFiles, draggedGorselIndex, setDraggedGorselIndex, handleGorselDrop, makeKapak, removeGorsel, moveGorsel } = f;
  return (
    <Box>
      <Button variant="outlined" component="label" startIcon={<PhotoIcon />}>
        Görsel Ekle
        <input type="file" hidden accept="image/*" multiple onChange={handleFiles} />
      </Button>
      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>İlk görsel <strong>vitrin fotoğrafı</strong> olur. Sürükleyin veya oklarla sıralayın.</Typography>
      <Grid container spacing={1} sx={{ mt: 0.5 }}>
        {gorseller.map((g, i) => (
          <Grid size={{ xs: 4, sm: 3 }} key={i}>
            <Box draggable
              onDragStart={e => { setDraggedGorselIndex(i); e.dataTransfer.effectAllowed = 'move'; }}
              onDragEnd={() => setDraggedGorselIndex(null)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleGorselDrop(i)}
              sx={{ position: 'relative', border: i === 0 ? '2px solid #C62828' : '1px solid #ddd', borderRadius: 1, overflow: 'hidden', cursor: 'grab', opacity: draggedGorselIndex === i ? 0.55 : 1 }}>
              <img src={g} alt={`gorsel-${i}`} draggable={false} style={{ width: '100%', height: 70, objectFit: 'cover', display: 'block' }} />
              {i === 0 && <Chip size="small" label="Vitrin" color="error" sx={{ position: 'absolute', top: 2, left: 2, height: 18, fontSize: 10 }} />}
              <Box sx={{ position: 'absolute', top: 0, right: 0, display: 'flex' }}>
                {i !== 0 && <IconButton size="small" sx={{ bgcolor: 'rgba(255,255,255,0.8)', p: 0.2 }} onClick={() => makeKapak(i)} title="Vitrin fotoğrafı yap">⭐</IconButton>}
                <IconButton size="small" sx={{ bgcolor: 'rgba(255,255,255,0.8)', p: 0.2 }} onClick={() => removeGorsel(i)}><CloseIcon fontSize="small" /></IconButton>
              </Box>
              <Box sx={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper' }}>
                <IconButton size="small" disabled={i === 0} onClick={() => moveGorsel(i, i - 1)} title="Sola kaydır"><BackIcon fontSize="small" /></IconButton>
                <Typography variant="caption" fontWeight="bold">{i + 1}</Typography>
                <IconButton size="small" disabled={i === gorseller.length - 1} onClick={() => moveGorsel(i, i + 1)} title="Sağa kaydır"><ForwardIcon fontSize="small" /></IconButton>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default GorselYonetimi;
