import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import { VitrinTema, RENK, YAZI } from '../VitrinOrtak';
import { useStorefront } from './storefront/useStorefront';
import GirisEkrani from './storefront/bilesenler/GirisEkrani';
import UstBar from './storefront/bilesenler/UstBar';
import MobilMenu from './storefront/bilesenler/MobilMenu';
import HizmetSayfasi from './storefront/bilesenler/HizmetSayfasi';
import DurumSecimi from './storefront/bilesenler/DurumSecimi';
import SayfaBasi from './storefront/bilesenler/SayfaBasi';
import MotorFiltreleri from './storefront/bilesenler/MotorFiltreleri';
import IlanAlani from './storefront/bilesenler/IlanAlani';
import TaksitHesaplaDialog from './storefront/bilesenler/TaksitHesaplaDialog';

// Mağaza sayfasının kabuğu: ekran boyutu ve detaydan geri dönüş durumu burada; tüm durum ve yükleme hook'ta (./storefront/useStorefront),
// ekranın her bölümü ayrı bir bileşendir (./storefront/bilesenler/).
const Storefront = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  // Filtre sütunu md altında üste taşınır ve aç/kapa olur
  const darEkran = useMediaQuery(theme.breakpoints.down('md'));
  const geriDonus = location.state?.storefront;

  const s = useStorefront({ geriDonus, navigate });

  // ---- GİRİŞ (VIDEO) EKRANI ----
  if (s.intro) return <GirisEkrani s={s} isMobile={isMobile} navigate={navigate} />;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: RENK.zemin, color: RENK.murekkep, display: 'flex', flexDirection: 'column', fontFamily: YAZI.govde }}>
      {/* Tek parça siyah header — logo + menüler + Servise Git */}
      <UstBar s={s} isMobile={isMobile} navigate={navigate} />

      {/* Mobil menü çekmecesi */}
      <MobilMenu s={s} />

      {s.isHizmet ? (
        /* ---- HİZMET SAYFASI: resim + telefon + WhatsApp (ilan yok) ---- */
        <HizmetSayfasi s={s} />
      ) : s.durumSecimi ? (
        /* ---- MOTOR: önce Sıfır / İkinci El seçimi ---- */
        <DurumSecimi s={s} />
      ) : (
        <>
          {/* Sayfa başı: başlık, ilan sayısı, arama; masaüstünde altında iletişim kişileri */}
          <SayfaBasi s={s} />

          {/* Motor filtreleri: masaüstünde iki kısa satır, dar ekranda açılır panel */}
          {s.isMotor && <MotorFiltreleri s={s} darEkran={darEkran} />}

          {/* İlan ızgarası */}
          <IlanAlani s={s} />
        </>
      )}

      {/* Taksit hesaplama penceresi (header'dan açılır, giriş gerektirmez) */}
      <TaksitHesaplaDialog open={s.taksitOpen} onClose={() => s.setTaksitOpen(false)} isMobile={isMobile} />

      {/* Footer */}
      <Box sx={{ bgcolor: RENK.asfalt, color: 'rgba(255,255,255,0.7)', py: 3, mt: 6, textAlign: 'center' }}>
        <Typography variant="body2">© {new Date().getFullYear()} Kaynar Motor</Typography>
      </Box>
    </Box>
  );
};

// Vitrin teması (yazı tipi, renkler) yalnızca müşteri sayfalarını sarar; yönetim paneli etkilenmez
const StorefrontSayfa = () => (
  <VitrinTema>
    <Storefront />
  </VitrinTema>
);

export default StorefrontSayfa;
