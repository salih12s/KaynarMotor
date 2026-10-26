import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, TextField, InputAdornment, Tabs, Tab, useTheme, useMediaQuery } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { ikinciElMotorService, sifirMotorService } from './motorApi';
import type { Motor, SifirMotor } from '../../shared/tipler';
import { RENK } from '../../app/tokenlar';
import { bildir, useOnay } from '../../shared/ui';
import { hataMesaji } from '../../shared/api/istemci';
import { useSifirMotorlar } from './motorSorgulari';
import { sifirAdi, sifirSatisMi } from './sifirMotor/sifirVeri';
import { useSifirMotorFormu } from './sifirMotor/useSifirMotorFormu';
import SifirStok from './sifirMotor/bilesenler/SifirStok';
import SifirMotorFormModal from './sifirMotor/bilesenler/SifirMotorFormModal';
import { useAuth } from '../auth/AuthContext';
import { motorYetkileri } from './motorStok/yetkiler';
import { filtrele } from './motorStok/motorStokVeri';
import { useMotorStok } from './motorStok/useMotorStok';
import { useMusteriAra } from './motorStok/useMusteriAra';
import { useMotorFormu } from './motorStok/useMotorFormu';
import { useHizliSatis } from './motorStok/useHizliSatis';
import IstatistikCipleri from './motorStok/bilesenler/IstatistikCipleri';
import MotorListesi from './motorStok/bilesenler/MotorListesi';
import MotorFormModal from './motorStok/bilesenler/MotorFormModal';
import HizliSatisModal from './motorStok/bilesenler/HizliSatisModal';
import StokDetayModal from './motorStok/bilesenler/StokDetayModal';

const BOS: SifirMotor[] = [];

// Motor Stok sayfasının kabuğu: rol/izin bayrakları (yetkiler.js), arama ve durum süzgeçleri burada; sunucu verisi, form ve hızlı satış
// durumu hook'lardan gelir (./motorStok/use*.js); liste, çipler ve pencereler yalnızca çizim yapar (./motorStok/bilesenler/).
const MotorStok = () => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const { user } = useAuth();
  const perms = motorYetkileri(user);
  const { isYatirimci, isYatirimciSahip, canAlis, canMusteri, canListe, canKar, canEdit } = perms;

  const { motorlar: tumKayitlar, yatirimcilar, yenile, sil } = useMotorStok({ user });
  // İkinci el stoğu: sıfır stoktan yapılmış satışlar burada görünmez (Motor Satış'ta ve raporda görünür)
  const motorlar = useMemo(() => tumKayitlar.filter((m) => !sifirSatisMi(m)), [tumKayitlar]);
  const navigate = useNavigate();
  const onay = useOnay();
  // Sıfır stok yatırımcıya kapalı (stok onun değil): sekme de istek de yok
  const [sekme, setSekme] = useState<'ikinci_el' | 'sifir'>('ikinci_el');
  const sifirSorgu = useSifirMotorlar({ etkin: !isYatirimci });
  const sifirModeller = sifirSorgu.data ?? BOS;
  const sifirForm = useSifirMotorFormu({ yenile });
  const sifirSil = async (m: SifirMotor) => {
    if (!(await onay(`${sifirAdi(m)} sıfır stoktan silinsin mi? Yapılmış satışlar silinmez; bağlı vitrin ilanı yayından kalkar.`))) return;
    try {
      await sifirMotorService.delete(m.id);
      yenile();
    } catch (err) {
      bildir(hataMesaji(err, 'Silinemedi'));
    }
  };
  const musteri = useMusteriAra();
  const form = useMotorFormu({ yenile });
  const hs = useHizliSatis({ yenile });
  const [detayModal, setDetayModal] = useState<{ open: boolean; data: Motor | null }>({ open: false, data: null });
  const printRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [secondaryFilter, setSecondaryFilter] = useState<string | null>(null);

  const detayAc = async (id: number) => {
    try {
      const res = await ikinciElMotorService.getById(id);
      setDetayModal({ open: true, data: res.data });
    } catch {}
  };

  const filteredMotorlar = filtrele(motorlar, { isYatirimci, activeFilter, secondaryFilter, search });

  const sekmeler = !isYatirimci && (
    <Box sx={{ mb: 2, borderBottom: `1px solid ${RENK.cizgi}` }}>
      <Tabs
        value={sekme}
        onChange={(_, v: 'ikinci_el' | 'sifir') => setSekme(v)}
        TabIndicatorProps={{ sx: { bgcolor: RENK.kirmizi } }}
        sx={{ '& .MuiTab-root': { fontWeight: 700 } }}
      >
        <Tab value="ikinci_el" label="İkinci El" />
        <Tab value="sifir" label={`Sıfır (${sifirModeller.length})`} />
      </Tabs>
    </Box>
  );

  if (sekme === 'sifir' && !isYatirimci) {
    return (
      <Box>
        {sekmeler}
        <SifirStok
          modeller={sifirModeller}
          yukleniyor={sifirSorgu.isLoading}
          canAlis={canAlis}
          canEdit={canEdit}
          isAdmin={perms.isAdmin}
          onYeni={() => sifirForm.ac()}
          onDuzenle={(m) => sifirForm.ac(m)}
          onSil={sifirSil}
          onSatis={(m) => navigate('/ikinci-el-motor', { state: { sifirSatisId: m.id } })}
        />
        <SifirMotorFormModal form={sifirForm} canAlis={canAlis} isMobile={isMobile} />
      </Box>
    );
  }

  return (
    <Box>
      {sekmeler}
      <IstatistikCipleri
        motorlar={motorlar}
        isYatirimci={isYatirimci}
        canEdit={canEdit}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        secondaryFilter={secondaryFilter}
        setSecondaryFilter={setSecondaryFilter}
        onYeni={() => form.openDialog()}
      />

      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Plaka, marka, model veya satıcı adı ile ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <MotorListesi
        filteredMotorlar={filteredMotorlar}
        isMobile={isMobile}
        perms={perms}
        onDetay={detayAc}
        onHizliSatis={hs.openHizliSatis}
        onDuzenle={form.openDialog}
        onSil={sil}
      />

      <MotorFormModal form={form} perms={perms} yatirimcilar={yatirimcilar} musteri={musteri} isMobile={isMobile} />

      <HizliSatisModal hs={hs} perms={perms} musteri={musteri} isMobile={isMobile} />

      {/* Motor Detay Modal */}
      <StokDetayModal
        open={detayModal.open}
        data={detayModal.data}
        onClose={() => setDetayModal({ open: false, data: null })}
        printRef={printRef}
        isMobile={isMobile}
        perms={{ canAlis, canListe, canMusteri, canKar, isYatirimci: isYatirimciSahip, canBelge: canEdit }}
      />
    </Box>
  );
};

export default MotorStok;
