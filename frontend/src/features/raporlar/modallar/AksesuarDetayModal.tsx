import React, { type ReactNode } from 'react';
import type { DialogProps } from '@mui/material';
import type { AksesuarParca, AksesuarSatis, AksesuarStok } from '../../../shared/tipler';
import { BilgiKarti, BolumBasligi, DialogBasligi, Not, SayiKutusu } from '../../../shared/ui';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { formatDate, parcaListesi } from '../bicim';
import DurumChip from '../bilesenler/DurumChip';
import { sayiYaz } from '../../../shared/utils/bicim';

const SUTUN_3 = { display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 2 };
const karRengi = (v: number) => (v >= 0 ? '#1D6A3B' : '#c62828');

// Aksesuar satış detay penceresi; ürünlerin marka/beden/renk bilgisi stok listesinden eşlenir.
interface Props {
  open: boolean;
  data: AksesuarSatis | null;
  onClose: () => void;
  isMobile: boolean;
  stokOptions: AksesuarStok[];
}

const AksesuarDetayModal = ({ open, data, onClose, isMobile, stokOptions }: Props) => {
  const dialogProps: DialogProps = { open, onClose, maxWidth: 'md', fullWidth: true, fullScreen: isMobile };
  if (!data) return <Dialog {...dialogProps} />;
  const a = data;
  const parcalar = parcaListesi<AksesuarParca>(a.parcalar);
  const enrichedParcalar = parcalar.map((p) => {
    const stok = stokOptions.find((s) => s.stok_adi === p.urun_adi);
    return { ...p, marka: stok?.marka, platform: stok?.platform, beden: stok?.beden, renk: stok?.renk };
  });
  const topSatis = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.satis_fiyati) || 0), 0);
  const topMaliyet = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.maliyet) || 0), 0);
  const topKar = topSatis - topMaliyet;
  const kayitSatirlari: Array<[string, ReactNode]> = [
    ['Oluşturan', a.olusturan_kisi || '-'],
    ['Oluşturma', formatDate(a.created_at)],
  ];
  if (a.tamamlama_tarihi) kayitSatirlari.push(['Tamamlanma', formatDate(a.tamamlama_tarihi)]);
  return (
    <Dialog {...dialogProps}>
      <DialogBasligi baslik={<>Aksesuar Satış Detayı - {a.ad_soyad}</>} onKapat={onClose} />
      <DialogContent dividers>
        <Box sx={{ ...SUTUN_3, mt: 0.5 }}>
          <BilgiKarti
            baslik="Müşteri Bilgileri"
            satirlar={[
              ['Ad Soyad', a.ad_soyad || '-'],
              ['Telefon', a.telefon || '-'],
            ]}
          />
          <BilgiKarti
            baslik="Satış Bilgileri"
            satirlar={[
              ['Ödeme Şekli', a.odeme_sekli || '-'],
              ['Satış Tarihi', formatDate(a.satis_tarihi)],
              ['Durum', <DurumChip durum={a.durum} />],
            ]}
          />
          <BilgiKarti baslik="Kayıt Bilgileri" satirlar={kayitSatirlari} />
        </Box>
        {a.aciklama && (
          <Not baslik="Açıklama" ton="mavi" sx={{ mb: 2 }}>
            {a.aciklama}
          </Not>
        )}
        {a.odeme_detaylari && (
          <Not baslik="Ödeme Detayları" ton="mor" sx={{ mb: 2 }}>
            {a.odeme_detaylari}
          </Not>
        )}
        <BolumBasligi>Ürünler</BolumBasligi>
        {parcalar.length > 0 ? (
          isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {enrichedParcalar.map((p, i) => {
                const pSatis = (Number(p.adet) || 0) * (Number(p.satis_fiyati) || 0);
                const pMaliyet = (Number(p.adet) || 0) * (Number(p.maliyet) || 0);
                const pKar = pSatis - pMaliyet;
                return (
                  <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {p.urun_adi}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Adet: {p.adet} • Maliyet: ₺{sayiYaz(pMaliyet)} • Satış: ₺{sayiYaz(pSatis)}
                      {p.marka ? ` • ${p.marka}` : ''}
                      {p.platform ? ` • ${p.platform}` : ''}
                      {p.beden ? ` • ${p.beden}` : ''}
                      {p.renk ? ` • ${p.renk}` : ''}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: karRengi(pKar), fontWeight: 'bold' }}>
                      Kâr: ₺{sayiYaz(pKar)}
                    </Typography>
                  </Paper>
                );
              })}
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
              <Table sx={{ '& th:nth-of-type(n+6), & td:nth-of-type(n+6)': { textAlign: 'right' } }}>
                <TableHead>
                  <TableRow>
                    {['Ürün Adı', 'Marka', 'Platform', 'Beden', 'Renk', 'Adet', 'Maliyet', 'Satış Fiyatı', 'Kâr'].map((h) => (
                      <TableCell key={h}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {enrichedParcalar.map((p, i) => {
                    const pSatis = (Number(p.adet) || 0) * (Number(p.satis_fiyati) || 0);
                    const pMaliyet = (Number(p.adet) || 0) * (Number(p.maliyet) || 0);
                    const pKar = pSatis - pMaliyet;
                    return (
                      <TableRow key={i}>
                        <TableCell sx={{ fontWeight: 700 }}>{p.urun_adi}</TableCell>
                        <TableCell>{p.marka || '-'}</TableCell>
                        <TableCell>{p.platform || '-'}</TableCell>
                        <TableCell>{p.beden || '-'}</TableCell>
                        <TableCell>{p.renk || '-'}</TableCell>
                        <TableCell>{p.adet}</TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>₺{sayiYaz(pMaliyet)}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>₺{sayiYaz(pSatis)}</TableCell>
                        <TableCell sx={{ color: karRengi(pKar), fontWeight: 'bold' }}>₺{sayiYaz(pKar)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            Ürün kaydı yok
          </Typography>
        )}
        <Box sx={{ mt: 2, display: 'flex', gap: 1.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <SayiKutusu etiket="Satış" deger={`₺${sayiYaz(topSatis)}`} ton="kirmizi" sx={{ minWidth: 130 }} />
          <SayiKutusu etiket="Maliyet" deger={`₺${sayiYaz(topMaliyet)}`} ton="turuncu" sx={{ minWidth: 130 }} />
          <SayiKutusu etiket="Kâr" deger={`₺${sayiYaz(topKar)}`} ton={topKar >= 0 ? 'yesil' : 'kirmizi'} sx={{ minWidth: 130 }} />
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

export default AksesuarDetayModal;
