import React from 'react';
import type { EticaretSatis } from '../../../../shared/tipler';
import { Box, Button, Dialog, DialogContent, DialogActions, type DialogProps } from '@mui/material';
import { BilgiKarti, BolumBasligi, DialogBasligi, SayiKutusu } from '../../../../shared/ui';
import EditIcon from '@mui/icons-material/Edit';

import { hesaplaKomisyon, detectPlatform } from '../../komisyon';
import { karEtiketi, formatTL } from '../eticaretVeri';
import { tarihYaz, sayiDegeri } from '../../../../shared/utils/bicim';

// Satış detay penceresi: ürün/fiyat bilgileri, net kâr ve platforma özel komisyon ve KDV dökümü.
interface SatisDetayModalProps {
  open: boolean;
  data: EticaretSatis | null;
  onClose: () => void;
  onDuzenle: (satis: EticaretSatis) => void;
  isMobile: boolean;
  karGor: boolean;
}

const SatisDetayModal = ({ open, data, onClose, onDuzenle, isMobile, karGor }: SatisDetayModalProps) => {
  const dialogProps: DialogProps = { open, onClose, maxWidth: 'md', fullWidth: true, fullScreen: isMobile };
  if (!data) return <Dialog {...dialogProps} />;
  const s = data;
  const detayPlatformTipi = detectPlatform(s.platform_adi);
  const h = hesaplaKomisyon(s.satis_fiyati, s.alis_fiyati, s.komisyon_orani, s.kdv_orani || 20, s.kargo_ucreti || 0, s.adet, detayPlatformTipi);
  return (
    <Dialog {...dialogProps}>
      <DialogBasligi baslik="E-Ticaret Satış Detayı" onKapat={onClose} />
      <DialogContent>
        {/* Ürün ve fiyat bilgileri + net kâr */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: karGor ? '1fr 1fr 1fr' : '1fr 1fr' }, gap: 2, mb: 3 }}>
          <BilgiKarti
            baslik="Ürün Bilgileri"
            satirlar={[
              ['Ürün', s.urun_adi],
              ['Platform', s.platform_adi || '-'],
              ['Adet', s.adet],
              ['Tarih', tarihYaz(s.tarih)],
            ]}
          />
          <BilgiKarti
            baslik="Fiyat Bilgileri"
            satirlar={[
              ['Satış Fiyatı', `${formatTL(s.satis_fiyati)} ₺`],
              ['Alış Fiyatı', `${formatTL(s.alis_fiyati)} ₺`],
              ['Komisyon', `%${sayiDegeri(s.komisyon_orani).toFixed(2)}`],
              ['KDV', `%${sayiDegeri(s.kdv_orani, 20).toFixed(2)}`],
              ['Kargo', `${formatTL(s.kargo_ucreti)} ₺`],
            ]}
          />
          {karGor && (
            <SayiKutusu
              etiket="Net Kâr"
              deger={`${formatTL(h.netKar)} ₺`}
              ton={h.netKar >= 0 ? 'yesil' : 'kirmizi'}
              sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            />
          )}
        </Box>

        {/* Komisyon Detayları - Platform bazlı */}
        <BolumBasligi>
          Komisyon Hesaplama Detayları {detayPlatformTipi === 'hepsiburada' ? '(HepsiBurada)' : detayPlatformTipi === 'n11' ? '(N11)' : '(Trendyol)'}
        </BolumBasligi>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(6, 1fr)' }, gap: 1.5, mb: 3 }}>
          {(() => {
            let items = [];
            if (detayPlatformTipi === 'hepsiburada') {
              items = [
                { label: 'Komisyon', value: `${formatTL(h.komisyonTutari)} ₺` },
                { label: 'Yat. Geri Dönüş', value: `%${h.yatirimGeriDonus}` },
                { label: 'Ödeme Bedeli', value: `${formatTL(h.odemeBedeli)} ₺` },
                { label: 'İşlem Bedeli', value: `${formatTL(h.islemBedeli)} ₺` },
                { label: 'Stopaj', value: `${formatTL(h.stopaj)} ₺` },
                { label: 'Kâr Oranı', value: `%${h.karOrani}` },
                { label: 'KDV', value: `${formatTL(h.odenecekKDV)} ₺` },
              ];
            } else if (detayPlatformTipi === 'n11') {
              items = [
                { label: 'Komisyon', value: `${formatTL(h.komisyonTutari)} ₺` },
                { label: 'Yat. Geri Dönüş', value: `%${h.yatirimGeriDonus}` },
                { label: 'S. Pazarlama ve Hizmet', value: `${formatTL(h.pazarlamaHizmet)} ₺` },
                { label: 'Stopaj', value: `${formatTL(h.stopaj)} ₺` },
                { label: 'Kâr Oranı', value: `%${h.karOrani}` },
                { label: 'KDV', value: `${formatTL(h.odenecekKDV)} ₺` },
              ];
            } else {
              items = [
                { label: 'Komisyon (Toplam)', value: `${formatTL(h.toplamKomisyon)} ₺` },
                { label: 'Komisyon', value: `${formatTL(h.komisyonTutari)} ₺` },
                { label: 'Hizmet Bedeli', value: `${formatTL(h.hizmetBedeli)} ₺` },
                { label: 'Stopaj', value: `${formatTL(h.stopaj)} ₺` },
                { label: 'Kâr Oranı', value: `%${h.karOrani}` },
                { label: 'KDV', value: `${formatTL(h.odenecekKDV)} ₺` },
              ];
            }
            return items
              .filter((item) => karGor || !karEtiketi(item.label))
              .map((item, i) => <SayiKutusu key={i} etiket={item.label} deger={item.value} ton="turuncu" />);
          })()}
        </Box>

        {/* KDV Detayları - Platform bazlı */}
        <BolumBasligi>KDV Detayları</BolumBasligi>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(6, 1fr)' }, gap: 1.5 }}>
          {(() => {
            const kdvItems = [
              { label: 'Satıştan Oluşan KDV', value: `${formatTL(h.satistanKDV)} ₺` },
              { label: 'Alıştan Oluşan KDV', value: `${formatTL(h.alisKDV)} ₺` },
              { label: 'Kargodan Oluşan KDV', value: `${formatTL(h.kargoKDV)} ₺` },
              { label: 'Komisyondan Oluşan KDV', value: `${formatTL(h.komisyonKDV)} ₺` },
            ];
            if (detayPlatformTipi === 'hepsiburada') {
              kdvItems.push({ label: 'Ödeme ve İşlem Bedeli KDV', value: `${formatTL(h.odemIslemKDV)} ₺` });
            } else if (detayPlatformTipi === 'n11') {
              kdvItems.push({ label: 'Pazarlama ve Hizmet KDV', value: `${formatTL(h.pazarlamaHizmetKDV)} ₺` });
            } else {
              kdvItems.push({ label: 'Hizmet Bedeli KDV', value: `${formatTL(h.hizmetKDV)} ₺` });
            }
            kdvItems.push({ label: 'Ödenecek KDV', value: `${formatTL(h.odenecekKDV)} ₺` });
            return kdvItems.map((item, i) => <SayiKutusu key={i} etiket={item.label} deger={item.value} />);
          })()}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            onClose();
            onDuzenle(s);
          }}
          variant="outlined"
          startIcon={<EditIcon />}
        >
          Düzenle
        </Button>
        <Button variant="contained" onClick={onClose}>
          Kapat
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SatisDetayModal;
