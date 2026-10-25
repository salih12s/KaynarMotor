import React from 'react';
import { Box, Button, Dialog, DialogContent } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import { BelgeBolumu } from '../../SatisBelgeleri';
import { useReactToPrint } from 'react-to-print';
import { parseOdeme } from '../motorStokVeri';
import { sayiYaz, tarihYaz } from '../../../../shared/utils/bicim';
import { BilgiKarti, BolumBasligi, DialogBasligi, Not, SayiKutusu } from '../../../../shared/ui';

const SUTUN_2 = { display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2, mb: 2 };
const KUTULAR = (adet) => ({ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: `repeat(${adet}, 1fr)` }, gap: 1.5, mb: 2 });

// Motor stok detay penceresi: yetkiye göre fiyat/satıcı/kâr bölümleri, ödeme dağılımı, yazdırma ve belgeler.
const StokDetayModal = ({ open, data, onClose, printRef, isMobile, perms = {} }) => {
  const { canAlis = true, canListe = true, canMusteri = true, canKar = true, isYatirimci = false, canBelge = false } = perms;
  const handlePrint = useReactToPrint({ contentRef: printRef });
  if (!data) return null;

  const formatTL = (v) => sayiYaz(v);
  const alis = parseFloat(data.alis_fiyati || 0);
  const noterAlis = parseFloat(data.noter_alis || 0);
  const odemeler = parseOdeme(data.odeme_detaylari);
  const odemeToplami = odemeler.reduce((s, o) => s + parseFloat(o.tutar || 0), 0);

  const motorSatirlari = [
    ['Plaka', data.plaka || '-'],
    ['Marka', data.marka || '-'],
    ['Model', data.model || '-'],
    ['Yıl', data.yil || '-'],
    ['KM', data.km ? sayiYaz(data.km) : '-'],
    ['Stok Tipi', data.stok_tipi === 'konsinye' ? 'Konsinye' : 'Sahip'],
    ['Alım Tarihi', tarihYaz(data.tarih) || '-'],
  ];
  if (data.yevmiye_no) motorSatirlari.push(['Yevmiye No', data.yevmiye_no]);
  if (canListe) motorSatirlari.push(['İlan Fiyatı', `₺${formatTL(data.liste_fiyati)}`]);

  const odemeSatirlari = [];
  if (data.satis_fiyati) odemeSatirlari.push(['Toplam Satış', `₺${formatTL(data.satis_fiyati)}`]);
  odemeler.forEach((o) => odemeSatirlari.push([o.tip, `₺${sayiYaz(o.tutar)}`]));
  odemeSatirlari.push(['Toplam Ödeme', `₺${sayiYaz(odemeToplami)}`]);
  if (parseFloat(data.kalan_odeme || 0) > 0) odemeSatirlari.push(['Kalan', `₺${formatTL(data.kalan_odeme)}`]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={isMobile}>
      <DialogBasligi
        baslik="Motor Stok Detay"
        onKapat={onClose}
        eylemler={
          <Button startIcon={<PrintIcon />} variant="contained" size="small" onClick={handlePrint}>
            Yazdır
          </Button>
        }
      />
      <DialogContent>
        <Box ref={printRef} sx={{ p: 0.5 }}>
          <Box sx={SUTUN_2}>
            <BilgiKarti baslik="Motor Bilgileri" satirlar={motorSatirlari} />
            {canMusteri && (
              <BilgiKarti
                baslik="Satıcı Bilgileri"
                satirlar={[
                  ['İsim Soyisim', data.satici_adi || '-'],
                  ['TC Kimlik', data.satici_tc || '-'],
                ]}
              />
            )}
          </Box>

          {(canAlis || canKar) && (
            <>
              <BolumBasligi>Fiyat Bilgileri</BolumBasligi>
              <Box sx={KUTULAR(canAlis ? 3 : 1)}>
                {canAlis && <SayiKutusu etiket="Alım" deger={`₺${formatTL(alis)}`} ton="kirmizi" />}
                {canAlis && <SayiKutusu etiket="Alış Bedeli (Noter)" deger={`₺${formatTL(noterAlis)}`} ton="kirmizi" />}
                <SayiKutusu etiket="Masraflar" deger={`₺${formatTL(data.masraflar)}`} ton="turuncu" />
              </Box>
              {data.yatirimci_id && canKar && (
                <Box sx={KUTULAR(2)}>
                  <SayiKutusu etiket="Yatırımcı Kârı" deger={`₺${formatTL(data.yatirimci_kar)}`} ton="mavi" />
                  <SayiKutusu etiket="İşletme Kârı" deger={`₺${formatTL(parseFloat(data.kar || 0) - parseFloat(data.yatirimci_kar || 0))}`} ton="yesil" />
                </Box>
              )}
              {isYatirimci && data.durum === 'tamamlandi' && (
                <Box sx={KUTULAR(1)}>
                  <SayiKutusu etiket="Kazancım" deger={`₺${formatTL(data.yatirimci_kar)}`} ton="yesil" />
                </Box>
              )}
            </>
          )}

          {odemeler.length > 0 && (
            <>
              <BolumBasligi>Ödeme Dağılımı</BolumBasligi>
              <BilgiKarti satirlar={odemeSatirlari} sx={{ mb: 2 }} />
            </>
          )}

          {data.aciklama && (
            <Not baslik="Açıklama" ton="mavi" sx={{ mb: 2 }}>
              {data.aciklama}
            </Not>
          )}
        </Box>
        {/* Belgeler yazdırma alanının (printRef) dışında: çıktıya girmez */}
        {canBelge && <BelgeBolumu key={data.id} motorId={data.id} />}
      </DialogContent>
    </Dialog>
  );
};

export default StokDetayModal;
