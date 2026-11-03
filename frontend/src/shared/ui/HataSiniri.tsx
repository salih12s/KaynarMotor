/*
 * Hata sınırı (ErrorBoundary): çocuklarından birinin çizimi sırasında fırlayan hata bütün uygulamayı değil, yalnız bu bölümü uyarıya çevirir.
 *
 * Neden: sınır yokken tek bir bileşendeki çalışma zamanı hatası React ağacını söküp bütün paneli (menü dahil) beyaz ekrana çeviriyordu.
 * Layout içerik alanını `key={pathname}` ile sarar: menü ayakta kalır, başka sayfaya geçilince hata temizlenir.
 *
 * Yeni sürüm yayınlanınca eski parça adı (React.lazy ile yüklenen dosya) sunucuda artık yoktur ve yükleme hatası verir. Bu durumda sayfa
 * BİR kez yenilenir (yeni sürüm gelir); yenilemeden hemen sonra yine hata gelirse döngüye girmez, kullanıcıya "yenileyin" denir.
 *
 * Kullanıcıya hatanın iç ayrıntısı (mesaj, yığın) gösterilmez; konsola yazılır.
 */
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert, AlertTitle, Box, Button } from '@mui/material';

const PARCA_HATASI =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk [\w-]+ failed|Loading CSS chunk/i;
const SON_YENILEME = 'hata-siniri-son-yenileme';
const YENILEME_ARALIGI_MS = 60_000; // bu süre içinde ikinci kez otomatik yenilenmez

/** React.lazy ile yüklenen parça indirilemedi mi? (yeni sürüm sonrası eski dosya adı) */
export const parcaYuklenemediMi = (hata: unknown): boolean => {
  if (!hata) return false;
  const e = hata as { name?: unknown; message?: unknown };
  return e.name === 'ChunkLoadError' || PARCA_HATASI.test(String(e.message ?? hata));
};

/** Son otomatik yenilemeden bu yana yeterli süre geçtiyse true ve zamanı kaydeder (tarayıcı depolaması yoksa yenileme yapılmaz). */
const yenilemeHakkiVarMi = (): boolean => {
  try {
    const son = Number(sessionStorage.getItem(SON_YENILEME) || 0);
    if (Date.now() - son < YENILEME_ARALIGI_MS) return false;
    sessionStorage.setItem(SON_YENILEME, String(Date.now()));
    return true;
  } catch {
    return false;
  }
};

interface Props {
  children: ReactNode;
  /** Sayfayı yenileyen işlev (test için değiştirilebilir). Varsayılan: window.location.reload */
  yenile?: () => void;
}
interface Durum {
  hata: Error | null;
}

export default class HataSiniri extends Component<Props, Durum> {
  state: Durum = { hata: null };

  static getDerivedStateFromError(hata: Error): Durum {
    return { hata };
  }

  componentDidCatch(hata: Error, bilgi: ErrorInfo) {
    console.error('Ekran hatası:', hata, bilgi.componentStack);
    if (parcaYuklenemediMi(hata) && yenilemeHakkiVarMi()) (this.props.yenile ?? (() => window.location.reload()))();
  }

  private yenidenDene = () => this.setState({ hata: null });

  render() {
    const { hata } = this.state;
    if (!hata) return this.props.children;
    const parca = parcaYuklenemediMi(hata);
    return (
      <Box sx={{ p: 2 }}>
        <Alert
          severity="error"
          action={
            <>
              <Button color="inherit" size="small" onClick={this.yenidenDene}>
                Yeniden dene
              </Button>
              <Button color="inherit" size="small" onClick={() => (this.props.yenile ?? (() => window.location.reload()))()}>
                Sayfayı yenile
              </Button>
            </>
          }
        >
          <AlertTitle>Bu ekran açılamadı</AlertTitle>
          {parca
            ? 'Yeni bir sürüm yayınlanmış olabilir. Sayfayı yenileyin.'
            : 'Beklenmeyen bir hata oluştu. Menüden başka bir ekrana geçebilir ya da yeniden deneyebilirsiniz.'}
        </Alert>
      </Box>
    );
  }
}
