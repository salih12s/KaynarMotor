import React, { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Button, Dialog, DialogActions, DialogContent, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DialogBasligi from './DialogBasligi';
import { RENK } from '../../app/tokenlar';

export interface OnaySecenegi {
  baslik?: string;
  onayEtiket?: string;
}

export type OnayFonksiyonu = (mesaj: string, secenek?: OnaySecenegi) => Promise<boolean>;

interface OnayIstegi {
  mesaj: string;
  baslik: string;
  onayEtiket: string;
}

const OnayContext = createContext<OnayFonksiyonu | null>(null);

// Sağlayıcı yoksa (ör. tek başına çizilen bir bileşen testi) tarayıcının kendi kutusuna düşer.
const tarayiciOnayi: OnayFonksiyonu = async (mesaj) => window.confirm(mesaj);

// Uygulamanın kendi silme onay penceresi: const onay = useOnay(); if (!(await onay('Bu kaydı sil?'))) return;
export const OnayProvider = ({ children }: { children?: ReactNode }) => {
  const [istek, setIstek] = useState<OnayIstegi | null>(null);
  const cozucu = useRef<((sonuc: boolean) => void) | null>(null);

  const sor = useCallback<OnayFonksiyonu>(
    (mesaj, secenek = {}) =>
      new Promise<boolean>((coz) => {
        cozucu.current = coz;
        setIstek({ mesaj, baslik: secenek.baslik || 'Silme onayı', onayEtiket: secenek.onayEtiket || 'Sil' });
      }),
    [],
  );

  const kapat = (sonuc: boolean) => {
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
              <Button onClick={() => kapat(false)}>Vazgeç</Button>
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
