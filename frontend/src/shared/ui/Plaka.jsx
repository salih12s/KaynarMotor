import React from 'react';
import { Box } from '@mui/material';
import { FONT, RENK } from '../../app/tokenlar';
import { plakaBicim } from './plakaBicim';

// Türk plakası rozeti: mavi TR şeridi + çerçeveli rakamlar. Plakası olmayan kayıt (PLAKASIZ) soluk çizilir.
const Plaka = ({ plaka, buyuk = false }) => {
  const metin = plakaBicim(plaka);
  if (!metin) return null;
  const plakasiz = metin === 'PLAKASIZ';
  return (
    <Box
      component="span"
      data-testid="plaka-rozeti"
      sx={{
        display: 'inline-flex',
        alignItems: 'stretch',
        height: buyuk ? 44 : 26,
        border: `${buyuk ? 2 : 1.5}px solid ${RENK.murekkep}`,
        borderRadius: buyuk ? '7px' : '5px',
        bgcolor: '#fff',
        overflow: 'hidden',
        fontFamily: FONT.baslik,
        fontWeight: 600,
        fontSize: buyuk ? 28 : 17,
        letterSpacing: '.07em',
        color: RENK.murekkep,
        whiteSpace: 'nowrap',
        opacity: plakasiz ? 0.75 : 1,
        verticalAlign: 'middle',
      }}
    >
      <Box
        component="span"
        aria-hidden="true"
        sx={{
          bgcolor: RENK.odak,
          width: buyuk ? 20 : 14,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          pb: '2px',
          // "TR" yazısı metin düğümü değil: kopyalamada ve ekran okuyucuda plakanın içine karışmaz
          '&::before': { content: '"TR"', color: '#fff', fontSize: buyuk ? 8 : 7, letterSpacing: 0, fontWeight: 700, fontFamily: FONT.metin },
        }}
      />
      <Box component="span" sx={{ display: 'flex', alignItems: 'center', px: buyuk ? '12px' : '8px' }}>
        {metin}
      </Box>
    </Box>
  );
};

export default Plaka;
