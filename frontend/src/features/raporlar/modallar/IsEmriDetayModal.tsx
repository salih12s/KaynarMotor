import React from 'react';
import type { DialogProps } from '@mui/material';
import type { IsEmriDetayi, Parca } from '../../../shared/tipler';
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
import { sayiYaz, sayiDegeri } from '../../../shared/utils/bicim';
import { RENK } from '../../../app/tokenlar';

const SUTUN_3 = { display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 2 };
const sagaSx = { textAlign: 'right' };
const karRengi = (v: number) => (v >= 0 ? RENK.yesil : RENK.kirmizi);

// İş emri detay penceresi (parça listesi JSON metin olarak gelebilir).
interface Props {
  open: boolean;
  data: IsEmriDetayi | null;
  onClose: () => void;
  isMobile: boolean;
}

const IsEmriDetayModal = ({ open, data, onClose, isMobile }: Props) => {
  const dialogProps: DialogProps = { open, onClose, maxWidth: 'md', fullWidth: true, fullScreen: isMobile };
  if (!data) return <Dialog {...dialogProps} />;
  const d = data;
  const parcalar = parcaListesi<Parca>(d.parcalar);
  const toplamFiyat = parcalar.reduce((t, p) => t + sayiDegeri(p.toplam_fiyat), 0);
  const toplamMaliyet = parcalar.reduce((t, p) => t + (Number(p.adet) || 0) * (Number(p.maliyet) || 0), 0);
  const kar = toplamFiyat - toplamMaliyet;
  return (
    <Dialog {...dialogProps}>
      <DialogBasligi
        baslik={
          <>
            İş Emri #{d.fis_no} - {d.musteri_ad_soyad}
          </>
        }
        onKapat={onClose}
      />
      <DialogContent dividers>
        <Box sx={{ ...SUTUN_3, mt: 0.5 }}>
          <BilgiKarti
            baslik="Müşteri Bilgileri"
            satirlar={[
              ['Ad Soyad', d.musteri_ad_soyad],
              ['Telefon', d.telefon || '-'],
              ['Adres', d.adres || '-'],
            ]}
          />
          <BilgiKarti
            baslik="Araç Bilgileri"
            satirlar={[
              ['Marka', d.marka || '-'],
              ['Model / Tip', d.model_tip || '-'],
              ['KM', d.km ? `${sayiYaz(parseInt(String(d.km)))} km` : '-'],
            ]}
          />
          <BilgiKarti
            baslik="İş Emri Bilgileri"
            satirlar={[
              ['Personel', d.teslim_eden_teknisyen || d.olusturan_kisi || '-'],
              ['Tarih', formatDate(d.created_at)],
              ['Tamamlanma', formatDate(d.tamamlama_tarihi)],
            ]}
          />
        </Box>
        {d.ariza_sikayetler && (
          <Not baslik="Arıza / Şikayetler" ton="turuncu" sx={{ mb: 2 }}>
            {d.ariza_sikayetler}
          </Not>
        )}
        {d.aciklama && (
          <Not baslik="Açıklama" ton="mavi" sx={{ mb: 2 }}>
            {d.aciklama}
          </Not>
        )}
        <BolumBasligi>Parçalar ve İşçilik</BolumBasligi>
        {parcalar.length > 0 ? (
          isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {parcalar.map((p, i) => {
                const pSatis = sayiDegeri(p.toplam_fiyat);
                const pMaliyet = (Number(p.adet) || 0) * (Number(p.maliyet) || 0);
                const pKar = pSatis - pMaliyet;
                return (
                  <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {p.takilan_parca}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Adet: {p.adet} • Birim: ₺{sayiYaz(p.birim_fiyat)} • Toplam: ₺{sayiYaz(pSatis)}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block' }}>
                      Maliyet: ₺{sayiYaz(pMaliyet)} • <span style={{ color: karRengi(pKar), fontWeight: 'bold' }}>Kâr: ₺{sayiYaz(pKar)}</span>
                    </Typography>
                  </Paper>
                );
              })}
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
              <Table
                sx={{
                  '& th:nth-of-type(n+2), & td:nth-of-type(n+2)': sagaSx,
                }}
              >
                <TableHead>
                  <TableRow>
                    {['Takılan Parça', 'Adet', 'Birim Fiyat', 'Toplam', 'Maliyet', 'Kâr'].map((h) => (
                      <TableCell key={h}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parcalar.map((p, i) => {
                    const pSatis = sayiDegeri(p.toplam_fiyat);
                    const pMaliyet = (Number(p.adet) || 0) * (Number(p.maliyet) || 0);
                    const pKar = pSatis - pMaliyet;
                    return (
                      <TableRow key={i}>
                        <TableCell>{p.takilan_parca}</TableCell>
                        <TableCell>{p.adet}</TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>₺{sayiYaz(p.birim_fiyat)}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>₺{sayiYaz(pSatis)}</TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>₺{sayiYaz(pMaliyet)}</TableCell>
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
            Parça kaydı yok
          </Typography>
        )}
        <Box sx={{ mt: 2, display: 'flex', gap: 1.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <SayiKutusu etiket="Toplam" deger={`₺${sayiYaz(toplamFiyat)}`} ton="kirmizi" sx={{ minWidth: 130 }} />
          <SayiKutusu etiket="Maliyet" deger={`₺${sayiYaz(toplamMaliyet)}`} ton="turuncu" sx={{ minWidth: 130 }} />
          <SayiKutusu etiket="Kâr" deger={`₺${sayiYaz(kar)}`} ton={kar >= 0 ? 'yesil' : 'kirmizi'} sx={{ minWidth: 130 }} />
        </Box>
        {d.odeme_detaylari && (
          <Not baslik="Ödeme Detayları" ton="mor" sx={{ mt: 2 }}>
            {d.odeme_detaylari}
          </Not>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={() => onClose()}>
          Kapat
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IsEmriDetayModal;
