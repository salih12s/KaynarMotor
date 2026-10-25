import React from 'react';
import type { StorefrontDurumu } from '../useStorefront';
import { Box, Button, Typography, Stack, Fade } from '@mui/material';
import { RENK, YAZI, IlanKarti, IlanIskelet, ilanIzgarasi, KisiDugmeleri } from '../../../VitrinOrtak';

// İlan ızgarası (yükleniyor iskeleti, boş/sonuç yok mesajları, kartlar) ve dar ekranda iletişim bölümü.
const IlanAlani = ({ s }: { s: StorefrontDurumu }) => {
  const { loading, isMotor, gorunenUrunler, aramaVar, urunler, q, setQ, aktifFiltreSayisi, filtreleriTemizle, motorDurumu, kategori, kisiler, openDetay } = s;
  return (
    <Box sx={{ flex: 1, width: '100%', maxWidth: 1400, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 2.5, md: 2.5 } }}>
      {loading ? (
        <Box sx={ilanIzgarasi(isMotor)} role="status" aria-label="İlanlar yükleniyor">
          {Array.from({ length: isMotor ? 6 : 8 }, (_, i) => (
            <IlanIskelet key={i} buyuk={isMotor} />
          ))}
        </Box>
      ) : gorunenUrunler.length === 0 ? (
        <Box sx={{ py: { xs: 5, md: 9 }, maxWidth: '46ch' }}>
          {aramaVar && urunler.length > 0 ? (
            <>
              <Typography sx={{ fontFamily: YAZI.baslik, fontWeight: 700, fontSize: 28, lineHeight: 1.1 }}>"{q.trim()}" ile eşleşen ilan yok</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Marka ya da model adını daha kısa yazmayı deneyin.
              </Typography>
              <Button variant="outlined" color="inherit" onClick={() => setQ('')} sx={{ mt: 2 }}>
                Aramayı temizle
              </Button>
            </>
          ) : isMotor && aktifFiltreSayisi > 0 ? (
            <>
              <Typography sx={{ fontFamily: YAZI.baslik, fontWeight: 700, fontSize: 28, lineHeight: 1.1 }}>Bu filtrelere uyan motor yok</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Bir filtreyi kaldırırsanız daha fazla ilan görürsünüz.
              </Typography>
              <Button variant="outlined" color="inherit" onClick={filtreleriTemizle} sx={{ mt: 2 }}>
                Filtreleri temizle
              </Button>
            </>
          ) : (
            <>
              <Typography sx={{ fontFamily: YAZI.baslik, fontWeight: 700, fontSize: 28, lineHeight: 1.1 }}>
                {isMotor ? `Şu an ${motorDurumu === 'sifir' ? 'sıfır' : 'ikinci el'} motor ilanı yok` : 'Bu kategoride şu an ilan yok'}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Yeni gelenleri öğrenmek için bizi arayabilirsiniz.
              </Typography>
            </>
          )}
        </Box>
      ) : (
        <Fade in timeout={300} key={`${kategori}-${motorDurumu}`}>
          <Box sx={ilanIzgarasi(isMotor)}>
            {gorunenUrunler.map((u) => (
              <IlanKarti key={u.id} u={u} kucuk={!isMotor} onClick={() => openDetay(u)} />
            ))}
          </Box>
        </Fade>
      )}

      {kisiler.length > 0 && (
        <Box sx={{ display: { xs: 'block', md: 'none' }, mt: 4, pt: 2.5, borderTop: `1px solid ${RENK.cizgi}` }}>
          <Typography sx={{ fontFamily: YAZI.baslik, fontWeight: 700, fontSize: 24, lineHeight: 1.1, mb: 1.5 }}>Sorularınız için arayın</Typography>
          <Stack spacing={1.5}>
            {kisiler.map((k) => (
              <Box key={`${k.ad}-${k.tel}`}>
                {k.ad && (
                  <Typography fontWeight={600} sx={{ mb: 0.5 }}>
                    {k.ad}
                  </Typography>
                )}
                <KisiDugmeleri kisi={k} tamGenislik />
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default IlanAlani;
