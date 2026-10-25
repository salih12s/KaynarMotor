import React from 'react';
import { IslemDugmesi } from '../../../shared/ui';
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

import { formatTL, formatDate, karColor, headerSx } from '../bicim';
import { RENK } from '../../../app/tokenlar';
import KartItem from '../bilesenler/KartItem';
import { sayiYaz } from '../../../shared/utils/bicim';

const SAYISAL = ['KM', 'Gelir', 'Maliyet', 'Kâr'];
const sagaSx = { textAlign: 'right' };

// İş Emirleri (servis) sekmesi; personel süzgeci üstteki tarih çubuğundadır.
const IsEmirleri = ({ rapor, isMobile, seciliPersonel, onDetay }) => {
  const filtered = (rapor.isEmirleri || []).filter((ie) => {
    if (!seciliPersonel) return true;
    const personel = (ie.teslim_eden_teknisyen || ie.olusturan_kisi || '').toLowerCase();
    return personel === seciliPersonel.toLowerCase();
  });
  const fGelir = filtered.reduce((t, r) => t + parseFloat(r.gercek_toplam_ucret || 0), 0);
  const fMaliyet = filtered.reduce((t, r) => t + parseFloat(r.toplam_maliyet || 0), 0);
  const fKar = filtered.reduce((t, r) => t + parseFloat(r.kar || 0), 0);
  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
        {[
          { label: 'Toplam İş Emri', value: filtered.length, color: '#C62828' },
          { label: 'Servis Gelir', value: `₺${formatTL(fGelir)}`, color: '#1E4A86' },
          { label: 'Servis Maliyet', value: `₺${formatTL(fMaliyet)}`, color: '#A5530F' },
          { label: 'Servis Kâr', value: `₺${formatTL(fKar)}`, color: '#1D6A3B' },
        ].map((k, i) => (
          <KartItem key={i} label={k.label} value={k.value} color={k.color} />
        ))}
      </Box>
      {filtered.length > 0 ? (
        isMobile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {filtered.map((ie, i) => (
              <Paper key={i} sx={{ p: 1.5 }} onClick={() => onDetay(ie)}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    #{ie.fis_no}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(ie.tamamlama_tarihi || ie.created_at)}
                  </Typography>
                </Box>
                <Typography variant="body2">
                  {ie.musteri_ad_soyad} • {ie.marka} {ie.model_tip || ''}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {ie.teslim_eden_teknisyen || ie.olusturan_kisi || '-'} • {ie.km ? `${sayiYaz(parseInt(ie.km))} km` : ''}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                  <Typography variant="body2">
                    Gelir: <strong>{formatTL(ie.gercek_toplam_ucret)} ₺</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ color: karColor(ie.kar) }}>
                    Kâr: <strong>{formatTL(ie.kar)} ₺</strong>
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  {['', 'Tarih', 'Fiş No', 'Müşteri', 'Telefon', 'Marka / Model', 'KM', 'Personel', 'Arıza / Şikayet', 'Gelir', 'Maliyet', 'Kâr'].map((h) => (
                    <TableCell key={h} sx={{ ...headerSx, textAlign: SAYISAL.includes(h) ? 'right' : 'left' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((ie, i) => (
                  <TableRow key={i} hover>
                    <TableCell>
                      <IslemDugmesi tur="goz" onClick={() => onDetay(ie)} />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', color: RENK.soluk }}>{formatDate(ie.tamamlama_tarihi || ie.created_at)}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>#{ie.fis_no}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{ie.musteri_ad_soyad}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', color: RENK.soluk }}>{ie.telefon || '-'}</TableCell>
                    <TableCell>
                      {ie.marka} {ie.model_tip || ''}
                    </TableCell>
                    <TableCell sx={{ ...sagaSx, whiteSpace: 'nowrap' }}>{ie.km ? `${sayiYaz(parseInt(ie.km))} km` : '-'}</TableCell>
                    <TableCell>{ie.teslim_eden_teknisyen || ie.olusturan_kisi || '-'}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ie.ariza_sikayetler || '-'}
                    </TableCell>
                    <TableCell sx={{ ...sagaSx, fontWeight: 700, whiteSpace: 'nowrap' }}>{formatTL(ie.gercek_toplam_ucret)} ₺</TableCell>
                    <TableCell sx={{ ...sagaSx, whiteSpace: 'nowrap', color: RENK.soluk }}>{formatTL(ie.toplam_maliyet)} ₺</TableCell>
                    <TableCell sx={{ ...sagaSx, whiteSpace: 'nowrap', color: karColor(ie.kar), fontWeight: 'bold' }}>{formatTL(ie.kar)} ₺</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      ) : (
        <Typography color="text.secondary" textAlign="center" py={3}>
          Kayıt bulunamadı
        </Typography>
      )}
    </>
  );
};

export default IsEmirleri;
