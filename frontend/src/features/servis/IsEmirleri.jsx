import React, { useState } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { isEmriService } from './servisApi';
import { useAuth, useKarGor } from '../auth/AuthContext';
import { useIsEmirleri } from './isEmirleri/useIsEmirleri';
import { useIsEmriDetayi } from './isEmirleri/useIsEmriDetayi';
import { useIsEmriFormu } from './isEmirleri/useIsEmriFormu';
import { filtrele, istatistikler } from './isEmirleri/isEmriVeri';
import { printIsEmri } from './isEmirleri/servisYazdir';
import IstatistikSatiri from './isEmirleri/IstatistikSatiri';
import Suzgecler from './isEmirleri/Suzgecler';
import IsEmriListesi from './isEmirleri/IsEmriListesi';
import IsEmriFormModal from './isEmirleri/IsEmriFormModal';
import IsEmriDetayModal from './isEmirleri/IsEmriDetayModal';

// Servis iş emirleri liste sayfasının kabuğu: oturum rolü ve arama/tarih süzgeçleri burada; sunucu verisi, detay ve
// form durumu hook'lardan gelir (./isEmirleri/); liste, çipler ve pencereler yalnızca çizim yapar.
const IsEmirleri = () => {
  const { user } = useAuth();
  const karGor = useKarGor();
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const liste = useIsEmirleri();
  const detay = useIsEmriDetayi();
  const form = useIsEmriFormu({ yenile: liste.yenile });

  const yazdirKayit = async (id) => {
    try { const res = await isEmriService.getById(id); printIsEmri(res.data); } catch {}
  };

  const filtered = filtrele(liste.isEmirleri, { search, startDate, endDate });

  return (
    <Box>
      <IstatistikSatiri istatistik={istatistikler(liste.isEmirleri)} karGor={karGor} onYeni={form.openModal} />

      <Suzgecler search={search} setSearch={setSearch} durumFilter={liste.durumFilter} setDurumFilter={liste.setDurumFilter}
        startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} />

      <IsEmriListesi filtered={filtered} isMobile={isMobile} karGor={karGor} isAdmin={user?.rol === 'admin'}
        onDetay={detay.ac} onYazdir={yazdirKayit} onDuzenle={form.openEditModal} onSil={liste.sil} />

      <IsEmriFormModal form={form} kullanicilar={liste.kullanicilar} isMobile={isMobile} />

      <IsEmriDetayModal open={detay.open} data={detay.data} onClose={detay.kapat} onEdit={form.openEditModal} isMobile={isMobile} />
    </Box>
  );
};

export default IsEmirleri;
