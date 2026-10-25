import React from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert } from '@mui/material';
import { printServisQr } from './servisYazdir';
import { durumTon, durumLabel, formatTarih, type ListeSatiri } from './isEmriVeri';
import { sayiYaz, sayiDegeri } from '../../../shared/utils/bicim';
import { Damga, IslemDugmesi, Plaka } from '../../../shared/ui';
import { FONT, RENK, ISLEM } from '../../../app/tokenlar';

const personelAdi = (ie: ListeSatiri) => ie.teslim_eden_teknisyen || ie.teslim_alan_ad_soyad || ie.olusturan_kisi || '-';

// Filtrelenmiş iş emirleri: dar ekranda kartlar, geniş ekranda tablo. Kâr sütunu yalnızca karGor için.
interface IsEmriListesiProps {
  filtered: ListeSatiri[];
  isMobile: boolean;
  karGor: boolean;
  isAdmin: boolean;
  onDetay: (id: number) => void;
  onYazdir: (id: number) => void;
  onDuzenle: (id: number) => void;
  onSil: (id: number) => void;
}

const IsEmriListesi = ({ filtered, isMobile, karGor, isAdmin, onDetay, onYazdir, onDuzenle, onSil }: IsEmriListesiProps) => {
  const islemler = (ie: ListeSatiri) => (
    <>
      <IslemDugmesi tur="goz" onClick={() => onDetay(ie.id)} />
      <IslemDugmesi tur="yaz" onClick={() => onYazdir(ie.id)} />
      {ie.plaka && <IslemDugmesi tur="qr" title="Servis Geçmişi QR Yazdır" onClick={() => printServisQr(ie.plaka)} />}
      <IslemDugmesi tur="duz" onClick={() => onDuzenle(ie.id)} />
      {isAdmin && <IslemDugmesi tur="sil" onClick={() => onSil(ie.id)} />}
    </>
  );

  return isMobile ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {filtered.length === 0 && <Alert severity="info">Kayıt bulunamadı</Alert>}
      {filtered.map((ie) => {
        const toplam = sayiDegeri(ie.gercek_toplam_ucret);
        const kar = sayiDegeri(ie.kar);
        return (
          <Paper key={ie.id} sx={{ p: 1.75 }} onClick={() => onDetay(ie.id)}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Damga ton={durumTon(ie.durum)}>{durumLabel(ie.durum)}</Damga>
                <Typography sx={{ fontFamily: FONT.mono, fontSize: 13, color: RENK.soluk }}>{ie.fis_no}</Typography>
              </Box>
              <Typography sx={{ fontSize: 13, color: RENK.soluk }}>{formatTarih(ie.created_at || ie.tarih)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mt: 1.25, flexWrap: 'wrap' }}>
              <Plaka plaka={ie.plaka} />
              <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{ie.musteri_ad_soyad}</Typography>
            </Box>
            <Typography sx={{ mt: 0.75, fontSize: 14, color: RENK.soluk }}>
              {ie.marka} {ie.model_tip} • {ie.telefon || '-'}
            </Typography>
            <Typography sx={{ fontSize: 14, color: RENK.soluk }}>{personelAdi(ie)}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1.25 }}>
              <Typography sx={{ fontSize: 14 }}>
                Toplam: <strong>₺{sayiYaz(toplam)}</strong>
              </Typography>
              {karGor && (
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: kar >= 0 ? 'success.main' : 'error.main' }}>
                  Kâr: <strong>₺{sayiYaz(kar)}</strong>
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.75 }} onClick={(e) => e.stopPropagation()}>
              {islemler(ie)}
            </Box>
          </Paper>
        );
      })}
    </Box>
  ) : (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ '& td, & th': { px: 1, py: 0.9, fontSize: '0.88rem' } }}>
        <TableHead>
          <TableRow>
            {['Fiş', 'Plaka', 'Müşteri ve araç', 'Telefon', 'Durum', 'Personel', 'Arıza', 'Toplam', 'Maliyet', ...(karGor ? ['Kâr'] : []), 'İşlemler'].map(
              (h) => (
                <TableCell key={h} align={['Toplam', 'Maliyet', 'Kâr'].includes(h) ? 'right' : 'left'}>
                  {h}
                </TableCell>
              ),
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.map((ie) => {
            const toplam = sayiDegeri(ie.gercek_toplam_ucret);
            const maliyet = sayiDegeri(ie.toplam_maliyet);
            const kar = sayiDegeri(ie.kar);
            return (
              <TableRow key={ie.id} hover>
                <TableCell sx={{ fontFamily: FONT.mono, fontSize: '0.8rem !important', color: RENK.soluk }}>{ie.fis_no}</TableCell>
                <TableCell>
                  <Plaka plaka={ie.plaka} />
                </TableCell>
                <TableCell>
                  <Box sx={{ fontWeight: 700 }}>{ie.musteri_ad_soyad}</Box>
                  <Box sx={{ fontSize: 13, color: RENK.soluk }}>
                    {ie.marka} {ie.model_tip}
                  </Box>
                </TableCell>
                <TableCell sx={{ color: RENK.soluk, whiteSpace: 'nowrap' }}>{ie.telefon}</TableCell>
                <TableCell>
                  <Damga ton={durumTon(ie.durum)}>{durumLabel(ie.durum)}</Damga>
                  <Box sx={{ fontSize: 12, color: RENK.soluk, mt: 0.25 }}>{formatTarih(ie.created_at || ie.tarih)}</Box>
                </TableCell>
                <TableCell sx={{ fontSize: '0.82rem !important' }}>{personelAdi(ie)}</TableCell>
                <TableCell
                  sx={{ maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: ISLEM.yaz.fg }}
                  title={ie.ariza_sikayetler || ''}
                >
                  {ie.ariza_sikayetler || '-'}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  ₺{sayiYaz(toplam)}
                </TableCell>
                <TableCell align="right" sx={{ color: RENK.soluk }}>
                  ₺{sayiYaz(maliyet)}
                </TableCell>
                {karGor && (
                  <TableCell align="right" sx={{ color: kar >= 0 ? 'success.main' : 'error.main', fontWeight: 700 }}>
                    ₺{sayiYaz(kar)}
                  </TableCell>
                )}
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{islemler(ie)}</TableCell>
              </TableRow>
            );
          })}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} align="center">
                Kayıt bulunamadı
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default IsEmriListesi;
