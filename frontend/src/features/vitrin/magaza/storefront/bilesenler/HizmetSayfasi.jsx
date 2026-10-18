import React from 'react';
import { Box, Typography, Stack, Paper } from '@mui/material';
import { vitrinService } from '../../../vitrinApi';
import { KATEGORILER } from '../../../vitrinSabitleri';
import { RENK, YAZI, KisiDugmeleri } from '../../../VitrinOrtak';

// Hizmet kategorileri (bakım, nakliye, sigorta): görsel, başlık, açıklama ve kişi düğmeleri; ilan yok.
const HizmetSayfasi = ({ s }) => {
  const { curIletisim, kategori, tab, kisiler } = s;
  return (
    <Box sx={{ flex: 1, width: '100%', maxWidth: 900, mx: 'auto', p: { xs: 1.5, md: 3 } }}>
      <Paper elevation={0} sx={{ overflow: 'hidden', borderRadius: 3, border: `1px solid ${RENK.cizgi}` }}>
        {curIletisim?.gorsel_var ? (
          <Box component="img" src={`${vitrinService.iletisimGorselUrl(kategori)}?t=${curIletisim.updated_at || ''}`}
            alt={KATEGORILER[tab].label} loading="lazy"
            sx={{ width: '100%', maxHeight: 440, objectFit: 'cover', display: 'block' }} />
        ) : (
          <Box sx={{ height: 220, bgcolor: RENK.asfalt, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
            <Typography variant="h6">{KATEGORILER[tab].label}</Typography>
          </Box>
        )}
        <Box sx={{ p: { xs: 2.5, md: 4 } }}>
          <Typography component="h1" sx={{ fontFamily: YAZI.baslik, fontWeight: 700, fontSize: { xs: 30, md: 42 }, lineHeight: 1.05 }}>
            {curIletisim?.baslik || KATEGORILER[tab].label}
          </Typography>
          {curIletisim?.aciklama && (
            <Typography color="text.secondary" sx={{ whiteSpace: 'pre-wrap', maxWidth: '62ch', mt: 1.5, lineHeight: 1.6 }}>{curIletisim.aciklama}</Typography>
          )}
          {kisiler.length > 0 ? (
            <Stack spacing={2} sx={{ mt: 3 }}>
              {kisiler.map(k => (
                <Box key={`${k.ad}-${k.tel}`} sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 2, rowGap: 1 }}>
                  {k.ad && <Typography fontWeight={600} sx={{ minWidth: 140 }}>{k.ad}</Typography>}
                  <KisiDugmeleri kisi={k} boyut="large" />
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography color="text.secondary" sx={{ mt: 3 }}>İletişim bilgisi yakında eklenecek.</Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default HizmetSayfasi;
