import React, { type ReactNode } from 'react';
import type { DialogProps } from '@mui/material';
import type { Motor } from '../../../shared/tipler';
import type { Sayi } from '../../../shared/utils/bicim';
import { Box, Dialog, DialogContent, DialogActions, Button } from '@mui/material';
import { BilgiKarti, Damga, DialogBasligi, Not, plakaBicim } from '../../../shared/ui';
import { formatTL, formatDate, karColor } from '../bicim';
import { sayiYaz, sayiDegeri } from '../../../shared/utils/bicim';

// Üç sütun (araç/satıcı/alıcı), iki sütun (fiyat/noter, tarih/not) düzeni
const SUTUN_3 = { display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 2 };
const SUTUN_2 = { display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2, mb: 2 };

// Motor satış detay penceresi. Net kâr = toplam kâr - yatırımcı payı.
interface Props {
  open: boolean;
  data: Motor | null;
  onClose: () => void;
  isMobile: boolean;
}

const MotorDetayModal = ({ open, data, onClose, isMobile }: Props) => {
  const dialogProps: DialogProps = { open, onClose, maxWidth: 'md', fullWidth: true, fullScreen: isMobile };
  if (!data) return <Dialog {...dialogProps} />;
  const m = data;
  const alis = sayiDegeri(m.alis_fiyati);
  const satis = sayiDegeri(m.satis_fiyati);
  const noterAlis = sayiDegeri(m.noter_alis);
  const noterSatis = sayiDegeri(m.noter_satis);
  const masraf = sayiDegeri(m.masraflar);
  const toplamKar = sayiDegeri(m.kar);
  const yatirimciPayi = sayiDegeri(m.yatirimci_kar);
  const kar = toplamKar - yatirimciPayi;
  const para = (v: Sayi) => `${formatTL(v)} ₺`;
  const fiyatSatirlari: Array<[string, ReactNode]> = [
    ['Alış Fiyatı', para(alis)],
    ['Satış Fiyatı', para(satis)],
    ['Masraflar', para(masraf)],
  ];
  if (yatirimciPayi > 0) {
    fiyatSatirlari.push(['Toplam Kâr', para(toplamKar)]);
    fiyatSatirlari.push(['Yatırımcı Payı', <span style={{ color: '#1E4A86' }}>- {para(yatirimciPayi)}</span>]);
  }
  fiyatSatirlari.push(['Net Kâr (Payınız)', <span style={{ color: karColor(kar) }}>{para(kar)}</span>]);
  const noterSatirlari: Array<[string, ReactNode]> = [
    ['Noter Alış', para(noterAlis)],
    ['Noter Satış', para(noterSatis)],
    ['Ödeme Şekli', m.odeme_sekli || 'nakit'],
    ['Fatura', <Damga ton={m.fatura_kesildi ? 'yesil' : 'kirmizi'}>{m.fatura_kesildi ? 'Kesildi' : 'Kesilmedi'}</Damga>],
  ];
  if (m.yevmiye_no) noterSatirlari.push(['Yevmiye No', m.yevmiye_no]);
  return (
    <Dialog {...dialogProps}>
      <DialogBasligi baslik={<>Motor Satış Detayı - {plakaBicim(m.plaka)}</>} onKapat={onClose} />
      <DialogContent dividers>
        <Box sx={{ ...SUTUN_3, mt: 0.5 }}>
          <BilgiKarti
            baslik="Araç Bilgileri"
            satirlar={[
              ['Plaka', plakaBicim(m.plaka) || '-'],
              ['Marka', m.marka || '-'],
              ['Model', m.model || '-'],
              ['Yıl', m.yil || '-'],
              ['KM', m.km ? sayiYaz(m.km) + ' km' : '-'],
            ]}
          />
          <BilgiKarti
            baslik="Satıcı Bilgileri"
            satirlar={[
              ['Ad Soyad', m.satici_adi || '-'],
              ['TC', m.satici_tc || '-'],
            ]}
          />
          <BilgiKarti
            baslik="Alıcı Bilgileri"
            satirlar={[
              ['Ad Soyad', m.alici_adi || '-'],
              ['TC', m.alici_tc || '-'],
              ['Telefon', m.alici_telefon || '-'],
              ['Adres', m.alici_adres || '-'],
            ]}
          />
        </Box>

        <Box sx={SUTUN_2}>
          <BilgiKarti baslik="Fiyat Bilgileri" satirlar={fiyatSatirlari} />
          <BilgiKarti baslik="Noter Bilgileri" satirlar={noterSatirlari} />
        </Box>

        <Box sx={{ ...SUTUN_2, mb: 0 }}>
          <BilgiKarti
            baslik="Tarih Bilgileri"
            satirlar={[
              ['Kayıt Tarihi', formatDate(m.tarih || m.created_at)],
              ['Satış Tarihi', formatDate(m.satis_tarihi || m.tamamlama_tarihi)],
            ]}
          />
          {m.komisyoncu_adi && (
            <Not baslik="Komisyoncu" ton="bekle">
              <Box>
                <strong>Ad Soyad:</strong> {m.komisyoncu_adi}
              </Box>
              <Box>
                <strong>Telefon:</strong> {m.komisyoncu_telefon || '-'}
              </Box>
              <Box>
                <strong>Tutar:</strong> ₺{sayiYaz(m.komisyoncu_tutari)}
              </Box>
            </Not>
          )}
          {m.aciklama && (
            <Not baslik="Açıklama" ton="mavi">
              {m.aciklama}
            </Not>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={() => onClose()}>
          Kapat
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MotorDetayModal;
