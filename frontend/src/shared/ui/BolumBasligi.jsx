import React from 'react';
import { Box, Typography } from '@mui/material';
import { FONT, RENK } from '../../app/tokenlar';

// Form bölümü başlığı: renkli SVG simge kutusu + başlık (emoji yerine). renk: simge rengi; sag: sağa dayalı öğe (ör. sayaç).
const BolumBasligi = ({ ikon, renk = RENK.mavi, children, sag, sx }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25, ...sx }}>
    {ikon && (
      <Box
        component="span"
        aria-hidden="true"
        sx={{
          width: 26,
          height: 26,
          borderRadius: '6px',
          bgcolor: `${renk}1F`,
          color: renk,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
          '& svg': { fontSize: 17 },
        }}
      >
        {ikon}
      </Box>
    )}
    <Typography component="h3" sx={{ fontFamily: FONT.baslik, fontWeight: 700, fontSize: 20, lineHeight: 1.2, color: RENK.murekkep, flex: 1 }}>
      {children}
    </Typography>
    {sag}
  </Box>
);

export default BolumBasligi;
