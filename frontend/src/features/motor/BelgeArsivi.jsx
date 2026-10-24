import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, TextField, Alert, CircularProgress, IconButton, Chip, InputAdornment, ToggleButton, ToggleButtonGroup, Button } from '@mui/material';
import ViewIcon from '@mui/icons-material/Visibility';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DescriptionIcon from '@mui/icons-material/Description';
import SearchIcon from '@mui/icons-material/Search';
import { satisBelgeService } from './motorApi';
import { belgeAc, belgeOnizlenebilir } from './SatisBelgeleri';
import { tarihYaz } from '../../shared/utils/bicim';

const boyutYaz = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const gunYaz = (t) => (t ? new Date(`${t}T00:00:00`).toLocaleDateString('tr-TR') : null);
const normalize = (s) =>
  String(s || '')
    .toLocaleUpperCase('tr-TR')
    .replace(/[^A-Z0-9ÇĞİÖŞÜ]/g, '');

// Muhasebeci (ve admin) için salt-okunur belge arşivi: tüm belgeler plakaya göre gruplanır.
const BelgeArsivi = () => {
  const [gruplar, setGruplar] = useState(null);
  const [hata, setHata] = useState('');
  const [ara, setAra] = useState('');
  const [tarihTuru, setTarihTuru] = useState('satis'); // aylık filtre hangi tarihe göre: 'satis' | 'alis'
  const [ay, setAy] = useState(''); // 'YYYY-AA' ya da boş (filtre yok)
  const [islemId, setIslemId] = useState(null);

  useEffect(() => {
    let aktif = true;
    satisBelgeService
      .arsiv()
      .then((res) => {
        if (aktif) setGruplar(res.data);
      })
      .catch(() => {
        if (aktif) {
          setGruplar([]);
          setHata('Belgeler yüklenemedi');
        }
      });
    return () => {
      aktif = false;
    };
  }, []);

  const gorunen = useMemo(() => {
    if (!gruplar) return [];
    const q = normalize(ara);
    return gruplar.filter((g) => {
      // Ay seçiliyse seçilen tarih türüne bakılır; tarihi olmayan (ör. satılmamış motorun satış tarihi) elenir
      if (ay && !String(g[`${tarihTuru}_tarihi`] || '').startsWith(ay)) return false;
      if (!q) return true;
      return normalize(`${g.plaka}${g.marka}${g.model}`).includes(q) || g.belgeler.some((b) => normalize(b.dosya_adi).includes(q));
    });
  }, [gruplar, ara, ay, tarihTuru]);

  const toplamDosya = gorunen.reduce((t, g) => t + g.belgeler.length, 0);

  const ac = async (b, goster) => {
    setIslemId(b.id);
    setHata('');
    try {
      await belgeAc(b, goster);
    } catch {
      setHata('Belge açılamadı');
    }
    setIslemId(null);
  };

  return (
    <Box sx={{ maxWidth: 820, mx: 'auto' }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
        Belge Arşivi
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Motorlara eklenen tüm belgeler plakaya göre listelenir.
      </Typography>

      <TextField
        fullWidth
        size="small"
        placeholder="Plaka, marka veya dosya adı ara"
        value={ara}
        onChange={(e) => setAra(e.target.value)}
        sx={{ mb: 2 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
        <ToggleButtonGroup size="small" exclusive value={tarihTuru} onChange={(_, v) => v && setTarihTuru(v)} aria-label="Tarih türü">
          <ToggleButton value="satis" sx={{ px: 1.75 }}>
            Satış tarihi
          </ToggleButton>
          <ToggleButton value="alis" sx={{ px: 1.75 }}>
            Alış tarihi
          </ToggleButton>
        </ToggleButtonGroup>
        <TextField
          size="small"
          type="month"
          label={tarihTuru === 'satis' ? 'Satış ayı' : 'Alış ayı'}
          value={ay}
          onChange={(e) => setAy(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 170 }}
        />
        {ay && (
          <Button size="small" onClick={() => setAy('')}>
            Temizle
          </Button>
        )}
      </Box>

      {hata && (
        <Alert severity="error" onClose={() => setHata('')} sx={{ mb: 2 }}>
          {hata}
        </Alert>
      )}

      {gruplar === null ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : gorunen.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          {gruplar.length === 0 ? 'Henüz belge eklenmemiş.' : 'Aramaya veya seçilen aya uyan belge yok.'}
        </Typography>
      ) : (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {gorunen.length} araç • {toplamDosya} dosya
          </Typography>
          {gorunen.map((g) => (
            <Box key={g.motor_id} sx={{ mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', overflow: 'hidden' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  flexWrap: 'wrap',
                  px: 2,
                  py: 1.25,
                  bgcolor: 'action.hover',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box
                  sx={{
                    px: 1.25,
                    py: 0.25,
                    border: '2px solid #1a1a1a',
                    borderRadius: '4px',
                    bgcolor: '#fff',
                    color: '#1a1a1a',
                    fontWeight: 800,
                    letterSpacing: 1.5,
                    fontSize: '1.05rem',
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {g.plaka || 'PLAKASIZ'}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1, minWidth: 0 }} noWrap>
                  {[g.marka, g.model].filter(Boolean).join(' ')}
                </Typography>
                {(g.alis_tarihi || g.satis_tarihi) && (
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    {g.alis_tarihi && `Alış ${gunYaz(g.alis_tarihi)}`}
                    {g.alis_tarihi && g.satis_tarihi && ' • '}
                    {g.satis_tarihi && `Satış ${gunYaz(g.satis_tarihi)}`}
                  </Typography>
                )}
                {g.durum === 'tamamlandi' ? (
                  <Chip size="small" label="Satıldı" color="success" variant="outlined" />
                ) : (
                  <Chip size="small" label="Stokta" variant="outlined" />
                )}
              </Box>
              {g.belgeler.map((b) => (
                <Box
                  key={b.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 0.75,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 0 },
                  }}
                >
                  <DescriptionIcon color="action" />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight="500" noWrap title={b.dosya_adi}>
                      {b.dosya_adi}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {boyutYaz(b.boyut)} • {tarihYaz(b.created_at)}
                    </Typography>
                  </Box>
                  {islemId === b.id ? (
                    <CircularProgress size={20} />
                  ) : (
                    <>
                      {belgeOnizlenebilir(b) && (
                        <IconButton size="small" onClick={() => ac(b, true)} title="Görüntüle">
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton size="small" onClick={() => ac(b, false)} title="İndir">
                        <FileDownloadIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Box>
              ))}
            </Box>
          ))}
        </>
      )}
    </Box>
  );
};

export default BelgeArsivi;
