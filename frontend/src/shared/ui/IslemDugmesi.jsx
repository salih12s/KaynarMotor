import React from 'react';
import { IconButton } from '@mui/material';
import ViewIcon from '@mui/icons-material/Visibility';
import PrintIcon from '@mui/icons-material/Print';
import QrIcon from '@mui/icons-material/QrCode2';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CartIcon from '@mui/icons-material/ShoppingCart';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import LockResetIcon from '@mui/icons-material/LockReset';
import DownloadIcon from '@mui/icons-material/Download';
import OpenIcon from '@mui/icons-material/OpenInNew';
import UpIcon from '@mui/icons-material/KeyboardArrowUp';
import DownIcon from '@mui/icons-material/KeyboardArrowDown';
import HideIcon from '@mui/icons-material/VisibilityOff';
import { ISLEM } from '../../app/tokenlar';

// Satır işlem düğmeleri: her işin kendi rengi (görüntüle mavi, yazdır gri, QR mor, düzenle sarı, sil kırmızı, satışa çevir yeşil).
// Simgeler MUI simgeleridir (testler testid ile bulur); erişilebilir ad (aria-label) her zaman verilir.
const TUR = {
  goz: { Ikon: ViewIcon, etiket: 'Görüntüle' },
  yaz: { Ikon: PrintIcon, etiket: 'Yazdır' },
  qr: { Ikon: QrIcon, etiket: 'Servis QR' },
  duz: { Ikon: EditIcon, etiket: 'Düzenle' },
  sil: { Ikon: DeleteIcon, etiket: 'Sil' },
  sepet: { Ikon: CartIcon, etiket: 'Satışa çevir' },
  onay: { Ikon: CheckIcon, etiket: 'Onayla' },
  carpi: { Ikon: CloseIcon, etiket: 'Reddet' },
  kilit: { Ikon: LockResetIcon, etiket: 'Şifre sıfırla' },
  indir: { Ikon: DownloadIcon, etiket: 'İndir' },
  ac: { Ikon: OpenIcon, etiket: 'Aç' },
  yukari: { Ikon: UpIcon, etiket: 'Yukarı taşı' },
  asagi: { Ikon: DownIcon, etiket: 'Aşağı taşı' },
  gizle: { Ikon: HideIcon, etiket: 'Yayından kaldır' },
  satis: { Ikon: CartIcon, etiket: 'Hızlı satış' },
};

const IslemDugmesi = ({ tur, etiket, title, sx, ...diger }) => {
  const { Ikon, etiket: varsayilan } = TUR[tur];
  const { fg, bg } = ISLEM[tur];
  const ad = etiket || varsayilan;
  return (
    <IconButton
      size="small"
      aria-label={ad}
      title={title || ad}
      {...diger}
      sx={{
        width: 30,
        height: 30,
        borderRadius: '6px',
        mr: '3px',
        color: fg,
        bgcolor: bg,
        '&:hover': { bgcolor: bg, filter: 'brightness(0.94)' },
        '&.Mui-disabled': { opacity: 0.45, color: fg },
        '& svg': { fontSize: 18 },
        ...sx,
      }}
    >
      <Ikon />
    </IconButton>
  );
};

export default IslemDugmesi;
