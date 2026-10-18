import React from 'react';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import BuildIcon from '@mui/icons-material/Build';
import HandymanIcon from '@mui/icons-material/Handyman';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

export const RED = '#C62828';

// Motor Satışı'na girince gösterilen Sıfır / İkinci El seçim kartlarının açıklamaları
export const MOTOR_DURUM_BASLIK = { sifir: 'Sıfır motorlar', ikinci_el: 'İkinci el motorlar' };
export const MOTOR_DURUM_ACIKLAMA = {
  sifir: 'Kutusundan yeni, garantili motorlar.',
  ikinci_el: 'Kontrolden geçmiş, bakımlı ikinci el motorlar.',
};

// Her kategori için giriş ekranında ve mobil menüde gösterilecek ikon
export const KATEGORI_ICON = {
  motor: <TwoWheelerIcon sx={{ fontSize: 30 }} />,
  aksesuar: <CheckroomIcon sx={{ fontSize: 30 }} />,
  yedek_parca: <BuildIcon sx={{ fontSize: 30 }} />,
  bakim_servis: <HandymanIcon sx={{ fontSize: 30 }} />,
  nakliye: <LocalShippingIcon sx={{ fontSize: 30 }} />,
  sigorta: <VerifiedUserIcon sx={{ fontSize: 30 }} />,
};
