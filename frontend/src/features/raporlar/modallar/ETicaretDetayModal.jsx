import React from 'react';
import { BilgiKarti, BolumBasligi, DialogBasligi, SayiKutusu } from '../../../shared/ui';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableRow, Dialog, DialogContent, DialogActions, Button } from '@mui/material';
import { formatTL, formatDate } from '../bicim';
import { hesaplaKomisyon, detectPlatform } from '../../eticaret/komisyon';

const SUTUN_3 = { display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 2 };

// E-ticaret satış detay penceresi (komisyon/kesinti dökümü).
const ETicaretDetayModal = ({ open, data, onClose, isMobile }) => {
  const dialogProps = { open, onClose, maxWidth: 'md', fullWidth: true, fullScreen: isMobile };
  if (!data) return <Dialog {...dialogProps} />;
  const e = data;
  const miktar = parseInt(e.adet || 1);
  const satis = parseFloat(e.satis_fiyati || 0);
  const alis = parseFloat(e.alis_fiyati || 0);
  const komisyonOrani = parseFloat(e.komisyon_orani || 0);
  const kdvOrani = parseFloat(e.kdv_orani || 20);
  const kargoUcreti = parseFloat(e.kargo_ucreti || 0);
  const pt = detectPlatform(e.platform_adi);
  const hesap = hesaplaKomisyon(e.satis_fiyati, e.alis_fiyati, e.komisyon_orani, e.kdv_orani || 20, e.kargo_ucreti || 0, e.adet, pt);
  const komisyonTutari = hesap.komisyonTutari;
  const toplamSatis = satis * miktar;
  const toplamAlis = alis * miktar;
  const netKar = hesap.netKar;
  const toplamKesinti = hesap.toplamKomisyon;
  const karOrani = toplamSatis > 0 ? ((netKar / toplamSatis) * 100).toFixed(1) : '0.0';
  const tl = (v) => `₺${formatTL(v)}`;
  return (
    <Dialog {...dialogProps}>
      <DialogBasligi baslik={<>E-Ticaret Satış Detayı - {e.urun_adi}</>} onKapat={onClose} />
      <DialogContent dividers>
        <Box sx={{ ...SUTUN_3, mt: 0.5 }}>
          <BilgiKarti
            baslik="Ürün Bilgileri"
            satirlar={[
              ['Ürün', e.urun_adi || '-'],
              ['Platform', e.platform_adi || '-'],
              ['Adet', miktar],
              ['Tarih', formatDate(e.tarih)],
            ]}
          />
          <BilgiKarti
            baslik="Fiyat Bilgileri"
            satirlar={[
              ['Alış Fiyatı', tl(alis)],
              ['Satış Fiyatı', tl(satis)],
              ['Toplam Alış', tl(toplamAlis)],
              ['Toplam Satış', tl(toplamSatis)],
            ]}
          />
          <BilgiKarti
            baslik="Platform Bilgileri"
            satirlar={[
              ['Komisyon Oranı', `%${komisyonOrani}`],
              ['KDV Oranı', `%${kdvOrani}`],
              ['Kargo Ücreti', tl(kargoUcreti)],
            ]}
          />
        </Box>

        <BolumBasligi>Kesinti Detayları</BolumBasligi>
        <TableContainer component={Paper} sx={{ mb: 2, overflowX: 'auto' }}>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Komisyon Tutarı (%{komisyonOrani})</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  {tl(komisyonTutari / miktar)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Kargo Ücreti</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  {tl(kargoUcreti)}
                </TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: '#F3F3EE' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Toplam Kesinti ({miktar} adet)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  {tl(toplamKesinti)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <SayiKutusu etiket="Toplam Satış" deger={tl(toplamSatis)} ton="kirmizi" sx={{ minWidth: 130 }} />
          <SayiKutusu etiket="Toplam Maliyet" deger={tl(toplamAlis)} ton="turuncu" sx={{ minWidth: 130 }} />
          <SayiKutusu etiket="Toplam Kesinti" deger={tl(toplamKesinti)} ton="mavi" sx={{ minWidth: 130 }} />
          <SayiKutusu etiket={`Net Kâr (%${karOrani})`} deger={tl(netKar)} ton={netKar >= 0 ? 'yesil' : 'kirmizi'} sx={{ minWidth: 130 }} />
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

export default ETicaretDetayModal;
