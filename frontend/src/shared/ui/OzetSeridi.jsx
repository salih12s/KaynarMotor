import React from 'react';
import { Box, Paper, useMediaQuery, useTheme } from '@mui/material';
import { FONT, RENK, TON } from '../../app/tokenlar';

// Sayfa üstündeki özet: geniş ekranda tek şerit (büyük rakam + küçük etiket), dar ekranda yazılı çipler ("Toplam: 46").
// cip: geniş ekranda da çip görünümü (stok sayfaları). ogeler: [{ etiket, deger, ton? }]. ton verilirse rakam o tonun rengiyle yazılır.
const OzetSeridi = ({ ogeler, sx, cip = false }) => {
  const darEkran = useMediaQuery(useTheme().breakpoints.down('md'));
  const dar = cip || darEkran;
  if (dar) {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, ...sx }}>
        {ogeler
          .filter((o) => cip || !['0', '₺0'].includes(String(o.deger)))
          .map((o) => {
            const { fg, bg } = TON[o.ton] || TON.gri;
            return (
              <Box
                key={o.etiket}
                component="span"
                sx={{
                  display: 'inline-flex',
                  height: 30,
                  alignItems: 'center',
                  px: 1.25,
                  border: `1.5px solid ${fg}`,
                  borderRadius: '4px',
                  bgcolor: bg,
                  color: fg,
                  fontSize: 13.5,
                  fontWeight: 700,
                }}
              >
                {o.etiket}: {o.deger}
              </Box>
            );
          })}
      </Box>
    );
  }
  return (
    <Paper aria-label="Özet" sx={{ display: 'flex', alignItems: 'stretch', overflow: 'hidden', bgcolor: RENK.yuzey, ...sx }}>
      {ogeler.map((o, i) => {
        const renk = o.ton ? (TON[o.ton] || TON.gri).fg : RENK.murekkep;
        return (
          <Box key={o.etiket} sx={{ flex: '1 1 0', minWidth: 0, px: 2, py: 1.25, borderRight: i === ogeler.length - 1 ? 0 : `1px solid ${RENK.cizgiSoluk}` }}>
            <Box
              component="b"
              sx={{ display: 'block', fontFamily: FONT.baslik, fontSize: 28, lineHeight: 1, fontWeight: 600, color: renk, whiteSpace: 'nowrap' }}
            >
              {o.deger}
            </Box>
            <Box component="span" sx={{ fontSize: 12.5, fontWeight: 500, color: RENK.soluk }}>
              {o.etiket}
            </Box>
          </Box>
        );
      })}
    </Paper>
  );
};

export default OzetSeridi;
