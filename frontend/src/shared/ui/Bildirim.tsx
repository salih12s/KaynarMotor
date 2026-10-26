import React, { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert, Snackbar } from '@mui/material';

export type BildirimTuru = 'hata' | 'uyari' | 'bilgi';

interface Bildirim {
  anahtar: number;
  mesaj: string;
  tur: BildirimTuru;
}

const SEVIYE = { hata: 'error', uyari: 'warning', bilgi: 'info' } as const;

// Sağlayıcı ekranda değilse (ör. tek başına çizilen bir bileşen testi, ya da React dışından çağrı) tarayıcının kendi kutusuna düşer.
let kayitliGosterici: ((mesaj: string, tur: BildirimTuru) => void) | null = null;

/**
 * Uygulamanın kendi bildirimi (tarayıcı `alert()` yerine). React dışındaki yardımcılardan da çağrılabilir:
 *   bildir(hataMesaji(err, 'Hata'));  bildir('Yazdırma penceresi açılamadı.', 'uyari');
 * Engellemez (alert gibi akışı durdurmaz); yeni mesaj eskisinin yerini alır.
 */
export const bildir = (mesaj: string, tur: BildirimTuru = 'hata'): void => {
  if (kayitliGosterici) kayitliGosterici(mesaj, tur);
  else alert(mesaj);
};

export const BildirimProvider = ({ children }: { children?: ReactNode }) => {
  const [aktif, setAktif] = useState<Bildirim | null>(null);

  const goster = useCallback((mesaj: string, tur: BildirimTuru) => {
    setAktif((onceki) => ({ anahtar: (onceki?.anahtar ?? 0) + 1, mesaj, tur }));
  }, []);

  useEffect(() => {
    kayitliGosterici = goster;
    return () => {
      if (kayitliGosterici === goster) kayitliGosterici = null;
    };
  }, [goster]);

  const kapat = (_?: unknown, neden?: string) => {
    if (neden === 'clickaway') return; // başka yere tıklamak mesajı kapatmasın
    setAktif(null);
  };

  return (
    <>
      {children}
      <Snackbar key={aktif?.anahtar} open={!!aktif} autoHideDuration={8000} onClose={kapat} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {aktif ? (
          <Alert severity={SEVIYE[aktif.tur]} variant="filled" onClose={() => kapat()} sx={{ width: '100%', maxWidth: 560, whiteSpace: 'pre-line' }}>
            {aktif.mesaj}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  );
};
