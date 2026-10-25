import React from 'react';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { formatTL, karColor, headerSx } from '../bicim';
import { FONT, RENK } from '../../../app/tokenlar';

const SEKME_NO = { 'Motor Satışları': 1, 'İş Emirleri (Servis)': 2, 'Aksesuar Satışları': 3, 'E-Ticaret': 4, 'Yedek Parça (Envanter)': 5 };
const oranYaz = (kar, gelir) => (parseFloat(gelir || 0) > 0 ? ((parseFloat(kar || 0) / parseFloat(gelir || 1)) * 100).toFixed(1) : '0.0');

// Üst sıradaki büyük rakam kartı: kâğıt zemin, üstte küçük etiket, altında başlık yazı tipiyle rakam.
const RakamKarti = ({ etiket, deger, renk = RENK.murekkep }) => (
  <Paper sx={{ px: 2.25, py: 1.75, bgcolor: RENK.yuzey }}>
    <Typography sx={{ fontSize: 14, color: RENK.soluk }}>{etiket}</Typography>
    <Typography sx={{ fontFamily: FONT.baslik, fontWeight: 700, fontSize: 32, lineHeight: 1.25, color: renk, whiteSpace: 'nowrap' }}>{deger}</Typography>
  </Paper>
);

// Gelir payı: gelirin toplam içindeki yüzdesi, ince çubuk + yüzde yazısı.
const PayCubugu = ({ pay }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
    <Box sx={{ flex: 1, height: 8, bgcolor: RENK.cizgiSoluk, borderRadius: '2px', overflow: 'hidden' }}>
      <Box sx={{ width: `${Math.min(100, Math.max(0, pay))}%`, minWidth: pay > 0 ? 3 : 0, height: '100%', bgcolor: RENK.murekkep }} />
    </Box>
    <Box component="span" sx={{ width: 52, fontSize: 12.5, color: RENK.soluk }}>
      %{pay.toFixed(1).replace('.', ',')}
    </Box>
  </Box>
);

const sagaSx = { textAlign: 'right' };

