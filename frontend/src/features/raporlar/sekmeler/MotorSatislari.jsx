import React from 'react';
import { Box, Paper, Typography, Grid, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab, Alert, Chip, MenuItem, Button, IconButton } from '@mui/material';
import ViewIcon from '@mui/icons-material/Visibility';
import { formatTL, formatDate, karColor, motorIsletmeKari, headerSx } from '../bicim';
import KartItem from '../bilesenler/KartItem';

// Motor Satışları sekmesi (Satışlar / Komisyonlu alt sekmeleri). Alt sekme ve komisyoncu süzgeci üstte tutulur: sekme değişince kaybolmaz.
const MotorSatislari = ({ rapor, isMobile, motorSubTab, setMotorSubTab, komisyoncuFilter, setKomisyoncuFilter, onDetay }) => {
  const allMotorlar = rapor.motorlar || [];
  const komisyonluAll = allMotorlar.filter(m => (m.komisyoncu_adi && m.komisyoncu_adi.trim()) || parseFloat(m.komisyoncu_tutari || 0) > 0);
  const komisyoncuList = Array.from(new Set(komisyonluAll.map(m => (m.komisyoncu_adi || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr'));
  const komisyonluMotorlar = komisyoncuFilter
    ? komisyonluAll.filter(m => (m.komisyoncu_adi || '').trim().toLowerCase() === komisyoncuFilter.toLowerCase())
    : komisyonluAll;
  const shownMotorlar = motorSubTab === 1 ? komisyonluMotorlar : allMotorlar;
  const shownGelir = shownMotorlar.reduce((t, m) => t + parseFloat(m.satis_fiyati || 0), 0);
  const shownMaliyet = shownMotorlar.reduce((t, m) => t + parseFloat(m.alis_fiyati || 0) + parseFloat(m.masraflar || 0), 0);
  const shownKar = shownMotorlar.reduce((t, m) => t + (parseFloat(m.kar || 0) - parseFloat(m.yatirimci_kar || 0)), 0);
  const shownNoterSatis = shownMotorlar.reduce((t, m) => t + parseFloat(m.noter_satis || 0), 0);
  const shownStokDegeri = motorSubTab === 1 ? 0 : (rapor.motorStokToplam || 0);
  const komisyonToplamTutar = komisyonluMotorlar.reduce((t, m) => t + parseFloat(m.komisyoncu_tutari || 0), 0);
  return (
    <>
      <Paper sx={{ mb: 2 }}>
        <Tabs value={motorSubTab} onChange={(_, v) => setMotorSubTab(v)}
          TabIndicatorProps={{ sx: { bgcolor: '#C62828' } }}
          sx={{ '& .MuiTab-root': { fontWeight: 'bold' }, '& .Mui-selected': { color: '#C62828 !important' } }}>
          <Tab label={`Satışlar (${allMotorlar.length})`} />
          <Tab label={`Komisyonlu Satışlar (${komisyonluAll.length})`} />
        </Tabs>
      </Paper>
      {motorSubTab === 1 && komisyoncuList.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField size="small" select label="Komisyoncu Filtresi" value={komisyoncuFilter}
              onChange={e => setKomisyoncuFilter(e.target.value)} sx={{ minWidth: { xs: '100%', sm: 240 } }}>
              <MenuItem value="">Tümü ({komisyonluAll.length})</MenuItem>
              {komisyoncuList.map(k => {
                const sayi = komisyonluAll.filter(m => (m.komisyoncu_adi || '').trim().toLowerCase() === k.toLowerCase()).length;
                return <MenuItem key={k} value={k}>{k} ({sayi})</MenuItem>;
              })}
            </TextField>
            {komisyoncuFilter && (
              <Button size="small" onClick={() => setKomisyoncuFilter('')} sx={{ color: '#C62828' }}>Filtreyi Temizle</Button>
            )}
          </Box>
        </Paper>
      )}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {(motorSubTab === 1 ? [
          { label: 'Komisyonlu Satış', value: komisyonluMotorlar.length, color: '#C62828' },
          { label: 'Motor Gelir', value: `₺${formatTL(shownGelir)}`, color: '#1565C0' },
          { label: 'Motor Maliyet', value: `₺${formatTL(shownMaliyet)}`, color: '#E65100' },
          { label: 'Motor Kâr', value: `₺${formatTL(shownKar)}`, color: '#2e7d32' },
          { label: 'Noter Satış Cirosu', value: `₺${formatTL(shownNoterSatis)}`, color: '#6A1B9A' },
          { label: 'Toplam Komisyon', value: `₺${formatTL(komisyonToplamTutar)}`, color: '#f57f17' },
          { label: 'Faturalı', value: komisyonluMotorlar.filter(m => m.fatura_kesildi).length, color: '#00695C' },
        ] : [
          { label: 'Toplam Satış', value: allMotorlar.length, color: '#C62828' },
          { label: 'Motor Gelir', value: `₺${formatTL(rapor.motorGelir)}`, color: '#1565C0' },
          { label: 'Motor Maliyet', value: `₺${formatTL(rapor.motorMaliyet)}`, color: '#E65100' },
          { label: 'Motor Kârı (Payınız)', value: `₺${formatTL(rapor.motorKar)}`, color: '#2e7d32' },
          { label: 'Yatırımcı Payı', value: `₺${formatTL(rapor.motorYatirimciKar)}`, color: '#1565C0' },
          { label: 'Komisyoncu Payı', value: `₺${formatTL(rapor.motorKomisyon)}`, color: '#f57f17' },
          { label: 'Noter Satış Cirosu', value: `₺${formatTL(rapor.motorNoterSatisCiro)}`, color: '#6A1B9A' },
          { label: 'Faturalı', value: allMotorlar.filter(m => m.fatura_kesildi).length, color: '#00695C' },
          { label: 'Motor Stok Değeri', value: `₺${formatTL(shownStokDegeri)}`, color: '#4A148C' },
        ]).map((k, i) => (
          <Grid size={{ xs: 12, md: 2 }} key={i}>
            <KartItem label={k.label} value={k.value} color={k.color} />
          </Grid>
        ))}
      </Grid>
      {shownMotorlar.length > 0 ? (
        isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {shownMotorlar.map((m, i) => (
            <Paper key={i} sx={{ p: 1.5, cursor: 'pointer' }} onClick={() => onDetay(m)}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle2" fontWeight="bold">{m.plaka}</Typography>
                <Chip size="small" label={m.fatura_kesildi ? '✓ Kesildi' : '✗ Kesilmedi'}
                  sx={{ bgcolor: m.fatura_kesildi ? '#e8f5e9' : '#ffebee', color: m.fatura_kesildi ? '#2e7d32' : '#d32f2f', fontWeight: 'bold', fontSize: '0.65rem', height: 20 }} />
              </Box>
              <Typography variant="body2">{m.marka} {m.model} • {formatDate(m.satis_tarihi || m.tamamlama_tarihi || m.created_at)}</Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                <Typography variant="body2">Alış: <strong>{formatTL(m.alis_fiyati)} ₺</strong></Typography>
                <Typography variant="body2">Satış: <strong>{formatTL(m.satis_fiyati)} ₺</strong></Typography>
                <Typography variant="body2" sx={{ color: karColor(motorIsletmeKari(m)) }}>Payınız: <strong>{formatTL(motorIsletmeKari(m))} ₺</strong></Typography>
              </Box>
              {m.komisyoncu_adi && (
                <Typography variant="body2" sx={{ color: '#f57f17', mt: 0.5 }}>
                  Komisyoncu: <strong>{m.komisyoncu_adi}</strong> • ₺{formatTL(m.komisyoncu_tutari)}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{m.odeme_sekli || 'nakit'} • Masraf: {formatTL(m.masraflar)} ₺</Typography>
            </Paper>
          ))}
        </Box>
        ) : (
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ '& .MuiTableCell-root': { px: 1, py: 0.5, fontSize: '0.78rem' } }}>
            <TableHead><TableRow sx={{ bgcolor: '#C62828' }}>
              {motorSubTab === 1
                ? ['', 'Tarih', 'Plaka', 'Marka/Model', 'Satış', 'Komisyoncu', 'Kom. Tel', 'Kom. Tutar', 'Payınız', 'Fatura'].map(h => <TableCell key={h} sx={headerSx}>{h}</TableCell>)
                : ['', 'Tarih', 'Plaka', 'Marka/Model', 'Alış', 'Satış', 'Masraf', 'Payınız', 'Ödeme', 'Fatura'].map(h => <TableCell key={h} sx={headerSx}>{h}</TableCell>)}
            </TableRow></TableHead>
            <TableBody>
              {shownMotorlar.map((m, i) => (
                <TableRow key={i} hover sx={{ cursor: 'pointer' }} onClick={() => onDetay(m)}>
                  <TableCell>
                    <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); onDetay(m); }}>
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(m.satis_tarihi || m.tamamlama_tarihi || m.created_at)}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{m.plaka}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{m.marka} {m.model}</TableCell>
                  {motorSubTab === 1 ? (
                    <>
                      <TableCell>{formatTL(m.satis_fiyati)} ₺</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#f57f17' }}>{m.komisyoncu_adi || '-'}</TableCell>
                      <TableCell>{m.komisyoncu_telefon || '-'}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{formatTL(m.komisyoncu_tutari)} ₺</TableCell>
                      <TableCell sx={{ color: karColor(motorIsletmeKari(m)), fontWeight: 'bold' }}>{formatTL(motorIsletmeKari(m))} ₺</TableCell>
                      <TableCell>
                        <Chip size="small" label={m.fatura_kesildi ? '✓ Kesildi' : '✗ Kesilmedi'}
                          sx={{ bgcolor: m.fatura_kesildi ? '#e8f5e9' : '#ffebee', color: m.fatura_kesildi ? '#2e7d32' : '#d32f2f', fontWeight: 'bold', fontSize: '0.7rem' }} />
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{formatTL(m.alis_fiyati)} ₺</TableCell>
                      <TableCell>{formatTL(m.satis_fiyati)} ₺</TableCell>
                      <TableCell>{formatTL(m.masraflar)} ₺</TableCell>
                      <TableCell sx={{ color: karColor(motorIsletmeKari(m)), fontWeight: 'bold' }}>{formatTL(motorIsletmeKari(m))} ₺</TableCell>
                      <TableCell>{m.odeme_sekli || 'nakit'}</TableCell>
                      <TableCell>
                        <Chip size="small" label={m.fatura_kesildi ? '✓ Kesildi' : '✗ Kesilmedi'}
                          sx={{ bgcolor: m.fatura_kesildi ? '#e8f5e9' : '#ffebee', color: m.fatura_kesildi ? '#2e7d32' : '#d32f2f', fontWeight: 'bold', fontSize: '0.7rem' }} />
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
        <Alert severity="info">{motorSubTab === 1 ? 'Seçilen tarih aralığında komisyonlu motor satışı bulunamadı.' : 'Seçilen tarih aralığında motor satışı bulunamadı.'}</Alert>
      )}
    </>
  );
};

export default MotorSatislari;
