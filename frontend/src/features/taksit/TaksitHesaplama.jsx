import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  InputAdornment,
  Snackbar,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import ClearIcon from '@mui/icons-material/Clear';
import ShareIcon from '@mui/icons-material/Share';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { ORANLAR, MAKS_NAKIT, fmtTL, formatParaInput, paraToNumber, hesaplaTaksit } from './taksitHesap';

// Hesap taksitHesap.js'te; eski içe aktarma yolları (TaksitGoruntule, vitrin) bozulmasın diye buradan da dışa verilir.
export { ORANLAR, MAKS_NAKIT, fmtTL, formatParaInput, paraToNumber, hesaplaTaksit };
import { FONT, RENK } from '../../app/tokenlar';

// Para formatlı (₺) giriş alanı — peşinat vb. için hem admin hem müşteri sayfasında kullanılır
export const ParaInput = ({ value, onChange, label, helperText, ...props }) => (
  <TextField
    fullWidth
    label={label}
    value={formatParaInput(value)}
    onChange={(e) => onChange(e.target.value)}
    helperText={helperText}
    inputMode="numeric"
    InputProps={{ endAdornment: <InputAdornment position="end">₺</InputAdornment> }}
    {...props}
  />
);

// Sonuç tablosu (hem admin sayfasında hem paylaşım sayfasında kullanılır)
export const TaksitTablo = ({ sonuc, isMobile }) => {
  if (!sonuc) return null;
  if (isMobile) {
    return (
      <Stack spacing={1.5}>
        {sonuc.map((r) => (
          <Paper key={r.ay} sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #C62828' }}>
            <Typography fontWeight="bold" sx={{ mb: 0.5 }}>
              {r.ay} Ay
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Taksitli Toplam Fiyat
              </Typography>
              <Typography fontWeight={600}>{fmtTL(r.toplam)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Aylık Ödeme
              </Typography>
              <Typography fontWeight="bold" sx={{ color: '#C62828' }}>
                {fmtTL(r.aylik)}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Stack>
    );
  }
  return (
    <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
      <Table>
        <TableHead>
          <TableRow>
            {['Taksit Süresi', 'Taksitli Toplam Fiyat', 'Aylık Ödeme'].map((h) => (
              <TableCell key={h}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sonuc.map((r) => (
            <TableRow key={r.ay} hover>
              <TableCell sx={{ fontWeight: 600 }}>{r.ay} Ay</TableCell>
              <TableCell>{fmtTL(r.toplam)}</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#C62828' }}>{fmtTL(r.aylik)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Yönetim sayfasındaki sonuç: her taksit süresi için solda kırmızı şeritli kart (paylaşım sayfası TaksitTablo'yu kullanmaya devam eder).
const TaksitKartlari = ({ sonuc }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
    {sonuc.map((r) => (
      <Paper key={r.ay} sx={{ p: 2, borderLeft: `4px solid ${RENK.kirmizi}`, bgcolor: RENK.yuzey }}>
        <Typography sx={{ fontFamily: FONT.baslik, fontWeight: 700, fontSize: 30, lineHeight: 1.2, mb: 1 }}>{r.ay} Ay</Typography>
        {[
          ['Aylık', r.aylik, 24],
          ['Toplam', r.toplam, 18],
        ].map(([etiket, deger, boyut]) => (
          <Box key={etiket} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
            <Typography sx={{ color: RENK.soluk }}>{etiket}</Typography>
            <Typography sx={{ fontFamily: FONT.baslik, fontWeight: 700, fontSize: boyut, whiteSpace: 'nowrap' }}>{fmtTL(deger)}</Typography>
          </Box>
        ))}
      </Paper>
    ))}
  </Box>
);

const TaksitHesaplama = () => {
  const [nakit, setNakit] = useState('');
  const [pesinat, setPesinat] = useState('');
  const [goster, setGoster] = useState(false);
  const [snack, setSnack] = useState(false);

  // Hesapla'ya basıldıktan sonra nakit/peşinat değiştikçe tablo anlık güncellenir
  const sonuc = useMemo(() => (goster ? hesaplaTaksit(nakit, paraToNumber(pesinat)) : null), [goster, nakit, pesinat]);
  const kalan = (parseFloat(nakit) || 0) - paraToNumber(pesinat);

  const hesapla = () => setGoster(true);
  const temizle = () => {
    setNakit('');
    setPesinat('');
    setGoster(false);
  };

  // Paylaşılabilir link: nakit fiyatı URL'e gömer; müşteri linki açınca aynı tabloyu görür
  const paylasimLinki = () => `${window.location.origin}/taksit/${Math.round(parseFloat(nakit) || 0)}`;

  const linkKopyala = async () => {
    try {
      await navigator.clipboard.writeText(paylasimLinki());
      setSnack(true);
    } catch {
      window.prompt('Bağlantıyı kopyalayın:', paylasimLinki());
    }
  };

  const whatsappPaylas = () => {
    const url = paylasimLinki();
    const metin = `Taksit ödeme seçenekleri: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(metin)}`, '_blank');
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Nakit fiyat girerek 3, 6, 9 ve 12 ay taksitli ödeme seçeneklerini hesaplayabilirsiniz.
      </Typography>

      <Paper sx={{ p: { xs: 2, md: 2.5 }, mb: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              fullWidth
              label="Nakit Fiyat"
              type="number"
              value={nakit}
              onChange={(e) => setNakit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') hesapla();
              }}
              InputProps={{ startAdornment: <InputAdornment position="start">₺</InputAdornment> }}
            />
            <ParaInput
              label="Peşinat / Peşin Ödeme"
              value={pesinat}
              onChange={setPesinat}
              onKeyDown={(e) => {
                if (e.key === 'Enter') hesapla();
              }}
              helperText={
                paraToNumber(pesinat) > 0 ? `Kalan tutar: ${fmtTL(Math.max(kalan, 0))}` : 'İsteğe bağlı — boş bırakılırsa nakit fiyat üzerinden hesaplanır'
              }
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button
              variant="contained"
              size="large"
              startIcon={<CalculateIcon />}
              onClick={hesapla}
              sx={{ bgcolor: '#C62828', '&:hover': { bgcolor: '#A61F1F' }, whiteSpace: 'nowrap', px: 3 }}
            >
              Hesapla
            </Button>
            <Button variant="outlined" size="large" startIcon={<ClearIcon />} onClick={temizle} sx={{ whiteSpace: 'nowrap' }}>
              Temizle
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {goster && !sonuc && (parseFloat(nakit) || 0) > 0 && paraToNumber(pesinat) >= (parseFloat(nakit) || 0) && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Peşinat tutarı nakit fiyata eşit veya daha büyük. Taksitlendirilecek tutar kalmadı.
        </Alert>
      )}

      {sonuc && (
        <>
          <TaksitKartlari sonuc={sonuc} />
          {paraToNumber(pesinat) > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Peşinat sonrası kalan {fmtTL(Math.max(kalan, 0))} üzerinden hesaplandı.
            </Alert>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
            <Button variant="outlined" startIcon={<ShareIcon />} onClick={linkKopyala}>
              Müşteri Linkini Kopyala
            </Button>
            <Button variant="contained" startIcon={<WhatsAppIcon />} onClick={whatsappPaylas} sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#1da851' } }}>
              WhatsApp ile Gönder
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Müşteri linki açtığında aynı taksit tablosunu görür. Bu hesaplama satış/stok/rapor kayıtlarına etki etmez.
          </Typography>
        </>
      )}

      <Snackbar open={snack} autoHideDuration={2500} onClose={() => setSnack(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setSnack(false)}>
          Link kopyalandı
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TaksitHesaplama;
