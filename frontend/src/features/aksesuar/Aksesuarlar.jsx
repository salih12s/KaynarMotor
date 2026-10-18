import React, { useState } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { useKarGor } from '../auth/AuthContext';
import { useAksesuarlar } from './aksesuarlar/useAksesuarlar';
import IstatistikSatiri from './aksesuarlar/bilesenler/IstatistikSatiri';
import Suzgecler from './aksesuarlar/bilesenler/Suzgecler';
import SatisListesi from './aksesuarlar/bilesenler/SatisListesi';
import SatisFormModal from './aksesuarlar/bilesenler/SatisFormModal';
import SatisDetayModal from './aksesuarlar/bilesenler/SatisDetayModal';

// Aksesuar satışları sayfası (kabuk): veri ve pencere durumu useAksesuarlar'da, ekran parçaları bilesenler/ altında.
const Aksesuarlar = () => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const karGor = useKarGor();
  const a = useAksesuarlar();
  const [aksSearch, setAksSearch] = useState('');
  const [aksStart, setAksStart] = useState('');
  const [aksEnd, setAksEnd] = useState('');

  return (
    <Box>
      <IstatistikSatiri satislar={a.satislar} stats={a.stats} karGor={karGor} onYeni={() => a.openDialog()} />
      <Suzgecler aksSearch={aksSearch} setAksSearch={setAksSearch} aksStart={aksStart} setAksStart={setAksStart} aksEnd={aksEnd} setAksEnd={setAksEnd} />
      <SatisListesi satislar={a.satislar} aksSearch={aksSearch} aksStart={aksStart} aksEnd={aksEnd} isMobile={isMobile} karGor={karGor}
        onDetay={a.detayAc} onDuzenle={a.openDialog} onSil={a.handleDelete} />
      <SatisFormModal a={a} isMobile={isMobile} karGor={karGor} />
      <SatisDetayModal open={a.detayDialog.open} data={a.detayDialog.data} onClose={() => a.setDetayDialog({ open: false, data: null })}
        onDuzenle={a.openDialog} stokOptions={a.stokOptions} karGor={karGor} isMobile={isMobile} />
    </Box>
  );
};

export default Aksesuarlar;
