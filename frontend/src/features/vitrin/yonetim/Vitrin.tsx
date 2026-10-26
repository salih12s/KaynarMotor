import React, { useState, useCallback } from 'react';
import { Box, Tabs, Tab, Paper, Snackbar, Alert } from '@mui/material';
import { useAuth } from '../../auth/AuthContext';
import { KATEGORILER, HIZMET_KATEGORILER } from '../vitrinSabitleri';
import { useIlanListesi } from './useIlanListesi';
import { useVitrinReferans } from './useVitrinReferans';
import { useIlanFormu } from './useIlanFormu';
import { useIletisimFormu } from './useIletisimFormu';
import type { Bildir, BildirimTuru } from './tipler';
import HizmetPaneli from './bilesenler/HizmetPaneli';
import IletisimSatiri from './bilesenler/IletisimSatiri';
import AramaSatiri from './bilesenler/AramaSatiri';
import IlanListesi from './bilesenler/IlanListesi';
import IlanDialog from './bilesenler/IlanDialog';
import IletisimDialog from './bilesenler/IletisimDialog';

// Vitrin yönetim sayfasının kabuğu: yetkiye göre kategori sekmeleri ve bildirim kutusu burada; ilan listesi, form, iletişim
// ve yardımcı veriler hook'lardan gelir (./use*.js); liste, kartlar ve pencereler yalnızca çizim yapar (./bilesenler/).
const Vitrin = () => {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';
  // Yetkiye göre görünen vitrin kategorileri: admin hepsini, personel yalnızca izinli olduğu vitrini yönetir
  const gorunenKategoriler = isAdmin
    ? KATEGORILER
    : KATEGORILER.filter((k) => (k.key === 'motor' && user?.motor_vitrin_yetkisi) || (k.key === 'aksesuar' && user?.aksesuar_vitrin_yetkisi));

  const [tab, setTab] = useState(0);
  const aktifKategori = gorunenKategoriler[tab] || gorunenKategoriler[0] || KATEGORILER[0];
  const kategori = aktifKategori.key;
  const isMotor = kategori === 'motor';
  const isAksesuar = kategori === 'aksesuar';
  const isHizmet = HIZMET_KATEGORILER.includes(kategori);

  const [snack, setSnack] = useState<{ open: boolean; msg: string; sev: BildirimTuru }>({ open: false, msg: '', sev: 'success' });
  // Kararlı kimlik: ilan listesi hook'u bunu bağımlılık olarak alır (her render'da değişse liste sürekli yeniden yüklenirdi)
  const showSnack = useCallback<Bildir>((msg, sev = 'success') => setSnack({ open: true, msg, sev }), []);

  const liste = useIlanListesi({ kategori, isAdmin, bildir: showSnack });
  const ref = useVitrinReferans();
  const f = useIlanFormu({ kategori, isMotor, urunler: liste.urunler, videoLimitMb: ref.videoLimitMb, bildir: showSnack, yenile: liste.loadUrunler });
  const ilet = useIletisimFormu({ kategori, iletisim: ref.iletisim, yenileIletisim: ref.loadIletisim, bildir: showSnack });
  const curIletisim = ref.iletisim[kategori];

  return (
    <Box>
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v: number) => {
            setTab(v);
            liste.setArama('');
            liste.setGorunum('aktif');
          }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {gorunenKategoriler.map((k) => (
            <Tab key={k.key} label={k.label} />
          ))}
        </Tabs>
      </Paper>

      {isHizmet ? (
        /* ---- HİZMET SAYFASI AYAR PANELİ (bu kategoride ilan yok) ---- */
        <HizmetPaneli curIletisim={curIletisim} kategori={kategori} aktifKategori={aktifKategori} onDuzenle={ilet.openIletisim} />
      ) : (
        <>
          <IletisimSatiri curIletisim={curIletisim} onIletisim={ilet.openIletisim} onYeni={f.openNew} />
          <AramaSatiri
            arama={liste.arama}
            setArama={liste.setArama}
            gorunum={liste.gorunum}
            setGorunum={liste.setGorunum}
            aktifSayisi={liste.aktifler.length}
            arsivSayisi={liste.arsivdekiler.length}
          />
          <IlanListesi liste={liste} isAdmin={isAdmin} isMotor={isMotor} onDuzenle={f.openEdit} />
        </>
      )}

      <IlanDialog
        f={f}
        aktifKategori={aktifKategori}
        isMotor={isMotor}
        isAksesuar={isAksesuar}
        isAdmin={isAdmin}
        stokMotorlar={ref.stokMotorlar}
        sifirModeller={ref.sifirModeller}
        stokAksesuarlar={ref.stokAksesuarlar}
        segmentler={ref.segmentler}
        videoLimitMb={ref.videoLimitMb}
      />

      <IletisimDialog ilet={ilet} aktifKategori={aktifKategori} isHizmet={isHizmet} kategori={kategori} iletisim={ref.iletisim} />

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.sev} onClose={() => setSnack({ ...snack, open: false })}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Vitrin;
