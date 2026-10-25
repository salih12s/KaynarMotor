import React, { type ReactNode } from 'react';
import { Box, DialogTitle, IconButton, type SxProps, type Theme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { RENK } from '../../app/tokenlar';

// Pencere başlığı: isteğe bağlı kırmızı simge karesi, başlık, sağda eylemler ve kapatma düğmesi.
interface DialogBasligiProps {
  baslik: ReactNode;
  ikon?: ReactNode;
  onKapat?: () => void;
  eylemler?: ReactNode;
  sx?: SxProps<Theme>;
}

const DialogBasligi = ({ baslik, ikon, onKapat, eylemler, sx }: DialogBasligiProps) => (
  <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: `1px solid ${RENK.cizgi}`, ...sx }}>
    {ikon && (
      <Box
        component="span"
        aria-hidden="true"
        sx={{
          width: 38,
          height: 38,
          borderRadius: '8px',
          bgcolor: 'primary.main',
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
          '& svg': { fontSize: 22 },
        }}
      >
        {ikon}
      </Box>
    )}
    <Box component="span" sx={{ flex: 1, minWidth: 0 }}>
      {baslik}
    </Box>
    {eylemler}
    {onKapat && (
      <IconButton onClick={onKapat} aria-label="Pencereyi kapat" size="small" sx={{ color: RENK.soluk }}>
        <CloseIcon />
      </IconButton>
    )}
  </DialogTitle>
);

export default DialogBasligi;
