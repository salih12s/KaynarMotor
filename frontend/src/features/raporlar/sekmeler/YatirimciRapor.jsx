import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { formatTL, formatDate, headerSx } from '../bicim';
import { raporService } from '../raporApi';

// Yatırımcının kendi raporu: yalnızca kendi stoğu ve satılan motorlarındaki payı.
const YatirimciRapor = ({ isMobile }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [baslangic, setBaslangic] = useState('');
  const [bitis, setBitis] = useState('');

  // Yerel tarihi YYYY-AA-GG formatına çevir (UTC kayması olmadan)
  const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const buHafta = () => {
    const n = new Date();
    const g = (n.getDay() + 6) % 7;
    const pzt = new Date(n);
    pzt.setDate(n.getDate() - g);
    setBaslangic(isoLocal(pzt));
    setBitis(isoLocal(n));
  };
  const buAy = () => {
    const n = new Date();
    setBaslangic(isoLocal(new Date(n.getFullYear(), n.getMonth(), 1)));
    setBitis(isoLocal(n));
  };

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (baslangic) params.baslangic = baslangic;
    if (bitis) params.bitis = bitis;
    raporService
      .getYatirimciRapor(params)
      .then((r) => setData(r.data))
      .catch(() => setError('Rapor yüklenirken hata oluştu'))
      .finally(() => setLoading(false));
  }, [baslangic, bitis]);

  const o = data?.ozet || {};
  const stoktakiler = data?.stoktakiler || [];
  const satilanlar = data?.satilanlar || [];

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Yatırım Raporum
      </Typography>

      {/* Tarih süzgeci — yalnızca satılan motorların kârına uygulanır (Haziran/Temmuz ayrı hesaplanır) */}
      <Paper sx={{ p: 1.5, mb: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button size="small" variant="outlined" onClick={buHafta}>
          Bu Hafta
        </Button>
        <Button size="small" variant="outlined" onClick={buAy}>
          Bu Ay
        </Button>
        <TextField
          size="small"
          type="date"
          label="Başlangıç"
          value={baslangic}
          onChange={(e) => setBaslangic(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField size="small" type="date" label="Bitiş" value={bitis} onChange={(e) => setBitis(e.target.value)} InputLabelProps={{ shrink: true }} />
        {(baslangic || bitis) && (
          <Button
            size="small"
            onClick={() => {
              setBaslangic('');
              setBitis('');
            }}
          >
            Tümünü Göster
          </Button>
        )}
        <Typography variant="caption" color="text.secondary">
          Tarih filtresi satılan motorların kârına uygulanır; stok her zaman güncel gösterilir.
        </Typography>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#C62828' }} />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : !data ? null : (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'Stoktaki Motor', value: o.stok_adet || 0, color: '#C62828' },
              { label: 'Satılan Motor', value: o.satilan_adet || 0, color: '#1E4A86' },
              { label: 'Stok Değeri', value: `₺${formatTL(o.stok_degeri)}`, color: '#A5530F' },
              { label: 'Toplam Kazancım', value: `₺${formatTL(o.toplam_yatirimci_kar)}`, color: '#1D6A3B' },
            ].map((k, i) => {
              const bgMap = { '#C62828': '#F6DAD7', '#1E4A86': '#DCE6F4', '#A5530F': '#F7E7C4', '#1D6A3B': '#D8EBDD' };
              return (
                <Grid size={{ xs: 6, md: 3 }} key={i}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: bgMap[k.color], borderLeft: `4px solid ${k.color}` }}>
                    <Typography variant="body2" color="text.secondary">
                      {k.label}
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" sx={{ color: k.color }}>
                      {k.value}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>

          <Typography variant="h6" fontWeight="bold" mb={1}>
            Stoktaki Motorlarım ({stoktakiler.length})
          </Typography>
          {stoktakiler.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              Stokta motorunuz bulunmuyor.
            </Alert>
          ) : isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
              {stoktakiler.map((m, i) => (
                <Paper key={i} sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {m.plaka} • {m.marka} {m.model}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {m.yil || '-'} • {formatDate(m.tarih)}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="body2">
                      Alış: <strong>{formatTL(m.alis_fiyati)} ₺</strong>
                    </Typography>
                    <Typography variant="body2">
                      İlan: <strong>{formatTL(m.liste_fiyati)} ₺</strong>
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ mb: 3, overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Tarih', 'Plaka', 'Marka/Model', 'Yıl', 'Alış', 'İlan Fiyatı'].map((h) => (
                      <TableCell key={h} sx={headerSx}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stoktakiler.map((m, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(m.tarih)}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{m.plaka}</TableCell>
                      <TableCell>
                        {m.marka} {m.model}
                      </TableCell>
                      <TableCell>{m.yil || '-'}</TableCell>
                      <TableCell>{formatTL(m.alis_fiyati)} ₺</TableCell>
                      <TableCell>{formatTL(m.liste_fiyati)} ₺</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Typography variant="h6" fontWeight="bold" mb={1}>
            Satılan Motorlarım ({satilanlar.length})
          </Typography>
          {satilanlar.length === 0 ? (
            <Alert severity="info">Henüz satılan motorunuz yok.</Alert>
          ) : isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {satilanlar.map((m, i) => (
                <Paper key={i} sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {m.plaka} • {m.marka} {m.model}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Satış: {formatDate(m.satis_tarihi || m.tamamlama_tarihi)}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="body2">
                      Satış: <strong>{formatTL(m.satis_fiyati)} ₺</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#1D6A3B' }}>
                      Kazancım: <strong>{formatTL(m.yatirimci_kar)} ₺</strong>
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Satış Tarihi', 'Plaka', 'Marka/Model', 'Satış Fiyatı', 'Kazancım'].map((h) => (
                      <TableCell key={h} sx={headerSx}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {satilanlar.map((m, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(m.satis_tarihi || m.tamamlama_tarihi)}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{m.plaka}</TableCell>
                      <TableCell>
                        {m.marka} {m.model}
                      </TableCell>
                      <TableCell>{formatTL(m.satis_fiyati)} ₺</TableCell>
                      <TableCell sx={{ color: '#1D6A3B', fontWeight: 'bold' }}>{formatTL(m.yatirimci_kar)} ₺</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Box>
  );
};

export default YatirimciRapor;
