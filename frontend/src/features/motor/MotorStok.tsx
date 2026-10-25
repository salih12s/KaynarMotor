import React, { useState, useRef } from 'react';
import { Box, Paper, TextField, InputAdornment, useTheme, useMediaQuery } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { ikinciElMotorService } from './motorApi';
import type { Motor } from '../../shared/tipler';
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

// Motor Stok sayfasının kabuğu: rol/izin bayrakları (yetkiler.js), arama ve durum süzgeçleri burada; sunucu verisi, form ve hızlı satış
// durumu hook'lardan gelir (./motorStok/use*.js); liste, çipler ve pencereler yalnızca çizim yapar (./motorStok/bilesenler/).
const MotorStok = () => {
  const isMobile = useMediaQuery(useTheme().breakpoints.down('sm'));
  const { user } = useAuth();
  const perms = motorYetkileri(user);
  const { isYatirimci, isYatirimciSahip, canAlis, canMusteri, canListe, canKar, canEdit } = perms;

  const { motorlar, yatirimcilar, yenile, sil } = useMotorStok({ user });
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

  return (
    <Box>
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