// Genel Özet sekmesi: toplam kartları + kategori tablosu (satıra tıklamak o sekmeye geçirir).
const GenelOzet = ({ rapor, toplamlar, isMobile, onSekmeAc }) => {
  const { hesaplananEticaretKar, duzeltilmisTotalKar, duzeltilmisTotalGelir, duzeltilmisTotalMaliyet } = toplamlar;
  const satirlar = [
    { label: 'Motor Satışları', count: rapor.motorlar?.length || 0, gelir: rapor.motorGelir, maliyet: rapor.motorMaliyet, kar: rapor.motorKar },
    { label: 'İş Emirleri (Servis)', count: rapor.isEmirleri?.length || 0, gelir: rapor.isEmriGelir, maliyet: rapor.isEmriMaliyet, kar: rapor.isEmriKar },
    { label: 'Aksesuar Satışları', count: rapor.aksesuarlar?.length || 0, gelir: rapor.aksesuarGelir, maliyet: rapor.aksesuarMaliyet, kar: rapor.aksesuarKar },
    { label: 'E-Ticaret', count: rapor.eticaret?.length || 0, gelir: rapor.eticaretGelir, maliyet: rapor.eticaretMaliyet, kar: hesaplananEticaretKar },
    {
      label: 'Yedek Parça (Envanter)',
      count: rapor.yedekParcalar?.length || 0,
      gelir: rapor.yedekParcaToplamDeger,
      maliyet: rapor.yedekParcaToplamMaliyet,
      kar: (rapor.yedekParcaToplamDeger || 0) - (rapor.yedekParcaToplamMaliyet || 0),
    },
  ];
  const toplamIslem = satirlar.reduce((t, r) => t + r.count, 0);
  const satirGelirToplami = satirlar.reduce((t, r) => t + parseFloat(r.gelir || 0), 0);
  const pay = (gelir) => (satirGelirToplami > 0 ? (parseFloat(gelir || 0) / satirGelirToplami) * 100 : 0);

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 2, mb: 3 }}>
        <RakamKarti etiket="Toplam gelir" deger={`₺${formatTL(duzeltilmisTotalGelir)}`} />
        <RakamKarti etiket="Toplam maliyet" deger={`₺${formatTL(duzeltilmisTotalMaliyet)}`} />
        <RakamKarti etiket="Toplam kâr" deger={`₺${formatTL(duzeltilmisTotalKar)}`} renk={karColor(duzeltilmisTotalKar)} />
        <RakamKarti etiket="Toplam işlem" deger={toplamIslem} />
        <RakamKarti etiket="Motor stok değeri" deger={`₺${formatTL(rapor.motorStokToplam)}`} />
      </Box>

      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
          {satirlar.map((row) => (
            <Paper key={row.label} sx={{ p: 1.5, cursor: 'pointer' }} onClick={() => onSekmeAc(SEKME_NO[row.label] || 0)}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {row.label}
                </Typography>
                <Typography variant="body2">{row.count} işlem</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2">
                  Gelir: <strong>{formatTL(row.gelir)} ₺</strong>
                </Typography>
                <Typography variant="body2">
                  Maliyet: <strong>{formatTL(row.maliyet)} ₺</strong>
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                <Typography variant="body2" sx={{ color: karColor(row.kar) }}>
                  Kâr: <strong>{formatTL(row.kar)} ₺</strong>
                </Typography>
                <Typography variant="body2" sx={{ color: karColor(row.kar) }}>
                  Oran: <strong>%{oranYaz(row.kar, row.gelir)}</strong>
                </Typography>
              </Box>
            </Paper>
          ))}
          <Paper sx={{ p: 1.5, bgcolor: RENK.yuzeyKoyu }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
              TOPLAM
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="body2">
                Gelir: <strong>{formatTL(duzeltilmisTotalGelir)} ₺</strong>
              </Typography>
              <Typography variant="body2">
                Maliyet: <strong>{formatTL(duzeltilmisTotalMaliyet)} ₺</strong>
              </Typography>
              <Typography variant="body2" sx={{ color: karColor(duzeltilmisTotalKar) }}>
                Kâr: <strong>{formatTL(duzeltilmisTotalKar)} ₺</strong>
              </Typography>
            </Box>
          </Paper>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ mb: 2, overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={headerSx}>Kategori</TableCell>
                <TableCell sx={{ ...headerSx, ...sagaSx }}>İşlem</TableCell>
                <TableCell sx={{ ...headerSx, ...sagaSx }}>Gelir</TableCell>
                <TableCell sx={headerSx}>Gelir payı</TableCell>
                <TableCell sx={{ ...headerSx, ...sagaSx }}>Maliyet</TableCell>
                <TableCell sx={{ ...headerSx, ...sagaSx }}>Kâr</TableCell>
                <TableCell sx={{ ...headerSx, ...sagaSx }}>Kâr oranı</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {satirlar.map((row) => (
                <TableRow key={row.label} hover sx={{ cursor: 'pointer' }} onClick={() => onSekmeAc(SEKME_NO[row.label] || 0)}>
                  <TableCell sx={{ fontWeight: 700 }}>{row.label}</TableCell>
                  <TableCell sx={sagaSx}>{row.count}</TableCell>
                  <TableCell sx={{ ...sagaSx, fontWeight: 600 }}>{formatTL(row.gelir)} ₺</TableCell>
                  <TableCell>
                    <PayCubugu pay={pay(row.gelir)} />
                  </TableCell>
                  <TableCell sx={sagaSx}>{formatTL(row.maliyet)} ₺</TableCell>
                  <TableCell sx={{ ...sagaSx, color: karColor(row.kar), fontWeight: 700 }}>{formatTL(row.kar)} ₺</TableCell>
                  <TableCell sx={{ ...sagaSx, fontWeight: 700 }}>%{oranYaz(row.kar, row.gelir)}</TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: RENK.yuzeyKoyu }}>
                <TableCell sx={{ fontWeight: 700 }}>TOPLAM</TableCell>
                <TableCell sx={{ ...sagaSx, fontWeight: 700 }}>{toplamIslem}</TableCell>
                <TableCell sx={{ ...sagaSx, fontWeight: 700 }}>{formatTL(duzeltilmisTotalGelir)} ₺</TableCell>
                <TableCell />
                <TableCell sx={{ ...sagaSx, fontWeight: 700 }}>{formatTL(duzeltilmisTotalMaliyet)} ₺</TableCell>
                <TableCell sx={{ ...sagaSx, color: karColor(duzeltilmisTotalKar), fontWeight: 700 }}>{formatTL(duzeltilmisTotalKar)} ₺</TableCell>
                <TableCell sx={{ ...sagaSx, fontWeight: 700 }}>%{oranYaz(duzeltilmisTotalKar, duzeltilmisTotalGelir)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
};

export default GenelOzet;
