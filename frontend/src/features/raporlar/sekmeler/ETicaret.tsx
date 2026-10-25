import React from 'react';
import type { AralikRaporu, EticaretSatis } from '../../../shared/tipler';
import { sayiDegeri } from '../../../shared/utils/bicim';
import { IslemDugmesi } from '../../../shared/ui';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert, Chip } from '@mui/material';

import { formatTL, formatDate, karColor, headerSx, sagaSutunlar } from '../bicim';
import KartItem, { KART_RENKLERI, kartlar } from '../bilesenler/KartItem';
import { hesaplaKomisyon, detectPlatform } from '../../eticaret/komisyon';
import { RENK, TON } from '../../../app/tokenlar';

// E-Ticaret sekmesi. Net kâr sunucudan değil hesaplaKomisyon ile satır satır hesaplanır.
interface ETicaretProps {
  rapor: AralikRaporu;
  hesaplananEticaretKar: number;
  isMobile: boolean;
  onDetay: (satis: EticaretSatis) => void;
}

const ETicaret = ({ rapor, hesaplananEticaretKar, isMobile, onDetay }: ETicaretProps) => {
  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
        {kartlar([
          { label: 'Toplam Satış', value: rapor.eticaret?.length || 0 },
          { label: 'E-Ticaret Gelir', value: `₺${formatTL(rapor.eticaretGelir)}` },
          { label: 'E-Ticaret Maliyet', value: `₺${formatTL(rapor.eticaretMaliyet)}` },
          { label: 'E-Ticaret Kâr', value: `₺${formatTL(hesaplananEticaretKar)}` },
        ]).map((k, i) => (
          <KartItem key={i} label={k.label} value={k.value} color={k.color || KART_RENKLERI[i % KART_RENKLERI.length]} />
        ))}
      </Box>
      {rapor.eticaret && rapor.eticaret.length > 0 ? (
        isMobile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {rapor.eticaret.map((e, i) => {
              const miktar = parseInt(String(e.adet || 1));
              const satis = sayiDegeri(e.satis_fiyati);
              const alis = sayiDegeri(e.alis_fiyati);
              const pt = detectPlatform(e.platform_adi);
              const hesap = hesaplaKomisyon(e.satis_fiyati, e.alis_fiyati, e.komisyon_orani, e.kdv_orani || 20, e.kargo_ucreti || 0, e.adet, pt);
              const netKar = hesap.netKar;
              return (
                <Paper key={i} sx={{ p: 1.5 }} onClick={() => onDetay(e)}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {e.urun_adi || '-'}
                    </Typography>
                    <Chip
                      label={e.platform_adi || '-'}
                      size="small"
                      sx={{ bgcolor: TON.kirmizi.bg, color: RENK.kirmizi, fontWeight: 'bold', fontSize: '0.65rem', height: 20 }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(e.tarih)} • Adet: {miktar}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="body2">
                      Alış: <strong>{formatTL(alis)} ₺</strong>
                    </Typography>
                    <Typography variant="body2">
                      Satış: <strong>{formatTL(satis)} ₺</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ color: karColor(netKar) }}>
                      Net Kâr: <strong>{formatTL(netKar)} ₺</strong>
                    </Typography>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
            <Table sx={sagaSutunlar(5, 6, 7, 8, 9, 10, 11)}>
              <TableHead>
                <TableRow>
                  {['', 'Tarih', 'Platform', 'Ürün', 'Adet', 'Alış', 'Satış', 'Kargo', 'Komisyon', 'Toplam Kesinti', 'Net Kâr'].map((h) => (
                    <TableCell key={h} sx={headerSx}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rapor.eticaret.map((e, i) => {
                  const miktar = parseInt(String(e.adet || 1));
                  const satis = sayiDegeri(e.satis_fiyati);
                  const alis = sayiDegeri(e.alis_fiyati);
                  const komisyonOrani = sayiDegeri(e.komisyon_orani);
                  const kargoUcreti = sayiDegeri(e.kargo_ucreti);
                  const pt = detectPlatform(e.platform_adi);
                  const hesap = hesaplaKomisyon(e.satis_fiyati, e.alis_fiyati, e.komisyon_orani, e.kdv_orani || 20, e.kargo_ucreti || 0, e.adet, pt);
                  const netKar = hesap.netKar;
                  return (
                    <TableRow key={i} hover>
                      <TableCell>
                        <IslemDugmesi tur="goz" onClick={() => onDetay(e)} />
                      </TableCell>
                      <TableCell>{formatDate(e.tarih)}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{e.platform_adi || '-'}</TableCell>
                      <TableCell>{e.urun_adi || '-'}</TableCell>
                      <TableCell>{miktar}</TableCell>
                      <TableCell>{formatTL(alis)} ₺</TableCell>
                      <TableCell>{formatTL(satis)} ₺</TableCell>
                      <TableCell>{formatTL(kargoUcreti)} ₺</TableCell>
                      <TableCell>
                        {formatTL(hesap.komisyonTutari)} ₺ (%{komisyonOrani})
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{formatTL(hesap.toplamKomisyon)} ₺</TableCell>
                      <TableCell sx={{ color: karColor(netKar), fontWeight: 'bold' }}>{formatTL(netKar)} ₺</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )
      ) : (
        <Alert severity="info">Seçilen tarih aralığında e-ticaret satışı bulunamadı.</Alert>
      )}
    </>
  );
};

export default ETicaret;
