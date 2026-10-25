import React, { useState, useRef } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { filtrele } from './ikinciElMotor/satisVeri';
import { excelHtml, excelIndir } from './ikinciElMotor/excel';
import { useSatisListesi } from './ikinciElMotor/useSatisListesi';
import { useSatisFormu } from './ikinciElMotor/useSatisFormu';
import IstatistikSatiri from './ikinciElMotor/bilesenler/IstatistikSatiri';
import Suzgecler from './ikinciElMotor/bilesenler/Suzgecler';
import SatisListesi from './ikinciElMotor/bilesenler/SatisListesi';
import SatisFormModal from './ikinciElMotor/bilesenler/SatisFormModal';
import MotorDetayModal from './ikinciElMotor/bilesenler/MotorDetayModal';

// İkinci El Motor (satış kayıtları) sayfasının kabuğu: rol/izin bayrakları ve arama/tarih süzgeçleri burada; sunucu verisi ve form
// durumu hook'lardan gelir (./ikinciElMotor/use*.js); liste, çipler ve pencereler yalnızca çizim yapar (./ikinciElMotor/bilesenler/).
const IkinciElMotor = () => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';
  // Motor Satış yetkilisi satış/müşteri/geçmişi/alış fiyatını görür ve düzenler; yalnızca kâr admindedir
  // Muhasebeci: admin izin verdiyse sayfayı SALT OKUNUR görür (alım/satım, noter, satış ve kişi bilgisi; kâr yok)
  const salt = user?.rol === 'muhasebeci';
  const canAlis = isAdmin || salt || !!user?.alis_fiyati_gor || !!user?.motor_satis_yetkisi;
  const canKar = isAdmin; // kâr ve yatırımcı payı yalnızca admin'e açık

  const liste = useSatisListesi();
  const form = useSatisFormu({ salt, yenile: liste.yenile });
  const printRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [tarihBaslangic, setTarihBaslangic] = useState('');
  const [tarihBitis, setTarihBitis] = useState('');

  const filteredMotorlar = filtrele(liste.motorlar, { search, tarihBaslangic, tarihBitis });

  return (
    <Box>
      <IstatistikSatiri motorlar={liste.motorlar} stats={liste.stats} canKar={canKar} />

      <Suzgecler
        search={search}
        setSearch={setSearch}
        tarihBaslangic={tarihBaslangic}
        setTarihBaslangic={setTarihBaslangic}
        tarihBitis={tarihBitis}
        setTarihBitis={setTarihBitis}
        salt={salt}
        onExcel={() => excelIndir(excelHtml(filteredMotorlar, { canAlis, canKar }))}
        onYeni={() => form.openDialog()}
      />

      <SatisListesi
        filteredMotorlar={filteredMotorlar}
        isMobile={isMobile}
        canAlis={canAlis}
        canKar={canKar}
        salt={salt}
        isAdmin={isAdmin}
        onDetay={liste.detayAc}
        onDuzenle={form.openDialog}
        onSil={liste.sil}
      />

      <SatisFormModal form={form} stokMotorlar={liste.stokMotorlar} yatirimciMap={liste.yatirimciMap} canAlis={canAlis} canKar={canKar} isMobile={isMobile} />

      {/* Motor Detay Modal */}
      <MotorDetayModal
        open={liste.detayModal.open}
        data={liste.detayModal.data}
        onClose={liste.detayKapat}
        printRef={printRef}
        isMobile={isMobile}
        canAlis={canAlis}
        canKar={canKar}
        salt={salt}
      />
    </Box>
  );
};

export default IkinciElMotor;
