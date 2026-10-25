import React, { useState } from 'react';
import { Box, Tabs, Tab, TextField, MenuItem, CircularProgress, Alert, useTheme, useMediaQuery } from '@mui/material';
import { RENK } from '../../app/tokenlar';
import { useAuth } from '../auth/AuthContext';
import { useRaporVerisi } from './useRaporVerisi';
import { useDetayModal } from './useDetayModal';
import { hesaplaToplamlar, yatirimciOzetBirlestir } from './raporHesap';
import type { AksesuarSatis, EticaretSatis, IsEmriDetayi, Motor } from '../../shared/tipler';
import TarihFiltresi from './bilesenler/TarihFiltresi';
import YatirimciRapor from './sekmeler/YatirimciRapor';
import GenelOzet from './sekmeler/GenelOzet';
import MotorSatislari from './sekmeler/MotorSatislari';
import IsEmirleri from './sekmeler/IsEmirleri';
import AksesuarSatislari from './sekmeler/AksesuarSatislari';
import ETicaret from './sekmeler/ETicaret';
import YedekParca from './sekmeler/YedekParca';
import FisKarAnalizi from './sekmeler/FisKarAnalizi';
import Yatirimcilar from './sekmeler/Yatirimcilar';
import IsEmriDetayModal from './modallar/IsEmriDetayModal';
import MotorDetayModal from './modallar/MotorDetayModal';
import AksesuarDetayModal from './modallar/AksesuarDetayModal';
import ETicaretDetayModal from './modallar/ETicaretDetayModal';

// Raporlar sayfasının kabuğu: oturum rolü, seçili sekme ve süzgeçler burada; veri useRaporVerisi'nden,
// hesaplar raporHesap.js'den gelir; sekmeler ve detay pencereleri yalnızca çizim yapar.
const Raporlar = () => {
  const { user } = useAuth();
  const isYatirimci = user?.rol === 'yatirimci';
  const isAdmin = user?.rol === 'admin';
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [tab, setTab] = useState(0);
  const [motorSubTab, setMotorSubTab] = useState(0);
  const [komisyoncuFilter, setKomisyoncuFilter] = useState('');
  const [seciliPersonel, setSeciliPersonel] = useState('');
  const veri = useRaporVerisi({ yatirimci: isYatirimci, admin: isAdmin });
  const { rapor, fisKar, loading, error, personeller, stokOptions } = veri;
  const isEmriModal = useDetayModal<IsEmriDetayi>();
  const aksesuarModal = useDetayModal<AksesuarSatis>();
  const eticaretModal = useDetayModal<EticaretSatis>();
  const motorModal = useDetayModal<Motor>();

  const toplamlar = hesaplaToplamlar(rapor);
  const yatirimciOzetGosterim = yatirimciOzetBirlestir(rapor, veri.yatirimciOzet);

  if (isYatirimci) return <YatirimciRapor isMobile={isMobile} />;

  return (
    <Box>
      <Box sx={{ mb: 2, borderBottom: `1px solid ${RENK.cizgi}` }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          TabIndicatorProps={{ sx: { bgcolor: RENK.kirmizi } }}
          sx={{ '& .MuiTab-root': { fontWeight: 700 } }}
        >
          <Tab label="Genel Özet" />
          <Tab label="Motor Satışları" />
          <Tab label="İş Emirleri" />
          <Tab label="Aksesuar Satışları" />
          <Tab label="E-Ticaret" />
          <Tab label="Yedek Parça" />
          <Tab label="Fiş Kâr Analizi" />
          {isAdmin && <Tab label="Yatırımcılar" />}
        </Tabs>
      </Box>

      <TarihFiltresi baslangic={veri.baslangic} bitis={veri.bitis} setBaslangic={veri.setBaslangic} setBitis={veri.setBitis} presetler={veri.presetler}>
        {tab === 2 && (
          <TextField
            size="small"
            select
            value={seciliPersonel}
            onChange={(e) => setSeciliPersonel(e.target.value)}
            SelectProps={{ displayEmpty: true, renderValue: (v) => (v as string) || 'Personel', SelectDisplayProps: { 'aria-label': 'Personel' } }}
            inputProps={{ 'aria-label': 'Personel' }}
            sx={{ minWidth: { xs: '100%', sm: 220 } }}
          >
            <MenuItem value="">Tümü</MenuItem>
            {personeller.map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </TextField>
        )}
      </TarihFiltresi>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#C62828' }} />
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {tab === 0 && rapor && !loading && <GenelOzet rapor={rapor} toplamlar={toplamlar} isMobile={isMobile} onSekmeAc={setTab} />}
      {tab === 1 && rapor && !loading && (
        <MotorSatislari
          rapor={rapor}
          isMobile={isMobile}
          onDetay={motorModal.ac}
          motorSubTab={motorSubTab}
          setMotorSubTab={setMotorSubTab}
          komisyoncuFilter={komisyoncuFilter}
          setKomisyoncuFilter={setKomisyoncuFilter}
        />
      )}
      {tab === 2 && rapor && !loading && <IsEmirleri rapor={rapor} isMobile={isMobile} seciliPersonel={seciliPersonel} onDetay={isEmriModal.ac} />}
      {tab === 3 && rapor && !loading && <AksesuarSatislari rapor={rapor} isMobile={isMobile} onDetay={aksesuarModal.ac} />}
      {tab === 4 && rapor && !loading && (
        <ETicaret rapor={rapor} hesaplananEticaretKar={toplamlar.hesaplananEticaretKar} isMobile={isMobile} onDetay={eticaretModal.ac} />
      )}
      {tab === 5 && rapor && !loading && <YedekParca rapor={rapor} isMobile={isMobile} />}
      {tab === 6 && !loading && <FisKarAnalizi fisKar={fisKar} isMobile={isMobile} />}
      {tab === 7 && isAdmin && !loading && <Yatirimcilar yatirimciOzetGosterim={yatirimciOzetGosterim} isMobile={isMobile} />}

      <IsEmriDetayModal open={isEmriModal.open} data={isEmriModal.data} onClose={isEmriModal.kapat} isMobile={isMobile} />
      <MotorDetayModal open={motorModal.open} data={motorModal.data} onClose={motorModal.kapat} isMobile={isMobile} />
      <AksesuarDetayModal open={aksesuarModal.open} data={aksesuarModal.data} onClose={aksesuarModal.kapat} isMobile={isMobile} stokOptions={stokOptions} />
      <ETicaretDetayModal open={eticaretModal.open} data={eticaretModal.data} onClose={eticaretModal.kapat} isMobile={isMobile} />
    </Box>
  );
};

export default Raporlar;
