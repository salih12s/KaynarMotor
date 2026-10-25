import React, { type ReactNode } from 'react';
import { BilgiKarti, BolumBasligi, DialogBasligi, Damga, Not, SayiKutusu } from '../../../../shared/ui';
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
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  type DialogProps,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

import { sayiYaz, tarihYaz, sayiDegeri, type Sayi } from '../../../../shared/utils/bicim';
import { RENK } from '../../../../app/tokenlar';
import type { AksesuarSatis, AksesuarStok } from '../../../../shared/tipler';

const SUTUN_3 = { display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 2 };

// Satış detay penceresi: müşteri/satış/kayıt bilgisi, ürünler (stoktan marka/beden/renk), indirimli toplamlar ve kalan ödeme.
interface SatisDetayModalProps {
  open: boolean;
  data: AksesuarSatis | null;
  onClose: () => void;
  onDuzenle: (satis: AksesuarSatis) => void;
  stokOptions: AksesuarStok[];
  karGor: boolean;
  isMobile: boolean;
}

const SatisDetayModal = ({ open, data, onClose, onDuzenle, stokOptions, karGor, isMobile }: SatisDetayModalProps) => {
  const dialogProps: DialogProps = { open, onClose, maxWidth: 'md', fullWidth: true, fullScreen: isMobile };
  if (!data) return <Dialog {...dialogProps} />;
  const d = data;
  const dp = d.parcalar || [];
  // Stok bilgilerini zenginleştir
  const enrichedDp = dp.map((p) => {
    const stok = stokOptions.find((s) => s.stok_adi === p.urun_adi);
    return { ...p, marka: stok?.marka, platform: stok?.platform, beden: stok?.beden, renk: stok?.renk };
  });
  const dBrutSatis = dp.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.satis_fiyati) || 0), 0);
  const dToplamMaliyet = dp.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.maliyet) || 0), 0);
  const dIndirim = Math.min(Number(d.indirim) || 0, dBrutSatis);
  const dNetSatis = dBrutSatis - dIndirim;
  const dKar = dNetSatis - dToplamMaliyet;
  const kalan = sayiDegeri(d.kalan_odeme);
  const kayitSatirlari: Array<[string, ReactNode]> = [
    ['Oluşturan', d.olusturan_kisi || '-'],
    ['Oluşturma', tarihYaz(d.created_at)],
  ];
  if (d.tamamlama_tarihi) kayitSatirlari.push(['Tamamlanma', tarihYaz(d.tamamlama_tarihi)]);
  const para = (v: Sayi) => `₺${sayiYaz(v)}`;
  const karRengi = (v: number) => (v >= 0 ? RENK.yesil : RENK.kirmizi);
  return (
    <Dialog {...dialogProps}>
      <DialogBasligi baslik="Aksesuar Satış Detayı" onKapat={onClose} />
      <DialogContent>
        <Box sx={SUTUN_3}>
          <BilgiKarti
            baslik="Müşteri Bilgileri"
            satirlar={[
              ['Ad Soyad', d.ad_soyad || '-'],
              ['Telefon', d.telefon || '-'],
            ]}
          />
          <BilgiKarti
            baslik="Satış Bilgileri"
            satirlar={[
              ['Ödeme Şekli', d.odeme_sekli || '-'],
              ['Satış Tarihi', tarihYaz(d.satis_tarihi)],
              ['Durum', <Damga ton={d.durum === 'tamamlandi' ? 'yesil' : 'bekle'}>{d.durum === 'tamamlandi' ? 'Tamamlandı' : 'Beklemede'}</Damga>],
            ]}
          />
          <BilgiKarti baslik="Kayıt Bilgileri" satirlar={kayitSatirlari} />
        </Box>

        {d.aciklama && (
          <Not baslik="Açıklama" ton="mavi" sx={{ mb: 2 }}>
            {d.aciklama}
          </Not>
        )}

        {d.odeme_detaylari && (
          <Not baslik="Ödeme Detayları" ton="mor" sx={{ mb: 2 }}>
            {d.odeme_detaylari}
          </Not>
        )}

        <BolumBasligi>Ürünler</BolumBasligi>
        {dp.length > 0 ? (
          isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {enrichedDp.map((p, i) => {
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
                    {karGor && (
                      <Typography variant="caption" sx={{ display: 'block', color: karRengi(pKar), fontWeight: 'bold' }}>
                        Kâr: ₺{sayiYaz(pKar)}
                      </Typography>
                    )}
                  </Paper>
                );
              })}
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
              <Table sx={{ '& th:nth-of-type(n+6), & td:nth-of-type(n+6)': { textAlign: 'right', whiteSpace: 'nowrap' } }}>
                <TableHead>
                  <TableRow>
                    {['Ürün Adı', 'Marka', 'Platform', 'Beden', 'Renk', 'Adet', 'Maliyet', 'Satış Fiyatı', 'Toplam', ...(karGor ? ['Kâr'] : [])].map((h) => (
                      <TableCell key={h}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {enrichedDp.map((p, i) => {
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
                        <TableCell>₺{sayiYaz(pSatis)}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>₺{sayiYaz(pSatis)}</TableCell>
                        {karGor && <TableCell sx={{ color: karRengi(pKar), fontWeight: 'bold' }}>₺{sayiYaz(pKar)}</TableCell>}
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
          {dIndirim > 0 && <SayiKutusu etiket="Ara Toplam" deger={para(dBrutSatis)} ton="gri" sx={{ minWidth: 120 }} />}
          {dIndirim > 0 && <SayiKutusu etiket="İndirim" deger={`−${para(dIndirim)}`} ton="kirmizi" sx={{ minWidth: 120 }} />}
          <SayiKutusu etiket="Toplam Satış" deger={para(dNetSatis)} ton="kirmizi" sx={{ minWidth: 120 }} />
          <SayiKutusu etiket="Maliyet" deger={para(dToplamMaliyet)} ton="turuncu" sx={{ minWidth: 120 }} />
          {karGor && <SayiKutusu etiket="Kâr" deger={para(dKar)} ton={dKar >= 0 ? 'yesil' : 'kirmizi'} sx={{ minWidth: 120 }} />}
        </Box>
        <Not ton={kalan > 0 ? 'bekle' : 'yesil'} sx={{ mt: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>{kalan > 0 ? `Kalan Ödeme: ₺${sayiYaz(d.kalan_odeme)}` : 'Ödeme Tamamlandı ✓'}</Typography>
        </Not>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            onClose();
            onDuzenle(d);
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
