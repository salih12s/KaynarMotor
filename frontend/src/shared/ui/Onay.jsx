import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DialogBasligi from './DialogBasligi';
import { RENK } from '../../app/tokenlar';

const OnayContext = createContext(null);

// Sağlayıcı yoksa (ör. tek başına çizilen bir bileşen testi) tarayıcının kendi kutusuna düşer.
const tarayiciOnayi = async (mesaj) => window.confirm(mesaj);

// Uygulamanın kendi silme onay penceresi: const onay = useOnay(); if (!(await onay('Bu kaydı sil?'))) return;
export const OnayProvider = ({ children }) => {
  const [istek, setIstek] = useState(null);
  const cozucu = useRef(null);

  const sor = useCallback(
    (mesaj, secenek = {}) =>
      new Promise((coz) => {
        cozucu.current = coz;
        setIstek({ mesaj, baslik: secenek.baslik || 'Silme onayı', onayEtiket: secenek.onayEtiket || 'Sil' });
      }),
    [],
  );

  const kapat = (sonuc) => {
    setIstek(null);
    if (cozucu.current) cozucu.current(sonuc);
    cozucu.current = null;
  };

  return (
    <OnayContext.Provider value={sor}>
      {children}
      <Dialog open={!!istek} onClose={() => kapat(false)} maxWidth="xs" fullWidth aria-labelledby="onay-baslik">
        {istek && (
          <>
            <DialogBasligi baslik={<span id="onay-baslik">{istek.baslik}</span>} ikon={<DeleteIcon />} onKapat={() => kapat(false)} />
            <DialogContent sx={{ py: 2.5 }}>
              <Typography sx={{ color: RENK.murekkep, fontSize: 16, lineHeight: 1.5 }}>{istek.mesaj}</Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button variant="outlined" color="inherit" onClick={() => kapat(false)}>
                Vazgeç
              </Button>
              <Button variant="contained" startIcon={<DeleteIcon />} onClick={() => kapat(true)} autoFocus>
                {istek.onayEtiket}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </OnayContext.Provider>
  );
};

export const useOnay = () => useContext(OnayContext) || tarayiciOnayi;
