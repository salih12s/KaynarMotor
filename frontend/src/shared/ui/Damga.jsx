import React from 'react';
import { Box } from '@mui/material';
import { TON } from '../../app/tokenlar';

// Durum damgası: çerçeveli, yumuşak zeminli küçük etiket. ton: bekle | mavi | yesil | kirmizi | mor | gri | turuncu
const Damga = ({ ton = 'gri', children, sx }) => {
  const { fg, bg } = TON[ton] || TON.gri;
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1.45,
        px: '8px',
        py: '1px',
        border: `1.5px solid ${fg}`,
        borderRadius: '3px',
        letterSpacing: '.02em',
        color: fg,
        bgcolor: bg,
        whiteSpace: 'nowrap',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

export default Damga;
