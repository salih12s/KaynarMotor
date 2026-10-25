import React from 'react';
import { sayiDegeri } from '../../../shared/utils/bicim';
import { Damga, IslemDugmesi, Plaka } from '../../../shared/ui';
import { RENK } from '../../../app/tokenlar';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Alert,
  MenuItem,
  Button,
} from '@mui/material';

import { formatTL, formatDate, karColor, motorIsletmeKari, headerSx } from '../bicim';
import KartItem from '../bilesenler/KartItem';

const SAYISAL = ['Alış', 'Satış', 'Masraf', 'Payınız', 'Kom. Tutar'];
const sagaSx = { textAlign: 'right' };
const FaturaDamgasi = ({ kesildi }) => <Damga ton={kesildi ? 'yesil' : 'kirmizi'}>{kesildi ? 'Kesildi' : 'Kesilmedi'}</Damga>;

// Motor Satışları sekmesi (Satışlar / Komisyonlu alt sekmeleri). Alt sekme ve komisyoncu süzgeci üstte tutulur: sekme değişince kaybolmaz.
const MotorSatislari = ({ rapor, isMobile, motorSubTab, setMotorSubTab, komisyoncuFilter, setKomisyoncuFilter, onDetay }) => {
  const allMotorlar = rapor.motorlar || [];
  const komisyonluAll = allMotorlar.filter((m) => (m.komisyoncu_adi && m.komisyoncu_adi.trim()) || sayiDegeri(m.komisyoncu_tutari) > 0);
  const komisyoncuList = Array.from(new Set(komisyonluAll.map((m) => (m.komisyoncu_adi || '').trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'tr'),
  );
  const komisyonluMotorlar = komisyoncuFilter
    ? komisyonluAll.filter((m) => (m.komisyoncu_adi || '').trim().toLowerCase() === komisyoncuFilter.toLowerCase())
    : komisyonluAll;
  const shownMotorlar = motorSubTab === 1 ? komisyonluMotorlar : allMotorlar;
  const shownGelir = shownMotorlar.reduce((t, m) => t + sayiDegeri(m.satis_fiyati), 0);
  const shownMaliyet = shownMotorlar.reduce((t, m) => t + sayiDegeri(m.alis_fiyati) + sayiDegeri(m.masraflar), 0);
  const shownKar = shownMotorlar.reduce((t, m) => t + (sayiDegeri(m.kar) - sayiDegeri(m.yatirimci_kar)), 0);
  const shownNoterSatis = shownMotorlar.reduce((t, m) => t + sayiDegeri(m.noter_satis), 0);
  const shownStokDegeri = motorSubTab === 1 ? 0 : rapor.motorStokToplam || 0;
  const komisyonToplamTutar = komisyonluMotorlar.reduce((t, m) => t + sayiDegeri(m.komisyoncu_tutari), 0);
  return (
    <>
      <Box sx={{ mb: 2, borderBottom: `1px solid ${RENK.cizgi}` }}>
        <Tabs
          value={motorSubTab}
          onChange={(_, v) => setMotorSubTab(v)}
          TabIndicatorProps={{ sx: { bgcolor: RENK.kirmizi } }}
          sx={{ '& .MuiTab-root': { fontWeight: 700 } }}
        >
          <Tab label={`Satışlar (${allMotorlar.length})`} />
          <Tab label={`Komisyonlu Satışlar (${komisyonluAll.length})`} />
        </Tabs>
      </Box>
      {motorSubTab === 1 && komisyoncuList.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small"
              select
              label="Komisyoncu Filtresi"
              value={komisyoncuFilter}
              onChange={(e) => setKomisyoncuFilter(e.target.value)}
              sx={{ minWidth: { xs: '100%', sm: 240 } }}
            >
              <MenuItem value="">Tümü ({komisyonluAll.length})</MenuItem>
              {komisyoncuList.map((k) => {
                const sayi = komisyonluAll.filter((m) => (m.komisyoncu_adi || '').trim().toLowerCase() === k.toLowerCase()).length;
                return (
                  <MenuItem key={k} value={k}>
                    {k} ({sayi})
                  </MenuItem>
                );
              })}
            </TextField>
            {komisyoncuFilter && (
              <Button size="small" onClick={() => setKomisyoncuFilter('')} sx={{ color: '#C62828' }}>
                Filtreyi Temizle
              </Button>
            )}
          </Box>
        </Paper>
      )}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2, mb: 2 }}>
        {(motorSubTab === 1
          ? [
              { label: 'Komisyonlu Satış', value: komisyonluMotorlar.length, color: '#C62828' },
              { label: 'Motor Gelir', value: `₺${formatTL(shownGelir)}`, color: '#1E4A86' },
              { label: 'Motor Maliyet', value: `₺${formatTL(shownMaliyet)}`, color: '#A5530F' },
              { label: 'Motor Kâr', value: `₺${formatTL(shownKar)}`, color: '#1D6A3B' },
              { label: 'Noter Satış Cirosu', value: `₺${formatTL(shownNoterSatis)}`, color: '#5B3A8C' },
              { label: 'Toplam Komisyon', value: `₺${formatTL(komisyonToplamTutar)}`, color: '#8A5300' },
              { label: 'Faturalı', value: komisyonluMotorlar.filter((m) => m.fatura_kesildi).length, color: '#0F7B6C' },
            ]
          : [
              { label: 'Toplam Satış', value: allMotorlar.length, color: '#C62828' },
              { label: 'Motor Gelir', value: `₺${formatTL(rapor.motorGelir)}`, color: '#1E4A86' },
              { label: 'Motor Maliyet', value: `₺${formatTL(rapor.motorMaliyet)}`, color: '#A5530F' },
              { label: 'Motor Kârı (Payınız)', value: `₺${formatTL(rapor.motorKar)}`, color: '#1D6A3B' },
              { label: 'Yatırımcı Payı', value: `₺${formatTL(rapor.motorYatirimciKar)}`, color: '#1E4A86' },
              { label: 'Komisyoncu Payı', value: `₺${formatTL(rapor.motorKomisyon)}`, color: '#8A5300' },
              { label: 'Noter Satış Cirosu', value: `₺${formatTL(rapor.motorNoterSatisCiro)}`, color: '#5B3A8C' },
              { label: 'Faturalı', value: allMotorlar.filter((m) => m.fatura_kesildi).length, color: '#0F7B6C' },
              { label: 'Motor Stok Değeri', value: `₺${formatTL(shownStokDegeri)}`, color: '#5B3A8C' },
            ]
        ).map((k, i) => (
          <KartItem key={i} label={k.label} value={k.value} color={k.color} />
        ))}
      </Box>
      {shownMotorlar.length > 0 ? (
        isMobile ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {shownMotorlar.map((m, i) => (
              <Paper key={i} sx={{ p: 1.5, cursor: 'pointer' }} onClick={() => onDetay(m)}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {m.plaka}
                  </Typography>
                  <FaturaDamgasi kesildi={m.fatura_kesildi} />
                </Box>
                <Typography variant="body2">
                  {m.marka} {m.model} • {formatDate(m.satis_tarihi || m.tamamlama_tarihi || m.created_at)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                  <Typography variant="body2">
                    Alış: <strong>{formatTL(m.alis_fiyati)} ₺</strong>
                  </Typography>
                  <Typography variant="body2">
                    Satış: <strong>{formatTL(m.satis_fiyati)} ₺</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ color: karColor(motorIsletmeKari(m)) }}>
                    Payınız: <strong>{formatTL(motorIsletmeKari(m))} ₺</strong>
                  </Typography>
                </Box>
                {m.komisyoncu_adi && (
                  <Typography variant="body2" sx={{ color: '#8A5300', mt: 0.5 }}>
                    Komisyoncu: <strong>{m.komisyoncu_adi}</strong> • ₺{formatTL(m.komisyoncu_tutari)}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {m.odeme_sekli || 'nakit'} • Masraf: {formatTL(m.masraflar)} ₺
                </Typography>
              </Paper>
            ))}
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  {motorSubTab === 1
                    ? ['', 'Tarih', 'Plaka', 'Marka / Model', 'Satış', 'Komisyoncu', 'Kom. Tel', 'Kom. Tutar', 'Payınız', 'Fatura'].map((h) => (
                        <TableCell key={h} sx={{ ...headerSx, textAlign: SAYISAL.includes(h) ? 'right' : 'left' }}>
                          {h}
                        </TableCell>
                      ))
                    : ['', 'Tarih', 'Plaka', 'Marka / Model', 'Alış', 'Satış', 'Masraf', 'Payınız', 'Ödeme', 'Fatura'].map((h) => (
                        <TableCell key={h} sx={{ ...headerSx, textAlign: SAYISAL.includes(h) ? 'right' : 'left' }}>
                          {h}
                        </TableCell>
                      ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {shownMotorlar.map((m, i) => (
                  <TableRow key={i} hover sx={{ cursor: 'pointer' }} onClick={() => onDetay(m)}>
                    <TableCell>
                      <IslemDugmesi
                        tur="goz"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDetay(m);
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', color: RENK.soluk }}>{formatDate(m.satis_tarihi || m.tamamlama_tarihi || m.created_at)}</TableCell>
                    <TableCell>
                      <Plaka plaka={m.plaka} />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <strong>{m.marka}</strong> {m.model}
                    </TableCell>
                    {motorSubTab === 1 ? (
                      <>
                        <TableCell sx={sagaSx}>{formatTL(m.satis_fiyati)} ₺</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: '#8A5300' }}>{m.komisyoncu_adi || '-'}</TableCell>
                        <TableCell>{m.komisyoncu_telefon || '-'}</TableCell>
                        <TableCell sx={{ ...sagaSx, fontWeight: 'bold' }}>{formatTL(m.komisyoncu_tutari)} ₺</TableCell>
                        <TableCell sx={{ ...sagaSx, color: karColor(motorIsletmeKari(m)), fontWeight: 'bold' }}>{formatTL(motorIsletmeKari(m))} ₺</TableCell>
                        <TableCell>
                          <FaturaDamgasi kesildi={m.fatura_kesildi} />
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell sx={sagaSx}>{formatTL(m.alis_fiyati)} ₺</TableCell>
                        <TableCell sx={{ ...sagaSx, fontWeight: 700 }}>{formatTL(m.satis_fiyati)} ₺</TableCell>
                        <TableCell sx={sagaSx}>{formatTL(m.masraflar)} ₺</TableCell>
                        <TableCell sx={{ ...sagaSx, color: karColor(motorIsletmeKari(m)), fontWeight: 'bold' }}>{formatTL(motorIsletmeKari(m))} ₺</TableCell>
                        <TableCell>{m.odeme_sekli || 'nakit'}</TableCell>
                        <TableCell>
                          <FaturaDamgasi kesildi={m.fatura_kesildi} />
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )
      ) : (
        <Alert severity="info">
          {motorSubTab === 1 ? 'Seçilen tarih aralığında komisyonlu motor satışı bulunamadı.' : 'Seçilen tarih aralığında motor satışı bulunamadı.'}
        </Alert>
      )}
    </>
  );
};

export default MotorSatislari;
