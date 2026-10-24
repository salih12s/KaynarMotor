import React from 'react';
import { Box, Button, ButtonBase, Typography, Fade } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CalculateIcon from '@mui/icons-material/Calculate';
import { KATEGORILER } from '../../../vitrinSabitleri';
import { RENK, YAZI, ODAK } from '../../../VitrinOrtak';
import { RED, KATEGORI_ICON } from '../kategoriSabitleri';
import TaksitHesaplaDialog from './TaksitHesaplaDialog';

// Giriş (video) ekranı: marka başlığı, taksit ve servis düğmeleri, 6 kategori kartı. Masaüstünde video tüm ekranı kaplar.
const GirisEkrani = ({ s, isMobile, navigate }) => {
  const { taksitOpen, setTaksitOpen, enterKategori } = s;
  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        bgcolor: '#000',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: YAZI.govde,
      }}
    >
      {/* Üst bar: logo + Taksit Hesapla + Servise Git */}
      <Box
        sx={{
          position: { xs: 'relative', md: 'absolute' },
          top: 0,
          left: 0,
          right: 0,
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          px: { xs: 2, md: 5 },
          py: { xs: 1.5, md: 3 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span className="kmt-logo-wrap" style={{ width: 36, height: 40, overflow: 'hidden', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
            <img
              className="kmt-logo"
              src="/KaynarMotor.png"
              alt="Kaynar Motor"
              width="36"
              height="40"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', filter: 'brightness(0) invert(1)' }}
            />
          </span>
          <Typography sx={{ fontWeight: 700, letterSpacing: 1, fontSize: { xs: 14, md: 22 }, whiteSpace: 'nowrap' }}>
            KAYNAR <span style={{ color: RED }}>MOTOR</span>
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 1.5 } }}>
          <Button
            variant="outlined"
            startIcon={!isMobile && <CalculateIcon />}
            onClick={() => setTaksitOpen(true)}
            sx={{
              whiteSpace: 'nowrap',
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.6)',
              fontSize: { xs: 12, md: 14 },
              px: { xs: 1.25, md: 2 },
              '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            Taksit Hesapla
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={!isMobile && <LoginIcon />}
            onClick={() => navigate('/login')}
            sx={{ whiteSpace: 'nowrap', fontSize: { xs: 12, md: 14 }, px: { xs: 1.5, md: 2.5 }, boxShadow: '0 4px 20px rgba(198,40,40,0.5)' }}
          >
            Servise Git
          </Button>
        </Box>
      </Box>

      {/* Arka plan videosu */}
      <Box
        sx={{
          position: { xs: 'relative', md: 'absolute' },
          inset: { md: 0 },
          width: '100%',
          height: { md: '100%' },
          aspectRatio: { xs: '16 / 9', md: 'auto' },
          zIndex: 0,
          bgcolor: '#000',
        }}
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          // Hareketi azaltma tercihi açıksa video oynatılmaz, ilk karede durur
          ref={(v) => {
            if (v && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
              v.removeAttribute('autoplay');
              v.pause();
            }
          }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center bottom', background: '#000' }}
        >
          <source src="/KaynarMotorYeniVideo.mp4" type="video/mp4" />
        </video>
        {/* Yazıların okunması için üst ve alt kenarda hafif karartma; videonun ortası açık kalır */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: { xs: 'none', md: 'block' },
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.18) 24%, rgba(0,0,0,0) 40%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.78) 100%)',
          }}
        />
      </Box>

      {/* İçerik: masaüstünde başlık üstte, kategori şeridi altta; telefonda videonun altında alt alta */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: { md: 'space-between' },
          alignItems: 'center',
          textAlign: 'center',
          px: { xs: 2, md: 5 },
          pt: { xs: 2.5, md: 12 },
          pb: { xs: 2, md: 2.5 },
        }}
      >
        <Fade in timeout={800}>
          <Box sx={{ maxWidth: 900, width: '100%' }}>
            <Typography
              component="h1"
              sx={{
                fontFamily: YAZI.baslik,
                fontWeight: 700,
                fontSize: { xs: 34, sm: 44, md: 58 },
                lineHeight: 1.02,
                textShadow: '0 2px 24px rgba(0,0,0,0.7)',
              }}
            >
              İhtiyacınız olan her şey <span style={{ color: RENK.kirmiziAcik }}>tek çatı altında</span>
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.82)', fontSize: { xs: 15, md: 18 }, mt: 1.25, textShadow: '0 1px 12px rgba(0,0,0,0.7)' }}>
              Aşağıdan bir hizmet seçin, sizi ilgili sayfaya götürelim.
            </Typography>
          </Box>
        </Fade>

        <Box sx={{ width: '100%', maxWidth: 1400, mt: { xs: 3, md: 0 } }}>
          {/* Kategori kartları */}
          <Box
            sx={{
              display: 'grid',
              gap: { xs: 1, md: 1.25 },
              gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', md: 'repeat(6, minmax(0, 1fr))' },
            }}
          >
            {KATEGORILER.map((k, i) => (
              <ButtonBase
                key={k.key}
                onClick={() => enterKategori(i)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  textAlign: 'left',
                  gap: { xs: 1, md: 1.25 },
                  minWidth: 0,
                  minHeight: { xs: 72, md: 78 },
                  p: { xs: 1.25, md: 1.5 },
                  borderRadius: 2,
                  color: '#fff',
                  fontFamily: 'inherit',
                  bgcolor: 'rgba(14,14,16,0.66)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.26)',
                  ...ODAK,
                  transition: 'background-color .2s ease, border-color .2s ease, transform .2s ease',
                  '&:hover': { bgcolor: 'rgba(34,21,23,0.88)', borderColor: RENK.kirmiziAcik, transform: 'translateY(-2px)' },
                }}
              >
                <Box
                  sx={{
                    width: { xs: 32, md: 36 },
                    height: { xs: 32, md: 36 },
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 1.25,
                    bgcolor: 'rgba(198,40,40,0.22)',
                    color: RENK.kirmiziAcik,
                    '& .MuiSvgIcon-root': { fontSize: { xs: 20, md: 22 } },
                  }}
                >
                  {KATEGORI_ICON[k.key]}
                </Box>
                <Typography sx={{ flex: 1, minWidth: 0, fontFamily: YAZI.baslik, fontWeight: 700, fontSize: { xs: 17, md: 19 }, lineHeight: 1.05 }}>
                  {k.label}
                </Typography>
                <ArrowForwardIcon sx={{ flexShrink: 0, fontSize: 16, color: 'rgba(255,255,255,0.72)' }} />
              </ButtonBase>
            ))}
          </Box>
          <Typography variant="caption" sx={{ display: 'block', mt: { xs: 2.5, md: 2 }, color: 'rgba(255,255,255,0.6)' }}>
            © {new Date().getFullYear()} Kaynar Motor
          </Typography>
        </Box>
      </Box>

      <TaksitHesaplaDialog open={taksitOpen} onClose={() => setTaksitOpen(false)} isMobile={isMobile} />
    </Box>
  );
};

export default GirisEkrani;
