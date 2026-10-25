import React, { useState } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { useETicaret } from './eticaret/useETicaret';
import IstatistikSatiri from './eticaret/bilesenler/IstatistikSatiri';
import Sekmeler from './eticaret/bilesenler/Sekmeler';
import SatisListesi from './eticaret/bilesenler/SatisListesi';
import PlatformListesi from './eticaret/bilesenler/PlatformListesi';
import SatisFormModal from './eticaret/bilesenler/SatisFormModal';
import PlatformFormModal from './eticaret/bilesenler/PlatformFormModal';
import SatisDetayModal from './eticaret/bilesenler/SatisDetayModal';

// E-Ticaret sayfasının kabuğu: oturum rolü, seçili sekme ve platform süzgeci burada; sunucu verisi, pencere durumları ve komisyon
// hesabı useETicaret hook'undan (./eticaret/) gelir; liste, çipler ve pencereler yalnızca çizim yapar (./eticaret/bilesenler/).
const ETicaret = () => {
  const { user } = useAuth();
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const isAdmin = user?.rol === 'admin';
  // Kâr: sayfayı görebilen herkes (admin ya da e-ticaret yetkisi olan) görür; platform yönetimi yine yalnız admin'in
  const karGor = isAdmin || !!user?.eticaret_yetkisi;
  const [tab, setTab] = useState(0);
  // Platform filtre
  const [platformFiltre, setPlatformFiltre] = useState('');
  const e = useETicaret();

  return (
    <Box>
      <IstatistikSatiri stats={e.stats} hesaplananToplamKar={e.hesaplananToplamKar} karGor={karGor} />

      <Sekmeler
        tab={tab}
        setTab={setTab}
        platformFiltre={platformFiltre}
        setPlatformFiltre={setPlatformFiltre}
        platformlar={e.platformlar}
        isAdmin={isAdmin}
        onYeniSatis={() => e.openSatisDialog()}
        onYeniPlatform={() => e.openPlatformDialog()}
      />

      {/* Satışlar Tab */}
      {tab === 0 && (
        <SatisListesi
          satislar={e.satislar}
          platformFiltre={platformFiltre}
          isMobile={isMobile}
          karGor={karGor}
          onDetay={(s) => e.setDetayDialog({ open: true, data: s })}
          onDuzenle={e.openSatisDialog}
          onSil={e.handleSatisDelete}
        />
      )}

      {/* Platformlar Tab */}
      {tab === 1 && (
        <PlatformListesi platformlar={e.platformlar} isMobile={isMobile} isAdmin={isAdmin} onDuzenle={e.openPlatformDialog} onSil={e.handlePlatformDelete} />
      )}

      <SatisFormModal e={e} stokOptions={e.stokOptions} platformlar={e.platformlar} karGor={karGor} isMobile={isMobile} />

      <PlatformFormModal e={e} isMobile={isMobile} />

      <SatisDetayModal
        open={e.detayDialog.open}
        data={e.detayDialog.data}
        onClose={() => e.setDetayDialog({ open: false, data: null })}
        onDuzenle={e.openSatisDialog}
        isMobile={isMobile}
        karGor={karGor}
      />
    </Box>
  );
};

export default ETicaret;
